// Versión mínima para diagnosticar el problema
const express = require('express');

const app = express();

// Middleware básico
app.use(express.json());

// CORS para desarrollo
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${req.originalUrl}`);
  next();
});

// Ruta de prueba simple
app.get('/test', (req, res) => {
  console.log('Accediendo a /test');
  res.json({ 
    message: 'Test endpoint funciona!',
    timestamp: new Date().toISOString()
  });
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

app.get('/api/health', (req, res) => {
  console.log('Accediendo a /api/health');
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/auth/jobber', (req, res) => {
  console.log('Accediendo a /auth/jobber');
  res.json({ 
    message: 'Jobber OAuth endpoint',
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

app.get('/auth/quickbooks', (req, res) => {
  console.log('Accediendo a /auth/quickbooks');
  res.json({ 
    message: 'QuickBooks OAuth endpoint',
    status: 'ready',
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

// Exportar para Vercel
module.exports = app; 