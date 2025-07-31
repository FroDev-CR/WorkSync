// API principal de WorkSync - VERSIÓN CORREGIDA PARA PRODUCCIÓN
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { generateAuthUrl, exchangeCodeForToken, checkConnectionStatus, disconnectProvider } = require('./services/authService');
const { getJobs, getRecentJobs, getPendingSyncJobs } = require('./services/jobberService');
const { getRecentInvoices } = require('./services/quickbooksService');
const { syncJob, syncMultipleJobs, syncPendingJobs, getSyncStats } = require('./services/syncService');

const app = express();

// Configuración CORS más permisiva para producción
const corsOptions = {
  origin: [
    'http://localhost:5173', // Desarrollo local
    'http://localhost:3000', // Desarrollo alternativo
    'https://work-sync-delta.vercel.app', // Tu dominio de Vercel
    process.env.FRONTEND_URL, // URL del frontend desde .env
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Middleware básico
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware mejorado
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  console.log(`${timestamp} - ${method} ${url} - ${userAgent.substring(0, 50)}`);
  
  // Log de headers importantes para debug
  if (req.method !== 'GET') {
    console.log(`📦 Body:`, req.body);
  }
  
  next();
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('🚨 Error global:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Rutas básicas
app.get('/', (req, res) => {
  console.log('🏠 Accediendo a la ruta raíz');
  res.json({ 
    message: 'WorkSync API está funcionando!',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  console.log('❤️ Health check solicitado');
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    config: {
      jobber_configured: !!process.env.JOBBER_CLIENT_ID,
      quickbooks_configured: !!process.env.QUICKBOOKS_CLIENT_ID,
      firebase_configured: !!process.env.FIREBASE_PROJECT_ID,
      frontend_url: process.env.FRONTEND_URL
    }
  });
});

// Rutas de autenticación OAuth2
app.get('/auth/jobber', async (req, res) => {
  try {
    console.log('🔗 Generando URL de autorización para Jobber');
    const userId = req.query.userId || 'default-user';
    const authUrl = generateAuthUrl('jobber', userId);
    
    res.json({ 
      success: true,
      authUrl,
      provider: 'jobber',
      message: 'URL de autorización generada correctamente'
    });
  } catch (error) {
    console.error('❌ Error generando URL de Jobber:', error);
    res.status(500).json({
      success: false,
      error: 'Error generando URL de autorización',
      message: error.message
    });
  }
});

app.get('/auth/quickbooks', async (req, res) => {
  try {
    console.log('🔗 Generando URL de autorización para QuickBooks');
    const userId = req.query.userId || 'default-user';
    const authUrl = generateAuthUrl('quickbooks', userId);
    
    res.json({ 
      success: true,
      authUrl,
      provider: 'quickbooks',
      message: 'URL de autorización generada correctamente'
    });
  } catch (error) {
    console.error('❌ Error generando URL de QuickBooks:', error);
    res.status(500).json({
      success: false,
      error: 'Error generando URL de autorización',
      message: error.message
    });
  }
});

// Callback OAuth2 universal - CRÍTICO PARA QUE FUNCIONE
app.get('/auth/callback', async (req, res) => {
  console.log('🔄 CALLBACK OAuth iniciado');
  console.log('🔍 Query params:', JSON.stringify(req.query, null, 2));
  console.log('🔍 Headers relevantes:', {
    'user-agent': req.get('User-Agent'),
    'referer': req.get('Referer'),
    'origin': req.get('Origin')
  });
  
  try {
    const { code, state, realmId, error: oauthError, error_description } = req.query;
    
    // Manejar errores OAuth
    if (oauthError) {
      console.error('❌ Error OAuth recibido:', oauthError, error_description);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent(oauthError)}&description=${encodeURIComponent(error_description || 'Error de autorización')}`);
    }
    
    if (!code || !state) {
      const errorMsg = 'Parámetros OAuth faltantes';
      console.error('❌', errorMsg, { code: !!code, state: !!state });
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent('missing_parameters')}&description=${encodeURIComponent(errorMsg)}`);
    }

    // Parsear state
    let stateData;
    try {
      const decodedState = decodeURIComponent(state);
      console.log('🔍 State decodificado:', decodedState);
      stateData = JSON.parse(decodedState);
      console.log('✅ State parseado:', stateData);
    } catch (parseError) {
      console.error('❌ Error parseando state:', parseError);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent('invalid_state')}&description=${encodeURIComponent('State parameter inválido')}`);
    }
    
    const { provider, userId } = stateData;
    console.log(`🔄 Procesando callback de ${provider} para usuario ${userId}`);

    // Para QuickBooks, incluir el realmId
    const additionalParams = {};
    if (provider === 'quickbooks' && realmId) {
      additionalParams.realmId = realmId;
      console.log('🏢 QuickBooks Company ID (realmId):', realmId);
    }

    console.log('🔄 Intercambiando código por token...');
    const tokenData = await exchangeCodeForToken(provider, code, userId, additionalParams);
    console.log('✅ Token obtenido e intercambiado exitosamente');

    // Redirigir al frontend con éxito
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/settings?connected=${provider}&success=true`;
    
    console.log(`🎯 Redirigiendo a frontend: ${redirectUrl}`);
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('❌ Error crítico en callback OAuth:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent('internal_error')}&description=${encodeURIComponent('Error procesando autorización: ' + error.message)}`);
  }
});

// Estado de conexiones
app.get('/auth/status', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    console.log(`📊 Verificando estado de conexiones para usuario ${userId}`);
    
    const status = await checkConnectionStatus(userId);
    
    res.json({
      success: true,
      userId,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error verificando estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando estado de conexiones',
      message: error.message
    });
  }
});

