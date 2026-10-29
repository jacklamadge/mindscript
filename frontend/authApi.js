// authApi.js — регистрация, вход, сессия, настройки аккаунта

const AUTH_BASE = '/api/auth';

function assertHttpOrigin() {
    if (window.location.protocol === 'file:') {
        throw new Error('Открой приложение через http://127.0.0.1:8000/ (запусти start-server.bat)');
    }
}

function getCurrentUserId() {
    const parsed = parseInt(localStorage.getItem('userId') || '', 10);
    return Number.isNaN(parsed) || parsed < 1 ? null : parsed;
}

/** Гостевой id для переноса данных при входе/регистрации */
function getMigrateFromUserId() {
    if (isRegistered()) return null;
    return getCurrentUserId();
}

function applyUserSettings(user) {
    if (!user) return;
    if (user.tokens_left != null) {
        localStorage.setItem('tokensLeft', String(user.tokens_left));
    }
    if (user.generations_left != null) {
        localStorage.setItem('generationsLeft', String(user.generations_left));
    }
    window.dispatchEvent(new Event('user-settings-updated'));
}

function saveSession(user) {
    localStorage.setItem('userId', String(user.user_id));
    localStorage.setItem('authEmail', user.email);
    localStorage.setItem('authName', user.display_name);
    localStorage.setItem('isRegistered', 'true');
    applyUserSettings(user);
}

function clearSession() {
    getOrCreateGuestUserId();
    localStorage.removeItem('authEmail');
    localStorage.removeItem('authName');
    localStorage.removeItem('isRegistered');
    localStorage.removeItem('libraryMigratedToServer');
    window.dispatchEvent(new Event('user-settings-updated'));
}

function isRegistered() {
    return (
        localStorage.getItem('isRegistered') === 'true' &&
        !!localStorage.getItem('authName')
    );
}

function getDisplayName() {
    return localStorage.getItem('authName') || 'Пользователь';
}

function getEmail() {
    return localStorage.getItem('authEmail') || '';
}

async function authFetch(path, options = {}) {
    assertHttpOrigin();
    const url = new URL(AUTH_BASE + path, window.location.origin).href;
    const headers = {
        'Accept': 'application/json',
        ...(options.headers || {}),
    };
    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    const userId = localStorage.getItem('userId');
    if (userId && options.useUserHeader !== false) {
        headers['X-User-Id'] = userId;
    }
    const response = await fetch(url, { ...options, headers });
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
        if (Array.isArray(detail) && detail[0]?.msg) msg = detail[0].msg;
        throw new Error(msg);
    }
    return body;
}

async function register(displayName, password) {
    const user = await authFetch('/register', {
        method: 'POST',
        body: JSON.stringify({
            display_name: displayName,
            password,
            migrate_from_user_id: getMigrateFromUserId(),
        }),
        useUserHeader: false,
    });
    saveSession(user);
    return user;
}

async function login(displayName, password) {
    const user = await authFetch('/login', {
        method: 'POST',
        body: JSON.stringify({
            display_name: displayName,
            password,
            migrate_from_user_id: getMigrateFromUserId(),
        }),
        useUserHeader: false,
    });
    saveSession(user);
    return user;
}

async function fetchMe() {
    return authFetch('/me');
}

async function saveSettings(tokensLeft, generationsLeft) {
    const body = {};
    if (tokensLeft != null) body.tokens_left = tokensLeft;
    if (generationsLeft != null) body.generations_left = generationsLeft;
    const user = await authFetch('/settings', {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
    applyUserSettings(user);
    return user;
}

/** Восстановить сессию после перезагрузки — подтянуть профиль и настройки с сервера */
async function restoreSession() {
    if (!isRegistered()) return null;
    try {
        const user = await fetchMe();
        saveSession(user);
        return user;
    } catch (e) {
        console.warn('Сессия недействительна:', e.message);
        localStorage.removeItem('isRegistered');
        localStorage.removeItem('authEmail');
        localStorage.removeItem('authName');
        getOrCreateGuestUserId();
        return null;
    }
}

function getOrCreateGuestUserId() {
    let userId = localStorage.getItem('userId');
    const parsed = parseInt(userId || '', 10);
    if (!userId || Number.isNaN(parsed) || parsed < 1) {
        userId = Math.floor(Math.random() * 1000000000).toString();
        localStorage.setItem('userId', userId);
    }
    return parseInt(userId, 10);
}

/** Списать токены/генерации и сохранить на сервере (для залогиненных) */
async function syncResourcesAfterSpend() {
    if (!isRegistered()) return;
    const tokens = parseInt(localStorage.getItem('tokensLeft') || '125', 10);
    const gens = parseInt(localStorage.getItem('generationsLeft') || '5', 10);
    try {
        await saveSettings(tokens, gens);
    } catch (e) {
        console.warn('Не удалось сохранить баланс на сервер:', e.message);
    }
}

window.AuthApi = {
    register,
    login,
    fetchMe,
    saveSession,
    clearSession,
    restoreSession,
    saveSettings,
    syncResourcesAfterSpend,
    applyUserSettings,
    isRegistered,
    getDisplayName,
    getEmail,
    getCurrentUserId,
    getOrCreateGuestUserId,
};

// Автовосстановление сессии на всех страницах с authApi.js
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (isRegistered()) {
            restoreSession().catch(() => {});
        }
    });
}
