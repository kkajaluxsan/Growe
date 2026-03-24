import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let csrfTokenPromise = null;
const getCsrfToken = () => {
  if (!csrfTokenPromise) {
    csrfTokenPromise = api.get('/csrf-token').then((r) => r.data.csrfToken);
  }
  return csrfTokenPromise;
};

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
    try {
      const csrf = await getCsrfToken();
      if (csrf) config.headers['X-CSRF-Token'] = csrf;
    } catch (_) {}
  }
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint =
      originalRequest?.url?.includes('auth/login') ||
      originalRequest?.url?.includes('auth/register') ||
      originalRequest?.url?.includes('auth/refresh-token');
    if (error.response?.status !== 401 || isAuthEndpoint || originalRequest._retried) {
      if (error.response?.status === 401 && !isAuthEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
    originalRequest._retried = true;
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    try {
      if (!refreshPromise) {
        refreshPromise = api.post('/auth/refresh-token').then(({ data }) => data);
      }
      const data = await refreshPromise;
      refreshPromise = null;
      localStorage.setItem('token', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new CustomEvent('auth-refresh', { detail: data.user }));
      }
      originalRequest.headers.Authorization = `Bearer ${data.token}`;
      return api(originalRequest);
    } catch (refreshErr) {
      refreshPromise = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(refreshErr);
    }
  }
);

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 403 && err.response?.data?.error?.toLowerCase?.().includes('csrf')) {
      csrfTokenPromise = null;
    }
    return Promise.reject(err);
  }
);

export default api;
