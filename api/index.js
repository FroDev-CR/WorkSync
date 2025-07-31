// API principal de WorkSync
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { generateAuthUrl, exchangeCodeForToken, checkConnectionStatus, disconnectProvider } = require('./services/authService');
const { getJobs, getRecentJobs, getPendingSyncJobs } = require('./services/jobberService');
const { getRecentInvoices } = require('./services/quickbooksService');
const { syncJob, syncMultipleJobs, syncPendingJobs, getSyncStats } = require('./services/syncService');

const app = express();

// Middleware básico
app.use(express.json());
app.use(cors());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${req.originalUrl}`);
  next();
});

// Rutas básicas
app.get('/', (req, res) => {
  console.log('Accediendo a la ruta raíz');
  res.json({ 
    message: 'WorkSync API está funcionando!',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  console.log('Accediendo a /health');
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rutas de autenticación OAuth2
app.get('/auth/jobber', async (req, res) => {
  try {
    console.log('Generando URL de autorización para Jobber');
    const userId = req.query.userId || 'default-user';
    const authUrl = generateAuthUrl('jobber', userId);
    res.json({ 
      authUrl,
      provider: 'jobber',
      message: 'URL de autorización generada'
    });
  } catch (error) {
    console.error('Error generando URL de Jobber:', error);
    res.status(500).json({
      error: 'Error generando URL de autorización',
      message: error.message
    });
  }
});

// Endpoint de prueba para Jobber
app.get('/auth/jobber/test', async (req, res) => {
  try {
    console.log('=== PRUEBA DE CONFIGURACIÓN JOBBER ===');
    console.log('JOBBER_CLIENT_ID:', process.env.JOBBER_CLIENT_ID ? 'CONFIGURADO' : 'NO CONFIGURADO');
    console.log('JOBBER_CLIENT_SECRET:', process.env.JOBBER_CLIENT_SECRET ? 'CONFIGURADO' : 'NO CONFIGURADO');
    console.log('JOBBER_REDIRECT_URI:', process.env.JOBBER_REDIRECT_URI || 'NO CONFIGURADO');
    console.log('=====================================');
    
    const userId = req.query.userId || 'test-user';
    const authUrl = generateAuthUrl('jobber', userId);
    
    res.json({
      success: true,
      config: {
        clientId: process.env.JOBBER_CLIENT_ID ? 'CONFIGURADO' : 'NO CONFIGURADO',
        clientSecret: process.env.JOBBER_CLIENT_SECRET ? 'CONFIGURADO' : 'NO CONFIGURADO',
        redirectUri: process.env.JOBBER_REDIRECT_URI || 'NO CONFIGURADO'
      },
      authUrl,
      message: 'Configuración de Jobber verificada'
    });
  } catch (error) {
    console.error('Error en prueba de Jobber:', error);
    res.status(500).json({
      error: 'Error en prueba de configuración',
      message: error.message
    });
  }
});

// Endpoint de prueba detallado para Jobber
app.get('/auth/jobber/debug', async (req, res) => {
  try {
    const redirectUri = process.env.JOBBER_REDIRECT_URI;
    const clientId = process.env.JOBBER_CLIENT_ID;
    const clientSecret = process.env.JOBBER_CLIENT_SECRET;
    
    console.log('=== DEBUG DETALLADO JOBBER ===');
    console.log('Valor exacto de JOBBER_REDIRECT_URI:', JSON.stringify(redirectUri));
    console.log('Valor exacto de JOBBER_CLIENT_ID:', JSON.stringify(clientId));
    console.log('Valor exacto de JOBBER_CLIENT_SECRET:', JSON.stringify(clientSecret));
    console.log('=====================================');
    
    res.json({
      success: true,
      debug: {
        redirectUri: redirectUri,
        clientId: clientId,
        clientSecret: clientSecret ? 'CONFIGURADO' : 'NO CONFIGURADO',
        redirectUriLength: redirectUri ? redirectUri.length : 0,
        hasRedirectUri: !!redirectUri
      },
      message: 'Debug detallado de configuración'
    });
  } catch (error) {
    console.error('Error en debug de Jobber:', error);
    res.status(500).json({
      error: 'Error en debug',
      message: error.message
    });
  }
});

// Endpoint para verificar configuración de Jobber
app.get('/auth/jobber/verify', async (req, res) => {
  try {
    const clientId = process.env.JOBBER_CLIENT_ID;
    const redirectUri = process.env.JOBBER_REDIRECT_URI;
    
    // Generar URL de prueba
    const testUrl = `https://secure.getjobber.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=jobs.read+jobs.write&state=test`;
    
    res.json({
      success: true,
      config: {
        clientId: clientId,
        redirectUri: redirectUri,
        testUrl: testUrl
      },
      instructions: [
        '1. Verifica que el Client ID sea correcto en Jobber Developer Portal',
        '2. Asegúrate de que la URL de redirección esté configurada en Jobber',
        '3. La URL debe ser exactamente: https://work-sync-delta.vercel.app/auth/callback',
        '4. Prueba la URL de test generada arriba'
      ],
      message: 'Configuración verificada'
    });
  } catch (error) {
    console.error('Error verificando configuración:', error);
    res.status(500).json({
      error: 'Error verificando configuración',
      message: error.message
    });
  }
});

