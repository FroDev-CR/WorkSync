import axios from 'axios';

// Configuración base de axios
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://work-sync-delta.vercel.app';

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
  async getAuthStatus(userId = 'default-user') {
    const response = await api.get('/auth/status', { params: { userId } });
    return response.data;
  },

  // Obtener URL de autorización para Jobber
  async getJobberAuthUrl(userId = 'default-user') {
    const response = await api.get('/auth/jobber', { params: { userId } });
    return response.data;
  },

  // Obtener URL de autorización para QuickBooks
  async getQuickBooksAuthUrl(userId = 'default-user') {
    const response = await api.get('/auth/quickbooks', { params: { userId } });
    return response.data;
  },

  // Desconectar plataforma
  async disconnectPlatform(platform, userId = 'default-user') {
    const response = await api.post('/auth/disconnect', { provider: platform, userId });
    return response.data;
  },
};

// Servicios de Jobs
export const jobsService = {
  // Obtener todos los Jobs
  async getJobs(userId = 'default-user', options = {}) {
    const response = await api.get('/jobs', { 
      params: { userId, ...options } 
    });
    return response.data;
  },

  // Obtener Jobs recientes
  async getRecentJobs(userId = 'default-user') {
    const response = await api.get('/jobs/recent', { params: { userId } });
    return response.data;
  },

  // Obtener Jobs pendientes de sincronización
  async getPendingJobs(userId = 'default-user') {
    const response = await api.get('/jobs/pending', { params: { userId } });
    return response.data;
  },
};

// Servicios de sincronización
export const syncService = {
  // Sincronizar un Job específico
  async syncJob(jobId, userId = 'default-user') {
    const response = await api.post('/sync/job', { jobId, userId });
    return response.data;
  },

  // Sincronizar múltiples Jobs
  async syncMultipleJobs(jobIds, userId = 'default-user') {
    const response = await api.post('/sync/multiple', { jobIds, userId });
    return response.data;
  },

  // Sincronizar Jobs pendientes automáticamente
  async syncPendingJobs(userId = 'default-user') {
    const response = await api.post('/sync/pending', { userId });
    return response.data;
  },

  // Obtener estadísticas de sincronización
  async getSyncStats(userId = 'default-user') {
    const response = await api.get('/sync/stats', { params: { userId } });
    return response.data;
  },
};

// Servicio de salud de la API
export const healthService = {
  // Verificar estado de la API
  async getHealth() {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api; 