// shareCard.js — брендовая карточка для шеринга промпта
(function () {
    function getCode(cb) {
        var userId = localStorage.getItem('userId');
        if (!userId) { cb(''); return; }
        fetch('/api/auth/me', { headers: { 'X-User-Id': userId } })
            .then(function (r) { return r.ok ? r.json() : {}; })
            .then(function (d) { cb(d.referral_code || ''); })
            .catch(function () { cb(''); });
    }

    function drawCard(text, code) {
        var W = 1080, H = 1080;
        var cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        var ctx = cv.getContext('2d');

        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#0B0B0B'); g.addColorStop(1, '#13150A');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = '#C6FF33'; ctx.lineWidth = 4;
        ctx.strokeRect(30, 30, W - 60, H - 60);

        ctx.fillStyle = '#C6FF33';
        ctx.font = '800 64px Arial, sans-serif';
        ctx.fillText('MindScript', 70, 140);
        ctx.fillStyle = '#888888';
        ctx.font = '400 34px Arial, sans-serif';
        ctx.fillText('сильный промпт за 60 секунд', 70, 195);

        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(70, 240); ctx.lineTo(W - 70, 240); ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '400 38px Arial, sans-serif';
        var maxW = W - 140;
        var words = (text || '').split(/\s+/);
        var line = '', y = 320, lines = 0, i = 0;
        for (; i < words.length; i++) {
            var t = line ? line + ' ' + words[i] : words[i];
            if (ctx.measureText(t).width > maxW) {
                ctx.fillText(line, 70, y); y += 56; lines++;
                if (lines >= 12) break;
                line = words[i];
            } else line = t;
        }
        if (lines < 12 && line) { ctx.fillText(line, 70, y); y += 56; }
        if (i < words.length) ctx.fillText('…', 70, y);

        ctx.fillStyle = '#C6FF33';
        ctx.font = '700 42px Arial, sans-serif';
        ctx.fillText(code ? ('🎁 код ' + code + ' → 1 день Premium бесплатно') : '🎁 1 день Premium бесплатно', 70, H - 150);
        ctx.fillStyle = '#888888';
        ctx.font = '400 34px Arial, sans-serif';
        ctx.fillText('t.me/m1ndscript_bot', 70, H - 95);

        return cv.toDataURL('image/png');
    }

    function openShare() {
        var text = localStorage.getItem('generatedPrompt') || '';
        if (!text) { if (window.Toast) Toast.warn('⚠️ Нет промпта для шеринга'); return; }
        getCode(function (code) {
            var img = drawCard(text, code);
            var wrap = document.createElement('div');
            wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px;';
            wrap.innerHTML =
                '<div style="background:#151515;border:1px solid rgba(198,255,51,0.3);border-radius:20px;max-width:420px;width:100%;padding:16px;max-height:92vh;overflow-y:auto;">' +
                  '<img src="' + img + '" style="width:100%;border-radius:14px;display:block;">' +
                  '<div style="color:#888;font-size:12px;text-align:center;margin:10px 0;">💾 Удерживайте картинку — «Сохранить фото»<br>и отправьте в любой чат или сторис</div>' +
                  '<button id="scSend" style="width:100%;background:#C6FF33;border:none;color:#000;padding:12px;border-radius:12px;font-weight:800;font-family:Inter,-apple-system,sans-serif;cursor:pointer;">📨 Отправить в чат</button>' +
                  '<button id="scCopy" style="width:100%;margin-top:8px;background:rgba(198,255,51,0.12);border:1px solid rgba(198,255,51,0.3);color:#C6FF33;padding:12px;border-radius:12px;font-weight:700;font-family:Inter,-apple-system,sans-serif;cursor:pointer;">📋 Скопировать текст со ссылкой</button>' +
                  '<button id="scClose" style="width:100%;margin-top:8px;background:rgba(255,255,255,0.06);border:none;color:#aaa;padding:10px;border-radius:12px;cursor:pointer;">Закрыть</button>' +
                '</div>';
            document.body.appendChild(wrap);
            var link = 'https://t.me/m1ndscript_bot/mindscriptapp' + (code ? '?startapp=' + code : '');
            document.getElementById('scSend').onclick = function () {
                var msg = '🧠 MindScript превращает задачу в готовый промпт за 60 секунд!\n\n🎁 Введи промокод ' + code + ' и получи 1 день Premium бесплатно: ' + link;
                var tg = window.Telegram && window.Telegram.WebApp;
                if (tg && tg.switchInlineChat) { try { tg.switchInlineChat(msg, ['users', 'groups']); return; } catch (e) {} }
                navigator.clipboard && navigator.clipboard.writeText(msg);
                if (window.Toast) Toast.success('✅ Ссылка скопирована!');
            };
            document.getElementById('scCopy').onclick = function () {
                navigator.clipboard && navigator.clipboard.writeText(text + '\n\n🎁 ' + code + ' → 1 день Premium: ' + link);
                if (window.Toast) Toast.success('✅ Скопировано!');
            };
            document.getElementById('scClose').onclick = function () { wrap.remove(); };
            wrap.addEventListener('click', function (e) { if (e.target === wrap) wrap.remove(); });
        });
    }

    function inject() {
        if (document.getElementById('shareCardBtn')) return;
        var host = document.getElementById('promptText') || document.querySelector('.prompt-text');
        if (!host) return;
        var btn = document.createElement('button');
        btn.id = 'shareCardBtn';
        btn.innerHTML = '📤 Поделиться';
        btn.style.cssText = 'width:100%;margin-top:10px;background:rgba(198,255,51,0.12);border:1px solid rgba(198,255,51,0.35);color:#C6FF33;padding:12px;border-radius:12px;font-weight:700;font-family:Inter,-apple-system,sans-serif;cursor:pointer;';
        btn.onclick = openShare;
        host.parentNode.insertBefore(btn, host.nextSibling);
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (location.pathname.indexOf('answer') === -1) return;
        setTimeout(inject, 800);
        setTimeout(inject, 2000);
    });

    window.ShareCard = { open: openShare };
})();
