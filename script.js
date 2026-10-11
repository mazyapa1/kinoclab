const SUPABASE_URL = 'https://xekcmdkfdnrxnxpwkxhu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhla2NtZGtmZG5yeG54cHdreGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5ODUwMjMsImV4cCI6MjEwMjU2MTAyM30.wFHaiZTbPxf8gHZIZrSHoQqVTlJdrQvVYVudpAFCLoI';

// ============ ПЕРЕМЕННЫЕ ============
let supabaseClient;
let currentUser = null;
let currentUserProfile = null;
let selectedRating = 0;
let selectedRecommend = true;
let editRating = 0;
let editRecommend = true;
let currentEditReviewId = null;
let currentCategoryFilter = null;
let currentChatFriend = null;
let currentChatFriendName = '';
let currentChatFriendProfile = null;
let chatChannel = null;
let presenceChannel = null;
let presenceTimer = null;
let notificationsChannel = null;
let themeChannel = null;
let unreadCount = 0;
let isZoomed = false;
let currentSection = 'home';
let globalLastDateShown = null;
let wheelMovies = [];
let isSpinning = false;
let currentRotation = 0;
let isChatOpen = false;
let confirmCallback = null;
let currentRatedSort = 'rating-desc';
let currentReviewsSort = 'date-desc';
let ratedMoviesData = [];
let recentReviewsCache = null;
let messagesCache = {};
let intervalsStarted = false;
let allChatFriends = [];
let currentReplyMessage = null;
let openMenuEl = null;
let currentGlobalTheme = null;
let myFriendIdsCache = null;
let watchedMovieIds = new Set();
let isInWatchlist = false;
let dbMovieId = null;
const kinopoiskMovieCache = new Map();
const rowState = {};

let currentFilmId = null;
let heroFilms = [];
let heroIndex = 0;
let heroAutoTimer = null;

let currentAdminTab = 'stats';

const tmdbPosterCache = new Map();
const tmdbMovieCache = new Map();

window._pendingTmdbIds = {};

try {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) { console.error('Supabase init error:', e); }

window.alert = function () {};

// ============ УТИЛИТЫ ============
function isEnMode() {
  return (typeof currentLang !== 'undefined') && currentLang === 'en';
}

// Быстрая локализация: L('по-русски', 'in English')
function L(ru, en) { return isEnMode() ? en : ru; }

