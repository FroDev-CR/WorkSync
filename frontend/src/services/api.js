import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

export const authService = {
  async getAuthStatus(userId = 'default-user') {
    const response = await api.get('/auth/status', { params: { userId } });
    return response.data;
  },
  async getJobberAuthUrl(userId = 'default-user') {
    const response = await api.get('/auth/jobber', { params: { userId } });
    return response.data;
  },
  async getQuickBooksAuthUrl(userId = 'default-user') {
    const response = await api.get('/auth/quickbooks', { params: { userId } });
    return response.data;
  },
  async disconnectPlatform(platform, userId = 'default-user') {
    const response = await api.post('/auth/disconnect', { provider: platform, userId });
    return response.data;
  }
};

export const jobsService = {
  async getRecentJobs(userId = 'default-user') {
    const response = await api.get('/jobs/recent', { params: { userId } });
    return response.data;
  }
};

export const syncService = {
  async syncMultipleJobs(jobIds, userId = 'default-user') {
    const response = await api.post('/sync/multiple', { jobIds, userId });
    return response.data;
  },
  async getSyncStats(userId = 'default-user') {
    const response = await api.get('/sync/stats', { params: { userId } });
    return response.data;
  }
};