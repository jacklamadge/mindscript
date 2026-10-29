// feedback.js — отзывы и поддержка
(function () {
    function shell(title, inner) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
        wrap.innerHTML =
            '<div style="background:#151515;border:1px solid rgba(198,255,51,0.3);border-radius:20px;max-width:380px;width:100%;max-height:80vh;overflow-y:auto;padding:24px;position:relative;">' +
            '<button data-close style="position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.08);border:none;color:#aaa;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button>' +
            '<h2 style="color:#fff;margin:0 0 14px;font-size:18px;">' + title + '</h2>' + inner + '</div>';
        document.body.appendChild(wrap);
        wrap.addEventListener('click', function (e) { if (e.target === wrap || e.target.hasAttribute('data-close')) wrap.remove(); });
        return wrap;
    }

    function headers() {
        return { 'Content-Type': 'application/json', 'X-User-Id': localStorage.getItem('userId') || '' };
    }

    // ---------- ОТЗЫВЫ ----------
    function openReviews() {
        const wrap = shell('⭐ Отзывы',
            '<div id="fbStars" style="font-size:28px;cursor:pointer;margin-bottom:10px;">☆☆☆☆☆</div>' +
            '<textarea id="fbText" rows="3" placeholder="Что нравится? Что улучшить?" style="width:100%;background:#0A0A0F;border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px;border-radius:10px;font-size:14px;outline:none;resize:vertical;"></textarea>' +
            '<button id="fbSend" style="width:100%;margin-top:10px;background:#C6FF33;border:none;color:#000;padding:12px;border-radius:10px;font-weight:700;cursor:pointer;">Отправить отзыв</button>' +
            '<div id="fbList" style="margin-top:16px;"></div>');

        let rating = 0;
        const stars = wrap.querySelector('#fbStars');
        stars.onclick = function (e) {
            const i = Math.ceil((e.offsetX / stars.offsetWidth) * 5);
            rating = Math.max(1, Math.min(5, i));
            stars.textContent = '★'.repeat(rating) + '☆'.repeat(5 - rating);
            stars.style.color = '#FFD700';
        };

        wrap.querySelector('#fbSend').onclick = async function () {
            const text = wrap.querySelector('#fbText').value.trim();
            if (!rating || !text) { if (window.Toast) Toast.warn('⚠️ Поставьте оценку и напишите текст'); return; }
            const res = await fetch('/api/reviews', { method: 'POST', headers: headers(), body: JSON.stringify({ rating: rating, text: text }) });
            if (res.ok) { if (window.Toast) Toast.success('✅ Спасибо за отзыв!'); wrap.remove(); loadReviewsList(); }
            else { if (window.Toast) Toast.error('❌ Не удалось отправить'); }
        };

        loadReviewsInto(wrap);
    }

    async function loadReviewsInto(wrap) {
        try {
            const list = await (await fetch('/api/reviews')).json();
            const box = wrap.querySelector('#fbList');
            box.innerHTML = list.length
                ? list.map(function (r) {
                    return '<div style="background:#0A0A0F;border-radius:10px;padding:10px;margin-top:8px;">' +
                        '<div style="color:#FFD700;font-size:12px;">' + '★'.repeat(r.rating) + ' <span style="color:#888;">' + escapeHtml(r.name) + '</span></div>' +
                        '<div style="color:#ccc;font-size:13px;margin-top:4px;">' + escapeHtml(r.text) + '</div></div>';
                }).join('')
                : '<div style="color:#666;font-size:13px;text-align:center;">Пока нет отзывов — будьте первым!</div>';
        } catch (e) {}
    }

    async function loadReviewsList() {}

    // ---------- ПОДДЕРЖКА ----------
    function openSupport() {
        const wrap = shell('💬 Написать автору',
            '<textarea id="spText" rows="4" placeholder="Опишите вопрос или проблему..." style="width:100%;background:#0A0A0F;border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px;border-radius:10px;font-size:14px;outline:none;resize:vertical;"></textarea>' +
            '<button id="spSend" style="width:100%;margin-top:10px;background:#C6FF33;border:none;color:#000;padding:12px;border-radius:10px;font-weight:700;cursor:pointer;">Отправить</button>');
        wrap.querySelector('#spSend').onclick = async function () {
            const text = wrap.querySelector('#spText').value.trim();
            if (!text) { if (window.Toast) Toast.warn('⚠️ Напишите сообщение'); return; }
            const res = await fetch('/api/support', { method: 'POST', headers: headers(), body: JSON.stringify({ text: text }) });
            if (res.ok) { if (window.Toast) Toast.success('✅ Отправлено! Отвечу в Telegram.'); wrap.remove(); }
            else { if (window.Toast) Toast.error('❌ Не удалось отправить'); }
        };
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
    }

    function hookByText(txt, fn) {
        const el = Array.from(document.querySelectorAll('a, button, div, li, span'))
            .find(function (e) { return (e.textContent || '').trim() === txt; });
        if (el) {
            el.style.cursor = 'pointer';
            el.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fn(); });
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            hookByText('Отзывы', openReviews);
            hookByText('Написать в поддержку', openSupport);
        }, 800);
    });

    window.Feedback = { reviews: openReviews, support: openSupport };
})();