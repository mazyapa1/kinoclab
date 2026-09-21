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
let currentPage = 1;
let isLoadingMovies = false;
let hasMoreMovies = true;
let globalLastDateShown = null;
let wheelMovies = [];
let isSpinning = false;
let currentRotation = 0;
let isChatOpen = false;
let confirmCallback = null;
let selectedGenreFilter = null;
let currentSort = 'default';
let currentRatedSort = 'rating-desc';
let currentReviewsSort = 'date-desc';
let ratedMoviesData = [];
let watchlistCache = [];
let moviesCache = {};
let recentReviewsCache = null;
let chatFriendsCache = null;
let chatFriendsCacheTime = 0;
let messagesCache = {};
let intervalsStarted = false;
let allChatFriends = [];
let currentReplyMessage = null;
let typingTimeout = null;
let openMenuEl = null;
let currentGlobalTheme = null;
let myFriendIdsCache = null;
const kinopoiskMovieCache = new Map();

try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
    console.error('Ошибка инициализации Supabase:', e);
}

window.alert = function () {};

// ============ УТИЛИТЫ ============
function showNotification(message, type = 'error') {
    document.querySelectorAll('.custom-notification').forEach(n => n.remove());
    const colors = { error: { bg: '#dc3545', icon: '❌' }, success: { bg: '#28a745', icon: '✅' }, info: { bg: '#007bff', icon: 'ℹ️' } };
    const config = colors[type] || colors.error;
    const notification = document.createElement('div');
    notification.className = 'custom-notification';
    notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#1a1a1a;border:2px solid ' + config.bg + ';color:#fff;padding:15px 20px;border-radius:12px;z-index:10000;font-size:0.9rem;box-shadow:0 10px 30px rgba(0,0,0,0.5);max-width:350px;display:flex;align-items:center;gap:10px;cursor:pointer;animation:notifIn 0.3s ease;';
    const iconSpan = document.createElement('span');
    iconSpan.style.fontSize = '1.5rem';
    iconSpan.textContent = config.icon;
    const msgSpan = document.createElement('span');
    msgSpan.textContent = String(message ?? '');
    const closeSpan = document.createElement('span');
    closeSpan.style.cssText = 'margin-left:auto;color:#888;font-size:1.2rem;padding-left:8px;';
    closeSpan.textContent = '×';
    notification.append(iconSpan, msgSpan, closeSpan);
    notification.onclick = () => {
        notification.style.animation = 'notifOut 0.2s ease';
        setTimeout(() => notification.remove(), 200);
    };
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'notifOut 0.2s ease';
            setTimeout(() => notification.remove(), 200);
        }
    }, 4000);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeForOnclick(value) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Иконка звезды с учётом активной темы
function starEmoji() {
    if (currentGlobalTheme === 'halloween') return '🎃';
    if (currentGlobalTheme === 'newyear') return '⛄';
    return '⭐';
}

function getPosterHtml(poster, title, w, h, fs) {
    if (poster) return '<img src="' + escapeHtml(poster) + '" style="width:' + w + ';height:' + h + ';object-fit:cover;border-radius:5px;" onerror="this.style.display=\'none\'" loading="lazy">';
    return '<div style="width:' + w + ';height:' + h + ';background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-size:' + fs + ';border-radius:5px;">🎬</div>';
}

async function getKinopoiskMovie(kinopoiskId) {
    if (!kinopoiskId) return null;
    if (kinopoiskMovieCache.has(kinopoiskId)) return kinopoiskMovieCache.get(kinopoiskId);
    try {
        const { data } = await supabaseClient.functions.invoke('get-kinopoisk-movie', { body: { filmId: kinopoiskId } });
        kinopoiskMovieCache.set(kinopoiskId, data || null);
        return data || null;
    } catch (e) {
        return null;
    }
}

async function getPosterFromAPI(kinopoiskId) {
    const data = await getKinopoiskMovie(kinopoiskId);
    return data?.posterUrl || '';
}

function isAdmin() { return currentUserProfile?.role === 'admin'; }
function canEditReview(uid) { return isAdmin() || uid === currentUser?.id; }

// ============ ДРУЗЬЯ / ВИДИМОСТЬ ОТЗЫВОВ ============
async function getMyFriendIds() {
    if (myFriendIdsCache) return myFriendIdsCache;
    if (!currentUser?.id) return new Set();
    const { data } = await supabaseClient
        .from('friendships')
        .select('friend_id')
        .eq('user_id', currentUser.id);
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

function pluralizeOcenka(count) {
    const n = Math.abs(count) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return count + ' оценок';
    if (n1 > 1 && n1 < 5) return count + ' оценки';
    if (n1 === 1) return count + ' оценка';
    return count + ' оценок';
}

// ============ ФОРМАТЫ ДАТ ============
function formatTimeMSK(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
}

function formatDateSeparator(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Сегодня';
    if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    const diff = Math.floor((new Date() - date) / 86400000);
    if (diff === 0) return 'сегодня';
    if (diff === 1) return 'вчера';
    if (diff < 7) return diff + ' дня назад';
    return date.toLocaleDateString('ru-RU');
}

function formatChatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const diffMin = Math.floor(diff / 60000);
    const diffHours = Math.floor(diff / 3600000);
    const diffDays = Math.floor(diff / 86400000);
    if (diffMin < 1) return 'сейчас';
    if (diffMin < 60) return diffMin + ' мин';
    if (diffHours < 24) return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return diffDays + ' дн';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatLastSeen(dateString) {
    if (!dateString) return 'был(а) недавно';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const diffSec = Math.floor(diff / 1000);
    const diffMin = Math.floor(diff / 60000);
    const diffDays = Math.floor(diff / 86400000);
    if (diffSec < 120) return 'в сети';
    if (diffMin < 60) {
        if (diffMin < 2) return 'был(а) только что';
        return 'был(а) ' + diffMin + ' мин назад';
    }
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return 'был(а) в ' + timeStr;
    if (isYesterday) return 'был(а) вчера в ' + timeStr;
    if (diffDays < 7) return 'был(а) ' + diffDays + ' дн назад';
    return 'был(а) ' + date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// ============ RATING ============
function setRating(r) {
    selectedRating = r;
    const el = document.getElementById('rating-display');
    if (el) el.textContent = r + '/10';
    document.querySelectorAll('#star-rating .star').forEach((s, i) => {
        s.classList.toggle('active', i < r);
        s.style.opacity = i < r ? '1' : '0.3';
        s.style.color = i < r ? '#ffc107' : '';
        s.style.transform = i < r ? 'scale(1.2)' : 'scale(1)';
    });
}

function setEditRating(r) {
    editRating = r;
    const el = document.getElementById('edit-rating-display');
    if (el) el.textContent = r + '/10';
    document.querySelectorAll('#edit-star-rating .star').forEach((s, i) => {
        s.classList.toggle('active', i < r);
        s.style.opacity = i < r ? '1' : '0.3';
        s.style.color = i < r ? '#ffc107' : '';
        s.style.transform = i < r ? 'scale(1.2)' : 'scale(1)';
    });
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
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('show');
}
function closeModalById(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
}

function showConfirmModal(message, callback) {
    document.getElementById('confirm-message').textContent = message;
    confirmCallback = callback;
    openModal('confirm-modal');
}

async function confirmAction() {
    if (confirmCallback) await confirmCallback();
    closeConfirmModal();
}
function closeConfirmModal() { closeModalById('confirm-modal'); confirmCallback = null; }
function closeModal() { closeModalById('movie-modal'); }
function closeEditReviewModal() { closeModalById('edit-review-modal'); }
function closeUserProfileModal() { closeModalById('user-profile-modal'); }
function closeNotificationsModal() { closeModalById('notifications-modal'); }

// ============ LIGHTBOX ============
function openLightbox(imageUrl) {
    const img = document.getElementById('lightbox-image');
    img.src = imageUrl;
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

async function checkFriendStatus(friendId) {
    try {
        const { data } = await supabaseClient.from('user_presence').select('last_seen').eq('user_id', friendId).maybeSingle();
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
            const changedUserId = payload.new?.user_id || payload.old?.user_id;
            if (changedUserId && friendSet.has(changedUserId)) {
                const el = document.getElementById('status-' + changedUserId);
                if (el) el.textContent = (await checkFriendStatus(changedUserId)) ? '🟢' : '⚪';
            }
        })
        .subscribe();
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
        const badge = document.getElementById('notif-badge');
        if (badge) {
            badge.textContent = count;
            badge.hidden = count === 0;
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        }
    } catch (e) {}
}

function subscribeToNotifications() {
    if (!currentUser?.id) return;
    if (notificationsChannel) {
        supabaseClient.removeChannel(notificationsChannel);
        notificationsChannel = null;
    }
    notificationsChannel = supabaseClient.channel('notifications-' + currentUser.id + '-' + Date.now())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + currentUser.id }, () => loadNotifications())
        .subscribe();
    loadNotifications();
}

async function markNotificationRead(id) {
    await supabaseClient.from('notifications').update({ is_read: true }).eq('id', id);
    showNotifications();
    loadNotifications();
}

async function deleteNotification(id) {
    await supabaseClient.from('notifications').delete().eq('id', id);
    showNotifications();
    loadNotifications();
}

async function showNotifications() {
    const { data: notifications } = await supabaseClient.from('notifications').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(30);
    const container = document.getElementById('notifications-list');
    if (!container) return;
    if (!notifications?.length) {
        container.innerHTML = '<div class="empty-state">Нет уведомлений</div>';
    } else {
        container.innerHTML = notifications.map(n => {
            const icons = { review: '⭐', message: '💬', friend_request: '👥' };
            return '<div style="background:' + (n.is_read ? '#1d1d22' : '#252530') + ';padding:12px;border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:10px;">' +
                '<div style="flex:1;"><span>' + (icons[n.type] || '🔔') + '</span> ' + escapeHtml(n.content) +
                '<span style="color:#888;font-size:0.75rem;margin-left:10px;">' + formatDate(n.created_at) + '</span></div>' +
                '<div style="display:flex;gap:5px;flex-shrink:0;">' +
                (!n.is_read ? '<button onclick="markNotificationRead(\'' + n.id + '\')" style="background:none;border:none;cursor:pointer;">✅</button>' : '') +
                '<button onclick="deleteNotification(\'' + n.id + '\')" style="background:none;border:none;cursor:pointer;">🗑</button></div></div>';
        }).join('');
    }
    openModal('notifications-modal');
}

