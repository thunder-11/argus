import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// JWT interceptor — adds token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cfas_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401
// NOTE: We dispatch a custom event instead of using window.location.href
// to avoid triggering a full hard-page-reload loop (which causes flickering).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('cfas_token');
      // Only clear + redirect if we actually had a token (real expiry)
      // not just an anonymous request failing auth
      if (token) {
        localStorage.removeItem('cfas_token');
        localStorage.removeItem('cfas_user');
        window.dispatchEvent(new CustomEvent('cfas:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
