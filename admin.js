const SUPABASE_URL = 'https://ywovqlnadbpwxnkvllhh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b3ZxbG5hZGJwd3hua3ZsbGhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2OTU2MCwiZXhwIjoyMDk0NDQ1NTYwfQ.fBYFmvcweDfbLIjxl6HpAk4ApSuTxDQKQSabNwib_hk';
const ADMIN_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3b3ZxbG5hZGJwd3hua3ZsbGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Njk1NjAsImV4cCI6MjA5NDQ0NTU2MH0.Fb9zC4g6BPV2R-ogXNvtyGmh_HJf06E7pNnin1E1dpw';
const ADMIN_PASSWORD = 'admin123'; // должен совпадать с SQL

// Проверка доступа
if (localStorage.getItem(ADMIN_KEY)!== 'true') {
  alert('Доступ запрещен. Войди через главную страницу');
  window.location.href = '/';
}

loadAnime();

async function loadAnime() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!res.ok) throw new Error('Ошибка загрузки');

    const data = await res.json();
    renderEditList(data);
    fillAnimeSelect(data);
  } catch (e) {
    document.getElementById('anime-edit-list').innerHTML = '<p class="empty">Ошибка загрузки данных</p>';
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
        </div>
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
  const title = document.getElementById('title').value.trim();
  const shiki_id = document.getElementById('shiki_id').value.trim();

  if (!title ||!shiki_id) {
    alert('Заполни название и Shiki ID');
    return;
  }

  const body = {
    title: title,
    shiki_id: shiki_id,
    cover: document.getElementById('cover').value.trim(),
    genres: document.getElementById('genres').value.split(',').map(s => s.trim()).filter(Boolean),
    description: document.getElementById('description').value.trim()
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/anime`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      'x-admin-password': ADMIN_PASSWORD
    },
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
};

document.getElementById('save-episode').onclick = async () => {
  const animeId = document.getElementById('anime-select').value;
  const epNum = document.getElementById('ep-num').value;

  if (!animeId ||!epNum) {
    alert('Выбери аниме и укажи номер серии');
    return;
  }

  const body = {
    anime_id: parseInt(animeId),
    num: parseInt(epNum),
    title: document.getElementById('ep-title').value.trim()
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/episodes`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'x-admin-password': ADMIN_PASSWORD
    },
    body: JSON.stringify(body)
  });

  if (res.ok) {
    alert('✅ Серия добавлена');
    location.reload();
  } else {
    const err = await res.text();
    alert('❌ Ошибка: ' + err);
    console.error(err);
  }
};

window.deleteAnime = async (id) => {
  if (!confirm('Удалить аниме и все серии? Отменить нельзя.')) return;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/anime?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'x-admin-password': ADMIN_PASSWORD
    }
  });

  if (res.ok) {
    alert('✅ Удалено');
    location.reload();
  } else {
    const err = await res.text();
    alert('❌ Ошибка удаления: ' + err);
  }
};

// Кнопка выхода
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = 'Выйти из админки';
  logoutBtn.className = 'btn btn-danger';
  logoutBtn.style.marginTop = '20px';
  logoutBtn.onclick = () => {
    localStorage.removeItem(ADMIN_KEY);
    window.location.href = '/';
  };
  document.querySelector('main').appendChild(logoutBtn);
});
