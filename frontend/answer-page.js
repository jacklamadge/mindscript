// answer-page.js — страница результата (без alert для избранного)
const UNLIMITED = window.APP_CONFIG?.unlimitedResources === true;

function updateTokenDisplay() {
    const tokenSpan = document.getElementById('tokenValue');
    if (tokenSpan) tokenSpan.innerText = UNLIMITED ? '∞' : (localStorage.getItem('tokensLeft') || '125');
}
updateTokenDisplay();
window.addEventListener('storage', updateTokenDisplay);

const favoriteBtn = document.getElementById('favoriteBtn');
const FAVORITE_LABEL = '⭐ В избранное';
const FAVORITE_ACTIVE_LABEL = '✓ Добавлено в избранное';
let currentFavoriteId = null;
let favoriteBusy = false;

function setFavoriteUi(active, animate = false) {
    if (!favoriteBtn) return;
    favoriteBtn.classList.toggle('favorite-active', active);
    favoriteBtn.textContent = active ? FAVORITE_ACTIVE_LABEL : FAVORITE_LABEL;
    if (active && animate) {
        favoriteBtn.classList.remove('favorite-pop');
        void favoriteBtn.offsetWidth;
        favoriteBtn.classList.add('favorite-pop');
        setTimeout(() => favoriteBtn.classList.remove('favorite-pop'), 600);
    }
}

function findFavoriteInList(favorites, prompt, promptId) {
    if (promptId) {
        const id = parseInt(promptId, 10);
        const byRecord = favorites.find((f) => f.prompt_record_id === id);
        if (byRecord) return byRecord;
    }
    return favorites.find((f) => f.text === prompt) || null;
}

async function syncFavoriteState() {
    try {
        if (typeof LibraryApi === 'undefined') {
            console.warn('[syncFavoriteState] LibraryApi не загружен');
            return;
        }
        const prompt = localStorage.getItem('generatedPrompt');
        if (!prompt || prompt === 'undefined') return;
        const promptId = localStorage.getItem('generatedPromptId');
        await LibraryApi.ensureReady();
        const favorites = await LibraryApi.loadFavorites();
        const found = findFavoriteInList(favorites, prompt, promptId);
        currentFavoriteId = found ? found.id : null;
        setFavoriteUi(!!found);
    } catch (e) {
        console.warn('[syncFavoriteState] Ошибка:', e);
        setFavoriteUi(false);
    }
}

async function toggleFavorite() {
    if (favoriteBusy) return;
    const prompt = localStorage.getItem('generatedPrompt');
    if (!prompt || prompt === 'undefined') return;

    const promptId = localStorage.getItem('generatedPromptId');
    const summary = localStorage.getItem('generatedPromptSummary');

    favoriteBusy = true;
    favoriteBtn.classList.add('is-busy');

    try {
        await LibraryApi.ensureReady();

        if (currentFavoriteId) {
            await LibraryApi.deleteFavorite(currentFavoriteId);
            currentFavoriteId = null;
            setFavoriteUi(false);
        } else {
            const item = await LibraryApi.addFavorite(prompt, summary, promptId);
            currentFavoriteId = item.id;
            setFavoriteUi(true, true);
        }
    } catch (e) {
        console.error('Избранное:', e);
        setFavoriteUi(!!currentFavoriteId);
    } finally {
        favoriteBusy = false;
        favoriteBtn.classList.remove('is-busy');
    }
}

