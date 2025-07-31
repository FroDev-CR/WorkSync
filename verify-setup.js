#!/usr/bin/env node

/**
 * Script de verificación de configuración de WorkSync
 * Ejecuta: node verify-setup.js
 */

require('dotenv').config();
const axios = require('axios');

console.log('🔍 WorkSync - Verificación de Configuración\n');

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const success = (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`);
const error = (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`);
const warning = (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
const info = (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`);

// Verificaciones
async function checkEnvironmentVariables() {
  console.log('1. Verificando Variables de Entorno:');
  
  const requiredVars = [
    'JOBBER_CLIENT_ID',
    'JOBBER_CLIENT_SECRET', 
    'QUICKBOOKS_CLIENT_ID',
    'QUICKBOOKS_CLIENT_SECRET'
  ];
  
  const optionalVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
  ];
  
  let allRequired = true;
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      success(`${varName} configurado`);
    } else {
      error(`${varName} faltante`);
      allRequired = false;
    }
  });
  
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      success(`${varName} configurado (opcional)`);
    } else {
      warning(`${varName} no configurado (opcional - se usará almacenamiento en memoria)`);
    }
  });
  
  return allRequired;
}

async function checkServerHealth() {
  console.log('\n2. Verificando Servidor:');
  
  try {
    const port = process.env.PORT || 3001;
    const response = await axios.get(`http://localhost:${port}/health`, { timeout: 5000 });
    
    if (response.data.status === 'healthy') {
      success(`Servidor funcionando en puerto ${port}`);
      return true;
    } else {
      error('Servidor responde pero no está healthy');
      return false;
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      error('Servidor no está ejecutándose. Ejecuta: npm run dev');
    } else {
      error(`Error conectando al servidor: ${err.message}`);
    }
    return false;
  }
}

async function checkJobberConfig() {
  console.log('\n3. Verificando Configuración de Jobber:');
  
  if (!process.env.JOBBER_CLIENT_ID || !process.env.JOBBER_CLIENT_SECRET) {
    error('Credenciales de Jobber faltantes');
    return false;
  }
  
  try {
    const port = process.env.PORT || 3001;
    const response = await axios.get(`http://localhost:${port}/auth/jobber/config`);
    
    if (response.data.success) {
      success('Configuración de Jobber válida');
      info(`Client ID: ${process.env.JOBBER_CLIENT_ID.substring(0, 10)}...`);
      info(`URL de prueba: ${response.data.config.testUrl.substring(0, 100)}...`);
      return true;
    } else {
      error('Configuración de Jobber inválida');
      return false;
    }
  } catch (err) {
    error(`Error verificando Jobber: ${err.message}`);
    return false;
  }
}

async function checkQuickBooksConfig() {
  console.log('\n4. Verificando Configuración de QuickBooks:');
  
  if (!process.env.QUICKBOOKS_CLIENT_ID || !process.env.QUICKBOOKS_CLIENT_SECRET) {
    error('Credenciales de QuickBooks faltantes');
    return false;
  }
  
  try {
    const port = process.env.PORT || 3001;
    const response = await axios.get(`http://localhost:${port}/auth/quickbooks/config`);
    
    if (response.data.success) {
      success('Configuración de QuickBooks válida');
      info(`Client ID: ${process.env.QUICKBOOKS_CLIENT_ID.substring(0, 10)}...`);
      info(`URL de prueba: ${response.data.config.testUrl.substring(0, 100)}...`);
      return true;
    } else {
      error('Configuración de QuickBooks inválida');
      return false;
    }
  } catch (err) {
    error(`Error verificando QuickBooks: ${err.message}`);
    return false;
  }
}

async function checkFirebaseConnection() {
  console.log('\n5. Verificando Conexión de Firebase:');
  
  if (!process.env.FIREBASE_PROJECT_ID) {
    warning('Firebase no configurado - se usará almacenamiento en memoria');
    return true;
  }
  
  try {
    // Verificar si Firebase está inicializado correctamente
    const admin = require('firebase-admin');
    
    if (admin.apps.length > 0) {
      success('Firebase inicializado correctamente');
      info(`Proyecto: ${process.env.FIREBASE_PROJECT_ID}`);
      return true;
    } else {
      warning('Firebase no inicializado - se usará almacenamiento en memoria');
      return true;
    }
  } catch (err) {
    warning(`Error con Firebase (continuará con memoria): ${err.message}`);
    return true;
  }
}

async function checkFrontendConnection() {
  console.log('\n6. Verificando Frontend:');
  
  try {
    const response = await axios.get('http://localhost:5173', { timeout: 5000 });
    
    if (response.status === 200) {
      success('Frontend funcionando en puerto 5173');
      return true;
    } else {
      error('Frontend responde pero con error');
      return false;
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      warning('Frontend no está ejecutándose. Ejecuta: cd frontend && npm run dev');
    } else {
      warning(`Error conectando al frontend: ${err.message}`);
    }
    return false;
  }
}

// Función principal
async function main() {
  const checks = [
    checkEnvironmentVariables,
    checkServerHealth,
    checkJobberConfig,
    checkQuickBooksConfig,
    checkFirebaseConnection,
    checkFrontendConnection
  ];
  
  let passed = 0;
  let total = checks.length;
  
  for (const check of checks) {
    try {
      const result = await check();
      if (result) passed++;
    } catch (err) {
      error(`Error en verificación: ${err.message}`);
    }
  }
  
  console.log('\n📊 Resumen de Verificación:');
  console.log(`Verificaciones pasadas: ${passed}/${total}`);
  
  if (passed === total) {
    success('¡Todas las verificaciones pasaron! WorkSync está listo para usar.');
  } else if (passed >= total - 1) {
    warning('Casi listo - solo faltan verificaciones menores.');
  } else {
    error('Faltan varias configuraciones importantes.');
  }
  
  console.log('\n📚 Próximos pasos:');
  console.log('1. Ve a http://localhost:5173 para acceder a WorkSync');
  console.log('2. Ve a Configuración para conectar Jobber y QuickBooks'); 
  console.log('3. Ve a Jobs para sincronizar tus primeros trabajos');
  console.log('\n📖 Si tienes problemas, revisa SETUP.md para más detalles.');
}

// Ejecutar verificación
main().catch(err => {
  error(`Error general: ${err.message}`);
  process.exit(1);
});