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

try {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.error('Ошибка инициализации Supabase:', e);
}

window.alert = function () {};

// ============ УТИЛИТЫ ============
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

async function getKinopoiskMovie(kinopoiskId) {
  if (!kinopoiskId) return null;
  if (kinopoiskMovieCache.has(kinopoiskId)) return kinopoiskMovieCache.get(kinopoiskId);

  // Проверяем localStorage (кэш на 24 часа)
  try {
    const cached = localStorage.getItem('kp_' + kinopoiskId);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed._expires > Date.now()) {
        kinopoiskMovieCache.set(kinopoiskId, parsed.data);
        return parsed.data;
      } else {
        localStorage.removeItem('kp_' + kinopoiskId);
      }
    }
  } catch (e) {}

  try {
    const { data } = await supabaseClient.functions.invoke('get-kinopoisk-movie', { body: { filmId: kinopoiskId } });
    kinopoiskMovieCache.set(kinopoiskId, data || null);
    if (data) {
      try {
        localStorage.setItem('kp_' + kinopoiskId, JSON.stringify({
          data,
          _expires: Date.now() + 24 * 60 * 60 * 1000
        }));
      } catch (e) {
        // localStorage переполнен — чистим старые записи
        try {
          Object.keys(localStorage).forEach(k => {
            if (k.startsWith('kp_')) localStorage.removeItem(k);
          });
        } catch (e2) {}
      }
    }
    return data || null;
  } catch (e) { return null; }
}

async function getPosterFromAPI(kinopoiskId) {
  const data = await getKinopoiskMovie(kinopoiskId);
  return data?.posterUrlPreview || data?.posterUrl || '';
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
    const { data: existing } = await supabaseClient
      .from('movies').select('id, cover_url').eq('kinopoisk_id', kid).maybeSingle();
    if (existing) {
      if (!existing.cover_url && posterUrl) {
        await supabaseClient.from('movies').update({
          cover_url: posterUrl,
          description: description || null
        }).eq('id', existing.id);
      }
    } else {
      await supabaseClient.from('movies').insert({
        name, kinopoisk_id: kid, cover_url: posterUrl, description: description || null
      });
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
      showNotification('Убрано из просмотренных', 'info');
    } else {
      await supabaseClient.from('watched').insert({ user_id: currentUser.id, kinopoisk_id: kid, movie_name: movieName || null, poster_url: posterUrl || null });
      watchedMovieIds.add(kid);
      if (btnEl) { btnEl.classList.add('active'); btnEl.innerHTML = '✅'; }
      showNotification('Отмечено как просмотрено', 'success');
    }
    if (currentSection === 'watched') loadWatchedList();
  } catch (e) { showNotification('Ошибка: ' + (e.message || ''), 'error'); }
}

async function loadWatchedList() {
  const c = document.getElementById('watched-grid');
  if (!c) return;
  c.innerHTML = buildMoviesSkeletonHTML();
  try {
    const { data, error } = await supabaseClient.from('watched').select('*').eq('user_id', currentUser.id).order('watched_at', { ascending: false });
    if (error) { c.innerHTML = '<p style="grid-column:1/-1;color:#8b8b9a;">Ошибка загрузки</p>'; return; }
    if (!data?.length) {
      c.innerHTML = '<p style="grid-column:1/-1;color:#8b8b9a;text-align:center;padding:40px;">Список пуст</p>';
      const cnt = document.getElementById('watched-count');
      if (cnt) cnt.textContent = '(0)';
      return;
    }
    c.innerHTML = data.map(w => {
      const t = w.movie_name || 'Фильм';
      const kid = w.kinopoisk_id;
      const poster = w.poster_url || '';
      const pHtml = poster
        ? '<img src="' + escapeHtml(poster) + '" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.querySelector(\'.no-poster\').style.display=\'flex\';"><div class="no-poster" style="display:none;">🎬</div>'
        : '<div class="no-poster">🎬</div>';
      return '<div class="movie-card" onclick="openFilmPage(\'' + kid + '\')"><div class="poster-wrap">' + pHtml +
        '<button class="watched-btn active" onclick="event.stopPropagation(); toggleWatched(' + kid + ', \'' + escapeForOnclick(t) + '\', \'' + escapeForOnclick(poster) + '\', this)">✅</button>' +
        '</div><div class="movie-info"><h3>' + escapeHtml(t) + '</h3></div></div>';
    }).join('');
    const cnt = document.getElementById('watched-count');
    if (cnt) cnt.textContent = '(' + data.length + ')';
  } catch (e) { c.innerHTML = '<p>Ошибка загрузки</p>'; }
}

function pluralizeOcenka(count) {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return count + ' оценок';
  if (n1 > 1 && n1 < 5) return count + ' оценки';
  if (n1 === 1) return count + ' оценка';
  return count + ' оценок';
}

// ============ ДАТЫ ============
function formatTimeMSK(s) {
  if (!s) return '';
  return new Date(s).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
}
function formatDateSeparator(s) {
  if (!s) return '';
  const d = new Date(s), t = new Date(), y = new Date(t);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return 'Сегодня';
  if (d.toDateString() === y.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}
function formatDate(s) {
  if (!s) return '';
  const d = new Date(s), diff = Math.floor((new Date() - d) / 86400000);
  if (diff === 0) return 'сегодня';
  if (diff === 1) return 'вчера';
  if (diff < 7) return diff + ' дня назад';
  return d.toLocaleDateString('ru-RU');
}
function formatChatTime(s) {
  const d = new Date(s), now = new Date(), diff = now - d;
  const mn = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dd = Math.floor(diff / 86400000);
  if (mn < 1) return 'сейчас';
  if (mn < 60) return mn + ' мин';
  if (h < 24) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (dd === 1) return 'вчера';
  if (dd < 7) return dd + ' дн';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
function formatLastSeen(s) {
  if (!s) return 'был(а) недавно';
  const d = new Date(s), now = new Date(), diff = now - d;
  const sc = Math.floor(diff / 1000), mn = Math.floor(diff / 60000), dd = Math.floor(diff / 86400000);
  if (sc < 120) return 'в сети';
  if (mn < 60) { if (mn < 2) return 'был(а) только что'; return 'был(а) ' + mn + ' мин назад'; }
  const isToday = d.toDateString() === now.toDateString();
  const y = new Date(now); y.setDate(y.getDate() - 1);
  const isYest = d.toDateString() === y.toDateString();
  const ts = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return 'был(а) в ' + ts;
  if (isYest) return 'был(а) вчера в ' + ts;
  if (dd < 7) return 'был(а) ' + dd + ' дн назад';
  return 'был(а) ' + d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// ============ RATING ============
function setRating(r) {
  selectedRating = r;
  const el = document.getElementById('rating-display');
  if (el) el.textContent = r + '/10';
  document.querySelectorAll('#star-rating .star').forEach((s, i) => s.classList.toggle('active', i < r));
}
function setEditRating(r) {
  editRating = r;
  const el = document.getElementById('edit-rating-display');
  if (el) el.textContent = r + '/10';
  document.querySelectorAll('#edit-star-rating .star').forEach((s, i) => s.classList.toggle('active', i < r));
}
function setRecommend(r) {
  selectedRecommend = r;
  document.querySelectorAll('.btn-recommend').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(r ? '.btn-recommend-yes' : '.btn-recommend-no');
  if (btn) btn.classList.add('active');
}
function setEditRecommend(r) {
  editRecommend = r;
  document.querySelectorAll('#edit-review-modal .btn-recommend').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(r ? '#edit-review-modal .btn-recommend-yes' : '#edit-review-modal .btn-recommend-no');
  if (btn) btn.classList.add('active');
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
  if (!notifications?.length) c.innerHTML = '<div class="empty-state">Нет уведомлений</div>';
  else c.innerHTML = notifications.map(n =>
    '<div style="background:' + (n.is_read ? '#1a1a24' : '#23232f') + ';padding:12px 14px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;gap:10px;">' +
    '<div style="flex:1;"><span style="color:#a855f7;">●</span> ' + escapeHtml(n.content) +
    '<span style="color:#8b8b9a;font-size:0.75rem;margin-left:10px;">' + formatDate(n.created_at) + '</span></div>' +
    '<div style="display:flex;gap:4px;flex-shrink:0;">' +
    (!n.is_read ? '<button onclick="markNotificationRead(\'' + n.id + '\')" style="background:none;border:none;cursor:pointer;font-size:1rem;">✓</button>' : '') +
    '<button onclick="deleteNotification(\'' + n.id + '\')" style="background:none;border:none;cursor:pointer;font-size:1rem;">🗑</button></div></div>'
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
    await loadUserProfile();
    await loadWatchedMovies();
    subscribeToNotifications();
    showMainApp();
    startPresence();
    subscribeToMessages();
    subscribeToPresence();
    checkUnreadMessages();
    if (!intervalsStarted) {
      intervalsStarted = true;
      setInterval(checkUnreadMessages, 120000);
    }
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
  if (!loginInput || !password) { errEl.textContent = 'Заполните оба поля'; errEl.hidden = false; return; }

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginInput);
  let email = loginInput;

  if (!isEmail) {
    const { data: emailData, error: emailError } = await supabaseClient.rpc('get_email_by_username', { uname: loginInput });
    if (emailError || !emailData) { errEl.textContent = 'Пользователь с таким ником не найден'; errEl.hidden = false; return; }
    email = emailData;
  }
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('invalid login') || msg.includes('invalid credentials')) errEl.textContent = 'Неверный логин или пароль';
    else if (msg.includes('email not confirmed')) errEl.textContent = 'Подтвердите email — проверьте почту';
    else errEl.textContent = error.message;
    errEl.hidden = false;
    return;
  }
  currentUser = data.user;
  await loadUserProfile();
  await loadWatchedMovies();
  showMainApp();
  startPresence();
  subscribeToMessages();
  subscribeToNotifications();
  subscribeToPresence();
  checkUnreadMessages();
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('register-error');
  errEl.hidden = true;
  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const password2 = document.getElementById('register-password2').value;
  if (username.length < 3) return showAuthError(errEl, 'Ник минимум 3 символа');
  if (!/^[\w\-. ]+$/.test(username)) return showAuthError(errEl, 'Ник может содержать только буквы, цифры, пробел, ".", "-", "_"');
  if (password.length < 6) return showAuthError(errEl, 'Пароль минимум 6 символов');
  if (password !== password2) return showAuthError(errEl, 'Пароли не совпадают');

  const { data: existing } = await supabaseClient.from('profiles').select('id').ilike('username', username).maybeSingle();
  if (existing) return showAuthError(errEl, 'Такой ник уже занят');

  const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { data: { username } } });
  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('already registered') || msg.includes('user already exists') || error.status === 422) return showAuthError(errEl, 'Этот email уже зарегистрирован');
    if (msg.includes('password')) return showAuthError(errEl, 'Пароль слишком простой');
    if (msg.includes('rate limit')) return showAuthError(errEl, 'Слишком много попыток. Подождите.');
    return showAuthError(errEl, error.message || 'Ошибка регистрации');
  }
  if (data.session) {
    currentUser = data.user;
    await loadUserProfile();
    await loadWatchedMovies();
    showMainApp();
    startPresence(); subscribeToMessages(); subscribeToNotifications(); subscribeToPresence(); checkUnreadMessages();
    return;
  }
  errEl.style.color = '#4ade80';
  errEl.hidden = false;
  errEl.textContent = 'Аккаунт создан! Проверьте почту (' + email + ') и подтвердите регистрацию.';
  setTimeout(() => switchAuthTab('login'), 5000);
});

