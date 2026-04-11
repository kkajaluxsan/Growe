import axios from 'axios';

const nodeApi = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let csrfTokenPromise = null;

function extractCsrfFromResponse(res) {
  const d = res?.data;
  if (d && typeof d === 'object' && d.csrfToken) return d.csrfToken;
  if (d && typeof d === 'object' && d.data?.csrfToken) return d.data.csrfToken;
  return null;
}

const getCsrfToken = () => {
  if (!csrfTokenPromise) {
    csrfTokenPromise = nodeApi.get('/csrf-token').then((r) => extractCsrfFromResponse(r));
  }
  return csrfTokenPromise;
};

/** Call after login/logout or when cookie may have changed (e.g. another tab). */
export function invalidateCsrfToken() {
  csrfTokenPromise = null;
}

function requestUrlPath(config) {
  return `${config.baseURL || ''}${config.url || ''}`.split('?')[0];
}

/** Must stay in sync with `exemptPaths` in growe-backend `csrf.middleware.js`. */
function isCsrfExemptMutation(config) {
  const url = requestUrlPath(config);
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/google') ||
    url.includes('/auth/complete-profile') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password') ||
    url.includes('/auth/request-verification-email')
  );
}

/**
 * POSTs that are safe to retry once on transport errors (nodemon restart, Vite proxy ECONNRESET before any response).
 * Idempotent or user can recover (e.g. duplicate register → 409).
 */
function isAuthPostRetryableOnNetworkError(config) {
  const method = String(config.method || '').toLowerCase();
  if (method !== 'post') return false;
  const url = requestUrlPath(config);
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/google') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/request-verification-email')
  );
}

nodeApi.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (
    config.method &&
    !['get', 'head', 'options'].includes(config.method.toLowerCase()) &&
    !isCsrfExemptMutation(config)
  ) {
    try {
      const csrf = await getCsrfToken();
      if (csrf) config.headers['X-CSRF-Token'] = csrf;
    } catch (_) {}
  }
  return config;
});

let refreshPromise = null;

const NETWORK_RETRY_MAX = 2;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function emitApiError(err) {
  try {
    if (err?.config?.skipGlobalErrorToast) return;
    const status = err?.response?.status;
    const data = err?.response?.data;
    const message =
      data?.error ||
      data?.message ||
      (Array.isArray(data?.details) ? data.details.join(', ') : null) ||
      err?.message ||
      'Request failed';
    window.dispatchEvent(new CustomEvent('api-error', { detail: { status, message, data } }));
  } catch (_) {}
}

nodeApi.interceptors.response.use(
  (response) => {
    const d = response.data;
    if (d && typeof d === 'object' && d.success === true && Object.prototype.hasOwnProperty.call(d, 'data')) {
      response.data = d.data;
      response._apiMessage = d.message;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Dev: Vite starts before the API, or nodemon restarts — proxy returns ECONNREFUSED / 502–504 / opaque 500.
    const method = String(originalRequest.method || 'get').toLowerCase();
    const safeMethod = ['get', 'head', 'options'].includes(method);
    const noResponse = !error.response;
    const code = error.code;
    const status = error.response?.status;
    const data = error.response?.data;
    const noAppShape =
      data == null ||
      typeof data === 'string' ||
      (typeof data === 'object' &&
        data.error == null &&
        data.message == null &&
        data.success == null &&
        data.details == null);
    const retryableNetwork =
      noResponse &&
      (code === 'ECONNRESET' ||
        code === 'ECONNREFUSED' ||
        code === 'ETIMEDOUT' ||
        code === 'ECONNABORTED' ||
        code === 'EPIPE' ||
        error.message === 'Network Error' ||
        /ECONNRESET|socket hang up/i.test(String(error.message || '')));
    const retryableGateway = status >= 502 && status <= 504;
    const retryableProxy500 = status === 500 && noAppShape;
    const retryCount = originalRequest._networkRetryCount || 0;
    const shouldRetryTransport =
      retryCount < NETWORK_RETRY_MAX &&
      (retryableNetwork || retryableGateway || retryableProxy500) &&
      (safeMethod || isAuthPostRetryableOnNetworkError(originalRequest));
    if (shouldRetryTransport) {
      originalRequest._networkRetryCount = retryCount + 1;
      await sleep(280 * originalRequest._networkRetryCount);
      return nodeApi(originalRequest);
    }

    const errText = `${error.response?.data?.error || ''} ${error.response?.data?.message || ''}`.toLowerCase();
    const isCsrfFailure =
      error.response?.status === 403 && (errText.includes('csrf') || errText.includes('token missing'));

    if (isCsrfFailure) {
      csrfTokenPromise = null;
    }

    // Stale/wrong CSRF: fetch a new token (sets cookie) and retry the request once.
    if (isCsrfFailure && !originalRequest._csrfRetry && !['get', 'head', 'options'].includes(String(originalRequest.method || '').toLowerCase())) {
      originalRequest._csrfRetry = true;
      try {
        const fresh = await nodeApi.get('/csrf-token');
        const tok = extractCsrfFromResponse(fresh) || fresh?.data?.csrfToken;
        if (tok) {
          csrfTokenPromise = Promise.resolve(tok);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers['X-CSRF-Token'] = tok;
          return nodeApi(originalRequest);
        }
      } catch (_) {
        /* fall through */
      }
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

