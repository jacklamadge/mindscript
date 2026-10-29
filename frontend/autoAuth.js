// autoAuth.js — автоматический вход через Telegram (самодостаточный)
(function () {
    async function tryAutoLogin() {
          const tg = window.Telegram && window.Telegram.WebApp;
        if (!tg || !tg.initData) return;

        // ВСЕГДА обновляем initData (устаревает через 24 часа!)
        localStorage.setItem('tgInitData', tg.initData);

        if (localStorage.getItem('isRegistered') === 'true' && localStorage.getItem('userId')) return;
        const tgUser = tg.initDataUnsafe && tg.initDataUnsafe.user;
        if (!tgUser) return;
        if (tgUser.photo_url) {
            localStorage.setItem('avatarUrl', tgUser.photo_url);
        }

        // реферальный код из ссылки t.me/bot?startapp=CODE
        const startParam = tg.initDataUnsafe.start_param;
        if (startParam && !localStorage.getItem('referralCode')) {
            localStorage.setItem('referralCode', startParam);
        }

        try {
            const res = await fetch('/api/auth/telegram-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': tg.initData
                },
                body: JSON.stringify({ telegram_user: tgUser })
            });
            if (!res.ok) {
                console.warn('autoAuth: ошибка сервера', res.status);
                return;
            }
            const data = await res.json();

            // ВСЕ флаги, которые ждёт приложение:
            localStorage.setItem('userId', String(data.user_id));
            localStorage.setItem('authName', data.display_name);
            localStorage.setItem('isRegistered', 'true');
            localStorage.setItem('generationsLeft', String(data.generations_left));
            localStorage.setItem('tokensLeft', String(data.tokens_left));
            localStorage.setItem('isPremium', data.is_premium ? 'true' : 'false');
            localStorage.setItem('tgChatId', String(tgUser.id));

            window.dispatchEvent(new Event('user-settings-updated'));
            console.log('✅ autoAuth: вошли как', data.display_name);
            if (window.Toast) Toast.success('👋 Добро пожаловать, ' + data.display_name + '!');
        } catch (e) {
            console.warn('autoAuth:', e);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(tryAutoLogin, 300); });
    } else {
        setTimeout(tryAutoLogin, 300);
    }

    window.AutoAuth = { login: tryAutoLogin };
})();
