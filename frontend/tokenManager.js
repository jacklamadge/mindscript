// tokenManager.js — токены + генерации + premium
function isPremium() {
    return localStorage.getItem('isPremium') === 'true';
}

function isUnlimited() {
    return window.APP_CONFIG?.unlimitedResources === true;
}

function displayGens() {
    return String(window.APP_CONFIG?.freeGenerations || 5);
}

function initTokenDisplay() {
    if (!localStorage.getItem('tokensLeft')) {
        localStorage.setItem('tokensLeft', isPremium() ? '99999' : '125');
    }
    if (!localStorage.getItem('generationsLeft')) {
        localStorage.setItem('generationsLeft', isPremium() ? '9999' : '5');
    }
    if (isUnlimited()) {
        localStorage.setItem('generationsLeft', displayGens());
    }
    updateAllTokenDisplays();
}

function updateAllTokenDisplays() {
    const tokens = localStorage.getItem('tokensLeft') || '125';
    const gens = isUnlimited() ? displayGens() : (localStorage.getItem('generationsLeft') || '5');

    document.querySelectorAll('.token-value').forEach(el => {
        el.innerText = isPremium() ? '∞' : tokens;
    });
    document.querySelectorAll('.gens-value').forEach(el => {
        // Безлимит по генерациям: всё равно показываем «5», не ∞
        el.innerText = isUnlimited() ? displayGens() : (isPremium() ? '∞' : gens);
    });

    const bar = document.querySelector('.limits-fill');
    if (bar) {
        if (isUnlimited()) {
            bar.style.width = '100%';
        } else if (isPremium()) {
            bar.style.width = '100%';
            bar.style.background = 'linear-gradient(90deg, #FFD700, #FFA500)';
        } else {
            const max = window.APP_CONFIG?.dailyLimit || 5;
            bar.style.width = Math.max(0, (parseInt(gens, 10) / max) * 100) + '%';
        }
    }
}

function getGenerations() {
    if (isUnlimited() || isPremium()) return 9999;
    return parseInt(localStorage.getItem('generationsLeft') || '5', 10);
}

function checkGenerationsAvailable() {
    return isUnlimited() || isPremium() || getGenerations() > 0;
}

function spendGeneration() {
    if (isUnlimited() || isPremium()) return true;
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
