const admin = require('firebase-admin');

// Configuración de Firebase Admin SDK
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY ? 
    process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : 
    undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

// Inicializar Firebase Admin
let db;
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
    });
  }
  db = admin.firestore();
  console.log('✅ Firebase configurado correctamente');
} catch (error) {
  console.error('❌ Error configurando Firebase:', error.message);
  // En desarrollo, podemos continuar sin Firebase
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️ Continuando sin Firebase en modo desarrollo');
  }
}

// Funciones helper para Firebase
const firebaseUtils = {
  // Guardar tokens de autenticación
  async saveTokens(platform, tokens) {
    if (!db) return null;
    
    try {
      const docRef = db.collection('tokens').doc(platform);
      await docRef.set({
        ...tokens,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error(`Error guardando tokens de ${platform}:`, error);
      return false;
    }
  },

  // Obtener tokens de autenticación
  async getTokens(platform) {
    if (!db) return null;
    
    try {
      const doc = await db.collection('tokens').doc(platform).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error(`Error obteniendo tokens de ${platform}:`, error);
      return null;
    }
  },

  // Guardar historial de sincronización
  async saveSyncHistory(syncData) {
    if (!db) return null;
    
    try {
      const docRef = db.collection('sync_history').doc();
      await docRef.set({
        ...syncData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error guardando historial de sincronización:', error);
      return null;
    }
  },

  // Obtener historial de sincronización
  async getSyncHistory(limit = 50) {
    if (!db) return [];
    
    try {
      const snapshot = await db.collection('sync_history')
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
  },

  // Guardar log de errores
  async saveErrorLog(errorData) {
    if (!db) return null;
    
    try {
      const docRef = db.collection('error_logs').doc();
      await docRef.set({
        ...errorData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error guardando log de error:', error);
      return null;
    }
  }
};

module.exports = {
  db,
  firebaseUtils
}; 