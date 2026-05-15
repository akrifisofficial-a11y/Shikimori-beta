const SUPABASE_URL = 'https://ywovqlnadbpwxnkvllhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b3ZxbG5hZGJwd3hua3ZsbGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Njk1NjAsImV4cCI6MjA5NDQ0NTU2MH0.Fb9zC4g6BPV2R-ogXNvtyGmh_HJf06E7pNnin1E1dpw';

const WATCHED_KEY = 'anime_watched_progress';
const ADMIN_KEY = 'isAdmin';
const ADMIN_PASSWORD = 'admin123';

let allAnime = [];
let currentAnime = null;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkAdminStatus();
  bindEvents();
  loadAnime();
});

function bindEvents() {
  document.addEventListener('click', (e) => {
    if (e.target.id === 'theme-toggle') toggleTheme();
    if (e.target.id === 'login-btn') handleLogin();
    if (e.target.id === 'close-player') closePlayer();
    if (e.target.classList.contains('modal') && e.target.id === 'player-modal') closePlayer();
  });

  const searchInput = document.getElementById('search');
  const genreFilter = document.getElementById('genre-filter');
  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (genreFilter) genreFilter.addEventListener('change', applyFilters);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('player-modal')?.style.display === 'block') {
      closePlayer();
    }
  });
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = savedTheme === 'dark'? '☀️' : '🌙';
}

function toggleTheme() {
  const newTheme = document.documentElement.getAttribute('data-theme') === 'dark'? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = newTheme === 'dark'? '☀️' : '🌙';
}

function checkAdminStatus() {
  const isAdmin = localStorage.getItem(ADMIN_KEY) === 'true';
  const adminLink = document.getElementById('admin-link');
  const loginBtn = document.getElementById('login-btn');
  if (adminLink) adminLink.style.display = isAdmin? 'inline-block' : 'none';
  if (loginBtn) loginBtn.textContent = isAdmin? 'Выйти' : 'Войти';
}

function handleLogin() {
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
}

async function loadAnime() {
  const animeList = document.getElementById('anime-list');
  if (!animeList) return;

  animeList.innerHTML = '<p class="empty">Загрузка...</p>';

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?select=*,episodes(*)&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    allAnime = await res.json();

    if (allAnime.length === 0) {
      animeList.innerHTML = '<p class="empty">В базе пока нет аниме</p>';
      return;
    }

    initGenreFilter(allAnime);
    renderCatalog(allAnime);
  } catch (e) {
    console.error(e);
    animeList.innerHTML = `<p class="empty" style="color:#ef4444">Ошибка загрузки</p>`;
  }
}

function initGenreFilter(animeData) {
  const genreFilter = document.getElementById('genre-filter');
  if (!genreFilter) return;

  const genres = new Set();
  animeData.forEach(a => a.genres?.forEach(g => genres.add(g)));
  genreFilter.innerHTML = '<option value="">Все жанры</option>';
  [...genres].sort().forEach(genre => {
    genreFilter.innerHTML += `<option value="${genre}">${genre}</option>`;
  });
}

function applyFilters() {
  const query = document.getElementById('search')?.value.toLowerCase().trim() || '';
  const selectedGenre = document.getElementById('genre-filter')?.value || '';
  let filtered = allAnime;

  if (selectedGenre) filtered = filtered.filter(a => a.genres?.includes(selectedGenre));
  if (query) filtered = filtered.filter(a => a.title.toLowerCase().includes(query));

  renderCatalog(filtered);
}

function renderCatalog(animeData) {
  const animeList = document.getElementById('anime-list');
  if (!animeList) return;

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
      <img src="${anime.cover}" alt="${anime.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
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
  document.getElementById('shiki-link').href = `https://shikimori.one/animes/${anime.shiki_id}`;

  const sortedEps = (anime.episodes || []).sort((a, b) => a.num - b.num);
  const startEp = sortedEps[0];

  if (startEp) {
    loadEpisode(startEp.num);
    renderEpisodeList(anime, startEp.num);
  } else {
    document.getElementById('episode-list').innerHTML = '<p class="empty">Серии не добавлены</p>';
    document.getElementById('player').src = '';
  }

  document.getElementById('player-modal').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function loadEpisode(epNum) {
  const player = document.getElementById('player');
  if (!player ||!currentAnime) return;
  player.src = `https://shikimori.one/animes/${currentAnime.shiki_id}/watch=${epNum}`;
}

function renderEpisodeList(anime, activeNum) {
  const epList = document.getElementById('episode-list');
  if (!epList) return;

  epList.innerHTML = '';

  anime.episodes.sort((a, b) => a.num - b.num).forEach(ep => {
    const btn = document.createElement('button');
    btn.textContent = `${ep.num}. ${ep.title || 'Серия ' + ep.num}`;
    if (ep.num === activeNum) btn.classList.add('active');
    if (isEpisodeWatched(anime.id, ep.num)) btn.classList.add('watched');

    btn.onclick = () => {
      loadEpisode(ep.num);
      saveWatchedEpisode(anime.id, ep.num);
      renderEpisodeList(anime, ep.num);
    };
    epList.appendChild(btn);
  });
}

function closePlayer() {
  const modal = document.getElementById('player-modal');
  const player = document.getElementById('player');
  if (modal) modal.style.display = 'none';
  if (player) player.src = '';
  document.body.style.overflow = 'auto';
  currentAnime = null;
  renderCatalog(allAnime);
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