// ============ АВТОРИЗАЦИЯ ============
document.addEventListener('DOMContentLoaded', async () => {
    loadGlobalTheme();
    subscribeToTheme();

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        await loadUserProfile();
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
});

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm) loginForm.style.display = tab === 'login' ? 'block' : 'none';
    if (registerForm) registerForm.style.display = tab === 'register' ? 'block' : 'none';

    const authErr = document.getElementById('auth-error');
    const regErr = document.getElementById('register-error');
    if (authErr) authErr.hidden = true;
    if (regErr) regErr.hidden = true;
}

function showAuthError(el, msg) {
    if (!el) return;
    el.textContent = '❌ ' + msg;
    el.hidden = false;
}

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('register-error');
    errEl.hidden = true;

    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const password2 = document.getElementById('register-password2').value;

    // Валидация
    if (username.length < 3) return showAuthError(errEl, 'Ник минимум 3 символа');
    if (!/^[\w\-. ]+$/.test(username)) return showAuthError(errEl, 'Ник может содержать только буквы, цифры, пробел, ".", "-", "_"');
    if (password.length < 6) return showAuthError(errEl, 'Пароль минимум 6 символов');
    if (password !== password2) return showAuthError(errEl, 'Пароли не совпадают');

    // Проверка, что ник не занят
    const { data: existing } = await supabaseClient
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle();
    if (existing) return showAuthError(errEl, 'Такой ник уже занят, выберите другой');

    // Регистрация через Supabase
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: { username }  // попадёт в raw_user_meta_data, триггер подхватит
        }
    });

    if (error) {
        const msg = (error.message || '').toLowerCase();
    
        // Email уже зарегистрирован
        if (
            msg.includes('already registered') ||
            msg.includes('already been registered') ||
            msg.includes('user already exists') ||
            msg.includes('email address is already') ||
            msg.includes('email exists') ||
            error.status === 422
        ) {
            return showAuthError(errEl, 'Этот email уже зарегистрирован. Войдите или восстановите пароль.');
        }
    
        // Проблемы с паролем
        if (msg.includes('password')) {
            return showAuthError(errEl, 'Пароль слишком простой или короткий (минимум 6 символов)');
        }
    
        // Rate limit
        if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('for security purposes')) {
            return showAuthError(errEl, 'Слишком много попыток. Подождите пару минут.');
        }
    
        // Некорректный email
        if (msg.includes('invalid email') || msg.includes('unable to validate email')) {
            return showAuthError(errEl, 'Некорректный email');
        }
    
        // Email-подтверждение (не должно сюда попадать при signUp, но на всякий)
        if (msg.includes('email not confirmed')) {
            return showAuthError(errEl, 'Подтвердите email — проверьте почту');
        }
    
        // Всё остальное
        return showAuthError(errEl, error.message || 'Ошибка регистрации');
    }

    // Вариант 1: подтверждение email ВЫКЛЮЧЕНО → сессия есть сразу
    if (data.session) {
        currentUser = data.user;
        await loadUserProfile();
        showMainApp();
        startPresence();
        subscribeToMessages();
        subscribeToNotifications();
        subscribeToPresence();
        checkUnreadMessages();
        return;
    }

    // Вариант 2: подтверждение email ВКЛЮЧЕНО → ждём письма
    errEl.style.color = '#7cd47c';
    errEl.hidden = false;
    errEl.textContent = '✅ Аккаунт создан! Проверьте почту (' + email + ') и подтвердите регистрацию.';
    setTimeout(() => switchAuthTab('login'), 5000);
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('auth-error');
    errEl.hidden = true;

    const loginInput = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!loginInput || !password) {
        errEl.textContent = '❌ Заполните оба поля';
        errEl.hidden = false;
        return;
    }

    // Определяем, email это или ник
    // Проверка: есть @ и точка в домене → считаем email
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginInput);

    let email = loginInput;

    if (!isEmail) {
        // Ищем профиль по нику (регистронезависимо)
        const { data: profile, error: lookupError } = await supabaseClient
            .from('profiles')
            .select('id')
            .ilike('username', loginInput)
            .maybeSingle();

        if (lookupError || !profile) {
            errEl.textContent = '❌ Пользователь с таким ником не найден';
            errEl.hidden = false;
            return;
        }

        // Достаём email из auth.users через RPC или через профиль,
        // если он там есть. Если нет — используем фичу Supabase: 
        // admin-функция не доступна с anon-ключом, поэтому достаём через email в профиле.
        // Ниже — резервный путь через RPC.
        const { data: emailData, error: emailError } = await supabaseClient
            .rpc('get_email_by_username', { uname: loginInput });

        if (emailError || !emailData) {
            errEl.textContent = '❌ Не удалось найти email. Войдите по почте.';
            errEl.hidden = false;
            return;
        }
        email = emailData;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
            errEl.textContent = '❌ Неверный логин или пароль';
        } else if (msg.includes('email not confirmed')) {
            errEl.textContent = '❌ Подтвердите email — проверьте почту';
        } else {
            errEl.textContent = '❌ ' + error.message;
        }
        errEl.hidden = false;
        return;
    }

    currentUser = data.user;
    await loadUserProfile();
    showMainApp();
    startPresence();
    subscribeToMessages();
    subscribeToNotifications();
    subscribeToPresence();
    checkUnreadMessages();
});

async function loadUserProfile() {
    try {
        const { data } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
        currentUserProfile = data || { id: currentUser.id, username: currentUser.email, role: 'user' };
    } catch (e) {
        currentUserProfile = { id: currentUser.id, username: currentUser.email, role: 'user' };
    }
    myFriendIdsCache = null;
}

function showMainApp() {
    document.getElementById('auth-screen').style.display = 'none';
    const app = document.getElementById('main-app');
    app.hidden = false;
    app.style.display = 'block';
    document.getElementById('user-name-display').textContent = currentUserProfile?.username || currentUser.email;
    const lastSection = localStorage.getItem('lastSection') || 'home';
    if (document.getElementById(lastSection)) showSection(lastSection);
    else showSection('home');
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

    document.querySelectorAll('.nav-links a').forEach(a => {
        a.classList.remove('active');
        const onclick = a.getAttribute('onclick') || '';
        if (onclick.includes("showSection('" + s + "'")) a.classList.add('active');
    });

    document.querySelectorAll('.bottom-nav a').forEach(a => {
        a.classList.toggle('active', a.dataset.nav === s);
    });

    const loaders = {
        'home': () => { if (!recentReviewsCache) loadRecentReviews(); },
        'movies': () => { loadAllMovies(true); },
        'watchlist': () => { loadWatchlist(); },
        'rated': () => loadRatedMovies(),
        'wheel': () => { if (!wheelMovies.length) loadWheelMovies(); },
        'friends': () => { loadFriendRequests(); loadFriends(); },
        'profile': () => loadProfile(),
        'ai-chat': () => {
            const container = document.getElementById('ai-chat-messages');
            if (container && !container.dataset.initialized) {
                container.dataset.initialized = 'true';
                showAIWelcomeMessage();
            }
            setTimeout(() => document.getElementById('ai-chat-input')?.focus(), 100);
        },
        'chat': () => {
            if (isChatOpen) backToChatList();
            else loadChatFriends();
        }
    };
    if (loaders[s]) loaders[s]();
}

// ============ ПОИСК ============
async function searchSuggestions(q) {
    if (q.length < 2 || q.includes(' ')) return;
    try {
        const { data } = await supabaseClient.functions.invoke('search-kinopoisk', { body: { query: q } });
        if (data?.films?.length) {
            const div = document.getElementById('suggestions');
            div.innerHTML = data.films.slice(0, 7).map(f => {
                const t = f.nameRu || f.nameEn || '';
                return '<div class="suggestion-item" onclick="event.stopPropagation(); selectMovie(\'' + f.filmId + '\')">' + getPosterHtml(f.posterUrl, t, '40px', '60px', '1rem') + '<div><h4>' + escapeHtml(t) + '</h4><p>' + (f.year || '') + '</p></div></div>';
            }).join('');
            div.classList.add('active');
        }
    } catch (e) {}
}

async function searchSuggestionsAll(q) {
    if (q.length < 2) return;
    try {
        const { data } = await supabaseClient.functions.invoke('search-kinopoisk', { body: { query: q } });
        if (data?.films?.length) {
            const div = document.getElementById('suggestions-all');
            div.innerHTML = data.films.slice(0, 7).map(f => {
                const t = f.nameRu || f.nameEn || '';
                return '<div class="suggestion-item" onclick="event.stopPropagation(); showMovieDetails(\'' + f.filmId + '\'); this.parentElement.classList.remove(\'active\'); this.parentElement.innerHTML=\'\';">' + getPosterHtml(f.posterUrl, t, '40px', '60px', '1rem') + '<div><h4>' + escapeHtml(t) + '</h4><p>' + (f.year || '') + '</p></div></div>';
            }).join('');
            div.classList.add('active');
        }
    } catch (e) {}
}

async function selectMovie(filmId) {
    try {
        const data = await getKinopoiskMovie(filmId);
        if (!data) return;
        const t = data.nameRu || data.nameEn || '';
        const genres = (data.genres || []).map(g => g.genre).join(', ');
        document.getElementById('selected-movie-info').innerHTML =
            '<div class="selected-movie">' + getPosterHtml(data.posterUrl, t, '80px', '120px', '2rem') +
            '<div><h3>' + escapeHtml(t) + '</h3><p>' + (data.year || '') + '</p>' +
            (genres ? '<p style="font-size:0.8rem;color:#888;">' + escapeHtml(genres) + '</p>' : '') + '</div></div>';
        document.getElementById('selected-movie-id').value = filmId;
        const form = document.getElementById('review-form');
        form.style.display = 'block';
        form.hidden = false;
        document.getElementById('suggestions').classList.remove('active');
        document.getElementById('suggestions').innerHTML = '';
        document.getElementById('search-results').innerHTML = '';
        document.getElementById('movie-search').value = t;
        selectedRating = 0;
        document.getElementById('rating-display').textContent = '0/10';
        document.querySelectorAll('#star-rating .star').forEach(s => { s.classList.remove('active'); s.style.opacity = '0.3'; });
    } catch (e) {}
}

