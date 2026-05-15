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
  document.getElementById('logout-btn').onclick = () => {
    localStorage.removeItem(ADMIN_KEY);
    window.location.href = '/';
  };
  document.getElementById('auto-fill-episodes').onclick = autoFillEpisodes;

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-ep')) {
      e.target.closest('.episode-row').remove();
    }
  });

  // Авто-парсинг ссылки
  document.getElementById('shiki_url').addEventListener('change', (e) => {
    parseShikimoriUrl(e.target.value);
  });
}

function parseShikimoriUrl(url) {
  if (!url) return;
  const match = url.match(/shikimori\.(io|one)\/animes\/(\d+)/);
  if (match) {
    const shikiId = match[2];
    document.getElementById('shiki_id').value = shikiId;
    showMessage(`ID найден: ${shikiId}. Нажми "Загрузить серии"`, 'success');
  } else {
    showMessage('Неверная ссылка. Пример: https://shikimori.io/animes/60427-gnosia/watch', 'error');
  }
}

async function autoFillEpisodes() {
  const shikiId = document.getElementById('shiki_id').value.trim();
  if (!shikiId) return showMessage('Сначала вставь ссылку или ID', 'error');

  showMessage('Загружаю данные с Shikimori...', 'info');

  try {
    const res = await fetch(`https://shikimori.one/api/animes/${shikiId}`);
    if (!res.ok) throw new Error('Аниме не найдено');

    const data = await res.json();
    const totalEps = data.episodes_aired || data.episodes || 0;

    if (totalEps === 0) {
      return showMessage('У аниме ещё нет вышедших серий', 'error');
    }

    // Заполняем поля
    document.getElementById('title').value = data.russian || data.name;
    document.getElementById('cover').value = `https://shikimori.one${data.image.original}`;
    document.getElementById('genres').value = data.genres.map(g => g.russian).join(', ');
    document.getElementById('description').value = data.description_html?.replace(/<[^>]*>/g, '') || '';

    // Генерируем строки серий
    document.getElementById('episodes-form').innerHTML = '';
    for (let i = 1; i <= totalEps; i++) {
      addEpisodeRow(i);
    }

    showMessage(`✅ Загружено ${totalEps} серий. Проверь и нажми "Сохранить серии"`, 'success');
  } catch (e) {
    console.error(e);
    showMessage('Ошибка загрузки с Shikimori. Проверь ID', 'error');
  }
}

function addEpisodeRow(num = '') {
  document.getElementById('episodes-form').insertAdjacentHTML('beforeend', `
    <div class="episode-row">
      <input type="number" class="ep-num" placeholder="№" min="1" value="${num}">
      <input type="text" class="ep-title" placeholder="Название серии">
      <button type="button" class="btn btn-danger remove-ep">×</button>
    </div>
  `);
}

async function loadAnime() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?select=*,episodes(*)&order=created_at.desc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error('Ошибка загрузки');
    const data = await res.json();
    renderEditList(data);
    fillAnimeSelect(data);
  } catch (e) {
    console.error(e);
    showMessage('Ошибка загрузки данных', 'error');
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

async function saveEpisodes() {
  const animeId = document.getElementById('anime-select').value;
  if (!animeId) return showMessage('Выбери аниме', 'error');

  const episodes = [];
  document.querySelectorAll('.episode-row').forEach(row => {
    const num = row.querySelector('.ep-num').value;
    const title = row.querySelector('.ep-title').value;
    if (num) {
      episodes.push({
        anime_id: parseInt(animeId),
        num: parseInt(num),
        title: title || `Серия ${num}`
      });
    }
  });

  if (episodes.length === 0) return showMessage('Заполни хотя бы одну серию', 'error');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/episodes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(episodes)
  });

  if (res.ok) {
    showMessage(`✅ Добавлено ${episodes.length} серий`, 'success');
    setTimeout(() => location.reload(), 1000);
  } else {
    showMessage('❌ Ошибка: ' + await res.text(), 'error');
  }
}

async function saveAnime() {
  const shikiId = document.getElementById('shiki_id').value.trim();
  if (!shikiId ||!/^\d+$/.test(shikiId)) {
    return showMessage('Введи корректный Shikimori ID', 'error');
  }

  const body = {
    title: document.getElementById('title').value.trim(),
    shiki_id: shikiId,
    cover: document.getElementById('cover').value.trim(),
    genres: document.getElementById('genres').value.split(',').map(s => s.trim()).filter(Boolean),
    description: document.getElementById('description').value.trim()
  };

  if (!body.title) return showMessage('Заполни название', 'error');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/anime`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body)
  });

  if (res.ok) {
    showMessage('✅ Аниме добавлено', 'success');
    setTimeout(() => location.reload(), 1000);
  } else {
    showMessage('❌ Ошибка: ' + await res.text(), 'error');
  }
}

function getHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    'x-admin-password': ADMIN_PASSWORD
  };
}

function showMessage(text, type = 'info') {
  const old = document.querySelector('.admin-message');
  if (old) old.remove();

  const msg = document.createElement('div');
  msg.className = `admin-message ${type}`;
  msg.textContent = text;
  msg.style.cssText = `
    padding: 12px 16px;
    margin: 12px 0;
    border-radius: 8px;
    font-weight: 500;
    background: ${type === 'error'? '#ef4444' : type === 'success'? '#10b981' : '#3b82f6'};
    color: white;
  `;

  document.querySelector('.admin-section').prepend(msg);
  setTimeout(() => msg.remove(), 4000);
  }
