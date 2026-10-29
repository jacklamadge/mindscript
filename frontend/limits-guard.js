// limits-guard.js — серверные лимиты: перехват 402 и синхронизация счётчика
(function () {
    const origFetch = window.fetch;
    if (!origFetch) return;

    window.fetch = async function (...args) {
        const res = await origFetch.apply(this, args);

        const url = typeof args[0] === 'string' ? args[0] : ((args[0] && args[0].url) || '');
        const isGeneration = url.includes('/api/prompt/save') || url.includes('/api/bot/');
        if (!isGeneration) return res;

        // 🛡️ Лимит исчерпан
        if (res.status === 402) {
            localStorage.setItem('generationsLeft', '0');
            window.dispatchEvent(new Event('user-settings-updated'));
            if (window.Toast) Toast.error('❌ Лимит генераций исчерпан!');
            setTimeout(function () {
                if (window.PremiumStars && PremiumStars.open) PremiumStars.open();
                else if (window.Referral && Referral.open) Referral.open();
            }, 900);
            setTimeout(function () { location.href = 'index.html'; }, 2500);
            return res;
        }

        // ✅ Сервер сказал, сколько осталось — доверяем только ему
        if (res.ok) {
            res.clone().json().then(function (data) {
                if (data && data.generations_left !== undefined && data.generations_left !== null) {
                    localStorage.setItem('generationsLeft', String(data.generations_left));
                    window.dispatchEvent(new Event('user-settings-updated'));
                }
            }).catch(function () {});
        }

        return res;
    };
})();