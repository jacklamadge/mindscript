// tokenManager.js — токены + генерации + premium
function isPremium() {
    return localStorage.getItem('isPremium') === 'true';
}

function initTokenDisplay() {
    if (!localStorage.getItem('tokensLeft')) {
        localStorage.setItem('tokensLeft', isPremium() ? '99999' : '125');
    }
    if (!localStorage.getItem('generationsLeft')) {
        localStorage.setItem('generationsLeft', isPremium() ? '9999' : '5');
    }
    updateAllTokenDisplays();
}

function updateAllTokenDisplays() {
    const tokens = localStorage.getItem('tokensLeft') || '125';
    const gens = localStorage.getItem('generationsLeft') || '5';

    document.querySelectorAll('.token-value').forEach(el => {
        el.innerText = isPremium() ? '∞' : tokens;
    });
    document.querySelectorAll('.gens-value').forEach(el => {
        el.innerText = isPremium() ? '∞' : gens;
    });

    const bar = document.querySelector('.limits-fill');
    if (bar) {
        if (isPremium()) {
            bar.style.width = '100%';
            bar.style.background = 'linear-gradient(90deg, #FFD700, #FFA500)';
        } else {
            const max = window.APP_CONFIG?.dailyLimit || 5;
            bar.style.width = Math.max(0, (parseInt(gens, 10) / max) * 100) + '%';
        }
    }
}

function getGenerations() {
    if (isPremium()) return 9999;
    return parseInt(localStorage.getItem('generationsLeft') || '5', 10);
}

function checkGenerationsAvailable() {
    return isPremium() || getGenerations() > 0;
}

function spendGeneration() {
    if (isPremium()) return true;
    const current = parseInt(localStorage.getItem('generationsLeft') || '5', 10);
    if (current > 0) {
        localStorage.setItem('generationsLeft', String(current - 1));
        updateAllTokenDisplays();
        return true;
    }
    return false;
}

initTokenDisplay();
window.addEventListener('storage', updateAllTokenDisplays);
window.addEventListener('user-settings-updated', updateAllTokenDisplays);

window.TokenManager = {
    getGenerations,
    checkGenerationsAvailable,
    spendGeneration,
    updateAllTokenDisplays,
    isPremium
};