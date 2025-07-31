// Servicio para interactuar con la API de Jobber - VERSIÓN CORREGIDA
const axios = require('axios');
const { getValidToken } = require('./authService');
const { saveErrorLog } = require('../config/firebase');

// Configuración de la API de Jobber - URLs CORRECTAS
const JOBBER_API_BASE = 'https://api.getjobber.com/api';
const JOBBER_API_VERSION = 'v1';

// Obtener Jobs de Jobber
const getJobs = async (userId, options = {}) => {
  try {
    console.log(`📋 Obteniendo Jobs de Jobber para usuario ${userId}`);
    console.log(`📋 Opciones:`, options);
    
    const token = await getValidToken('jobber', userId);
    
    // Construir parámetros de consulta
    const params = new URLSearchParams();
    
    if (options.page) params.append('page', options.page);
    if (options.perPage) params.append('per_page', options.perPage || 50);
    if (options.status) params.append('status', options.status);
    if (options.dateFrom) params.append('date_from', options.dateFrom);
    if (options.dateTo) params.append('date_to', options.dateTo);
    
    // URL corregida para Jobs
    const url = `${JOBBER_API_BASE}/${JOBBER_API_VERSION}/jobs${params.toString() ? '?' + params.toString() : ''}`;
    console.log(`📤 Consultando: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'WorkSync/1.0'
      },
      timeout: 15000
    });

    console.log(`✅ Respuesta de Jobber:`, {
      status: response.status,
      dataKeys: Object.keys(response.data),
      jobsCount: response.data.jobs?.length || 0
    });
    
    // Adaptar respuesta según estructura de Jobber
    const jobs = response.data.jobs || response.data.data || response.data;
    const isArray = Array.isArray(jobs);
    
    return {
      jobs: isArray ? jobs : (jobs ? [jobs] : []),
      pagination: response.data.pagination || response.data.meta || {},
      total: response.data.total || (isArray ? jobs.length : (jobs ? 1 : 0))
    };
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
    console.error('❌ Error obteniendo Jobs de Jobber:', {
      message: errorMsg,
      status: error.response?.status,
      url: error.config?.url,
      headers: error.config?.headers
    });
    
    if (saveErrorLog) {
      await saveErrorLog(userId, {
        provider: 'jobber',
        error: 'get_jobs',
        message: errorMsg,
        statusCode: error.response?.status,
        url: error.config?.url
      });
    }
    
    // Si es error de autenticación, lanzar error específico
    if (error.response?.status === 401) {
      throw new Error('Token de Jobber expirado o inválido. Vuelve a conectar Jobber.');
    }
    
    if (error.response?.status === 403) {
      throw new Error('Sin permisos para acceder a Jobs en Jobber. Verifica los scopes de la aplicación.');
    }
    
    throw error;
  }
};

// Obtener un Job específico por ID
const getJobById = async (userId, jobId) => {
  try {
    console.log(`📋 Obteniendo Job ${jobId} de Jobber para usuario ${userId}`);
    const token = await getValidToken('jobber', userId);
    
    const url = `${JOBBER_API_BASE}/${JOBBER_API_VERSION}/jobs/${jobId}`;
    console.log(`📤 Consultando: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'WorkSync/1.0'
      },
      timeout: 10000
    });

    const job = response.data.job || response.data.data || response.data;
    console.log(`✅ Job ${jobId} obtenido exitosamente`);
    
    return job;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
    console.error(`❌ Error obteniendo Job ${jobId} de Jobber:`, errorMsg);
    
    if (saveErrorLog) {
      await saveErrorLog(userId, {
        provider: 'jobber',
        error: 'get_job_by_id',
        jobId,
        message: errorMsg,
        statusCode: error.response?.status
      });
    }
    
    if (error.response?.status === 401) {
      throw new Error('Token de Jobber expirado o inválido');
    }
    
    if (error.response?.status === 404) {
      throw new Error(`Job ${jobId} no encontrado en Jobber`);
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
    console.log(`📋 Obteniendo Jobs pendientes de sincronización para usuario ${userId}`);
    const token = await getValidToken('jobber', userId);
    
    // Obtener Jobs con estado 'completed' o 'invoiced'
    const url = `${JOBBER_API_BASE}/${JOBBER_API_VERSION}/jobs?status=completed,invoiced&per_page=100&sort=-updated_at`;
    console.log(`📤 Consultando: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'WorkSync/1.0'
      },
      timeout: 15000
    });

    const jobs = response.data.jobs || response.data.data || [];
    console.log(`✅ Encontrados ${jobs.length} Jobs pendientes de sincronización`);
    
    return {
      jobs: jobs,
      total: response.data.total || jobs.length
    };
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
    console.error('❌ Error obteniendo Jobs pendientes de Jobber:', errorMsg);
    
    if (saveErrorLog) {
      await saveErrorLog(userId, {
        provider: 'jobber',
        error: 'get_pending_sync_jobs',
        message: errorMsg,
        statusCode: error.response?.status
      });
    }
    
    if (error.response?.status === 401) {
      throw new Error('Token de Jobber expirado o inválido');
    }
    
    throw error;
  }
};

// Transformar Job de Jobber a formato QuickBooks
const transformJobToQuickBooks = (jobberJob) => {
  console.log(`🔄 Transformando Job ${jobberJob.id} de Jobber a formato QuickBooks`);
  
  // Extraer información del cliente
  const client = jobberJob.client || jobberJob.customer || {};
  const clientName = client.name || 
                     client.company_name || 
                     (client.first_name && client.last_name ? `${client.first_name} ${client.last_name}` : null) ||
                     client.first_name || 
                     'Cliente Sin Nombre';
  
  // Procesar line items o crear uno por defecto
  let items = [];
  if (jobberJob.line_items && Array.isArray(jobberJob.line_items) && jobberJob.line_items.length > 0) {
    items = jobberJob.line_items.map(item => ({
      name: item.name || item.description || 'Servicio',
      description: item.description || item.name || '',
      quantity: parseFloat(item.quantity) || 1,
      unit_price: parseFloat(item.unit_price) || parseFloat(item.price) || 0,
      amount: parseFloat(item.total_amount) || parseFloat(item.amount) || (parseFloat(item.quantity || 1) * parseFloat(item.unit_price || item.price || 0))
    }));
  } else {
    // Si no hay line items, crear uno con el total del Job
    const totalAmount = parseFloat(jobberJob.total_amount) || parseFloat(jobberJob.amount) || 0;
    items = [{
      name: jobberJob.title || `Job ${jobberJob.id}`,
      description: jobberJob.description || jobberJob.title || 'Trabajo realizado',
      quantity: 1,
      unit_price: totalAmount,
      amount: totalAmount
    }];
  }
  
  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  
  const transformedJob = {
    id: jobberJob.id,
    name: jobberJob.title || `Job ${jobberJob.id}`,
    description: jobberJob.description || jobberJob.title || '',
    amount: totalAmount,
    currency: jobberJob.currency || 'USD',
    status: jobberJob.status,
    date: jobberJob.scheduled_date || jobberJob.start_date || jobberJob.created_at || new Date().toISOString().split('T')[0],
    customer: {
      name: clientName.trim(),
      email: client.email || client.primary_email || '',
      phone: client.phone || client.primary_phone || ''
    },
    items: items,
    metadata: {
      jobber_job_id: jobberJob.id,
      jobber_status: jobberJob.status,
      sync_date: new Date().toISOString(),
      original_data: {
        title: jobberJob.title,
        client_id: client.id
      }
    }
  };
  
  console.log(`✅ Job transformado: Cliente "${transformedJob.customer.name}", Monto $${transformedJob.amount}`);
  return transformedJob;
};

module.exports = {
  getJobs,
  getJobById,
  getRecentJobs,
  getPendingSyncJobs,
  transformJobToQuickBooks
};