async function loadUserProfile() {
  try {
    const { data } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
    currentUserProfile = data || { id: currentUser.id, username: currentUser.email, role: 'user' };
  } catch (e) { currentUserProfile = { id: currentUser.id, username: currentUser.email, role: 'user' }; }
  myFriendIdsCache = null;
}

function showMainApp() {
  document.getElementById('auth-screen').style.display = 'none';
  const app = document.getElementById('main-app');
  app.hidden = false;
  app.style.display = 'block';
  document.getElementById('user-name-display').textContent = currentUserProfile?.username || currentUser.email;
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
        resultsDiv.innerHTML = '<div class="suggestion-item" style="color:#8b8b9a;">Ничего не найдено</div>';
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

// ============ ГЛАВНАЯ: HERO-КАРУСЕЛЬ ============
async function loadHeroBanner() {
  const el = document.getElementById('hero-banner');
  if (!el) return;
  try {
    const { data } = await supabaseClient.functions.invoke('get-recent-movies', { body: {} });
    const films = (data?.films || []).filter(f => f.posterUrl).slice(0, 15);
    if (!films.length) {
      // fallback — если свежих нет, берём популярное
      const fb = await supabaseClient.functions.invoke('get-movies-by-page', { body: { page: 1, category: 'popular' } });
      const fbFilms = (fb.data?.films || []).filter(f => f.posterUrl).slice(0, 15);
      if (!fbFilms.length) { el.innerHTML = ''; return; }
      heroFilms = fbFilms;
      heroIndex = 0;
      renderHeroBanner(el, heroFilms[0]);
      renderHeroDots();
      startHeroAuto();
      return;
    }
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
          '<button class="btn btn-primary" onclick="openFilmPage(\'' + id + '\')">Подробнее</button>' +
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
    '<button class="hero-dot' + (i === heroIndex ? ' active' : '') + '" onclick="goToHeroSlide(' + i + ')" aria-label="Слайд ' + (i + 1) + '"></button>'
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

// ============ ГЛАВНАЯ: РЯДЫ ============
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
    setTimeout(() => {
      loadCatalogRow(row.id, row.type, false);
    }, i * 150);
  }
}

async function loadCatalogRow(rowId, type, append) {
  const container = document.getElementById(rowId);
  if (!container) return;
  const state = rowState[rowId];
  if (!state || state.loading || !state.hasMore) return;
  state.loading = true;

  if (!append) container.innerHTML = buildRowSkeletonHTML();

  try {
    let films = [];

    if (type === 'popular') {
      const { data } = await supabaseClient.functions.invoke('get-movies-by-page', { body: { page: state.page, category: 'popular' } });
      films = data?.films || [];
    } else if (type === 'top250') {
      const { data } = await supabaseClient.functions.invoke('get-movies-by-page', { body: { page: state.page, category: 'top250' } });
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

    if (!films.length) {
      state.hasMore = false;
      if (!append) container.innerHTML = '<p style="color:#8b8b9a;font-size:0.85rem;padding:20px;">Пусто</p>';
      state.loading = false;
      return;
    }

    const html = films.map(f => buildMovieCardHTML(f)).join('');
    if (append) container.insertAdjacentHTML('beforeend', html);
    else container.innerHTML = html;

    state.page++;

    // После подгрузки проверяем: если пользователь всё ещё у конца —
    // догружаем ещё раз (с небольшой задержкой, чтобы не спамить API)
    if (append && container.scrollLeft + container.clientWidth >= container.scrollWidth - 400) {
      setTimeout(() => {
        if (state.hasMore && !state.loading) {
          loadCatalogRow(rowId, type, true);
        }
      }, 300);
    }
  } catch (e) {
    console.error('row error:', rowId, e);
    if (!append) container.innerHTML = '<p style="color:#8b8b9a;font-size:0.85rem;padding:20px;">Ошибка загрузки</p>';
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

  // Если листаем вправо — проверяем, не у конца ли, и догружаем
  if (dir > 0) {
    const cfg = CATALOG_ROWS.find(r => r.id === rowId);
    const state = rowState[rowId];
    if (cfg && state && state.hasMore && !state.loading) {
      if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 500) {
        loadCatalogRow(rowId, cfg.type, true);
      }
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
      // Срабатывает при каждом движении полосы прокрутки
      if (row.scrollLeft + row.clientWidth >= row.scrollWidth - 400) {
        const cfg = CATALOG_ROWS.find(r => r.id === row.id);
        const state = rowState[row.id];
        if (cfg && state && state.hasMore && !state.loading) {
          loadCatalogRow(row.id, cfg.type, true);
        }
      }
    }, { passive: true });
  });
}

// ============ РОУТЕР СТРАНИЦЫ ФИЛЬМА ============
function openFilmPage(filmId) {
  window.location.hash = 'film/' + filmId;
}

function closeFilmPage() {
  window.location.hash = '';
  document.title = 'Киноклуб — оценки фильмов, рецензии и подборки | kinoclab.online';
}

