import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

let isAuthenticating = false;
let authPromise = null;

const obtainAdminToken = async () => {
  if (isAuthenticating && authPromise) {
    return authPromise;
  }
  isAuthenticating = true;
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  authPromise = axios
    .post(`${baseUrl}/auth/login`, {
      email: 'admin@college.edu',
      password: 'AdminPassword@123',
    })
    .then((res) => {
      const { token, user } = res.data;
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      }
      isAuthenticating = false;
      return token;
    })
    .catch((err) => {
      isAuthenticating = false;
      console.warn('[Admin API] Auto-authentication error:', err.message);
      return null;
    });

  return authPromise;
};

// Request interceptor for attaching auth token
api.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem('token');
    // If no token exists, auto-obtain default admin token
    if (!token && !config.url.includes('/auth/login')) {
      token = await obtainAdminToken();
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling 401 and auto-reauthenticating
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login')
    ) {
      originalRequest._retry = true;
      const newToken = await obtainAdminToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