function showNotification(message, type = 'error') {
  document.querySelectorAll('.custom-notification').forEach(n => n.remove());
  const colors = { error: { bg: '#ef4444', icon: '❌' }, success: { bg: '#22c55e', icon: '✅' }, info: { bg: '#a855f7', icon: 'ℹ️' } };
  const config = colors[type] || colors.error;
  const n = document.createElement('div');
  n.className = 'custom-notification';
  n.style.cssText = 'position:fixed;top:20px;right:20px;background:#1a1a24;border:1px solid ' + config.bg + ';color:#fff;padding:14px 18px;border-radius:12px;z-index:10000;font-size:0.88rem;box-shadow:0 12px 32px rgba(0,0,0,0.5);max-width:350px;display:flex;align-items:center;gap:10px;cursor:pointer;font-family:inherit;';
  const i = document.createElement('span');
  i.style.fontSize = '1.3rem';
  i.textContent = config.icon;
  const m = document.createElement('span');
  m.textContent = String(message ?? '');
  const c = document.createElement('span');
  c.style.cssText = 'margin-left:auto;color:#666;font-size:1.1rem;padding-left:8px;';
  c.textContent = '×';
  n.append(i, m, c);
  n.onclick = () => { n.style.animation = 'notifOut 0.2s ease'; setTimeout(() => n.remove(), 200); };
  document.body.appendChild(n);
  setTimeout(() => { if (n.parentNode) { n.style.animation = 'notifOut 0.2s ease'; setTimeout(() => n.remove(), 200); } }, 4000);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function escapeForOnclick(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function starEmoji() {
  if (currentGlobalTheme === 'halloween') return '🎃';
  if (currentGlobalTheme === 'newyear') return '⛄';
  return '★';
}

const STAR_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

function getPosterHtml(poster, title, w, h, fs) {
  if (poster) return '<img src="' + escapeHtml(poster) + '" style="width:' + w + ';height:' + h + ';object-fit:cover;border-radius:5px;" onerror="this.style.display=\'none\'" loading="lazy">';
  return '<div style="width:' + w + ';height:' + h + ';background:linear-gradient(135deg,#2a1a4a,#13131a);display:flex;align-items:center;justify-content:center;font-size:' + fs + ';border-radius:5px;">🎬</div>';
}

function pluralizeOcenka(count) {
  if (isEnMode()) {
    return count + (count === 1 ? ' rating' : ' ratings');
  }
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return count + ' оценок';
  if (n1 > 1 && n1 < 5) return count + ' оценки';
  if (n1 === 1) return count + ' оценка';
  return count + ' оценок';
}

// ============ ДАТЫ (локализованные) ============
function formatTimeMSK(s) {
  if (!s) return '';
  return new Date(s).toLocaleTimeString(isEnMode() ? 'en-US' : 'ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
}
function formatDateSeparator(s) {
  if (!s) return '';
  const en = isEnMode();
  const d = new Date(s), t = new Date(), y = new Date(t);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return en ? 'Today' : 'Сегодня';
  if (d.toDateString() === y.toDateString()) return en ? 'Yesterday' : 'Вчера';
  return d.toLocaleDateString(en ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'long' });
}
function formatDate(s) {
  if (!s) return '';
  const en = isEnMode();
  const d = new Date(s), diff = Math.floor((new Date() - d) / 86400000);
  if (diff === 0) return en ? 'today' : 'сегодня';
  if (diff === 1) return en ? 'yesterday' : 'вчера';
  if (diff < 7) return en ? diff + ' days ago' : diff + ' дня назад';
  return d.toLocaleDateString(en ? 'en-US' : 'ru-RU');
}
function formatChatTime(s) {
  const en = isEnMode();
  const d = new Date(s), now = new Date(), diff = now - d;
  const mn = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dd = Math.floor(diff / 86400000);
  if (mn < 1) return en ? 'now' : 'сейчас';
  if (mn < 60) return en ? mn + ' min' : mn + ' мин';
  if (h < 24) return d.toLocaleTimeString(en ? 'en-US' : 'ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (dd === 1) return en ? 'yesterday' : 'вчера';
  if (dd < 7) return en ? dd + 'd' : dd + ' дн';
  return d.toLocaleDateString(en ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short' });
}
function formatLastSeen(s) {
  const en = isEnMode();
  if (!s) return en ? 'seen recently' : 'был(а) недавно';
  const d = new Date(s), now = new Date(), diff = now - d;
  const sc = Math.floor(diff / 1000), mn = Math.floor(diff / 60000), dd = Math.floor(diff / 86400000);
  if (sc < 120) return en ? 'online' : 'в сети';
  if (mn < 60) {
    if (mn < 2) return en ? 'seen just now' : 'был(а) только что';
    return en ? 'last seen ' + mn + ' min ago' : 'был(а) ' + mn + ' мин назад';
  }
  const isToday = d.toDateString() === now.toDateString();
  const y = new Date(now); y.setDate(y.getDate() - 1);
  const isYest = d.toDateString() === y.toDateString();
  const ts = d.toLocaleTimeString(en ? 'en-US' : 'ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return en ? 'last seen at ' + ts : 'был(а) в ' + ts;
  if (isYest) return en ? 'last seen yesterday at ' + ts : 'был(а) вчера в ' + ts;
  if (dd < 7) return en ? 'last seen ' + dd + ' days ago' : 'был(а) ' + dd + ' дн назад';
  return en
    ? 'last seen ' + d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    : 'был(а) ' + d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// ============ КИНОПОИСК ============
async function getKinopoiskMovie(kinopoiskId) {
  if (!kinopoiskId) return null;
  if (kinopoiskMovieCache.has(kinopoiskId)) return kinopoiskMovieCache.get(kinopoiskId);
  try {
    const cached = localStorage.getItem('kp_' + kinopoiskId);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed._expires > Date.now()) {
        kinopoiskMovieCache.set(kinopoiskId, parsed.data);
        return parsed.data;
      } else localStorage.removeItem('kp_' + kinopoiskId);
    }
  } catch (e) {}
  try {
    const { data } = await supabaseClient.functions.invoke('get-kinopoisk-movie', { body: { filmId: kinopoiskId } });
    kinopoiskMovieCache.set(kinopoiskId, data || null);
    if (data) {
      try { localStorage.setItem('kp_' + kinopoiskId, JSON.stringify({ data, _expires: Date.now() + 86400000 })); }
      catch (e) {
        try { Object.keys(localStorage).forEach(k => { if (k.startsWith('kp_')) localStorage.removeItem(k); }); } catch (e2) {}
      }
    }
    return data || null;
  } catch (e) { return null; }
}

// ============ TMDB ============
async function findTmdbId(kinopoiskId, title, year) {
  if (!kinopoiskId || !title) return null;
  if (tmdbMovieCache.has('map_' + kinopoiskId)) return tmdbMovieCache.get('map_' + kinopoiskId);
  try {
    const ls = localStorage.getItem('tmap_' + kinopoiskId);
    if (ls) {
      const parsed = JSON.parse(ls);
      if (parsed._expires > Date.now()) { tmdbMovieCache.set('map_' + kinopoiskId, parsed.tmdb_id); return parsed.tmdb_id; }
    }
  } catch (e) {}
  try {
    const { data } = await supabaseClient.from('movie_ids_map').select('tmdb_id').eq('kinopoisk_id', kinopoiskId).maybeSingle();
    if (data?.tmdb_id) {
      tmdbMovieCache.set('map_' + kinopoiskId, data.tmdb_id);
      try { localStorage.setItem('tmap_' + kinopoiskId, JSON.stringify({ tmdb_id: data.tmdb_id, _expires: Date.now() + 604800000 })); } catch (e) {}
      return data.tmdb_id;
    }
  } catch (e) {}
  try {
    const { data } = await supabaseClient.functions.invoke('tmdb-find', { body: { title, year } });
    const results = data?.results || [];
    if (!results.length) { tmdbMovieCache.set('map_' + kinopoiskId, null); return null; }
    const tmdbId = results[0].tmdbId;
    try { await supabaseClient.from('movie_ids_map').upsert({ kinopoisk_id: kinopoiskId, tmdb_id: tmdbId, updated_at: new Date().toISOString() }, { onConflict: 'kinopoisk_id' }); } catch (e) {}
    tmdbMovieCache.set('map_' + kinopoiskId, tmdbId);
    try { localStorage.setItem('tmap_' + kinopoiskId, JSON.stringify({ tmdb_id: tmdbId, _expires: Date.now() + 604800000 })); } catch (e) {}
    return tmdbId;
  } catch (e) { return null; }
}

async function getTmdbMovie(tmdbId) {
  if (!tmdbId) return null;
  if (tmdbMovieCache.has('movie_' + tmdbId)) return tmdbMovieCache.get('movie_' + tmdbId);
  try {
    const cached = localStorage.getItem('tm_' + tmdbId);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed._expires > Date.now()) { tmdbMovieCache.set('movie_' + tmdbId, parsed.data); return parsed.data; }
    }
  } catch (e) {}
  try {
    const { data } = await supabaseClient.functions.invoke('tmdb-movie', { body: { tmdbId } });
    tmdbMovieCache.set('movie_' + tmdbId, data || null);
    if (data) { try { localStorage.setItem('tm_' + tmdbId, JSON.stringify({ data, _expires: Date.now() + 21600000 })); } catch (e) {} }
    return data || null;
  } catch (e) { return null; }
}

async function getMovie(filmId) {
  if (!isEnMode()) return await getKinopoiskMovie(filmId);
  const kpData = await getKinopoiskMovie(filmId);
  if (!kpData) return null;
  const title = kpData.nameRu || kpData.nameEn;
  const year = kpData.year;
  if (!title) return kpData;
  const tmdbId = await findTmdbId(filmId, title, year);
  if (!tmdbId) return kpData;
  const tmdbData = await getTmdbMovie(tmdbId);
  if (!tmdbData) return kpData;
  return { ...tmdbData, filmId: filmId, kinopoisk_id: filmId };
}

async function getPosterFromAPI(kinopoiskId) {
  if (!kinopoiskId) return '';
  try {
    const { data: mapping } = await supabaseClient.from('movie_ids_map').select('tmdb_id').eq('kinopoisk_id', kinopoiskId).maybeSingle();
    if (mapping?.tmdb_id) {
      const movie = await getTmdbMovie(mapping.tmdb_id);
      const p = movie?.posterUrlPreview || movie?.posterUrl;
      if (p) return p;
    }
  } catch (e) {}
  const data = await getKinopoiskMovie(kinopoiskId);
  return data?.posterUrlPreview || data?.posterUrl || '';
}

// Обогащение EN-данными по kinopoisk_id
async function getMovieEnglish(kid, fallbackName, fallbackPoster) {
  const fb = { name: fallbackName, poster: fallbackPoster };
  if (!kid) return fb;

  // Кэш только УДАЧ (7 дней)
  try {
    const ls = localStorage.getItem('enm_' + kid);
    if (ls) {
      const parsed = JSON.parse(ls);
      if (parsed._success && parsed._expires > Date.now()) return parsed;
    }
  } catch (e) {}

  try {
    let tmdbId = null;
    let tmdbData = null;

    // 1. Проверяем маппинг в БД
    try {
      const { data: mapping } = await supabaseClient
        .from('movie_ids_map')
        .select('tmdb_id')
        .eq('kinopoisk_id', kid)
        .maybeSingle();
      if (mapping?.tmdb_id) {
        tmdbId = mapping.tmdb_id;
        tmdbData = await getTmdbMovie(tmdbId);
      }
    } catch (e) {}

    // 2. Если маппинг битый или пустой — ищем заново
    if (!tmdbId || !tmdbData || (!tmdbData.nameEn && !tmdbData.posterUrl)) {
      // Свежие данные Кинопоиска
      let kpFresh = null;
      try {
        const { data } = await supabaseClient.functions.invoke('get-kinopoisk-movie', { body: { filmId: kid } });
        kpFresh = data;
      } catch (e) {}

      const searchTitle = kpFresh?.nameEn || kpFresh?.nameOriginal || null;
      const searchYear = kpFresh?.year || null;

      // Никогда не ищем по русскому названию
      if (searchTitle && !/[\u0400-\u04FF]/.test(searchTitle)) {
        // Ищем в TMDB
        const { data: findData } = await supabaseClient.functions.invoke('tmdb-find', {
          body: { title: searchTitle, year: searchYear }
        });
        const results = findData?.results || [];
        if (results.length) {
          tmdbId = results[0].tmdbId;
          tmdbData = await getTmdbMovie(tmdbId);

          // Сохраняем маппинг
          if (tmdbId) {
            try {
              await supabaseClient.from('movie_ids_map').upsert({
                kinopoisk_id: kid, tmdb_id: tmdbId, updated_at: new Date().toISOString()
              }, { onConflict: 'kinopoisk_id' });
            } catch (e) {}
          }
        }
      }
    }

    if (!tmdbId || !tmdbData) return fb;

    const result = {
      name: tmdbData.nameEn || tmdbData.nameRu || fallbackName,
      poster: tmdbData.posterUrlPreview || tmdbData.posterUrl || fallbackPoster,
      _success: true,
      _expires: Date.now() + 604800000,
    };
    try { localStorage.setItem('enm_' + kid, JSON.stringify(result)); } catch (e) {}
    return result;
  } catch (e) { return fb; }
}

function isAdmin() { return currentUserProfile?.role === 'admin'; }
function canEditReview(uid) { return isAdmin() || uid === currentUser?.id; }

function formatAgeLimit(limit) {
  if (!limit) return '';
  const map = { age0: '0+', age6: '6+', age12: '12+', age16: '16+', age18: '18+' };
  return map[limit] || '';
}

async function saveMoviePosterToDb(kid, name, posterUrl, description) {
  if (!kid || !name) return;
  try {
    const { data: existing } = await supabaseClient.from('movies').select('id, cover_url').eq('kinopoisk_id', kid).maybeSingle();
    if (existing) {
      if (!existing.cover_url && posterUrl) {
        await supabaseClient.from('movies').update({ cover_url: posterUrl, description: description || null }).eq('id', existing.id);
      }
    } else {
      await supabaseClient.from('movies').insert({ name, kinopoisk_id: kid, cover_url: posterUrl, description: description || null });
    }
  } catch (e) {}
}

// ============ ДРУЗЬЯ ============
async function getMyFriendIds() {
  if (myFriendIdsCache) return myFriendIdsCache;
  if (!currentUser?.id) return new Set();
  const { data } = await supabaseClient.from('friendships').select('friend_id').eq('user_id', currentUser.id);
  myFriendIdsCache = new Set((data || []).map(r => r.friend_id).filter(Boolean));
  return myFriendIdsCache;
}

function canSeeReview(review, friendIds) {
  if (!currentUser) return review.visibility !== 'friends';
  if (review.user_id === currentUser.id) return true;
  if (isAdmin()) return true;
  if (review.visibility !== 'friends') return true;
  return friendIds.has(review.user_id);
}

// ============ ПРОСМОТРЕНО ============
async function loadWatchedMovies() {
  if (!currentUser?.id) return;
  try {
    const { data } = await supabaseClient.from('watched').select('kinopoisk_id').eq('user_id', currentUser.id);
    watchedMovieIds = new Set((data || []).map(r => Number(r.kinopoisk_id)));
  } catch (e) { watchedMovieIds = new Set(); }
}

async function toggleWatched(kinopoiskId, movieName, posterUrl, btnEl) {
  if (!currentUser) return;
  const kid = Number(kinopoiskId);
  if (!kid) return;
  const isWatched = watchedMovieIds.has(kid);
  try {
    if (isWatched) {
      await supabaseClient.from('watched').delete().eq('user_id', currentUser.id).eq('kinopoisk_id', kid);
      watchedMovieIds.delete(kid);
      if (btnEl) { btnEl.classList.remove('active'); btnEl.innerHTML = '👁'; }
      showNotification(L('Убрано из просмотренных', 'Removed from watched'), 'info');
    } else {
      await supabaseClient.from('watched').insert({ user_id: currentUser.id, kinopoisk_id: kid, movie_name: movieName || null, poster_url: posterUrl || null });
      watchedMovieIds.add(kid);
      if (btnEl) { btnEl.classList.add('active'); btnEl.innerHTML = '✅'; }
      showNotification(L('Отмечено как просмотрено', 'Marked as watched'), 'success');
    }
    if (currentSection === 'watched') loadWatchedList();
  } catch (e) { showNotification(L('Ошибка: ', 'Error: ') + (e.message || ''), 'error'); }
}

async function loadWatchedList() {
  const c = document.getElementById('watched-grid');
  if (!c) return;
  c.innerHTML = buildMoviesSkeletonHTML();
  try {
    const { data, error } = await supabaseClient.from('watched').select('*').eq('user_id', currentUser.id).order('watched_at', { ascending: false });
    if (error) { c.innerHTML = '<p style="grid-column:1/-1;color:#8b8b9a;">' + L('Ошибка загрузки', 'Load error') + '</p>'; return; }
    if (!data?.length) {
      c.innerHTML = '<p style="grid-column:1/-1;color:#8b8b9a;text-align:center;padding:40px;">' + L('Список пуст', 'List is empty') + '</p>';
      const cnt = document.getElementById('watched-count');
      if (cnt) cnt.textContent = '(0)';
      return;
    }
    if (isEnMode()) {
      await Promise.all(data.map(async w => {
        const kid = Number(w.kinopoisk_id);
        const en = await getMovieEnglish(kid, w.movie_name || '', w.poster_url || '');
        w._name = en.name;
        w._poster = en.poster;
      }));
    } else {
      data.forEach(w => { w._name = w.movie_name || L('Фильм', 'Movie'); w._poster = w.poster_url || ''; });
    }
    c.innerHTML = data.map(w => {
      const t = w._name;
      const kid = w.kinopoisk_id;
      const poster = w._poster;
      const pHtml = poster
        ? '<img src="' + escapeHtml(poster) + '" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.querySelector(\'.no-poster\').style.display=\'flex\';"><div class="no-poster" style="display:none;">🎬</div>'
        : '<div class="no-poster">🎬</div>';
      return '<div class="movie-card" onclick="openFilmPage(\'' + kid + '\')"><div class="poster-wrap">' + pHtml +
        '<button class="watched-btn active" onclick="event.stopPropagation(); toggleWatched(' + kid + ', \'' + escapeForOnclick(t) + '\', \'' + escapeForOnclick(poster) + '\', this)">✅</button>' +
        '</div><div class="movie-info"><h3>' + escapeHtml(t) + '</h3></div></div>';
    }).join('');
    const cnt = document.getElementById('watched-count');
    if (cnt) cnt.textContent = '(' + data.length + ')';
  } catch (e) { c.innerHTML = '<p>' + L('Ошибка загрузки', 'Load error') + '</p>'; }
}

// ============ ХОЧУ ПОСМОТРЕТЬ ============
async function loadWatchlist() {
  const c = document.getElementById('watchlist-grid');
  if (!c) return;
  c.innerHTML = buildMoviesSkeletonHTML();
  try {
    const { data, error } = await supabaseClient
      .from('watchlist').select('*, movies(id, name, kinopoisk_id, cover_url, description)')
      .eq('user_id', currentUser.id).order('added_at', { ascending: false });
    if (error) { c.innerHTML = '<p style="grid-column:1/-1;color:var(--muted);">' + L('Ошибка загрузки', 'Load error') + '</p>'; return; }
    if (!data?.length) {
      c.innerHTML = '<p style="grid-column:1/-1;color:var(--muted);text-align:center;padding:40px;">' + L('Список пуст', 'List is empty') + '</p>';
      const cnt = document.getElementById('watchlist-count');
      if (cnt) cnt.textContent = '(0)';
      return;
    }
    if (isEnMode()) {
      await Promise.all(data.map(async w => {
        const kid = Number(w.kinopoisk_id || w.movies?.kinopoisk_id);
        const en = await getMovieEnglish(kid, w.movies?.name || '', w.movies?.cover_url || '');
        w._name = en.name;
        w._poster = en.poster;
      }));
    } else {
      data.forEach(w => { w._name = w.movies?.name || L('Фильм', 'Movie'); w._poster = w.movies?.cover_url || ''; });
    }
    c.innerHTML = data.map(w => {
      const t = w._name;
      const kid = Number(w.kinopoisk_id || w.movies?.kinopoisk_id);
      const poster = w._poster;
      const isWatched = watchedMovieIds.has(kid);
      const wBtn = '<button class="watched-btn' + (isWatched ? ' active' : '') + '" onclick="event.stopPropagation(); toggleWatched(' + kid + ', \'' + escapeForOnclick(t) + '\', \'' + escapeForOnclick(poster) + '\', this)">' + (isWatched ? '✅' : '👁') + '</button>';
      const pHtml = poster
        ? '<img src="' + escapeHtml(poster) + '" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.querySelector(\'.no-poster\').style.display=\'flex\';"><div class="no-poster" style="display:none;">🎬</div>'
        : '<div class="no-poster">🎬</div>';
      return '<div class="movie-card" onclick="openFilmPage(\'' + kid + '\')"><div class="poster-wrap">' + pHtml + wBtn +
        '<button class="remove-from-watchlist" onclick="event.stopPropagation(); removeFromWatchlist(\'' + w.id + '\')">✕</button>' +
        '</div><div class="movie-info"><h3>' + escapeHtml(t) + '</h3></div></div>';
    }).join('');
    const cnt = document.getElementById('watchlist-count');
    if (cnt) cnt.textContent = '(' + data.length + ')';
  } catch (e) { c.innerHTML = '<p>' + L('Ошибка загрузки', 'Load error') + '</p>'; }
}

async function removeFromWatchlist(itemId) {
  try {
    await supabaseClient.from('watchlist').delete().eq('id', itemId);
    showNotification(L('Убрано из списка', 'Removed from watchlist'), 'info');
    loadWatchlist();
  } catch (e) {}
}

async function toggleWatchlistFromModal(movieId, kinopoiskId, btnEl) {
  if (!currentUser) return;
  try {
    const { data: existing } = await supabaseClient.from('watchlist').select('id').eq('user_id', currentUser.id).eq('movie_id', movieId).maybeSingle();
    if (existing) {
      await supabaseClient.from('watchlist').delete().eq('id', existing.id);
      if (btnEl) { btnEl.classList.remove('active'); btnEl.innerHTML = L('Хочу посмотреть', 'Want to watch'); }
      showNotification(L('Убрано из списка', 'Removed from watchlist'), 'info');
    } else {
      await supabaseClient.from('watchlist').insert({ user_id: currentUser.id, movie_id: movieId, kinopoisk_id: kinopoiskId });
      if (btnEl) { btnEl.classList.add('active'); btnEl.innerHTML = L('В списке', 'In list'); }
      showNotification(L('Добавлено в список', 'Added to watchlist'), 'success');
    }
  } catch (e) {}
}

// ============ ОЦЕНЁННЫЕ ============
function buildMoviesSkeletonHTML() {
  let s = '';
  for (let i = 0; i < 12; i++) {
    s += '<div class="movie-skeleton"><div class="skeleton-poster"></div><div class="skeleton-info"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>';
  }
  return s;
}

async function loadRatedMovies() {
  const c = document.getElementById('rated-movies-list');
  if (!c) return;
  c.innerHTML = buildMoviesSkeletonHTML();
  try {
    const { data: allReviews } = await supabaseClient.from('reviews')
      .select('*, movies(name, kinopoisk_id, cover_url), profiles(username)').limit(100);
    const friendIds = await getMyFriendIds();
    const reviews = (allReviews || []).filter(r => canSeeReview(r, friendIds));
    if (!reviews.length) { c.innerHTML = '<p style="grid-column:1/-1;color:var(--muted);">' + L('Нет оценок', 'No ratings') + '</p>'; return; }

    const map = {};
    reviews.forEach(r => {
      const mid = r.movie_id;
      if (!map[mid]) map[mid] = { name: r.movies?.name || L('Фильм', 'Movie'), kid: r.movies?.kinopoisk_id || mid, cover: r.movies?.cover_url || '', reviews: [] };
      map[mid].reviews.push(r);
    });

    ratedMoviesData = await Promise.all(Object.values(map).map(async m => {
      const avg = m.reviews.reduce((s, r) => s + r.rating, 0) / m.reviews.length;
      let name = m.name;
      let poster = m.cover;
      if (isEnMode()) {
        const en = await getMovieEnglish(m.kid, name, poster);
        name = en.name;
        poster = en.poster;
      } else if (!poster && m.kid) {
        poster = await getPosterFromAPI(m.kid);
      }
      return {
        name: name, kid: m.kid, poster: poster,
        avgRating: avg, reviewsCount: m.reviews.length,
        reviews: m.reviews,
        lastDate: Math.max(...m.reviews.map(r => new Date(r.created_at || 0).getTime()))
      };
    }));
    applyRatedSort();
  } catch (e) { c.innerHTML = '<p style="color:var(--muted);">' + L('Ошибка загрузки', 'Load error') + '</p>'; }
}

function sortRatedMovies(sortBy) { currentRatedSort = sortBy; applyRatedSort(); }

function filterRatedMovies(query) {
  const statusEl = document.getElementById('rated-search-status');
  const listEl = document.getElementById('rated-movies-list');
  const cntEl = document.getElementById('rated-count');
  const q = (query || '').trim().toLowerCase();
  if (!q) { statusEl.style.display = 'none'; applyRatedSort(); return; }
  if (!ratedMoviesData.length) { statusEl.style.display = 'block'; statusEl.textContent = L('Загрузка...', 'Loading...'); return; }
  const filtered = ratedMoviesData.filter(m => m.name.toLowerCase().includes(q));
  if (!filtered.length) {
    statusEl.style.display = 'block';
    statusEl.textContent = L('Фильм «' + query.trim() + '» ещё не оценён', 'Movie "' + query.trim() + '" is not rated yet');
    listEl.innerHTML = '';
    if (cntEl) cntEl.textContent = '(0)';
    return;
  }
  statusEl.style.display = 'block';
  statusEl.textContent = L('Найдено: ', 'Found: ') + filtered.length;
  renderRatedMovies(filtered);
}

async function searchHomeRated(query) {
  const statusEl = document.getElementById('home-search-status');
  const container = document.getElementById('recent-reviews');
  const q = (query || '').trim().toLowerCase();
  if (!q) { statusEl.style.display = 'none'; recentReviewsCache = null; loadRecentReviews(true); return; }
  if (!ratedMoviesData.length) {
    statusEl.style.display = 'block';
    statusEl.textContent = L('Загрузка...', 'Loading...');
    await loadRatedMovies();
  }
  const filtered = ratedMoviesData.filter(m => m.name.toLowerCase().includes(q));
  if (!filtered.length) {
    statusEl.style.display = 'block';
    statusEl.textContent = L('Фильм «' + query.trim() + '» ещё не оценён', 'Movie "' + query.trim() + '" is not rated yet');
    container.innerHTML = '';
    return;
  }
  statusEl.style.display = 'block';
  statusEl.textContent = L('Найдено фильмов: ', 'Movies found: ') + filtered.length;
  container.innerHTML = filtered.map(m => {
    const pHtml = m.poster ? '<img class="rated-poster" src="' + escapeHtml(m.poster) + '" loading="lazy">' : '<div class="rated-poster">🎬</div>';
    return '<div class="movie-card" onclick="openFilmPage(\'' + m.kid + '\')"><div class="poster-wrap">' + pHtml + '</div><div class="movie-info"><h3>' + escapeHtml(m.name) + '</h3></div></div>';
  }).join('');
}

function applyRatedSort() {
  const sorted = [...ratedMoviesData];
  if (currentRatedSort === 'rating-desc') sorted.sort((a, b) => b.avgRating - a.avgRating);
  else if (currentRatedSort === 'rating-asc') sorted.sort((a, b) => a.avgRating - b.avgRating);
  else if (currentRatedSort === 'reviews-desc') sorted.sort((a, b) => b.reviewsCount - a.reviewsCount);
  else if (currentRatedSort === 'date-desc') sorted.sort((a, b) => b.lastDate - a.lastDate);
  renderRatedMovies(sorted);
}

function renderRatedMovies(movies) {
  const c = document.getElementById('rated-movies-list');
  if (!c) return;
  const cntEl = document.getElementById('rated-count');
  if (cntEl) cntEl.textContent = '(' + movies.length + ')';
  c.innerHTML = movies.map(m => {
    const pHtml = m.poster
      ? '<img src="' + escapeHtml(m.poster) + '" alt="' + escapeHtml(m.name) + '" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.querySelector(\'.no-poster\').style.display=\'flex\';"><div class="no-poster" style="display:none;">🎬</div>'
      : '<div class="no-poster">🎬</div>';
    const rBadge = '<div class="rating-badge">' + STAR_SVG + '<span>' + m.avgRating.toFixed(1) + '</span></div>';
    const kid = Number(m.kid);
    const isWatched = watchedMovieIds.has(kid);
    const wBtn = '<button class="watched-btn' + (isWatched ? ' active' : '') + '" onclick="event.stopPropagation(); toggleWatched(' + kid + ', \'' + escapeForOnclick(m.name) + '\', \'' + escapeForOnclick(m.poster || '') + '\', this)">' + (isWatched ? '✅' : '👁') + '</button>';
    return '<div class="movie-card" onclick="openFilmPage(\'' + m.kid + '\')">' +
      '<div class="poster-wrap">' + pHtml + rBadge + wBtn + '</div>' +
      '<div class="movie-info"><h3>' + escapeHtml(m.name) + '</h3><div class="movie-meta">' + pluralizeOcenka(m.reviewsCount) + '</div></div>' +
    '</div>';
  }).join('');
}

// ============ СИКВЕЛЫ ============
async function loadSequelsAndPrequels(filmId) {
  const container = document.getElementById('sequels-block');
  if (!container) return;
  const en = isEnMode();
  container.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;">' + L('Загрузка связанных фильмов…', 'Loading related movies…') + '</p>';
  try {
    const { data } = await supabaseClient.functions.invoke('get-sequels-prequels', { body: { filmId } });
    const items = data?.items || [];
    if (!items.length) { container.innerHTML = ''; return; }
    if (en) {
      await Promise.all(items.map(async (f) => {
        const kid = Number(f.filmId);
        const enData = await getMovieEnglish(kid, f.nameRu || f.nameEn || '', f.posterUrl || '');
        f._nameEn = enData.name;
        f._posterEn = enData.poster;
      }));
    }
    const labels = {
      SEQUEL: en ? 'Sequel' : 'Сиквел',
      PREQUEL: en ? 'Prequel' : 'Приквел',
      REMAKE: en ? 'Remake' : 'Ремейк',
      SPINOFF: en ? 'Spin-off' : 'Спин-офф',
    };
    container.innerHTML = '<h3>' + (en ? 'Related movies' : 'Связанные фильмы') + '</h3><div class="sequels-grid">' +
      items.map(f => {
        const label = labels[f.relationType] || (en ? 'Related' : 'Связанный');
        const title = en ? (f._nameEn || f.nameEn || f.nameRu) : (f.nameRu || f.nameEn);
        const poster = en ? (f._posterEn || f.posterUrl) : f.posterUrl;
        return '<div class="sequel-card" onclick="openFilmPage(\'' + f.filmId + '\')">' +
          '<div class="sequel-poster">' +
            (poster ? '<img src="' + escapeHtml(poster) + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';"><div class="no-poster" style="display:none;">🎬</div>' : '<div class="no-poster">🎬</div>') +
          '</div>' +
          '<div class="sequel-info">' +
            '<div class="sequel-badge">' + label + '</div>' +
            '<div class="sequel-title">' + escapeHtml(title) + '</div>' +
            (f.year ? '<div class="sequel-year">' + f.year + '</div>' : '') +
          '</div>' +
        '</div>';
      }).join('') + '</div>';
  } catch (e) { container.innerHTML = ''; }
}

// ============ РЕЦЕНЗИИ (главная) ============
function showReviewsSkeleton() {
  let html = '';
  for (let i = 0; i < 4; i++) {
    html += '<div class="skeleton-review"><div class="sk-poster"></div><div class="sk-content"><div class="sk-line short"></div><div class="sk-line"></div><div class="sk-line medium"></div></div></div>';
  }
  return html;
}

function sortRecentReviews(sortBy) {
  currentReviewsSort = sortBy;
  recentReviewsCache = null;
  loadRecentReviews(true);
}

async function loadRecentReviews(force = false) {
  const c = document.getElementById('recent-reviews');
  if (!c) return;
  if (!force && recentReviewsCache && currentReviewsSort === 'date-desc') { c.innerHTML = recentReviewsCache; return; }
  c.innerHTML = showReviewsSkeleton();
  try {
    const { data: allReviews } = await supabaseClient
      .from('reviews').select('*, movies(name, kinopoisk_id, cover_url), profiles(username)')
      .order('created_at', { ascending: false }).limit(30);
    const friendIds = await getMyFriendIds();
    const reviews = (allReviews || []).filter(r => canSeeReview(r, friendIds));
    if (!reviews.length) { c.innerHTML = '<p>' + L('Пока нет оценок', 'No ratings yet') + '</p>'; return; }
    const reviewIds = reviews.map(r => r.id).filter(Boolean);
    const kidList = [...new Set(reviews.map(r => r.movies?.kinopoisk_id || r.movie_id).filter(Boolean))];
    const [reactionsRes, commentsRes, postersEntries] = await Promise.all([
      reviewIds.length ? supabaseClient.from('review_reactions').select('review_id, reaction').in('review_id', reviewIds) : Promise.resolve({ data: [] }),
      reviewIds.length ? supabaseClient.from('review_comments').select('*, profiles(username)').in('review_id', reviewIds) : Promise.resolve({ data: [] }),
      Promise.all(kidList.map(async kid => [kid, await getPosterFromAPI(kid)]))
    ]);
    const postersMap = {};
    (postersEntries || []).forEach(([kid, url]) => { postersMap[kid] = url; });
    window._enNamesByKid = null;
    if (isEnMode()) {
      const enData = {};
      await Promise.all(kidList.map(async kid => {
        const reviewItem = reviews.find(r => (r.movies?.kinopoisk_id || r.movie_id) == kid);
        const ruName = reviewItem?.movies?.name || '';
        const ruPoster = postersMap[kid] || reviewItem?.movies?.cover_url || '';
        const en = await getMovieEnglish(kid, ruName, ruPoster);
        enData[kid] = en;
      }));
      Object.keys(enData).forEach(kid => { postersMap[kid] = enData[kid].poster; });
      window._enNamesByKid = {};
      Object.keys(enData).forEach(kid => { window._enNamesByKid[kid] = enData[kid].name; });
    }
    const reactionsByReview = {};
    (reactionsRes.data || []).forEach(x => {
      if (!reactionsByReview[x.review_id]) reactionsByReview[x.review_id] = { likes: 0, dislikes: 0 };
      if (x.reaction === 'like') reactionsByReview[x.review_id].likes++;
      else if (x.reaction === 'dislike') reactionsByReview[x.review_id].dislikes++;
    });
    const commentsByReview = {};
    (commentsRes.data || []).forEach(cm => {
      if (!commentsByReview[cm.review_id]) commentsByReview[cm.review_id] = [];
      commentsByReview[cm.review_id].push(cm);
    });
    const enriched = reviews.map(r => {
      const kid = r.movies?.kinopoisk_id || r.movie_id;
      const poster = postersMap[kid] || r.movies?.cover_url || '';
      const rx = reactionsByReview[r.id] || { likes: 0, dislikes: 0 };
      const cm = (commentsByReview[r.id] || []).slice(0, 5);
      const enName = (window._enNamesByKid && window._enNamesByKid[kid]) || r.movies?.name || L('Фильм', 'Movie');
      return { ...r, _kid: kid, _poster: poster, _enName: enName, _likes: rx.likes, _dislikes: rx.dislikes, _comments: cm };
    });
    let sorted = [...enriched];
    if (currentReviewsSort === 'popular') sorted.sort((a, b) => (b._likes + b._comments.length * 2) - (a._likes + a._comments.length * 2));
    else if (currentReviewsSort === 'rating-desc') sorted.sort((a, b) => b.rating - a.rating);
    else if (currentReviewsSort === 'rating-asc') sorted.sort((a, b) => a.rating - b.rating);
    const limit = currentReviewsSort === 'all' ? 50 : 10;
    const html = sorted.slice(0, limit).map(r => buildReviewHTML(r)).join('');
    recentReviewsCache = html;
    c.innerHTML = html;
  } catch (e) { c.innerHTML = '<p>' + L('Ошибка загрузки', 'Load error') + '</p>'; }
}

function buildReviewHTML(r) {
  const kid = r._kid;
  const ce = canEditReview(r.user_id);
  const commentsHtml = r._comments?.length
    ? '<div class="review-comments" id="comments-list-' + r.id + '">' + r._comments.map(cm => buildCommentHTML(cm, r.id)).join('') + '</div>'
    : '<div class="review-comments" id="comments-list-' + r.id + '"></div>';
  return '<div class="review-item" id="review-' + r.id + '">' +
    '<div class="review-main">' +
      '<div class="review-poster">' + getPosterHtml(r._poster, r._enName || r.movies?.name || L('Фильм', 'Movie'), '100%', '100%', '1.8rem') + '</div>' +
      '<div class="review-content">' +
        '<span class="review-username">' + escapeHtml(r.profiles?.username || L('Пользователь', 'User')) + '</span>' +
        '<div class="review-meta-row">' +
          (r.visibility === 'friends' ? '<span class="visibility-badge friends">🔒</span>' : '') +
          '<span class="review-rating">' + starEmoji() + ' ' + r.rating + '/10</span>' +
          '<span class="review-recommend ' + (r.recommend ? 'yes' : 'no') + '">' + (r.recommend ? L('👍 Советую', '👍 Recommend') : L('👎 Не советую', "👎 Don't recommend")) + '</span>' +
        '</div>' +
        '<h3 class="review-movie-title" onclick="openFilmPage(\'' + kid + '\')">' + escapeHtml(r._enName || r.movies?.name || L('Фильм', 'Movie')) + '</h3>' +
        (r.review_text ? '<p class="review-text">"' + escapeHtml(r.review_text) + '"</p>' : '') +
      '</div>' +
    '</div>' +
    '<div class="review-actions">' +
      '<button id="like-count-' + r.id + '" onclick="toggleReviewReaction(\'' + r.id + '\', \'like\')">👍 ' + r._likes + '</button>' +
      '<button id="dislike-count-' + r.id + '" onclick="toggleReviewReaction(\'' + r.id + '\', \'dislike\')">👎 ' + r._dislikes + '</button>' +
      '<button id="comment-count-' + r.id + '" onclick="showCommentInput(\'' + r.id + '\')">💬 ' + r._comments.length + '</button>' +
    '</div>' + commentsHtml +
    '<div id="comment-input-' + r.id + '"></div>' +
    (ce ? '<div class="review-edit-actions">' +
      '<button onclick="editReview(\'' + r.id + '\')">' + L('Редактировать', 'Edit') + '</button>' +
      (isAdmin() ? '<button onclick="toggleReviewVisibility(\'' + r.id + '\')">' + (r.visibility === 'friends' ? L('Открыть всем', 'Make public') : L('Только друзьям', 'Friends only')) + '</button>' : '') +
      '<button class="delete" onclick="deleteReview(\'' + r.id + '\')">' + L('Удалить', 'Delete') + '</button>' +
    '</div>' : '') +
  '</div>';
}

async function toggleReviewVisibility(reviewId) {
  if (!isAdmin()) { showNotification(L('Менять видимость может только админ', 'Only admin can change visibility'), 'error'); return; }
  const { data: r } = await supabaseClient.from('reviews').select('visibility').eq('id', reviewId).single();
  if (!r) return;
  const newVis = r.visibility === 'friends' ? 'public' : 'friends';
  const { error } = await supabaseClient.from('reviews').update({ visibility: newVis }).eq('id', reviewId);
  if (error) { showNotification(L('Ошибка: ', 'Error: ') + error.message, 'error'); return; }
  showNotification(newVis === 'friends' ? L('Видно только друзьям', 'Visible to friends only') : L('Видно всем', 'Visible to everyone'), 'success');
  recentReviewsCache = null;
  if (currentSection === 'home') loadRecentReviews(true);
  else if (currentSection === 'rated') loadRatedMovies();
}

async function toggleReviewReaction(reviewId, reaction) {
  if (!currentUser) return;
  try {
    const { data: existing } = await supabaseClient.from('review_reactions').select('*').eq('review_id', reviewId).eq('user_id', currentUser.id).maybeSingle();
    let isNew = false;
    if (existing) {
      if (existing.reaction === reaction) await supabaseClient.from('review_reactions').delete().eq('id', existing.id);
      else { await supabaseClient.from('review_reactions').update({ reaction }).eq('id', existing.id); isNew = true; }
    } else {
      await supabaseClient.from('review_reactions').insert({ review_id: reviewId, user_id: currentUser.id, reaction });
      isNew = true;
    }
    if (isNew) {
      const { data: review } = await supabaseClient.from('reviews').select('user_id').eq('id', reviewId).single();
      if (review && review.user_id !== currentUser.id) {
        createNotification(review.user_id, 'review', currentUserProfile.username + L(' поставил ', ' reacted ') + (reaction === 'like' ? '👍' : '👎') + L(' вашей рецензии', ' to your review'));
      }
    }
    await updateReactionCounters(reviewId);
  } catch (e) {}
}

async function updateReactionCounters(reviewId) {
  const { data } = await supabaseClient.from('review_reactions').select('reaction').eq('review_id', reviewId);
  const likes = data?.filter(x => x.reaction === 'like').length || 0;
  const dislikes = data?.filter(x => x.reaction === 'dislike').length || 0;
  const l = document.getElementById('like-count-' + reviewId);
  const d = document.getElementById('dislike-count-' + reviewId);
  if (l) l.textContent = '👍 ' + likes;
  if (d) d.textContent = '👎 ' + dislikes;
}

function showCommentInput(reviewId) {
  const container = document.getElementById('comment-input-' + reviewId);
  if (!container) return;
  container.innerHTML = '<div class="comment-input-wrap"><input type="text" id="comment-text-' + reviewId + '" placeholder="' + L('Написать комментарий...', 'Write a comment...') + '"><button onclick="addComment(\'' + reviewId + '\')">' + L('Отправить', 'Send') + '</button></div>';
  document.getElementById('comment-text-' + reviewId)?.focus();
}

function showEditCommentInput(commentId, currentText) {
  if (!isAdmin()) return;
  const container = document.getElementById('comment-edit-' + commentId);
  if (!container) return;
  container.innerHTML = '<div class="comment-input-wrap" style="margin-top:6px;"><input type="text" id="edit-comment-text-' + commentId + '" value="' + escapeHtml(currentText) + '"><button onclick="saveEditedComment(\'' + commentId + '\')">💾</button><button onclick="cancelEditComment(\'' + commentId + '\')" style="background:var(--surface-hover);">✕</button></div>';
}

async function addComment(reviewId) {
  const input = document.getElementById('comment-text-' + reviewId);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  try {
    const { data: nc, error } = await supabaseClient.from('review_comments').insert({ review_id: reviewId, user_id: currentUser.id, comment_text: text }).select('*, profiles(username)').single();
    if (error || !nc) return;
    const container = document.getElementById('comments-list-' + reviewId);
    if (container) container.insertAdjacentHTML('beforeend', buildCommentHTML(nc, reviewId));
    const cntBtn = document.getElementById('comment-count-' + reviewId);
    if (cntBtn) {
      const cur = parseInt(cntBtn.textContent.replace(/\D/g, '')) || 0;
      cntBtn.textContent = '💬 ' + (cur + 1);
    }
    document.getElementById('comment-input-' + reviewId).innerHTML = '';
    const { data: review } = await supabaseClient.from('reviews').select('user_id').eq('id', reviewId).single();
    if (review && review.user_id !== currentUser.id) {
      createNotification(review.user_id, 'review', currentUserProfile.username + L(' прокомментировал вашу рецензию', ' commented on your review'));
    }
  } catch (e) {}
}

function buildCommentHTML(cm, reviewId) {
  return '<div class="comment-item" id="comment-' + cm.id + '">' +
    '<p><strong>' + escapeHtml(cm.profiles?.username || L('Пользователь', 'User')) + ':</strong> ' + escapeHtml(cm.comment_text) + '</p>' +
    (isAdmin() ? '<div class="comment-actions">' +
      '<button onclick="showEditCommentInput(\'' + cm.id + '\', \'' + escapeForOnclick(cm.comment_text) + '\')">✏️</button>' +
      '<button onclick="deleteCommentInstant(\'' + cm.id + '\', \'' + reviewId + '\')">🗑</button>' +
    '</div>' : '') +
    '<div id="comment-edit-' + cm.id + '"></div></div>';
}

async function saveEditedComment(commentId) {
  if (!isAdmin()) return;
  const input = document.getElementById('edit-comment-text-' + commentId);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  await supabaseClient.from('review_comments').update({ comment_text: text }).eq('id', commentId);
  const el = document.getElementById('comment-' + commentId);
  if (el) {
    const p = el.querySelector('p');
    if (p) {
      const uname = p.querySelector('strong')?.textContent?.replace(':', '') || L('Пользователь', 'User');
      p.innerHTML = '<strong>' + escapeHtml(uname) + ':</strong> ' + escapeHtml(text);
    }
    document.getElementById('comment-edit-' + commentId).innerHTML = '';
  }
}

function cancelEditComment(commentId) {
  const container = document.getElementById('comment-edit-' + commentId);
  if (container) container.innerHTML = '';
}

async function deleteCommentInstant(commentId, reviewId) {
  if (!isAdmin()) return;
  showConfirmModal(L('Удалить комментарий?', 'Delete comment?'), async () => {
    await supabaseClient.from('review_comments').delete().eq('id', commentId);
    const el = document.getElementById('comment-' + commentId);
    if (el) el.remove();
    const cntBtn = document.getElementById('comment-count-' + reviewId);
    if (cntBtn) {
      const cur = parseInt(cntBtn.textContent.replace(/\D/g, '')) || 1;
      cntBtn.textContent = '💬 ' + Math.max(0, cur - 1);
    }
  });
}

async function editReview(id) {
  const { data: r } = await supabaseClient.from('reviews').select('*').eq('id', id).single();
  if (!r) return;
  currentEditReviewId = id;
  editRating = r.rating;
  editRecommend = r.recommend !== false;
  document.querySelectorAll('#edit-star-rating .star').forEach((s, i) => s.classList.toggle('active', i < r.rating));
  document.getElementById('edit-rating-display').textContent = r.rating + '/10';
  document.getElementById('edit-review-text').value = r.review_text || '';
  openModal('edit-review-modal');
}

async function saveEditedReview() {
  await supabaseClient.from('reviews').update({
    rating: editRating,
    review_text: document.getElementById('edit-review-text').value.trim() || null,
    recommend: editRecommend
  }).eq('id', currentEditReviewId);
  closeEditReviewModal();
  recentReviewsCache = null;
  loadRecentReviews();
}

async function deleteReview(id) {
  showConfirmModal(L('Удалить рецензию?', 'Delete review?'), async () => {
    await supabaseClient.from('reviews').delete().eq('id', id);
    recentReviewsCache = null;
    loadRecentReviews();
  });
}

// ============ МОДАЛКА ОЦЕНКИ ============
async function openRatingModal(filmId) {
  const data = await getMovie(filmId);
  if (!data) { showNotification(L('Не удалось загрузить фильм', 'Failed to load movie'), 'error'); return; }
  const t = data.nameRu || data.nameEn || '';
  let existingReview = null;
  let movieId = null;
  try {
    const { data: mv } = await supabaseClient.from('movies').select('id').eq('kinopoisk_id', parseInt(filmId)).maybeSingle();
    if (mv) {
      movieId = mv.id;
      const { data: rv } = await supabaseClient.from('reviews').select('*').eq('user_id', currentUser.id).eq('movie_id', movieId).maybeSingle();
      existingReview = rv;
    }
  } catch (e) {}
  selectedRating = existingReview?.rating || 0;
  selectedRecommend = existingReview?.recommend !== false;
  document.getElementById('modal-body').innerHTML =
    '<h2>' + L('Оценить: ', 'Rate: ') + escapeHtml(t) + '</h2>' +
    '<div class="form-group">' +
      '<label>' + L('Оценка', 'Rating') + ' <span id="modal-rating-display" class="rating-display">' + (selectedRating || 0) + '/10</span></label>' +
      '<div class="star-rating" id="modal-star-rating">' +
        Array.from({ length: 10 }, (_, i) => '<button type="button" class="star' + (i < selectedRating ? ' active' : '') + '" onclick="setModalRating(' + (i + 1) + ')"><svg width="22" height="22"><use href="#i-star"/></svg></button>').join('') +
      '</div>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>' + L('Рекомендация', 'Recommendation') + '</label>' +
      '<div class="recommend-buttons">' +
        '<button class="btn-recommend btn-recommend-yes' + (selectedRecommend ? ' active' : '') + '" type="button" onclick="setModalRecommend(true)">' + L('Советую', 'Recommend') + '</button>' +
        '<button class="btn-recommend btn-recommend-no' + (!selectedRecommend ? ' active' : '') + '" type="button" onclick="setModalRecommend(false)">' + L('Не советую', "Don't recommend") + '</button>' +
      '</div>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>' + L('Рецензия', 'Review') + ' <span class="optional">' + L('необязательно', 'optional') + '</span></label>' +
      '<textarea id="modal-review-text" placeholder="' + L('Что вы думаете о фильме?', 'What do you think about the movie?') + '">' + escapeHtml(existingReview?.review_text || '') + '</textarea>' +
    '</div>' +
    '<div class="modal-actions">' +
      '<button class="btn btn-primary" type="button" onclick="submitModalReview(\'' + filmId + '\', ' + (movieId ? '\'' + movieId + '\'' : 'null') + ')">' + (existingReview ? L('Обновить', 'Update') : L('Опубликовать', 'Publish')) + '</button>' +
      '<button class="btn btn-secondary" type="button" onclick="closeModal()">' + L('Отмена', 'Cancel') + '</button>' +
    '</div>';
  openModal('movie-modal');
}

function setModalRating(r) {
  selectedRating = r;
  const el = document.getElementById('modal-rating-display');
  if (el) el.textContent = r + '/10';
  document.querySelectorAll('#modal-star-rating .star').forEach((s, i) => s.classList.toggle('active', i < r));
}

function setModalRecommend(r) {
  selectedRecommend = r;
  document.querySelectorAll('#movie-modal .btn-recommend').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(r ? '#movie-modal .btn-recommend-yes' : '#movie-modal .btn-recommend-no');
  if (btn) btn.classList.add('active');
}

async function submitModalReview(filmId, existingMovieId) {
  if (!selectedRating) { showNotification(L('Поставьте оценку', 'Please rate the movie'), 'error'); return; }
  const reviewText = document.getElementById('modal-review-text').value.trim();
  const data = await getMovie(filmId);
  const movieName = data?.nameRu || data?.nameEn || L('Фильм', 'Movie');
  try {
    let movieId = existingMovieId;
    if (!movieId) {
      const { data: nm } = await supabaseClient.from('movies').insert([{ name: movieName, kinopoisk_id: parseInt(filmId) }]).select().single();
      if (!nm) throw new Error(L('Ошибка сохранения фильма', 'Failed to save movie'));
      movieId = nm.id;
    }
    const { data: er } = await supabaseClient.from('reviews').select('id').eq('user_id', currentUser.id).eq('movie_id', movieId).maybeSingle();
    if (er) {
      await supabaseClient.from('reviews').update({ rating: selectedRating, review_text: reviewText || null, recommend: selectedRecommend }).eq('id', er.id);
      showNotification(L('Оценка обновлена', 'Rating updated'), 'success');
    } else {
      await supabaseClient.from('reviews').insert([{
        user_id: currentUser.id, movie_id: movieId, rating: selectedRating,
        review_text: reviewText || null, recommend: selectedRecommend, visibility: 'friends'
      }]);
      showNotification(L('Оценка добавлена', 'Rating added'), 'success');
    }
    await supabaseClient.from('watched').upsert({
      user_id: currentUser.id, kinopoisk_id: parseInt(filmId),
      movie_name: movieName, poster_url: data?.posterUrl || null
    }, { onConflict: 'user_id,kinopoisk_id' });
    watchedMovieIds.add(parseInt(filmId));
    await supabaseClient.from('watchlist').delete().eq('user_id', currentUser.id).eq('movie_id', movieId);
    closeModal();
    recentReviewsCache = null;
    loadRecentReviews(true);
    if (currentSection === 'watched') loadWatchedList();
    if (currentSection === 'rated') loadRatedMovies();
    if (currentSection === 'film-page' && currentFilmId === filmId) {
      loadFilmReviewsSidebar(filmId);
      const btn = document.querySelector('.film-page-actions-vertical .watched-toggle');
      if (btn) { btn.classList.add('active'); btn.innerHTML = '✅ ' + L('Просмотрено', 'Watched'); }
    }
  } catch (e) { showNotification(L('Ошибка: ', 'Error: ') + e.message, 'error'); }
}

// ============ МОДАЛКИ ============
function openModal(id) { const el = document.getElementById(id); if (el) el.classList.add('show'); }
function closeModalById(id) { const el = document.getElementById(id); if (el) el.classList.remove('show'); }
function showConfirmModal(message, callback) {
  document.getElementById('confirm-message').textContent = message;
  confirmCallback = callback;
  openModal('confirm-modal');
}
async function confirmAction() { if (confirmCallback) await confirmCallback(); closeConfirmModal(); }
function closeConfirmModal() { closeModalById('confirm-modal'); confirmCallback = null; }
function closeModal() { closeModalById('movie-modal'); }
function closeEditReviewModal() { closeModalById('edit-review-modal'); }
function closeUserProfileModal() { closeModalById('user-profile-modal'); }
function closeNotificationsModal() { closeModalById('notifications-modal'); }

// ============ LIGHTBOX ============
function openLightbox(url) {
  const img = document.getElementById('lightbox-image');
  img.src = url;
  img.style.transform = 'translate(-50%,-50%) scale(1)';
  isZoomed = false;
  openModal('image-lightbox');
}
function closeLightbox() { closeModalById('image-lightbox'); }
function toggleZoom() {
  const img = document.getElementById('lightbox-image');
  if (isZoomed) { img.style.transform = 'translate(-50%,-50%) scale(1)'; isZoomed = false; }
  else { img.style.transform = 'translate(-50%,-50%) scale(2.5)'; isZoomed = true; }
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLightbox(); });

// ============ PRESENCE ============
async function updatePresence() {
  if (!currentUser?.id) return;
  try { await supabaseClient.from('user_presence').upsert({ user_id: currentUser.id, last_seen: new Date().toISOString() }, { onConflict: 'user_id' }); } catch (e) {}
}
function startPresence() {
  updatePresence();
  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = setInterval(updatePresence, 60000);
}
async function checkFriendStatus(fid) {
  try {
    const { data } = await supabaseClient.from('user_presence').select('last_seen').eq('user_id', fid).maybeSingle();
    if (!data?.last_seen) return false;
    return (Date.now() - Date.parse(data.last_seen)) / 1000 < 120;
  } catch (e) { return false; }
}
async function subscribeToPresence() {
  if (!currentUser?.id) return;
  if (presenceChannel) { supabaseClient.removeChannel(presenceChannel); presenceChannel = null; }
  const { data } = await supabaseClient.from('friendships').select('friend_id').eq('user_id', currentUser.id);
  const friendSet = new Set((data || []).map(r => r.friend_id).filter(Boolean));
  presenceChannel = supabaseClient.channel('presence-' + currentUser.id + '-' + Date.now())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, async (payload) => {
      const uid = payload.new?.user_id || payload.old?.user_id;
      if (uid && friendSet.has(uid)) {
        const el = document.getElementById('status-' + uid);
        if (el) el.textContent = (await checkFriendStatus(uid)) ? '🟢' : '⚪';
      }
    }).subscribe();
}

