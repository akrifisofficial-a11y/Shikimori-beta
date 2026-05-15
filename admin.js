const SUPABASE_URL = 'https://ywovqlnadbpwxnkvllhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b3ZxbG5hZGJwd3hua3ZsbGhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2OTU2MCwiZXhwIjoyMDk0NDQ1NTYwfQ.fBYFmvcweDfbLIjxl6HpAk4ApSuTxDQKQSabNwib_hk';
const ADMIN_KEY = 'isAdmin';
const ADMIN_PASSWORD = 'admin123';

let editingAnime = null;

if (localStorage.getItem(ADMIN_KEY)!== 'true') {
  alert('Доступ запрещен');
  window.location.href = '/';
}

document.addEventListener('DOMContentLoaded', () => {
  loadAnime();
  bindEvents();
});

function bindEvents() {
  document.getElementById('add-episode-row').onclick = addEpisodeRow;
  document.getElementById('save-episodes').onclick = saveEpisodes;
  document.getElementById('save-anime').onclick = saveAnime;
  document.getElementById('update-anime').onclick = updateAnime;
  document.getElementById('close-edit').onclick = () => {
    document.getElementById('edit-modal').style.display = 'none';
  };
  document.getElementById('logout-btn').onclick = logout;

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-ep')) {
      e.target.closest('.episode-row').remove();
    }
  });

  document.getElementById('anime-select').onchange = loadEpisodesForAnime;
}

function logout() {
  localStorage.removeItem(ADMIN_KEY);
  window.location.href = '/';
}

function addEpisodeRow() {
  document.getElementById('episodes-form').insertAdjacentHTML('beforeend', `
    <div class="episode-row">
      <input type="number" class="ep-num" placeholder="№" min="1">
      <input type="text" class="ep-title" placeholder="Название серии">
      <input type="text" class="ep-link" placeholder="Ссылка на видео">
      <button type="button" class="btn btn-danger remove-ep">×</button>
    </div>
  `);
}

async function loadAnime() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?select=*,episodes(*)&order=created_at.desc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    renderEditList(data);
    fillAnimeSelect(data);
  } catch (e) {
    console.error('Ошибка загрузки:', e);
    alert('Ошибка загрузки данных. Проверь консоль F12');
  }
}

function renderEditList(data) {
  const list = document.getElementById('anime-edit-list');
  list.innerHTML = '';
  if (data.length === 0) return list.innerHTML = '<p class="empty">Пока пусто</p>';

  data.forEach(anime => {
    list.innerHTML += `
      <div class="anime-edit-item">
        <div class="anime-edit-info">
          <strong>${anime.title}</strong>
          <span class="shiki-id">ID: ${anime.shiki_id}</span>
          <span class="ep-count">${anime.episodes?.length || 0} серий</span>
        </div>
        <div class="edit-actions">
          <button onclick='editAnime(${JSON.stringify(anime).replace(/'/g, "&#39;")})' class="btn">Редактировать</button>
          <button onclick="deleteAnime(${anime.id})" class="btn btn-danger">Удалить</button>
        </div>
      </div>
    `;
  });
}

function fillAnimeSelect(data) {
  const select = document.getElementById('anime-select');
  select.innerHTML = '<option value="">Выбери аниме</option>';
  data.forEach(a => {
    select.innerHTML += `<option value="${a.id}">${a.title}</option>`;
  });
}

async function loadEpisodesForAnime() {
  const animeId = document.getElementById('anime-select').value;
  if (!animeId) return;
  
  const res = await fetch(`${SUPABASE_URL}/rest/v1/episodes?anime_id=eq.${animeId}&order=num.asc`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const episodes = await res.json();
  
  console.log('Загружены серии:', episodes);
}

async function saveEpisodes() {
  const animeId = document.getElementById('anime-select').value;
  if (!animeId) return alert('Выбери аниме');

  const episodes = [];
  let hasError = false;

  document.querySelectorAll('.episode-row').forEach(row => {
    const num = row.querySelector('.ep-num').value;
    const title = row.querySelector('.ep-title').value;
    const link = row.querySelector('.ep-link').value;
    
    if (num) {
      if (!link) hasError = true;
      episodes.push({
        anime_id: parseInt(animeId),
        num: parseInt(num),
        title: title || `Серия ${num}`,
        link: link || null
      });
    }
  });

  if (episodes.length === 0) return alert('Заполни хотя бы одну серию');
  if (hasError) {
    if (!confirm('Есть серии без ссылки. Сохранить всё равно?')) return;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/episodes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(episodes)
  });

  if (res.ok) {
    alert(`✅ Добавлено ${episodes.length} серий`);
    location.reload();
  } else {
    const err = await res.text();
    alert('❌ Ошибка: ' + err);
    console.error(err);
  }
}

async function saveAnime() {
  const body = {
    title: document.getElementById('title').value.trim(),
    shiki_id: document.getElementById('shiki_id').value.trim(),
    cover: document.getElementById('cover').value.trim(),
    genres: document.getElementById('genres').value.split(',').map(s => s.trim()).filter(Boolean),
    description: document.getElementById('description').value.trim()
  };
  
  if (!body.title ||!body.shiki_id) return alert('Заполни название и Shiki ID');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/anime`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body)
  });

  if (res.ok) {
    alert('✅ Аниме добавлено');
    location.reload();
  } else {
    const err = await res.text();
    alert('❌ Ошибка: ' + err);
    console.error(err);
  }
}

window.editAnime = (anime) => {
  editingAnime = anime;
  document.getElementById('edit-title').value = anime.title;
  document.getElementById('edit-shiki_id').value = anime.shiki_id;
  document.getElementById('edit-cover').value = anime.cover || '';
  document.getElementById('edit-genres').value = anime.genres?.join(', ') || '';
  document.getElementById('edit-description').value = anime.description || '';
  document.getElementById('edit-modal').style.display = 'block';
};

async function updateAnime() {
  const body = {
    title: document.getElementById('edit-title').value.trim(),
    shiki_id: document.getElementById('edit-shiki_id').value.trim(),
    cover: document.getElementById('edit-cover').value.trim(),
    genres: document.getElementById('edit-genres').value.split(',').map(s => s.trim()).filter(Boolean),
    description: document.getElementById('edit-description').value.trim()
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?id=eq.${editingAnime.id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(body)
  });

  if (res.ok) {
    alert('✅ Обновлено');
    location.reload();
  } else {
    const err = await res.text();
    alert('❌ Ошибка: ' + err);
    console.error(err);
  }
}

window.deleteAnime = async (id) => {
  if (!confirm('Удалить аниме и все серии?')) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?id=eq.${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (res.ok) location.reload();
  else {
    const err = await res.text();
    alert('❌ Ошибка удаления: ' + err);
  }
};

function getHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    'x-admin-password': ADMIN_PASSWORD
  };
}isAdmin';
