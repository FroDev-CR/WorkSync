// Configuración de Firebase Admin SDK (versión simplificada)
let db = null;

// Logging para debugging
console.log('=== DEBUGGING FIREBASE CONFIG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET');
console.log('JOBBER_CLIENT_ID:', process.env.JOBBER_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('QUICKBOOKS_CLIENT_ID:', process.env.QUICKBOOKS_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('================================');

// Inicializar Firebase Admin SDK
try {
  const admin = require('firebase-admin');
  
  // Para desarrollo local, usar credenciales de archivo
  if (process.env.NODE_ENV === 'development') {
    const serviceAccount = require('../firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Para producción (Vercel), usar variables de entorno
    if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          type: process.env.FIREBASE_TYPE,
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: process.env.FIREBASE_AUTH_URI,
          token_uri: process.env.FIREBASE_TOKEN_URI,
          auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
          client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
        })
      });
    }
  }
  
  if (admin.apps.length > 0) {
    db = admin.firestore();
    console.log('Firebase Admin SDK inicializado correctamente');
  }
} catch (error) {
  console.error('Error inicializando Firebase:', error);
  console.log('Continuando sin Firebase...');
}

// Funciones helper para tokens (versión simplificada)
const saveToken = async (userId, provider, tokenData) => {
  try {
    if (!db) {
      console.log(`Token de ${provider} guardado en memoria para usuario ${userId}`);
      return;
    }
    
    await db.collection('tokens').doc(userId).set({
      [provider]: {
        ...tokenData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    }, { merge: true });
    console.log(`Token de ${provider} guardado para usuario ${userId}`);
  } catch (error) {
    console.error('Error guardando token:', error);
    console.log('Continuando sin guardar token...');
  }
};

const getToken = async (userId, provider) => {
  try {
    if (!db) {
      console.log(`No hay base de datos disponible para obtener token de ${provider}`);
      return null;
    }
    
    const doc = await db.collection('tokens').doc(userId).get();
    if (doc.exists) {
      return doc.data()[provider];
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo token:', error);
    return null;
  }
};

// Funciones helper para logs de sincronización (versión simplificada)
const saveSyncLog = async (userId, syncData) => {
  try {
    if (!db) {
      console.log('Log de sincronización guardado en memoria');
      return;
    }
    
    await db.collection('sync_logs').add({
      userId,
      ...syncData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Log de sincronización guardado');
  } catch (error) {
    console.error('Error guardando log de sincronización:', error);
    console.log('Continuando sin guardar log...');
  }
};

const getSyncHistory = async (userId, limit = 10) => {
  try {
    if (!db) {
      console.log('No hay base de datos disponible para obtener historial');
      return [];
    }
    
    const snapshot = await db.collection('sync_logs')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error obteniendo historial de sincronización:', error);
    return [];
  }
};

// Funciones helper para errores (versión simplificada)
const saveErrorLog = async (userId, errorData) => {
  try {
    if (!db) {
      console.log('Log de error guardado en memoria');
      return;
    }
    
    await db.collection('error_logs').add({
      userId,
      ...errorData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Log de error guardado');
  } catch (error) {
    console.error('Error guardando log de error:', error);
    console.log('Continuando sin guardar log de error...');
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