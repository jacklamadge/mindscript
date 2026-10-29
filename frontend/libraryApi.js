// libraryApi.js — история, избранное, коллекции через бэкенд

const LIBRARY_BASE = '/api/library';
const MIGRATED_KEY = 'libraryMigratedToServer';

function assertHttpOrigin() {
    if (window.location.protocol === 'file:') {
        throw new Error('Открой приложение через http://127.0.0.1:8000/');
    }
}

function getOrCreateUserId() {
    let userId = localStorage.getItem('userId');
    const parsed = parseInt(userId || '', 10);
    if (!userId || Number.isNaN(parsed) || parsed < 1) {
        userId = Math.floor(Math.random() * 1000000000).toString();
        localStorage.setItem('userId', userId);
        return parseInt(userId, 10);
    }
    return parsed;
}

async function libraryFetch(path, options = {}) {
    assertHttpOrigin();
    const headers = {
        'Accept': 'application/json',
        'X-User-Id': String(getOrCreateUserId()),
        ...(options.headers || {}),
    };
    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(LIBRARY_BASE + path, { ...options, headers });
    const raw = await response.text();
    let body = null;
    try {
        body = raw ? JSON.parse(raw) : null;
    } catch (_) {
        body = null;
    }
    if (!response.ok) {
        const detail = body?.detail;
        let msg = `Ошибка (${response.status})`;
        if (typeof detail === 'string') msg = detail;
        else if (Array.isArray(detail) && detail[0]?.msg) msg = detail[0].msg;
        throw new Error(msg);
    }
    return body;
}