function resetRateForm() {
    const form = document.getElementById('review-form');
    form.style.display = 'none';
    form.hidden = true;
    document.getElementById('movie-search').value = '';
    document.getElementById('selected-movie-info').innerHTML = '';
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('suggestions').classList.remove('active');
    document.getElementById('suggestions').innerHTML = '';
    selectedRating = 0;
    document.getElementById('rating-display').textContent = '0/10';
    document.querySelectorAll('#star-rating .star').forEach(s => { s.classList.remove('active'); s.style.opacity = '0.3'; });
}

// ============ ФИЛЬМЫ ============
function filterByCategory(c, e) {
    currentCategoryFilter = c;
    selectedGenreFilter = null;
    currentPage = 1;
    hasMoreMovies = true;
    moviesCache = {};
    document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
    if (e && e.target) {
        e.target.classList.add('active');
    } else {
        document.querySelectorAll('.genre-btn').forEach(b => {
            const onclick = b.getAttribute('onclick') || '';
            if (onclick.includes("'" + c + "'")) b.classList.add('active');
        });
    }
    loadAllMovies(true);
}

function buildMoviesSkeletonHTML() {
    let skeleton = '';
    for (let i = 0; i < 12; i++) {
        skeleton += '<div class="movie-skeleton"><div class="skeleton-poster"></div><div class="skeleton-info"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>';
    }
    return skeleton;
}

async function loadAllMovies(reset = false) {
    const c = document.getElementById('movies-grid');
    if (!c) return;
    const cacheKey = currentCategoryFilter || 'all';
    if (reset) {
        currentPage = 1;
        hasMoreMovies = true;
        moviesCache[cacheKey] = [];
        c.innerHTML = buildMoviesSkeletonHTML();
    }
    if (isLoadingMovies || !hasMoreMovies) return;
    isLoadingMovies = true;
    try {
        const { data } = await supabaseClient.functions.invoke('get-movies-by-page', { body: { page: currentPage, category: currentCategoryFilter } });
        const films = data?.films || [];
        if (!films.length) {
            hasMoreMovies = false;
            if (reset) c.innerHTML = '<p style="grid-column:1/-1;color:#888;">Фильмы не найдены</p>';
            isLoadingMovies = false;
            return;
        }
        if (!moviesCache[cacheKey]) moviesCache[cacheKey] = [];
        moviesCache[cacheKey] = [...moviesCache[cacheKey], ...films];
        renderMovies(moviesCache[cacheKey]);
        currentPage++;
        hasMoreMovies = true;
    } catch (e) {
        if (reset) c.innerHTML = '<p style="grid-column:1/-1;color:#888;">Ошибка загрузки</p>';
        hasMoreMovies = false;
    }
    isLoadingMovies = false;
}

function renderMovies(films) {
    const c = document.getElementById('movies-grid');
    if (!c) return;
    const countEl = document.getElementById('movies-count');
    if (countEl) countEl.textContent = '(' + films.length + ')';
    c.innerHTML = films.map(f => {
        const t = f.nameRu || f.nameEn || f.name || '';
        if (!t) return '';
        const id = f.filmId || f.id;
        const poster = f.posterUrl || f.cover_url || '';
        const genres = (f.genres || []).map(g => g.genre);
        const year = f.year || '';
        const ratingNum = parseFloat(f.rating);
        const rating = !isNaN(ratingNum) && ratingNum > 0 ? ratingNum.toFixed(1) : '';
        let ratingClass = 'mid';
        if (ratingNum >= 7.5) ratingClass = 'high';
        else if (ratingNum < 6 && ratingNum > 0) ratingClass = 'low';
        const posterHtml = poster
            ? '<img src="' + escapeHtml(poster) + '" alt="' + escapeHtml(t) + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';"><div class="no-poster" style="display:none;">🎬</div>'
            : '<div class="no-poster">🎬</div>';
        const ratingBadge = rating ? '<div class="rating-badge ' + ratingClass + '">' + starEmoji() + ' ' + rating + '</div>' : '';
        const genresHtml = genres.length
            ? '<div class="movie-genres">' + genres.slice(0, 3).map(g => '<span>' + escapeHtml(g) + '</span>').join('') + '</div>'
            : '';
        return '<div class="movie-card" onclick="showMovieDetails(\'' + id + '\')">' +
            '<div class="poster-wrap">' + posterHtml + ratingBadge + '</div>' +
            '<div class="movie-info">' +
                '<h3>' + escapeHtml(t) + '</h3>' +
                '<div class="movie-meta">' + (year ? '<span class="year">' + year + '</span>' : '') + '</div>' +
                genresHtml +
            '</div>' +
        '</div>';
    }).join('');
}

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        const s = document.getElementById('movies');
        if (s && s.classList.contains('active')) loadAllMovies(false);
    }
});

async function showMovieDetails(filmId) {
    try {
        const data = await getKinopoiskMovie(filmId);
        if (!data) { showNotification('Не удалось загрузить фильм', 'error'); return; }
        const t = data.nameRu || data.nameEn || '';
        const kp = data.ratingKinopoisk || '';
        const year = data.year || '';
        const description = data.description || '';
        const poster = data.posterUrl || '';
        const genres = (data.genres || []).map(g => g.genre).join(', ');

        let dbMovieId = null;
        try {
            const { data: existingMovie } = await supabaseClient
                .from('movies')
                .select('id, cover_url, description')
                .eq('kinopoisk_id', parseInt(filmId))
                .maybeSingle();

            if (existingMovie) {
                dbMovieId = existingMovie.id;
                if (!existingMovie.cover_url || !existingMovie.description) {
                    supabaseClient.from('movies').update({
                        cover_url: poster || existingMovie.cover_url,
                        description: description || existingMovie.description
                    }).eq('id', existingMovie.id).then(() => {});
                }
            } else if (t) {
                const { data: newMovie } = await supabaseClient
                    .from('movies')
                    .insert({ name: t, cover_url: poster, kinopoisk_id: parseInt(filmId), description })
                    .select('id')
                    .single();
                if (newMovie) dbMovieId = newMovie.id;
            }
        } catch (e) { console.error('Save movie error:', e); }

        let watchlistBtnClass = '';
        let watchlistBtnText = '📌 Хочу посмотреть';
        if (dbMovieId) {
            try {
                const { data: existWatch } = await supabaseClient
                    .from('watchlist')
                    .select('id')
                    .eq('user_id', currentUser.id)
                    .eq('movie_id', dbMovieId)
                    .maybeSingle();
                if (existWatch) {
                    watchlistBtnClass = ' active';
                    watchlistBtnText = '✓ В списке';
                }
            } catch (e) {}
        }

        document.getElementById('modal-body').innerHTML =
            '<h2>' + escapeHtml(t) + '</h2>' + getPosterHtml(poster, t, '200px', '300px', '4rem') +
            '<p><strong>Год:</strong> ' + escapeHtml(year) + '</p>' +
            (genres ? '<p><strong>Жанры:</strong> ' + escapeHtml(genres) + '</p>' : '') +
            (kp ? '<p><strong>Кинопоиск:</strong> ' + starEmoji() + ' ' + escapeHtml(kp) + '</p>' : '') +
            '<p>' + escapeHtml(description) + '</p>' +
            '<div style="margin-top:20px;display:flex;flex-wrap:wrap;gap:10px;">' +
            '<a href="https://www.kinopoisk.ru/film/' + filmId + '/" target="_blank" style="background:#007bff;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;display:inline-block;">▶ Смотреть</a>' +
            '<button onclick="closeModal();showSection(\'rate\');selectMovie(\'' + filmId + '\');" style="background:#e50914;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;">' + starEmoji() + ' Оценить</button>' +
            (dbMovieId ? '<button class="watchlist-btn' + watchlistBtnClass + '" onclick="toggleWatchlistFromModal(\'' + dbMovieId + '\', ' + parseInt(filmId) + ', this)">' + watchlistBtnText + '</button>' : '') +
            '</div>';
        openModal('movie-modal');
    } catch (e) { console.error(e); showNotification('Ошибка загрузки фильма', 'error'); }
}

// ============ ХОЧУ ПОСМОТРЕТЬ ============
async function loadWatchlist() {
    const c = document.getElementById('watchlist-grid');
    if (!c) return;
    c.innerHTML = buildMoviesSkeletonHTML();

    try {
        const { data, error } = await supabaseClient
            .from('watchlist')
            .select('*, movies(id, name, kinopoisk_id, cover_url, description)')
            .eq('user_id', currentUser.id)
            .order('added_at', { ascending: false });

        if (error) { console.error('Watchlist error:', error); c.innerHTML = '<p style="grid-column:1/-1;color:#888;">Ошибка загрузки</p>'; return; }

        if (!data?.length) {
            c.innerHTML = '<p style="grid-column:1/-1;color:#888;text-align:center;padding:40px;">📌 Список пуст. Добавляйте фильмы кнопкой "Хочу посмотреть"</p>';
            return;
        }

        watchlistCache = data;

        c.innerHTML = data.map(w => {
            const t = w.movies?.name || 'Фильм';
            const kid = w.kinopoisk_id || w.movies?.kinopoisk_id;
            const poster = w.movies?.cover_url || '';
            return '<div class="movie-card" onclick="showMovieDetails(\'' + kid + '\')">' +
                '<button class="remove-from-watchlist" onclick="event.stopPropagation(); removeFromWatchlist(\'' + w.id + '\')" title="Убрать">✕</button>' +
                '<div class="poster-wrap">' +
                    (poster ? '<img src="' + escapeHtml(poster) + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';"><div class="no-poster" style="display:none;">🎬</div>' : '<div class="no-poster">🎬</div>') +
                '</div>' +
                '<div class="movie-info"><h3>' + escapeHtml(t) + '</h3></div>' +
            '</div>';
        }).join('');

        const countEl = document.getElementById('watchlist-count');
        if (countEl) countEl.textContent = '(' + data.length + ')';
    } catch (e) { console.error(e); c.innerHTML = '<p>Ошибка загрузки</p>'; }
}

async function removeFromWatchlist(itemId) {
    try {
        await supabaseClient.from('watchlist').delete().eq('id', itemId);
        showNotification('Убрано из списка', 'info');
        loadWatchlist();
    } catch (e) { console.error(e); }
}

