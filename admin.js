const SUPABASE_URL = 'https://ywovqlnadbpwxnkvllhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b3ZxbG5hZGJwd3hua3ZsbGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Njk1NjAsImV4cCI6MjA5NDQ0NTU2MH0.Fb9zC4g6BPV2R-ogXNvtyGmh_HJf06E7pNnin1E1dpw';
const ADMIN_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b3ZxbG5hZGJwd3hua3ZsbGhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2OTU2MCwiZXhwIjoyMDk0NDQ1NTYwfQ.fBYFmvcweDfbLIjxl6HpAk4ApSuTxDQKQSabNwib_hk';
const ADMIN_PASSWORD = 'admin123';

if (localStorage.getItem(ADMIN_KEY)!== 'true') {
  alert('Доступ запрещен');
  window.location.href = '/';
}

loadAnime();

async function loadAnime() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?select=*&order=created_at.desc`, {
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
    list.innerHTML = '<p style="color:var(--text-muted);">Пока пусто</p>';
    return;
  }
  data.forEach(anime => {
    list.innerHTML += `
      <div class="anime-edit-item">
        <div><strong>${anime.title}</strong> [Shiki ID: ${anime.shiki_id}]</div>
        <button onclick="deleteAnime(${anime.id})" class="btn btn-danger">Удалить</button>
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

document.getElementById('save-anime').onclick = async () => {
  const body = {
    title: document.getElementById('title').value,
    shiki_id: document.getElementById('shiki_id').value,
    cover: document.getElementById('cover').value,
    genres: document.getElementById('genres').value.split(',').map(s => s.trim()).filter(Boolean),
    description: document.getElementById('description').value
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/anime`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  });

  if (res.ok) {
    alert('Аниме добавлено');
    location.reload();
  } else {
    alert('Ошибка: ' + await res.text());
  }
};

document.getElementById('save-episode').onclick = async () => {
  const body = {
    anime_id: document.getElementById('anime-select').value,
    num: parseInt(document.getElementById('ep-num').value),
    title: document.getElementById('ep-title').value
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/episodes`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (res.ok) {
    alert('Серия добавлена');
    location.reload();
  } else {
    alert('Ошибка: ' + await res.text());
  }
};

window.deleteAnime = async (id) => {
  if (!confirm('Удалить аниме и все серии?')) return;
  await fetch(`${SUPABASE_URL}/rest/v1/anime?id=eq.${id}`, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  location.reload();
};
