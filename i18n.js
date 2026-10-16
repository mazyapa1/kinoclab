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
    page_wheel_history: 'История выпадений',
    page_friends_eyebrow: 'Ваше окружение',
    page_friends_title: 'Друзья',
    page_profile_eyebrow: 'Настройки аккаунта',
    page_profile_title: 'Профиль',
    page_chat_eyebrow: 'Личные сообщения',
    page_chat_title: 'Чат',
    page_admin_eyebrow: 'Панель управления',
    page_admin_title: 'Админ-панель',
    catalog_halloween: '🎃 Хэллоуин',

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
    btn_spinning: 'Крутится...',
    btn_new_movies: 'Новые фильмы',
    btn_save: 'Сохранить',
    btn_cancel: 'Отмена',
    btn_delete: 'Удалить',
    btn_close: 'Закрыть',

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
    auth_ph_nick: 'Ваш ник',
    auth_ph_email: 'example@mail.ru',
    auth_ph_password: 'Минимум 6 символов',
    auth_ph_password2: 'Повторите пароль',
    auth_link_policy: 'Политика конфиденциальности',
    auth_link_support: 'Связаться с поддержкой',
    brand_name: 'Киноклуб',

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

        // Модалка оценки
    rate_modal_title: 'Оценить',
    rate_modal_rating: 'Оценка',
    rate_modal_recommend: 'Рекомендация',
    rate_modal_review: 'Рецензия',
    rate_modal_optional: 'необязательно',
    rate_modal_review_ph: 'Что вы думаете о фильме?',
    rate_modal_publish: 'Опубликовать',
    rate_modal_update: 'Обновить',
    rate_modal_cancel: 'Отмена',
    rate_modal_save: 'Сохранить',

    // Связанные фильмы
    seq_title: 'Связанные фильмы',
    seq_sequel: 'Сиквел',
    seq_prequel: 'Приквел',
    seq_remake: 'Ремейк',
    seq_spinoff: 'Спин-офф',
    seq_related: 'Связанный',

    // Сортировки
    sort_all: 'Все',
    sort_fresh: 'Свежие',
    sort_popular: 'Популярные',
    sort_high: 'Высокий рейтинг',
    sort_low: 'Низкий рейтинг',
    sort_rating_down: 'Рейтинг ↓',
    sort_rating_up: 'Рейтинг ↑',
    sort_more_reviews: 'Больше оценок',
    sort_new: 'Новые',

    // Колесо
    wheel_count: 'фильмов в колесе',
    wheel_sec: 'сек',
    wheel_history_empty: 'Пока никто не крутил колесо',
    wheel_won: 'Выпало',
    wheel_delete: 'Удалить результат?',

    // Подтверждения
    confirm_delete_review: 'Удалить рецензию?',
    confirm_delete_comment: 'Удалить комментарий?',
    confirm_delete_wheel: 'Удалить результат?',
    confirm_yes_delete: 'Да, удалить',

    // Разное
    list_empty: 'Список пуст',
    no_ratings: 'Пока нет оценок',
    no_rated: 'Нет оценок',
    no_friends: 'Нет друзей',
    no_requests: 'Нет заявок',
    no_notifications: 'Нет уведомлений',
    no_users: 'Нет пользователей',
    loading_text: 'Загрузка…',
    loading_film: 'Загрузка фильма…',
    error_loading: 'Ошибка загрузки',
    min_short: 'мин',
    rating_source_kp: 'Кинопоиск',
    rating_source_tmdb: 'TMDB',
    film_back: 'Назад',
        tost_watched: 'Отмечено как просмотрено',
    tost_unwatched: 'Убрано из просмотренных',
    tost_added_wl: 'Добавлено в список',
    tost_removed_wl: 'Убрано из списка',
    tost_copied: 'Скопировано',
    tost_saved: 'Сохранено',
    tost_error: 'Ошибка',
    tost_load_error: 'Ошибка загрузки',
    tost_send_error: 'Ошибка отправки',
    tost_request_sent: 'Заявка отправлена',
    tost_request_exists: 'Заявка уже отправлена',
    tost_pass_changed: 'Пароль изменён',
    tost_wrong_pass: 'Неверный пароль',
    tost_fill_both: 'Заполните оба поля',
    tost_pass_short: 'Пароль минимум 6 символов',
    tost_rating_needed: 'Поставьте оценку',
    tost_rating_added: 'Оценка добавлена',
    tost_rating_updated: 'Оценка обновлена',
    tost_film_save_error: 'Ошибка сохранения фильма',
    tost_load_film_error: 'Не удалось загрузить фильм',
    tost_visible_all: 'Видно всем',
    tost_visible_friends: 'Видно только друзьям',
    tost_admin_only: 'Только админ может менять тему',
    tost_theme_changed: 'Тема для всех:',
    tost_theme_default: 'Обычная',
    tost_theme_halloween: 'Хэллоуин',
    tost_theme_newyear: 'Новогодняя',
    auth_consent_label: 'Я согласен на обработку персональных данных и принимаю',
    auth_consent_policy: 'Политику конфиденциальности',
    auth_consent_required: 'Необходимо согласие на обработку персональных данных',
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
    catalog_halloween: '🎃 Halloween',

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
    page_wheel_history: 'Spin history',
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
    btn_spinning: 'Spinning...',
    btn_new_movies: 'New movies',
    btn_save: 'Save',
    btn_cancel: 'Cancel',
    btn_delete: 'Delete',
    btn_close: 'Close',

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
    auth_ph_nick: 'Your nickname',
    auth_ph_email: 'example@mail.ru',
    auth_ph_password: 'At least 6 characters',
    auth_ph_password2: 'Repeat password',
    auth_link_policy: 'Privacy Policy',
    auth_link_support: 'Contact support',
    brand_name: 'KinoClub',
    auth_consent_label: 'I agree to the processing of personal data and accept the',
    auth_consent_policy: 'Privacy Policy',
    auth_consent_required: 'Consent to personal data processing is required',

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

        // Rate modal
    rate_modal_title: 'Rate',
    rate_modal_rating: 'Rating',
    rate_modal_recommend: 'Recommendation',
    rate_modal_review: 'Review',
    rate_modal_optional: 'optional',
    rate_modal_review_ph: 'What do you think about the movie?',
    rate_modal_publish: 'Publish',
    rate_modal_update: 'Update',
    rate_modal_cancel: 'Cancel',
    rate_modal_save: 'Save',

    // Related movies
    seq_title: 'Related movies',
    seq_sequel: 'Sequel',
    seq_prequel: 'Prequel',
    seq_remake: 'Remake',
    seq_spinoff: 'Spin-off',
    seq_related: 'Related',

    // Sorts
    sort_all: 'All',
    sort_fresh: 'Fresh',
    sort_popular: 'Popular',
    sort_high: 'High rating',
    sort_low: 'Low rating',
    sort_rating_down: 'Rating ↓',
    sort_rating_up: 'Rating ↑',
    sort_more_reviews: 'Most reviewed',
    sort_new: 'New',

    // Wheel
    wheel_count: 'movies on the wheel',
    wheel_sec: 's',
    wheel_history_empty: 'Nobody spun the wheel yet',
    wheel_won: 'Picked',
    wheel_delete: 'Delete result?',

    // Confirmations
    confirm_delete_review: 'Delete review?',
    confirm_delete_comment: 'Delete comment?',
    confirm_delete_wheel: 'Delete result?',
    confirm_yes_delete: 'Yes, delete',

    // Misc
    list_empty: 'List is empty',
    no_ratings: 'No ratings yet',
    no_rated: 'No ratings',
    no_friends: 'No friends',
    no_requests: 'No requests',
    no_notifications: 'No notifications',
    no_users: 'No users',
    loading_text: 'Loading…',
    loading_film: 'Loading movie…',
    error_loading: 'Load error',
    min_short: 'min',
    rating_source_kp: 'Kinopoisk',
    rating_source_tmdb: 'TMDB',
    film_back: 'Back',

        tost_watched: 'Marked as watched',
    tost_unwatched: 'Removed from watched',
    tost_added_wl: 'Added to watchlist',
    tost_removed_wl: 'Removed from watchlist',
    tost_copied: 'Copied',
    tost_saved: 'Saved',
    tost_error: 'Error',
    tost_load_error: 'Load error',
    tost_send_error: 'Send failed',
    tost_request_sent: 'Request sent',
    tost_request_exists: 'Request already sent',
    tost_pass_changed: 'Password changed',
    tost_wrong_pass: 'Wrong password',
    tost_fill_both: 'Fill in both fields',
    tost_pass_short: 'Password must be at least 6 characters',
    tost_rating_needed: 'Please rate the movie',
    tost_rating_added: 'Rating added',
    tost_rating_updated: 'Rating updated',
    tost_film_save_error: 'Failed to save movie',
    tost_load_film_error: 'Failed to load movie',
    tost_visible_all: 'Visible to everyone',
    tost_visible_friends: 'Visible to friends only',
    tost_admin_only: 'Only admin can change the theme',
    tost_theme_changed: 'Theme for everyone:',
    tost_theme_default: 'Default',
    tost_theme_halloween: 'Halloween',
    tost_theme_newyear: 'New Year',
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

  // Если пользователь ещё не залогинен — просто переводим статику и выходим
  if (typeof currentUser === 'undefined' || !currentUser) {
    return;
  }

  // Страница фильма
  if (typeof currentSection !== 'undefined' && currentSection === 'film-page' && window.currentFilmId && typeof showFilmPage === 'function') {
    showFilmPage(window.currentFilmId);
  }
  // Лента
  if (typeof currentSection !== 'undefined' && currentSection === 'home' && typeof loadRecentReviews === 'function') {
    if (typeof recentReviewsCache !== 'undefined') recentReviewsCache = null;
    loadRecentReviews(true);
  }
  // Каталог + hero
  if (typeof currentSection !== 'undefined' && currentSection === 'movies') {
    if (typeof loadHeroBanner === 'function') loadHeroBanner();
    if (typeof loadCatalogRows === 'function') {
      if (typeof rowState !== 'undefined') {
        Object.keys(rowState).forEach(k => delete rowState[k]);
      }
      loadCatalogRows();
    }
  }
  // Колесо
  if (typeof currentSection !== 'undefined' && currentSection === 'wheel' && typeof loadWheelMovies === 'function') {
    if (typeof wheelMovies !== 'undefined') wheelMovies = [];
    loadWheelMovies();
  }
  // Оценённые
  if (typeof currentSection !== 'undefined' && currentSection === 'rated' && typeof loadRatedMovies === 'function') {
    if (typeof ratedMoviesData !== 'undefined') ratedMoviesData = [];
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
  // Переключатели языка (все, у кого id начинается с lang-toggle)
  document.querySelectorAll('[id^="lang-toggle"]').forEach(el => {
    el.textContent = currentLang === 'ru' ? 'EN' : 'RU';
  });
  // Язык страницы
  document.documentElement.setAttribute('lang', currentLang);
  // Заголовок вкладки
  if (currentLang === 'en') {
    document.title = 'KinoClub — ratings, reviews and picks | kinoclab.online';
  } else {
    document.title = 'Киноклуб — оценки фильмов, рецензии и подборки | kinoclab.online';
  }
}