function formatTimeAgo(dateInput) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) {
        return `сегодня, ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}

function formatDate(dateStr) {
    return formatTimeAgo(dateStr);
}

function mapItem(item) {
    const date = item.date || item.created_at;
    return {
        id: item.id,
        title: item.title,
        text: item.text,
        date: typeof date === 'string' ? date : new Date(date).toISOString(),
        meta: formatTimeAgo(date),
        prompt_record_id: item.prompt_record_id ?? null,
    };
}

function mapCollection(col) {
    return {
        id: col.id,
        name: col.name,
        items: (col.items || []).map(mapItem),
    };
}

function makeTitle(text, maxLen = 50) {
    const t = (text || '').trim();
    if (!t) return 'Промпт';
    if (t.length <= maxLen) return t;
    return t.slice(0, maxLen) + '...';
}

/** Заголовок для API (лимит бэкенда — 300 символов) */
function safeTitle(title, text, maxLen = 80) {
    let t = (title || '').trim();
    if (!t) t = makeTitle(text, maxLen);
    if (t.length > 300) t = t.slice(0, 297) + '...';
    return t || 'Промпт';
}

function isGuestUser() {
    return !window.AuthApi?.isRegistered?.();
}

function readLocalList(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(data) ? data.map(mapItem) : [];
    } catch (_) {
        return [];
    }
}

function writeLocalList(key, items) {
    localStorage.setItem(key, JSON.stringify(items.slice(0, 200)));
}

function readLocalCollections() {
    try {
        const data = JSON.parse(localStorage.getItem('collections') || '[]');
        return Array.isArray(data) ? data.map(mapCollection) : [];
    } catch (_) {
        return [];
    }
}

function writeLocalCollections(cols) {
    localStorage.setItem('collections', JSON.stringify(cols));
}

function newLocalItem(text, title, promptRecordId) {
    const now = new Date().toISOString();
    return {
        id: Date.now(),
        title: safeTitle(title, text, 40),
        text,
        date: now,
        meta: formatTimeAgo(now),
        prompt_record_id: promptRecordId ? parseInt(promptRecordId, 10) : null,
    };
}

async function loadHistory() {
    try {
        const data = await libraryFetch('/history');
        const items = (data || []).map(mapItem);
        if (isGuestUser()) writeLocalList('history', items);
        return items;
    } catch (e) {
        if (isGuestUser()) return readLocalList('history');
        throw e;
    }
}

async function loadFavorites() {
    try {
        const data = await libraryFetch('/favorites');
        const items = (data || []).map(mapItem);
        if (isGuestUser()) writeLocalList('favorites', items);
        return items;
    } catch (e) {
        if (isGuestUser()) return readLocalList('favorites');
        throw e;
    }
}

async function loadCollections() {
    try {
        const data = await libraryFetch('/collections');
        const items = (data || []).map(mapCollection);
        if (isGuestUser()) writeLocalCollections(items);
        return items;
    } catch (e) {
        if (isGuestUser()) return readLocalCollections();
        throw e;
    }
}

async function addHistory(text, title, promptRecordId) {
    try {
        const item = await libraryFetch('/history', {
            method: 'POST',
            body: JSON.stringify({
                title: safeTitle(title, text, 50),
                text,
                prompt_record_id: promptRecordId ? parseInt(promptRecordId, 10) : null,
            }),
        });
        return mapItem(item);
    } catch (e) {
        if (!isGuestUser()) throw e;
        const list = readLocalList('history');
        const entry = newLocalItem(text, title, promptRecordId);
        list.unshift(entry);
        writeLocalList('history', list);
        return entry;
    }
}

async function addFavorite(text, title, promptRecordId) {
    const pid = promptRecordId ? parseInt(promptRecordId, 10) : null;
    try {
        const item = await libraryFetch('/favorites', {
            method: 'POST',
            body: JSON.stringify({
                title: safeTitle(title, text, 40),
                text,
                prompt_record_id: pid,
            }),
        });
        const mapped = mapItem(item);
        if (isGuestUser()) {
            const list = readLocalList('favorites').filter(
                (f) => !(pid && f.prompt_record_id === pid) && f.text !== text
            );
            list.unshift(mapped);
            writeLocalList('favorites', list);
        }
        return mapped;
    } catch (e) {
        if (!isGuestUser()) throw e;
        const list = readLocalList('favorites');
        const existing = pid
            ? list.find((f) => f.prompt_record_id === pid)
            : list.find((f) => f.text === text);
        if (existing) return existing;
        const entry = newLocalItem(text, title, promptRecordId);
        list.unshift(entry);
        writeLocalList('favorites', list);
        return entry;
    }
}

async function deleteHistory(id) {
    try {
        await libraryFetch(`/history/${id}`, { method: 'DELETE' });
    } catch (e) {
        if (!isGuestUser()) throw e;
    }
    if (isGuestUser()) {
        writeLocalList(
            'history',
            readLocalList('history').filter((i) => i.id !== id)
        );
    }
}

async function deleteFavorite(id) {
    try {
        await libraryFetch(`/favorites/${id}`, { method: 'DELETE' });
    } catch (e) {
        if (!isGuestUser()) throw e;
    }
    if (isGuestUser()) {
        writeLocalList(
            'favorites',
            readLocalList('favorites').filter((i) => i.id !== id)
        );
    }
}

async function createCollection(name) {
    try {
        const col = await libraryFetch('/collections', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
        const mapped = mapCollection(col);
        if (isGuestUser()) {
            const cols = readLocalCollections();
            cols.unshift(mapped);
            writeLocalCollections(cols);
        }
        return mapped;
    } catch (e) {
        if (!isGuestUser()) throw e;
        const col = { id: Date.now(), name, items: [] };
        const cols = readLocalCollections();
        cols.unshift(col);
        writeLocalCollections(cols);
        return col;
    }
}

async function deleteCollection(id) {
    try {
        await libraryFetch(`/collections/${id}`, { method: 'DELETE' });
    } catch (e) {
        if (!isGuestUser()) throw e;
    }
    if (isGuestUser()) {
        writeLocalCollections(readLocalCollections().filter((c) => c.id !== id));
    }
}

async function addToCollection(collectionId, text, title, promptRecordId) {
    try {
        const item = await libraryFetch(`/collections/${collectionId}/items`, {
            method: 'POST',
            body: JSON.stringify({
                title: safeTitle(title, text, 40),
                text,
                prompt_record_id: promptRecordId ? parseInt(promptRecordId, 10) : null,
            }),
        });
        const mapped = mapItem(item);
        if (isGuestUser()) {
            const cols = readLocalCollections();
            const col = cols.find((c) => c.id === collectionId);
            if (col) {
                col.items = col.items || [];
                col.items.unshift(mapped);
                writeLocalCollections(cols);
            }
        }
        return mapped;
    } catch (e) {
        if (!isGuestUser()) throw e;
        const cols = readLocalCollections();
        const col = cols.find((c) => c.id === collectionId);
        if (!col) throw new Error('Коллекция не найдена');
        const entry = newLocalItem(text, title, promptRecordId);
        col.items = col.items || [];
        col.items.unshift(entry);
        writeLocalCollections(cols);
        return entry;
    }
}

async function deleteCollectionItem(collectionId, itemId) {
    try {
        await libraryFetch(`/collections/${collectionId}/items/${itemId}`, { method: 'DELETE' });
    } catch (e) {
        if (!isGuestUser()) throw e;
    }
    if (isGuestUser()) {
        const cols = readLocalCollections();
        const col = cols.find((c) => c.id === collectionId);
        if (col?.items) {
            col.items = col.items.filter((i) => i.id !== itemId);
            writeLocalCollections(cols);
        }
    }
}

async function loadStats() {
    return libraryFetch('/stats');
}

function safeParseJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : fallback;
    } catch (_) {
        return fallback;
    }
}

async function migrateFromLocalStorage() {
    const history = safeParseJson('history', []);
    const favorites = safeParseJson('favorites', []);
    const collections = safeParseJson('collections', []);

    const hasLocal =
        history.length > 0 || favorites.length > 0 || collections.length > 0;
    if (!hasLocal) {
        localStorage.setItem(MIGRATED_KEY, 'true');
        return false;
    }

    await libraryFetch('/migrate', {
        method: 'POST',
        body: JSON.stringify({
            history: history.map((h) => ({
                title: h.title || makeTitle(h.text, 50),
                text: h.text,
            })),
            favorites: favorites.map((f) => ({
                title: f.title || makeTitle(f.text, 40),
                text: f.text,
            })),
            collections: collections.map((c) => ({
                name: c.name,
                items: (c.items || []).map((i) => ({
                    title: i.title || makeTitle(i.text, 40),
                    text: i.text || i.title || '',
                })),
            })),
        }),
    });

    localStorage.removeItem('history');
    localStorage.removeItem('favorites');
    localStorage.removeItem('collections');
    localStorage.setItem(MIGRATED_KEY, 'true');
    return true;
}

async function ensureReady() {
    assertHttpOrigin();
    getOrCreateUserId();

    if (window.AuthApi?.isRegistered?.()) {
        try {
            await window.AuthApi.restoreSession();
        } catch (e) {
            console.warn('Сессия:', e.message);
        }
    }

    if (localStorage.getItem(MIGRATED_KEY) === 'true') return;
    try {
        await migrateFromLocalStorage();
    } catch (e) {
        console.warn('Миграция библиотеки:', e);
        localStorage.setItem(MIGRATED_KEY, 'true');
    }
}

async function loadStatsSafe() {
    assertHttpOrigin();
    getOrCreateUserId();
    try {
        return await loadStats();
    } catch (e) {
        if (!isGuestUser()) throw e;
        const h = readLocalList('history').length;
        const f = readLocalList('favorites').length;
        const cols = readLocalCollections();
        const inCols = cols.reduce((n, c) => n + (c.items?.length || 0), 0);
        return {
            history_count: h,
            favorites_count: f,
            collections_count: cols.length,
            prompts_total: h + f + inCols,
        };
    }
}

window.LibraryApi = {
    getOrCreateUserId,
    formatTimeAgo,
    formatDate,
    mapItem,
    loadHistory,
    loadFavorites,
    loadCollections,
    addHistory,
    addFavorite,
    deleteHistory,
    deleteFavorite,
    createCollection,
    deleteCollection,
    addToCollection,
    deleteCollectionItem,
    loadStats,
    loadStatsSafe,
    ensureReady,
    migrateFromLocalStorage,
    isGuestUser,
};