app.get('/auth/quickbooks', async (req, res) => {
  try {
    console.log('Generando URL de autorización para QuickBooks');
    const userId = req.query.userId || 'default-user';
    const authUrl = generateAuthUrl('quickbooks', userId);
    res.json({ 
      authUrl,
      provider: 'quickbooks',
      message: 'URL de autorización generada'
    });
  } catch (error) {
    console.error('Error generando URL de QuickBooks:', error);
    res.status(500).json({
      error: 'Error generando URL de autorización',
      message: error.message
    });
  }
});

// Callbacks de OAuth2
app.get('/auth/callback', async (req, res) => {
  console.log('🔄 CALLBACK INICIADO');
  console.log('Headers:', req.headers);
  console.log('URL completa:', req.url);
  
  try {
    const { code, state, realmId, error: oauthError, error_description } = req.query;
    
    console.log('=== CALLBACK OAUTH DEBUG ===');
    console.log('Query parameters:', JSON.stringify(req.query, null, 2));
    console.log('Code:', code ? 'PRESENTE' : 'AUSENTE');
    console.log('State:', state ? 'PRESENTE' : 'AUSENTE');
    console.log('RealmId (QB):', realmId ? 'PRESENTE' : 'AUSENTE');
    console.log('OAuth Error:', oauthError || 'NINGUNO');
    console.log('Variables de entorno:');
    console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('============================');
    
    // Manejar errores OAuth
    if (oauthError) {
      console.error('Error OAuth recibido:', oauthError, error_description);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?error=${encodeURIComponent(oauthError + ': ' + (error_description || 'Error de autorización'))}`);
    }
    
    if (!code || !state) {
      const errorMsg = 'Parámetros OAuth faltantes';
      console.error(errorMsg, { code: !!code, state: !!state });
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?error=${encodeURIComponent(errorMsg)}`);
    }

    let stateData;
    try {
      stateData = JSON.parse(decodeURIComponent(state));
    } catch (parseError) {
      console.error('Error parseando state:', parseError);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?error=${encodeURIComponent('State parameter inválido')}`);
    }
    
    const { provider, userId } = stateData;

    console.log(`Procesando callback de ${provider} para usuario ${userId}`);

    // Para QuickBooks, incluir el realmId en los parámetros del token
    const additionalParams = {};
    if (provider === 'quickbooks' && realmId) {
      additionalParams.realmId = realmId;
    }

    console.log('🔄 Intentando intercambiar código por token...');
    const tokenData = await exchangeCodeForToken(provider, code, userId, additionalParams);
    console.log('✅ Token obtenido exitosamente');

    console.log(`✅ ${provider} conectado exitosamente para usuario ${userId}`);
    
    // Redirigir al frontend con mensaje de éxito
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/?success=${encodeURIComponent(provider)}`;
    
    console.log(`🔄 Preparando redirección...`);
    console.log(`🌐 FRONTEND_URL: ${process.env.FRONTEND_URL}`);
    console.log(`🎯 URL de redirección: ${redirectUrl}`);
    console.log('🚀 Ejecutando res.redirect()...');
    
    res.redirect(redirectUrl);
    console.log('✅ Redirección enviada');
    return;
    
  } catch (error) {
    console.error('❌ Error en callback OAuth:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/?error=${encodeURIComponent('Error procesando autorización: ' + error.message)}`);
  }
});

// Estado de conexiones
app.get('/auth/status', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    console.log(`Verificando estado de conexiones para usuario ${userId}`);
    
    const status = await checkConnectionStatus(userId);
    
    res.json({
      userId,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error verificando estado:', error);
    res.status(500).json({
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
        error: 'Parámetros faltantes',
        message: 'Se requiere provider y userId'
      });
    }

    console.log(`Desconectando ${provider} para usuario ${userId}`);
    
    const result = await disconnectProvider(provider, userId);
    
    res.json(result);
  } catch (error) {
    console.error('Error desconectando proveedor:', error);
    res.status(500).json({
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
    
    console.log(`Obteniendo Jobs para usuario ${userId}`);
    
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
    console.error('Error obteniendo Jobs:', error);
    res.status(500).json({
      error: 'Error obteniendo Jobs',
      message: error.message
    });
  }
});

app.get('/jobs/recent', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    console.log(`Obteniendo Jobs recientes para usuario ${userId}`);
    
    const jobs = await getRecentJobs(userId);
    
    res.json({
      success: true,
      jobs: jobs.jobs,
      total: jobs.total
    });
  } catch (error) {
    console.error('Error obteniendo Jobs recientes:', error);
    res.status(500).json({
      error: 'Error obteniendo Jobs recientes',
      message: error.message
    });
  }
});

