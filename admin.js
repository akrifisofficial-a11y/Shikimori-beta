const SUPABASE_URL = 'https://ywovqlnadbpwxnkvllhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b3ZxbG5hZGJwd3hua3ZsbGhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2OTU2MCwiZXhwIjoyMDk0NDQ1NTYwfQ.fBYFmvcweDfbLIjxl6HpAk4ApSuTxDQKQSabNwib_hk';
const ADMIN_KEY = 'isAdmin';
const ADMIN_PASSWORD = 'admin123'; // должен совпадать с SQL

let editingAnime = null;

if (localStorage.getItem(ADMIN_KEY)!== 'true') {
  alert('Доступ запрещен. Войди через главную страницу');
  window.location.href = '/';
}

loadAnime();

async function loadAnime() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?select=*,episodes(*)&order=created_at.desc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });

    const data = await res.json();
    renderEditList(data);
    fillAnimeSelect(data);
  } catch (e) {
    console.error(e);
  }
}

function renderEditList(data) {
  const list = document.getElementById('anime-edit-list');
  list.innerHTML = '';

  if (data.length === 0) {
    list.innerHTML = '<p class="empty">Пока пусто. Добавь первое аниме 👆</p>';
    return;
  }

  data.forEach(anime => {
    list.innerHTML += `
      <div class="anime-edit-item">
        <div>
          <strong>${anime.title}</strong>
          <span class="shiki-id">Shiki ID: ${anime.shiki_id}</span>
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

// Добавление аниме
document.getElementById('save-anime').onclick = async () => {
  const body = getAnimeFormData();
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

// Добавление серий пачкой
document.getElementById('save-episodes').onclick = async () => {
  const animeId = document.getElementById('anime-select').value;
  const linksText = document.getElementById('ep-links').value.trim();

  if (!animeId ||!linksText) return alert('Выбери аниме и вставь ссылки');

  const lines = linksText.split('\n').filter(l => l.trim());
  const episodes = lines.map((line, i) => {
    const parts = line.split('|');
    return {
      anime_id: parseInt(animeId),
      num: parseInt(parts[0].trim()),
      title: parts[1]?.trim() || `Серия ${parts[0].trim()}`,
      link: parts[2]?.trim() || null
    };
  });

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

// Редактирование аниме
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
  const body = getEditFormData();

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
  editingAnime = null;
};

window.deleteAnime = async (id) => {
  if (!confirm('Удалить аниме и все серии?')) return;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?id=eq.${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (res.ok) location.reload();
  else alert('❌ Ошибка удаления');
};

function getAnimeFormData() {
  return {
    title: document.getElementById('title').value.trim(),
    shiki_id: document.getElementById('shiki_id').value.trim(),
    cover: document.getElementById('cover').value.trim(),
    genres: document.getElementById('genres').value.split(',').map(s => s.trim()).filter(Boolean),
    description: document.getElementById('description').value.trim()
  };
}

function getEditFormData() {
  return {
    title: document.getElementById('edit-title').value.trim(),
    shiki_id: document.getElementById('edit-shiki_id').value.trim(),
    cover: document.getElementById('edit-cover').value.trim(),
    genres: document.getElementById('edit-genres').value.split(',').map(s => s.trim()).filter(Boolean),
    description: document.getElementById('edit-description').value.trim()
  };
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