function handleHashRoute() {
  const hash = window.location.hash;
  const match = hash.match(/^#film\/(\d+)/);
  if (match) {
    showFilmPage(match[1]);
    return true;
  }
  return false;
}

window.addEventListener('hashchange', handleHashRoute);

// ============ СТРАНИЦА ФИЛЬМА ============
async function showFilmPage(filmId) {
  currentFilmId = filmId;
  document.querySelectorAll('.section').forEach(x => x.classList.remove('active'));
  const page = document.getElementById('film-page');
  if (page) page.classList.add('active');
  window.scrollTo(0, 0);

  const container = document.getElementById('film-page-content');
  container.innerHTML = '<div style="padding:60px;text-align:center;color:#8b8b9a;">Загрузка фильма…</div>';

  const data = await getKinopoiskMovie(filmId);
  if (!data) {
    container.innerHTML = '<div style="padding:60px;text-align:center;color:#ef4444;">Не удалось загрузить фильм</div>';
    return;
  }

  const t = data.nameRu || data.nameEn || '';
  const kp = parseFloat(data.ratingKinopoisk);
  const year = data.year || '';
  const description = data.description || 'Описание отсутствует.';
  const poster = data.posterUrl || '';
  const genresArr = (data.genres || []).map(g => g.genre);
  const genresText = genresArr.join(', ');
  const kid = Number(filmId);
  const isWatched = watchedMovieIds.has(kid);
  const ageLimit = formatAgeLimit(data.ratingAgeLimits);

  // Динамические meta-теги для SEO и соцсетей
  document.title = t + (year ? ' (' + year + ')' : '') + ' — рецензии, оценки, смотреть | Киноклуб';

  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    document.head.appendChild(metaDesc);
  }
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

  // Проверяем, есть ли фильм в watchlist
  let isInWatchlist = false;
  try {
    const { data: mv } = await supabaseClient.from('movies').select('id').eq('kinopoisk_id', kid).maybeSingle();
    if (mv) {
      const { data: wl } = await supabaseClient.from('watchlist').select('id').eq('user_id', currentUser.id).eq('movie_id', mv.id).maybeSingle();
      if (wl) isInWatchlist = true;
    }
  } catch (e) {}

  saveMoviePosterToDb(kid, t, poster, description);

  container.innerHTML =
    '<div class="film-page-layout">' +
      '<aside class="film-page-sidebar">' +
        '<div class="film-page-poster">' +
          (poster ? '<img src="' + escapeHtml(poster) + '" alt="Постер фильма ' + escapeHtml(t) + '">' : '<div class="no-poster">🎬</div>') +
        '</div>' +
        '<div class="film-page-actions-vertical">' +
          '<a href="https://kinopub.my/?do=search&subaction=search&story=' + encodeURIComponent(t) + '" target="_blank" rel="noopener" class="btn btn-primary btn-full">▶ Смотреть</a>' +
          '<button class="btn btn-secondary btn-full" onclick="openRatingModal(\'' + filmId + '\')">Оценить</button>' +
          '<button class="btn btn-secondary btn-full watched-toggle' + (isWatched ? ' active' : '') + '" onclick="toggleWatchedFromModal(' + kid + ', \'' + escapeForOnclick(t) + '\', \'' + escapeForOnclick(poster) + '\')">' + (isWatched ? '✅ Просмотрено' : '👁 Отметить') + '</button>' +
          '<button class="watchlist-btn btn-full' + (isInWatchlist ? ' active' : '') + '" id="film-watchlist-btn" onclick="toggleWatchlistFromFilmPage(' + kid + ', \'' + escapeForOnclick(t) + '\', \'' + escapeForOnclick(poster) + '\')">' + (isInWatchlist ? '★ В списке' : '☆ Хочу посмотреть') + '</button>' +
          '<a href="https://www.kinopoisk.ru/film/' + filmId + '/" target="_blank" rel="noopener" class="btn btn-secondary btn-full">Кинопоиск</a>' +
        '</div>' +
      '</aside>' +
      '<div class="film-page-main">' +
        '<button class="film-page-back" onclick="closeFilmPage(); showSection(\'movies\');">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Назад' +
        '</button>' +
        '<h1 class="film-title">' + escapeHtml(t) + '</h1>' +
        '<div class="film-meta">' +
          (year ? '<span>' + year + '</span>' : '') +
          (data.filmLength ? '<span>· ' + data.filmLength + ' мин</span>' : '') +
          (ageLimit ? '<span class="age-badge">' + ageLimit + '</span>' : '') +
        '</div>' +
        (!isNaN(kp) && kp > 0 ? '<div class="film-rating">' + STAR_SVG + ' <b>' + kp.toFixed(1) + '</b> <span>Кинопоиск</span></div>' : '') +
        (genresText ? '<div class="film-genres">' + escapeHtml(genresText) + '</div>' : '') +
        '<p class="film-desc">' + escapeHtml(description) + '</p>' +

        '<section class="film-trailers-section">' +
          '<h3>Трейлеры</h3>' +
          '<div id="film-trailers-list"></div>' +
        '</section>' +

        '<section class="film-cast-section">' +
          '<h3>Актёрский состав</h3>' +
          '<div id="film-cast-list" class="cast-grid"></div>' +
        '</section>' +

        '<div id="sequels-block" class="movie-modal-sequels"></div>' +
        '<div class="film-page-reviews" id="film-reviews-block"></div>' +
      '</div>' +
    '</div>';

  loadFilmTrailersSidebar(filmId, t, year);
  loadFilmCastSidebar(filmId);
  loadSequelsAndPrequels(filmId);
  loadFilmReviewsSidebar(filmId);
}

// ============ ТРЕЙЛЕРЫ (левая колонка) ============
async function loadFilmTrailersSidebar(filmId, title, year) {
  const container = document.getElementById('film-trailers-list');
  if (!container) return;
  container.innerHTML = '<p style="color:#8b8b9a;font-size:0.85rem;">Загрузка трейлеров…</p>';

  try {
    const { data } = await supabaseClient.functions.invoke('get-movie-videos', {
      body: { filmId, title, year }
    });
    const items = data?.items || [];
    if (!items.length) {
      container.innerHTML = '<p style="color:#8b8b9a;font-size:0.85rem;">Трейлеры не найдены</p>';
      return;
    }

    let html = '<div class="trailer-platforms">';
    items.forEach((tr, i) => {
      html += '<button class="trailer-platform-btn' + (i === 0 ? ' active' : '') +
              '" onclick="switchTrailerPlatform(' + i + ')">' +
              escapeHtml(tr.platformName) + '</button>';
    });
    html += '</div>';
    html += '<div class="trailer-player-wrap">' +
              '<iframe id="trailer-player" src="' + escapeHtml(items[0].embedUrl) +
              '" allowfullscreen loading="lazy"></iframe>' +
            '</div>';
    html += '<div id="trailer-current-name" class="trailer-current-name">' + escapeHtml(items[0].name) + '</div>';

    container.innerHTML = html;
    container._trailers = items;
  } catch (e) {
    container.innerHTML = '<p style="color:#8b8b9a;font-size:0.85rem;">Ошибка загрузки трейлеров</p>';
  }
}

function switchTrailerPlatform(idx) {
  const container = document.getElementById('film-trailers-list');
  if (!container || !container._trailers) return;
  const items = container._trailers;
  const tr = items[idx];
  if (!tr) return;

  document.querySelectorAll('.trailer-platform-btn').forEach((b, i) => {
    b.classList.toggle('active', i === idx);
  });

  const iframe = document.getElementById('trailer-player');
  if (iframe) iframe.src = tr.embedUrl;

  const nameEl = document.getElementById('trailer-current-name');
  if (nameEl) nameEl.textContent = tr.name;
}

// ============ АКТЁРЫ (правая колонка) ============
async function loadFilmCastSidebar(filmId) {
  const container = document.getElementById('film-cast-list');
  if (!container) return;
  container.innerHTML = '<p style="color:#8b8b9a;font-size:0.85rem;">Загрузка…</p>';
  try {
    const { data } = await supabaseClient.functions.invoke('get-film-staff', { body: { filmId } });
    const staff = data?.items || [];
    if (!staff.length) {
      container.innerHTML = '<p style="color:#8b8b9a;font-size:0.85rem;">Информация недоступна</p>';
      return;
    }
    container.innerHTML = staff.map(p =>
      '<div class="cast-card">' +
        '<div class="cast-photo">' +
          (p.posterUrl ? '<img src="' + escapeHtml(p.posterUrl) + '" loading="lazy">' : '<div class="no-photo">👤</div>') +
        '</div>' +
        '<div class="cast-name">' + escapeHtml(p.nameRu || p.nameEn || '') + '</div>' +
        '<div class="cast-role">' + escapeHtml(p.description || p.profession || '') + '</div>' +
      '</div>'
    ).join('');
  } catch (e) {
    container.innerHTML = '<p style="color:#8b8b9a;font-size:0.85rem;">Ошибка загрузки</p>';
  }
}

// ============ ОТЗЫВЫ (снизу) ============
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
    container.innerHTML = '<h3>Отзывы</h3>' + visible.map(r => {
      const username = r.profiles?.username || 'Пользователь';
      return '<div class="film-review-item">' +
        '<div class="film-review-header"><b>' + escapeHtml(username) + '</b><span class="rating">' + r.rating + '/10</span></div>' +
        (r.review_text ? '<p>' + escapeHtml(r.review_text) + '</p>' : '') +
      '</div>';
    }).join('');
  } catch (e) { container.innerHTML = ''; }
}

// ============ TOGGLE ПРОСМОТРЕНО (на странице фильма) ============
async function toggleWatchedFromModal(kinopoiskId, movieName, posterUrl) {
  if (!currentUser) return;
  const kid = Number(kinopoiskId);
  const isWatched = watchedMovieIds.has(kid);
  try {
    if (isWatched) {
      await supabaseClient.from('watched').delete().eq('user_id', currentUser.id).eq('kinopoisk_id', kid);
      watchedMovieIds.delete(kid);
      showNotification('Убрано из просмотренных', 'info');
    } else {
      await supabaseClient.from('watched').insert({ user_id: currentUser.id, kinopoisk_id: kid, movie_name: movieName || null, poster_url: posterUrl || null });
      watchedMovieIds.add(kid);
      showNotification('Отмечено как просмотрено', 'success');
    }

    const btn = document.querySelector('.film-page-actions .watched-toggle');
    if (btn) {
      const nowWatched = watchedMovieIds.has(kid);
      btn.classList.toggle('active', nowWatched);
      btn.innerHTML = nowWatched ? '✅ Просмотрено' : '👁 Отметить';
    }

    if (currentSection === 'movies') loadCatalogRows();
    else if (currentSection === 'watched') loadWatchedList();
  } catch (e) { showNotification('Ошибка: ' + (e.message || ''), 'error'); }
}