async function toggleWatchlistFromModal(movieId, kinopoiskId, btnEl) {
    if (!currentUser) return;
    try {
        const { data: existing } = await supabaseClient
            .from('watchlist')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('movie_id', movieId)
            .maybeSingle();

        if (existing) {
            await supabaseClient.from('watchlist').delete().eq('id', existing.id);
            if (btnEl) { btnEl.classList.remove('active'); btnEl.innerHTML = '📌 Хочу посмотреть'; }
            showNotification('Убрано из списка', 'info');
        } else {
            await supabaseClient.from('watchlist').insert({
                user_id: currentUser.id,
                movie_id: movieId,
                kinopoisk_id: kinopoiskId
            });
            if (btnEl) { btnEl.classList.add('active'); btnEl.innerHTML = '✓ В списке'; }
            showNotification('Добавлено в список!', 'success');
        }
    } catch (e) { console.error(e); }
}

// ============ ОЦЕНЁННЫЕ ============
async function loadRatedMovies() {
    const c = document.getElementById('rated-movies-list');
    if (!c) return;
    c.innerHTML = '<p style="color:#888;">Загрузка...</p>';
    try {
        const { data: allReviews } = await supabaseClient.from('reviews').select('*, movies(name, kinopoisk_id, cover_url), profiles(username)').limit(200);
        const friendIds = await getMyFriendIds();
        const reviews = (allReviews || []).filter(r => canSeeReview(r, friendIds));
        if (!reviews.length) { c.innerHTML = '<p style="color:#888;">Нет оценок</p>'; return; }
        const map = {};
        reviews.forEach(r => {
            const mid = r.movie_id;
            if (!map[mid]) map[mid] = { name: r.movies?.name || 'Фильм', kid: r.movies?.kinopoisk_id || mid, cover: r.movies?.cover_url || '', reviews: [] };
            map[mid].reviews.push(r);
        });
        ratedMoviesData = await Promise.all(Object.values(map).map(async m => {
            const avg = m.reviews.reduce((s, r) => s + r.rating, 0) / m.reviews.length;
            const poster = m.cover || (m.kid ? await getPosterFromAPI(m.kid) : '');
            return { name: m.name, kid: m.kid, poster, avgRating: avg, reviewsCount: m.reviews.length, reviews: m.reviews, lastDate: Math.max(...m.reviews.map(r => new Date(r.created_at || 0).getTime())) };
        }));
        applyRatedSort();
    } catch (e) { console.error(e); c.innerHTML = '<p style="color:#888;">Ошибка загрузки</p>'; }
}

function sortRatedMovies(sortBy) { currentRatedSort = sortBy; applyRatedSort(); }

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
    const countEl = document.getElementById('rated-count');
    if (countEl) countEl.textContent = '(' + movies.length + ')';
    c.innerHTML = movies.map(m => {
        const posterHtml = m.poster
            ? '<img class="rated-poster" src="' + escapeHtml(m.poster) + '" alt="' + escapeHtml(m.name) + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';"><div class="rated-poster" style="display:none;">🎬</div>'
            : '<div class="rated-poster">🎬</div>';
        const reviewsHtml = m.reviews.slice(0, 3).map(r => {
            const text = r.review_text ? escapeHtml(r.review_text) : '';
            const visBadge = r.visibility === 'friends' ? '<span class="visibility-badge friends">🔒 Только друзьям</span>' : '';
            return '<div class="rated-review">' +
                '<span class="review-author">👤 ' + escapeHtml(r.profiles?.username || 'Пользователь') + '</span>' + visBadge +
                '<div class="review-meta"><span class="review-score">' + starEmoji() + ' ' + r.rating + '/10</span><span>' + (r.recommend ? '👍' : '👎') + '</span></div>' +
                (text ? text : '<span style="color:#666;">Без рецензии</span>') +
            '</div>';
        }).join('');
        const moreCount = m.reviews.length - 3;
        const moreHtml = moreCount > 0
            ? '<button class="show-more" onclick="event.stopPropagation(); showMovieDetails(\'' + m.kid + '\')">Ещё ' + moreCount + ' ' + pluralizeOcenka(moreCount).replace(/^\d+\s/, '') + ' →</button>'
            : '';
        return '<div class="rated-card" onclick="showMovieDetails(\'' + m.kid + '\')">' +
            posterHtml +
            '<div class="rated-content">' +
                '<div class="rated-header">' +
                    '<h3 class="rated-title">' + escapeHtml(m.name) + '</h3>' +
                    '<div class="rated-rating-big">' + starEmoji() + ' ' + m.avgRating.toFixed(1) + '</div>' +
                '</div>' +
                '<p class="rated-count">' + pluralizeOcenka(m.reviewsCount) + '</p>' +
                '<div class="rated-reviews">' + reviewsHtml + '</div>' +
                moreHtml +
            '</div>' +
        '</div>';
    }).join('');
}

// ============ ГЛАВНАЯ ============
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
            .from('reviews')
            .select('*, movies(name, kinopoisk_id, cover_url), profiles(username)')
            .order('created_at', { ascending: false })
            .limit(50);

        const friendIds = await getMyFriendIds();
        const reviews = (allReviews || []).filter(r => canSeeReview(r, friendIds));

        if (!reviews.length) { c.innerHTML = '<p>Пока нет оценок</p>'; return; }

        const reviewIds = reviews.map(r => r.id).filter(Boolean);
        const kidList = [...new Set(reviews.map(r => r.movies?.kinopoisk_id || r.movie_id).filter(Boolean))];

        const [reactionsRes, commentsRes, postersEntries] = await Promise.all([
            reviewIds.length
                ? supabaseClient.from('review_reactions').select('review_id, reaction').in('review_id', reviewIds)
                : Promise.resolve({ data: [] }),
            reviewIds.length
                ? supabaseClient.from('review_comments').select('*, profiles(username)').in('review_id', reviewIds)
                : Promise.resolve({ data: [] }),
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
        if (currentReviewsSort === 'popular') {
            sorted.sort((a, b) => (b._likes + b._comments.length * 2) - (a._likes + a._comments.length * 2));
        } else if (currentReviewsSort === 'rating-desc') {
            sorted.sort((a, b) => b.rating - a.rating);
        } else if (currentReviewsSort === 'rating-asc') {
            sorted.sort((a, b) => a.rating - b.rating);
        }

        const html = sorted.slice(0, 10).map(r => buildReviewHTML(r)).join('');
        recentReviewsCache = html;
        c.innerHTML = html;
    } catch (e) { console.error(e); c.innerHTML = '<p>Ошибка загрузки</p>'; }
}

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

function buildReviewHTML(r) {
    const kid = r._kid;
    const ce = canEditReview(r.user_id);
    const commentsHtml = r._comments?.length ?
        '<div class="review-comments" id="comments-list-' + r.id + '">' +
        r._comments.map(cm => buildCommentHTML(cm, r.id)).join('') + '</div>' :
        '<div class="review-comments" id="comments-list-' + r.id + '"></div>';

    const visibilityBadge = r.visibility === 'friends'
        ? '<span class="visibility-badge friends" title="Видно только друзьям автора">🔒 Только друзьям</span>'
        : '';

    return '<div class="review-item" id="review-' + r.id + '">' +
        '<div style="display:flex;gap:16px;">' +
            getPosterHtml(r._poster, r.movies?.name || 'Фильм', '80px', '120px', '1.8rem') +
            '<div style="flex:1;min-width:0;">' +
                '<div class="review-header-row">' +
                    '<span class="review-username">👤 ' + escapeHtml(r.profiles?.username || 'Пользователь') + '</span>' + visibilityBadge +
                    '<div style="display:flex;align-items:center;">' +
                        '<span class="review-rating">' + starEmoji() + ' ' + r.rating + '/10</span>' +
                        '<span class="review-recommend ' + (r.recommend ? 'yes' : 'no') + '">' + (r.recommend ? '👍 Советую' : '👎 Не советую') + '</span>' +
                    '</div>' +
                '</div>' +
                '<h3 class="review-movie-title" onclick="showMovieDetails(\'' + kid + '\')">' + escapeHtml(r.movies?.name || 'Фильм') + '</h3>' +
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
            '<button onclick="editReview(\'' + r.id + '\')">✏️ Редактировать</button>' +
            (isAdmin() ? '<button onclick="toggleReviewVisibility(\'' + r.id + '\')" title="Настроить видимость">' +
                (r.visibility === 'friends' ? '🌍 Открыть всем' : '🔒 Только друзьям') +
            '</button>' : '') +
            '<button class="delete" onclick="deleteReview(\'' + r.id + '\')">🗑 Удалить</button>' +
        '</div>' : '') +
    '</div>';
}

async function toggleReviewVisibility(reviewId) {
    if (!currentUser) return;
    if (!isAdmin()) {
        showNotification('Менять видимость может только админ', 'error');
        return;
    }
    const { data: r } = await supabaseClient
        .from('reviews')
        .select('visibility')
        .eq('id', reviewId)
        .single();
    if (!r) return;
    const newVisibility = r.visibility === 'friends' ? 'public' : 'friends';
    const { error } = await supabaseClient
        .from('reviews')
        .update({ visibility: newVisibility })
        .eq('id', reviewId);
    if (error) {
        showNotification('Ошибка: ' + error.message, 'error');
        return;
    }
    showNotification(
        newVisibility === 'friends' ? '🔒 Видно только друзьям' : '🌍 Видно всем',
        'success'
    );
    recentReviewsCache = null;
    if (currentSection === 'home') loadRecentReviews(true);
    else if (currentSection === 'rated') loadRatedMovies();
    else if (currentSection === 'profile') loadProfile();
}

async function toggleReviewReaction(reviewId, reaction) {
    if (!currentUser) return;
    const likeBtn = document.getElementById('like-count-' + reviewId);
    const dislikeBtn = document.getElementById('dislike-count-' + reviewId);
    if (likeBtn && reaction === 'like') { likeBtn.classList.add('pulse'); setTimeout(() => likeBtn.classList.remove('pulse'), 400); }
    if (dislikeBtn && reaction === 'dislike') { dislikeBtn.classList.add('pulse'); setTimeout(() => dislikeBtn.classList.remove('pulse'), 400); }
    try {
        const { data: existing } = await supabaseClient.from('review_reactions').select('*').eq('review_id', reviewId).eq('user_id', currentUser.id).maybeSingle();
        let isNewReaction = false;
        if (existing) {
            if (existing.reaction === reaction) await supabaseClient.from('review_reactions').delete().eq('id', existing.id);
            else { await supabaseClient.from('review_reactions').update({ reaction }).eq('id', existing.id); isNewReaction = true; }
        } else {
            await supabaseClient.from('review_reactions').insert({ review_id: reviewId, user_id: currentUser.id, reaction });
            isNewReaction = true;
        }
        if (isNewReaction) {
            const { data: review } = await supabaseClient.from('reviews').select('user_id').eq('id', reviewId).single();
            if (review && review.user_id !== currentUser.id) {
                createNotification(review.user_id, 'review', currentUserProfile.username + ' поставил ' + (reaction === 'like' ? '👍' : '👎') + ' вашей рецензии');
            }
        }
        await updateReactionCounters(reviewId);
    } catch (e) { console.error(e); }
}