// ============ УВЕДОМЛЕНИЯ ============
async function createNotification(userId, type, content) {
  if (!userId || userId === currentUser?.id) return;
  try { await supabaseClient.from('notifications').insert({ user_id: userId, type, content, is_read: false }); } catch (e) {}
}
async function loadNotifications() {
  if (!currentUser) return;
  try {
    const { data } = await supabaseClient.from('notifications').select('id').eq('user_id', currentUser.id).eq('is_read', false);
    const count = data?.length || 0;
    const b = document.getElementById('notif-badge');
    if (b) { b.textContent = count; b.hidden = count === 0; b.style.display = count > 0 ? 'inline-block' : 'none'; }
  } catch (e) {}
}
function subscribeToNotifications() {
  if (!currentUser?.id) return;
  if (notificationsChannel) { supabaseClient.removeChannel(notificationsChannel); notificationsChannel = null; }
  notificationsChannel = supabaseClient.channel('notifications-' + currentUser.id + '-' + Date.now())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + currentUser.id }, () => loadNotifications())
    .subscribe();
  loadNotifications();
}
async function markNotificationRead(id) {
  await supabaseClient.from('notifications').update({ is_read: true }).eq('id', id);
  showNotifications(); loadNotifications();
}
async function deleteNotification(id) {
  await supabaseClient.from('notifications').delete().eq('id', id);
  showNotifications(); loadNotifications();
}
async function showNotifications() {
  const { data: notifications } = await supabaseClient.from('notifications').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(30);
  const c = document.getElementById('notifications-list');
  if (!c) return;
  if (!notifications?.length) c.innerHTML = '<div class="empty-state">' + L('Нет уведомлений', 'No notifications') + '</div>';
  else c.innerHTML = notifications.map(n =>
    '<div style="background:var(--surface-2);padding:12px 14px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;gap:10px;">' +
    '<div style="flex:1;"><span style="color:var(--accent);">●</span> ' + escapeHtml(n.content) +
    '<span style="color:var(--muted);font-size:0.75rem;margin-left:10px;">' + formatDate(n.created_at) + '</span></div>' +
    '<div style="display:flex;gap:4px;flex-shrink:0;">' +
    (!n.is_read ? '<button onclick="markNotificationRead(\'' + n.id + '\')" style="background:none;border:none;cursor:pointer;font-size:1rem;color:inherit;">✓</button>' : '') +
    '<button onclick="deleteNotification(\'' + n.id + '\')" style="background:none;border:none;cursor:pointer;font-size:1rem;color:inherit;">🗑</button></div></div>'
  ).join('');
  openModal('notifications-modal');
}

// ============ АВТОРИЗАЦИЯ ============
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  const lf = document.getElementById('login-form'), rf = document.getElementById('register-form');
  if (lf) lf.style.display = tab === 'login' ? 'block' : 'none';
  if (rf) rf.style.display = tab === 'register' ? 'block' : 'none';
  const ae = document.getElementById('auth-error'), re = document.getElementById('register-error');
  if (ae) ae.hidden = true;
  if (re) re.hidden = true;
}
function showAuthError(el, msg) { if (el) { el.textContent = msg; el.hidden = false; } }

document.addEventListener('DOMContentLoaded', async () => {
  loadGlobalTheme();
  subscribeToTheme();

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    currentUser = session.user;
    try {
      await loadUserProfile();
    } catch (e) {
      if (e.message !== 'banned') console.error(e);
      return;
    }
    await loadWatchedMovies();
    subscribeToNotifications();
    showMainApp();
    startPresence();
    subscribeToMessages();
    subscribeToPresence();
    if (!intervalsStarted) intervalsStarted = true;
    document.querySelectorAll('.modal, .lightbox').forEach(m => m.classList.remove('show'));
  }
  setTimeout(initCatalogRowScroll, 800);

  if (handleHashRoute()) {
    document.querySelectorAll('.section').forEach(x => x.classList.remove('active'));
    document.getElementById('film-page').classList.add('active');
  }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('auth-error');
  errEl.hidden = true;
  const loginInput = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!loginInput || !password) {
    errEl.textContent = L('Заполните оба поля', 'Fill in both fields');
    errEl.hidden = false;
    return;
  }

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginInput);
  let email = loginInput;

  if (!isEmail) {
    const { data: emailData, error: emailError } = await supabaseClient.rpc('get_email_by_username', { uname: loginInput });
    if (emailError || !emailData) {
      errEl.textContent = L('Пользователь с таким ником не найден', 'No user with this nickname');
      errEl.hidden = false;
      return;
    }
    email = emailData;
  }
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('invalid login') || msg.includes('invalid credentials')) errEl.textContent = L('Неверный логин или пароль', 'Wrong login or password');
    else if (msg.includes('email not confirmed')) errEl.textContent = L('Подтвердите email — проверьте почту', 'Confirm your email — check your inbox');
    else errEl.textContent = error.message;
    errEl.hidden = false;
    return;
  }
  currentUser = data.user;
  try {
    await loadUserProfile();
  } catch (e) {
    if (e.message !== 'banned') console.error(e);
    return;
  }
  await loadWatchedMovies();
  showMainApp();
  startPresence();
  subscribeToMessages();
  subscribeToNotifications();
  subscribeToPresence();
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('register-error');
  errEl.hidden = true;
  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const password2 = document.getElementById('register-password2').value;
  const consent = document.getElementById('register-consent');
  if (!consent || !consent.checked) {
    return showAuthError(errEl, L('Необходимо согласие на обработку персональных данных', 'Consent to personal data processing is required'));
  }
  if (!username) return showAuthError(errEl, L('Введите ник', 'Enter a nickname'));
  if (username.length < 3) return showAuthError(errEl, L('Ник минимум 3 символа', 'Nickname must be at least 3 characters'));
  if (!/^[\w\-. ]+$/.test(username)) return showAuthError(errEl, L('Ник может содержать только буквы, цифры, пробел, ".", "-", "_"', 'Nickname can only contain letters, digits, space, ".", "-", "_"'));
  if (!email) return showAuthError(errEl, L('Введите email', 'Enter email'));
  if (!password) return showAuthError(errEl, L('Введите пароль', 'Enter password'));
  if (password.length < 6) return showAuthError(errEl, L('Пароль минимум 6 символов', 'Password must be at least 6 characters'));
  if (password !== password2) return showAuthError(errEl, L('Пароли не совпадают', 'Passwords do not match'));

  const { data: existing } = await supabaseClient.from('profiles').select('id').ilike('username', username).maybeSingle();
  if (existing) return showAuthError(errEl, L('Такой ник уже занят', 'This nickname is taken'));

  const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { data: { username } } });
  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('already registered') || msg.includes('user already exists') || error.status === 422) return showAuthError(errEl, L('Этот email уже зарегистрирован', 'This email is already registered'));
    if (msg.includes('password')) return showAuthError(errEl, L('Пароль слишком простой', 'Password is too weak'));
    if (msg.includes('rate limit')) return showAuthError(errEl, L('Слишком много попыток. Подождите.', 'Too many attempts. Please wait.'));
    return showAuthError(errEl, error.message || L('Ошибка регистрации', 'Registration error'));
  }
  if (data.session) {
    currentUser = data.user;
    try {
      await loadUserProfile();
    } catch (e) {
      if (e.message !== 'banned') console.error(e);
      return;
    }
    await loadWatchedMovies();
    showMainApp();
    startPresence(); subscribeToMessages(); subscribeToNotifications(); subscribeToPresence();
    return;
  }
  errEl.style.color = '#4ade80';
  errEl.hidden = false;
  errEl.textContent = L('Аккаунт создан! Проверьте почту (' + email + ') и подтвердите регистрацию.', 'Account created! Check your email (' + email + ') and confirm registration.');
  setTimeout(() => switchAuthTab('login'), 5000);
});

// ============ ЗАГРУЗКА ПРОФИЛЯ (С ПРОВЕРКОЙ БАНА) ============
async function loadUserProfile() {
  try {
    const { data } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
    currentUserProfile = data || { id: currentUser.id, username: currentUser.email, role: 'user' };
  } catch (e) { currentUserProfile = { id: currentUser.id, username: currentUser.email, role: 'user' }; }
  myFriendIdsCache = null;

  if (currentUserProfile.banned === true) {
    const reason = currentUserProfile.banned_reason || L('Нарушение правил', 'Violation of rules');
    document.body.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px;background:#0a0a0f;color:#f5f5f7;font-family:Manrope,sans-serif;text-align:center;">' +
        '<div>' +
          '<div style="font-size:4rem;margin-bottom:20px;">🚫</div>' +
          '<h1 style="font-size:1.6rem;margin:0 0 12px;">' + L('Ваш аккаунт заблокирован', 'Your account is banned') + '</h1>' +
          '<p style="color:#8b8b9a;margin:0 0 8px;">' + L('Причина: ', 'Reason: ') + escapeHtml(reason) + '</p>' +
          '<p style="color:#8b8b9a;font-size:0.85rem;">' + L('Если считаете это ошибкой — напишите на kinoclabhelp@yandex.ru', 'If you think this is a mistake — email kinoclabhelp@yandex.ru') + '</p>' +
        '</div>' +
      '</div>';
    await supabaseClient.auth.signOut();
    throw new Error('banned');
  }
}

function showMainApp() {
  document.getElementById('auth-screen').style.display = 'none';
  const app = document.getElementById('main-app');
  app.hidden = false;
  app.style.display = 'block';
  document.getElementById('user-name-display').textContent = currentUserProfile?.username || currentUser.email;
  const adminItem = document.getElementById('admin-menu-item');
  if (adminItem) adminItem.style.display = isAdmin() ? 'flex' : 'none';
  showSection('movies');
}

async function logout() {
  myFriendIdsCache = null;
  if (presenceTimer) clearInterval(presenceTimer);
  if (chatChannel) supabaseClient.removeChannel(chatChannel);
  if (presenceChannel) supabaseClient.removeChannel(presenceChannel);
  if (notificationsChannel) supabaseClient.removeChannel(notificationsChannel);
  await supabaseClient.auth.signOut();
  location.reload();
}