async function toggleWatchlistFromFilmPage(kinopoiskId, movieName, posterUrl) {
  if (!currentUser) return;
  const kid = Number(kinopoiskId);
  const btn = document.getElementById('film-watchlist-btn');
  try {
    // Ищем или создаём фильм в БД
    let movieId = null;
    const { data: mv } = await supabaseClient.from('movies').select('id').eq('kinopoisk_id', kid).maybeSingle();
    if (mv) {
      movieId = mv.id;
    } else {
      const { data: nm } = await supabaseClient
        .from('movies').insert({ name: movieName, kinopoisk_id: kid, cover_url: posterUrl || null })
        .select('id').single();
      if (nm) movieId = nm.id;
    }
    if (!movieId) { showNotification('Ошибка: не удалось сохранить фильм', 'error'); return; }

    // Проверяем, есть ли уже в watchlist
    const { data: existing } = await supabaseClient
      .from('watchlist').select('id').eq('user_id', currentUser.id).eq('movie_id', movieId).maybeSingle();

    if (existing) {
      await supabaseClient.from('watchlist').delete().eq('id', existing.id);
      if (btn) { btn.classList.remove('active'); btn.innerHTML = '☆ Хочу посмотреть'; }
      showNotification('Убрано из списка', 'info');
    } else {
      await supabaseClient.from('watchlist').insert({ user_id: currentUser.id, movie_id: movieId, kinopoisk_id: kid });
      if (btn) { btn.classList.add('active'); btn.innerHTML = '★ В списке'; }
      showNotification('Добавлено в список', 'success');
    }
  } catch (e) {
    showNotification('Ошибка: ' + (e.message || ''), 'error');
  }
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
    if (error) { c.innerHTML = '<p style="grid-column:1/-1;color:#8b8b9a;">Ошибка загрузки</p>'; return; }
    if (!data?.length) {
      c.innerHTML = '<p style="grid-column:1/-1;color:#8b8b9a;text-align:center;padding:40px;">Список пуст</p>';
      const cnt = document.getElementById('watchlist-count');
      if (cnt) cnt.textContent = '(0)';
      return;
    }
    c.innerHTML = data.map(w => {
      const t = w.movies?.name || 'Фильм';
      const kid = Number(w.kinopoisk_id || w.movies?.kinopoisk_id);
      const poster = w.movies?.cover_url || '';
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
  } catch (e) { c.innerHTML = '<p>Ошибка загрузки</p>'; }
}

async function removeFromWatchlist(itemId) {
  try {
    await supabaseClient.from('watchlist').delete().eq('id', itemId);
    showNotification('Убрано из списка', 'info');
    loadWatchlist();
  } catch (e) {}
}

async function toggleWatchlistFromModal(movieId, kinopoiskId, btnEl) {
  if (!currentUser) return;
  try {
    const { data: existing } = await supabaseClient
      .from('watchlist').select('id').eq('user_id', currentUser.id).eq('movie_id', movieId).maybeSingle();
    if (existing) {
      await supabaseClient.from('watchlist').delete().eq('id', existing.id);
      if (btnEl) { btnEl.classList.remove('active'); btnEl.innerHTML = 'Хочу посмотреть'; }
      showNotification('Убрано из списка', 'info');
    } else {
      await supabaseClient.from('watchlist').insert({ user_id: currentUser.id, movie_id: movieId, kinopoisk_id: kinopoiskId });
      if (btnEl) { btnEl.classList.add('active'); btnEl.innerHTML = 'В списке'; }
      showNotification('Добавлено в список', 'success');
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
      .select('*, movies(name, kinopoisk_id, cover_url), profiles(username)').limit(200);
    const friendIds = await getMyFriendIds();
    const reviews = (allReviews || []).filter(r => canSeeReview(r, friendIds));
    if (!reviews.length) { c.innerHTML = '<p style="grid-column:1/-1;color:#8b8b9a;">Нет оценок</p>'; return; }

    const map = {};
    reviews.forEach(r => {
      const mid = r.movie_id;
      if (!map[mid]) map[mid] = { name: r.movies?.name || 'Фильм', kid: r.movies?.kinopoisk_id || mid, cover: r.movies?.cover_url || '', reviews: [] };
      map[mid].reviews.push(r);
    });

    ratedMoviesData = await Promise.all(Object.values(map).map(async m => {
      const avg = m.reviews.reduce((s, r) => s + r.rating, 0) / m.reviews.length;
      const poster = m.cover || (m.kid ? await getPosterFromAPI(m.kid) : '');
      return {
        name: m.name, kid: m.kid, poster, avgRating: avg, reviewsCount: m.reviews.length,
        reviews: m.reviews, lastDate: Math.max(...m.reviews.map(r => new Date(r.created_at || 0).getTime()))
      };
    }));
    applyRatedSort();
  } catch (e) { c.innerHTML = '<p style="color:#8b8b9a;">Ошибка загрузки</p>'; }
}

function sortRatedMovies(sortBy) { currentRatedSort = sortBy; applyRatedSort(); }

function filterRatedMovies(query) {
  const statusEl = document.getElementById('rated-search-status');
  const listEl = document.getElementById('rated-movies-list');
  const cntEl = document.getElementById('rated-count');
  const q = (query || '').trim().toLowerCase();
  if (!q) { statusEl.style.display = 'none'; applyRatedSort(); return; }
  if (!ratedMoviesData.length) { statusEl.style.display = 'block'; statusEl.textContent = 'Загрузка...'; return; }
  const filtered = ratedMoviesData.filter(m => m.name.toLowerCase().includes(q));
  if (!filtered.length) {
    statusEl.style.display = 'block';
    statusEl.textContent = 'Фильм «' + query.trim() + '» ещё не оценён';
    listEl.innerHTML = '';
    if (cntEl) cntEl.textContent = '(0)';
    return;
  }
  statusEl.style.display = 'block';
  statusEl.textContent = 'Найдено: ' + filtered.length;
  renderRatedMovies(filtered);
}

async function searchHomeRated(query) {
  const statusEl = document.getElementById('home-search-status');
  const container = document.getElementById('recent-reviews');
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    statusEl.style.display = 'none';
    recentReviewsCache = null;
    loadRecentReviews(true);
    return;
  }
  if (!ratedMoviesData.length) {
    statusEl.style.display = 'block';
    statusEl.textContent = 'Загрузка...';
    await loadRatedMovies();
  }
  const filtered = ratedMoviesData.filter(m => m.name.toLowerCase().includes(q));
  if (!filtered.length) {
    statusEl.style.display = 'block';
    statusEl.textContent = 'Фильм «' + query.trim() + '» ещё не оценён';
    container.innerHTML = '';
    return;
  }
  statusEl.style.display = 'block';
  statusEl.textContent = 'Найдено фильмов: ' + filtered.length;
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

// ============ СИКВЕЛЫ / ПРИКВЕЛЫ ============
async function loadSequelsAndPrequels(filmId) {
  const container = document.getElementById('sequels-block');
  if (!container) return;
  container.innerHTML = '<p style="color:#8b8b9a;font-size:0.85rem;">Загрузка связанных фильмов…</p>';
  try {
    const { data } = await supabaseClient.functions.invoke('get-sequels-prequels', { body: { filmId } });
    const items = data?.items || [];
    if (!items.length) { container.innerHTML = ''; return; }

    const labels = { SEQUEL: 'Сиквел', PREQUEL: 'Приквел', REMAKE: 'Ремейк', SPINOFF: 'Спин-офф' };

    container.innerHTML = '<h3>Связанные фильмы</h3><div class="sequels-grid">' +
      items.map(f => {
        const label = labels[f.relationType] || 'Связанный';
        return '<div class="sequel-card" onclick="openFilmPage(\'' + f.filmId + '\')">' +
          '<div class="sequel-poster">' +
            (f.posterUrl ? '<img src="' + escapeHtml(f.posterUrl) + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';"><div class="no-poster" style="display:none;">🎬</div>' : '<div class="no-poster">🎬</div>') +
          '</div>' +
          '<div class="sequel-info">' +
            '<div class="sequel-badge">' + label + '</div>' +
            '<div class="sequel-title">' + escapeHtml(f.nameRu || f.nameEn) + '</div>' +
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
  if (!force && recentReviewsCache && currentReviewsSort === 'date-desc') {
    c.innerHTML = recentReviewsCache;
    return;
  }
  c.innerHTML = showReviewsSkeleton();

  try {
    const { data: allReviews } = await supabaseClient
      .from('reviews').select('*, movies(name, kinopoisk_id, cover_url), profiles(username)')
      .order('created_at', { ascending: false }).limit(50);

    const friendIds = await getMyFriendIds();
    const reviews = (allReviews || []).filter(r => canSeeReview(r, friendIds));
    if (!reviews.length) { c.innerHTML = '<p>Пока нет оценок</p>'; return; }

    const reviewIds = reviews.map(r => r.id).filter(Boolean);
    const kidList = [...new Set(reviews.map(r => r.movies?.kinopoisk_id || r.movie_id).filter(Boolean))];

    const [reactionsRes, commentsRes, postersEntries] = await Promise.all([
      reviewIds.length ? supabaseClient.from('review_reactions').select('review_id, reaction').in('review_id', reviewIds) : Promise.resolve({ data: [] }),
      reviewIds.length ? supabaseClient.from('review_comments').select('*, profiles(username)').in('review_id', reviewIds) : Promise.resolve({ data: [] }),
      Promise.all(kidList.map(async kid => [kid, await getPosterFromAPI(kid)]))
    ]);

    const postersMap = {};
    (postersEntries || []).forEach(([kid, url]) => { postersMap[kid] = url; });

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
      const poster = r.movies?.cover_url || postersMap[kid] || '';
      const rx = reactionsByReview[r.id] || { likes: 0, dislikes: 0 };
      const cm = (commentsByReview[r.id] || []).slice(0, 5);
      return { ...r, _kid: kid, _poster: poster, _likes: rx.likes, _dislikes: rx.dislikes, _comments: cm };
    });

    let sorted = [...enriched];
    if (currentReviewsSort === 'popular') sorted.sort((a, b) => (b._likes + b._comments.length * 2) - (a._likes + a._comments.length * 2));
    else if (currentReviewsSort === 'rating-desc') sorted.sort((a, b) => b.rating - a.rating);
    else if (currentReviewsSort === 'rating-asc') sorted.sort((a, b) => a.rating - b.rating);

    const limit = currentReviewsSort === 'all' ? 50 : 10;
    const html = sorted.slice(0, limit).map(r => buildReviewHTML(r)).join('');
    recentReviewsCache = html;
    c.innerHTML = html;
  } catch (e) { c.innerHTML = '<p>Ошибка загрузки</p>'; }
}

function buildReviewHTML(r) {
  const kid = r._kid;
  const ce = canEditReview(r.user_id);
  const commentsHtml = r._comments?.length
    ? '<div class="review-comments" id="comments-list-' + r.id + '">' + r._comments.map(cm => buildCommentHTML(cm, r.id)).join('') + '</div>'
    : '<div class="review-comments" id="comments-list-' + r.id + '"></div>';

  return '<div class="review-item" id="review-' + r.id + '">' +
    '<div class="review-main">' +
      '<div class="review-poster">' + getPosterHtml(r._poster, r.movies?.name || 'Фильм', '100%', '100%', '1.8rem') + '</div>' +
      '<div class="review-content">' +
        '<span class="review-username">' + escapeHtml(r.profiles?.username || 'Пользователь') + '</span>' +
        '<div class="review-meta-row">' +
          (r.visibility === 'friends' ? '<span class="visibility-badge friends">🔒</span>' : '') +
          '<span class="review-rating">' + starEmoji() + ' ' + r.rating + '/10</span>' +
          '<span class="review-recommend ' + (r.recommend ? 'yes' : 'no') + '">' + (r.recommend ? '👍 Советую' : '👎 Не советую') + '</span>' +
        '</div>' +
        '<h3 class="review-movie-title" onclick="openFilmPage(\'' + kid + '\')">' + escapeHtml(r.movies?.name || 'Фильм') + '</h3>' +
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
      '<button onclick="editReview(\'' + r.id + '\')">Редактировать</button>' +
      (isAdmin() ? '<button onclick="toggleReviewVisibility(\'' + r.id + '\')">' + (r.visibility === 'friends' ? 'Открыть всем' : 'Только друзьям') + '</button>' : '') +
      '<button class="delete" onclick="deleteReview(\'' + r.id + '\')">Удалить</button>' +
    '</div>' : '') +
  '</div>';
}

async function toggleReviewVisibility(reviewId) {
  if (!isAdmin()) { showNotification('Менять видимость может только админ', 'error'); return; }
  const { data: r } = await supabaseClient.from('reviews').select('visibility').eq('id', reviewId).single();
  if (!r) return;
  const newVis = r.visibility === 'friends' ? 'public' : 'friends';
  const { error } = await supabaseClient.from('reviews').update({ visibility: newVis }).eq('id', reviewId);
  if (error) { showNotification('Ошибка: ' + error.message, 'error'); return; }
  showNotification(newVis === 'friends' ? 'Видно только друзьям' : 'Видно всем', 'success');
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
        createNotification(review.user_id, 'review', currentUserProfile.username + ' поставил ' + (reaction === 'like' ? '👍' : '👎') + ' вашей рецензии');
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
  container.innerHTML = '<div class="comment-input-wrap"><input type="text" id="comment-text-' + reviewId + '" placeholder="Написать комментарий..."><button onclick="addComment(\'' + reviewId + '\')">Отправить</button></div>';
  document.getElementById('comment-text-' + reviewId)?.focus();
}

function showEditCommentInput(commentId, currentText) {
  if (!isAdmin()) return;
  const container = document.getElementById('comment-edit-' + commentId);
  if (!container) return;
  container.innerHTML = '<div class="comment-input-wrap" style="margin-top:6px;"><input type="text" id="edit-comment-text-' + commentId + '" value="' + escapeHtml(currentText) + '"><button onclick="saveEditedComment(\'' + commentId + '\')">💾</button><button onclick="cancelEditComment(\'' + commentId + '\')" style="background:#23232f;">✕</button></div>';
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
      createNotification(review.user_id, 'review', currentUserProfile.username + ' прокомментировал вашу рецензию');
    }
  } catch (e) {}
}