async function updateReactionCounters(reviewId) {
    const { data } = await supabaseClient.from('review_reactions').select('reaction').eq('review_id', reviewId);
    const likes = data?.filter(x => x.reaction === 'like').length || 0;
    const dislikes = data?.filter(x => x.reaction === 'dislike').length || 0;
    const likeBtn = document.getElementById('like-count-' + reviewId);
    const dislikeBtn = document.getElementById('dislike-count-' + reviewId);
    if (likeBtn) likeBtn.textContent = '👍 ' + likes;
    if (dislikeBtn) dislikeBtn.textContent = '👎 ' + dislikes;
}

function showCommentInput(reviewId) {
    const container = document.getElementById('comment-input-' + reviewId);
    if (!container) return;
    container.innerHTML = '<div class="comment-input-wrap"><input type="text" id="comment-text-' + reviewId + '" placeholder="Написать комментарий..." autocomplete="off"><button onclick="addComment(\'' + reviewId + '\')">Отправить</button></div>';
    document.getElementById('comment-text-' + reviewId)?.focus();
}

function showEditCommentInput(commentId, currentText) {
    if (!isAdmin()) { showNotification('Только админ может редактировать комментарии', 'error'); return; }
    const container = document.getElementById('comment-edit-' + commentId);
    if (!container) return;
    container.innerHTML = '<div class="comment-input-wrap" style="margin-top:6px;"><input type="text" id="edit-comment-text-' + commentId + '" value="' + escapeHtml(currentText) + '"><button onclick="saveEditedComment(\'' + commentId + '\')">💾</button><button onclick="cancelEditComment(\'' + commentId + '\')" style="background:#383842;">✕</button></div>';
}

async function addComment(reviewId) {
    const input = document.getElementById('comment-text-' + reviewId);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    try {
        const { data: newComment, error } = await supabaseClient.from('review_comments').insert({ review_id: reviewId, user_id: currentUser.id, comment_text: text }).select('*, profiles(username)').single();
        if (error || !newComment) return;
        const container = document.getElementById('comments-list-' + reviewId);
        if (container) container.insertAdjacentHTML('beforeend', buildCommentHTML(newComment, reviewId));
        const countBtn = document.getElementById('comment-count-' + reviewId);
        if (countBtn) {
            const currentCount = parseInt(countBtn.dataset.count || countBtn.textContent.replace(/\D/g, '')) || 0;
            const nextCount = currentCount + 1;
            countBtn.dataset.count = String(nextCount);
            countBtn.textContent = '💬 ' + nextCount;
        }
        document.getElementById('comment-input-' + reviewId).innerHTML = '';
        const { data: review } = await supabaseClient.from('reviews').select('user_id').eq('id', reviewId).single();
        if (review && review.user_id !== currentUser.id) {
            createNotification(review.user_id, 'review', currentUserProfile.username + ' прокомментировал вашу рецензию');
        }
    } catch (e) { console.error(e); }
}

