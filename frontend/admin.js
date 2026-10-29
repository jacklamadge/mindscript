// admin.js — рендер админ-дашборда
(async function () {
    const root = document.getElementById('root');

    try {
        const initData = localStorage.getItem('tgInitData');
        const userId = localStorage.getItem('userId');
        const res = await fetch('/api/admin/stats', {
            headers: {
                'X-Telegram-Init-Data': initData || '',
                'X-User-Id': userId || ''
            }
        });

        if (res.status === 403) {
            root.innerHTML = '<div class="error">🚫 Доступ только для администратора.<br><br>Ваш Telegram ID должен быть в backend/.env как ADMIN_TELEGRAM_ID</div>';
            return;
        }
        if (!res.ok) {
            const err = await res.json().catch(function () { return {}; });
            throw new Error(err.detail || 'Ошибка загрузки (status ' + res.status + ')');
        }

        const d = await res.json();
        render(d);
    } catch (e) {
        root.innerHTML = '<div class="error">❌ ' + e.message + '</div>';
    }

    function render(d) {
        const u = d.users, p = d.prompts;
        root.innerHTML = `
            <div class="cards">
                <div class="card"><div class="label">Всего юзеров</div><div class="value">${u.total}</div><div class="sub">+${u.new_today} сегодня</div></div>
                <div class="card"><div class="label">Новых за неделю</div><div class="value lime">+${u.new_week}</div></div>
                <div class="card"><div class="label">Premium</div><div class="value gold">👑 ${u.premium}</div><div class="sub">${u.total ? ((u.premium/u.total)*100).toFixed(1) : 0}% конверсия</div></div>
                <div class="card"><div class="label">Через рефералку</div><div class="value">${u.via_referral}</div></div>
                <div class="card"><div class="label">Всего промптов</div><div class="value">${p.total}</div><div class="sub">+${p.today} сегодня</div></div>
                <div class="card"><div class="label">За неделю</div><div class="value lime">${p.week}</div></div>
            </div>

            <div class="section">
                <h2>📈 Генерации по дням (30 дней)</h2>
                <div class="chart-wrap"><canvas id="chartPrompts"></canvas></div>
            </div>

            <div class="section">
                <h2>👥 Новые пользователи по дням</h2>
                <div class="chart-wrap"><canvas id="chartUsers"></canvas></div>
            </div>

            <div class="section">
                <h2>🏆 Топ категорий</h2>
                ${renderTopList(p.top_categories)}
            </div>

            <div class="section">
                <h2>🤖 По источникам LLM</h2>
                ${renderSources(p.by_source)}
            </div>
        `;

        drawChart('chartPrompts', d.timeseries.prompts, 'Промпты', '#C6FF33');
        drawChart('chartUsers', d.timeseries.users, 'Юзеры', '#FFD700');
    }

    function renderTopList(items) {
        if (!items.length) return '<div style="color:#666;">Пока нет данных</div>';
        const max = items[0].count;
        return '<ul class="top-list">' + items.map(function (it) {
            return `
                <li>
                    <span>${escapeHtml(it.category)}</span>
                    <div class="bar"><span style="width:${(it.count/max)*100}%"></span></div>
                    <span class="count">${it.count}</span>
                </li>
            `;
        }).join('') + '</ul>';
    }

    function renderSources(obj) {
        const entries = Object.entries(obj);
        if (!entries.length) return '<div style="color:#666;">Пока нет данных</div>';
        const max = Math.max.apply(null, entries.map(function (e) { return e[1]; }));
        return '<ul class="top-list">' + entries.map(function (e) {
            const k = e[0], v = e[1];
            return `
                <li>
                    <span>${escapeHtml(k)}</span>
                    <div class="bar"><span style="width:${(v/max)*100}%"></span></div>
                    <span class="count">${v}</span>
                </li>
            `;
        }).join('') + '</ul>';
    }

    function drawChart(id, data, label, color) {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js не загружен');
            return;
        }
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(function (x) { return x.day; }),
                datasets: [{
                    label: label,
                    data: data.map(function (x) { return x.prompts || x.users; }),
                    borderColor: color,
                    backgroundColor: color + '20',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 3,
                    pointBackgroundColor: color,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: { color: '#666' },
                        grid: { color: 'rgba(255,255,255,0.04)' }
                    },
                    y: {
                        ticks: { color: '#666' },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
        });
    }
})();