// Desconectar proveedor
app.post('/auth/disconnect', async (req, res) => {
  try {
    const { provider, userId } = req.body;
    
    if (!provider || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Parámetros faltantes',
        message: 'Se requiere provider y userId'
      });
    }

    console.log(`🔌 Desconectando ${provider} para usuario ${userId}`);
    
    const result = await disconnectProvider(provider, userId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ Error desconectando proveedor:', error);
    res.status(500).json({
      success: false,
      error: 'Error desconectando proveedor',
      message: error.message
    });
  }
});

// Rutas de Jobs (Jobber)
app.get('/jobs', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    const { page, perPage, status, dateFrom, dateTo } = req.query;
    
    console.log(`📋 Obteniendo Jobs para usuario ${userId}`);
    
    const jobs = await getJobs(userId, {
      page: parseInt(page) || 1,
      perPage: parseInt(perPage) || 50,
      status,
      dateFrom,
      dateTo
    });
    
    res.json({
      success: true,
      jobs: jobs.jobs,
      pagination: jobs.pagination,
      total: jobs.total
    });
  } catch (error) {
    console.error('❌ Error obteniendo Jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo Jobs',
      message: error.message
    });
  }
});

app.get('/jobs/recent', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    console.log(`📋 Obteniendo Jobs recientes para usuario ${userId}`);
    
    const jobs = await getRecentJobs(userId);
    
    res.json({
      success: true,
      jobs: jobs.jobs,
      total: jobs.total
    });
  } catch (error) {
    console.error('❌ Error obteniendo Jobs recientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo Jobs recientes',
      message: error.message
    });
  }
});

app.get('/jobs/pending', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    console.log(`📋 Obteniendo Jobs pendientes para usuario ${userId}`);
    
    const jobs = await getPendingSyncJobs(userId);
    
    res.json({
      success: true,
      jobs: jobs.jobs,
      total: jobs.total
    });
  } catch (error) {
    console.error('❌ Error obteniendo Jobs pendientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo Jobs pendientes',
      message: error.message
    });
  }
});

// Rutas de sincronización
app.post('/sync/job', async (req, res) => {
  try {
    const { jobId, userId } = req.body;
    
    if (!jobId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Parámetros faltantes',
        message: 'Se requiere jobId y userId'
      });
    }

    console.log(`🔄 Sincronizando Job ${jobId} para usuario ${userId}`);
    
    const result = await syncJob(userId, jobId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ Error sincronizando Job:', error);
    res.status(500).json({
      success: false,
      error: 'Error sincronizando Job',
      message: error.message
    });
  }
});