function buildCommentHTML(cm, reviewId) {
    return '<div class="comment-item" id="comment-' + cm.id + '">' +
        '<p><strong>' + escapeHtml(cm.profiles?.username || 'Пользователь') + ':</strong> ' + escapeHtml(cm.comment_text) + '</p>' +
        (isAdmin() ? '<div class="comment-actions">' +
            '<button onclick="showEditCommentInput(\'' + cm.id + '\', \'' + escapeForOnclick(cm.comment_text) + '\')" title="Редактировать">✏️</button>' +
            '<button onclick="deleteCommentInstant(\'' + cm.id + '\', \'' + reviewId + '\')" title="Удалить">🗑</button>' +
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
    const commentEl = document.getElementById('comment-' + commentId);
    if (commentEl) {
        const p = commentEl.querySelector('p');
        if (p) {
            const username = p.querySelector('strong')?.textContent?.replace(':', '') || 'Пользователь';
            p.innerHTML = '<strong>' + escapeHtml(username) + ':</strong> ' + escapeHtml(text);
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
        const countBtn = document.getElementById('comment-count-' + reviewId);
        if (countBtn) {
            const currentCount = parseInt(countBtn.dataset.count || countBtn.textContent.replace(/\D/g, '')) || 1;
            const nextCount = Math.max(0, currentCount - 1);
            countBtn.dataset.count = String(nextCount);
            countBtn.textContent = '💬 ' + nextCount;
        }
    });
}

async function editReview(id) {
    const { data: r } = await supabaseClient.from('reviews').select('*').eq('id', id).single();
    if (!r) return;
    currentEditReviewId = id;
    editRating = r.rating;
    editRecommend = r.recommend !== false;
    document.querySelectorAll('#edit-star-rating .star').forEach((s, i) => { s.classList.toggle('active', i < r.rating); s.style.opacity = i < r.rating ? '1' : '0.3'; });
    document.getElementById('edit-rating-display').textContent = r.rating + '/10';
    document.getElementById('edit-review-text').value = r.review_text || '';
    openModal('edit-review-modal');
}

async function saveEditedReview() {
    await supabaseClient.from('reviews').update({ rating: editRating, review_text: document.getElementById('edit-review-text').value.trim() || null, recommend: editRecommend }).eq('id', currentEditReviewId);
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

document.getElementById('review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const movieName = document.getElementById('movie-search').value.trim();
    const rating = selectedRating;
    const reviewText = document.getElementById('review-text').value.trim();
    const kinopoiskId = document.getElementById('selected-movie-id').value;
    const recommend = selectedRecommend;
    if (!movieName || !rating || !kinopoiskId) { showNotification('Поставьте оценку и выберите фильм!', 'error'); return; }
    try {
        const { data: existing } = await supabaseClient.from('movies').select('id').eq('kinopoisk_id', parseInt(kinopoiskId)).maybeSingle();
        let movieId;
        if (existing) movieId = existing.id;
        else {
            const { data: nm } = await supabaseClient.from('movies').insert([{ name: movieName, kinopoisk_id: parseInt(kinopoiskId) }]).select().single();
            if (!nm) throw new Error('Ошибка сохранения фильма');
            movieId = nm.id;
        }
        const { data: er } = await supabaseClient.from('reviews').select('id').eq('user_id', currentUser.id).eq('movie_id', movieId).maybeSingle();
        if (er) {
            await supabaseClient.from('reviews').update({ rating, review_text: reviewText || null, recommend }).eq('id', er.id);
            showNotification('Оценка обновлена!', 'success');
        } else {
            await supabaseClient.from('reviews').insert([{ user_id: currentUser.id, movie_id: movieId, rating, review_text: reviewText || null, recommend, visibility: 'friends' }]);
            showNotification('Оценка добавлена!', 'success');
        }
        resetRateForm();
        recentReviewsCache = null;
        showSection('home');
    } catch (e) { showNotification('Ошибка: ' + e.message, 'error'); }
});

// ============ КОЛЕСО ============
function updateWheelInfo() {
    const info = document.getElementById('wheel-info');
    if (info) info.textContent = '🎬 ' + wheelMovies.length + ' фильмов в колесе';
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
        const { data } = await supabaseClient.functions.invoke('get-movies-by-page', { body: { page: randomPage } });
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
    const centerX = size / 2, centerY = size / 2;
    const radius = size / 2 - 10;
    const segmentAngle = (2 * Math.PI) / wheelMovies.length;
    const colors = ['#e50914', '#007bff', '#28a745', '#ffc107', '#6f42c1', '#fd7e14', '#20c997', '#dc3545'];
    ctx.clearRect(0, 0, size, size);
    wheelMovies.forEach((movie, i) => {
        const startAngle = currentRotation + i * segmentAngle;
        const endAngle = startAngle + segmentAngle;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + segmentAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px Inter, Arial';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        let name = movie.name;
        if (name.length > 18) name = name.substring(0, 16) + '...';
        ctx.fillText(name, radius - 15, 5);
        ctx.restore();
    });
    ctx.beginPath();
    ctx.arc(centerX, centerY, 18, 0, 2 * Math.PI);
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 18);
    gradient.addColorStop(0, '#fff');
    gradient.addColorStop(1, '#ccc');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#e50914';
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
    spinBtn.innerHTML = '⏳ Крутится...';
    const durationInput = document.getElementById('spin-duration');
    const duration = (durationInput ? parseInt(durationInput.value) : 3) * 1000;
    const spins = 6 + Math.random() * 4;
    const targetRotation = currentRotation + spins * 2 * Math.PI;
    const startTime = Date.now();
    const startRotation = currentRotation;
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        currentRotation = startRotation + (targetRotation - startRotation) * easeOut;
        drawWheel();
        if (progress < 1) { requestAnimationFrame(animate); }
        else {
            const segmentAngle = (2 * Math.PI) / wheelMovies.length;
            const normalizedRotation = currentRotation % (2 * Math.PI);
            const arrowAngle = -Math.PI / 2;
            let winningIndex = Math.floor(((arrowAngle - normalizedRotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) / segmentAngle);
            winningIndex = winningIndex % wheelMovies.length;
            const winner = wheelMovies[winningIndex];
            saveWheelResult(winner);
            resultEl.innerHTML = '🎉 Выпало: <strong>' + escapeHtml(winner.name) + '</strong>';
            resultEl.classList.add('winner');
            isSpinning = false;
            spinBtn.disabled = false;
            spinBtn.classList.remove('spinning');
            spinBtn.innerHTML = '🎲 Крутить';
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
            const canDelete = isAdmin();
            return '<div class="wheel-history-item" onclick="showMovieDetails(\'' + (r.kinopoisk_id || r.movie_id) + '\')">' +
                '<div class="history-avatar">' + initial + '</div>' +
                '<div class="history-content">' +
                    '<p class="history-user">' + escapeHtml(username) + '</p>' +
                    '<p class="history-movie">🎬 ' + escapeHtml(r.movie_name) + '</p>' +
                    '<p class="history-time">' + time + '</p>' +
                '</div>' +
                (canDelete ? '<button class="history-delete" onclick="event.stopPropagation(); deleteWheelResult(\'' + r.id + '\')" title="Удалить">🗑</button>' : '') +
            '</div>';
        }).join('');
    } catch (e) { console.error(e); }
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
        document.getElementById('user-search-results').innerHTML = users.map(u => u.id === currentUser.id ? '' : '<div style="padding:10px;background:#1a1a1a;margin-bottom:5px;border-radius:5px;display:flex;justify-content:space-between;"><span>👤 ' + escapeHtml(u.username) + '</span><button onclick="sendFriendRequest(\'' + u.id + '\')" style="background:#28a745;color:white;border:none;padding:5px 15px;border-radius:5px;cursor:pointer;">Добавить</button></div>').join('');
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
    if (!data?.length) { c.innerHTML = '<p>Нет заявок</p>'; return; }
    c.innerHTML = data.map(r => '<div style="padding:10px;background:#1a1a1a;margin-bottom:5px;border-radius:5px;display:flex;justify-content:space-between;"><span>👤 ' + escapeHtml(r.sender?.username || 'Пользователь') + '</span><button onclick="acceptFriendRequest(\'' + r.id + '\',\'' + r.sender_id + '\')" style="background:#28a745;color:white;border:none;padding:5px 10px;border-radius:5px;">Принять</button></div>').join('');
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
    if (!data?.length) { c.innerHTML = '<p>Нет друзей</p>'; return; }
    const friendIds = data.map(f => f.friend_id);
    const [{ data: presenceData }, { data: unreadAll }] = await Promise.all([
        supabaseClient.from('user_presence').select('user_id, last_seen').in('user_id', friendIds),
        supabaseClient.from('private_messages').select('sender_id').eq('receiver_id', currentUser.id).eq('is_read', false).eq('is_deleted', false)
    ]);
    const presenceMap = {};
    presenceData?.forEach(p => { presenceMap[p.user_id] = (Date.now() - Date.parse(p.last_seen)) / 1000 < 120; });
    const unreadMap = {};
    unreadAll?.forEach(m => { unreadMap[m.sender_id] = (unreadMap[m.sender_id] || 0) + 1; });
    c.innerHTML = data.map(f => {
        const isOnline = presenceMap[f.friend_id] || false;
        const unreadFromFriend = unreadMap[f.friend_id] || 0;
        const uname = f.friend?.username || 'Друг';
        return '<div style="padding:10px;background:#1a1a1a;margin-bottom:5px;border-radius:5px;display:flex;justify-content:space-between;align-items:center;">' +
            '<div style="flex:1;cursor:pointer;" onclick="viewUserProfile(\'' + f.friend_id + '\')"><span id="status-' + f.friend_id + '">' + (isOnline ? '🟢' : '⚪') + '</span> <span>👤 ' + escapeHtml(f.friend?.username || 'Пользователь') + '</span>' +
            (unreadFromFriend > 0 ? '<span style="background:#e50914;color:white;border-radius:10px;padding:2px 8px;font-size:0.7rem;margin-left:8px;">' + unreadFromFriend + '</span>' : '') + '</div>' +
            '<button onclick="event.stopPropagation(); openChat(\'' + f.friend_id + '\', \'' + escapeForOnclick(uname) + '\')" style="background:#007bff;color:white;border:none;padding:5px 15px;border-radius:5px;cursor:pointer;">💬</button></div>';
    }).join('');
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
    if (!friendships?.length) { container.innerHTML = '<div class="tg-empty-list">💬<br><br>У вас пока нет друзей</div>'; return; }
    const friendIds = friendships.map(f => f.friend_id);
    const { data: presenceData } = await supabaseClient.from('user_presence').select('user_id, last_seen').in('user_id', friendIds);
    const presenceMap = {};
    presenceData?.forEach(p => { presenceMap[p.user_id] = (Date.now() - Date.parse(p.last_seen)) / 1000 < 120; });
    const { data: lastMessages } = await supabaseClient.from('private_messages').select('*').or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`).order('created_at', { ascending: false }).limit(500);
    const lastMsgMap = {};
    const unreadMap = {};
    (lastMessages || []).forEach(m => {
        const friendId = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id;
        if (!lastMsgMap[friendId]) lastMsgMap[friendId] = m;
        if (m.receiver_id === currentUser.id && !m.is_read && !m.is_deleted) unreadMap[friendId] = (unreadMap[friendId] || 0) + 1;
    });
    allChatFriends = friendships.map(f => ({
        id: f.friend_id,
        username: f.friend?.username || 'Пользователь',
        avatar_url: f.friend?.avatar_url || '',
        isOnline: presenceMap[f.friend_id] || false,
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
    const countEl = document.getElementById('chat-count');
    if (countEl) countEl.textContent = '(' + allChatFriends.length + ')';
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
            else if (f.lastMessage.image_url) preview = (f.lastMessage.sender_id === currentUser.id ? 'Вы: ' : '') + '🖼️ Изображение';
            else if (f.lastMessage.video_url) preview = (f.lastMessage.sender_id === currentUser.id ? 'Вы: ' : '') + '🎬 Видео';
        }
        const time = f.lastMessage ? formatChatTime(f.lastMessage.created_at) : '';
        const unreadBadge = f.unread > 0 ? '<span class="tg-chat-item-badge">' + f.unread + '</span>' : '';
        return '<div class="tg-chat-item' + (currentChatFriend === f.id ? ' active' : '') + '" onclick="openChat(\'' + f.id + '\', \'' + escapeForOnclick(f.username) + '\', \'' + escapeForOnclick(f.avatar_url || '') + '\', ' + f.isOnline + ')">' +
            '<div class="tg-chat-item-avatar">' + avatar + '<div class="online-dot' + (f.isOnline ? ' online' : '') + '"></div></div>' +
            '<div class="tg-chat-item-content">' +
                '<div class="tg-chat-item-row">' +
                    '<span class="tg-chat-item-name">' + escapeHtml(f.username) + '</span>' +
                    '<span class="tg-chat-item-time">' + time + '</span>' +
                '</div>' +
                '<div class="tg-chat-item-preview' + (f.unread > 0 ? ' unread' : '') + '">' + preview + '</div>' +
            '</div>' + unreadBadge +
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
    c.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">Загрузка...</div>';
    if (!messagesCache[fid]) {
        const { data: messages } = await supabaseClient.from('private_messages').select('*').or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${fid}),and(sender_id.eq.${fid},receiver_id.eq.${currentUser.id})`).order('created_at', { ascending: true }).limit(150);
        messagesCache[fid] = (messages || []).filter(m => !m.is_deleted);
    }
    c.innerHTML = '';
    renderMessages(messagesCache[fid]);
    forceScrollToBottom();
    const scrollBtn = document.getElementById('tg-scroll-bottom');
    if (scrollBtn) scrollBtn.style.display = 'none';
    setTimeout(() => document.getElementById('chat-input')?.focus(), 100);
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
    chatFriendsCache = null;
    chatFriendsCacheTime = 0;
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
        const timeDiff = prevTime ? (new Date(m.created_at) - prevTime) / 60000 : 999;
        const grouped = prevSender === m.sender_id && timeDiff < 5;
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
        const replyMsg = messagesCache[currentChatFriend]?.find(x => x.id === m.reply_to);
        if (replyMsg) {
            const replyName = replyMsg.sender_id === currentUser.id ? 'Вы' : currentChatFriendName;
            const replyText = replyMsg.message_text || (replyMsg.image_url ? '🖼️ Изображение' : '🎬 Видео');
            content += '<div class="tg-reply-quote"><span class="rq-name">' + escapeHtml(replyName) + '</span><span class="rq-text">' + escapeHtml(replyText) + '</span></div>';
        }
    }
    if (m.image_url) content += '<img class="tg-msg-image" src="' + escapeHtml(m.image_url) + '" onclick="openLightbox(\'' + escapeForOnclick(m.image_url) + '\')" loading="lazy">';
    else if (m.video_url) content += '<video class="tg-msg-video" src="' + escapeHtml(m.video_url) + '" controls></video>';
    const text = m.message_text ? escapeHtml(m.message_text) : '';
    const time = formatTimeMSK(m.created_at);
    const editedMark = m.edited ? ' <span style="font-size:0.65rem;opacity:0.6;">(изм.)</span>' : '';
    const readStatus = isMy ? '<span class="read">' + (m.is_read ? '✓✓' : '✓') + '</span>' : '';
    content += '<div class="tg-msg-content">' + text + '<span class="tg-msg-meta">' + editedMark + time + ' ' + readStatus + '</span></div>';
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
        '<button onclick="replyToMessage(\'' + msgId + '\'); closeMessageMenu();">↩ Ответить</button>' +
        (isMy ? '<button onclick="editMessage(\'' + msgId + '\'); closeMessageMenu();">✏️ Редактировать</button>' : '') +
        (msg.message_text ? '<button onclick="copyMessageText(\'' + msgId + '\'); closeMessageMenu();">📋 Копировать</button>' : '') +
        (isMy || isAdmin() ? '<button class="danger" onclick="deleteMessage(\'' + msgId + '\'); closeMessageMenu();">🗑 Удалить</button>' : '');
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
    const text = msg.message_text || (msg.image_url ? '🖼️ Изображение' : '🎬 Видео');
    preview.innerHTML = '<div style="flex:1;min-width:0;"><div style="color:#7cb0ff;font-weight:700;font-size:0.78rem;">↩ Ответ ' + escapeHtml(name) + '</div><div class="rp-text">' + escapeHtml(text) + '</div></div><button class="rp-close" onclick="cancelReply()">✕</button>';
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
    const bubble = el.querySelector('.tg-msg-bubble');
    if (bubble) bubble.innerHTML = renderMessageBubble(msg, isMy);
    loadMessageReactions(msg.id);
}

function copyMessageText(msgId) {
    const msg = messagesCache[currentChatFriend]?.find(m => m.id === msgId);
    if (!msg?.message_text) return;
    navigator.clipboard.writeText(msg.message_text).then(() => showNotification('Скопировано!', 'success'));
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
        (data || []).forEach(r => {
            if (byMsg[r.message_id]) byMsg[r.message_id].push(r);
        });
        ids.forEach(id => renderReactionsForMessage(id, byMsg[id]));
    } catch (e) {}
}

