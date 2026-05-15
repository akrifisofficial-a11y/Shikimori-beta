const const SUPABASE_URL = 'https://ywovqlnadbpwxnkvllhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b3ZxbG5hZGJwd3hua3ZsbGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Njk1NjAsImV4cCI6MjA5NDQ0NTU2MH0.Fb9zC4g6BPV2R-ogXNvtyGmh_HJf06E7pNnin1E1dpw';

const WATCHED_KEY = 'anime_watched_progress';
const ADMIN_KEY = 'isAdmin';
const ADMIN_PASSWORD = 'admin123';

let allAnime = [];
let currentAnime = null;

// Ждём пока DOM загрузится
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkAdminStatus();
  bindEvents();
  loadAnime();
});

function bindEvents() {
  // Используем делегирование событий чтобы не ловить ошибки если элементов нет
  document.addEventListener('click', (e) => {
    if (e.target.id === 'theme-toggle') toggleTheme();
    if (e.target.id === 'login-btn') handleLogin();
    if (e.target.id === 'close-player') closePlayer();
    if (e.target.id === 'add-episode-row') addEpisodeRow();
    if (e.target.classList.contains('remove-ep')) e.target.closest('.episode-row').remove();
    if (e.target.classList.contains('modal') && e.target.id === 'player-modal') closePlayer();
  });

  // Поиск и фильтр
  const searchInput = document.getElementById('search');
  const genreFilter = document.getElementById('genre-filter');
  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (genreFilter) genreFilter.addEventListener('change', applyFilters);

  // Закрытие по ESC
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

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?select=*,episodes(*)&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!res.ok) throw new Error('Ошибка загрузки: ' + res.status);

    allAnime = await res.json();
    initGenreFilter(allAnime);
    renderCatalog(allAnime);
  } catch (e) {
    animeList.innerHTML = '<p class="empty">Не удалось загрузить аниме. Проверь URL, KEY и CORS в Supabase.</p>';
    console.error(e);
  }
}

function initGenreFilter(animeData) {
  const genreFilter = document.getElementById('genre-filter');
  if (!genreFilter) return;

  const genres = new Set();
  animeData.forEach(a
