// Versión mínima para diagnosticar el problema
const express = require('express');

const app = express();

// Middleware básico
app.use(express.json());

// Rutas básicas
app.get('/', (req, res) => {
  res.json({ 
    message: 'WorkSync API está funcionando!',
    version: '1.0.0',
    status: 'online'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/auth/jobber', (req, res) => {
  res.json({ 
    message: 'Jobber OAuth endpoint',
    status: 'ready'
  });
});

app.get('/auth/quickbooks', (req, res) => {
  res.json({ 
    message: 'QuickBooks OAuth endpoint',
    status: 'ready'
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

module.exports = app; 