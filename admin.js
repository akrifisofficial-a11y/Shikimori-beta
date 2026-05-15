const const SUPABASE_URL = 'https://ywovqlnadbpwxnkvllhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b3ZxbG5hZGJwd3hua3ZsbGhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2OTU2MCwiZXhwIjoyMDk0NDQ1NTYwfQ.fBYFmvcweDfbLIjxl6HpAk4ApSuTxDQKQSabNwib_hk';
const ADMIN_KEY = 'isAdmin';
const ADMIN_PASSWORD = 'admin123';

let editingAnime = null;

if (localStorage.getItem(ADMIN_KEY)!== 'true') {
  alert('Доступ запрещен');
  window.location.href = '/';
}

loadAnime();

// Добавление строки для серии
document.getElementById('add-episode-row').onclick = () => {
  const container = document.getElementById('episodes-form');
  const row = document.createElement('div');
  row.className = 'episode-row';
  row.innerHTML = `
    <input type="number" class="ep-num" placeholder="№" min="1">
    <input type="text" class="ep-title" placeholder="Название серии">
    <input type="text" class="ep-link" placeholder="Ссылка на видео">
    <button type="button" class="btn btn-danger remove-ep">×</button>
  `;
  container.appendChild(row);
};

// Удаление строки
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('remove-ep')) {
    e.target.closest('.episode-row').remove();
  }
});

async function loadAnime() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?select=*,episodes(*)&order=created_at.desc`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const data = await res.json();
  renderEditList(data);
  fillAnimeSelect(data);
}

function renderEditList(data) {
  const list = document.getElementById('anime-edit-list');
  list.innerHTML = '';
  
  if (data.length === 0) {
    list.innerHTML = '<p class="empty">Пока пусто</p>';
    return;
  }

  data.forEach(anime => {
    list.innerHTML += `
      <div class="anime-edit-item">
        <div>
          <strong>${anime.title}</strong>
          <span class="shiki-id">ID: ${anime.shiki_id}</span>
          <span class="ep-count">${anime.episodes?.length || 0} серий</span>
        </div>
        <div class="edit-actions">
          <button onclick='editAnime(${JSON.stringify(anime)})' class="btn">Редактировать</button>
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

// Сохранение серий из отдельных полей
document.getElementById('save-episodes').onclick = async () => {
  const animeId = document.getElementById('anime-select').value;
  if (!animeId) return alert('Выбери аниме');

  const rows = document.querySelectorAll('.episode-row');
  const episodes = [];

  rows.forEach(row => {
    const num = row.querySelector('.ep-num').value;
    const title = row.querySelector('.ep-title').value;
    const link = row.querySelector('.ep-link').value;
    
    if (num) {
      episodes.push({
        anime_id: parseInt(animeId),
        num: parseInt(num),
        title: title || `Серия ${num}`,
        link: link || null
      });
    }
  });

  if (episodes.length === 0) return alert('Заполни хотя бы одну серию');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/episodes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(episodes)
  });

  if (res.ok) {
    alert(`✅ Добавлено ${episodes.length} серий`);
    location.reload();
  } else {
    alert('❌ Ошибка: ' + await res.text());
  }
};

// Остальные функции без изменений
document.getElementById('save-anime').onclick = async () => {
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
    alert('❌ Ошибка: ' + await res.text());
  }
};

window.editAnime = (anime) => {
  editingAnime = anime;
  document.getElementById('edit-title').value = anime.title;
  document.getElementById('edit-shiki_id').value = anime.shiki_id;
  document.getElementById('edit-cover').value = anime.cover || '';
  document.getElementById('edit-genres').value = anime.genres?.join(', ') || '';
  document.getElementById('edit-description').value = anime.description || '';
  document.getElementById('edit-modal').style.display = 'block';
};

document.getElementById('update-anime').onclick = async () => {
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
    alert('❌ Ошибка: ' + await res.text());
  }
};

document.getElementById('close-edit').onclick = () => {
  document.getElementById('edit-modal').style.display = 'none';
};

window.deleteAnime = async (id) => {
  if (!confirm('Удалить аниме и все серии?')) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?id=eq.${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (res.ok) location.reload();
};

function getHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    'x-admin-password': ADMIN_PASSWORD
  };
    }
