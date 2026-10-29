// welcome.js — приветственное окно при первом входе
var PRIMARY_ON_TOP = true;   // true = "Начать" сверху, false = снизу (для A/B теста)

(function () {
    function showWelcome() {
        if (localStorage.getItem('welcomeSeen') === 'true') return;

        var primary = '<button id="wmStart" style="width:100%;background:#C6FF33;border:none;color:#000;padding:13px;border-radius:12px;font-size:15px;font-weight:800;font-family:Inter,-apple-system,sans-serif;cursor:pointer;margin-top:16px;">🚀 Начать</button>';
        var secondary = '<button id="wmPromo" style="width:100%;background:rgba(198,255,51,0.12);border:1px solid rgba(198,255,51,0.4);color:#C6FF33;padding:13px;border-radius:12px;font-size:15px;font-weight:700;font-family:Inter,-apple-system,sans-serif;cursor:pointer;margin-top:8px;">🎁 У меня есть промокод</button>';

        var buttons = PRIMARY_ON_TOP ? (primary + secondary) : (secondary + primary);

        var wrap = document.createElement('div');
        wrap.id = 'welcomeModal';
        wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;';
        wrap.innerHTML =
            '<div style="background:#151515;border:1px solid rgba(198,255,51,0.3);border-radius:20px;max-width:380px;width:100%;padding:24px;text-align:center;">' +
              '<div style="font-size:44px;">👋</div>' +
              '<h2 style="color:#fff;margin:12px 0 6px;font-size:20px;font-family:Inter,-apple-system,sans-serif;font-weight:800;">Добро пожаловать в MindScript!</h2>' +
              '<div style="color:#888;font-size:13px;margin-bottom:16px;">Готовые промпты для ChatGPT, Claude и Copilot за 1 минуту.</div>' +
              '<div style="text-align:left;background:#0A0A0F;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;font-size:14px;color:#ccc;line-height:1.9;font-family:Inter,-apple-system,sans-serif;">' +
                '⚡️ <b style="color:#fff;">7 вопросов</b> → промпт под задачу<br>' +
                '🧠 <b style="color:#fff;">Адаптивный квиз</b> → только нужные детали<br>' +
                '📚 <b style="color:#fff;">Библиотека</b> → промпты всегда под рукой<br>' +
                '🎁 <b style="color:#fff;">1 день Premium</b> → бесплатно по промокоду' +
              '</div>' +
              buttons +
            '</div>';
        document.body.appendChild(wrap);

        document.getElementById('wmStart').onclick = function () {
            localStorage.setItem('welcomeSeen', 'true');
            wrap.remove();
        };
        document.getElementById('wmPromo').onclick = function () {
            localStorage.setItem('welcomeSeen', 'true');
            localStorage.setItem('openPromoOnProfile', '1');
            location.href = 'profile.html';
        };
    }

    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(showWelcome, 600);
    });
})();
