const const SUPABASE_URL = 'https://ywovqlnadbpwxnkvllhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b3ZxbG5hZGJwd3hua3ZsbGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Njk1NjAsImV4cCI6MjA5NDQ0NTU2MH0.Fb9zC4g6BPV2R-ogXNvtyGmh_HJf06E7pNnin1E1dpw';

const animeList = document.getElementById('anime-list');
const playerModal = document.getElementById('player-modal');
const player = document.getElementById('player');
const searchInput = document.getElementById('search');
const genreFilter = document.getElementById('genre-filter');
const themeToggle = document.getElementById('theme-toggle');
const loginBtn = document.getElementById('login-btn');

let allAnime = [];
let currentAnime = null;
const WATCHED_KEY = 'anime_watched_progress';
const ADMIN_KEY = 'isAdmin';
const ADMIN_PASSWORD = 'admin123';

initTheme();
checkAdminStatus();
loadAnime();

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggle.textContent = savedTheme === 'dark'? '☀️' : '🌙';
}

themeToggle.onclick = () => {
  const newTheme = document.documentElement.getAttribute('data-theme') === 'dark'? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  themeToggle.textContent = newTheme === 'dark'? '☀️' : '🌙';
};

function checkAdminStatus() {
  const isAdmin = localStorage.getItem(ADMIN_KEY) === 'true';
  document.getElementById('admin-link').style.display = isAdmin? 'inline-block' : 'none';
  loginBtn.textContent = isAdmin? 'Выйти' : 'Войти';
}

loginBtn.onclick = () => {
  if (localStorage.getItem(ADMIN_KEY) === 'true') {
    localStorage.removeItem(ADMIN_KEY);
    checkAdminStatus();
    alert('Выход выполнен');
  } else {
    const pass = prompt('Пароль для админки:');
    if (pass === ADMIN_PASSWORD) {
      localStorage.setItem(ADMIN_KEY, 'true');
      checkAdminStatus();
      alert('Вход выполнен');
    } else if (pass!== null) {
      alert('Неверный пароль');
    }
  }
};

async function loadAnime() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?select=*,episodes(*)&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!res.ok) throw new Error('Ошибка загрузки');

    allAnime = await res.json();
    initGenreFilter(allAnime);
    renderCatalog(allAnime);
  } catch (e) {
    animeList.innerHTML = '<p class="empty">Не удалось загрузить аниме. Проверь URL и KEY.</p>';
    console.error(e);
  }
}

function initGenreFilter(animeData) {
  const genres = new Set();
  animeData.forEach(a => a.genres?.forEach(g => genres.add(g)));
  genreFilter.innerHTML = '<option value="">Все жанры</option>';
  [...genres].sort().forEach(genre => {
    genreFilter.innerHTML += `<option value="${genre}">${genre}</option>`;
  });
}

function applyFilters() {
  const query = searchInput.value.toLowerCase().trim();
  const selectedGenre = genreFilter.value;
  let filtered = allAnime;

  if (selectedGenre) filtered = filtered.filter(a => a.genres?.includes(selectedGenre));
  if (query) filtered = filtered.filter(a => a.title.toLowerCase().includes(query));

  renderCatalog(filtered);
}

searchInput.addEventListener('input', applyFilters);
genreFilter.addEventListener('change', applyFilters);

function renderCatalog(animeData) {
  animeList.innerHTML = '';
  if (animeData.length === 0) {
    animeList.innerHTML = '<p class="empty">Ничего не найдено</p>';
    return;
  }

  animeData.forEach(anime => {
    const watchedCount = getWatchedCount(anime.id);
    const totalEpisodes = anime.episodes?.length || 0;

    const card = document.createElement('div');
    card.className = 'anime-card';
    card.innerHTML = `
      ${watchedCount > 0? `<div class="watched-badge">${watchedCount}/${totalEpisodes}</div>` : ''}
      <img src="${anime.cover}" alt="${anime.title}" loading="lazy">
      <div class="info">
        <h3>${anime.title}</h3>
        <div class="genres">${anime.genres?.join(', ') || ''}</div>
      </div>
    `;
    card.onclick = () => openPlayer(anime);
    animeList.appendChild(card);
  });
}

function openPlayer(anime) {
  currentAnime = anime;
  document.getElementById('watching-title').textContent = anime.title;
  document.getElementById('modal-desc').textContent = anime.description || 'Описание отсутствует';
  document.getElementById('modal-cover').src = anime.cover;
  document.getElementById('shiki-link').href = `https://shikimori.one/anime/${anime.shiki_id}`;

  const sortedEps = (anime.episodes || []).sort((a, b) => a.num - b.num);
  const startEp = sortedEps[0];

  if (startEp) {
    loadEpisode(startEp);
    renderEpisodeList(anime, startEp.num);
  } else {
    document.getElementById('episode-list').innerHTML = '<p class="empty">Серии не добавлены</p>';
    player.src = '';
  }

  playerModal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function loadEpisode(episode) {
  // Если есть ссылка в БД - используем её, иначе Shikimori
  if (episode.link && episode.link.trim()!== '') {
    player.src = episode.link;
  } else {
    player.src = `https://shikimori.one/anime/${currentAnime.shiki_id}/embed?episode=${episode.num}`;
  }
}

function renderEpisodeList(anime, activeNum) {
  const epList = document.getElementById('episode-list');
  epList.innerHTML = '';

  anime.episodes.sort((a, b) => a.num - b.num).forEach(ep => {
    const btn = document.createElement('button');
    btn.textContent = `${ep.num}. ${ep.title || 'Серия ' + ep.num}`;
    if (ep.num === activeNum) btn.classList.add('active');
    if (isEpisodeWatched(anime.id, ep.num)) btn.classList.add('watched');
    if (ep.link) btn.title = 'Есть внешняя ссылка';

    btn.onclick = () => {
      loadEpisode(ep);
      saveWatchedEpisode(anime.id, ep.num);
      renderEpisodeList(anime, ep.num);
    };
    epList.appendChild(btn);
  });
}

function getWatchedData() {
  return JSON.parse(localStorage.getItem(WATCHED_KEY) || '{}');
}

function saveWatchedEpisode(animeId, epNum) {
  const data = getWatchedData();
  if (!data[animeId]) data[animeId] = [];
  if (!data[animeId].includes(epNum)) {
    data[animeId].push(epNum);
    localStorage.setItem(WATCHED_KEY, JSON.stringify(data));
  }
}

function isEpisodeWatched(animeId, epNum) {
  return getWatchedData()[animeId]?.includes(epNum) || false;
}

function getWatchedCount(animeId) {
  return getWatchedData()[animeId]?.length || 0;
}

document.getElementById('close-player').onclick = () => {
  playerModal.style.display = 'none';
  player.src = '';
  document.body.style.overflow = 'auto';
  currentAnime = null;
  renderCatalog(allAnime);
};

playerModal.onclick = (e) => {
  if (e.target === playerModal) document.getElementById('close-player').click();
};

// Закрытие по ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && playerModal.style.display === 'block') {
    document.getElementById('close-player').click();
  }
});
