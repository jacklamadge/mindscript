// adminGuard.js — прячет «Аналитику» от не-админов (улучшенная версия)
(function () {
    async function guard() {
        const userId = localStorage.getItem('userId');
        let isAdmin = false;
        try {
            const res = await fetch('/api/auth/me', { headers: { 'X-User-Id': userId || '' } });
            if (res.ok) { isAdmin = !!(await res.json()).is_admin; }
        } catch (e) {}
        if (isAdmin) return;

        // 1) Скрываем все ссылки на admin
        document.querySelectorAll('a[href*="admin"]').forEach(function (a) {
            a.style.display = 'none';
        });

        // 2) Скрываем пункты меню с текстом «Аналитика» (с эмодзи и без)
        Array.from(document.querySelectorAll('a, button, div, li, span')).forEach(function (e) {
            const t = (e.textContent || '').trim();
            if (t.includes('Аналитика') && t.length <= 15) {
                const row = e.closest('a, button, li') || e.parentElement;
                if (row) row.style.display = 'none';
            }
        });
    }

    function start() { setTimeout(guard, 900); }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();