app.get('/jobs/pending', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    console.log(`Obteniendo Jobs pendientes para usuario ${userId}`);
    
    const jobs = await getPendingSyncJobs(userId);
    
    res.json({
      success: true,
      jobs: jobs.jobs,
      total: jobs.total
    });
  } catch (error) {
    console.error('Error obteniendo Jobs pendientes:', error);
    res.status(500).json({
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
        error: 'Parámetros faltantes',
        message: 'Se requiere jobId y userId'
      });
    }

    console.log(`Sincronizando Job ${jobId} para usuario ${userId}`);
    
    const result = await syncJob(userId, jobId);
    
    res.json(result);
  } catch (error) {
    console.error('Error sincronizando Job:', error);
    res.status(500).json({
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
        error: 'Parámetros faltantes',
        message: 'Se requiere jobIds (array) y userId'
      });
    }

    console.log(`Sincronizando ${jobIds.length} Jobs para usuario ${userId}`);
    
    const result = await syncMultipleJobs(userId, jobIds);
    
    res.json({
      success: true,
      message: 'Sincronización múltiple completada',
      result
    });
  } catch (error) {
    console.error('Error sincronizando múltiples Jobs:', error);
    res.status(500).json({
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
        error: 'Parámetros faltantes',
        message: 'Se requiere userId'
      });
    }

    console.log(`Sincronizando Jobs pendientes para usuario ${userId}`);
    
    const result = await syncPendingJobs(userId);
    
    res.json(result);
  } catch (error) {
    console.error('Error sincronizando Jobs pendientes:', error);
    res.status(500).json({
      error: 'Error sincronizando Jobs pendientes',
      message: error.message
    });
  }
});

// Estadísticas de sincronización
app.get('/sync/stats', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    console.log(`Obteniendo estadísticas para usuario ${userId}`);
    
    const stats = await getSyncStats(userId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      error: 'Error obteniendo estadísticas',
      message: error.message
    });
  }
});

// Ruta de prueba
app.get('/test', (req, res) => {
  console.log('Accediendo a /test');
  res.json({ 
    message: 'Test endpoint funciona!',
    timestamp: new Date().toISOString()
  });
});

// Endpoint para verificar configuración
app.get('/debug/config', (req, res) => {
  res.json({
    FRONTEND_URL: process.env.FRONTEND_URL,
    JOBBER_REDIRECT_URI: process.env.JOBBER_REDIRECT_URI,
    JOBBER_CLIENT_ID: process.env.JOBBER_CLIENT_ID ? 'CONFIGURADO' : 'NO CONFIGURADO',
    NODE_ENV: process.env.NODE_ENV
  });
});

