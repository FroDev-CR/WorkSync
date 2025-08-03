class WorkSyncAPI {
  constructor(baseUrl = 'https://worksync-integration-handler-625943711296.europe-west1.run.app') {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      
      // Return mock data if backend is not available (for development)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.warn('Backend not available, returning mock data for:', endpoint);
        return this.getMockData(endpoint);
      }
      
      throw error;
    }
  }

  getMockData(endpoint) {
    if (endpoint.includes('/auth/status')) {
      return {
        success: true,
        jobber: {
          connected: false,
          authenticated: false,
          lastSync: null,
          expiresAt: null,
          expired: false,
          error: null
        },
        quickbooks: {
          connected: false,
          authenticated: false,
          lastSync: null,
          expiresAt: null,
          expired: false,
          companyId: null,
          error: null
        }
      };
    }
    
    if (endpoint.includes('/sync/stats')) {
      return {
        success: true,
        stats: {
          totalSyncs: 0,
          successfulSyncs: 0,
          failedSyncs: 0,
          pendingSyncs: 0,
          syncsLast24h: 0,
          syncsLast7days: 0,
          lastSyncTime: null
        }
      };
    }
    
    if (endpoint.includes('/jobs')) {
      return {
        success: true,
        jobs: [],
        pagination: {
          page: 1,
          perPage: 50,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false
        },
        total: 0
      };
    }

    if (endpoint.includes('/health')) {
      return {
        success: true,
        status: 'Mock Mode - Backend not available',
        timestamp: new Date().toISOString()
      };
    }
    
    return { success: false, message: 'Backend not available - showing mock data' };
  }

  // Health Check methods
  async checkHealth() {
    return this.request('/');
  }

  async getHealthStatus() {
    return this.request('/health');
  }

  // Auth methods
  async getAuthStatus(userId = 'default-user') {
    return this.request(`/auth/status?userId=${userId}`);
  }

  async getJobberAuthUrl(userId = 'default-user') {
    return this.request(`/auth/jobber?userId=${userId}`);
  }

  async getQuickBooksAuthUrl(userId = 'default-user') {
    return this.request(`/auth/quickbooks?userId=${userId}`);
  }

  async disconnectProvider(provider, userId) {
    return this.request('/auth/disconnect', {
      method: 'POST',
      body: JSON.stringify({ provider, userId }),
    });
  }

  // Jobs methods
  async getJobs(params = {}) {
    const {
      userId = 'default-user',
      page = 1,
      perPage = 50,
      status,
      dateFrom,
      dateTo
    } = params;

    const queryParams = new URLSearchParams({
      userId,
      page: page.toString(),
      perPage: perPage.toString(),
      ...(status && { status }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo })
    });

    return this.request(`/jobs?${queryParams}`);
  }

  async getRecentJobs(userId = 'default-user') {
    return this.request(`/jobs/recent?userId=${userId}`);
  }

  async getPendingSyncJobs(userId = 'default-user') {
    return this.request(`/jobs/pending?userId=${userId}`);
  }

  // Sync methods
  async syncJob(jobId, userId) {
    return this.request('/sync/job', {
      method: 'POST',
      body: JSON.stringify({ jobId, userId }),
    });
  }

  async syncMultipleJobs(jobIds, userId) {
    return this.request('/sync/multiple', {
      method: 'POST',
      body: JSON.stringify({ jobIds, userId }),
    });
  }

  async syncPendingJobs(userId) {
    return this.request('/sync/pending', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async getSyncStats(userId = 'default-user') {
    return this.request(`/sync/stats?userId=${userId}`);
  }
}

export const workSyncAPI = new WorkSyncAPI();

// Legacy exports for backward compatibility
export const authService = {
  async getAuthStatus(userId = 'default-user') {
    return workSyncAPI.getAuthStatus(userId);
  },
  async getJobberAuthUrl(userId = 'default-user') {
    return workSyncAPI.getJobberAuthUrl(userId);
  },
  async getQuickBooksAuthUrl(userId = 'default-user') {
    return workSyncAPI.getQuickBooksAuthUrl(userId);
  },
  async disconnectPlatform(platform, userId = 'default-user') {
    return workSyncAPI.disconnectProvider(platform, userId);
  }
};

export const jobsService = {
  async getRecentJobs(userId = 'default-user') {
    return workSyncAPI.getRecentJobs(userId);
  },
  async getJobs(params = {}) {
    return workSyncAPI.getJobs(params);
  },
  async getPendingSyncJobs(userId = 'default-user') {
    return workSyncAPI.getPendingSyncJobs(userId);
  }
};

export const syncService = {
  async syncJob(jobId, userId = 'default-user') {
    return workSyncAPI.syncJob(jobId, userId);
  },
  async syncMultipleJobs(jobIds, userId = 'default-user') {
    return workSyncAPI.syncMultipleJobs(jobIds, userId);
  },
  async syncPendingJobs(userId = 'default-user') {
    return workSyncAPI.syncPendingJobs(userId);
  },
  async getSyncStats(userId = 'default-user') {
    return workSyncAPI.getSyncStats(userId);
  }
};