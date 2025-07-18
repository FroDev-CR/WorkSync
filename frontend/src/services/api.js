import axios from 'axios';

// Configuración base de axios
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Servicios de autenticación
export const authService = {
  // Obtener estado de autenticación
  async getAuthStatus() {
    const response = await api.get('/auth/status');
    return response.data;
  },

  // Obtener URL de autorización para Jobber
  async getJobberAuthUrl(state = null) {
    const params = state ? { state } : {};
    const response = await api.get('/auth/jobber/url', { params });
    return response.data;
  },

  // Obtener URL de autorización para QuickBooks
  async getQuickBooksAuthUrl(state = null) {
    const params = state ? { state } : {};
    const response = await api.get('/auth/quickbooks/url', { params });
    return response.data;
  },

  // Refrescar tokens
  async refreshTokens(platform) {
    const response = await api.post(`/auth/refresh/${platform}`);
    return response.data;
  },

  // Desconectar plataforma
  async disconnectPlatform(platform) {
    const response = await api.post(`/auth/disconnect/${platform}`);
    return response.data;
  },
};

// Servicios de Jobs (se implementarán después)
export const jobsService = {
  // Obtener Jobs de Jobber
  async getJobberJobs() {
    const response = await api.get('/jobs/jobber');
    return response.data;
  },

  // Sincronizar Jobs a QuickBooks
  async syncJobsToQuickBooks(jobIds) {
    const response = await api.post('/sync/jobber-to-quickbooks', { jobIds });
    return response.data;
  },
};

// Servicios de sincronización (se implementarán después)
export const syncService = {
  // Obtener historial de sincronización
  async getSyncHistory() {
    const response = await api.get('/sync/history');
    return response.data;
  },

  // Obtener logs de errores
  async getErrorLogs() {
    const response = await api.get('/sync/errors');
    return response.data;
  },
};

export default api; 