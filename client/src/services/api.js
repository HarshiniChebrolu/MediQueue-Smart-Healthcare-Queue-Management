import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
});

// Interceptor to inject JWT token in Authorization header
API.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem('mediqueue_user');
      if (stored) {
        const user = JSON.parse(stored);
        if (user && user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    } catch (e) {
      console.warn('Invalid mediqueue_user in localStorage');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;
