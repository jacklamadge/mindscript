// dataSender.js — отправка данных на бэкенд в формате промпт.json

const PROMPT_SAVE_URL = '/api/prompt/save';

function assertHttpOrigin() {
    if (window.location.protocol === 'file:') {
        throw new Error(
            'Страница открыта как файл. Запусти бэкенд и открой http://127.0.0.1:8000/ (не двойной клик по .html).'
        );
    }
}

// Генерация sessionId (сохраняется на всё время сессии)
function getOrCreateSessionId() {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
        // Используем crypto.randomUUID() если доступно, иначе генерируем вручную
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            sessionId = crypto.randomUUID();
        } else {
            sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
}

// Получение или создание userId
function getOrCreateUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = Math.floor(Math.random() * 1000000000).toString();
        localStorage.setItem('userId', userId);
    }
    return userId;
}

// Формирование данных в нужном формате (как в промпт.json)
function buildPromptData(category, answersArray) {
    // Преобразуем массив ответов в объект с ключами "1","2","3"...
    const answersObject = {};
    for (let i = 0; i < answersArray.length; i++) {
        answersObject[i + 1] = answersArray[i] || "";
    }
    // Добавляем 8-й вопрос (запасной) — можно использовать для дополнительных данных
    answersObject[8] = "";
    
    return {
        userId: parseInt(getOrCreateUserId()),
        sessionId: getOrCreateSessionId(),
        type: "prompt",
        timestamp: new Date().toISOString(),
        data: {
            category: category,
            answers: answersObject
        }
    };
}

// Сохранение в локальную историю (для отладки и резерва)
function saveToLocalHistory(payload) {
    const history = JSON.parse(localStorage.getItem('promptHistory') || '[]');
    history.unshift(payload);
    // Храним последние 100 отправок
    localStorage.setItem('promptHistory', JSON.stringify(history.slice(0, 100)));
}

// Офлайн-очередь
function saveToOfflineQueue(payload) {
    let queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    queue.push(payload);
    localStorage.setItem('offlineQueue', JSON.stringify(queue));
    console.log('📦 Данные добавлены в очередь офлайн-отправки');
}

function formatServerError(body, status) {
    const detail = body && body.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail[0] && detail[0].msg) return detail[0].msg;
    return `Ошибка сервера (${status})`;
}

