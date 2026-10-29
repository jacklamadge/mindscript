// profile.js — финальная версия: ADMIN + аватарка с авто-обновлением
(function () {
    async function loadAdmin() {
        var userId = localStorage.getItem('userId');
        if (!userId) return;
        try {
            var res = await fetch('/api/auth/me', { headers: { 'X-User-Id': userId } });
            if (res.ok) {
                var d = await res.json();
                localStorage.setItem('isAdmin', d.is_admin ? 'true' : 'false');
            }
        } catch (e) {}
    }

    async function fetchAvatar(refresh) {
        try {
            var userId = localStorage.getItem('userId');
            var res = await fetch('/api/auth/avatar?refresh=' + (refresh ? 1 : 0), { headers: { 'X-User-Id': userId } });
            if (res.ok) {
                var d = await res.json();
                if (d.avatar_url) {
                    localStorage.setItem('avatarUrl', d.avatar_url);
                    return d.avatar_url;
                }
            }
        } catch (e) {}
        return null;
    }

    function setAvatar(avatar, url) {
        avatar.dataset.filled = '1';
        var img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
        img.onerror = async function () {
            // Ссылка устарела — запрашиваем свежую
            localStorage.removeItem('avatarUrl');
            var fresh = await fetchAvatar(true);
            if (fresh) {
                setAvatar(avatar, fresh);
            } else {
                avatar.innerHTML = '👤';
            }
        };
        avatar.innerHTML = '';
        avatar.appendChild(img);
    }

    async function loadAvatar() {
        var avatar = document.querySelector('.avatar-img');
        if (!avatar || avatar.dataset.filled) return;
        var url = localStorage.getItem('avatarUrl');
        if (!url) url = await fetchAvatar(false);
        if (url) setAvatar(avatar, url);
    }

    function render() {
        var nameEl = document.getElementById('userName');
        var statusEl = document.getElementById('userStatus');
        var premiumBanner = document.getElementById('premiumBanner');
        var premiumActive = document.getElementById('premiumActive');
        var btnLogin = document.getElementById('btnLogin');
        var btnLogout = document.getElementById('btnLogout');
        if (!nameEl) return;

        var isRegistered = localStorage.getItem('isRegistered') === 'true' && !!localStorage.getItem('userId');
        var isPremium = localStorage.getItem('isPremium') === 'true';
        var isAdmin = localStorage.getItem('isAdmin') === 'true';
        var name = localStorage.getItem('authName') || 'Пользователь';

        nameEl.textContent = isRegistered ? name : 'Гость';
        if (statusEl) statusEl.textContent = isRegistered ? 'Аккаунт сохранён в облаке' : 'Базовый аккаунт';
        if (btnLogin) btnLogin.style.display = isRegistered ? 'none' : 'flex';
        if (btnLogout) btnLogout.style.display = isRegistered ? 'block' : 'none';

        var badge = document.getElementById('adminBadge');
        if (isAdmin) {
            if (!badge) {
                badge = document.createElement('div');
                badge.id = 'adminBadge';
                badge.textContent = '🛡️ ADMIN';
                badge.style.cssText = 'background:rgba(198,255,51,0.12);border:1px solid #C6FF33;color:#C6FF33;border-radius:14px;padding:14px;text-align:center;font-weight:800;letter-spacing:2px;margin-bottom:12px;';
                var section = document.getElementById('premiumSection');
                if (section && section.parentNode) section.parentNode.insertBefore(badge, section);
            }
            badge.style.display = 'block';
            if (premiumBanner) premiumBanner.style.display = 'none';
            if (premiumActive) premiumActive.style.display = 'none';
        } else {
            if (badge) badge.style.display = 'none';
            if (premiumBanner) premiumBanner.style.display = isPremium ? 'none' : 'block';
            if (premiumActive) premiumActive.style.display = isPremium ? 'block' : 'none';
        }
    }

    async function updateStats() {
        try {
            if (window.LibraryApi && LibraryApi.loadStatsSafe) {
                var s = await LibraryApi.loadStatsSafe();
                var p = document.getElementById('statPrompts');
                var f = document.getElementById('statFavorites');
                var c = document.getElementById('statCollections');
                if (p) p.innerText = s.prompts_total ?? 0;
                if (f) f.innerText = s.favorites_count ?? 0;
                if (c) c.innerText = s.collections_count ?? 0;
            }
        } catch (e) {}
    }

    document.addEventListener('DOMContentLoaded', async function () {
        await loadAdmin();
        render();
        setTimeout(render, 1500);
        updateStats();
        loadAvatar();

        var activateBtn = document.getElementById('activatePremiumBtn');
        if (activateBtn) activateBtn.onclick = function () {
            if (window.PremiumStars && PremiumStars.open) PremiumStars.open();
        };

        var btnLogout = document.getElementById('btnLogout');
        if (btnLogout) btnLogout.onclick = function () {
            if (confirm('Выйти из аккаунта?')) {
                ['userId','authName','isRegistered','generationsLeft','tokensLeft','isPremium','premiumUntil','tgChatId','tgInitData','welcomeSeen','isAdmin','avatarUrl']
                    .forEach(function (k) { localStorage.removeItem(k); });
                window.location.reload();
            }
        };
    });

    window.addEventListener('user-settings-updated', render);
})();
