// premium.js — Premium: окно сравнения тарифов + оплата Stars
(function () {
    const PRICE = 150;
    const TABLE_HTML = `<table style="border-collapse:collapse;width:100%;min-width:330px;font-size:12px;color:#fff;"><thead><tr><th style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;text-align:left;font-weight:600;color:#cfcfcf;background:#151515;position:sticky;left:0;z-index:2;white-space:normal;max-width:118px;line-height:1.25; position:sticky;left:0;top:0;z-index:4;background:#101010;"></th><th style="border:1px solid rgba(255,255,255,0.10);padding:10px 7px;text-align:center;vertical-align:bottom;background:#101010;font-weight:700;color:#fff;position:sticky;top:0;z-index:3; color:#9a9a9a;font-weight:600;">Бесплатно</th><th style="border:1px solid rgba(255,255,255,0.10);padding:10px 7px;text-align:center;vertical-align:bottom;background:#101010;font-weight:700;color:#fff;position:sticky;top:0;z-index:3;background:rgba(255,255,255,0.04);">Стандарт<br><span style="display:inline-block;margin-top:4px;background:linear-gradient(135deg,#FFD700,#FFA500);color:#000;font-size:9px;font-weight:800;padding:2px 7px;border-radius:6px;letter-spacing:.4px;">ПОПУЛЯРНЫЙ</span></th><th style="border:1px solid rgba(255,255,255,0.10);padding:10px 7px;text-align:center;vertical-align:bottom;background:#101010;font-weight:700;color:#fff;position:sticky;top:0;z-index:3;background:rgba(255,215,0,0.07); border-top:2px solid #FFD700;">Премиум</th></tr></thead><tbody><tr><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;text-align:left;font-weight:600;color:#cfcfcf;background:#151515;position:sticky;left:0;z-index:2;white-space:normal;max-width:118px;line-height:1.25;">Цена / месяц</td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;"><span style="color:#8a8a8a;font-weight:400;">0 ₽</span></td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;background:rgba(255,255,255,0.04);"><span style="color:#fff;font-weight:700;">490 ₽</span></td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;background:rgba(255,215,0,0.07);"><span style="color:#fff;font-weight:700;">1290 ₽</span></td></tr><tr><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;text-align:left;font-weight:600;color:#cfcfcf;background:#151515;position:sticky;left:0;z-index:2;white-space:normal;max-width:118px;line-height:1.25;">Токены в день</td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;"><span style="color:#8a8a8a;font-weight:400;">5</span></td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;background:rgba(255,255,255,0.04);"><span style="color:#fff;font-weight:700;">100</span></td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;background:rgba(255,215,0,0.07);"><span style="color:#fff;font-weight:700;">300</span></td></tr><tr><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;text-align:left;font-weight:600;color:#cfcfcf;background:#151515;position:sticky;left:0;z-index:2;white-space:normal;max-width:118px;line-height:1.25;">AI уточняет задачу и улучшает результат</td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;"><span style="color:#C6FF33;font-weight:800;font-size:15px;">✓</span></td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;background:rgba(255,255,255,0.04);"><span style="color:#C6FF33;font-weight:800;font-size:15px;">✓</span></td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;background:rgba(255,215,0,0.07);"><span style="color:#C6FF33;font-weight:800;font-size:15px;">✓</span></td></tr><tr><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;text-align:left;font-weight:600;color:#cfcfcf;background:#151515;position:sticky;left:0;z-index:2;white-space:normal;max-width:118px;line-height:1.25;">Избранное и коллекции</td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;"><span style="color:#555;font-size:15px;">–</span></td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;background:rgba(255,255,255,0.04);"><span style="color:#C6FF33;font-weight:800;font-size:15px;">✓</span></td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;background:rgba(255,215,0,0.07);"><span style="color:#C6FF33;font-weight:800;font-size:15px;">✓</span></td></tr><tr><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;text-align:left;font-weight:600;color:#cfcfcf;background:#151515;position:sticky;left:0;z-index:2;white-space:normal;max-width:118px;line-height:1.25;">Загрузка файлов</td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;"><span style="color:#555;font-size:15px;">–</span></td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;background:rgba(255,255,255,0.04);"><span style="color:#fff;font-weight:700;">PDF, Word, TXT</span></td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;background:rgba(255,215,0,0.07);"><span style="color:#fff;font-weight:700;">Все форматы + изображения</span></td></tr><tr><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;text-align:left;font-weight:600;color:#cfcfcf;background:#151515;position:sticky;left:0;z-index:2;white-space:normal;max-width:118px;line-height:1.25;">История промптов</td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;"><span style="color:#8a8a8a;font-weight:400;">7 дней</span></td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;background:rgba(255,255,255,0.04);"><span style="color:#fff;font-weight:700;">30 дней</span></td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;background:rgba(255,215,0,0.07);"><span style="color:#fff;font-weight:700;">Бессрочно + экспорт</span></td></tr><tr><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;text-align:left;font-weight:600;color:#cfcfcf;background:#151515;position:sticky;left:0;z-index:2;white-space:normal;max-width:118px;line-height:1.25;">Приоритет генерации</td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;"><span style="color:#8a8a8a;font-weight:400;">Обычный</span></td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;background:rgba(255,255,255,0.04);"><span style="color:#fff;font-weight:700;">2× быстрее в очереди</span></td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;background:rgba(255,215,0,0.07);"><span style="color:#fff;font-weight:700;">Максимальный приоритет</span></td></tr><tr><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;text-align:left;font-weight:600;color:#cfcfcf;background:#151515;position:sticky;left:0;z-index:2;white-space:normal;max-width:118px;line-height:1.25;">Поддержка</td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;"><span style="color:#8a8a8a;font-weight:400;">AI-бот</span></td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;background:rgba(255,255,255,0.04);"><span style="color:#fff;font-weight:700;">Приоритетная поддержка</span></td><td style="border:1px solid rgba(255,255,255,0.10);padding:9px 7px;text-align:center;vertical-align:middle;background:rgba(255,215,0,0.07);"><span style="color:#fff;font-weight:700;">Персональный менеджер + команда</span></td></tr></tbody></table>;

    // ---------- МОДАЛЬНОЕ ОКНО (сравнение тарифов) ----------
    function ensureModal() {
        if (document.getElementById('premiumModal')) return;
        const wrap = document.createElement('div');
        wrap.id = 'premiumModal';
        wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.78);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;z-index:9999;padding:14px;';
        wrap.innerHTML = `
        <div id="pmCard" style="background:#151515;border:1px solid rgba(255,215,0,0.28);border-radius:20px;max-width:420px;width:100%;padding:16px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.6);display:flex;flex-direction:column;max-height:88vh;">
            <button id="pmClose" style="position:absolute;top:10px;right:10px;background:rgba(255,255,255,0.08);border:none;color:#aaa;width:30px;height:30px;border-radius:50%;font-size:15px;cursor:pointer;z-index:5;">✕</button>
            <div style="text-align:center;padding:2px 0 12px;">
                <div style="font-size:34px;">👑</div>
                <h2 style="color:#fff;margin:6px 0 2px;font-size:18px;">Выберите тариф</h2>
                <div style="color:#888;font-size:12px;">Сравните возможности MindScript</div>
            </div>
            <div style="overflow:auto;-webkit-overflow-scrolling:touch;flex:1;border-top:1px solid rgba(255,255,255,0.08);border-bottom:1px solid rgba(255,255,255,0.08);padding:2px 0;">
                ${TABLE_HTML}
            </div>
            <div style="padding-top:14px;">
                <button id="pmBuy" style="width:100%;background:linear-gradient(135deg,#FFD700,#FFA500);border:none;color:#000;padding:14px;border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(255,215,0,0.3);">⭐ Продолжить · Premium за ${PRICE} Stars</button>
                <div style="text-align:center;color:#666;font-size:10.5px;margin-top:9px;line-height:1.55;">Подписочные тарифы (₽/мес) — в разработке.<br>Сейчас доступен разовый Premium за ${PRICE} ⭐ · оплата через Telegram Stars · безопасно.</div>
            </div>
        </div>`;
        document.body.appendChild(wrap);
        wrap.addEventListener('click', function (e) { if (e.target === wrap) closePremiumModal(); });
        document.getElementById('pmClose').onclick = closePremiumModal;
        document.getElementById('pmBuy').onclick = buyPremium;
    }

    function openPremiumModal() {
        ensureModal();
        document.getElementById('premiumModal').style.display = 'flex';
    }
    function closePremiumModal() {
        const m = document.getElementById('premiumModal');
        if (m) m.style.display = 'none';
    }

    // ---------- ОПЛАТА ----------
    async function buyPremium() {
        const tg = window.Telegram && window.Telegram.WebApp;
        if (!tg || !tg.openInvoice) {
            if (window.Toast) Toast.info('💡 Оплата Stars доступна только внутри Telegram');
            return;
        }
        const userId = localStorage.getItem('userId');
        const initData = localStorage.getItem('tgInitData');

        if (window.Toast) Toast.info('⏳ Создаю счёт...');

        try {
            const res = await fetch('/api/auth/create-invoice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': userId || '',
                    'X-Telegram-Init-Data': initData || ''
                },
                body: JSON.stringify({ plan: 'premium' })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Ошибка создания счёта');

            tg.openInvoice(data.invoice_link, function (status) {
                if (status === 'paid') {
                    localStorage.setItem('isPremium', 'true');
                    localStorage.setItem('generationsLeft', '9999');
                    localStorage.setItem('tokensLeft', '99999');
                    window.dispatchEvent(new Event('user-settings-updated'));
                    closePremiumModal();
                    if (window.Toast) Toast.success('🎉 Premium активирован!');
                    setTimeout(function () { location.reload(); }, 1200);
                } else if (status === 'cancelled') {
                    if (window.Toast) Toast.info('Оплата отменена');
                } else if (status === 'failed') {
                    if (window.Toast) Toast.error('❌ Ошибка оплаты');
                }
            });
        } catch (e) {
            console.error('Premium error:', e);
            if (window.Toast) Toast.error('❌ ' + e.message);
        }
    }

    // ---------- ПРОФИЛЬ: красивая кнопка ----------
    function setupProfile() {
        const old = document.getElementById('premiumStarsCard');
        if (old) old.remove();

        const activateBtn = Array.from(document.querySelectorAll('button, a')).find(
            el => /активировать|открыть premium/i.test(el.textContent || '')
        );
        if (!activateBtn) return;

        let wrap = document.getElementById('premiumBtnWrap');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.id = 'premiumBtnWrap';
            wrap.style.cssText = 'display:block;width:100%;';
            activateBtn.parentNode.insertBefore(wrap, activateBtn);
            wrap.appendChild(activateBtn);
        }

        activateBtn.textContent = '👑 Открыть Premium';
        activateBtn.style.cssText = 'display:block;width:100%;height:auto;background:linear-gradient(135deg,#FFD700,#FFA500);border:none;color:#000;padding:11px 16px;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 4px 16px rgba(255,215,0,0.25);';
        activateBtn.onclick = function (e) { e.preventDefault(); openPremiumModal(); };
    }

    // ---------- ГЛАВНАЯ: бейдж статуса ----------
    function setupStatusBadge() {
        if (document.getElementById('premiumBadge')) return;
        const isPremium = localStorage.getItem('isPremium') === 'true';
        const badge = document.createElement('span');
        badge.id = 'premiumBadge';
        if (isPremium) {
            const until = localStorage.getItem('premiumUntil');
            let days = '';
            if (until) {
                const left = Math.ceil((new Date(until) - Date.now()) / 86400000);
                if (left > 0) days = ' · ' + left + ' дн.';
            }
            badge.textContent = '👑 Premium' + days;
        } else {
            badge.textContent = 'Free · получить Premium';
            badge.style.cssText = 'background:rgba(255,255,255,0.06);color:#888;border:1px solid rgba(255,255,255,0.1);padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-left:8px;cursor:pointer;';
            badge.onclick = openPremiumModal;
        }
        const logo = document.querySelector('h1, .logo, .brand');
        const header = document.querySelector('header, .header');
        if (logo) logo.insertAdjacentElement('afterend', badge);
        else if (header) header.appendChild(badge);
        else document.body.prepend(badge);
    }

    // ---------- СЧЁТЧИК ДНЕЙ PREMIUM НА ГЛАВНОЙ ----------
    function setupPremiumCounter() {
        if (document.getElementById('premiumDaysCounter')) return;
        const isPremium = localStorage.getItem('isPremium') === 'true';
        if (!isPremium) return;

        const until = localStorage.getItem('premiumUntil');
        let text, sub;
        if (!until) {
            text = '👑 Premium активен';
            sub = 'навсегда · безлимитные генерации';
        } else {
            const ms = new Date(until) - Date.now();
            if (ms <= 0) {
                text = '👑 Premium истёк';
                sub = 'продлите по рефералке или за Stars';
            } else {
                const days = Math.floor(ms / 86400000);
                const hours = Math.floor((ms % 86400000) / 3600000);
                text = '👑 Premium: осталось ' + (days > 0 ? days + ' дн. ' + hours + ' ч.' : hours + ' ч.');
                sub = 'до ' + new Date(until).toLocaleString('ru-RU', {
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                });
            }
        }

        const box = document.createElement('div');
        box.id = 'premiumDaysCounter';
        box.style.cssText = 'margin-top:12px;background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.3);border-radius:12px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px;';
        box.innerHTML =
            '<div><div style="color:#FFD700;font-weight:700;font-size:14px;">' + text + '</div>' +
            '<div style="color:#888;font-size:12px;margin-top:2px;">' + sub + '</div></div>' +
            '<button id="pdcExtend" style="background:rgba(255,215,0,0.15);border:1px solid rgba(255,215,0,0.4);color:#FFD700;padding:8px 12px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">+ Продлить</button>';

        const getMore = Array.from(document.querySelectorAll('button, a')).find(
            el => /получить ещё/i.test(el.textContent || '')
        );
        if (getMore && getMore.parentElement) {
            getMore.parentElement.insertBefore(box, getMore.nextSibling);
        } else {
            (document.querySelector('main') || document.body).appendChild(box);
        }

        const ext = document.getElementById('pdcExtend');
        if (ext) ext.onclick = function () {
            if (window.Referral && Referral.open) Referral.open();
            else if (window.PremiumStars && PremiumStars.open) PremiumStars.open();
        };
    }

    window.addEventListener('user-settings-updated', function () {
        const el = document.getElementById('premiumDaysCounter');
        if (el) el.remove();
        if (location.pathname.includes('index') || location.pathname === '/') setupPremiumCounter();
    });
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            if (location.pathname.includes('profile')) setupProfile();
            if (location.pathname.includes('index') || location.pathname === '/') {
                setupStatusBadge();
                setupPremiumCounter();
            }
        }, 800);
    });

    window.PremiumStars = { buy: buyPremium, open: openPremiumModal, close: closePremiumModal };
})();
