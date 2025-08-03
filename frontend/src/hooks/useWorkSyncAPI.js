import { useState, useEffect } from 'react';
import { workSyncAPI } from '../services/api';

export const useWorkSyncAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeRequest = async (apiCall) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, executeRequest };
};

export const useAuthStatus = (userId) => {
  const [authStatus, setAuthStatus] = useState(null);
  const { loading, error, executeRequest } = useWorkSyncAPI();

  const fetchAuthStatus = async () => {
    const result = await executeRequest(() => workSyncAPI.getAuthStatus(userId));
    setAuthStatus(result);
    return result;
  };

  useEffect(() => {
    if (userId) {
      fetchAuthStatus();
    }
  }, [userId]);

  return { authStatus, loading, error, refetch: fetchAuthStatus };
};

export const useJobs = (params = {}) => {
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [total, setTotal] = useState(0);
  const { loading, error, executeRequest } = useWorkSyncAPI();

  const fetchJobs = async (newParams = {}) => {
    const combinedParams = { ...params, ...newParams };
    const result = await executeRequest(() => workSyncAPI.getJobs(combinedParams));
    
    if (result.success) {
      setJobs(result.jobs || []);
      setPagination(result.pagination);
      setTotal(result.total || 0);
    }
    
    return result;
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return { 
    jobs, 
    pagination, 
    total, 
    loading, 
    error, 
    refetch: fetchJobs,
    fetchJobs 
  };
};

export const useRecentJobs = (userId) => {
  const [recentJobs, setRecentJobs] = useState([]);
  const { loading, error, executeRequest } = useWorkSyncAPI();

  const fetchRecentJobs = async () => {
    const result = await executeRequest(() => workSyncAPI.getRecentJobs(userId));
    if (result.success) {
      setRecentJobs(result.jobs || []);
    }
    return result;
  };

  useEffect(() => {
    if (userId) {
      fetchRecentJobs();
    }
  }, [userId]);

  return { recentJobs, loading, error, refetch: fetchRecentJobs };
};

export const usePendingSyncJobs = (userId) => {
  const [pendingJobs, setPendingJobs] = useState([]);
  const { loading, error, executeRequest } = useWorkSyncAPI();

  const fetchPendingJobs = async () => {
    const result = await executeRequest(() => workSyncAPI.getPendingSyncJobs(userId));
    if (result.success) {
      setPendingJobs(result.jobs || []);
    }
    return result;
  };

  useEffect(() => {
    if (userId) {
      fetchPendingJobs();
    }
  }, [userId]);

  return { pendingJobs, loading, error, refetch: fetchPendingJobs };
};

export const useSyncStats = (userId) => {
  const [syncStats, setSyncStats] = useState(null);
  const { loading, error, executeRequest } = useWorkSyncAPI();

  const fetchSyncStats = async () => {
    const result = await executeRequest(() => workSyncAPI.getSyncStats(userId));
    if (result.success) {
      setSyncStats(result.stats);
    }
    return result;
  };

  useEffect(() => {
    if (userId) {
      fetchSyncStats();
    }
  }, [userId]);

  return { syncStats, loading, error, refetch: fetchSyncStats };
};

export const useJobSync = () => {
  const { loading, error, executeRequest } = useWorkSyncAPI();

  const syncJob = async (jobId, userId) => {
    return executeRequest(() => workSyncAPI.syncJob(jobId, userId));
  };

  const syncMultipleJobs = async (jobIds, userId) => {
    return executeRequest(() => workSyncAPI.syncMultipleJobs(jobIds, userId));
  };

  const syncPendingJobs = async (userId) => {
    return executeRequest(() => workSyncAPI.syncPendingJobs(userId));
  };

  return {
    syncJob,
    syncMultipleJobs,
    syncPendingJobs,
    loading,
    error
  };
};

export const useOAuth = () => {
  const { loading, error, executeRequest } = useWorkSyncAPI();

  const getJobberAuthUrl = async (userId) => {
    return executeRequest(() => workSyncAPI.getJobberAuthUrl(userId));
  };

  const getQuickBooksAuthUrl = async (userId) => {
    return executeRequest(() => workSyncAPI.getQuickBooksAuthUrl(userId));
  };

  const disconnectProvider = async (provider, userId) => {
    return executeRequest(() => workSyncAPI.disconnectProvider(provider, userId));
  };

  return {
    getJobberAuthUrl,
    getQuickBooksAuthUrl,
    disconnectProvider,
    loading,
    error
  };
};

export const useHealth = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const { loading, error, executeRequest } = useWorkSyncAPI();

  const checkHealth = async () => {
    const result = await executeRequest(() => workSyncAPI.checkHealth());
    setHealthStatus(result);
    return result;
  };

  const getHealthStatus = async () => {
    const result = await executeRequest(() => workSyncAPI.getHealthStatus());
    setHealthStatus(result);
    return result;
  };

  return {
    healthStatus,
    checkHealth,
    getHealthStatus,
    loading,
    error
  };
};