app.post('/sync/multiple', async (req, res) => {
  try {
    const { jobIds, userId } = req.body;
    
    if (!jobIds || !userId || !Array.isArray(jobIds)) {
      return res.status(400).json({
        success: false,
        error: 'Parámetros faltantes',
        message: 'Se requiere jobIds (array) y userId'
      });
    }

    console.log(`🔄 Sincronizando ${jobIds.length} Jobs para usuario ${userId}`);
    
    const result = await syncMultipleJobs(userId, jobIds);
    
    res.json({
      success: true,
      message: 'Sincronización múltiple completada',
      result
    });
  } catch (error) {
    console.error('❌ Error sincronizando múltiples Jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Error sincronizando múltiples Jobs',
      message: error.message
    });
  }
});

app.post('/sync/pending', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Parámetros faltantes',
        message: 'Se requiere userId'
      });
    }

    console.log(`🔄 Sincronizando Jobs pendientes para usuario ${userId}`);
    
    const result = await syncPendingJobs(userId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ Error sincronizando Jobs pendientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error sincronizando Jobs pendientes',
      message: error.message
    });
  }
});

// Estadísticas de sincronización
app.get('/sync/stats', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    console.log(`📊 Obteniendo estadísticas para usuario ${userId}`);
    
    const stats = await getSyncStats(userId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas',
      message: error.message
    });
  }
});

// Endpoints de verificación para debugging
app.get('/auth/jobber/config', async (req, res) => {
  try {
    const clientId = process.env.JOBBER_CLIENT_ID;
    const redirectUri = process.env.JOBBER_REDIRECT_URI || process.env.REDIRECT_URI;
    
    const stateData = JSON.stringify({ provider: 'jobber', userId: 'test-user' });
    const encodedState = encodeURIComponent(stateData);
    
    const testUrl = `https://secure.getjobber.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read%20write&state=${encodedState}`;
    
    res.json({
      success: true,
      config: {
        clientId: clientId ? clientId.substring(0, 10) + '...' : 'NO CONFIGURADO',
        redirectUri: redirectUri,
        authUrl: 'https://secure.getjobber.com/oauth/authorize',
        tokenUrl: 'https://secure.getjobber.com/oauth/token',
        testUrl: testUrl
      },
      message: 'Configuración de Jobber verificada'
    });
  } catch (error) {
    console.error('❌ Error verificando configuración de Jobber:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando configuración',
      message: error.message
    });
  }
});

app.get('/auth/quickbooks/config', async (req, res) => {
  try {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || process.env.REDIRECT_URI;
    
    const stateData = JSON.stringify({ provider: 'quickbooks', userId: 'test-user' });
    const encodedState = encodeURIComponent(stateData);
    
    const testUrl = `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=com.intuit.quickbooks.accounting&state=${encodedState}`;
    
    res.json({
      success: true,
      config: {
        clientId: clientId ? clientId.substring(0, 10) + '...' : 'NO CONFIGURADO',
        redirectUri: redirectUri,
        authUrl: 'https://appcenter.intuit.com/connect/oauth2',
        tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        testUrl: testUrl
      },
      message: 'Configuración de QuickBooks verificada'
    });
  } catch (error) {
    console.error('❌ Error verificando configuración de QuickBooks:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando configuración',
      message: error.message
    });
  }
});

// Endpoint de debug para verificar variables de entorno
app.get('/debug/config', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    FRONTEND_URL: process.env.FRONTEND_URL,
    REDIRECT_URI: process.env.REDIRECT_URI,
    JOBBER_CLIENT_ID: process.env.JOBBER_CLIENT_ID ? 'CONFIGURADO' : 'NO CONFIGURADO',
    JOBBER_REDIRECT_URI: process.env.JOBBER_REDIRECT_URI,
    QUICKBOOKS_CLIENT_ID: process.env.QUICKBOOKS_CLIENT_ID ? 'CONFIGURADO' : 'NO CONFIGURADO',
    QUICKBOOKS_REDIRECT_URI: process.env.QUICKBOOKS_REDIRECT_URI,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'CONFIGURADO' : 'NO CONFIGURADO'
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  console.log(`🔍 Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /',
      'GET /health',
      'GET /auth/status',
      'GET /auth/jobber',
      'GET /auth/quickbooks',
      'GET /auth/callback',
      'GET /jobs',
      'GET /jobs/recent',
      'POST /sync/job',
      'POST /sync/multiple'
    ]
  });
});

// Función específica para Vercel
module.exports = (req, res) => {
  console.log(`🚀 Vercel function called: ${req.method} ${req.url}`);
  return app(req, res);
};