function showSection(s) {
  currentSection = s;
  window.scrollTo({ top: 0, behavior: 'instant' });
  localStorage.setItem('lastSection', s);
  document.querySelectorAll('.section').forEach(x => x.classList.remove('active'));
  const target = document.getElementById(s);
  if (target) target.classList.add('active');

  if (s !== 'film-page' && window.location.hash.startsWith('#film/')) {
    window.location.hash = '';
  }

  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.remove('active');
    const oc = a.getAttribute('onclick') || '';
    if (oc.includes("showSection('" + s + "'")) a.classList.add('active');
  });
  document.querySelectorAll('.bottom-nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === s));

  const loaders = {
    'home': () => { if (!recentReviewsCache) loadRecentReviews(); if (!ratedMoviesData.length) loadRatedMovies(); },
    'movies': () => { loadHeroBanner(); loadCatalogRows(); },
    'watchlist': () => loadWatchlist(),
    'watched': () => loadWatchedList(),
    'rated': () => loadRatedMovies(),
    'wheel': () => { if (!wheelMovies.length) loadWheelMovies(); },
    'friends': () => { loadFriendRequests(); loadFriends(); },
    'profile': () => loadProfile(),
    'admin': () => loadAdminPanel(),
    'chat': () => { if (isChatOpen) backToChatList(); else loadChatFriends(); }
  };
  if (loaders[s]) loaders[s]();
}

// ============ ПОИСК НА ГЛАВНОЙ ============
let mainSearchTimeout = null;

function onMainSearch(query) {
  clearTimeout(mainSearchTimeout);
  const resultsDiv = document.getElementById('main-search-results');
  if (!resultsDiv) return;
  if (!query || query.length < 2) {
    resultsDiv.classList.remove('active');
    resultsDiv.innerHTML = '';
    return;
  }
  mainSearchTimeout = setTimeout(async () => {
    try {
      const { data } = await supabaseClient.functions.invoke('search-kinopoisk', { body: { query } });
      const films = data?.films || [];
      if (!films.length) {
        resultsDiv.innerHTML = '<div class="suggestion-item" style="color:var(--muted);">' + L('Ничего не найдено', 'Nothing found') + '</div>';
        resultsDiv.classList.add('active');
        return;
      }
      resultsDiv.innerHTML = films.slice(0, 10).map(f => {
        const t = f.nameRu || f.nameEn || '';
        return '<div class="suggestion-item" onclick="selectMainSearchResult(\'' + f.filmId + '\')">' +
          getPosterHtml(f.posterUrl, t, '40px', '60px', '1rem') +
          '<div><h4>' + escapeHtml(t) + '</h4><p>' + (f.year || '') + '</p></div></div>';
      }).join('');
      resultsDiv.classList.add('active');
    } catch (e) {
      resultsDiv.classList.remove('active');
    }
  }, 300);
}

function selectMainSearchResult(filmId) {
  const input = document.getElementById('main-search');
  const results = document.getElementById('main-search-results');
  if (input) input.value = '';
  if (results) { results.classList.remove('active'); results.innerHTML = ''; }
  openFilmPage(filmId);
}

document.addEventListener('click', (e) => {
  const wrap = document.querySelector('.main-search-wrap');
  const results = document.getElementById('main-search-results');
  if (!wrap || !results) return;
  if (!wrap.contains(e.target)) {
    results.classList.remove('active');
    results.innerHTML = '';
  }
});

// ============ HERO-КАРУСЕЛЬ ============
async function loadHeroBanner() {
  const el = document.getElementById('hero-banner');
  if (!el) return;
  try {
    let films = [];
    if (isEnMode()) {
      const { data } = await supabaseClient.functions.invoke('tmdb-list', { body: { category: 'popular', page: 1 } });
      films = (data?.films || []).filter(f => f.posterUrl).slice(0, 15).map(f => ({
        filmId: f.filmId, _tmdb: true,
        nameRu: f.nameRu || f.nameEn, nameEn: f.nameEn || f.nameRu,
        year: f.year, posterUrl: f.posterUrl,
        rating: f.rating, description: f.description, genres: [],
      }));
    } else {
      const { data } = await supabaseClient.functions.invoke('get-recent-movies', { body: {} });
      films = (data?.films || []).filter(f => f.posterUrl).slice(0, 15);
      if (!films.length) {
        const fb = await supabaseClient.functions.invoke('get-movies-by-page', { body: { page: 1, category: 'popular' } });
        films = (fb.data?.films || []).filter(f => f.posterUrl).slice(0, 15);
      }
    }
    if (!films.length) { el.innerHTML = ''; return; }
    films.forEach(f => { if (f._tmdb) window._pendingTmdbIds[f.filmId] = { title: f.nameEn || f.nameRu, year: f.year }; });
    heroFilms = films;
    heroIndex = 0;
    renderHeroBanner(el, heroFilms[0]);
    renderHeroDots();
    startHeroAuto();
  } catch (e) { el.innerHTML = ''; }
}

function startHeroAuto() {
  if (heroAutoTimer) clearInterval(heroAutoTimer);
  heroAutoTimer = setInterval(() => {
    if (!heroFilms.length) return;
    if (currentSection !== 'movies') return;
    if (document.hidden) return;
    heroNext();
  }, 8000);
}

function renderHeroBanner(el, film) {
  const t = film.nameRu || film.nameEn || '';
  const id = film.filmId || film.id;
  const poster = film.posterUrl || '';
  const year = film.year || '';
  const genres = (film.genres || []).map(g => g.genre || g).slice(0, 3).join(', ');
  const ratingNum = parseFloat(film.rating || film.ratingKinopoisk);
  const rating = !isNaN(ratingNum) && ratingNum > 0 ? ratingNum.toFixed(1) : '';
  const desc = film.description || '';

  el.innerHTML =
    '<div class="hero-backdrop" style="background-image:url(&quot;' + escapeHtml(poster) + '&quot;)"></div>' +
    '<div class="hero-content">' +
      '<div class="hero-poster">' +
        (poster ? '<img src="' + escapeHtml(poster) + '" alt="' + escapeHtml(t) + '" onerror="this.style.display=\'none\'">' : '<div class="no-poster">🎬</div>') +
      '</div>' +
      '<div class="hero-info">' +
        '<h1 class="hero-title">' + escapeHtml(t) + '</h1>' +
        '<div class="hero-meta">' +
          (rating ? '<span class="hero-rating">' + STAR_SVG + ' ' + rating + '</span>' : '') +
          (year ? '<span>' + year + '</span>' : '') +
          (genres ? '<span class="dot"></span><span>' + escapeHtml(genres) + '</span>' : '') +
        '</div>' +
        (desc ? '<p class="hero-desc">' + escapeHtml(desc) + '</p>' : '') +
        '<div class="hero-actions">' +
          '<button class="btn btn-primary" onclick="openFilmPage(\'' + id + '\')">' + L('Подробнее', 'More') + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function renderHeroDots() {
  const dotsEl = document.getElementById('hero-dots');
  if (!dotsEl) return;
  if (heroFilms.length <= 1) { dotsEl.innerHTML = ''; dotsEl.style.display = 'none'; return; }
  dotsEl.style.display = 'flex';
  dotsEl.innerHTML = heroFilms.map((_, i) =>
    '<button class="hero-dot' + (i === heroIndex ? ' active' : '') + '" onclick="goToHeroSlide(' + i + ')" aria-label="Slide ' + (i + 1) + '"></button>'
  ).join('');
}

function goToHeroSlide(i) {
  if (!heroFilms.length) return;
  heroIndex = (i + heroFilms.length) % heroFilms.length;
  const el = document.getElementById('hero-banner');
  if (!el) return;
  renderHeroBanner(el, heroFilms[heroIndex]);
  renderHeroDots();
}

function heroPrev() { goToHeroSlide(heroIndex - 1); }
function heroNext() { goToHeroSlide(heroIndex + 1); }

// ============ РЯДЫ КАТАЛОГА ============
const CATALOG_ROWS = [
  { id: 'row-popular',  type: 'popular'  },
  { id: 'row-top250',   type: 'top250'   },
  { id: 'row-await',    type: 'await'    },
  { id: 'row-series',   type: 'series'   },
  { id: 'row-cartoons', type: 'cartoons' },
];

async function loadCatalogRows() {
  for (let i = 0; i < CATALOG_ROWS.length; i++) {
    const row = CATALOG_ROWS[i];
    rowState[row.id] = { page: 1, loading: false, hasMore: true };
    setTimeout(() => { loadCatalogRow(row.id, row.type, false); }, i * 150);
  }
}

async function loadCatalogRow(rowId, type, append) {
  const container = document.getElementById(rowId);
  if (!container) return;
  const state = rowState[rowId];
  if (!state || state.loading || !state.hasMore) return;
  state.loading = true;
  if (!append) container.innerHTML = buildRowSkeletonHTML();
  const en = isEnMode();
  try {
    let films = [];
    if (en) {
      const catMap = { popular: 'popular', top250: 'top_rated', await: 'upcoming', series: 'series', cartoons: 'cartoons' };
      const body = { category: catMap[type] || 'popular', page: (type === 'await') ? 1 : state.page };
      const { data, error } = await supabaseClient.functions.invoke('tmdb-list', { body });
      if (error) console.warn('tmdb-list error:', error);
      films = (data?.films || []).map(f => ({
        filmId: f.filmId, _tmdb: true,
        nameRu: f.nameRu || f.nameEn, nameEn: f.nameEn || f.nameRu,
        year: f.year, posterUrl: f.posterUrl, posterUrlPreview: f.posterUrlPreview,
        rating: f.rating, description: f.description, genres: f.genres || [],
      }));
    } else {
      if (type === 'popular' || type === 'top250') {
        const { data } = await supabaseClient.functions.invoke('get-movies-by-page', { body: { page: state.page, category: type } });
        films = data?.films || [];
      } else if (type === 'series') {
        const { data } = await supabaseClient.functions.invoke('get-movies-by-type', { body: { page: state.page, type: 'TV_SERIES', order: 'RATING' } });
        films = data?.films || [];
      } else if (type === 'cartoons') {
        const { data } = await supabaseClient.functions.invoke('get-movies-by-type', { body: { page: state.page, type: 'CARTOON', order: 'RATING' } });
        films = data?.films || [];
      } else if (type === 'await') {
        const { data } = await supabaseClient.functions.invoke('get-premiers', { body: {} });
        films = data?.films || [];
        if (!films.length) state.hasMore = false;
      }
    }
    films.forEach(f => { if (f._tmdb && f.filmId) window._pendingTmdbIds[f.filmId] = { title: f.nameEn || f.nameRu, year: f.year }; });
    if (!films.length) {
      state.hasMore = false;
      if (!append) container.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;padding:20px;">' + L('Пусто', 'Empty') + '</p>';
      state.loading = false;
      return;
    }
    const html = films.map(f => buildMovieCardHTML(f)).join('');
    if (append) container.insertAdjacentHTML('beforeend', html);
    else container.innerHTML = html;
    state.page++;
    if (append && container.scrollLeft + container.clientWidth >= container.scrollWidth - 400) {
      setTimeout(() => { if (state.hasMore && !state.loading) loadCatalogRow(rowId, type, true); }, 300);
    }
  } catch (e) {
    console.error('row error:', rowId, type, e);
    if (!append) container.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;padding:20px;">' + L('Ошибка загрузки', 'Load error') + '</p>';
    state.hasMore = false;
  }
  state.loading = false;
}

function buildRowSkeletonHTML() {
  let s = '';
  for (let i = 0; i < 8; i++) {
    s += '<div class="movie-skeleton"><div class="skeleton-poster"></div><div class="skeleton-info"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>';
  }
  return s;
}

function buildMovieCardHTML(f) {
  const t = f.nameRu || f.nameEn || f.name || '';
  if (!t) return '';
  const id = f.filmId || f.id;
  if (f._tmdb) window._pendingTmdbIds[id] = { title: f.nameEn || t, year: f.year };
  const poster = f.posterUrlPreview || f.posterUrl || f.cover_url || '';
  const year = f.year || '';
  const genres = (f.genres || []).map(g => g.genre || g);
  const ratingNum = parseFloat(f.rating || f.ratingKinopoisk);
  const rating = !isNaN(ratingNum) && ratingNum > 0 ? ratingNum.toFixed(1) : '';
  const pHtml = poster
    ? '<img src="' + escapeHtml(poster) + '" alt="' + escapeHtml(t) + '" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.querySelector(\'.no-poster\').style.display=\'flex\';"><div class="no-poster" style="display:none;">🎬</div>'
    : '<div class="no-poster">🎬</div>';
  const rBadge = rating ? '<div class="rating-badge">' + STAR_SVG + '<span>' + rating + '</span></div>' : '';
  const parts = [];
  if (year) parts.push(year);
  if (genres.length) parts.push(escapeHtml(genres.slice(0, 2).join(', ')));
  const metaHtml = parts.length ? '<div class="movie-meta">' + parts.join(' · ') + '</div>' : '';
  return '<div class="movie-card" onclick="openFilmPage(\'' + id + '\')">' +
    '<div class="poster-wrap">' + pHtml + rBadge + '</div>' +
    '<div class="movie-info"><h3>' + escapeHtml(t) + '</h3>' + metaHtml + '</div>' +
  '</div>';
}

function scrollRow(rowId, dir) {
  const row = document.getElementById(rowId);
  if (!row) return;
  if (dir > 0) {
    const cfg = CATALOG_ROWS.find(r => r.id === rowId);
    const state = rowState[rowId];
    if (cfg && state && state.hasMore && !state.loading) {
      if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 500) loadCatalogRow(rowId, cfg.type, true);
    }
  }
  const amount = Math.max(300, row.clientWidth * 0.8);
  row.scrollBy({ left: dir * amount, behavior: 'smooth' });
}

function initCatalogRowScroll() {
  document.querySelectorAll('.catalog-row').forEach(row => {
    if (row.dataset.scrollInit === '1') return;
    row.dataset.scrollInit = '1';
    row.addEventListener('scroll', () => {
      if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 400) {
        const cfg = CATALOG_ROWS.find(r => r.id === row.id);
        const state = rowState[row.id];
        if (cfg && state && state.hasMore && !state.loading) loadCatalogRow(row.id, cfg.type, true);
      }
    }, { passive: true });
  });
}

// ============ РОУТЕР СТРАНИЦЫ ФИЛЬМА ============
async function openFilmPage(filmId) {
  if (window._pendingTmdbIds && window._pendingTmdbIds[filmId]) {
    const info = window._pendingTmdbIds[filmId];
    const kpId = await resolveTmdbToKinopoisk(filmId, info.title, info.year);
    if (kpId) { window.location.hash = 'film/' + kpId; return; }
  }
  window.location.hash = 'film/' + filmId;
}

async function resolveTmdbToKinopoisk(tmdbId, title, year) {
  if (!tmdbId) return null;
  try {
    const { data } = await supabaseClient.from('movie_ids_map').select('kinopoisk_id').eq('tmdb_id', tmdbId).maybeSingle();
    if (data?.kinopoisk_id) return data.kinopoisk_id;
  } catch (e) {}
  if (title) {
    try {
      const { data } = await supabaseClient.functions.invoke('search-kinopoisk', { body: { query: title + (year ? ' ' + year : '') } });
      const films = data?.films || [];
      if (films.length) {
        let best = films[0];
        if (year) { const withYear = films.find(f => String(f.year) === String(year)); if (withYear) best = withYear; }
        try { await supabaseClient.from('movie_ids_map').upsert({ kinopoisk_id: best.filmId, tmdb_id: tmdbId, updated_at: new Date().toISOString() }, { onConflict: 'kinopoisk_id' }); } catch (e) {}
        return best.filmId;
      }
    } catch (e) {}
  }
  return null;
}

function closeFilmPage() {
  window.location.hash = '';
  document.title = 'Киноклуб — оценки фильмов, рецензии и подборки | kinoclab.online';
}

function handleHashRoute() {
  const hash = window.location.hash;
  const match = hash.match(/^#film\/(\d+)/);
  if (match) { showFilmPage(match[1]); return true; }
  return false;
}

window.addEventListener('hashchange', handleHashRoute);

// ============ СТРАНИЦА ФИЛЬМА ============
async function showFilmPage(filmId) {
  currentFilmId = filmId;
  const en = isEnMode();
  document.querySelectorAll('.section').forEach(x => x.classList.remove('active'));
  const page = document.getElementById('film-page');
  if (page) page.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });

  const container = document.getElementById('film-page-content');
  container.innerHTML = '<div style="padding:60px;text-align:center;color:var(--muted);">' + L('Загрузка фильма…', 'Loading movie…') + '</div>';

  const data = await getMovie(filmId);
  if (!data) {
    container.innerHTML = '<div style="padding:60px;text-align:center;color:var(--danger);">' + L('Не удалось загрузить фильм', 'Failed to load movie') + '</div>';
    return;
  }

  const t = data.nameRu || data.nameEn || '';
  const kp = parseFloat(data.ratingKinopoisk);
  const year = data.year || '';
  const description = data.description || L('Описание отсутствует.', 'No description available.');
  const poster = data.posterUrl || '';
  const genresArr = (data.genres || []).map(g => g.genre);
  const genresText = genresArr.join(', ');
  const kid = Number(filmId);
  const isWatched = watchedMovieIds.has(kid);
  const ageLimit = formatAgeLimit(data.ratingAgeLimits);

  document.title = t + (year ? ' (' + year + ')' : '') + (en ? ' — reviews, ratings | KinoClub' : ' — рецензии, оценки, смотреть | Киноклуб');

  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) { metaDesc = document.createElement('meta'); metaDesc.name = 'description'; document.head.appendChild(metaDesc); }
  metaDesc.content = (t + ' — ' + (description || '').slice(0, 150)).trim();

  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) { ogTitle = document.createElement('meta'); ogTitle.setAttribute('property', 'og:title'); document.head.appendChild(ogTitle); }
  ogTitle.content = t + (year ? ' (' + year + ')' : '');

  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (!ogDesc) { ogDesc = document.createElement('meta'); ogDesc.setAttribute('property', 'og:description'); document.head.appendChild(ogDesc); }
  ogDesc.content = (description || '').slice(0, 150);

  let ogImage = document.querySelector('meta[property="og:image"]');
  if (!ogImage) { ogImage = document.createElement('meta'); ogImage.setAttribute('property', 'og:image'); document.head.appendChild(ogImage); }
  ogImage.content = poster;

  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) { ogUrl = document.createElement('meta'); ogUrl.setAttribute('property', 'og:url'); document.head.appendChild(ogUrl); }
  ogUrl.content = 'https://kinoclab.online/#film/' + filmId;

  let isInWatchlistFlag = false;
  try {
    const { data: mv } = await supabaseClient.from('movies').select('id').eq('kinopoisk_id', kid).maybeSingle();
    if (mv) {
      const { data: wl } = await supabaseClient.from('watchlist').select('id').eq('user_id', currentUser.id).eq('movie_id', mv.id).maybeSingle();
      if (wl) isInWatchlistFlag = true;
    }
  } catch (e) {}

  saveMoviePosterToDb(kid, t, poster, description);

  const L_ = {
    back: L('Назад', 'Back'),
    watch: L('▶ Смотреть', '▶ Watch'),
    rate: L('Оценить', 'Rate'),
    watched: L('✅ Просмотрено', '✅ Watched'),
    mark: L('👁 Отметить', '👁 Mark'),
    wanted: L('★ В списке', '★ In list'),
    want: L('☆ Хочу посмотреть', '☆ Want to watch'),
    min: L(' мин', ' min'),
    ratingSrc: en ? 'TMDB' : 'Кинопоиск',
    trailers: L('Трейлеры', 'Trailers'),
    cast: L('Актёрский состав', 'Cast'),
  };

  const watchHref = en && data.tmdbId
    ? 'https://www.themoviedb.org/movie/' + data.tmdbId
    : 'https://www.kinopoisk.ru/film/' + kid + '/';

  container.innerHTML =
    '<button class="film-page-back-top" onclick="closeFilmPage(); showSection(\'movies\');">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> ' + L_.back +
    '</button>' +
    '<div class="film-page-layout">' +
      '<aside class="film-page-sidebar">' +
        '<div class="film-page-poster">' +
          (poster ? '<img src="' + escapeHtml(poster) + '" alt="' + escapeHtml(t) + '">' : '<div class="no-poster">🎬</div>') +
        '</div>' +
        '<div id="film-trailer-icons" class="film-trailer-icons"></div>' +
        '<div class="film-page-actions-vertical">' +
          '<a href="' + watchHref + '" target="_blank" rel="noopener" class="btn btn-primary btn-full">' + L_.watch + '</a>' +
          '<button class="btn btn-secondary btn-full" onclick="openRatingModal(\'' + filmId + '\')">' + L_.rate + '</button>' +
          '<button class="btn btn-secondary btn-full watched-toggle' + (isWatched ? ' active' : '') + '" onclick="toggleWatchedFromModal(' + kid + ', \'' + escapeForOnclick(t) + '\', \'' + escapeForOnclick(poster) + '\')">' + (isWatched ? L_.watched : L_.mark) + '</button>' +
          '<button class="watchlist-btn btn-full' + (isInWatchlistFlag ? ' active' : '') + '" id="film-watchlist-btn" onclick="toggleWatchlistFromFilmPage(' + kid + ', \'' + escapeForOnclick(t) + '\', \'' + escapeForOnclick(poster) + '\')">' + (isInWatchlistFlag ? L_.wanted : L_.want) + '</button>' +
        '</div>' +
      '</aside>' +
      '<div class="film-page-main">' +
        '<h1 class="film-title">' + escapeHtml(t) + '</h1>' +
        '<div class="film-meta">' +
          (year ? '<span>' + year + '</span>' : '') +
          (data.filmLength ? '<span>· ' + data.filmLength + L_.min + '</span>' : '') +
          (ageLimit ? '<span class="age-badge">' + ageLimit + '</span>' : '') +
        '</div>' +
        (!isNaN(kp) && kp > 0 ? '<div class="film-rating">' + STAR_SVG + ' <b>' + kp.toFixed(1) + '</b> <span>' + L_.ratingSrc + '</span></div>' : '') +
        (genresText ? '<div class="film-genres">' + escapeHtml(genresText) + '</div>' : '') +
        '<p class="film-desc">' + escapeHtml(description) + '</p>' +
        '<section class="film-trailers-section">' +
          '<h3>' + L_.trailers + '</h3>' +
          '<div class="trailer-player-wrap" id="film-trailer-player-wrap">' +
            '<iframe id="trailer-player" src="" allowfullscreen loading="lazy"></iframe>' +
          '</div>' +
          '<div id="trailer-current-name" class="trailer-current-name"></div>' +
        '</section>' +
        '<section class="film-cast-section">' +
          '<h3>' + L_.cast + '</h3>' +
          '<div id="film-cast-list" class="cast-grid"></div>' +
        '</section>' +
        '<div id="sequels-block" class="movie-modal-sequels"></div>' +
        '<div class="film-page-reviews" id="film-reviews-block"></div>' +
      '</div>' +
    '</div>';

  loadFilmTrailersSidebar(filmId, t, year, data);
  loadFilmCastSidebar(filmId, data);
  loadSequelsAndPrequels(filmId);
  loadFilmReviewsSidebar(filmId);
}

