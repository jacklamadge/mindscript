(function () {
    var list = document.getElementById('list');
    if (!list) return;

    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
    }

    function card(it) {
        return '<div class="ccard">' +
            '<div class="ctitle">' + esc(it.title) + '</div>' +
            '<div class="cauthor">👤 ' + esc(it.author) + (it.category ? ' · ' + esc(it.category) : '') + '</div>' +
            '<pre class="ctext">' + esc(it.content) + '</pre>' +
            '<div class="cfoot">' +
            '<button class="likeBtn" data-id="' + it.id + '">❤️ ' + it.likes + '</button>' +
            '<button class="copyBtn">📋 Копировать</button>' +
            '</div></div>';
    }

    async function load() {
        try {
            var items = await (await fetch('/api/community')).json();
            list.innerHTML = items.length ? items.map(card).join('') : '<div class="empty">Пока пусто — будьте первым!</div>';
            list.querySelectorAll('.likeBtn').forEach(function (b) {
                b.onclick = async function () {
                    var r = await (await fetch('/api/community/' + b.dataset.id + '/like', { method: 'POST' })).json();
                    b.textContent = '❤️ ' + r.likes;
                };
            });
            list.querySelectorAll('.copyBtn').forEach(function (b) {
                b.onclick = function () {
                    var pre = b.closest('.ccard').querySelector('.ctext');
                    navigator.clipboard && navigator.clipboard.writeText(pre.textContent);
                    b.textContent = '✅ Скопировано';
                    setTimeout(function () { b.textContent = '📋 Копировать'; }, 1500);
                };
            });
        } catch (e) {
            list.innerHTML = '<div class="empty">❌ Ошибка загрузки</div>';
        }
    }

    document.getElementById('publishBtn').onclick = function () {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
        wrap.innerHTML = '<div style="background:#151515;border-radius:20px;max-width:380px;width:100%;padding:24px;">' +
            '<h2 style="margin:0 0 12px;font-size:18px;">✍️ Публикация</h2>' +
            '<input id="pTitle" placeholder="Название" style="width:100%;background:#0A0A0F;border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px;border-radius:10px;margin-bottom:8px;outline:none;">' +
            '<textarea id="pText" rows="5" placeholder="Текст промпта..." style="width:100%;background:#0A0A0F;border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px;border-radius:10px;outline:none;resize:vertical;"></textarea>' +
            '<button id="pSend" style="width:100%;margin-top:10px;background:#C6FF33;border:none;color:#000;padding:12px;border-radius:10px;font-weight:700;cursor:pointer;">Опубликовать</button>' +
            '<button id="pClose" style="width:100%;margin-top:6px;background:rgba(255,255,255,0.06);border:none;color:#aaa;padding:10px;border-radius:10px;cursor:pointer;">Отмена</button>' +
            '</div>';
        document.body.appendChild(wrap);
        wrap.querySelector('#pClose').onclick = function () { wrap.remove(); };
        wrap.querySelector('#pSend').onclick = async function () {
            var title = wrap.querySelector('#pTitle').value.trim();
            var text = wrap.querySelector('#pText').value.trim();
            if (!title || !text) { alert('⚠️ Заполните название и текст'); return; }
            var res = await fetch('/api/community', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-Id': localStorage.getItem('userId') || '' },
                body: JSON.stringify({ title: title, content: text })
            });
            if (res.ok) { wrap.remove(); load(); }
            else { alert('❌ Не удалось опубликовать'); }
        };
    };

    document.addEventListener('DOMContentLoaded', load);
})();
