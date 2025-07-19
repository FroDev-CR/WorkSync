// API principal de WorkSync
const express = require('express');
const cors = require('cors');
const { generateAuthUrl, exchangeCodeForToken, checkConnectionStatus, disconnectProvider } = require('./services/authService');

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
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({
        error: 'Parámetros faltantes',
        message: 'Se requiere code y state'
      });
    }

    const stateData = JSON.parse(state);
    const { provider, userId } = stateData;

    console.log(`Procesando callback de ${provider} para usuario ${userId}`);

    const tokenData = await exchangeCodeForToken(provider, code, userId);

    res.json({
      success: true,
      provider,
      message: `${provider} conectado correctamente`,
      tokenData: {
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type
      }
    });
  } catch (error) {
    console.error('Error en callback OAuth:', error);
    res.status(500).json({
      error: 'Error procesando autorización',
      message: error.message
    });
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

// Ruta de prueba
app.get('/test', (req, res) => {
  console.log('Accediendo a /test');
  res.json({ 
    message: 'Test endpoint funciona!',
    timestamp: new Date().toISOString()
  });
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