// Отправка данных на бэкенд с проверкой лимитов
async function sendPromptDataToBackend(category, answersArray) {
    assertHttpOrigin();
    const unlimited = window.APP_CONFIG?.unlimitedResources === true;
    if (!unlimited && window.TokenManager && !window.TokenManager.checkGenerationsAvailable()) {
        throw new Error('⚠️ Лимит генераций исчерпан. Зарегистрируйтесь или нажмите «Получить ещё».');
    }

    const payload = buildPromptData(category, answersArray);
    console.log("📤 Отправка данных на сервер:", JSON.stringify(payload, null, 2));
    saveToLocalHistory(payload);
    
    if (!navigator.onLine) {
        console.log('⚠️ Нет соединения, данные сохранены в очередь');
        saveToOfflineQueue(payload);
        throw new Error('Нет интернета. Подключись и попробуй снова.');
    }
    
    let response;
    const controller = new AbortController();
    const fetchTimer = setTimeout(() => controller.abort(), 90000);
    try {
        response = await fetch(PROMPT_SAVE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-User-Id': String(getOrCreateUserId())
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
    } catch (error) {
        clearTimeout(fetchTimer);
        if (error && error.name === 'AbortError') {
            console.error('⏱ Таймаут запроса к серверу');
            throw new Error('Сервер не ответил вовремя. Попробуйте ещё раз через минуту.');
        }
        console.error('❌ Ошибка соединения:', error);
        saveToOfflineQueue(payload);
        throw new Error('Не удалось связаться с сервером.');
    }
    clearTimeout(fetchTimer);
    
    const raw = await response.text();
    let body = null;
    try {
        body = raw ? JSON.parse(raw) : null;
    } catch (_) {
        body = null;
    }
    
    if (!response.ok) {
        console.error('❌ Ошибка сервера:', response.status, raw);
        saveToOfflineQueue(payload);
        throw new Error(formatServerError(body, response.status));
    }
    
    if (!body || !body.final_prompt || !String(body.final_prompt).trim()) {
        throw new Error('Сервер не вернул промпт.');
    }
    
    console.log('✅ Промпт получен с сервера');
    markAsSent(payload.sessionId);

    // === СОХРАНЯЕМ ПРОМПТ ДЛЯ answer.html ===
    if (body.final_prompt) localStorage.setItem('generatedPrompt', body.final_prompt);
    if (body.short_summary) localStorage.setItem('generatedPromptSummary', body.short_summary);
    if (body.id) localStorage.setItem('generatedPromptId', String(body.id));
    if (body.tags) localStorage.setItem('generatedPromptTags', JSON.stringify(body.tags));
    localStorage.setItem('quizCategory', category);
    // ========================================
    // 2. СПИСАНИЕ ЛИМИТА ПОСЛЕ УСПЕХА
     if (!unlimited && window.TokenManager) {
        window.TokenManager.spendGeneration();
        if (window.AuthApi?.isRegistered?.()) {
            await window.AuthApi.syncResourcesAfterSpend();
        }
    
        
        // Уведомляем другие части приложения об изменении
        window.dispatchEvent(new Event('user-settings-updated'));
        
        // Синхронизация с сервером для зарегистрированных пользователей
        if (window.AuthApi?.isRegistered?.()) {
            await window.AuthApi.syncResourcesAfterSpend();
        }
    }
    
    markAsSent(payload.sessionId);
    return body;
}

// Отметка об успешной отправке
function markAsSent(sessionId) {
    const sent = JSON.parse(localStorage.getItem('sentPrompts') || '[]');
    if (!sent.includes(sessionId)) {
        sent.push(sessionId);
        localStorage.setItem('sentPrompts', JSON.stringify(sent.slice(0, 100)));
    }
}

// Отправка очереди при восстановлении интернета
async function flushOfflineQueue() {
    const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    if (queue.length === 0) return;
    
    console.log(`🔄 Отправка ${queue.length} сохранённых записей из очереди...`);
    
    for (let i = 0; i < queue.length; i++) {
        const payload = queue[i];
        try {
            const response = await fetch(PROMPT_SAVE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                console.log(`✅ Запись ${i + 1}/${queue.length} отправлена`);
                markAsSent(payload.sessionId);
            } else {
                console.error(`❌ Ошибка отправки записи ${i + 1}`);
                // Прерываем, остальное отправим в следующий раз
                return;
            }
        } catch (error) {
            console.error(`❌ Ошибка соединения при отправке записи ${i + 1}`);
            return;
        }
    }
    
    // Очищаем очередь только если все успешно отправлены
    localStorage.setItem('offlineQueue', '[]');
    console.log('✅ Очередь полностью отправлена');
}

// Экспорт всех данных (для отладки)
function exportAllPromptData() {
    const data = {
        userId: getOrCreateUserId(),
        sessionId: getOrCreateSessionId(),
        promptHistory: JSON.parse(localStorage.getItem('promptHistory') || '[]'),
        offlineQueue: JSON.parse(localStorage.getItem('offlineQueue') || '[]'),
        sentPrompts: JSON.parse(localStorage.getItem('sentPrompts') || '[]')
    };
    console.log('📊 Экспорт всех данных:', data);
    return data;
}

// Очистка старых данных (если нужно)
function clearOldPromptData() {
    localStorage.removeItem('promptHistory');
    localStorage.removeItem('offlineQueue');
    localStorage.removeItem('sentPrompts');
    console.log('🧹 История отправок очищена');
}

// Тестовая отправка (для проверки)
function testSendData() {
    const testAnswers = ["Telegram-бот", "Python", "MVP", "Docker", "PostgreSQL", "Tailwind", "Высокая производительность"];
    sendPromptDataToBackend('dev', testAnswers);
}

// Слушаем восстановление интернета
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('🌐 Интернет восстановлен, отправляем очередь...');
        flushOfflineQueue();
    });
    
    // При загрузке страницы пробуем отправить очередь
    setTimeout(() => {
        if (navigator.onLine) {
            flushOfflineQueue();
        }
    }, 3000);
}

// Доступ к функциям через глобальный объект для отладки
window.PromptData = {
    exportAll: exportAllPromptData,
    testSend: testSendData,
    clearOld: clearOldPromptData,
    flushQueue: flushOfflineQueue
};
