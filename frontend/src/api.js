// ============================================
// 📡 API КЛИЕНТ ДЛЯ БЭКЕНДА
// ============================================

const API_BASE = window.APP_CONFIG?.apiBaseUrl || 'http://127.0.0.1:8000';

// Получаем ID пользователя из localStorage
const getUserId = () => {
  const userId = localStorage.getItem('user_id');
  return userId ? parseInt(userId) : null;
};

// Сохраняем ID пользователя
const setUserId = (id) => {
  localStorage.setItem('user_id', id.toString());
};

// Базовый запрос с заголовками
const apiRequest = async (endpoint, options = {}) => {
  const userId = getUserId();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Добавляем X-User-Id если пользователь авторизован
  if (userId) {
    headers['X-User-Id'] = userId;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Ошибка запроса');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// ============================================
// 🔐 АВТОРИЗАЦИЯ
// ============================================

export const authAPI = {
  // Регистрация
  register: async (username, password) => {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.user_id) {
      setUserId(data.user_id);
    }
    return data;
  },

  // Вход
  login: async (username, password) => {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.user_id) {
      setUserId(data.user_id);
    }
    return data;
  },

  // Получить текущий профиль
  me: async () => {
    return await apiRequest('/api/auth/me', {
      method: 'GET',
    });
  },

  // Обновить настройки
  updateSettings: async (settings) => {
    return await apiRequest('/api/auth/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },
};

// ============================================
// 📝 ПРОМПТЫ
// ============================================

export const promptAPI = {
  // Получить вопросы для категории
  getQuestions: async (category) => {
    return await apiRequest('/api/prompt/questions', {
      method: 'POST',
      body: JSON.stringify({ category }),
    });
  },

  // Сгенерировать промпт
  generate: async (answers, userId, sessionId) => {
  return await apiRequest('/api/prompt/save', {
    method: 'POST',
    body: JSON.stringify({
      type: 'prompt',
      userId: userId,
      sessionId: sessionId,
      data: answers,  // Ответы из квиза
    }),
  });
},

  // Получить историю промптов
  getHistory: async () => {
    return await apiRequest('/api/prompt/history', {
      method: 'GET',
    });
  },

  // Получить промпт по ID
  getById: async (id) => {
    return await apiRequest(`/api/prompt/${id}`, {
      method: 'GET',
    });
  },
};

// ============================================
// 📚 БИБЛИОТЕКА
// ============================================

export const libraryAPI = {
  // Получить все промпты
  getAll: async () => {
    return await apiRequest('/api/library', {
      method: 'GET',
    });
  },

  // Добавить в избранное
  addToFavorites: async (promptId) => {
    return await apiRequest(`/api/library/${promptId}/favorite`, {
      method: 'POST',
    });
  },

  // Удалить из избранного
  removeFromFavorites: async (promptId) => {
    return await apiRequest(`/api/library/${promptId}/favorite`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// 👤 УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЕМ
// ============================================

export const userAPI = {
  // Проверить, авторизован ли пользователь
  isAuthenticated: () => {
    return getUserId() !== null;
  },

  // Выйти
  logout: () => {
    localStorage.removeItem('user_id');
  },

  // Получить ID
  getUserId: getUserId,
};