function buildCommentHTML(cm, reviewId) {
  return '<div class="comment-item" id="comment-' + cm.id + '">' +
    '<p><strong>' + escapeHtml(cm.profiles?.username || 'Пользователь') + ':</strong> ' + escapeHtml(cm.comment_text) + '</p>' +
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
      const uname = p.querySelector('strong')?.textContent?.replace(':', '') || 'Пользователь';
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
  showConfirmModal('Удалить комментарий?', async () => {
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
  showConfirmModal('Удалить рецензию?', async () => {
    await supabaseClient.from('reviews').delete().eq('id', id);
    recentReviewsCache = null;
    loadRecentReviews();
  });
}

// ============ МОДАЛКА ОЦЕНКИ ============
async function openRatingModal(filmId) {
  const data = await getKinopoiskMovie(filmId);
  if (!data) { showNotification('Не удалось загрузить фильм', 'error'); return; }
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
    '<h2>Оценить: ' + escapeHtml(t) + '</h2>' +
    '<div class="form-group">' +
      '<label>Оценка <span id="modal-rating-display" class="rating-display">' + (selectedRating || 0) + '/10</span></label>' +
      '<div class="star-rating" id="modal-star-rating">' +
        Array.from({ length: 10 }, (_, i) => '<button type="button" class="star' + (i < selectedRating ? ' active' : '') + '" onclick="setModalRating(' + (i + 1) + ')"><svg width="22" height="22"><use href="#i-star"/></svg></button>').join('') +
      '</div>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Рекомендация</label>' +
      '<div class="recommend-buttons">' +
        '<button class="btn-recommend btn-recommend-yes' + (selectedRecommend ? ' active' : '') + '" type="button" onclick="setModalRecommend(true)">Советую</button>' +
        '<button class="btn-recommend btn-recommend-no' + (!selectedRecommend ? ' active' : '') + '" type="button" onclick="setModalRecommend(false)">Не советую</button>' +
      '</div>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Рецензия <span class="optional">необязательно</span></label>' +
      '<textarea id="modal-review-text" placeholder="Что вы думаете о фильме?">' + escapeHtml(existingReview?.review_text || '') + '</textarea>' +
    '</div>' +
    '<div class="modal-actions">' +
      '<button class="btn btn-primary" type="button" onclick="submitModalReview(\'' + filmId + '\', ' + (movieId ? '\'' + movieId + '\'' : 'null') + ')">' + (existingReview ? 'Обновить' : 'Опубликовать') + '</button>' +
      '<button class="btn btn-secondary" type="button" onclick="closeModal()">Отмена</button>' +
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
  if (!selectedRating) { showNotification('Поставьте оценку', 'error'); return; }
  const reviewText = document.getElementById('modal-review-text').value.trim();
  const data = await getKinopoiskMovie(filmId);
  const movieName = data?.nameRu || data?.nameEn || 'Фильм';
  try {
    let movieId = existingMovieId;
    if (!movieId) {
      const { data: nm } = await supabaseClient.from('movies').insert([{ name: movieName, kinopoisk_id: parseInt(filmId) }]).select().single();
      if (!nm) throw new Error('Ошибка сохранения фильма');
      movieId = nm.id;
    }
    const { data: er } = await supabaseClient.from('reviews').select('id').eq('user_id', currentUser.id).eq('movie_id', movieId).maybeSingle();
    if (er) {
      await supabaseClient.from('reviews').update({ rating: selectedRating, review_text: reviewText || null, recommend: selectedRecommend }).eq('id', er.id);
      showNotification('Оценка обновлена', 'success');
    } else {
      await supabaseClient.from('reviews').insert([{
        user_id: currentUser.id, movie_id: movieId, rating: selectedRating,
        review_text: reviewText || null, recommend: selectedRecommend, visibility: 'friends'
      }]);
      showNotification('Оценка добавлена', 'success');
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
      const btn = document.querySelector('.film-page-actions .watched-toggle');
      if (btn) { btn.classList.add('active'); btn.innerHTML = '✅ Просмотрено'; }
    }
  } catch (e) { showNotification('Ошибка: ' + e.message, 'error'); }
}

// ============ КОЛЕСО ============
function updateWheelInfo() {
  const info = document.getElementById('wheel-info');
  if (info) info.textContent = wheelMovies.length + ' фильмов в колесе';
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
  try {
    const randomPage = Math.floor(Math.random() * 20) + 1;
    const { data } = await supabaseClient.functions.invoke('get-movies-by-page', { body: { page: randomPage, category: 'popular' } });
    const films = data?.films || [];
    if (!films.length) { if (resultEl) resultEl.textContent = 'Не удалось загрузить фильмы'; return; }
    wheelMovies = films.sort(() => Math.random() - 0.5).slice(0, 8).map(f => ({ name: f.nameRu || f.nameEn || 'Фильм', kid: f.filmId || f.id }));
    drawWheel();
    loadWheelHistory();
    updateWheelInfo();
  } catch (e) { if (resultEl) resultEl.textContent = 'Ошибка загрузки'; }
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
  spinBtn.innerHTML = 'Крутится...';
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
      resultEl.innerHTML = 'Выпало: <strong>' + escapeHtml(winner.name) + '</strong>';
      resultEl.classList.add('winner');
      isSpinning = false;
      spinBtn.disabled = false;
      spinBtn.classList.remove('spinning');
      spinBtn.innerHTML = 'Крутить';
    }
  }
  animate();
}
async function saveWheelResult(movie) {
  try {
    await supabaseClient.from('wheel_results').insert({ user_id: currentUser.id, movie_name: movie.name, kinopoisk_id: movie.kid });
    loadWheelHistory();
  } catch (e) {}
}
async function loadWheelHistory() {
  try {
    const { data: results } = await supabaseClient.from('wheel_results').select('*, profiles(username)').order('created_at', { ascending: false }).limit(30);
    const container = document.getElementById('wheel-history');
    if (!container) return;
    if (!results?.length) { container.innerHTML = '<div class="history-empty"><span>🎡</span>Пока никто не крутил колесо</div>'; return; }
    container.innerHTML = results.map(r => {
      const username = r.profiles?.username || 'Пользователь';
      const initial = username.charAt(0).toUpperCase();
      const time = formatDate(r.created_at);
      const canDel = isAdmin();
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
  if (!isAdmin()) return;
  showConfirmModal('Удалить результат?', async () => {
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
      '<div style="padding:12px;background:#1a1a24;border-radius:10px;display:flex;justify-content:space-between;align-items:center;"><span>' + escapeHtml(u.username) + '</span><button class="btn btn-primary" style="min-height:32px;padding:6px 14px;font-size:0.8rem;" onclick="sendFriendRequest(\'' + u.id + '\')">Добавить</button></div>'
    ).join('');
  }
}
async function sendFriendRequest(rid) {
  const { data: existing } = await supabaseClient.from('friend_requests').select('id').eq('sender_id', currentUser.id).eq('receiver_id', rid).maybeSingle();
  if (existing) { showNotification('Заявка уже отправлена', 'info'); return; }
  await supabaseClient.from('friend_requests').insert([{ sender_id: currentUser.id, receiver_id: rid, status: 'pending' }]);
  createNotification(rid, 'friend_request', currentUserProfile.username + ' хочет добавить вас в друзья');
  showNotification('Заявка отправлена', 'success');
}
async function loadFriendRequests() {
  const { data } = await supabaseClient.from('friend_requests').select('*, sender:profiles!sender_id(username)').eq('receiver_id', currentUser.id).eq('status', 'pending');
  const c = document.getElementById('friend-requests');
  if (!c) return;
  if (!data?.length) { c.innerHTML = '<p style="color:#8b8b9a;">Нет заявок</p>'; return; }
  c.innerHTML = data.map(r =>
    '<div style="padding:12px;background:#1a1a24;border-radius:10px;display:flex;justify-content:space-between;align-items:center;"><span>' + escapeHtml(r.sender?.username || 'Пользователь') + '</span><button class="btn btn-primary" style="min-height:32px;padding:6px 14px;font-size:0.8rem;" onclick="acceptFriendRequest(\'' + r.id + '\',\'' + r.sender_id + '\')">Принять</button></div>'
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
  if (!data?.length) { c.innerHTML = '<p style="color:#8b8b9a;">Нет друзей</p>'; return; }
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
    const uname = f.friend?.username || 'Друг';
    return '<div style="padding:12px;background:#1a1a24;border-radius:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
      '<div style="flex:1;min-width:0;cursor:pointer;" onclick="viewUserProfile(\'' + f.friend_id + '\')"><span id="status-' + f.friend_id + '">' + (isOnline ? '🟢' : '⚪') + '</span> <span>' + escapeHtml(f.friend?.username || 'Пользователь') + '</span>' +
      (unreadFrom > 0 ? '<span style="background:#a855f7;color:white;border-radius:10px;padding:2px 8px;font-size:0.7rem;margin-left:8px;">' + unreadFrom + '</span>' : '') + '</div>' +
      '<button class="btn btn-primary" style="min-height:32px;padding:6px 12px;font-size:0.8rem;" onclick="event.stopPropagation(); openChat(\'' + f.friend_id + '\', \'' + escapeForOnclick(uname) + '\')">💬</button>' +
      '<button class="btn btn-danger" style="min-height:32px;padding:6px 10px;font-size:0.8rem;" onclick="event.stopPropagation(); removeFriend(\'' + f.friend_id + '\', \'' + escapeForOnclick(uname) + '\')" title="Удалить из друзей">🗑</button>' +
    '</div>';
  }).join('');
}

async function removeFriend(friendId, friendName) {
  showConfirmModal('Удалить ' + friendName + ' из друзей?', async () => {
    try {
      await supabaseClient.from('friendships').delete().eq('user_id', currentUser.id).eq('friend_id', friendId);
      await supabaseClient.from('friendships').delete().eq('user_id', friendId).eq('friend_id', currentUser.id);
      myFriendIdsCache = null;
      showNotification(friendName + ' удалён из друзей', 'info');
      loadFriends();
    } catch (e) {
      showNotification('Ошибка: ' + (e.message || ''), 'error');
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
  if (!friendships?.length) { container.innerHTML = '<div class="tg-empty-list">У вас пока нет друзей</div>'; return; }
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
    username: f.friend?.username || 'Пользователь',
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
  const cntEl = document.getElementById('chat-count');
  if (cntEl) cntEl.textContent = '(' + allChatFriends.length + ')';
}

function renderChatFriends(friends) {
  const container = document.getElementById('chat-list');
  if (!container) return;
  if (!friends.length) { container.innerHTML = '<div class="tg-empty-list">Ничего не найдено</div>'; return; }
  container.innerHTML = friends.map(f => {
    const initial = f.username.charAt(0).toUpperCase();
    const avatar = f.avatar_url
      ? '<img src="' + escapeHtml(f.avatar_url) + '" onerror="this.style.display=\'none\';this.parentElement.textContent=\'' + escapeForOnclick(initial) + '\';">'
      : initial;
    let preview = 'Нет сообщений';
    if (f.lastMessage) {
      if (f.lastMessage.message_text) preview = (f.lastMessage.sender_id === currentUser.id ? 'Вы: ' : '') + escapeHtml(f.lastMessage.message_text);
      else if (f.lastMessage.image_url) preview = (f.lastMessage.sender_id === currentUser.id ? 'Вы: ' : '') + 'Изображение';
      else if (f.lastMessage.video_url) preview = (f.lastMessage.sender_id === currentUser.id ? 'Вы: ' : '') + 'Видео';
    }
    const time = f.lastMessage ? formatChatTime(f.lastMessage.created_at) : '';
    const uBadge = f.unread > 0 ? '<span class="tg-chat-item-badge">' + f.unread + '</span>' : '';
    return '<div class="tg-chat-item' + (currentChatFriend === f.id ? ' active' : '') + '" onclick="openChat(\'' + f.id + '\', \'' + escapeForOnclick(f.username) + '\', \'' + escapeForOnclick(f.avatar_url || '') + '\', ' + f.isOnline + ')">' +
      '<div class="tg-chat-item-avatar">' + avatar + '<div class="online-dot' + (f.isOnline ? ' online' : '') + '"></div></div>' +
      '<div class="tg-chat-item-content">' +
        '<div class="tg-chat-item-row"><span class="tg-chat-item-name">' + escapeHtml(f.username) + '</span><span class="tg-chat-item-time">' + time + '</span></div>' +
        '<div class="tg-chat-item-preview' + (f.unread > 0 ? ' unread' : '') + '">' + preview + '</div>' +
      '</div>' + uBadge +
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
  if (isOnline) { statusEl.textContent = 'в сети'; statusEl.className = 'tg-dialog-status online'; }
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
  checkUnreadMessages();
  const c = document.getElementById('chat-container');
  c.innerHTML = '<div style="text-align:center;color:#8b8b9a;padding:20px;">Загрузка...</div>';
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
    if (isOn) { el.textContent = 'в сети'; el.className = 'tg-dialog-status online'; }
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
    div.addEventListener('touchstart', (e) => { pressTimer = setTimeout(() => showMessageMenu(e.touches[0], m.id, m), 500); });
    div.addEventListener('touchend', () => clearTimeout(pressTimer));
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
      const rName = rmsg.sender_id === currentUser.id ? 'Вы' : currentChatFriendName;
      const rText = rmsg.message_text || (rmsg.image_url ? 'Изображение' : 'Видео');
      content += '<div class="tg-reply-quote"><span class="rq-name">' + escapeHtml(rName) + '</span><span class="rq-text">' + escapeHtml(rText) + '</span></div>';
    }
  }
  if (m.image_url) content += '<img class="tg-msg-image" src="' + escapeHtml(m.image_url) + '" onclick="openLightbox(\'' + escapeForOnclick(m.image_url) + '\')" loading="lazy">';
  else if (m.video_url) content += '<video class="tg-msg-video" src="' + escapeHtml(m.video_url) + '" controls></video>';
  const text = m.message_text ? escapeHtml(m.message_text) : '';
  const time = formatTimeMSK(m.created_at);
  const edited = m.edited ? ' <span style="font-size:0.65rem;opacity:0.6;">(изм.)</span>' : '';
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
    '<button onclick="replyToMessage(\'' + msgId + '\'); closeMessageMenu();">Ответить</button>' +
    (isMy ? '<button onclick="editMessage(\'' + msgId + '\'); closeMessageMenu();">Редактировать</button>' : '') +
    (msg.message_text ? '<button onclick="copyMessageText(\'' + msgId + '\'); closeMessageMenu();">Копировать</button>' : '') +
    (isMy || isAdmin() ? '<button class="danger" onclick="deleteMessage(\'' + msgId + '\'); closeMessageMenu();">Удалить</button>' : '');
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
  const name = msg.sender_id === currentUser.id ? 'Вы' : currentChatFriendName;
  const text = msg.message_text || (msg.image_url ? 'Изображение' : 'Видео');
  preview.innerHTML = '<div style="flex:1;min-width:0;"><div style="color:#a855f7;font-weight:700;font-size:0.78rem;">Ответ ' + escapeHtml(name) + '</div><div class="rp-text">' + escapeHtml(text) + '</div></div><button class="rp-close" onclick="cancelReply()">✕</button>';
  preview.style.display = 'flex';
  document.getElementById('chat-input')?.focus();
}
function cancelReply() { currentReplyMessage = null; const p = document.getElementById('tg-reply-preview'); if (p) p.style.display = 'none'; }

async function editMessage(msgId) {
  const msg = messagesCache[currentChatFriend]?.find(m => m.id === msgId);
  if (!msg) return;
  const newText = prompt('Редактировать сообщение:', msg.message_text || '');
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
  navigator.clipboard.writeText(msg.message_text).then(() => showNotification('Скопировано', 'success'));
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
  if (error) { showNotification('Ошибка отправки', 'error'); return; }
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
      checkUnreadMessages();
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
  checkUnreadMessages();
}

async function checkUnreadMessages() {
  if (!currentUser) return;
  try {
    const { data } = await supabaseClient.from('private_messages').select('sender_id').eq('receiver_id', currentUser.id).eq('is_read', false).eq('is_deleted', false);
    unreadCount = new Set(data?.map(m => m.sender_id)).size;
    const b = document.getElementById('unread-badge');
    if (b) { b.textContent = unreadCount; b.hidden = unreadCount === 0; b.style.display = unreadCount > 0 ? 'inline-block' : 'none'; }
    const mb = document.getElementById('unread-badge-mobile');
    if (mb) { mb.textContent = unreadCount; mb.style.display = unreadCount > 0 ? 'inline-block' : 'none'; }
  } catch (e) {}
}

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
  c.innerHTML = '<p style="color:#8b8b9a;">Загрузка...</p>';
  try {
    const { data: reviews } = await supabaseClient.from('reviews').select('*, movies(name, kinopoisk_id)').eq('user_id', currentUser.id);
    const { data: friends } = await supabaseClient.from('friendships').select('*').eq('user_id', currentUser.id);
    const { data: watchlist } = await supabaseClient.from('watchlist').select('id').eq('user_id', currentUser.id);
    const { data: watched } = await supabaseClient.from('watched').select('id').eq('user_id', currentUser.id);
    const avatar = currentUserProfile?.avatar_url || '';
    const username = currentUserProfile?.username || currentUser.email || 'Пользователь';
    const totalReviews = reviews?.length || 0;
    const avgRating = totalReviews > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1) : '—';
    const recCount = reviews?.filter(r => r.recommend).length || 0;
    const recPercent = totalReviews > 0 ? Math.round((recCount / totalReviews) * 100) : 0;

    const genreCounts = {};
    const kidList = [...new Set((reviews || []).map(r => r.movies?.kinopoisk_id).filter(Boolean))];
    const moviesData = await Promise.all(kidList.map(kid => getKinopoiskMovie(kid)));
    moviesData.forEach(md => (md?.genres || []).forEach(g => { genreCounts[g.genre] = (genreCounts[g.genre] || 0) + 1; }));
    const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const dist = {};
    for (let i = 1; i <= 10; i++) dist[i] = 0;
    reviews?.forEach(r => { dist[r.rating] = (dist[r.rating] || 0) + 1; });
    const maxCount = Math.max(...Object.values(dist), 1);

    const distHTML = '<div class="rating-distribution"><h3>Распределение оценок</h3><div class="rating-bars">' +
      Object.entries(dist).map(([rating, count]) => {
        const h = (count / maxCount) * 100;
        return '<div class="rating-bar"><div class="bar-count">' + (count || '') + '</div><div class="bar" style="height:' + (count > 0 ? Math.max(h, 5) : 2) + '%"></div><div class="bar-label">' + rating + '</div></div>';
      }).join('') + '</div></div>';

    const topGenresHTML = topGenres.length
      ? '<div class="rating-distribution"><h3>Любимые жанры</h3><div class="genre-badges">' +
        topGenres.map(([n, c]) => '<span class="genre-badge">' + escapeHtml(n) + '<span class="count">× ' + c + '</span></span>').join('') +
        '</div></div>'
      : '';

    const themeSelHTML = isAdmin()
      ? '<div style="background:#1a1a24;padding:20px;border-radius:12px;margin-top:15px;">' +
        '<h3 style="margin-bottom:8px;">Тема сайта</h3>' +
        '<p style="color:#8b8b9a;font-size:0.85rem;margin:0 0 14px;">Выбранная тема применится у всех пользователей мгновенно</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button onclick="changeGlobalTheme(\'default\')" class="theme-pick-btn' + (currentGlobalTheme === 'default' ? ' active' : '') + '">Обычная</button>' +
          '<button onclick="changeGlobalTheme(\'halloween\')" class="theme-pick-btn' + (currentGlobalTheme === 'halloween' ? ' active' : '') + '">Хэллоуин</button>' +
          '<button onclick="changeGlobalTheme(\'newyear\')" class="theme-pick-btn' + (currentGlobalTheme === 'newyear' ? ' active' : '') + '">Новогодняя</button>' +
        '</div></div>'
      : '';

    c.innerHTML =
      '<div style="background:#13131a;padding:30px;border-radius:16px;text-align:center;">' +
        '<div style="width:100px;height:100px;background:linear-gradient(135deg,#a855f7,#7c3aed);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:3rem;overflow:hidden;cursor:pointer;" onclick="document.getElementById(\'avatar-upload\').click()">' +
        (avatar ? '<img src="' + escapeHtml(avatar) + '" style="width:100%;height:100%;object-fit:cover;" loading="lazy">' : '👤') +
        '</div>' +
        '<input type="file" id="avatar-upload" accept="image/*" style="display:none;" onchange="uploadAvatar(event)">' +
        '<h2 style="margin-top:14px;">' + escapeHtml(username) + '</h2>' +
        '<div class="profile-stats">' +
          '<div class="stat-card accent"><div class="stat-value">' + totalReviews + '</div><div class="stat-label">Оценок</div></div>' +
          '<div class="stat-card"><div class="stat-value">' + avgRating + '</div><div class="stat-label">Средняя</div></div>' +
          '<div class="stat-card green"><div class="stat-value">' + recPercent + '%</div><div class="stat-label">Советует</div></div>' +
          '<div class="stat-card blue"><div class="stat-value">' + (friends?.length || 0) + '</div><div class="stat-label">Друзей</div></div>' +
          '<div class="stat-card"><div class="stat-value">' + (watchlist?.length || 0) + '</div><div class="stat-label">Хочу</div></div>' +
          '<div class="stat-card"><div class="stat-value">' + (watched?.length || 0) + '</div><div class="stat-label">Смотрел</div></div>' +
        '</div>' +
        distHTML + topGenresHTML +
        '<div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:15px;">' +
          '<div style="background:#1a1a24;padding:20px;border-radius:12px;">' +
            '<h3 style="margin-bottom:14px;">Сменить ник</h3>' +
            '<input type="text" id="new-username" value="' + escapeHtml(username) + '" autocomplete="off" style="width:100%;margin-bottom:10px;">' +
            '<button class="btn btn-primary btn-full" onclick="changeUsername()">Сохранить</button>' +
          '</div>' +
          '<div style="background:#1a1a24;padding:20px;border-radius:12px;">' +
            '<h3 style="margin-bottom:14px;">Сменить пароль</h3>' +
            '<input type="password" id="old-password" placeholder="Текущий пароль" autocomplete="off" style="width:100%;margin-bottom:10px;">' +
            '<input type="password" id="new-password" placeholder="Новый пароль" autocomplete="off" style="width:100%;margin-bottom:10px;">' +
            '<button class="btn btn-danger btn-full" onclick="changePassword()">Сменить</button>' +
          '</div>' +
        '</div>' + themeSelHTML +
      '</div>';
  } catch (e) { c.innerHTML = '<p>Ошибка загрузки профиля</p>'; }
}

// ============ ПРОФИЛЬ ДРУГА ============
async function viewUserProfile(userId) {
  const body = document.getElementById('user-profile-body');
  body.innerHTML = '<p style="text-align:center;color:#8b8b9a;padding:40px;">Загрузка...</p>';
  openModal('user-profile-modal');
  const [{ data: profile }, { data: allReviews }, { data: friends }, { data: watchlist }, { data: watchedList }] = await Promise.all([
    supabaseClient.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabaseClient.from('reviews').select('*, movies(name, kinopoisk_id)').eq('user_id', userId),
    supabaseClient.from('friendships').select('*').eq('user_id', userId),
    supabaseClient.from('watchlist').select('*, movies(id, name, kinopoisk_id, cover_url)').eq('user_id', userId).order('added_at', { ascending: false }),
    supabaseClient.from('watched').select('*').eq('user_id', userId).order('watched_at', { ascending: false })
  ]);
  if (!profile) { body.innerHTML = '<p>Профиль не найден</p>'; return; }
  const friendIds = await getMyFriendIds();
  const reviews = (allReviews || []).filter(r => canSeeReview(r, friendIds));
  const vWl = watchlist || [];
  const vW = watchedList || [];
  const avatar = profile.avatar_url || '';
  const username = profile.username || 'Пользователь';
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1) : '—';
  const recCount = reviews.filter(r => r.recommend).length;
  const recPercent = totalReviews > 0 ? Math.round((recCount / totalReviews) * 100) : 0;
  const dist = {};
  for (let i = 1; i <= 10; i++) dist[i] = 0;
  reviews.forEach(r => { dist[r.rating] = (dist[r.rating] || 0) + 1; });
  const maxCount = Math.max(...Object.values(dist), 1);
  const distHTML = totalReviews > 0
    ? '<div class="rating-distribution"><h3>Распределение оценок</h3><div class="rating-bars">' +
      Object.entries(dist).map(([rating, count]) => {
        const h = (count / maxCount) * 100;
        return '<div class="rating-bar"><div class="bar-count">' + (count || '') + '</div><div class="bar" style="height:' + (count > 0 ? Math.max(h, 5) : 2) + '%"></div><div class="bar-label">' + rating + '</div></div>';
      }).join('') + '</div></div>'
    : '';
  const wlHTML = vWl.length
    ? '<div style="margin-top:20px;text-align:left;"><h3 style="margin-bottom:14px;">Хочу посмотреть (' + vWl.length + ')</h3><div class="movies-grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;">' +
      vWl.map(w => {
        const t = w.movies?.name || 'Фильм';
        const kid = w.kinopoisk_id || w.movies?.kinopoisk_id;
        const poster = w.movies?.cover_url || '';
        const pHtml = poster ? '<img src="' + escapeHtml(poster) + '" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.querySelector(\'.no-poster\').style.display=\'flex\';"><div class="no-poster" style="display:none;">🎬</div>' : '<div class="no-poster">🎬</div>';
        return '<div class="movie-card" style="cursor:pointer;" onclick="closeUserProfileModal(); openFilmPage(\'' + kid + '\')"><div class="poster-wrap">' + pHtml + '</div><div class="movie-info"><h3>' + escapeHtml(t) + '</h3></div></div>';
      }).join('') + '</div></div>'
    : '';
  const wHTML = vW.length
    ? '<div style="margin-top:20px;text-align:left;"><h3 style="margin-bottom:14px;">Просмотрено (' + vW.length + ')</h3><div class="movies-grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;">' +
      vW.map(w => {
        const t = w.movie_name || 'Фильм';
        const kid = w.kinopoisk_id;
        const poster = w.poster_url || '';
        const pHtml = poster ? '<img src="' + escapeHtml(poster) + '" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.querySelector(\'.no-poster\').style.display=\'flex\';"><div class="no-poster" style="display:none;">🎬</div>' : '<div class="no-poster">🎬</div>';
        return '<div class="movie-card" style="cursor:pointer;" onclick="closeUserProfileModal(); openFilmPage(\'' + kid + '\')"><div class="poster-wrap">' + pHtml + '</div><div class="movie-info"><h3>' + escapeHtml(t) + '</h3></div></div>';
      }).join('') + '</div></div>'
    : '';
  const recentHTML = reviews.length
    ? '<div style="margin-top:20px;text-align:left;"><h3 style="margin-bottom:14px;">Последние оценки (' + totalReviews + ')</h3>' +
      [...reviews].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10)
        .map(r => '<div style="background:#1a1a24;padding:10px 14px;border-radius:10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(r.movies?.name || 'Фильм') + '</span><span style="color:#fbbf24;font-weight:700;margin-left:10px;">' + r.rating + '/10</span></div>').join('') +
      '</div>'
    : '';
  body.innerHTML =
    '<div style="text-align:center;">' +
      '<div style="width:100px;height:100px;background:linear-gradient(135deg,#a855f7,#7c3aed);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:3rem;overflow:hidden;">' +
      (avatar ? '<img src="' + escapeHtml(avatar) + '" style="width:100%;height:100%;object-fit:cover;" loading="lazy">' : '👤') +
      '</div>' +
      '<h2 style="margin-top:12px;">' + escapeHtml(username) + '</h2>' +
      '<div class="profile-stats">' +
        '<div class="stat-card accent"><div class="stat-value">' + totalReviews + '</div><div class="stat-label">Оценок</div></div>' +
        '<div class="stat-card"><div class="stat-value">' + avgRating + '</div><div class="stat-label">Средняя</div></div>' +
        '<div class="stat-card green"><div class="stat-value">' + recPercent + '%</div><div class="stat-label">Советует</div></div>' +
        '<div class="stat-card blue"><div class="stat-value">' + (friends?.length || 0) + '</div><div class="stat-label">Друзей</div></div>' +
        '<div class="stat-card"><div class="stat-value">' + vWl.length + '</div><div class="stat-label">Хочу</div></div>' +
        '<div class="stat-card"><div class="stat-value">' + vW.length + '</div><div class="stat-label">Смотрел</div></div>' +
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
  if (!oldPass || !newPass) { showNotification('Заполните оба поля', 'error'); return; }
  if (newPass.length < 6) { showNotification('Пароль минимум 6 символов', 'error'); return; }
  const { error } = await supabaseClient.auth.signInWithPassword({ email: currentUser.email, password: oldPass });
  if (error) { showNotification('Неверный пароль', 'error'); return; }
  const { error: upErr } = await supabaseClient.auth.updateUser({ password: newPass });
  if (upErr) { showNotification('Ошибка: ' + upErr.message, 'error'); return; }
  showNotification('Пароль изменен', 'success');
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
  if (!isAdmin()) { showNotification('Только админ может менять тему', 'error'); return; }
  const { error } = await supabaseClient.from('app_settings').update({ value: theme, updated_at: new Date().toISOString() }).eq('key', 'active_theme');
  if (error) { showNotification('Ошибка: ' + error.message, 'error'); return; }
  applyGlobalTheme(theme);
  const labels = { default: 'Обычная', halloween: 'Хэллоуин', newyear: 'Новогодняя' };
  showNotification('Тема для всех: ' + labels[theme], 'success');
  if (currentSection === 'profile') loadProfile();
}

// ============ СВЕТЛАЯ ТЕМА ============
function toggleLightTheme() {
  document.body.classList.toggle('light');
  localStorage.setItem('lightTheme', document.body.classList.contains('light') ? '1' : '0');
}
(function initLightTheme() {
  try { if (localStorage.getItem('lightTheme') === '1') document.body.classList.add('light'); } catch (e) {}
})();