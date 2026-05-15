const SUPABASE_URL = 'https://ywovqlnadbpwxnkvllhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b3ZxbG5hZGJwd3hua3ZsbGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Njk1NjAsImV4cCI6MjA5NDQ0NTU2MH0.Fb9zC4g6BPV2R-ogXNvtyGmh_HJf06E7pNnin1E1dpw';

const animeList = document.getElementById('anime-list');
const playerModal = document.getElementById('player-modal');
const player = document.getElementById('player');
const searchInput = document.getElementById('search');
const genreFilter = document.getElementById('genre-filter');
const themeToggle = document.getElementById('theme-toggle');

let allAnime = [];
const WATCHED_KEY = 'anime_watched_progress';
const ADMIN_KEY = 'isAdmin';

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
  if (localStorage.getItem(ADMIN_KEY) === 'true') {
    document.getElementById('admin-link').style.display = 'inline-block';
    document.getElementById('login-btn').textContent = 'Выйти';
  }
}

document.getElementById('login-btn').onclick = () => {
  if (localStorage.getItem(ADMIN_KEY) === 'true') {
    localStorage.removeItem(ADMIN_KEY);
    location.reload();
  } else {
    const pass = prompt('Пароль для админки:');
    if (pass === 'admin123') {
      localStorage.setItem(ADMIN_KEY, 'true');
      location.reload();
    }
  }
};

async function loadAnime() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?select=*,episodes(*)&order=created_at.desc`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  allAnime = await res.json();
  initGenreFilter(allAnime);
  renderCatalog(allAnime);
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
    animeList.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:var(--text-muted);">Ничего не найдено</p>';
    return;
  }
  animeData.forEach(anime => {
    const watchedCount = getWatchedCount(anime.id);
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.innerHTML = `
      ${watchedCount > 0? `<div class="watched-badge">${watchedCount}/${anime.episodes.length}</div>` : ''}
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
  document.getElementById('watching-title').textContent = anime.title;
  document.getElementById('modal-desc').textContent = anime.description || '';
  document.getElementById('modal-cover').src = anime.cover;
  document.getElementById('shiki-link').href = `https://shikimori.one/anime/${anime.shiki_id}`;

  const startEp = anime.episodes.sort((a,b) => a.num - b.num)[0];
  loadShikimoriEpisode(anime.shiki_id, startEp?.num || 1);

  playerModal.style.display = 'block';
  document.body.style.overflow = 'hidden';
  renderEpisodeList(anime, startEp?.num || 1);
}

function loadShikimoriEpisode(shikiId, episodeNum) {
  player.src = `https://shikimori.one/anime/${shikiId}/embed?episode=${episodeNum}`;
}

function renderEpisodeList(anime, activeNum) {
  const epList = document.getElementById('episode-list');
  epList.innerHTML = '';
  anime.episodes.sort((a,b) => a.num - b.num).forEach(ep => {
    const btn = document.createElement('button');
    btn.textContent = `${ep.num}. ${ep.title || 'Серия ' + ep.num}`;
    if (ep.num === activeNum) btn.classList.add('active');
    if (isEpisodeWatched(anime.id, ep.num)) btn.classList.add('watched');
    btn.onclick = () => {
      loadShikimoriEpisode(anime.shiki_id, ep.num);
      saveWatchedEpisode(anime.id, ep.num);
      renderEpisodeList(anime, ep.num);
    };
    epList.appendChild(btn);
  });
}

function getWatchedData() { return JSON.parse(localStorage.getItem(WATCHED_KEY) || '{}'); }
function saveWatchedEpisode(animeId, epNum) {
  const data = getWatchedData();
  if (!data[animeId]) data[animeId] = [];
  if (!data[animeId].includes(epNum)) {
    data[animeId].push(epNum);
    localStorage.setItem(WATCHED_KEY, JSON.stringify(data));
  }
}
function isEpisodeWatched(animeId, epNum) { return getWatchedData()[animeId]?.includes(epNum) || false; }
function getWatchedCount(animeId) { return getWatchedData()[animeId]?.length || 0; }

document.getElementById('close-player').onclick = () => {
  playerModal.style.display = 'none';
  player.src = '';
  document.body.style.overflow = 'auto';
  renderCatalog(allAnime);
};
playerModal.onclick = (e) => { if (e.target === playerModal) document.getElementById('close-player').click(); };