// ============ ТРЕЙЛЕРЫ ============
async function loadFilmTrailersSidebar(filmId, title, year, movieData) {
  const iconsContainer = document.getElementById('film-trailer-icons');
  const iframe = document.getElementById('trailer-player');
  const nameEl = document.getElementById('trailer-current-name');
  if (!iframe) return;
  const en = isEnMode();
  if (iconsContainer) iconsContainer.innerHTML = '<span style="color:var(--muted);font-size:0.75rem;">' + L('Загрузка…', 'Loading…') + '</span>';

  if (movieData && movieData.videos && movieData.videos.length) {
    const items = movieData.videos.map(v => ({
      platform: 'youtube', platformName: 'YouTube',
      name: v.name || 'Trailer',
      embedUrl: 'https://www.youtube.com/embed/' + v.youtubeId,
    }));
    if (iconsContainer) {
      iconsContainer.innerHTML = items.map((tr, i) => {
        const icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="#ff0000"><path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.5.6c-1 .3-1.7 1.1-2 2.1C0 8.2 0 12 0 12s0 3.8.5 5.8c.3 1 1 1.8 2 2.1 2 .6 9.5.6 9.5.6s7.5 0 9.5-.6c1-.3 1.7-1.1 2-2.1.5-2 .5-5.8.5-5.8s0-3.8-.5-5.8zM9.5 15.5v-7l6 3.5-6 3.5z"/></svg>';
        return '<button class="film-trailer-icon-btn' + (i === 0 ? ' active' : '') + '" onclick="switchTrailerIcon(' + i + ')" title="' + escapeHtml(tr.platformName) + '">' + icon + '</button>';
      }).join('') +
      '<a class="film-trailer-icon-btn" href="https://www.kinopoisk.ru/film/' + filmId + '/video/" target="_blank" rel="noopener" title="' + L('Трейлеры на Кинопоиске', 'Trailers on Kinopoisk') + '">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="#ff5500"><rect x="2" y="3" width="20" height="18" rx="3"/><path fill="#fff" d="M10 8v8l6-4z"/></svg></a>';
    }
    if (iframe) iframe.src = items[0].embedUrl;
    if (nameEl) nameEl.textContent = items[0].name;
    if (iconsContainer) iconsContainer._trailers = items;
    return;
  }

  try {
    const { data } = await supabaseClient.functions.invoke('get-movie-videos', { body: { filmId, title, year } });
    const items = data?.items || [];
    if (!items.length) {
      if (iconsContainer) iconsContainer.innerHTML = '';
      const wrap = document.getElementById('film-trailer-player-wrap');
      if (wrap) wrap.style.display = 'none';
      if (nameEl) nameEl.textContent = '';
      return;
    }
    if (iconsContainer) {
      iconsContainer.innerHTML = items.map((tr, i) => {
        const icon = tr.platform === 'youtube'
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="#ff0000"><path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.5.6c-1 .3-1.7 1.1-2 2.1C0 8.2 0 12 0 12s0 3.8.5 5.8c.3 1 1 1.8 2 2.1 2 .6 9.5.6 9.5.6s7.5 0 9.5-.6c1-.3 1.7-1.1 2-2.1.5-2 .5-5.8.5-5.8s0-3.8-.5-5.8zM9.5 15.5v-7l6 3.5-6 3.5z"/></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="#ff5500"><circle cx="12" cy="12" r="11"/><path fill="#fff" d="M9 7v10l8-5z"/></svg>';
        const label = tr.platformName || tr.platform;
        return '<button class="film-trailer-icon-btn' + (i === 0 ? ' active' : '') + '" onclick="switchTrailerIcon(' + i + ')" title="' + escapeHtml(label) + '">' + icon + '</button>';
      }).join('') +
      '<a class="film-trailer-icon-btn" href="https://www.kinopoisk.ru/film/' + filmId + '/video/" target="_blank" rel="noopener" title="' + L('Трейлеры на Кинопоиске', 'Trailers on Kinopoisk') + '">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="#ff5500"><rect x="2" y="3" width="20" height="18" rx="3"/><path fill="#fff" d="M10 8v8l6-4z"/></svg></a>';
    }
    if (iframe) iframe.src = items[0].embedUrl;
    if (nameEl) nameEl.textContent = items[0].name;
    if (iconsContainer) iconsContainer._trailers = items;
  } catch (e) {
    if (iconsContainer) iconsContainer.innerHTML = '';
    const wrap = document.getElementById('film-trailer-player-wrap');
    if (wrap) wrap.style.display = 'none';
  }
}

function switchTrailerIcon(idx) {
  const container = document.getElementById('film-trailer-icons');
  if (!container || !container._trailers) return;
  const items = container._trailers;
  const tr = items[idx];
  if (!tr) return;
  container.querySelectorAll('.film-trailer-icon-btn').forEach((b, i) => {
    if (i < items.length) b.classList.toggle('active', i === idx);
  });
  const iframe = document.getElementById('trailer-player');
  if (iframe) iframe.src = tr.embedUrl;
  const nameEl = document.getElementById('trailer-current-name');
  if (nameEl) nameEl.textContent = tr.name;
}

// ============ АКТЁРЫ ============
async function loadFilmCastSidebar(filmId, movieData) {
  const container = document.getElementById('film-cast-list');
  if (!container) return;
  if (movieData && movieData.staff && movieData.staff.length) {
    container.innerHTML = movieData.staff.map(p =>
      '<div class="cast-card">' +
        '<div class="cast-photo">' + (p.posterUrl ? '<img src="' + escapeHtml(p.posterUrl) + '" loading="lazy">' : '<div class="no-photo">👤</div>') + '</div>' +
        '<div class="cast-name">' + escapeHtml(p.nameRu || p.nameEn || '') + '</div>' +
        '<div class="cast-role">' + escapeHtml(p.description || p.profession || '') + '</div>' +
      '</div>'
    ).join('');
    return;
  }
  container.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;">' + L('Загрузка…', 'Loading…') + '</p>';
  try {
    const { data } = await supabaseClient.functions.invoke('get-film-staff', { body: { filmId } });
    const staff = data?.items || [];
    if (!staff.length) {
      container.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;">' + L('Информация недоступна', 'Info unavailable') + '</p>';
      return;
    }
    container.innerHTML = staff.map(p =>
      '<div class="cast-card">' +
        '<div class="cast-photo">' + (p.posterUrl ? '<img src="' + escapeHtml(p.posterUrl) + '" loading="lazy">' : '<div class="no-photo">👤</div>') + '</div>' +
        '<div class="cast-name">' + escapeHtml(p.nameRu || p.nameEn || '') + '</div>' +
        '<div class="cast-role">' + escapeHtml(p.description || p.profession || '') + '</div>' +
      '</div>'
    ).join('');
  } catch (e) {
    container.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;">' + L('Ошибка загрузки', 'Load error') + '</p>';
  }
}

// ============ ОТЗЫВЫ НА СТРАНИЦЕ ФИЛЬМА ============
async function loadFilmReviewsSidebar(filmId) {
  const container = document.getElementById('film-reviews-block');
  if (!container) return;
  try {
    const { data: movie } = await supabaseClient.from('movies').select('id').eq('kinopoisk_id', parseInt(filmId)).maybeSingle();
    if (!movie) { container.innerHTML = ''; return; }
    const { data: reviews } = await supabaseClient.from('reviews')
      .select('*, profiles(username, avatar_url)').eq('movie_id', movie.id).order('created_at', { ascending: false }).limit(30);
    const friendIds = await getMyFriendIds();
    const visible = (reviews || []).filter(r => canSeeReview(r, friendIds));
    if (!visible.length) { container.innerHTML = ''; return; }
    container.innerHTML = '<h3>' + L('Отзывы', 'Reviews') + '</h3>' + visible.map(r => {
      const username = r.profiles?.username || L('Пользователь', 'User');
      return '<div class="film-review-item">' +
        '<div class="film-review-header"><b>' + escapeHtml(username) + '</b><span class="rating">' + r.rating + '/10</span></div>' +
        (r.review_text ? '<p>' + escapeHtml(r.review_text) + '</p>' : '') +
      '</div>';
    }).join('');
  } catch (e) { container.innerHTML = ''; }
}

// ============ TOGGLE ПРОСМОТРЕНО ============
async function toggleWatchedFromModal(kinopoiskId, movieName, posterUrl) {
  if (!currentUser) return;
  const kid = Number(kinopoiskId);
  const isWatched = watchedMovieIds.has(kid);
  try {
    if (isWatched) {
      await supabaseClient.from('watched').delete().eq('user_id', currentUser.id).eq('kinopoisk_id', kid);
      watchedMovieIds.delete(kid);
      showNotification(L('Убрано из просмотренных', 'Removed from watched'), 'info');
    } else {
      await supabaseClient.from('watched').insert({ user_id: currentUser.id, kinopoisk_id: kid, movie_name: movieName || null, poster_url: posterUrl || null });
      watchedMovieIds.add(kid);
      showNotification(L('Отмечено как просмотрено', 'Marked as watched'), 'success');
    }
    const btn = document.querySelector('.film-page-actions-vertical .watched-toggle');
    if (btn) {
      const nowWatched = watchedMovieIds.has(kid);
      btn.classList.toggle('active', nowWatched);
      btn.innerHTML = nowWatched ? L('✅ Просмотрено', '✅ Watched') : L('👁 Отметить', '👁 Mark');
    }
    if (currentSection === 'movies') loadCatalogRows();
    else if (currentSection === 'watched') loadWatchedList();
  } catch (e) { showNotification(L('Ошибка: ', 'Error: ') + (e.message || ''), 'error'); }
}

async function toggleWatchlistFromFilmPage(kinopoiskId, movieName, posterUrl) {
  if (!currentUser) return;
  const kid = Number(kinopoiskId);
  const btn = document.getElementById('film-watchlist-btn');
  try {
    let movieId = null;
    const { data: mv } = await supabaseClient.from('movies').select('id').eq('kinopoisk_id', kid).maybeSingle();
    if (mv) movieId = mv.id;
    else {
      const { data: nm } = await supabaseClient.from('movies').insert({ name: movieName, kinopoisk_id: kid, cover_url: posterUrl || null }).select('id').single();
      if (nm) movieId = nm.id;
    }
    if (!movieId) { showNotification(L('Ошибка: не удалось сохранить фильм', 'Failed to save movie'), 'error'); return; }
    const { data: existing } = await supabaseClient.from('watchlist').select('id').eq('user_id', currentUser.id).eq('movie_id', movieId).maybeSingle();
    if (existing) {
      await supabaseClient.from('watchlist').delete().eq('id', existing.id);
      if (btn) { btn.classList.remove('active'); btn.innerHTML = L('☆ Хочу посмотреть', '☆ Want to watch'); }
      showNotification(L('Убрано из списка', 'Removed from watchlist'), 'info');
    } else {
      await supabaseClient.from('watchlist').insert({ user_id: currentUser.id, movie_id: movieId, kinopoisk_id: kid });
      if (btn) { btn.classList.add('active'); btn.innerHTML = L('★ В списке', '★ In list'); }
      showNotification(L('Добавлено в список', 'Added to watchlist'), 'success');
    }
  } catch (e) { showNotification(L('Ошибка: ', 'Error: ') + (e.message || ''), 'error'); }
}

// ============ КОЛЕСО ============
function updateWheelInfo() {
  const info = document.getElementById('wheel-info');
  if (!info) return;
  info.textContent = isEnMode()
    ? wheelMovies.length + ' movies on the wheel'
    : wheelMovies.length + ' фильмов в колесе';
}
function changeDuration(delta) {
  const input = document.getElementById('spin-duration');
  if (!input) return;
  let val = parseInt(input.value) || 3;
  val = Math.max(1, Math.min(30, val + delta));
  input.value = val;
}
async function loadWheelMovies() {
  const resultEl = document.getElementById('wheel-result');
  if (resultEl) { resultEl.textContent = ''; resultEl.classList.remove('winner'); }
  const en = isEnMode();
  try {
    let films = [];
    if (en) {
      const page = Math.floor(Math.random() * 5) + 1;
      const { data } = await supabaseClient.functions.invoke('tmdb-list', { body: { category: 'popular', page } });
      films = (data?.films || []).map(f => ({
        filmId: f.filmId,
        _tmdb: true,
        nameEn: f.nameEn || f.nameRu,
        nameRu: f.nameRu || f.nameEn,
        year: f.year,
      }));
    } else {
      const randomPage = Math.floor(Math.random() * 20) + 1;
      const { data } = await supabaseClient.functions.invoke('get-movies-by-page', { body: { page: randomPage, category: 'popular' } });
      films = data?.films || [];
    }
    if (!films.length) { if (resultEl) resultEl.textContent = L('Не удалось загрузить фильмы', 'Failed to load movies'); return; }
    wheelMovies = films.sort(() => Math.random() - 0.5).slice(0, 8).map(f => {
      const name = en ? (f.nameEn || f.nameRu) : (f.nameRu || f.nameEn);
      if (f._tmdb) window._pendingTmdbIds[f.filmId] = { title: f.nameEn || f.nameRu, year: f.year };
      return { name: name || L('Фильм', 'Movie'), kid: f.filmId };
    });
    drawWheel();
    loadWheelHistory();
    updateWheelInfo();
  } catch (e) { if (resultEl) resultEl.textContent = L('Ошибка загрузки', 'Load error'); }
}
function drawWheel() {
  const canvas = document.getElementById('wheel-canvas');
  if (!canvas || !wheelMovies.length) return;
  const size = 360;
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2;
  const radius = size / 2 - 10;
  const seg = (2 * Math.PI) / wheelMovies.length;
  const colors = ['#a855f7', '#3b82f6', '#22c55e', '#fbbf24', '#ec4899', '#f97316', '#14b8a6', '#ef4444'];
  ctx.clearRect(0, 0, size, size);
  wheelMovies.forEach((movie, i) => {
    const start = currentRotation + i * seg;
    const end = start + seg;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + seg / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Manrope, Arial';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    let name = movie.name;
    if (name.length > 18) name = name.substring(0, 16) + '...';
    ctx.fillText(name, radius - 15, 5);
    ctx.restore();
  });
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
  g.addColorStop(0, '#fff');
  g.addColorStop(1, '#ccc');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 3;
  ctx.stroke();
}
function spinWheel() {
  if (isSpinning || wheelMovies.length === 0) return;
  isSpinning = true;
  const resultEl = document.getElementById('wheel-result');
  const spinBtn = document.getElementById('spin-btn');
  resultEl.textContent = '';
  resultEl.classList.remove('winner');
  spinBtn.disabled = true;
  spinBtn.classList.add('spinning');
  spinBtn.innerHTML = L('Крутится...', 'Spinning...');
  const durInput = document.getElementById('spin-duration');
  const duration = (durInput ? parseInt(durInput.value) : 3) * 1000;
  const spins = 6 + Math.random() * 4;
  const targetRotation = currentRotation + spins * 2 * Math.PI;
  const startTime = Date.now();
  const startRotation = currentRotation;
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    currentRotation = startRotation + (targetRotation - startRotation) * ease;
    drawWheel();
    if (progress < 1) requestAnimationFrame(animate);
    else {
      const seg = (2 * Math.PI) / wheelMovies.length;
      const norm = currentRotation % (2 * Math.PI);
      const arrowAngle = -Math.PI / 2;
      let idx = Math.floor(((arrowAngle - norm) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) / seg);
      idx = idx % wheelMovies.length;
      const winner = wheelMovies[idx];
      saveWheelResult(winner);
      resultEl.innerHTML = L('Выпало: ', 'Picked: ') + '<strong>' + escapeHtml(winner.name) + '</strong>';
      resultEl.classList.add('winner');
      isSpinning = false;
      spinBtn.disabled = false;
      spinBtn.classList.remove('spinning');
      spinBtn.innerHTML = L('Крутить', 'Spin');
    }
  }
  animate();
}
async function saveWheelResult(movie) {
  try {
    await supabaseClient.from('wheel_results').insert({
      user_id: currentUser.id,
      movie_name: movie.name,
      kinopoisk_id: movie.kid,
      visibility: 'friends'
    });
    loadWheelHistory();
  } catch (e) {}
}
async function loadWheelHistory() {
  try {
    const friendIds = await getMyFriendIds();
    const { data: results } = await supabaseClient
      .from('wheel_results')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(100);
    const filtered = (results || []).filter(r => {
      if (r.user_id === currentUser.id) return true;
      if (isAdmin()) return true;
      if (r.visibility === 'public' || r.visibility == null) return true;
      return friendIds.has(r.user_id);
    }).slice(0, 30);
    const container = document.getElementById('wheel-history');
    if (!container) return;
    const en = isEnMode();
    if (!filtered.length) { container.innerHTML = '<div class="history-empty"><span>🎡</span>' + L('Пока никто не крутил колесо', 'Nobody spun the wheel yet') + '</div>'; return; }
    container.innerHTML = filtered.map(r => {
      const username = r.profiles?.username || L('Пользователь', 'User');
      const initial = username.charAt(0).toUpperCase();
      const time = formatDate(r.created_at);
      const canDel = isAdmin() || r.user_id === currentUser.id;
      return '<div class="wheel-history-item" onclick="openFilmPage(\'' + (r.kinopoisk_id || r.movie_id) + '\')">' +
        '<div class="history-avatar">' + initial + '</div>' +
        '<div class="history-content">' +
          '<p class="history-user">' + escapeHtml(username) + '</p>' +
          '<p class="history-movie">' + escapeHtml(r.movie_name) + '</p>' +
          '<p class="history-time">' + time + '</p>' +
        '</div>' +
        (canDel ? '<button class="history-delete" onclick="event.stopPropagation(); deleteWheelResult(\'' + r.id + '\')">🗑</button>' : '') +
      '</div>';
    }).join('');
  } catch (e) {}
}
async function deleteWheelResult(id) {
  showConfirmModal(L('Удалить результат?', 'Delete result?'), async () => {
    await supabaseClient.from('wheel_results').delete().eq('id', id);
    loadWheelHistory();
  });
}

// ============ ДРУЗЬЯ ============
async function searchUsers(q) {
  if (q.length < 2) return;
  const { data: users } = await supabaseClient.from('profiles').select('*').ilike('username', '%' + q + '%').limit(10);
  if (users) {
    document.getElementById('user-search-results').innerHTML = users.map(u =>
      u.id === currentUser.id ? '' :
      '<div style="padding:12px;background:var(--surface-2);border-radius:10px;display:flex;justify-content:space-between;align-items:center;"><span>' + escapeHtml(u.username) + '</span><button class="btn btn-primary" style="min-height:32px;padding:6px 14px;font-size:0.8rem;" onclick="sendFriendRequest(\'' + u.id + '\')">' + L('Добавить', 'Add') + '</button></div>'
    ).join('');
  }
}
async function sendFriendRequest(rid) {
  const { data: existing } = await supabaseClient.from('friend_requests').select('id').eq('sender_id', currentUser.id).eq('receiver_id', rid).maybeSingle();
  if (existing) { showNotification(L('Заявка уже отправлена', 'Request already sent'), 'info'); return; }
  await supabaseClient.from('friend_requests').insert([{ sender_id: currentUser.id, receiver_id: rid, status: 'pending' }]);
  createNotification(rid, 'friend_request', currentUserProfile.username + L(' хочет добавить вас в друзья', ' wants to add you as a friend'));
  showNotification(L('Заявка отправлена', 'Request sent'), 'success');
}
async function loadFriendRequests() {
  const { data } = await supabaseClient.from('friend_requests').select('*, sender:profiles!sender_id(username)').eq('receiver_id', currentUser.id).eq('status', 'pending');
  const c = document.getElementById('friend-requests');
  if (!c) return;
  if (!data?.length) { c.innerHTML = '<p style="color:var(--muted);">' + L('Нет заявок', 'No requests') + '</p>'; return; }
  c.innerHTML = data.map(r =>
    '<div style="padding:12px;background:var(--surface-2);border-radius:10px;display:flex;justify-content:space-between;align-items:center;"><span>' + escapeHtml(r.sender?.username || L('Пользователь', 'User')) + '</span><button class="btn btn-primary" style="min-height:32px;padding:6px 14px;font-size:0.8rem;" onclick="acceptFriendRequest(\'' + r.id + '\',\'' + r.sender_id + '\')">' + L('Принять', 'Accept') + '</button></div>'
  ).join('');
}
async function acceptFriendRequest(rid, sid) {
  await supabaseClient.from('friend_requests').update({ status: 'accepted' }).eq('id', rid);
  await supabaseClient.from('friendships').insert([{ user_id: currentUser.id, friend_id: sid }, { user_id: sid, friend_id: currentUser.id }]);
  myFriendIdsCache = null;
  loadFriendRequests(); loadFriends();
}
async function loadFriends() {
  const { data } = await supabaseClient.from('friendships').select('*, friend:profiles!friend_id(username)').eq('user_id', currentUser.id);
  const c = document.getElementById('friends-list');
  if (!c) return;
  if (!data?.length) { c.innerHTML = '<p style="color:var(--muted);">' + L('Нет друзей', 'No friends') + '</p>'; return; }
  const friendIds = data.map(f => f.friend_id);
  const [{ data: presenceData }, { data: unreadAll }] = await Promise.all([
    supabaseClient.from('user_presence').select('user_id, last_seen').in('user_id', friendIds),
    supabaseClient.from('private_messages').select('sender_id').eq('receiver_id', currentUser.id).eq('is_read', false).eq('is_deleted', false)
  ]);
  const pMap = {};
  presenceData?.forEach(p => { pMap[p.user_id] = (Date.now() - Date.parse(p.last_seen)) / 1000 < 120; });
  const uMap = {};
  unreadAll?.forEach(m => { uMap[m.sender_id] = (uMap[m.sender_id] || 0) + 1; });
  c.innerHTML = data.map(f => {
    const isOnline = pMap[f.friend_id] || false;
    const unreadFrom = uMap[f.friend_id] || 0;
    const uname = f.friend?.username || L('Друг', 'Friend');
    return '<div style="padding:12px;background:var(--surface-2);border-radius:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
      '<div style="flex:1;min-width:0;cursor:pointer;" onclick="viewUserProfile(\'' + f.friend_id + '\')"><span id="status-' + f.friend_id + '">' + (isOnline ? '🟢' : '⚪') + '</span> <span>' + escapeHtml(f.friend?.username || L('Пользователь', 'User')) + '</span>' +
      (unreadFrom > 0 ? '<span style="background:var(--accent);color:#fff;border-radius:10px;padding:2px 8px;font-size:0.7rem;margin-left:8px;">' + unreadFrom + '</span>' : '') + '</div>' +
      '<button class="btn btn-primary" style="min-height:32px;padding:6px 12px;font-size:0.8rem;" onclick="event.stopPropagation(); openChat(\'' + f.friend_id + '\', \'' + escapeForOnclick(uname) + '\')">💬</button>' +
      '<button class="btn btn-danger" style="min-height:32px;padding:6px 10px;font-size:0.8rem;" onclick="event.stopPropagation(); removeFriend(\'' + f.friend_id + '\', \'' + escapeForOnclick(uname) + '\')" title="' + L('Удалить из друзей', 'Remove friend') + '">🗑</button>' +
    '</div>';
  }).join('');
}