function renderReactionsForMessage(messageId, reactions) {
    const container = document.getElementById('reactions-' + messageId);
    if (!container) return;
    if (!reactions || reactions.length === 0) { container.innerHTML = ''; return; }
    const counts = {};
    const myReactions = new Set();
    reactions.forEach(r => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
        if (r.user_id === currentUser.id) myReactions.add(r.emoji);
    });
    container.innerHTML = Object.entries(counts).map(([emoji, count]) =>
        '<span class="tg-reaction' + (myReactions.has(emoji) ? ' mine' : '') + '" onclick="addMessageReaction(\'' + messageId + '\', \'' + emoji + '\')">' + emoji + ' ' + count + '</span>'
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
    const messageData = { sender_id: currentUser.id, receiver_id: currentChatFriend, message_text: text, is_read: false, is_deleted: false };
    if (currentReplyMessage) messageData.reply_to = currentReplyMessage.id;
    const { data, error } = await supabaseClient.from('private_messages').insert([messageData]).select().single();
    if (error) { console.error('Ошибка отправки:', error); showNotification('Ошибка отправки', 'error'); return; }
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
    const scrollBtn = document.getElementById('tg-scroll-bottom');
    if (!scrollBtn) return;
    const isAtBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 100;
    scrollBtn.style.display = isAtBottom ? 'none' : 'flex';
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
        if (idx !== -1) {
            messagesCache[currentChatFriend][idx] = msg;
            updateMessageInDOM(msg);
        }
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
        const badge = document.getElementById('unread-badge');
        if (badge) { badge.textContent = unreadCount; badge.hidden = unreadCount === 0; badge.style.display = unreadCount > 0 ? 'inline-block' : 'none'; }
        const mobileBadge = document.getElementById('unread-badge-mobile');
        if (mobileBadge) { mobileBadge.textContent = unreadCount; mobileBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none'; }
    } catch (e) {}
}

function handleChatKeydown(event) { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } }
function handleTyping() {}
function handleFileSelect(event) { const file = event.target.files[0]; if (file) { sendImage(file); event.target.value = ''; } }
function handleVideoSelect(event) { const file = event.target.files[0]; if (file) { sendVideo(file); event.target.value = ''; } }
function handlePaste(event) {
    const items = event.clipboardData?.items;
    if (items) for (const item of items) if (item.type.startsWith('image/')) { const file = item.getAsFile(); if (file) { event.preventDefault(); sendImage(file); } }
}

async function sendImage(file) {
    if (!file || !currentChatFriend || file.size > 4 * 1024 * 1024) return;
    const fileExt = file.type === 'image/png' ? 'png' : 'jpg';
    const fileName = Date.now() + '-' + Math.random().toString(36).substring(7) + '.' + fileExt;
    try {
        await supabaseClient.storage.from('chat-images').upload(fileName, file);
        const { data: urlData } = supabaseClient.storage.from('chat-images').getPublicUrl(fileName);
        const msgData = { sender_id: currentUser.id, receiver_id: currentChatFriend, message_text: '', image_url: urlData?.publicUrl, is_read: false, is_deleted: false };
        if (currentReplyMessage) msgData.reply_to = currentReplyMessage.id;
        const { data: message } = await supabaseClient.from('private_messages').insert([msgData]).select().single();
        cancelReply();
        if (message) { if (!messagesCache[currentChatFriend]) messagesCache[currentChatFriend] = []; messagesCache[currentChatFriend].push(message); renderMessages(messagesCache[currentChatFriend]); forceScrollToBottom(); }
    } catch (e) {}
}

async function sendVideo(file) {
    if (!file || !currentChatFriend || file.size > 4 * 1024 * 1024) return;
    const fileExt = file.name.split('.').pop() || 'mp4';
    const fileName = Date.now() + '-' + Math.random().toString(36).substring(7) + '.' + fileExt;
    try {
        await supabaseClient.storage.from('chat-images').upload(fileName, file);
        const { data: urlData } = supabaseClient.storage.from('chat-images').getPublicUrl(fileName);
        const msgData = { sender_id: currentUser.id, receiver_id: currentChatFriend, message_text: '', video_url: urlData?.publicUrl, is_read: false, is_deleted: false };
        if (currentReplyMessage) msgData.reply_to = currentReplyMessage.id;
        const { data: message } = await supabaseClient.from('private_messages').insert([msgData]).select().single();
        cancelReply();
        if (message) { if (!messagesCache[currentChatFriend]) messagesCache[currentChatFriend] = []; messagesCache[currentChatFriend].push(message); renderMessages(messagesCache[currentChatFriend]); forceScrollToBottom(); }
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
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
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
    c.innerHTML = '<p>Загрузка...</p>';

    try {
        const { data: reviews } = await supabaseClient
            .from('reviews')
            .select('*, movies(name, kinopoisk_id)')
            .eq('user_id', currentUser.id);

        const { data: friends } = await supabaseClient
            .from('friendships')
            .select('*')
            .eq('user_id', currentUser.id);

        const { data: watchlist } = await supabaseClient
            .from('watchlist')
            .select('id')
            .eq('user_id', currentUser.id);

        const avatar = currentUserProfile?.avatar_url || '';
        const username = currentUserProfile?.username || currentUser.email || 'Пользователь';

        const totalReviews = reviews?.length || 0;
        const avgRating = totalReviews > 0
            ? (reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1)
            : '—';
        const recommendCount = reviews?.filter(r => r.recommend).length || 0;
        const recommendPercent = totalReviews > 0
            ? Math.round((recommendCount / totalReviews) * 100)
            : 0;

        const genreCounts = {};
        const kidList = [...new Set((reviews || []).map(r => r.movies?.kinopoisk_id).filter(Boolean))];
        const moviesData = await Promise.all(kidList.map(kid => getKinopoiskMovie(kid)));
        moviesData.forEach(md => {
            (md?.genres || []).forEach(g => {
                genreCounts[g.genre] = (genreCounts[g.genre] || 0) + 1;
            });
        });
        const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

        const distribution = {};
        for (let i = 1; i <= 10; i++) distribution[i] = 0;
        reviews?.forEach(r => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });
        const maxCount = Math.max(...Object.values(distribution), 1);

        const distributionHTML = '<div class="rating-distribution">' +
            '<h3>📊 Распределение оценок</h3>' +
            '<div class="rating-bars">' +
            Object.entries(distribution).map(([rating, count]) => {
                const height = (count / maxCount) * 100;
                return '<div class="rating-bar">' +
                    '<div class="bar-count">' + (count || '') + '</div>' +
                    '<div class="bar" style="height:' + (count > 0 ? Math.max(height, 5) : 2) + '%"></div>' +
                    '<div class="bar-label">' + rating + '</div>' +
                '</div>';
            }).join('') +
            '</div></div>';

        const topGenresHTML = topGenres.length
            ? '<div class="rating-distribution">' +
                '<h3>🎭 Любимые жанры</h3>' +
                '<div class="genre-badges">' +
                topGenres.map(([name, count]) =>
                    '<span class="genre-badge">' + escapeHtml(name) + '<span class="count">× ' + count + '</span></span>'
                ).join('') +
                '</div></div>'
            : '';

        const themeSelectorHTML = isAdmin() ?
            '<div style="background:#222;padding:20px;border-radius:10px;margin-top:15px;">' +
                '<h3 style="margin-bottom:8px;">🎨 Тема сайта</h3>' +
                '<p style="color:#888;font-size:0.85rem;margin:0 0 14px;">Выбранная тема применится <strong>у всех пользователей</strong> мгновенно</p>' +
                '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                    '<button onclick="changeGlobalTheme(\'default\')" class="theme-pick-btn' + (currentGlobalTheme === 'default' ? ' active' : '') + '">🎬 Обычная</button>' +
                    '<button onclick="changeGlobalTheme(\'halloween\')" class="theme-pick-btn' + (currentGlobalTheme === 'halloween' ? ' active' : '') + '">🎃 Хэллоуин</button>' +
                    '<button onclick="changeGlobalTheme(\'newyear\')" class="theme-pick-btn' + (currentGlobalTheme === 'newyear' ? ' active' : '') + '">🎄 Новогодняя</button>' +
                '</div>' +
            '</div>'
            : '';

        c.innerHTML =
            '<div style="background:#1a1a1a;padding:30px;border-radius:15px;text-align:center;">' +
                '<div style="width:100px;height:100px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:3rem;overflow:hidden;cursor:pointer;" onclick="document.getElementById(\'avatar-upload\').click()">' +
                (avatar ? '<img src="' + escapeHtml(avatar) + '" style="width:100%;height:100%;object-fit:cover;" loading="lazy">' : '👤') +
                '</div>' +
                '<input type="file" id="avatar-upload" accept="image/*" style="display:none;" onchange="uploadAvatar(event)">' +
                '<h2>' + escapeHtml(username) + '</h2>' +

                '<div class="profile-stats">' +
                    '<div class="stat-card accent"><div class="stat-value">' + totalReviews + '</div><div class="stat-label">Оценок</div></div>' +
                    '<div class="stat-card"><div class="stat-value">' + avgRating + '</div><div class="stat-label">Средняя оценка</div></div>' +
                    '<div class="stat-card green"><div class="stat-value">' + recommendPercent + '%</div><div class="stat-label">Советует</div></div>' +
                    '<div class="stat-card blue"><div class="stat-value">' + (friends?.length || 0) + '</div><div class="stat-label">Друзей</div></div>' +
                    '<div class="stat-card"><div class="stat-value">' + (watchlist?.length || 0) + '</div><div class="stat-label">Хочу посмотреть</div></div>' +
                '</div>' +

                distributionHTML +
                topGenresHTML +

                '<div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:15px;">' +
                    '<div style="background:#222;padding:20px;border-radius:10px;">' +
                        '<h3 style="margin-bottom:14px;">✏️ Сменить ник</h3>' +
                        '<input type="text" id="new-username" value="' + escapeHtml(username) + '" autocomplete="off" style="width:100%;padding:10px;background:#1a1a1a;border:1px solid #333;border-radius:5px;color:#fff;margin-bottom:10px;">' +
                        '<button onclick="changeUsername()" style="background:#007bff;color:white;border:none;padding:10px;border-radius:5px;cursor:pointer;">Сохранить</button>' +
                    '</div>' +
                    '<div style="background:#222;padding:20px;border-radius:10px;">' +
                        '<h3 style="margin-bottom:14px;">🔒 Сменить пароль</h3>' +
                        '<input type="password" id="old-password" placeholder="Текущий пароль" autocomplete="off" style="width:100%;padding:10px;background:#1a1a1a;border:1px solid #333;border-radius:5px;color:#fff;margin-bottom:10px;">' +
                        '<input type="password" id="new-password" placeholder="Новый пароль" autocomplete="off" style="width:100%;padding:10px;background:#1a1a1a;border:1px solid #333;border-radius:5px;color:#fff;margin-bottom:10px;">' +
                        '<button onclick="changePassword()" style="background:#dc3545;color:white;border:none;padding:10px;border-radius:5px;cursor:pointer;">Сменить</button>' +
                    '</div>' +
                '</div>' +

                themeSelectorHTML +
            '</div>';
    } catch (e) {
        console.error(e);
        c.innerHTML = '<p>Ошибка загрузки профиля</p>';
    }
}

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
    const fileExt = file.type === 'image/png' ? 'png' : 'jpg';
    const fileName = currentUser.id + '-' + Date.now() + '.' + fileExt;
    try {
        await supabaseClient.storage.from('avatars').upload(fileName, file, { upsert: true });
        const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(fileName);
        await supabaseClient.from('profiles').update({ avatar_url: urlData?.publicUrl }).eq('id', currentUser.id);
        currentUserProfile.avatar_url = urlData?.publicUrl;
        loadProfile();
    } catch (e) {}
}

