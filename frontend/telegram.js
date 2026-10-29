// telegram.js — адаптер MindScript под Telegram Mini App
(function () {
    const tg = window.Telegram && window.Telegram.WebApp;
    window.IS_TELEGRAM = !!(tg && tg.initData);

    if (!tg) {
        console.log('🌐 Обычный браузер — Telegram-адаптер отключён');
        return;
    }

    console.log('📱 Telegram Mini App активен');

    tg.ready();
    tg.expand();
    if (tg.initData) {
        localStorage.setItem('tgInitData', tg.initData);
    }
    // Цвета под тёмную тему
    try {
        tg.setHeaderColor && tg.setHeaderColor('#0A0A0F');
        tg.setBackgroundColor && tg.setBackgroundColor('#0A0A0F');
    } catch (e) {}

    // Пользователь Telegram
    const user = tg.initDataUnsafe && tg.initDataUnsafe.user;
    if (user) {
        console.log('👤 Telegram:', user.first_name, '| ID:', user.id);

        // Стабильный userId = Telegram ID
        if (!localStorage.getItem('userId')) {
            localStorage.setItem('userId', String(user.id));
        }

        // ID чата для уведомлений «промпт готов» 🔔
        localStorage.setItem('tgChatId', String(user.id));

        // Имя из Telegram для профиля
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
        if (fullName && !localStorage.getItem('authName')) {
            localStorage.setItem('tgName', fullName);
            const nameEl = document.getElementById('profileName');
            if (nameEl) nameEl.textContent = fullName;
        }
    }

    // Реферальный код из ссылки t.me/bot?startapp=CODE 🎁
    const startParam = tg.initDataUnsafe && tg.initDataUnsafe.start_param;
    if (startParam && !localStorage.getItem('referralCode')) {
        localStorage.setItem('referralCode', startParam);
    }

    // Хаптика (лёгкая вибрация) при нажатиях
    document.addEventListener('click', function (e) {
        if (e.target.closest('button, .category-card, .tpl-card, a, .action-btn')) {
            try { tg.HapticFeedback && tg.HapticFeedback.impactOccurred('light'); } catch (e) {}
        }
    }, true);

    // Экспорт адаптера
    window.TgAdapter = {
        isTelegram: true,
        user: user,
        sharePrompt: function (text) {
            navigator.clipboard && navigator.clipboard.writeText(text);
            if (tg.showPopup) {
                tg.showPopup({
                    title: '✅ Скопировано',
                    message: 'Промпт в буфере обмена. Вставь его в ChatGPT или любой чат.',
                    buttons: [{ type: 'ok' }]
                });
            }
        },
        close: function () { tg.close(); }
    };
})();