async function removeFriend(friendId, friendName) {
  showConfirmModal(L('Удалить ', 'Remove ') + friendName + L(' из друзей?', ' from friends?'), async () => {
    try {
      await supabaseClient.from('friendships').delete().eq('user_id', currentUser.id).eq('friend_id', friendId);
      await supabaseClient.from('friendships').delete().eq('user_id', friendId).eq('friend_id', currentUser.id);
      myFriendIdsCache = null;
      showNotification(friendName + L(' удалён из друзей', ' removed from friends'), 'info');
      loadFriends();
    } catch (e) {
      showNotification(L('Ошибка: ', 'Error: ') + (e.message || ''), 'error');
    }
  });
}

// ============ ЧАТ ============
function buildChatSkeleton() {
  let html = '';
  for (let i = 0; i < 5; i++) {
    html += '<div class="skeleton-chat-item"><div class="sk-avatar"></div><div class="sk-info"><div class="sk-line short"></div><div class="sk-line"></div></div></div>';
  }
  return html;
}

async function loadChatFriends() {
  const container = document.getElementById('chat-list');
  if (!container) return;
  container.innerHTML = buildChatSkeleton();
  const { data: friendships } = await supabaseClient.from('friendships').select('*, friend:profiles!friend_id(username, avatar_url)').eq('user_id', currentUser.id);
  if (!friendships?.length) { container.innerHTML = '<div class="tg-empty-list">' + L('У вас пока нет друзей', 'You have no friends yet') + '</div>'; return; }
  const friendIds = friendships.map(f => f.friend_id);
  const { data: presenceData } = await supabaseClient.from('user_presence').select('user_id, last_seen').in('user_id', friendIds);
  const pMap = {};
  presenceData?.forEach(p => { pMap[p.user_id] = (Date.now() - Date.parse(p.last_seen)) / 1000 < 120; });
  const { data: lastMessages } = await supabaseClient.from('private_messages').select('*').or('sender_id.eq.' + currentUser.id + ',receiver_id.eq.' + currentUser.id).order('created_at', { ascending: false }).limit(500);
  const lastMsgMap = {};
  const unreadMap = {};
  (lastMessages || []).forEach(m => {
    const fid = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id;
    if (!lastMsgMap[fid]) lastMsgMap[fid] = m;
    if (m.receiver_id === currentUser.id && !m.is_read && !m.is_deleted) unreadMap[fid] = (unreadMap[fid] || 0) + 1;
  });
  allChatFriends = friendships.map(f => ({
    id: f.friend_id,
    username: f.friend?.username || L('Пользователь', 'User'),
    avatar_url: f.friend?.avatar_url || '',
    isOnline: pMap[f.friend_id] || false,
    lastSeen: presenceData?.find(p => p.user_id === f.friend_id)?.last_seen || null,
    lastMessage: lastMsgMap[f.friend_id],
    unread: unreadMap[f.friend_id] || 0,
    lastTime: lastMsgMap[f.friend_id] ? new Date(lastMsgMap[f.friend_id].created_at).getTime() : 0
  }));
  allChatFriends.sort((a, b) => {
    if (a.unread > 0 && b.unread === 0) return -1;
    if (a.unread === 0 && b.unread > 0) return 1;
    return b.lastTime - a.lastTime;
  });
  renderChatFriends(allChatFriends);
}

function renderChatFriends(friends) {
  const container = document.getElementById('chat-list');
  if (!container) return;
  if (!friends.length) { container.innerHTML = '<div class="tg-empty-list">' + L('Ничего не найдено', 'Nothing found') + '</div>'; return; }
  container.innerHTML = friends.map(f => {
    const initial = f.username.charAt(0).toUpperCase();
    const avatar = f.avatar_url
      ? '<img src="' + escapeHtml(f.avatar_url) + '" onerror="this.style.display=\'none\';this.parentElement.textContent=\'' + escapeForOnclick(initial) + '\';">'
      : initial;
    let preview = L('Нет сообщений', 'No messages');
    if (f.lastMessage) {
      const you = L('Вы: ', 'You: ');
      if (f.lastMessage.message_text) preview = (f.lastMessage.sender_id === currentUser.id ? you : '') + escapeHtml(f.lastMessage.message_text);
      else if (f.lastMessage.image_url) preview = (f.lastMessage.sender_id === currentUser.id ? you : '') + L('Изображение', 'Image');
      else if (f.lastMessage.video_url) preview = (f.lastMessage.sender_id === currentUser.id ? you : '') + L('Видео', 'Video');
    }
    const time = f.lastMessage ? formatChatTime(f.lastMessage.created_at) : '';
    return '<div class="tg-chat-item' + (currentChatFriend === f.id ? ' active' : '') + '" onclick="openChat(\'' + f.id + '\', \'' + escapeForOnclick(f.username) + '\', \'' + escapeForOnclick(f.avatar_url || '') + '\', ' + f.isOnline + ')">' +
      '<div class="tg-chat-item-avatar">' + avatar + '<div class="online-dot' + (f.isOnline ? ' online' : '') + '"></div></div>' +
      '<div class="tg-chat-item-content">' +
        '<div class="tg-chat-item-row"><span class="tg-chat-item-name">' + escapeHtml(f.username) + '</span><span class="tg-chat-item-time">' + time + '</span></div>' +
        '<div class="tg-chat-item-preview' + (f.unread > 0 ? ' unread' : '') + '">' + preview + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function filterChats(query) {
  if (!query) { renderChatFriends(allChatFriends); return; }
  const q = query.toLowerCase();
  const filtered = allChatFriends.filter(f => f.username.toLowerCase().includes(q) || (f.lastMessage?.message_text || '').toLowerCase().includes(q));
  renderChatFriends(filtered);
}

async function openChat(fid, friendName, avatarUrl, isOnline) {
  currentChatFriend = fid;
  currentChatFriendName = friendName;
  currentChatFriendProfile = { avatar: avatarUrl, online: isOnline };
  globalLastDateShown = null;
  isChatOpen = true;
  currentSection = 'chat';
  currentReplyMessage = null;
  const tgChat = document.getElementById('tg-chat');
  if (tgChat) tgChat.classList.add('in-dialog');
  document.getElementById('tg-dialog-header').style.display = 'flex';
  document.getElementById('tg-empty').style.display = 'none';
  const initial = friendName.charAt(0).toUpperCase();
  const avatar = avatarUrl ? '<img src="' + escapeHtml(avatarUrl) + '" onerror="this.style.display=\'none\';this.parentElement.textContent=\'' + escapeForOnclick(initial) + '\';">' : initial;
  document.getElementById('tg-dialog-avatar').innerHTML = avatar + '<div class="online-dot' + (isOnline ? ' online' : '') + '"></div>';
  document.getElementById('tg-dialog-name').textContent = friendName;
  const statusEl = document.getElementById('tg-dialog-status');
  if (isOnline) { statusEl.textContent = L('в сети', 'online'); statusEl.className = 'tg-dialog-status online'; }
  else {
    const { data: presence } = await supabaseClient.from('user_presence').select('last_seen').eq('user_id', fid).maybeSingle();
    statusEl.textContent = formatLastSeen(presence?.last_seen);
    statusEl.className = 'tg-dialog-status';
  }
  document.getElementById('chat-controls').style.display = 'block';
  document.getElementById('tg-reply-preview').style.display = 'none';
  document.querySelectorAll('.tg-chat-item').forEach(el => el.classList.remove('active'));
  await supabaseClient.from('private_messages').update({ is_read: true }).eq('sender_id', fid).eq('receiver_id', currentUser.id).eq('is_read', false);
  const friendEntry = allChatFriends.find(f => f.id === fid);
  if (friendEntry) friendEntry.unread = 0;
  renderChatFriends(allChatFriends);
  const c = document.getElementById('chat-container');
  c.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;">' + L('Загрузка...', 'Loading...') + '</div>';
  if (!messagesCache[fid]) {
    const { data: messages } = await supabaseClient.from('private_messages').select('*')
      .or('and(sender_id.eq.' + currentUser.id + ',receiver_id.eq.' + fid + '),and(sender_id.eq.' + fid + ',receiver_id.eq.' + currentUser.id + ')')
      .order('created_at', { ascending: true }).limit(150);
    messagesCache[fid] = (messages || []).filter(m => !m.is_deleted);
  }
  c.innerHTML = '';
  renderMessages(messagesCache[fid]);
  forceScrollToBottom();
  const scrollBtn = document.getElementById('tg-scroll-bottom');
  if (scrollBtn) scrollBtn.style.display = 'none';
  if (window.innerWidth > 768) setTimeout(() => document.getElementById('chat-input')?.focus(), 100);
  if (window._chatStatusInterval) clearInterval(window._chatStatusInterval);
  window._chatStatusInterval = setInterval(async () => {
    if (!isChatOpen || !currentChatFriend) return;
    const { data: presence } = await supabaseClient.from('user_presence').select('last_seen').eq('user_id', currentChatFriend).maybeSingle();
    const el = document.getElementById('tg-dialog-status');
    if (!el) return;
    const now = Date.now();
    const isOn = presence?.last_seen && (now - Date.parse(presence.last_seen)) / 1000 < 120;
    if (isOn) { el.textContent = L('в сети', 'online'); el.className = 'tg-dialog-status online'; }
    else { el.textContent = formatLastSeen(presence?.last_seen); el.className = 'tg-dialog-status'; }
  }, 30000);
}

function backToChatList() {
  isChatOpen = false;
  currentChatFriend = null;
  currentChatFriendName = '';
  currentReplyMessage = null;
  globalLastDateShown = null;
  const tgChat = document.getElementById('tg-chat');
  if (tgChat) tgChat.classList.remove('in-dialog');
  document.getElementById('tg-dialog-header').style.display = 'none';
  document.getElementById('tg-empty').style.display = 'flex';
  document.getElementById('chat-controls').style.display = 'none';
  document.getElementById('tg-reply-preview').style.display = 'none';
  document.getElementById('chat-container').innerHTML = '';
  if (window._chatStatusInterval) { clearInterval(window._chatStatusInterval); window._chatStatusInterval = null; }
  loadChatFriends();
}

function renderMessages(messages) {
  const c = document.getElementById('chat-container');
  c.innerHTML = '';
  globalLastDateShown = null;
  let prevSender = null;
  let prevTime = null;
  messages.forEach(m => {
    if (!m?.id || m.is_deleted) return;
    const msgDate = new Date(m.created_at);
    const dateKey = msgDate.toDateString();
    if (!globalLastDateShown || dateKey !== globalLastDateShown) {
      const div = document.createElement('div');
      div.className = 'tg-date-divider';
      div.innerHTML = '<span>' + formatDateSeparator(m.created_at) + '</span>';
      c.appendChild(div);
      globalLastDateShown = dateKey;
      prevSender = null;
    }
    const isMy = m.sender_id === currentUser.id;
    const td = prevTime ? (new Date(m.created_at) - prevTime) / 60000 : 999;
    const grouped = prevSender === m.sender_id && td < 5;
    const div = document.createElement('div');
    div.className = 'tg-msg ' + (isMy ? 'mine' : 'theirs') + (grouped ? ' grouped' : '');
    div.id = 'msg-' + m.id;
    div.dataset.id = m.id;
    div.innerHTML = renderMessageBubble(m, isMy);
    div.addEventListener('contextmenu', (e) => { e.preventDefault(); showMessageMenu(e, m.id, m); });
    let pressTimer;
    let longPressTriggered = false;
    div.addEventListener('touchstart', (e) => {
      longPressTriggered = false;
      pressTimer = setTimeout(() => {
        longPressTriggered = true;
        if (navigator.vibrate) navigator.vibrate(30);
        showMessageMenu(e.touches[0], m.id, m);
      }, 500);
    }, { passive: true });
    div.addEventListener('touchend', (e) => {
      clearTimeout(pressTimer);
      if (longPressTriggered) { e.preventDefault(); }
    });
    div.addEventListener('touchmove', () => clearTimeout(pressTimer));
    c.appendChild(div);
    prevSender = m.sender_id;
    prevTime = new Date(m.created_at);
  });
  loadAllMessageReactions(messages);
}

function renderMessageBubble(m, isMy) {
  let content = '';
  if (m.reply_to) {
    const rmsg = messagesCache[currentChatFriend]?.find(x => x.id === m.reply_to);
    if (rmsg) {
      const rName = rmsg.sender_id === currentUser.id ? L('Вы', 'You') : currentChatFriendName;
      const rText = rmsg.message_text || (rmsg.image_url ? L('Изображение', 'Image') : L('Видео', 'Video'));
      content += '<div class="tg-reply-quote"><span class="rq-name">' + escapeHtml(rName) + '</span><span class="rq-text">' + escapeHtml(rText) + '</span></div>';
    }
  }
  if (m.image_url) content += '<img class="tg-msg-image" src="' + escapeHtml(m.image_url) + '" onclick="openLightbox(\'' + escapeForOnclick(m.image_url) + '\')" loading="lazy">';
  else if (m.video_url) content += '<video class="tg-msg-video" src="' + escapeHtml(m.video_url) + '" controls></video>';
  const text = m.message_text ? escapeHtml(m.message_text) : '';
  const time = formatTimeMSK(m.created_at);
  const edited = m.edited ? ' <span style="font-size:0.65rem;opacity:0.6;">' + L('(изм.)', '(edited)') + '</span>' : '';
  const read = isMy ? '<span class="read">' + (m.is_read ? '✓✓' : '✓') + '</span>' : '';
  content += '<div class="tg-msg-content">' + text + '<span class="tg-msg-meta">' + edited + time + ' ' + read + '</span></div>';
  content += '<div class="tg-reactions" id="reactions-' + m.id + '"></div>';
  return '<div class="tg-msg-bubble">' + content + '</div>';
}

function showMessageMenu(e, msgId, msg) {
  closeMessageMenu();
  const menu = document.createElement('div');
  menu.className = 'tg-msg-menu';
  menu.id = 'tg-msg-menu';
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
  const isMy = msg.sender_id === currentUser.id;
  menu.innerHTML =
    '<div class="tg-emoji-row">' + emojis.map(em => '<span onclick="addMessageReaction(\'' + msgId + '\', \'' + em + '\'); closeMessageMenu();">' + em + '</span>').join('') + '</div>' +
    '<button onclick="replyToMessage(\'' + msgId + '\'); closeMessageMenu();">' + L('Ответить', 'Reply') + '</button>' +
    (isMy ? '<button onclick="editMessage(\'' + msgId + '\'); closeMessageMenu();">' + L('Редактировать', 'Edit') + '</button>' : '') +
    (msg.message_text ? '<button onclick="copyMessageText(\'' + msgId + '\'); closeMessageMenu();">' + L('Копировать', 'Copy') + '</button>' : '') +
    (isMy || isAdmin() ? '<button class="danger" onclick="deleteMessage(\'' + msgId + '\'); closeMessageMenu();">' + L('Удалить', 'Delete') + '</button>' : '');
  document.body.appendChild(menu);
  const x = Math.min(e.pageX || e.clientX, window.innerWidth - 200);
  const y = Math.min(e.pageY || e.clientY, window.innerHeight - 250);
  menu.style.left = x + 'px'; menu.style.top = y + 'px';
  openMenuEl = menu;
  setTimeout(() => document.addEventListener('click', closeMenuOnClick), 100);
}
function closeMenuOnClick(e) { if (openMenuEl && !openMenuEl.contains(e.target)) closeMessageMenu(); }
function closeMessageMenu() { if (openMenuEl) { openMenuEl.remove(); openMenuEl = null; document.removeEventListener('click', closeMenuOnClick); } }

function replyToMessage(msgId) {
  const msg = messagesCache[currentChatFriend]?.find(m => m.id === msgId);
  if (!msg) return;
  currentReplyMessage = msg;
  const preview = document.getElementById('tg-reply-preview');
  const name = msg.sender_id === currentUser.id ? L('Вы', 'You') : currentChatFriendName;
  const text = msg.message_text || (msg.image_url ? L('Изображение', 'Image') : L('Видео', 'Video'));
  preview.innerHTML = '<div style="flex:1;min-width:0;"><div style="color:var(--accent);font-weight:700;font-size:0.78rem;">' + L('Ответ ', 'Reply to ') + escapeHtml(name) + '</div><div class="rp-text">' + escapeHtml(text) + '</div></div><button class="rp-close" onclick="cancelReply()">✕</button>';
  preview.style.display = 'flex';
  document.getElementById('chat-input')?.focus();
}
function cancelReply() { currentReplyMessage = null; const p = document.getElementById('tg-reply-preview'); if (p) p.style.display = 'none'; }

async function editMessage(msgId) {
  const msg = messagesCache[currentChatFriend]?.find(m => m.id === msgId);
  if (!msg) return;
  const newText = prompt(L('Редактировать сообщение:', 'Edit message:'), msg.message_text || '');
  if (newText === null) return;
  if (newText.trim() === (msg.message_text || '').trim()) return;
  const { error } = await supabaseClient.from('private_messages').update({ message_text: newText.trim() || null, edited: true }).eq('id', msgId);
  if (!error) { msg.message_text = newText.trim(); msg.edited = true; updateMessageInDOM(msg); }
}

function updateMessageInDOM(msg) {
  const el = document.getElementById('msg-' + msg.id);
  if (!el) return;
  const isMy = msg.sender_id === currentUser.id;
  const b = el.querySelector('.tg-msg-bubble');
  if (b) b.innerHTML = renderMessageBubble(msg, isMy);
  loadMessageReactions(msg.id);
}

function copyMessageText(msgId) {
  const msg = messagesCache[currentChatFriend]?.find(m => m.id === msgId);
  if (!msg?.message_text) return;
  navigator.clipboard.writeText(msg.message_text).then(() => showNotification(L('Скопировано', 'Copied'), 'success'));
}

async function addMessageReaction(messageId, emoji) {
  if (!currentUser || !messageId) return;
  try {
    const { data: existing } = await supabaseClient.from('message_reactions').select('id').eq('message_id', messageId).eq('user_id', currentUser.id).eq('emoji', emoji).maybeSingle();
    if (existing) await supabaseClient.from('message_reactions').delete().eq('id', existing.id);
    else await supabaseClient.from('message_reactions').insert({ message_id: messageId, user_id: currentUser.id, emoji });
    loadMessageReactions(messageId);
  } catch (e) {}
}

async function loadAllMessageReactions(messages) {
  const ids = (messages || []).map(m => m?.id).filter(Boolean);
  if (!ids.length) return;
  try {
    const { data } = await supabaseClient.from('message_reactions').select('emoji, user_id, message_id').in('message_id', ids);
    const byMsg = {};
    ids.forEach(id => { byMsg[id] = []; });
    (data || []).forEach(r => { if (byMsg[r.message_id]) byMsg[r.message_id].push(r); });
    ids.forEach(id => renderReactionsForMessage(id, byMsg[id]));
  } catch (e) {}
}

function renderReactionsForMessage(messageId, reactions) {
  const container = document.getElementById('reactions-' + messageId);
  if (!container) return;
  if (!reactions || reactions.length === 0) { container.innerHTML = ''; return; }
  const counts = {};
  const mine = new Set();
  reactions.forEach(r => {
    counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    if (r.user_id === currentUser.id) mine.add(r.emoji);
  });
  container.innerHTML = Object.entries(counts).map(([emoji, count]) =>
    '<span class="tg-reaction' + (mine.has(emoji) ? ' mine' : '') + '" onclick="addMessageReaction(\'' + messageId + '\', \'' + emoji + '\')">' + emoji + ' ' + count + '</span>'
  ).join('');
}

async function loadMessageReactions(messageId) {
  if (!messageId) return;
  try {
    const { data } = await supabaseClient.from('message_reactions').select('emoji, user_id').eq('message_id', messageId);
    renderReactionsForMessage(messageId, data || []);
  } catch (e) {}
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || !currentChatFriend) return;
  const md = { sender_id: currentUser.id, receiver_id: currentChatFriend, message_text: text, is_read: false, is_deleted: false };
  if (currentReplyMessage) md.reply_to = currentReplyMessage.id;
  const { data, error } = await supabaseClient.from('private_messages').insert([md]).select().single();
  if (error) { showNotification(L('Ошибка отправки', 'Send failed'), 'error'); return; }
  input.value = '';
  cancelReply();
  if (data) {
    if (!messagesCache[currentChatFriend]) messagesCache[currentChatFriend] = [];
    messagesCache[currentChatFriend].push(data);
    renderMessages(messagesCache[currentChatFriend]);
    forceScrollToBottom();
  }
}

async function deleteMessage(id) {
  const { error } = await supabaseClient.from('private_messages').delete().eq('id', id);
  if (error) await supabaseClient.from('private_messages').update({ is_deleted: true }).eq('id', id);
  document.getElementById('msg-' + id)?.remove();
  if (currentChatFriend && messagesCache[currentChatFriend]) messagesCache[currentChatFriend] = messagesCache[currentChatFriend].filter(m => m.id !== id);
}

function forceScrollToBottom() {
  const c = document.getElementById('chat-container');
  if (!c) return;
  const doScroll = () => { c.scrollTop = c.scrollHeight; };
  doScroll();
  requestAnimationFrame(() => { doScroll(); requestAnimationFrame(doScroll); });
  c.querySelectorAll('img').forEach(img => { if (!img.complete) img.addEventListener('load', doScroll, { once: true }); });
  [50, 150, 300, 500, 800, 1200].forEach(delay => setTimeout(doScroll, delay));
}

document.addEventListener('scroll', (e) => {
  const c = document.getElementById('chat-container');
  if (!c || e.target !== c) return;
  const btn = document.getElementById('tg-scroll-bottom');
  if (!btn) return;
  const atBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 100;
  btn.style.display = atBottom ? 'none' : 'flex';
}, true);

function subscribeToMessages() {
  if (!currentUser?.id) return;
  if (chatChannel) { supabaseClient.removeChannel(chatChannel); chatChannel = null; }
  const uid = currentUser.id;
  chatChannel = supabaseClient.channel('messages-' + uid + '-' + Date.now())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages', filter: 'receiver_id=eq.' + uid }, (payload) => {
      const msg = payload.new;
      if (msg.sender_id === currentChatFriend && isChatOpen) {
        if (!messagesCache[currentChatFriend]) messagesCache[currentChatFriend] = [];
        messagesCache[currentChatFriend].push(msg);
        renderMessages(messagesCache[currentChatFriend]);
        forceScrollToBottom();
        if (document.visibilityState === 'visible') supabaseClient.from('private_messages').update({ is_read: true }).eq('id', msg.id).then(() => {});
      }
      if (!isChatOpen) loadChatFriends();
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_messages', filter: 'receiver_id=eq.' + uid }, (payload) => handleMessageUpdate(payload.new))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_messages', filter: 'sender_id=eq.' + uid }, (payload) => handleMessageUpdate(payload.new))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'private_messages', filter: 'receiver_id=eq.' + uid }, (payload) => handleMessageDelete(payload.old?.id))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'private_messages', filter: 'sender_id=eq.' + uid }, (payload) => handleMessageDelete(payload.old?.id))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, (payload) => {
      const msgId = payload.new?.message_id || payload.old?.message_id;
      if (msgId) loadMessageReactions(msgId);
    })
    .subscribe();
}

