// Configuración de Firebase Admin SDK
const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK
let db;

try {
  // Para desarrollo local, usar credenciales de archivo
  if (process.env.NODE_ENV === 'development') {
    const serviceAccount = require('../firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Para producción (Vercel), usar variables de entorno
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
  
  db = admin.firestore();
  console.log('Firebase Admin SDK inicializado correctamente');
} catch (error) {
  console.error('Error inicializando Firebase:', error);
}

// Funciones helper para tokens
const saveToken = async (userId, provider, tokenData) => {
  try {
    await db.collection('tokens').doc(userId).set({
      [provider]: {
        ...tokenData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    }, { merge: true });
    console.log(`Token de ${provider} guardado para usuario ${userId}`);
  } catch (error) {
    console.error('Error guardando token:', error);
    throw error;
  }
};

const getToken = async (userId, provider) => {
  try {
    const doc = await db.collection('tokens').doc(userId).get();
    if (doc.exists) {
      return doc.data()[provider];
    }
    return null;
  } catch (error) {
    console.error('Error obteniendo token:', error);
    throw error;
  }
};

// Funciones helper para logs de sincronización
const saveSyncLog = async (userId, syncData) => {
  try {
    await db.collection('sync_logs').add({
      userId,
      ...syncData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Log de sincronización guardado');
  } catch (error) {
    console.error('Error guardando log de sincronización:', error);
    throw error;
  }
};

const getSyncHistory = async (userId, limit = 10) => {
  try {
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
    throw error;
  }
};

// Funciones helper para errores
const saveErrorLog = async (userId, errorData) => {
  try {
    await db.collection('error_logs').add({
      userId,
      ...errorData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Log de error guardado');
  } catch (error) {
    console.error('Error guardando log de error:', error);
    throw error;
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