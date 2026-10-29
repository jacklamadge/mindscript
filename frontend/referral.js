// referral.js — рефералка: кнопка + модалка + защита промокодов
(function () {
    var BOT_USERNAME = 'm1ndscript_bot';
    var APP_SHORT_NAME = 'mindscriptapp';

    function shareLink(code) {
        return APP_SHORT_NAME
            ? 'https://t.me/' + BOT_USERNAME + '/' + APP_SHORT_NAME + '?startapp=' + code
            : 'https://t.me/' + BOT_USERNAME + '?startapp=' + code;
    }

    function ensureModal() {
        if (document.getElementById('referralModal')) return;
        var wrap = document.createElement('div');
        wrap.id = 'referralModal';
        wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;z-index:9999;padding:20px;';
        wrap.innerHTML =
            '<div style="background:#151515;border:1px solid rgba(198,255,51,0.3);border-radius:20px;max-width:380px;width:100%;padding:24px;position:relative;">' +
              '<button id="rmClose" style="position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.08);border:none;color:#aaa;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button>' +
              '<div style="text-align:center;"><div style="font-size:40px;">🎁</div>' +
              '<h2 style="color:#fff;margin:10px 0 4px;font-size:20px;font-family:Inter,-apple-system,sans-serif;font-weight:800;">Приведи друга</h2>' +
              '<div style="color:#888;font-size:13px;">Обоим: 1 день Premium + 2 генерации</div></div>' +

              '<div style="margin-top:18px;background:#0A0A0F;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;">' +
                '<div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Ваш промокод</div>' +
                '<div style="display:flex;gap:8px;margin-top:8px;align-items:center;">' +
                  '<code id="rmCode" style="flex:1;text-align:center;background:#111;color:#C6FF33;padding:10px;border-radius:10px;font-size:18px;letter-spacing:2px;">—</code>' +
                  '<button id="rmCopy" style="background:#C6FF33;border:none;color:#000;padding:10px 12px;border-radius:10px;font-weight:700;font-family:Inter,-apple-system,sans-serif;cursor:pointer;">📋</button>' +
                '</div>' +
                '<button id="rmShare" style="width:100%;margin-top:10px;background:rgba(198,255,51,0.12);border:1px solid rgba(198,255,51,0.3);color:#C6FF33;padding:12px;border-radius:10px;font-weight:700;font-family:Inter,-apple-system,sans-serif;cursor:pointer;">📨 Отправить ссылку другу</button>' +
              '</div>' +

              '<div style="margin-top:14px;background:#0A0A0F;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;">' +
                '<div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Есть код от друга?</div>' +
                '<div style="display:flex;gap:8px;margin-top:8px;">' +
                  '<input id="rmInput" maxlength="12" placeholder="Напр. TX054T" style="flex:1;background:#111;border:1px solid rgba(255,255,255,0.1);color:#fff;padding:10px 12px;border-radius:10px;font-size:15px;text-transform:uppercase;font-family:Inter,-apple-system,sans-serif;outline:none;">' +
                  '<button id="rmApply" style="background:#C6FF33;border:none;color:#000;padding:10px 14px;border-radius:10px;font-weight:700;font-family:Inter,-apple-system,sans-serif;cursor:pointer;">⚡</button>' +
                '</div>' +
              '</div>' +

              '<div id="rmStats" style="color:#666;font-size:12px;text-align:center;margin-top:12px;"></div>' +
            '</div>';
        document.body.appendChild(wrap);
        wrap.addEventListener('click', function (e) { if (e.target === wrap) closeReferralModal(); });
        document.getElementById('rmClose').onclick = closeReferralModal;
        document.getElementById('rmCopy').onclick = function () {
            var code = document.getElementById('rmCode').textContent;
            navigator.clipboard && navigator.clipboard.writeText(code);
            if (window.Toast) Toast.success('✅ Код ' + code + ' скопирован!');
        };
        document.getElementById('rmShare').onclick = function () {
            var code = document.getElementById('rmCode').textContent;
            var msg = '🧠 MindScript превращает задачу в готовый промпт за 60 секунд!\n\n🎁 Введи промокод ' + code + ' и получи 1 день Premium бесплатно: ' + shareLink(code);
            var tg = window.Telegram && window.Telegram.WebApp;
            if (tg && tg.switchInlineChat) {
                try { tg.switchInlineChat(msg, ['users', 'groups']); return; } catch (e) {}
            }
            navigator.clipboard && navigator.clipboard.writeText(msg);
            if (window.Toast) Toast.success('✅ Ссылка скопирована!');
        };
        document.getElementById('rmApply').onclick = function () {
            var code = document.getElementById('rmInput').value.trim().toUpperCase();
            if (!code) { if (window.Toast) Toast.warn('⚠️ Введите код'); return; }
            activateCode(code);
        };
    }

    function openReferralModal() { ensureModal(); document.getElementById('referralModal').style.display = 'flex'; loadInfo(); }
    function closeReferralModal() { var m = document.getElementById('referralModal'); if (m) m.style.display = 'none'; }

    async function activateCode(code) {
        if (!localStorage.getItem('userId')) {
            if (window.Toast) Toast.warn('⚠️ Сначала войдите');
            return;
        }
        try {
            var res = await fetch('/api/auth/apply-referral', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': localStorage.getItem('userId') || '',
                    'X-Telegram-Init-Data': localStorage.getItem('tgInitData') || ''
                },
                body: JSON.stringify({ referral_code: code })
            });
            var data = await res.json();
            if (res.ok) {
                localStorage.setItem('generationsLeft', String(data.generations_left));
                localStorage.setItem('isPremium', data.is_premium ? 'true' : 'false');
                if (data.premium_until) localStorage.setItem('premiumUntil', data.premium_until);
                window.dispatchEvent(new Event('user-settings-updated'));
                if (window.Toast) Toast.success('🎁 Активировано: 1 день Premium + 2 генерации!');
                document.getElementById('rmInput').value = '';
                loadInfo();
            } else {
                if (window.Toast) Toast.error('❌ ' + (data.detail || 'Ошибка'));
            }
        } catch (e) {
            if (window.Toast) Toast.error('❌ Ошибка сети');
        }
    }

    async function loadInfo() {
        if (!localStorage.getItem('userId')) return;
        try {
            var res = await fetch('/api/auth/me', { headers: { 'X-User-Id': localStorage.getItem('userId') || '' } });
            if (!res.ok) return;
            var data = await res.json();
            var cm = document.getElementById('rmCode');
            if (cm) cm.textContent = data.referral_code || '—';
            var st = document.getElementById('rmStats');
            if (st) {
                var n = data.referrals_count || 0;
                st.textContent = 'Приглашено: ' + n + ' · вы получили +' + n + ' дн. Premium и +' + (n * 2) + ' генераций';
            }
            var inp = document.getElementById('rmInput');
            var ap = document.getElementById('rmApply');
            if (inp && ap) {
                var active = localStorage.getItem('isPremium') === 'true';
                inp.disabled = active;
                ap.disabled = active;
                inp.style.opacity = active ? '0.5' : '1';
                ap.style.opacity = active ? '0.5' : '1';
                if (active) inp.placeholder = 'Доступно после окончания Premium';
            }
        } catch (e) {}
    }

    function setupProfileButton() {
        var old = document.getElementById('referralCard');
        if (old) old.remove();
        if (document.getElementById('referralOpenBtn')) return;

        var btn = document.createElement('button');
        btn.id = 'referralOpenBtn';
        btn.innerHTML = '🎁 Приведи друга <span style="opacity:0.7;font-size:12px;">· 1 день Premium</span>';
        btn.style.cssText = 'display:block;width:100%;height:auto;margin-top:8px;background:rgba(198,255,51,0.1);border:1px solid rgba(198,255,51,0.35);color:#C6FF33;padding:11px 16px;border-radius:12px;font-size:14px;font-weight:700;font-family:Inter,-apple-system,sans-serif;cursor:pointer;';
        btn.onclick = openReferralModal;

        // ВСТАВЛЯЕМ В ПРОФИЛЬ ПРЯМО ПОСЛЕ ПЛАШКИ ADMIN ИЛИ ПОСЛЕ PREMIUM БЛОКА
        var section = document.getElementById('premiumSection');
        if (section && section.parentNode) {
            section.parentNode.insertBefore(btn, section.nextSibling);
        } else {
            (document.querySelector('.profile-actions') || document.body).appendChild(btn);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            if (location.pathname.includes('profile')) {
                setupProfileButton();
                if (localStorage.getItem('openPromoOnProfile')) {
                    localStorage.removeItem('openPromoOnProfile');
                    setTimeout(openReferralModal, 400);
                }
            }
        }, 800);
    });

    window.Referral = { open: openReferralModal, activate: activateCode };
})();
