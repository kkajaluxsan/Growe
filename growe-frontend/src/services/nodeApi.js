import axios from 'axios';

const nodeApi = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let csrfTokenPromise = null;
const getCsrfToken = () => {
  if (!csrfTokenPromise) {
    csrfTokenPromise = nodeApi.get('/csrf-token').then((r) => r.data.csrfToken);
  }
  return csrfTokenPromise;
};

nodeApi.interceptors.request.use(async (config) => {
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

function emitApiError(err) {
  try {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const message =
      data?.error ||
      (Array.isArray(data?.details) ? data.details.join(', ') : null) ||
      err?.message ||
      'Request failed';
    window.dispatchEvent(new CustomEvent('api-error', { detail: { status, message, data } }));
  } catch (_) {}
}

nodeApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 403 && error.response?.data?.error?.toLowerCase?.().includes('csrf')) {
      csrfTokenPromise = null;
    }
    const isAuthEndpoint =
      originalRequest?.url?.includes('auth/login') ||
      originalRequest?.url?.includes('auth/register') ||
      originalRequest?.url?.includes('auth/refresh-token') ||
      originalRequest?.url?.includes('auth/forgot-password') ||
      originalRequest?.url?.includes('auth/reset-password') ||
      originalRequest?.url?.includes('auth/request-verification-email') ||
      originalRequest?.url?.includes('auth/verify-email') ||
      originalRequest?.url?.includes('auth/google');
    if (error.response?.status !== 401 || isAuthEndpoint || originalRequest._retried) {
      if (error.response?.status === 401 && !isAuthEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      emitApiError(error);
      return Promise.reject(error);
    }
    originalRequest._retried = true;
    try {
      if (!refreshPromise) {
        refreshPromise = nodeApi.post('/auth/refresh-token').then(({ data }) => data);
      }
      const data = await refreshPromise;
      refreshPromise = null;
      localStorage.setItem('token', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new CustomEvent('auth-refresh', { detail: data.user }));
      }
      originalRequest.headers.Authorization = `Bearer ${data.token}`;
      return nodeApi(originalRequest);
    } catch (refreshErr) {
      refreshPromise = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      emitApiError(refreshErr);
      return Promise.reject(refreshErr);
    }
  }
);

export default nodeApi;

