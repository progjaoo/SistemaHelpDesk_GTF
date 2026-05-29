import axios from 'axios';

export const TOKEN_KEY = 'gtf_helpdesk_token';
export const REFRESH_TOKEN_KEY = 'gtf_helpdesk_refresh_token';
export const USER_KEY = 'gtf_helpdesk_user';
export const authStorage = globalThis.sessionStorage;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333/api',
  timeout: 15000
});

let refreshPromise = null;

api.interceptors.request.use((config) => {
  const token = authStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = authStorage.getItem(REFRESH_TOKEN_KEY);

    if (error.response?.status === 401 && refreshToken && !originalRequest?._retry && !originalRequest?.url?.includes('/auth/refresh')) {
      originalRequest._retry = true;

      try {
        refreshPromise =
          refreshPromise ||
          api.post('/auth/refresh', {
            refresh_token: refreshToken
          });

        const { data } = await refreshPromise;
        refreshPromise = null;

        authStorage.setItem(TOKEN_KEY, data.token);
        authStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
        authStorage.setItem(USER_KEY, JSON.stringify(data.user));

        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
      }
    }

    if (error.response?.status === 401) {
      authStorage.removeItem(TOKEN_KEY);
      authStorage.removeItem(REFRESH_TOKEN_KEY);
      authStorage.removeItem(USER_KEY);
      window.dispatchEvent(new Event('auth:expired'));
    }

    return Promise.reject(error);
  }
);

export function getApiError(error) {
  return error.response?.data?.message || 'Nao foi possivel concluir a operacao.';
}

export default api;
