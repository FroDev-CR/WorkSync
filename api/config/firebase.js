// Configuración de Firebase Admin SDK (versión simplificada)
require('dotenv').config();
let db = null;

// Logging para debugging
console.log('=== DEBUGGING FIREBASE CONFIG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET');
console.log('JOBBER_CLIENT_ID:', process.env.JOBBER_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('QUICKBOOKS_CLIENT_ID:', process.env.QUICKBOOKS_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('================================');

// Inicializar Firebase Admin SDK
let admin;
try {
  admin = require('firebase-admin');
  
  // Verificar si ya está inicializado
  if (admin.apps.length === 0) {
    // Para desarrollo local, usar credenciales de archivo
    if (process.env.NODE_ENV === 'development') {
      try {
        const serviceAccount = require('../firebase-service-account.json');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase inicializado con archivo de credenciales local');
      } catch (fileError) {
        console.log('No se encontró archivo de credenciales local, intentando con variables de entorno...');
        // Intentar con variables de entorno como fallback
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
          admin.initializeApp({
            credential: admin.credential.cert({
              type: 'service_account',
              project_id: process.env.FIREBASE_PROJECT_ID,
              private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
              private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
              client_email: process.env.FIREBASE_CLIENT_EMAIL,
              client_id: process.env.FIREBASE_CLIENT_ID,
              auth_uri: 'https://accounts.google.com/o/oauth2/auth',
              token_uri: 'https://oauth2.googleapis.com/token',
              auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
              client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`
            })
          });
          console.log('✅ Firebase inicializado con variables de entorno (desarrollo)');
        } else {
          throw new Error('Credenciales de Firebase no encontradas');
        }
      }
    } else {
      // Para producción (Vercel), usar variables de entorno
      if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        admin.initializeApp({
          credential: admin.credential.cert({
            type: 'service_account',
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
            client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`
          })
        });
        console.log('✅ Firebase inicializado con variables de entorno (producción)');
      } else {
        throw new Error('Variables de entorno de Firebase faltantes en producción');
      }
    }
  }
  
  if (admin.apps.length > 0) {
    db = admin.firestore();
    console.log('✅ Firebase Firestore conectado exitosamente');
  }
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error.message);
  console.log('⚠️ Continuando sin Firebase - Los tokens se almacenarán en memoria...');
  admin = null;
}

// Funciones helper para tokens (versión simplificada)
// Almacenamiento en memoria como fallback
const memoryStorage = {
  tokens: {},
  syncLogs: [],
  errorLogs: []
};

const saveToken = async (userId, provider, tokenData) => {
  try {
    if (!db || !admin) {
      // Usar almacenamiento en memoria
      if (!memoryStorage.tokens[userId]) {
        memoryStorage.tokens[userId] = {};
      }
      memoryStorage.tokens[userId][provider] = {
        ...tokenData,
        updatedAt: new Date().toISOString()
      };
      console.log(`💾 Token de ${provider} guardado en memoria para usuario ${userId}`);
      return;
    }
    
    const tokenDoc = {
      [provider]: {
        ...tokenData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    };
    
    await db.collection('tokens').doc(userId).set(tokenDoc, { merge: true });
    console.log(`🔐 Token de ${provider} guardado en Firebase para usuario ${userId}`);
  } catch (error) {
    console.error('❌ Error guardando token en Firebase:', error.message);
    // Fallback a memoria si Firebase falla
    if (!memoryStorage.tokens[userId]) {
      memoryStorage.tokens[userId] = {};
    }
    memoryStorage.tokens[userId][provider] = {
      ...tokenData,
      updatedAt: new Date().toISOString()
    };
    console.log(`💾 Token de ${provider} guardado en memoria como fallback`);
  }
};

const getToken = async (userId, provider) => {
  try {
    if (!db || !admin) {
      // Usar almacenamiento en memoria
      const userTokens = memoryStorage.tokens[userId];
      if (userTokens && userTokens[provider]) {
        console.log(`💾 Token de ${provider} obtenido de memoria para usuario ${userId}`);
        return userTokens[provider];
      }
      console.log(`💾 No se encontró token de ${provider} en memoria para usuario ${userId}`);
      return null;
    }
    
    const doc = await db.collection('tokens').doc(userId).get();
    if (doc.exists && doc.data()[provider]) {
      console.log(`🔐 Token de ${provider} obtenido de Firebase para usuario ${userId}`);
      return doc.data()[provider];
    }
    console.log(`🔐 No se encontró token de ${provider} en Firebase para usuario ${userId}`);
    return null;
  } catch (error) {
    console.error(`❌ Error obteniendo token de Firebase:`, error.message);
    // Fallback a memoria si Firebase falla
    const userTokens = memoryStorage.tokens[userId];
    if (userTokens && userTokens[provider]) {
      console.log(`💾 Token de ${provider} obtenido de memoria como fallback`);
      return userTokens[provider];
    }
    return null;
  }
};

// Funciones helper para logs de sincronización (versión simplificada)
const saveSyncLog = async (userId, syncData) => {
  try {
    const logEntry = {
      userId,
      ...syncData,
      createdAt: new Date().toISOString(),
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    
    if (!db || !admin) {
      // Guardar en memoria
      memoryStorage.syncLogs.push(logEntry);
      // Mantener solo los últimos 100 logs en memoria
      if (memoryStorage.syncLogs.length > 100) {
        memoryStorage.syncLogs = memoryStorage.syncLogs.slice(-100);
      }
      console.log(`💾 Log de sincronización guardado en memoria`);
      return;
    }
    
    await db.collection('sync_logs').add({
      ...logEntry,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`📄 Log de sincronización guardado en Firebase`);
  } catch (error) {
    console.error('❌ Error guardando log de sincronización en Firebase:', error.message);
    // Fallback a memoria
    const logEntry = {
      userId,
      ...syncData,
      createdAt: new Date().toISOString(),
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    memoryStorage.syncLogs.push(logEntry);
    console.log(`💾 Log de sincronización guardado en memoria como fallback`);
  }
};

const getSyncHistory = async (userId, limit = 10) => {
  try {
    if (!db || !admin) {
      // Usar almacenamiento en memoria
      const userLogs = memoryStorage.syncLogs
        .filter(log => log.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
      console.log(`💾 Historial obtenido de memoria: ${userLogs.length} registros`);
      return userLogs;
    }
    
    const snapshot = await db.collection('sync_logs')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
    }));
    
    console.log(`📄 Historial obtenido de Firebase: ${history.length} registros`);
    return history;
  } catch (error) {
    console.error('❌ Error obteniendo historial de Firebase:', error.message);
    // Fallback a memoria
    const userLogs = memoryStorage.syncLogs
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
    console.log(`💾 Historial obtenido de memoria como fallback: ${userLogs.length} registros`);
    return userLogs;
  }
};

// Funciones helper para errores (versión simplificada)
const saveErrorLog = async (userId, errorData) => {
  try {
    const errorEntry = {
      userId,
      ...errorData,
      createdAt: new Date().toISOString(),
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    
    if (!db || !admin) {
      // Guardar en memoria
      memoryStorage.errorLogs.push(errorEntry);
      // Mantener solo los últimos 50 errores en memoria
      if (memoryStorage.errorLogs.length > 50) {
        memoryStorage.errorLogs = memoryStorage.errorLogs.slice(-50);
      }
      console.log(`💾 Log de error guardado en memoria`);
      return;
    }
    
    await db.collection('error_logs').add({
      ...errorEntry,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`❌ Log de error guardado en Firebase`);
  } catch (error) {
    console.error('❌ Error guardando log de error en Firebase:', error.message);
    // Fallback a memoria
    const errorEntry = {
      userId,
      ...errorData,
      createdAt: new Date().toISOString(),
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    memoryStorage.errorLogs.push(errorEntry);
    console.log(`💾 Log de error guardado en memoria como fallback`);
  }
};

module.exports = {
  db,
  saveToken,
  getToken,
  saveSyncLog,
  getSyncHistory,
  saveErrorLog
}; 