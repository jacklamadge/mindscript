// Пустой apiBaseUrl = относительные запросы (/api/...) — работает и локально, и через ngrok
window.APP_CONFIG = {
    // Генерации не списываются; в UI всегда показываем freeGenerations / freeGenerations
    unlimitedResources: true,
    dailyLimit: 5,
    freeGenerations: 5,
    apiBaseUrl: '',

    isPremium: () => {
        return localStorage.getItem('isPremium') === 'true';
    },

    getGenerationsLeft: () => {
        if (window.APP_CONFIG.isPremium()) return 9999;
        return parseInt(localStorage.getItem('generationsLeft') || '5', 10);
    },

    getTokensLeft: () => {
        if (window.APP_CONFIG.isPremium()) return 99999;
        return parseInt(localStorage.getItem('tokensLeft') || '125', 10);
    }
};