// Configurar API Key de Jobber
app.post('/auth/jobber/api-key', async (req, res) => {
  try {
    const { apiKey, userId = 'default-user' } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({
        error: 'API Key requerida',
        message: 'Se requiere la API Key de Jobber'
      });
    }

    console.log(`Configurando API Key de Jobber para usuario ${userId}`);
    
    // Guardar API Key en Firebase (o usar variables de entorno)
    // Por ahora, solo verificamos que esté presente
    const jobberConfig = {
      apiKey: apiKey,
      connected: true,
      connectedAt: new Date().toISOString(),
      userId: userId
    };

    res.json({
      success: true,
      message: 'API Key de Jobber configurada correctamente',
      config: {
        connected: true,
        connectedAt: jobberConfig.connectedAt
      }
    });
  } catch (error) {
    console.error('Error configurando API Key de Jobber:', error);
    res.status(500).json({
      error: 'Error configurando API Key',
      message: error.message
    });
  }
});

// Verificar configuración de Jobber con API Key
app.get('/auth/jobber/config', async (req, res) => {
  try {
    const clientId = process.env.JOBBER_CLIENT_ID;
    const redirectUri = process.env.JOBBER_REDIRECT_URI;
    
    // Generar state JSON válido
    const stateData = JSON.stringify({ provider: 'jobber', userId: 'test-user' });
    const encodedState = encodeURIComponent(stateData);
    
    // Generar URL de prueba con la URL correcta
    const testUrl = `https://api.getjobber.com/api/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=jobs.read+jobs.write&state=${encodedState}`;
    
    res.json({
      success: true,
      config: {
        clientId: clientId,
        redirectUri: redirectUri,
        testUrl: testUrl,
        authUrl: 'https://api.getjobber.com/api/oauth/authorize',
        tokenUrl: 'https://api.getjobber.com/api/oauth/token',
        stateData: stateData,
        encodedState: encodedState
      },
      instructions: [
        '1. Verifica que el Client ID sea correcto en Jobber Developer Portal',
        '2. Asegúrate de que la URL de redirección esté configurada en Jobber',
        '3. La URL debe ser exactamente: https://work-sync-delta.vercel.app/auth/callback',
        '4. Prueba la URL de test generada arriba',
        '5. Jobber usa OAuth2 con URLs específicas de la API'
      ],
      message: 'Configuración de Jobber verificada'
    });
  } catch (error) {
    console.error('Error verificando configuración:', error);
    res.status(500).json({
      error: 'Error verificando configuración',
      message: error.message
    });
  }
});

// Verificar configuración de QuickBooks
app.get('/auth/quickbooks/config', async (req, res) => {
  try {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;
    
    // Generar state JSON válido
    const stateData = JSON.stringify({ provider: 'quickbooks', userId: 'test-user' });
    const encodedState = encodeURIComponent(stateData);
    
    // Generar URL de prueba
    const testUrl = `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=com.intuit.quickbooks.accounting&state=${encodedState}`;
    
    res.json({
      success: true,
      config: {
        clientId: clientId,
        redirectUri: redirectUri,
        testUrl: testUrl,
        authUrl: 'https://appcenter.intuit.com/connect/oauth2',
        tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        stateData: stateData,
        encodedState: encodedState
      },
      instructions: [
        '1. Verifica que el Client ID sea correcto en QuickBooks Developer Portal',
        '2. Asegúrate de que la URL de redirección esté configurada en QuickBooks',
        '3. La URL debe ser exactamente: https://work-sync-delta.vercel.app/auth/callback',
        '4. Prueba la URL de test generada arriba',
        '5. QuickBooks usa OAuth2 estándar'
      ],
      message: 'Configuración de QuickBooks verificada'
    });
  } catch (error) {
    console.error('Error verificando configuración de QuickBooks:', error);
    res.status(500).json({
      error: 'Error verificando configuración',
      message: error.message
    });
  }
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  console.log(`Ruta no encontrada: ${req.originalUrl}`);
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Función específica para Vercel
module.exports = (req, res) => {
  console.log('Función Vercel llamada:', req.url);
  return app(req, res);
}; 