function openCollectionModal() {
    document.getElementById('collectionModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('collectionModal').style.display = 'none';
    document.getElementById('newCollectionName').value = '';
}

async function createAndSaveToCollection() {
    const collectionName = document.getElementById('newCollectionName').value.trim();
    if (!collectionName) return;

    const prompt = localStorage.getItem('generatedPrompt');
    if (!prompt) return;

    const promptId = localStorage.getItem('generatedPromptId');
    const summary = localStorage.getItem('generatedPromptSummary');

    try {
        await LibraryApi.ensureReady();
        const collections = await LibraryApi.loadCollections();
        let col = collections.find((c) => c.name === collectionName);
        if (!col) {
            col = await LibraryApi.createCollection(collectionName);
        }
        await LibraryApi.addToCollection(col.id, prompt, summary, promptId);
        closeModal();
    } catch (e) {
        console.warn(e);
    }
}

function clearPromptCache() {
    localStorage.removeItem('generatedPrompt');
    localStorage.removeItem('generatedPromptSummary');
    localStorage.removeItem('generatedPromptId');
    localStorage.removeItem('generationCompleted');
}

// Правильная обработка старого кэша
function isOldCachedTemplate(text) {
    if (!text) return false;
    // Это старый шаблон, если содержит "Ты — опытный инженер"
    // но НЕ содержит признаков нового Gemini-промта
    return text.includes('Ты — опытный инженер и ассистент по разработке')
        && !text.includes('Сгенерировано')
        && !text.includes('## Цель');
}

const promptText = document.getElementById('promptText');
let generatedPrompt = localStorage.getItem('generatedPrompt');

// Проверка старого кэша
if (isOldCachedTemplate(generatedPrompt)) {
    clearPromptCache();
    // Показываем красивое сообщение вместо редиректа
    const app = document.querySelector('.app');
    if (app) {
        app.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">🧠</div>
                <h1 style="font-size: 24px; margin-bottom: 12px;">Новый ИИ!</h1>
                <p style="color: #888; margin-bottom: 30px;">Мы обновили систему генерации.<br>Пройди квиз ещё раз для лучшего промпта.</p>
                <button onclick="window.location.href='quiz.html?category=dev'" style="padding: 14px 28px; background: #C6FF33; color: #000; border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">Пройти квиз</button>
            </div>
        `;
    }
}

if (!generatedPrompt || generatedPrompt === 'undefined' || generatedPrompt === 'null') {
    window.location.replace('index.html');
} else if (generatedPrompt) {
    promptText.innerText = generatedPrompt;
    const hint = document.getElementById('promptHint');
    if (hint && generatedPrompt.length > 400) hint.style.display = 'block';
} else {
    promptText.innerText = 'Промпт успешно сгенерирован!\n\nИспользуйте его в ChatGPT или другом ИИ.';
}

document.getElementById('copyBtn').onclick = () => {
    navigator.clipboard.writeText(promptText.innerText);
    document.getElementById('copyBtn').textContent = ' Скопировано!';
    setTimeout(() => {
        document.getElementById('copyBtn').textContent = '📋 Копировать';
    }, 2000);
};

if (favoriteBtn) {
    favoriteBtn.type = 'button';
    favoriteBtn.onclick = () => toggleFavorite();
    console.log('[answer-page] favoriteBtn обработчик назначен');
}
try {
    syncFavoriteState();
} catch (e) {
    console.error('[answer-page] syncFavoriteState упала:', e);
}

const collectionBtn = document.getElementById('collectionBtn');
if (collectionBtn) {
    collectionBtn.type = 'button';
    collectionBtn.onclick = openCollectionModal;
    console.log('[answer-page] collectionBtn обработчик назначен');
} else {
    console.warn('[answer-page] collectionBtn не найден в DOM');
}

document.getElementById('improveBtn').onclick = async () => {
    const btn = document.getElementById('improveBtn');
    const comment = window.prompt('Что именно улучшить? (например: добавь обработку ошибок)');
    if (comment === null) return;

    const originalText = btn.textContent;
    btn.textContent = '⏳ Улучшаю...';
    btn.classList.add('is-busy');

    try {
        const res = await fetch('/api/prompt/improve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                original_prompt: promptText.innerText,
                user_comment: comment || ''
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Ошибка улучшения');

        promptText.innerText = data.improved_prompt;
        localStorage.setItem('generatedPrompt', data.improved_prompt);
        if (window.Toast) Toast.success('Промпт улучшен!');
        const hint = document.getElementById('promptHint');
        if (hint && data.improved_prompt.length > 400) hint.style.display = 'block';
        const sc = document.getElementById('promptScroll');
        if (sc) sc.scrollTop = 0;
    } catch (e) {
        if (window.Toast) Toast.error('❌ ' + e.message);
    } finally {
        btn.textContent = originalText;
        btn.classList.remove('is-busy');
    }
};
// ============================================
// 📤 ЭКСПОРТ ПРОМПТА В ФАЙЛ
// ============================================

function generateMarkdownContent() {
    const prompt = localStorage.getItem('generatedPrompt') || '';
    const summary = localStorage.getItem('generatedPromptSummary') || 'Без названия';
    const tags = JSON.parse(localStorage.getItem('generatedPromptTags') || '[]');
    const category = localStorage.getItem('quizCategory') || 'general';
    const date = new Date().toLocaleString('ru-RU');
    
    const categoryLabels = {
        'dev': '💻 Разработка',
        'promo': '📢 Продвижение',
        'marketing': '📢 Маркетинг',
        'it': ' IT',
        'general': ' Общее'
    };
    
    return `# ${summary}

> Сгенерировано: ${date}  
> Категория: ${categoryLabels[category] || category}  
> Теги: ${tags.length > 0 ? tags.map(t => `#${t}`).join(' ') : '#промпт'}

---

## 📋 Промпт

${prompt}

---

## ℹ️ Информация

- **Источник:** VIBEPROMT
- **Дата создания:** ${date}
- **Использовать в:** ChatGPT, Claude, Cursor, Copilot

---

*Создано с помощью [VIBEPROMT](http://127.0.0.1:8000)*
`;
}

function exportPromptAsMarkdown() {
    const content = generateMarkdownContent();
    const summary = localStorage.getItem('generatedPromptSummary') || 'prompt';
    
    // Очищаем имя файла от спецсимволов
    const safeName = summary
        .replace(/[^a-zA-Zа-яА-Я0-9\s_-]/g, '')
        .trim()
        .slice(0, 50)
        .replace(/\s+/g, '_');
    
    const filename = `prompt_${safeName}_${Date.now()}.md`;
    
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    // Визуальный фидбек
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        const originalText = exportBtn.textContent;
        exportBtn.textContent = '✅ Скачано!';
        exportBtn.style.background = '#4CAF50';
        setTimeout(() => {
            exportBtn.textContent = originalText;
            exportBtn.style.background = '';
        }, 2000);
    }
}

function exportPromptAsText() {
    const prompt = localStorage.getItem('generatedPrompt') || '';
    const summary = localStorage.getItem('generatedPromptSummary') || 'prompt';
    
    const safeName = summary
        .replace(/[^a-zA-Zа-яА-Я0-9\s_-]/g, '')
        .trim()
        .slice(0, 50)
        .replace(/\s+/g, '_');
    
    const filename = `prompt_${safeName}_${Date.now()}.txt`;
    
    const blob = new Blob([prompt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

// Привязка к кнопкам (если они есть в HTML)
const exportBtn = document.getElementById('exportBtn');
if (exportBtn) {
    exportBtn.onclick = exportPromptAsMarkdown;
}

const exportTxtBtn = document.getElementById('exportTxtBtn');
if (exportTxtBtn) {
    exportTxtBtn.onclick = exportPromptAsText;
}

// Экспорт функций для использования в других местах
window.ExportPrompt = {
    asMarkdown: exportPromptAsMarkdown,
    asText: exportPromptAsText,
    generateContent: generateMarkdownContent
};
// ============================================
// 📤 ЭКСПОРТ ПРОМПТА В ФАЙЛ
// ============================================

function generateMarkdownContent() {
    const prompt = localStorage.getItem('generatedPrompt') || '';
    const summary = localStorage.getItem('generatedPromptSummary') || 'Без названия';
    const tags = JSON.parse(localStorage.getItem('generatedPromptTags') || '[]');
    const category = localStorage.getItem('quizCategory') || 'general';
    const date = new Date().toLocaleString('ru-RU');
    
    const categoryLabels = {
        'dev': '💻 Разработка',
        'promo': '📢 Продвижение',
        'marketing': '📢 Маркетинг',
        'it': '💻 IT',
        'general': '📋 Общее'
    };
    
    const tagsLine = tags.length > 0 ? tags.map(t => '#' + t).join(' ') : '#промпт';
    
    return `# ${summary}

> Сгенерировано: ${date}  
> Категория: ${categoryLabels[category] || category}  
> Теги: ${tagsLine}

---

## 📋 Промпт

${prompt}

---

## ℹ️ Информация

- **Источник:** VIBEPROMT
- **Дата создания:** ${date}
- **Использовать в:** ChatGPT, Claude, Cursor, Copilot

---

*Создано с помощью [VIBEPROMT](http://127.0.0.1:8000)*
`;
}

function exportPromptAsMarkdown() {
    const content = generateMarkdownContent();
    const summary = localStorage.getItem('generatedPromptSummary') || 'prompt';
    
    const safeName = summary
        .replace(/[^a-zA-Zа-яА-Я0-9\s_-]/g, '')
        .trim()
        .slice(0, 50)
        .replace(/\s+/g, '_');
    
    const filename = `prompt_${safeName}_${Date.now()}.md`;
    
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        const originalText = exportBtn.textContent;
        exportBtn.textContent = '✅ Скачано!';
        exportBtn.style.background = '#4CAF50';
        setTimeout(() => {
            exportBtn.textContent = originalText;
            exportBtn.style.background = '';
        }, 2000);
    }
}

function exportPromptAsText() {
    const prompt = localStorage.getItem('generatedPrompt') || '';
    const summary = localStorage.getItem('generatedPromptSummary') || 'prompt';
    
    const safeName = summary
        .replace(/[^a-zA-Zа-яА-Я0-9\s_-]/g, '')
        .trim()
        .slice(0, 50)
        .replace(/\s+/g, '_');
    
    const filename = `prompt_${safeName}_${Date.now()}.txt`;
    
    const blob = new Blob([prompt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

// Привязка к кнопкам
const exportBtn = document.getElementById('exportBtn');
if (exportBtn) {
    exportBtn.onclick = exportPromptAsMarkdown;
}

const exportTxtBtn = document.getElementById('exportTxtBtn');
if (exportTxtBtn) {
    exportTxtBtn.onclick = exportPromptAsText;
}

// Экспорт функций
window.ExportPrompt = {
    asMarkdown: exportPromptAsMarkdown,
    asText: exportPromptAsText,
    generateContent: generateMarkdownContent
};
document.getElementById('premiumCard').onclick = () => {
    if (window.Toast) Toast.info('👑 Premium скоро!');
};
// ============ 📤 ЭКСПОРТ ПРОМПТА ============
function _safeFileName(summary) {
    return ((summary || 'prompt')
        .replace(/[^a-zA-Zа-яА-Я0-9\s_-]/g, '')
        .trim().slice(0, 50).replace(/\s+/g, '_')) || 'prompt';
}

function _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function buildMarkdown() {
    const prompt = localStorage.getItem('generatedPrompt') || promptText.innerText;
    const summary = localStorage.getItem('generatedPromptSummary') || 'Промпт';
    let tags = [];
    try { tags = JSON.parse(localStorage.getItem('generatedPromptTags') || '[]'); } catch (e) {}
    const category = localStorage.getItem('quizCategory') || '';
    const date = new Date().toLocaleString('ru-RU');
    const categoryLabels = { dev: '💻 Разработка', promo: '📢 Продвижение' };
    const tagsLine = tags.length ? tags.map(function (t) { return '#' + t; }).join(' ') : '#промпт';

    return '# ' + summary + '\n\n'
        + '> Сгенерировано: ' + date + '\n'
        + (category ? '> Категория: ' + (categoryLabels[category] || category) + '\n' : '')
        + '> Теги: ' + tagsLine + '\n\n'
        + '---\n\n## 📋 Промпт\n\n' + prompt + '\n\n'
        + '---\n\n## ℹ️ Информация\n\n'
        + '- **Источник:** VIBEPROMT (mindscript)\n'
        + '- **Дата создания:** ' + date + '\n'
        + '- **Где использовать:** ChatGPT, Claude, Cursor, Copilot\n\n'
        + '*Создано с помощью VIBEPROMT*\n';
}

function ensureExportButtons() {
    if (document.getElementById('exportBtn')) return;
    const copyBtn = document.getElementById('copyBtn');
    if (!copyBtn) return;
    const md = document.createElement('button');
    md.id = 'exportBtn'; md.type = 'button'; md.textContent = '📥 Скачать .md';
    const txt = document.createElement('button');
    txt.id = 'exportTxtBtn'; txt.type = 'button'; txt.textContent = '📄 Скачать .txt';
    copyBtn.insertAdjacentElement('afterend', md);
    md.insertAdjacentElement('afterend', txt);
}

ensureExportButtons();

const exportBtn = document.getElementById('exportBtn');
if (exportBtn) exportBtn.onclick = function () {
    const name = 'prompt_' + _safeFileName(localStorage.getItem('generatedPromptSummary')) + '_' + Date.now() + '.md';
    _download(new Blob([buildMarkdown()], { type: 'text/markdown;charset=utf-8' }), name);
    if (window.Toast) Toast.success('✅ Файл .md скачан!');
};

const exportTxtBtn = document.getElementById('exportTxtBtn');
if (exportTxtBtn) exportTxtBtn.onclick = function () {
    const name = 'prompt_' + _safeFileName(localStorage.getItem('generatedPromptSummary')) + '_' + Date.now() + '.txt';
    _download(new Blob([promptText.innerText], { type: 'text/plain;charset=utf-8' }), name);
    if (window.Toast) Toast.success('✅ Файл .txt скачан!');
};  