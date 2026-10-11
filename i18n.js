// ============ ПЕРЕВОДЫ ИНТЕРФЕЙСА ============
const I18N = {
  ru: {
    // Навигация
    nav_home: 'Главная',
    nav_rated: 'Оценённые',
    nav_recent: 'Недавние',
    nav_watchlist: 'Хочу посмотреть',
    nav_chat: 'Чат',
    nav_wheel: 'Колесо',
    nav_friends: 'Друзья',
    nav_watched: 'Просмотренные',

    // Меню профиля
    profile_my: 'Мой профиль',
    profile_friends: 'Друзья',
    profile_wheel: 'Колесо',
    profile_watched: 'Просмотренные',
    profile_admin: 'Админ-панель',
    profile_logout: 'Выйти',

    // Заголовки страниц
    page_movies_eyebrow: 'Каталог',
    page_home_eyebrow: 'Лента киноклуба',
    page_home_title: 'Недавние',
    page_watchlist_eyebrow: 'Закладки',
    page_watchlist_title: 'Хочу посмотреть',
    page_watched_eyebrow: 'Личная история',
    page_watched_title: 'Просмотренные',
    page_rated_eyebrow: 'Мнения участников',
    page_rated_title: 'Оценённые фильмы',
    page_wheel_eyebrow: 'Выбор на вечер',
    page_wheel_title: 'Колесо фильмов',
    page_friends_eyebrow: 'Ваше окружение',
    page_friends_title: 'Друзья',
    page_profile_eyebrow: 'Настройки аккаунта',
    page_profile_title: 'Профиль',
    page_chat_eyebrow: 'Личные сообщения',
    page_chat_title: 'Чат',
    page_admin_eyebrow: 'Панель управления',
    page_admin_title: 'Админ-панель',

    // Каталог
    catalog_popular: 'Популярное',
    catalog_top250: 'Топ-250',
    catalog_await: 'Ожидаемые',
    catalog_series: 'Сериалы',
    catalog_cartoons: 'Мультики',

    // Поиск
    search_movies: 'Поиск фильмов...',
    search_rated: 'Найти фильм среди оценённых...',
    search_home: 'Проверить оценку фильма...',
    search_chat: 'Поиск...',

    // Кнопки
    btn_more: 'Подробнее',
    btn_watch: '▶ Смотреть',
    btn_rate: 'Оценить',
    btn_watched: '✅ Просмотрено',
    btn_mark: '👁 Отметить',
    btn_want: '☆ Хочу посмотреть',
    btn_wanted: '★ В списке',
    btn_back: 'Назад',
    btn_spin: 'Крутить',
    btn_new_movies: 'Новые фильмы',

    // Секции страницы фильма
    section_trailers: 'Трейлеры',
    section_cast: 'Актёрский состав',
    section_reviews: 'Отзывы',
    section_related: 'Связанные фильмы',

    // Сайдбар
    side_your_club: 'Ваш Киноклуб',
    side_your_club_text: 'Оценивайте фильмы, делитесь впечатлениями и выбирайте, что посмотреть вечером.',
    side_quick: 'Быстрые действия',
    side_catalog: 'Открыть каталог',
    side_watchlist: 'Хочу посмотреть',
    side_random: 'Случайный фильм',

    // Друзья
    friends_find: 'Найти пользователя',
    friends_requests: 'Заявки',
    friends_my: 'Мои друзья',
    friends_search_placeholder: 'Введите имя…',

    // Авторизация
    auth_login: 'Вход',
    auth_register: 'Регистрация',
    auth_login_title: 'Вход в аккаунт',
    auth_login_desc: 'Рады видеть вас снова',
    auth_register_title: 'Создать аккаунт',
    auth_register_desc: 'Это займёт меньше минуты',
    auth_email: 'Email или ник',
    auth_password: 'Пароль',
    auth_nick: 'Ник',
    auth_email_label: 'Email',
    auth_password2: 'Повторите пароль',
    auth_login_btn: 'Войти',
    auth_register_btn: 'Создать аккаунт',
    auth_hero_text: 'Оценивайте фильмы, делитесь мнением и следите за тем, что смотрят друзья.',
    auth_hero_title: 'Кино, которое объединяет',

    // Заголовки модалок
    modal_rate_title: 'Оценить фильм',
    modal_edit_review: 'Редактировать рецензию',
    modal_notifications: 'Уведомления',
    modal_confirm: 'Подтверждение',

    // Чат
    chat_empty: 'Выберите чат, чтобы начать общение',
    chat_input_placeholder: 'Написать сообщение...',
    chat_no_friends: 'У вас пока нет друзей',

    // Прочее
    loading: 'Загрузка…',
    updated: 'Обновлено',
  },

  en: {
    // Navigation
    nav_home: 'Home',
    nav_rated: 'Rated',
    nav_recent: 'Recent',
    nav_watchlist: 'Watchlist',
    nav_chat: 'Chat',
    nav_wheel: 'Wheel',
    nav_friends: 'Friends',
    nav_watched: 'Watched',

    // Profile menu
    profile_my: 'My profile',
    profile_friends: 'Friends',
    profile_wheel: 'Wheel',
    profile_watched: 'Watched',
    profile_admin: 'Admin panel',
    profile_logout: 'Log out',

    // Page headings
    page_movies_eyebrow: 'Catalog',
    page_home_eyebrow: 'Club feed',
    page_home_title: 'Recent',
    page_watchlist_eyebrow: 'Bookmarks',
    page_watchlist_title: 'Watchlist',
    page_watched_eyebrow: 'Your history',
    page_watched_title: 'Watched',
    page_rated_eyebrow: 'Member opinions',
    page_rated_title: 'Rated movies',
    page_wheel_eyebrow: 'Pick for tonight',
    page_wheel_title: 'Movie wheel',
    page_friends_eyebrow: 'Your circle',
    page_friends_title: 'Friends',
    page_profile_eyebrow: 'Account settings',
    page_profile_title: 'Profile',
    page_chat_eyebrow: 'Direct messages',
    page_chat_title: 'Chat',
    page_admin_eyebrow: 'Control panel',
    page_admin_title: 'Admin panel',

    // Catalog
    catalog_popular: 'Popular',
    catalog_top250: 'Top-250',
    catalog_await: 'Upcoming',
    catalog_series: 'TV Series',
    catalog_cartoons: 'Cartoons',

    // Search
    search_movies: 'Search movies...',
    search_rated: 'Find a rated movie...',
    search_home: 'Check a movie rating...',
    search_chat: 'Search...',

    // Buttons
    btn_more: 'More',
    btn_watch: '▶ Watch',
    btn_rate: 'Rate',
    btn_watched: '✅ Watched',
    btn_mark: '👁 Mark',
    btn_want: '☆ Want to watch',
    btn_wanted: '★ In list',
    btn_back: 'Back',
    btn_spin: 'Spin',
    btn_new_movies: 'New movies',

    // Film page sections
    section_trailers: 'Trailers',
    section_cast: 'Cast',
    section_reviews: 'Reviews',
    section_related: 'Related movies',

    // Sidebar
    side_your_club: 'Your Cinema Club',
    side_your_club_text: 'Rate movies, share your opinion and pick what to watch tonight.',
    side_quick: 'Quick actions',
    side_catalog: 'Open catalog',
    side_watchlist: 'Watchlist',
    side_random: 'Random movie',

    // Friends
    friends_find: 'Find a user',
    friends_requests: 'Requests',
    friends_my: 'My friends',
    friends_search_placeholder: 'Enter a name…',

    // Auth
    auth_login: 'Log in',
    auth_register: 'Sign up',
    auth_login_title: 'Log in',
    auth_login_desc: 'Glad to see you again',
    auth_register_title: 'Create account',
    auth_register_desc: 'Takes less than a minute',
    auth_email: 'Email or nickname',
    auth_password: 'Password',
    auth_nick: 'Nickname',
    auth_email_label: 'Email',
    auth_password2: 'Repeat password',
    auth_login_btn: 'Log in',
    auth_register_btn: 'Create account',
    auth_hero_text: 'Rate movies, share your opinion and follow what your friends watch.',
    auth_hero_title: 'Cinema that unites',

    // Modal titles
    modal_rate_title: 'Rate movie',
    modal_edit_review: 'Edit review',
    modal_notifications: 'Notifications',
    modal_confirm: 'Confirm',

    // Chat
    chat_empty: 'Select a chat to start messaging',
    chat_input_placeholder: 'Write a message...',
    chat_no_friends: 'You have no friends yet',

    // Misc
    loading: 'Loading…',
    updated: 'Updated',
  }
};

