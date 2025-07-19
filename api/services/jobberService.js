// Servicio para interactuar con la API de Jobber
const axios = require('axios');
const { getValidToken } = require('./authService');
const { saveErrorLog } = require('../config/firebase');

// Configuración de la API de Jobber
const JOBBER_API_BASE = 'https://api.getjobber.com/api';

// Obtener Jobs de Jobber
const getJobs = async (userId, options = {}) => {
  try {
    const token = await getValidToken('jobber', userId);
    
    const params = new URLSearchParams({
      page: options.page || 1,
      per_page: options.perPage || 50,
      ...(options.status && { status: options.status }),
      ...(options.dateFrom && { date_from: options.dateFrom }),
      ...(options.dateTo && { date_to: options.dateTo })
    });

    const response = await axios.get(`${JOBBER_API_BASE}/jobs?${params}`, {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      jobs: response.data.jobs || [],
      pagination: response.data.pagination || {},
      total: response.data.total || 0
    };
  } catch (error) {
    console.error('Error obteniendo Jobs de Jobber:', error.response?.data || error.message);
    if (saveErrorLog) {
      await saveErrorLog(userId, {
        provider: 'jobber',
        error: 'get_jobs',
        message: error.response?.data || error.message
      });
    }
    throw error;
  }
};

// Obtener un Job específico por ID
const getJobById = async (userId, jobId) => {
  try {
    const token = await getValidToken('jobber', userId);
    
    const response = await axios.get(`${JOBBER_API_BASE}/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.job;
  } catch (error) {
    console.error(`Error obteniendo Job ${jobId} de Jobber:`, error.response?.data || error.message);
    if (saveErrorLog) {
      await saveErrorLog(userId, {
        provider: 'jobber',
        error: 'get_job_by_id',
        jobId,
        message: error.response?.data || error.message
      });
    }
    throw error;
  }
};

// Obtener Jobs recientes (últimos 30 días)
const getRecentJobs = async (userId) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return await getJobs(userId, {
    dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
    perPage: 100
  });
};

// Obtener Jobs pendientes de sincronización
const getPendingSyncJobs = async (userId) => {
  try {
    const token = await getValidToken('jobber', userId);
    
    // Obtener Jobs con estado 'completed' o 'invoiced'
    const response = await axios.get(`${JOBBER_API_BASE}/jobs`, {
      params: {
        status: 'completed,invoiced',
        per_page: 100
      },
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      jobs: response.data.jobs || [],
      total: response.data.total || 0
    };
  } catch (error) {
    console.error('Error obteniendo Jobs pendientes de Jobber:', error.response?.data || error.message);
    if (saveErrorLog) {
      await saveErrorLog(userId, {
        provider: 'jobber',
        error: 'get_pending_sync_jobs',
        message: error.response?.data || error.message
      });
    }
    throw error;
  }
};

// Transformar Job de Jobber a formato QuickBooks
const transformJobToQuickBooks = (jobberJob) => {
  return {
    id: jobberJob.id,
    name: jobberJob.title || `Job ${jobberJob.id}`,
    description: jobberJob.description || '',
    amount: jobberJob.total_amount || 0,
    currency: jobberJob.currency || 'USD',
    status: jobberJob.status,
    date: jobberJob.scheduled_date || jobberJob.created_at,
    customer: {
      name: jobberJob.client?.name || 'Unknown Client',
      email: jobberJob.client?.email || '',
      phone: jobberJob.client?.phone || ''
    },
    items: jobberJob.line_items?.map(item => ({
      name: item.name || 'Service',
      description: item.description || '',
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      amount: item.total_amount || 0
    })) || [],
    metadata: {
      jobber_job_id: jobberJob.id,
      jobber_status: jobberJob.status,
      sync_date: new Date().toISOString()
    }
  };
};

module.exports = {
  getJobs,
  getJobById,
  getRecentJobs,
  getPendingSyncJobs,
  transformJobToQuickBooks
}; 