function handleMessageUpdate(msg) {
  if (!msg?.id) return;
  if (currentChatFriend && messagesCache[currentChatFriend]) {
    const idx = messagesCache[currentChatFriend].findIndex(m => m.id === msg.id);
    if (idx !== -1) { messagesCache[currentChatFriend][idx] = msg; updateMessageInDOM(msg); }
  }
}

function handleMessageDelete(id) {
  if (!id) return;
  document.getElementById('msg-' + id)?.remove();
  if (currentChatFriend && messagesCache[currentChatFriend]) {
    messagesCache[currentChatFriend] = messagesCache[currentChatFriend].filter(m => m.id !== id);
  }
}

async function checkUnreadMessages() {}

function handleChatKeydown(event) { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } }
function handleFileSelect(event) { const f = event.target.files[0]; if (f) { sendImage(f); event.target.value = ''; } }
function handleVideoSelect(event) { const f = event.target.files[0]; if (f) { sendVideo(f); event.target.value = ''; } }
function handlePaste(event) {
  const items = event.clipboardData?.items;
  if (items) for (const item of items) if (item.type.startsWith('image/')) { const f = item.getAsFile(); if (f) { event.preventDefault(); sendImage(f); } }
}

async function sendImage(file) {
  if (!file || !currentChatFriend || file.size > 4 * 1024 * 1024) return;
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const name = Date.now() + '-' + Math.random().toString(36).substring(7) + '.' + ext;
  try {
    await supabaseClient.storage.from('chat-images').upload(name, file);
    const { data: urlData } = supabaseClient.storage.from('chat-images').getPublicUrl(name);
    const md = { sender_id: currentUser.id, receiver_id: currentChatFriend, message_text: '', image_url: urlData?.publicUrl, is_read: false, is_deleted: false };
    if (currentReplyMessage) md.reply_to = currentReplyMessage.id;
    const { data: msg } = await supabaseClient.from('private_messages').insert([md]).select().single();
    cancelReply();
    if (msg) { if (!messagesCache[currentChatFriend]) messagesCache[currentChatFriend] = []; messagesCache[currentChatFriend].push(msg); renderMessages(messagesCache[currentChatFriend]); forceScrollToBottom(); }
  } catch (e) {}
}

async function sendVideo(file) {
  if (!file || !currentChatFriend || file.size > 4 * 1024 * 1024) return;
  const ext = file.name.split('.').pop() || 'mp4';
  const name = Date.now() + '-' + Math.random().toString(36).substring(7) + '.' + ext;
  try {
    await supabaseClient.storage.from('chat-images').upload(name, file);
    const { data: urlData } = supabaseClient.storage.from('chat-images').getPublicUrl(name);
    const md = { sender_id: currentUser.id, receiver_id: currentChatFriend, message_text: '', video_url: urlData?.publicUrl, is_read: false, is_deleted: false };
    if (currentReplyMessage) md.reply_to = currentReplyMessage.id;
    const { data: msg } = await supabaseClient.from('private_messages').insert([md]).select().single();
    cancelReply();
    if (msg) { if (!messagesCache[currentChatFriend]) messagesCache[currentChatFriend] = []; messagesCache[currentChatFriend].push(msg); renderMessages(messagesCache[currentChatFriend]); forceScrollToBottom(); }
  } catch (e) {}
}

// ============ EMOJI ============
const EMOJI_LIST = ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐','🖖','👋','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🦷','🦴','👀','👁','👅','👄','💋','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'];

function toggleEmojiPicker(event) {
  event.stopPropagation();
  const picker = document.getElementById('tg-emoji-picker');
  if (!picker) return;
  if (picker.style.display === 'none' || !picker.style.display) {
    picker.innerHTML = EMOJI_LIST.map(e => '<span onclick="insertEmoji(\'' + e + '\')">' + e + '</span>').join('');
    picker.style.display = 'grid';
  } else picker.style.display = 'none';
}

function insertEmoji(emoji) {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const start = input.selectionStart, end = input.selectionEnd, text = input.value;
  input.value = text.slice(0, start) + emoji + text.slice(end);
  input.focus();
  input.selectionStart = input.selectionEnd = start + emoji.length;
}

document.addEventListener('click', (e) => {
  const picker = document.getElementById('tg-emoji-picker');
  if (picker && !e.target.closest('.tg-icon-btn') && !picker.contains(e.target)) picker.style.display = 'none';
});

// ============ ПРОФИЛЬ ============
async function loadProfile() {
  const c = document.getElementById('profile-info');
  if (!c) return;
  c.innerHTML = '<p style="color:var(--muted);">' + L('Загрузка...', 'Loading...') + '</p>';
  try {
    const { data: reviews } = await supabaseClient.from('reviews').select('*, movies(name, kinopoisk_id)').eq('user_id', currentUser.id);
    const { data: friends } = await supabaseClient.from('friendships').select('*').eq('user_id', currentUser.id);
    const { data: watchlist } = await supabaseClient.from('watchlist').select('id').eq('user_id', currentUser.id);
    const { data: watched } = await supabaseClient.from('watched').select('id').eq('user_id', currentUser.id);
    const avatar = currentUserProfile?.avatar_url || '';
    const username = currentUserProfile?.username || currentUser.email || L('Пользователь', 'User');
    const totalReviews = reviews?.length || 0;
    const avgRating = totalReviews > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1) : '—';
    const recCount = reviews?.filter(r => r.recommend).length || 0;
    const recPercent = totalReviews > 0 ? Math.round((recCount / totalReviews) * 100) : 0;

    const genreCounts = {};
    const kidList = [...new Set((reviews || []).map(r => r.movies?.kinopoisk_id).filter(Boolean))];
    const moviesData = await Promise.all(kidList.map(kid => getMovie(kid)));
    moviesData.forEach(md => (md?.genres || []).forEach(g => { genreCounts[g.genre] = (genreCounts[g.genre] || 0) + 1; }));
    const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const dist = {};
    for (let i = 1; i <= 10; i++) dist[i] = 0;
    reviews?.forEach(r => { dist[r.rating] = (dist[r.rating] || 0) + 1; });
    const maxCount = Math.max(...Object.values(dist), 1);

    const distHTML = '<div class="rating-distribution"><h3>' + L('Распределение оценок', 'Rating distribution') + '</h3><div class="rating-bars">' +
      Object.entries(dist).map(([rating, count]) => {
        const h = (count / maxCount) * 100;
        return '<div class="rating-bar"><div class="bar-count">' + (count || '') + '</div><div class="bar" style="height:' + (count > 0 ? Math.max(h, 5) : 2) + '%"></div><div class="bar-label">' + rating + '</div></div>';
      }).join('') + '</div></div>';

    const topGenresHTML = topGenres.length
      ? '<div class="rating-distribution"><h3>' + L('Любимые жанры', 'Favorite genres') + '</h3><div class="genre-badges">' +
        topGenres.map(([n, c]) => '<span class="genre-badge">' + escapeHtml(n) + '<span class="count">× ' + c + '</span></span>').join('') +
        '</div></div>'
      : '';

    const themeSelHTML = isAdmin()
      ? '<div style="background:var(--surface-2);padding:20px;border-radius:12px;margin-top:15px;">' +
        '<h3 style="margin-bottom:8px;">' + L('Тема сайта', 'Site theme') + '</h3>' +
        '<p style="color:var(--muted);font-size:0.85rem;margin:0 0 14px;">' + L('Выбранная тема применится у всех пользователей мгновенно', 'The selected theme will apply to all users instantly') + '</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button onclick="changeGlobalTheme(\'default\')" class="theme-pick-btn' + (currentGlobalTheme === 'default' ? ' active' : '') + '">' + L('Обычная', 'Default') + '</button>' +
          '<button onclick="changeGlobalTheme(\'halloween\')" class="theme-pick-btn' + (currentGlobalTheme === 'halloween' ? ' active' : '') + '">' + L('Хэллоуин', 'Halloween') + '</button>' +
          '<button onclick="changeGlobalTheme(\'newyear\')" class="theme-pick-btn' + (currentGlobalTheme === 'newyear' ? ' active' : '') + '">' + L('Новогодняя', 'New Year') + '</button>' +
        '</div></div>'
      : '';

    c.innerHTML =
      '<div style="background:var(--surface);padding:30px;border-radius:16px;text-align:center;">' +
        '<div style="width:100px;height:100px;background:linear-gradient(135deg,var(--accent),#7c3aed);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:3rem;overflow:hidden;cursor:pointer;" onclick="document.getElementById(\'avatar-upload\').click()">' +
        (avatar ? '<img src="' + escapeHtml(avatar) + '" style="width:100%;height:100%;object-fit:cover;" loading="lazy">' : '👤') +
        '</div>' +
        '<input type="file" id="avatar-upload" accept="image/*" style="display:none;" onchange="uploadAvatar(event)">' +
        '<h2 style="margin-top:14px;">' + escapeHtml(username) + '</h2>' +
        '<div class="profile-stats">' +
          '<div class="stat-card accent"><div class="stat-value">' + totalReviews + '</div><div class="stat-label">' + L('Оценок', 'Ratings') + '</div></div>' +
          '<div class="stat-card"><div class="stat-value">' + avgRating + '</div><div class="stat-label">' + L('Средняя', 'Average') + '</div></div>' +
          '<div class="stat-card green"><div class="stat-value">' + recPercent + '%</div><div class="stat-label">' + L('Советует', 'Recommends') + '</div></div>' +
          '<div class="stat-card blue"><div class="stat-value">' + (friends?.length || 0) + '</div><div class="stat-label">' + L('Друзей', 'Friends') + '</div></div>' +
          '<div class="stat-card"><div class="stat-value">' + (watchlist?.length || 0) + '</div><div class="stat-label">' + L('Хочу', 'Watchlist') + '</div></div>' +
          '<div class="stat-card"><div class="stat-value">' + (watched?.length || 0) + '</div><div class="stat-label">' + L('Смотрел', 'Watched') + '</div></div>' +
        '</div>' +
        distHTML + topGenresHTML +
        '<div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:15px;">' +
          '<div style="background:var(--surface-2);padding:20px;border-radius:12px;">' +
            '<h3 style="margin-bottom:14px;">' + L('Сменить ник', 'Change nickname') + '</h3>' +
            '<input type="text" id="new-username" value="' + escapeHtml(username) + '" autocomplete="off" style="width:100%;margin-bottom:10px;">' +
            '<button class="btn btn-primary btn-full" onclick="changeUsername()">' + L('Сохранить', 'Save') + '</button>' +
          '</div>' +
          '<div style="background:var(--surface-2);padding:20px;border-radius:12px;">' +
            '<h3 style="margin-bottom:14px;">' + L('Сменить пароль', 'Change password') + '</h3>' +
            '<input type="password" id="old-password" placeholder="' + L('Текущий пароль', 'Current password') + '" autocomplete="off" style="width:100%;margin-bottom:10px;">' +
            '<input type="password" id="new-password" placeholder="' + L('Новый пароль', 'New password') + '" autocomplete="off" style="width:100%;margin-bottom:10px;">' +
            '<button class="btn btn-danger btn-full" onclick="changePassword()">' + L('Сменить', 'Change') + '</button>' +
          '</div>' +
        '</div>' + themeSelHTML +
      '</div>';
  } catch (e) { c.innerHTML = '<p>' + L('Ошибка загрузки профиля', 'Failed to load profile') + '</p>'; }
}

// ============ ПРОФИЛЬ ДРУГА ============
async function viewUserProfile(userId) {
  const body = document.getElementById('user-profile-body');
  body.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px;">' + L('Загрузка...', 'Loading...') + '</p>';
  openModal('user-profile-modal');
  const [{ data: profile }, { data: allReviews }, { data: friends }, { data: watchlist }, { data: watchedList }] = await Promise.all([
    supabaseClient.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabaseClient.from('reviews').select('*, movies(name, kinopoisk_id)').eq('user_id', userId),
    supabaseClient.from('friendships').select('*').eq('user_id', userId),
    supabaseClient.from('watchlist').select('*, movies(id, name, kinopoisk_id, cover_url)').eq('user_id', userId).order('added_at', { ascending: false }),
    supabaseClient.from('watched').select('*').eq('user_id', userId).order('watched_at', { ascending: false })
  ]);
  if (!profile) { body.innerHTML = '<p>' + L('Профиль не найден', 'Profile not found') + '</p>'; return; }
  const friendIds = await getMyFriendIds();
  const reviews = (allReviews || []).filter(r => canSeeReview(r, friendIds));
  const vWl = watchlist || [];
  const vW = watchedList || [];
  const avatar = profile.avatar_url || '';
  const username = profile.username || L('Пользователь', 'User');
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1) : '—';
  const recCount = reviews.filter(r => r.recommend).length;
  const recPercent = totalReviews > 0 ? Math.round((recCount / totalReviews) * 100) : 0;
  const dist = {};
  for (let i = 1; i <= 10; i++) dist[i] = 0;
  reviews.forEach(r => { dist[r.rating] = (dist[r.rating] || 0) + 1; });
  const maxCount = Math.max(...Object.values(dist), 1);
  const distHTML = totalReviews > 0
    ? '<div class="rating-distribution"><h3>' + L('Распределение оценок', 'Rating distribution') + '</h3><div class="rating-bars">' +
      Object.entries(dist).map(([rating, count]) => {
        const h = (count / maxCount) * 100;
        return '<div class="rating-bar"><div class="bar-count">' + (count || '') + '</div><div class="bar" style="height:' + (count > 0 ? Math.max(h, 5) : 2) + '%"></div><div class="bar-label">' + rating + '</div></div>';
      }).join('') + '</div></div>'
    : '';
  const wlHTML = vWl.length
    ? '<div style="margin-top:20px;text-align:left;"><h3 style="margin-bottom:14px;">' + L('Хочу посмотреть', 'Watchlist') + ' (' + vWl.length + ')</h3><div class="movies-grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;">' +
      vWl.map(w => {
        const t = w.movies?.name || L('Фильм', 'Movie');
        const kid = w.kinopoisk_id || w.movies?.kinopoisk_id;
        const poster = w.movies?.cover_url || '';
        const pHtml = poster ? '<img src="' + escapeHtml(poster) + '" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.querySelector(\'.no-poster\').style.display=\'flex\';"><div class="no-poster" style="display:none;">🎬</div>' : '<div class="no-poster">🎬</div>';
        return '<div class="movie-card" style="cursor:pointer;" onclick="closeUserProfileModal(); openFilmPage(\'' + kid + '\')"><div class="poster-wrap">' + pHtml + '</div><div class="movie-info"><h3>' + escapeHtml(t) + '</h3></div></div>';
      }).join('') + '</div></div>'
    : '';
  const wHTML = vW.length
    ? '<div style="margin-top:20px;text-align:left;"><h3 style="margin-bottom:14px;">' + L('Просмотрено', 'Watched') + ' (' + vW.length + ')</h3><div class="movies-grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;">' +
      vW.map(w => {
        const t = w.movie_name || L('Фильм', 'Movie');
        const kid = w.kinopoisk_id;
        const poster = w.poster_url || '';
        const pHtml = poster ? '<img src="' + escapeHtml(poster) + '" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.querySelector(\'.no-poster\').style.display=\'flex\';"><div class="no-poster" style="display:none;">🎬</div>' : '<div class="no-poster">🎬</div>';
        return '<div class="movie-card" style="cursor:pointer;" onclick="closeUserProfileModal(); openFilmPage(\'' + kid + '\')"><div class="poster-wrap">' + pHtml + '</div><div class="movie-info"><h3>' + escapeHtml(t) + '</h3></div></div>';
      }).join('') + '</div></div>'
    : '';
  const recentHTML = reviews.length
    ? '<div style="margin-top:20px;text-align:left;"><h3 style="margin-bottom:14px;">' + L('Последние оценки', 'Latest ratings') + ' (' + totalReviews + ')</h3>' +
      [...reviews].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10)
        .map(r => '<div style="background:var(--surface-2);padding:10px 14px;border-radius:10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(r.movies?.name || L('Фильм', 'Movie')) + '</span><span style="color:var(--gold);font-weight:700;margin-left:10px;">' + r.rating + '/10</span></div>').join('') +
      '</div>'
    : '';
  body.innerHTML =
    '<div style="text-align:center;">' +
      '<div style="width:100px;height:100px;background:linear-gradient(135deg,var(--accent),#7c3aed);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:3rem;overflow:hidden;">' +
      (avatar ? '<img src="' + escapeHtml(avatar) + '" style="width:100%;height:100%;object-fit:cover;" loading="lazy">' : '👤') +
      '</div>' +
      '<h2 style="margin-top:12px;">' + escapeHtml(username) + '</h2>' +
      '<div class="profile-stats">' +
        '<div class="stat-card accent"><div class="stat-value">' + totalReviews + '</div><div class="stat-label">' + L('Оценок', 'Ratings') + '</div></div>' +
        '<div class="stat-card"><div class="stat-value">' + avgRating + '</div><div class="stat-label">' + L('Средняя', 'Average') + '</div></div>' +
        '<div class="stat-card green"><div class="stat-value">' + recPercent + '%</div><div class="stat-label">' + L('Советует', 'Recommends') + '</div></div>' +
        '<div class="stat-card blue"><div class="stat-value">' + (friends?.length || 0) + '</div><div class="stat-label">' + L('Друзей', 'Friends') + '</div></div>' +
        '<div class="stat-card"><div class="stat-value">' + vWl.length + '</div><div class="stat-label">' + L('Хочу', 'Watchlist') + '</div></div>' +
        '<div class="stat-card"><div class="stat-value">' + vW.length + '</div><div class="stat-label">' + L('Смотрел', 'Watched') + '</div></div>' +
      '</div>' +
      distHTML + recentHTML + wlHTML + wHTML +
    '</div>';
}

// ============ МЕНЮ ПРОФИЛЯ ============
function toggleProfileMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('profile-menu');
  if (menu) menu.style.display = (menu.style.display === 'none' || menu.style.display === '') ? 'block' : 'none';
}
document.addEventListener('click', function (e) {
  const menu = document.getElementById('profile-menu');
  const btn = document.querySelector('.logout-button');
  if (menu && btn) {
    if (!menu.contains(e.target) && !btn.contains(e.target)) menu.style.display = 'none';
  }
});

async function uploadAvatar(event) {
  const file = event.target.files[0];
  if (!file || file.size > 4 * 1024 * 1024) return;
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const name = currentUser.id + '-' + Date.now() + '.' + ext;
  try {
    await supabaseClient.storage.from('avatars').upload(name, file, { upsert: true });
    const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(name);
    await supabaseClient.from('profiles').update({ avatar_url: urlData?.publicUrl }).eq('id', currentUser.id);
    currentUserProfile.avatar_url = urlData?.publicUrl;
    loadProfile();
  } catch (e) {}
}

async function changeUsername() {
  const n = document.getElementById('new-username').value.trim();
  if (!n) return;
  await supabaseClient.from('profiles').update({ username: n }).eq('id', currentUser.id);
  currentUserProfile.username = n;
  document.getElementById('user-name-display').textContent = n;
  loadProfile();
}

async function changePassword() {
  const oldPass = document.getElementById('old-password').value;
  const newPass = document.getElementById('new-password').value;
  if (!oldPass || !newPass) { showNotification(L('Заполните оба поля', 'Fill in both fields'), 'error'); return; }
  if (newPass.length < 6) { showNotification(L('Пароль минимум 6 символов', 'Password must be at least 6 characters'), 'error'); return; }
  const { error } = await supabaseClient.auth.signInWithPassword({ email: currentUser.email, password: oldPass });
  if (error) { showNotification(L('Неверный пароль', 'Wrong password'), 'error'); return; }
  const { error: upErr } = await supabaseClient.auth.updateUser({ password: newPass });
  if (upErr) { showNotification(L('Ошибка: ', 'Error: ') + upErr.message, 'error'); return; }
  showNotification(L('Пароль изменён', 'Password changed'), 'success');
}

// ============ ТЕМА ============
async function loadGlobalTheme() {
  try {
    const { data } = await supabaseClient.from('app_settings').select('value').eq('key', 'active_theme').maybeSingle();
    applyGlobalTheme(data?.value || 'default');
  } catch (e) {}
}

function applyGlobalTheme(theme) {
  if (currentGlobalTheme === theme) return;
  currentGlobalTheme = theme;
  document.body.classList.remove('halloween', 'newyear');
  if (theme === 'halloween') document.body.classList.add('halloween');
  else if (theme === 'newyear') document.body.classList.add('newyear');
  refreshStarredUI();
}

function refreshStarredUI() {
  if (!currentUser) return;
  if (currentSection === 'home') { recentReviewsCache = null; loadRecentReviews(true); }
  else if (currentSection === 'rated') applyRatedSort();
  else if (currentSection === 'movies') { loadHeroBanner(); loadCatalogRows(); }
  else if (currentSection === 'watchlist') loadWatchlist();
  else if (currentSection === 'watched') loadWatchedList();
  else if (currentSection === 'wheel') loadWheelHistory();
}

function subscribeToTheme() {
  if (themeChannel) { supabaseClient.removeChannel(themeChannel); themeChannel = null; }
  themeChannel = supabaseClient.channel('app-theme-' + Date.now())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: 'key=eq.active_theme' }, (payload) => {
      applyGlobalTheme(payload.new.value);
    })
    .subscribe();
}

async function changeGlobalTheme(theme) {
  if (!isAdmin()) { showNotification(L('Только админ может менять тему', 'Only admin can change the theme'), 'error'); return; }
  const { error } = await supabaseClient.from('app_settings').update({ value: theme, updated_at: new Date().toISOString() }).eq('key', 'active_theme');
  if (error) { showNotification(L('Ошибка: ', 'Error: ') + error.message, 'error'); return; }
  applyGlobalTheme(theme);
  const labels = isEnMode()
    ? { default: 'Default', halloween: 'Halloween', newyear: 'New Year' }
    : { default: 'Обычная', halloween: 'Хэллоуин', newyear: 'Новогодняя' };
  showNotification(L('Тема для всех: ', 'Theme for everyone: ') + labels[theme], 'success');
  if (currentSection === 'profile') loadProfile();
}