async function changeUsername() {
    const newName = document.getElementById('new-username').value.trim();
    if (!newName) return;
    await supabaseClient.from('profiles').update({ username: newName }).eq('id', currentUser.id);
    currentUserProfile.username = newName;
    document.getElementById('user-name-display').textContent = newName;
    loadProfile();
}

async function changePassword() {
    const oldPass = document.getElementById('old-password').value;
    const newPass = document.getElementById('new-password').value;
    if (!oldPass || !newPass) { showNotification('Заполните оба поля', 'error'); return; }
    if (newPass.length < 6) { showNotification('Пароль минимум 6 символов', 'error'); return; }
    const { error } = await supabaseClient.auth.signInWithPassword({ email: currentUser.email, password: oldPass });
    if (error) { showNotification('Неверный пароль', 'error'); return; }
    const { error: updErr } = await supabaseClient.auth.updateUser({ password: newPass });
    if (updErr) { showNotification('Ошибка: ' + updErr.message, 'error'); return; }
    showNotification('Пароль изменен!', 'success');
}

async function viewUserProfile(userId) {
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
    if (!profile) return;
    const { data: allReviews } = await supabaseClient.from('reviews').select('*, movies(name)').eq('user_id', userId);
    const friendIds = await getMyFriendIds();
    const reviews = (allReviews || []).filter(r => canSeeReview(r, friendIds));
    document.getElementById('user-profile-body').innerHTML = '<div style="text-align:center;"><div style="width:80px;height:80px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:2.5rem;overflow:hidden;">' + (profile.avatar_url ? '<img src="' + escapeHtml(profile.avatar_url) + '" style="width:100%;height:100%;object-fit:cover;" loading="lazy">' : '👤') + '</div><h2>' + escapeHtml(profile.username || 'Пользователь') + '</h2></div><div style="margin-top:20px;"><h3>Оценки (' + (reviews?.length || 0) + '):</h3>' + (reviews?.length ? reviews.map(r => '<div style="background:#222;padding:10px;border-radius:5px;margin-top:5px;">🎬 ' + escapeHtml(r.movies?.name || 'Фильм') + ' — ' + starEmoji() + ' ' + r.rating + '/10' + (r.visibility === 'friends' ? ' <span class="visibility-badge friends">🔒 Только друзьям</span>' : '') + '</div>').join('') : '<p>Нет оценок</p>') + '</div>';
    openModal('user-profile-modal');
}

// ============ ИИ ЧАТ ============
function showAIWelcomeMessage() {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;
    container.innerHTML = '';
    const welcomeMessage = `🤖 Привет! Я ИИ-помощник Киноклуба.\n\nЯ умею отвечать на вопросы:\n\n📊 Про оценки:\n• "Какие фильмы оценил [имя]?"\n• "Какой фильм оценил [имя] лучше всех?"\n• "Какой фильм у [имя] худший?"\n• "Покажи мои оценки"\n\n🎬 Про фильмы:\n• "Расскажи о фильме [название]"\n• "Топ фильмов"\n\n📈 Статистика:\n• "Покажи статистику"\n\n👥 Пользователи:\n• "Кто зарегистрирован?"\n\nПросто напишите свой вопрос!`;
    addAIMessage('assistant', formatAIResponse(welcomeMessage));
}

async function sendAIMessage() {
    const input = document.getElementById('ai-chat-input');
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    input.disabled = true;
    addAIMessage('user', message);
    const loadingId = addAIMessage('assistant', '⏳ Думаю...', true);
    try {
        const { data, error } = await supabaseClient.functions.invoke('ai-chat', { body: { message, userId: currentUser?.id || null } });
        removeAIMessage(loadingId);
        if (error) addAIMessage('assistant', '❌ Ошибка: ' + (error.message || 'Неизвестная ошибка'));
        else if (data?.answer) addAIMessage('assistant', formatAIResponse(data.answer));
        else addAIMessage('assistant', '🤔 Не удалось получить ответ.');
    } catch (error) {
        removeAIMessage(loadingId);
        addAIMessage('assistant', '❌ Ошибка соединения.');
    }
    input.disabled = false;
    input.focus();
}

function addAIMessage(role, content, isLoading = false) {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;
    const welcome = container.querySelector('div[style*="text-align:center"]');
    if (welcome) welcome.remove();
    const id = 'ai-msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    const div = document.createElement('div');
    div.id = id;
    div.className = 'ai-message';
    div.style.cssText = 'margin-bottom:12px;text-align:' + (role === 'user' ? 'right' : 'left') + ';animation: fadeIn 0.3s ease;';
    div.innerHTML = '<div style="display:inline-block;max-width:85%;"><div style="display:inline-block;background:' + (role === 'user' ? '#007bff' : '#1e1e26') + ';padding:10px 16px;border-radius:' + (role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px') + ';word-wrap:break-word;text-align:left;line-height:1.7;border:1px solid ' + (role === 'user' ? 'transparent' : '#2d2d35') + ';font-size:0.95rem;white-space:pre-wrap;">' + (isLoading ? '<span class="loading-dots">⏳</span>' : content) + '</div><div style="font-size:0.7rem;color:#666;margin-top:4px;text-align:' + (role === 'user' ? 'right' : 'left') + ';">' + (role === 'user' ? 'Вы' : '🤖 ИИ') + ' • ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + '</div></div>';
    container.appendChild(div);
    setTimeout(() => { container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }); }, 100);
    if (isLoading) {
        const dots = div.querySelector('.loading-dots');
        let count = 0;
        div._interval = setInterval(() => { count = (count + 1) % 4; dots.textContent = '⏳' + '.'.repeat(count); }, 350);
    }
    return id;
}

function formatAIResponse(text) {
    if (!text) return '';
    return text.split('\n').map(line => {
        if (/^(📊|🎬|👥|🏆|⭐|💬|👍|👎|📝|📅|📈|👤)/.test(line.trim())) return '<strong>' + escapeHtml(line) + '</strong>';
        if (/^\d+\./.test(line.trim())) return '&nbsp;&nbsp;' + escapeHtml(line);
        if (/^[•·]/.test(line.trim())) return '&nbsp;&nbsp;' + escapeHtml(line);
        if (!line.trim()) return '<br>';
        return escapeHtml(line);
    }).join('<br>');
}

function removeAIMessage(id) {
    const el = document.getElementById(id);
    if (el) { if (el._interval) clearInterval(el._interval); el.remove(); }
}

function clearAIChat() {
    const container = document.getElementById('ai-chat-messages');
    if (container) container.innerHTML = '<div style="text-align:center;color:#888;padding:40px 0;">🤖 Задайте вопрос о фильмах, оценках или пользователях!</div>';
}

// ============ ТЕМА ============
async function loadGlobalTheme() {
    try {
        const { data } = await supabaseClient
            .from('app_settings')
            .select('value')
            .eq('key', 'active_theme')
            .maybeSingle();
        const theme = data?.value || 'default';
        applyGlobalTheme(theme);
    } catch (e) {
        console.error('Load theme error:', e);
    }
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
    // 1. Статические <span data-star> в HTML
    document.querySelectorAll('[data-star]').forEach(el => {
        el.textContent = starEmoji();
    });

    if (!currentUser) return;

    // 2. Динамические секции
    if (currentSection === 'home') {
        recentReviewsCache = null;
        loadRecentReviews(true);
    } else if (currentSection === 'rated') {
        applyRatedSort();
    } else if (currentSection === 'movies') {
        const cacheKey = currentCategoryFilter || 'all';
        const cached = moviesCache[cacheKey] || [];
        if (cached.length) renderMovies(cached);
    } else if (currentSection === 'watchlist') {
        loadWatchlist();
    } else if (currentSection === 'wheel') {
        loadWheelHistory();
    } else if (currentSection === 'profile') {
        // перерисуется при следующем заходе — здесь просто обновляем стату кнопки темы, если она есть
    }
}

function subscribeToTheme() {
    if (themeChannel) {
        supabaseClient.removeChannel(themeChannel);
        themeChannel = null;
    }
    themeChannel = supabaseClient.channel('app-theme-' + Date.now())
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'app_settings',
            filter: 'key=eq.active_theme'
        }, (payload) => {
            applyGlobalTheme(payload.new.value);
        })
        .subscribe();
}

async function changeGlobalTheme(theme) {
    if (!isAdmin()) {
        showNotification('Только админ может менять тему', 'error');
        return;
    }
    const { error } = await supabaseClient
        .from('app_settings')
        .update({ value: theme, updated_at: new Date().toISOString() })
        .eq('key', 'active_theme');
    if (error) {
        showNotification('Ошибка: ' + error.message, 'error');
        return;
    }
    applyGlobalTheme(theme);
    const labels = { default: 'Обычная', halloween: '🎃 Хэллоуин', newyear: '🎄 Новогодняя' };
    showNotification('Тема для всех: ' + labels[theme], 'success');
    // перерисовать профиль, чтобы подсветить активную кнопку
    if (currentSection === 'profile') loadProfile();
}