let currentLang = (function () {
  try { return localStorage.getItem('lang') || 'ru'; } catch (e) { return 'ru'; }
})();

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || (I18N.ru && I18N.ru[key]) || key;
}

function setLang(lang) {
  if (!I18N[lang]) return;
  currentLang = lang;
  try { localStorage.setItem('lang', lang); } catch (e) {}
  applyLanguage();
}

function toggleLang() {
  setLang(currentLang === 'ru' ? 'en' : 'ru');

  // Страница фильма
  if (window.currentSection === 'film-page' && window.currentFilmId) {
    if (typeof showFilmPage === 'function') showFilmPage(window.currentFilmId);
  }
  // Лента
  if (window.currentSection === 'home' && typeof loadRecentReviews === 'function') {
    window.recentReviewsCache = null;
    window.loadRecentReviews(true);
  }
  // Каталог + hero
  if (window.currentSection === 'movies') {
    if (typeof loadHeroBanner === 'function') loadHeroBanner();
    if (typeof loadCatalogRows === 'function') {
      // сбрасываем пагинацию
      if (window.rowState) {
        Object.keys(window.rowState).forEach(k => delete window.rowState[k]);
      }
      loadCatalogRows();
    }
  }
  // Колесо
  if (window.currentSection === 'wheel') {
    if (typeof loadWheelMovies === 'function') {
      window.wheelMovies = [];
      loadWheelMovies();
    }
  }
  // Оценённые (постеры)
  if (window.currentSection === 'rated' && typeof loadRatedMovies === 'function') {
    window.ratedMoviesData = [];
    loadRatedMovies();
  }
}

function applyLanguage() {
  // data-i18n → textContent
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  // data-i18n-placeholder → placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  // data-i18n-title → title
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key);
  });
  // Переключатель
  const toggle = document.getElementById('lang-toggle');
  if (toggle) toggle.textContent = currentLang === 'ru' ? 'EN' : 'RU';
  // Язык страницы
  document.documentElement.setAttribute('lang', currentLang);
  // Заголовок вкладки
  if (currentLang === 'en') {
    document.title = 'KinoClub — ratings, reviews and picks | kinoclab.online';
  } else {
    document.title = 'Киноклуб — оценки фильмов, рецензии и подборки | kinoclab.online';
  }
}