// ============ АДМИН-ПАНЕЛЬ ============
async function loadAdminPanel() {
  if (!isAdmin()) {
    const c = document.getElementById('admin-content');
    if (c) c.innerHTML = '<div class="admin-empty">' + L('Доступ запрещён. Только для админов.', 'Access denied. Admins only.') + '</div>';
    return;
  }
  switchAdminTab(currentAdminTab);
}

function switchAdminTab(tab, btn) {
  if (!isAdmin()) return;
  currentAdminTab = tab;

  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
  } else {
    const found = [...document.querySelectorAll('.admin-tab')].find(b => {
      const oc = b.getAttribute('onclick') || '';
      return oc.includes("'" + tab + "'");
    });
    if (found) found.classList.add('active');
  }

  const c = document.getElementById('admin-content');
  if (!c) return;
  c.innerHTML = '<div class="admin-loading">' + L('Загрузка…', 'Loading…') + '</div>';

  if (tab === 'stats') loadAdminStats();
  else if (tab === 'users') loadAdminUsers();
  else if (tab === 'reviews') loadAdminReviews();
  else if (tab === 'comments') loadAdminComments();
  else if (tab === 'movies') loadAdminMovies();
  else if (tab === 'logs') loadAdminLogs();
}

async function logAdminAction(action, targetType, targetId, details) {
  try {
    await supabaseClient.from('admin_logs').insert({
      admin_id: currentUser.id,
      action,
      target_type: targetType,
      target_id: targetId ? String(targetId) : null,
      details: details || null
    });
  } catch (e) {}
}

async function loadAdminStats() {
  const c = document.getElementById('admin-content');
  try {
    const [
      { count: usersCount },
      { count: reviewsCount },
      { count: commentsCount },
      { count: watchedCount },
      { count: messagesCount },
      { count: moviesCount },
      { count: bannedCount }
    ] = await Promise.all([
      supabaseClient.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseClient.from('reviews').select('*', { count: 'exact', head: true }),
      supabaseClient.from('review_comments').select('*', { count: 'exact', head: true }),
      supabaseClient.from('watched').select('*', { count: 'exact', head: true }),
      supabaseClient.from('private_messages').select('*', { count: 'exact', head: true }),
      supabaseClient.from('movies').select('*', { count: 'exact', head: true }),
      supabaseClient.from('profiles').select('*', { count: 'exact', head: true }).eq('banned', true)
    ]);

    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const { count: newUsersDay } = await supabaseClient.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', yesterday);

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: newReviewsWeek } = await supabaseClient.from('reviews').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo);

    c.innerHTML =
      '<div class="admin-stats-grid">' +
        '<div class="admin-stat-card"><div class="admin-stat-value">' + (usersCount || 0) + '</div><div class="admin-stat-label">' + L('Всего пользователей', 'Total users') + '</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-value" style="color:var(--green);">' + (newUsersDay || 0) + '</div><div class="admin-stat-label">' + L('Новых за сутки', 'New today') + '</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-value" style="color:var(--danger);">' + (bannedCount || 0) + '</div><div class="admin-stat-label">' + L('Забанено', 'Banned') + '</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-value">' + (reviewsCount || 0) + '</div><div class="admin-stat-label">' + L('Рецензий', 'Reviews') + '</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-value" style="color:var(--green);">' + (newReviewsWeek || 0) + '</div><div class="admin-stat-label">' + L('Рецензий за неделю', 'Reviews this week') + '</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-value">' + (commentsCount || 0) + '</div><div class="admin-stat-label">' + L('Комментариев', 'Comments') + '</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-value">' + (moviesCount || 0) + '</div><div class="admin-stat-label">' + L('Фильмов в базе', 'Movies in DB') + '</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-value">' + (watchedCount || 0) + '</div><div class="admin-stat-label">' + L('Отметок просмотра', 'Watched marks') + '</div></div>' +
        '<div class="admin-stat-card"><div class="admin-stat-value">' + (messagesCount || 0) + '</div><div class="admin-stat-label">' + L('Сообщений в чате', 'Chat messages') + '</div></div>' +
      '</div>' +
      '<p style="color:var(--muted);font-size:0.82rem;text-align:center;">' + L('Обновлено: ', 'Updated: ') + new Date().toLocaleString(isEnMode() ? 'en-US' : 'ru-RU') + '</p>';
  } catch (e) {
    c.innerHTML = '<div class="admin-empty">' + L('Ошибка загрузки статистики', 'Failed to load stats') + '</div>';
    console.error(e);
  }
}

async function loadAdminUsers() {
  const c = document.getElementById('admin-content');
  c.innerHTML =
    '<input type="text" id="admin-user-search" class="admin-search" placeholder="' + L('Поиск по нику или email...', 'Search by nickname or email...') + '" oninput="filterAdminUsers(this.value)" />' +
    '<div id="admin-users-list"></div>';

  try {
    const { data: users } = await supabaseClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (!users?.length) {
      document.getElementById('admin-users-list').innerHTML = '<div class="admin-empty">' + L('Нет пользователей', 'No users') + '</div>';
      return;
    }

    window._adminUsers = users;
    renderAdminUsers(users);
  } catch (e) {
    document.getElementById('admin-users-list').innerHTML = '<div class="admin-empty">' + L('Ошибка загрузки', 'Load error') + '</div>';
  }
}

function filterAdminUsers(q) {
  if (!window._adminUsers) return;
  const query = (q || '').toLowerCase().trim();
  const filtered = !query ? window._adminUsers : window._adminUsers.filter(u =>
    (u.username || '').toLowerCase().includes(query) ||
    (u.email || '').toLowerCase().includes(query) ||
    (u.id || '').toLowerCase().includes(query)
  );
  renderAdminUsers(filtered);
}

function renderAdminUsers(users) {
  const c = document.getElementById('admin-users-list');
  if (!c) return;

  if (!users.length) {
    c.innerHTML = '<div class="admin-empty">' + L('Ничего не найдено', 'Nothing found') + '</div>';
    return;
  }

  const isMe = (id) => id === currentUser.id;
  const en = isEnMode();

  c.innerHTML = '<div class="admin-table">' + users.map(u => {
    const isBanned = u.banned === true;
    const role = u.role || 'user';
    const created = u.created_at ? new Date(u.created_at).toLocaleDateString(en ? 'en-US' : 'ru-RU') : '';
    const bannedTag = isBanned ? '<span style="color:#ff9ca1;font-weight:700;"> · ' + L('ЗАБАНЕН', 'BANNED') + '</span>' : '';
    const adminTag = role === 'admin' ? '<span style="color:var(--accent);font-weight:700;"> · ADMIN</span>' : '';

    return '<div class="admin-row">' +
      '<div class="admin-row-info">' +
        '<div class="admin-row-title">' + escapeHtml(u.username || L('Без ника', 'No nickname')) + adminTag + bannedTag + '</div>' +
        '<div class="admin-row-sub">' + escapeHtml(u.email || '') + ' · ' + created + '</div>' +
      '</div>' +
      '<div class="admin-row-actions">' +
        (!isMe(u.id) ?
          (isBanned
            ? '<button class="admin-btn success" onclick="adminToggleBan(\'' + u.id + '\', false)">' + L('Разбанить', 'Unban') + '</button>'
            : '<button class="admin-btn warn" onclick="adminToggleBan(\'' + u.id + '\', true)">' + L('Забанить', 'Ban') + '</button>'
          ) : '') +
        (!isMe(u.id) ?
          (role === 'admin'
            ? '<button class="admin-btn" onclick="adminChangeRole(\'' + u.id + '\', \'user\')">' + L('Снять админа', 'Revoke admin') + '</button>'
            : '<button class="admin-btn success" onclick="adminChangeRole(\'' + u.id + '\', \'admin\')">' + L('Сделать админом', 'Make admin') + '</button>'
          ) : '') +
        (!isMe(u.id) ?
          '<button class="admin-btn danger" onclick="adminDeleteUser(\'' + u.id + '\', \'' + escapeForOnclick(u.username || '') + '\')">' + L('Удалить', 'Delete') + '</button>'
          : '<span style="font-size:0.75rem;color:var(--muted);">' + L('Это вы', 'This is you') + '</span>') +
      '</div>' +
    '</div>';
  }).join('') + '</div>';
}

async function adminToggleBan(userId, ban) {
  let reason = null;
  if (ban) {
    reason = prompt(L('Причина бана (необязательно):', 'Ban reason (optional):'), '') || null;
  }
  try {
    const update = ban
      ? { banned: true, banned_at: new Date().toISOString(), banned_reason: reason }
      : { banned: false, banned_at: null, banned_reason: null };
    const { error } = await supabaseClient.from('profiles').update(update).eq('id', userId);
    if (error) { showNotification(L('Ошибка: ', 'Error: ') + error.message, 'error'); return; }
    await logAdminAction(ban ? 'ban_user' : 'unban_user', 'user', userId, reason);
    showNotification(ban ? L('Пользователь забанен', 'User banned') : L('Пользователь разбанен', 'User unbanned'), 'success');
    loadAdminUsers();
  } catch (e) { showNotification(L('Ошибка: ', 'Error: ') + e.message, 'error'); }
}

async function adminChangeRole(userId, role) {
  try {
    const { error } = await supabaseClient.from('profiles').update({ role }).eq('id', userId);
    if (error) { showNotification(L('Ошибка: ', 'Error: ') + error.message, 'error'); return; }
    await logAdminAction('change_role', 'user', userId, 'role=' + role);
    showNotification(L('Роль изменена на «', 'Role changed to "') + role + L('»', '"'), 'success');
    loadAdminUsers();
  } catch (e) { showNotification(L('Ошибка: ', 'Error: ') + e.message, 'error'); }
}

async function adminDeleteUser(userId, username) {
  showConfirmModal(L('Удалить пользователя «' + username + '»? Все его данные будут удалены.', 'Delete user "' + username + '"? All their data will be deleted.'), async () => {
    try {
      const { error } = await supabaseClient.from('profiles').delete().eq('id', userId);
      if (error) { showNotification(L('Ошибка: ', 'Error: ') + error.message, 'error'); return; }
      await logAdminAction('delete_user', 'user', userId, 'username=' + username);
      showNotification(L('Пользователь удалён', 'User deleted'), 'success');
      loadAdminUsers();
    } catch (e) { showNotification(L('Ошибка: ', 'Error: ') + e.message, 'error'); }
  });
}

async function loadAdminReviews() {
  const c = document.getElementById('admin-content');
  c.innerHTML = '<div class="admin-loading">' + L('Загрузка рецензий…', 'Loading reviews…') + '</div>';

  try {
    const { data: reviews } = await supabaseClient
      .from('reviews')
      .select('*, profiles(username), movies(name)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!reviews?.length) {
      c.innerHTML = '<div class="admin-empty">' + L('Нет рецензий', 'No reviews') + '</div>';
      return;
    }

    const en = isEnMode();

    c.innerHTML = '<div class="admin-table">' + reviews.map(r => {
      const username = r.profiles?.username || L('Пользователь', 'User');
      const movieName = r.movies?.name || L('Фильм', 'Movie');
      const vis = r.visibility === 'friends' ? '🔒' : '🌐';
      const text = r.review_text ? escapeHtml(r.review_text.slice(0, 120)) + (r.review_text.length > 120 ? '…' : '') : '<i style="color:var(--muted);">' + L('без текста', 'no text') + '</i>';
      const date = r.created_at ? new Date(r.created_at).toLocaleDateString(en ? 'en-US' : 'ru-RU') : '';

      return '<div class="admin-row">' +
        '<div class="admin-row-info">' +
          '<div class="admin-row-title">' + escapeHtml(movieName) + ' <span style="color:var(--gold);">' + r.rating + '/10</span></div>' +
          '<div class="admin-row-sub">' + escapeHtml(username) + ' · ' + vis + ' · ' + date + '</div>' +
          '<div class="admin-row-sub" style="margin-top:6px;">' + text + '</div>' +
        '</div>' +
        '<div class="admin-row-actions">' +
          '<button class="admin-btn" onclick="adminToggleReviewVisibility(\'' + r.id + '\', \'' + (r.visibility || 'public') + '\')">' + vis + '</button>' +
          '<button class="admin-btn danger" onclick="adminDeleteReview(\'' + r.id + '\')">' + L('Удалить', 'Delete') + '</button>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
  } catch (e) {
    c.innerHTML = '<div class="admin-empty">' + L('Ошибка загрузки', 'Load error') + '</div>';
  }
}

async function adminToggleReviewVisibility(reviewId, currentVis) {
  const newVis = currentVis === 'friends' ? 'public' : 'friends';
  try {
    await supabaseClient.from('reviews').update({ visibility: newVis }).eq('id', reviewId);
    await logAdminAction('change_visibility', 'review', reviewId, newVis);
    showNotification(newVis === 'friends' ? L('Скрыто для всех, кроме друзей', 'Hidden from everyone but friends') : L('Видно всем', 'Visible to everyone'), 'success');
    loadAdminReviews();
  } catch (e) { showNotification(L('Ошибка', 'Error'), 'error'); }
}

async function adminDeleteReview(reviewId) {
  showConfirmModal(L('Удалить рецензию?', 'Delete review?'), async () => {
    try {
      await supabaseClient.from('reviews').delete().eq('id', reviewId);
      await logAdminAction('delete_review', 'review', reviewId);
      showNotification(L('Рецензия удалена', 'Review deleted'), 'success');
      loadAdminReviews();
    } catch (e) { showNotification(L('Ошибка', 'Error'), 'error'); }
  });
}

async function loadAdminComments() {
  const c = document.getElementById('admin-content');
  c.innerHTML = '<div class="admin-loading">' + L('Загрузка комментариев…', 'Loading comments…') + '</div>';

  try {
    const { data: comments } = await supabaseClient
      .from('review_comments')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(300);

    if (!comments?.length) {
      c.innerHTML = '<div class="admin-empty">' + L('Нет комментариев', 'No comments') + '</div>';
      return;
    }

    const en = isEnMode();

    c.innerHTML = '<div class="admin-table">' + comments.map(cm => {
      const username = cm.profiles?.username || L('Пользователь', 'User');
      const text = escapeHtml(cm.comment_text || '');
      const date = cm.created_at ? new Date(cm.created_at).toLocaleString(en ? 'en-US' : 'ru-RU') : '';

      return '<div class="admin-row">' +
        '<div class="admin-row-info">' +
          '<div class="admin-row-title">' + escapeHtml(username) + '</div>' +
          '<div class="admin-row-sub">' + date + '</div>' +
          '<div class="admin-row-sub" style="margin-top:6px;color:var(--text);">' + text + '</div>' +
        '</div>' +
        '<div class="admin-row-actions">' +
          '<button class="admin-btn danger" onclick="adminDeleteComment(\'' + cm.id + '\')">' + L('Удалить', 'Delete') + '</button>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
  } catch (e) {
    c.innerHTML = '<div class="admin-empty">' + L('Ошибка загрузки', 'Load error') + '</div>';
  }
}

async function adminDeleteComment(commentId) {
  showConfirmModal(L('Удалить комментарий?', 'Delete comment?'), async () => {
    try {
      await supabaseClient.from('review_comments').delete().eq('id', commentId);
      await logAdminAction('delete_comment', 'comment', commentId);
      showNotification(L('Комментарий удалён', 'Comment deleted'), 'success');
      loadAdminComments();
    } catch (e) { showNotification(L('Ошибка', 'Error'), 'error'); }
  });
}

async function loadAdminMovies() {
  const c = document.getElementById('admin-content');
  c.innerHTML =
    '<input type="text" id="admin-movies-search" class="admin-search" placeholder="' + L('Поиск по названию...', 'Search by title...') + '" oninput="filterAdminMovies(this.value)" />' +
    '<div id="admin-movies-list"></div>';

  try {
    const { data: movies } = await supabaseClient
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (!movies?.length) {
      document.getElementById('admin-movies-list').innerHTML = '<div class="admin-empty">' + L('Нет фильмов в БД', 'No movies in DB') + '</div>';
      return;
    }

    window._adminMovies = movies;
    renderAdminMovies(movies);
  } catch (e) {
    document.getElementById('admin-movies-list').innerHTML = '<div class="admin-empty">' + L('Ошибка загрузки', 'Load error') + '</div>';
  }
}

function filterAdminMovies(q) {
  if (!window._adminMovies) return;
  const query = (q || '').toLowerCase().trim();
  const filtered = !query ? window._adminMovies : window._adminMovies.filter(m =>
    (m.name || '').toLowerCase().includes(query)
  );
  renderAdminMovies(filtered);
}

function renderAdminMovies(movies) {
  const c = document.getElementById('admin-movies-list');
  if (!c) return;

  if (!movies.length) {
    c.innerHTML = '<div class="admin-empty">' + L('Ничего не найдено', 'Nothing found') + '</div>';
    return;
  }

  const en = isEnMode();

  c.innerHTML = '<div class="admin-table">' + movies.map(m => {
    const date = m.created_at ? new Date(m.created_at).toLocaleDateString(en ? 'en-US' : 'ru-RU') : '';
    const poster = m.cover_url || '';

    return '<div class="admin-row">' +
      '<div class="admin-row-info" style="flex-direction:row;align-items:center;gap:12px;">' +
        (poster ? '<img src="' + escapeHtml(poster) + '" style="width:40px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;">' : '<div style="width:40px;height:60px;background:var(--surface-2);border-radius:6px;flex-shrink:0;"></div>') +
        '<div style="min-width:0;">' +
          '<div class="admin-row-title">' + escapeHtml(m.name || L('Без названия', 'Untitled')) + '</div>' +
          '<div class="admin-row-sub">KP ID: ' + (m.kinopoisk_id || '—') + ' · ' + date + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="admin-row-actions">' +
        '<a class="admin-btn" href="https://www.kinopoisk.ru/film/' + (m.kinopoisk_id || '') + '/" target="_blank" rel="noopener">' + L('КП', 'KP') + '</a>' +
        '<button class="admin-btn danger" onclick="adminDeleteMovie(\'' + m.id + '\', \'' + escapeForOnclick(m.name || '') + '\')">' + L('Удалить', 'Delete') + '</button>' +
      '</div>' +
    '</div>';
  }).join('') + '</div>';
}

async function adminDeleteMovie(movieId, movieName) {
  showConfirmModal(L('Удалить фильм «' + movieName + '»? Все рецензии на него тоже удалятся.', 'Delete movie "' + movieName + '"? All reviews for it will be deleted too.'), async () => {
    try {
      await supabaseClient.from('movies').delete().eq('id', movieId);
      await logAdminAction('delete_movie', 'movie', movieId, 'name=' + movieName);
      showNotification(L('Фильм удалён', 'Movie deleted'), 'success');
      loadAdminMovies();
    } catch (e) { showNotification(L('Ошибка: ', 'Error: ') + e.message, 'error'); }
  });
}

async function loadAdminLogs() {
  const c = document.getElementById('admin-content');
  c.innerHTML = '<div class="admin-loading">' + L('Загрузка логов…', 'Loading logs…') + '</div>';

  try {
    const { data: logs } = await supabaseClient
      .from('admin_logs')
      .select('*, profiles:admin_id(username)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!logs?.length) {
      c.innerHTML = '<div class="admin-empty">' + L('Пока нет действий', 'No actions yet') + '</div>';
      return;
    }

    const en = isEnMode();
    const actionLabels = en
      ? {
          ban_user: '🚫 Banned',
          unban_user: '✅ Unbanned',
          change_role: '👑 Role changed',
          delete_user: '❌ User deleted',
          change_visibility: '👁 Visibility changed',
          delete_review: '❌ Review deleted',
          delete_comment: '❌ Comment deleted',
          delete_movie: '❌ Movie deleted'
        }
      : {
          ban_user: '🚫 Забанен',
          unban_user: '✅ Разбанен',
          change_role: '👑 Смена роли',
          delete_user: '❌ Удалён пользователь',
          change_visibility: '👁 Смена видимости',
          delete_review: '❌ Удалена рецензия',
          delete_comment: '❌ Удалён комментарий',
          delete_movie: '❌ Удалён фильм'
        };

    c.innerHTML = '<div class="admin-table">' + logs.map(log => {
      const admin = log.profiles?.username || L('Админ', 'Admin');
      const label = actionLabels[log.action] || log.action;
      const date = log.created_at ? new Date(log.created_at).toLocaleString(en ? 'en-US' : 'ru-RU') : '';
      return '<div class="admin-row">' +
        '<div class="admin-row-info">' +
          '<div class="admin-row-title">' + label + ' <span style="color:var(--muted);font-weight:500;">· ' + escapeHtml(admin) + '</span></div>' +
          '<div class="admin-row-sub">' + (log.target_type || '') + (log.target_id ? ' · ' + log.target_id : '') + (log.details ? ' · ' + escapeHtml(log.details) : '') + '</div>' +
          '<div class="admin-row-sub">' + date + '</div>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
  } catch (e) {
    c.innerHTML = '<div class="admin-empty">' + L('Ошибка загрузки логов', 'Failed to load logs') + '</div>';
  }
}

// ============ СВЕТЛАЯ ТЕМА ============
function toggleLightTheme() {
  document.body.classList.toggle('light');
  localStorage.setItem('lightTheme', document.body.classList.contains('light') ? '1' : '0');
}
(function initLightTheme() {
  try { if (localStorage.getItem('lightTheme') === '1') document.body.classList.add('light'); } catch (e) {}
})();

// ============ ПЕРЕВОД СОРТИРОВОК (Select) ============
function applySortTranslations() {
  const en = isEnMode();

  const reviewsSort = document.getElementById('reviews-sort');
  if (reviewsSort) {
    const map = en
      ? { 'all': 'All', 'date-desc': 'Fresh', 'popular': 'Popular', 'rating-desc': 'High rating', 'rating-asc': 'Low rating' }
      : { 'all': 'Все', 'date-desc': 'Свежие', 'popular': 'Популярные', 'rating-desc': 'Высокий рейтинг', 'rating-asc': 'Низкий рейтинг' };
    for (const o of reviewsSort.options) if (map[o.value]) o.textContent = map[o.value];
  }

  const ratedSort = document.getElementById('rated-sort');
  if (ratedSort) {
    const map = en
      ? { 'rating-desc': 'Rating ↓', 'rating-asc': 'Rating ↑', 'reviews-desc': 'Most reviewed', 'date-desc': 'New' }
      : { 'rating-desc': 'Рейтинг ↓', 'rating-asc': 'Рейтинг ↑', 'reviews-desc': 'Больше оценок', 'date-desc': 'Новые' };
    for (const o of ratedSort.options) if (map[o.value]) o.textContent = map[o.value];
  }
}

// Автоматически подхватываем смену языка через i18n.js
(function hookToggleLang() {
  if (typeof window.toggleLang === 'function' && !window._sortHookDone) {
    const orig = window.toggleLang;
    window.toggleLang = function () {
      if (typeof orig === 'function') orig.apply(this, arguments);
      setTimeout(applySortTranslations, 0);
    };
    window._sortHookDone = true;
  }
})();

// Применяем при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(applySortTranslations, 100);
});