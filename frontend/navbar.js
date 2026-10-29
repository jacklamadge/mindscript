// navbar.js - единая нижняя панель
(function () {
    function renderNavbar() {
        if (document.getElementById('mainNavbar')) return;
        if (!document.body) return;

        const navbarHTML = `
        <div id="mainNavbar" style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); width: calc(100% - 40px); max-width: 340px; background: #1A1A1A; border-radius: 100px; display: flex; justify-content: space-between; align-items: center; padding: 8px 20px; border: 1px solid rgba(255,255,255,0.08); z-index: 1000; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <a href="library.html" class="nav-btn" style="color: #555; text-decoration: none; display: flex; align-items: center; justify-content: center; flex: 1;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>
            </a>
            <a href="index.html" class="magic-btn" style="background: #C6FF33; width: 52px; height: 52px; border-radius: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; text-decoration: none; margin: 0 8px;">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </a>
            <a href="profile.html" class="nav-btn" style="color: #555; text-decoration: none; display: flex; align-items: center; justify-content: center; flex: 1;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </a>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', navbarHTML);

        // Подсветка активной кнопки
        const currentPage = window.location.pathname.split('/').pop();
        const btns = document.querySelectorAll('.nav-btn');
        if (currentPage === 'library.html' || currentPage === 'library') {
            if (btns[0]) btns[0].style.color = '#C6FF33';
        } else if (currentPage === 'profile.html' || currentPage === 'profile') {
            if (btns[1]) btns[1].style.color = '#C6FF33';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderNavbar);
    } else {
        renderNavbar();
    }
})();