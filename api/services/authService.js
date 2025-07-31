// Servicio de autenticación OAuth2 para Jobber y QuickBooks - VERSIÓN CORREGIDA
require('dotenv').config();
const axios = require('axios');
const { saveToken, getToken, saveErrorLog } = require('../config/firebase');

// Configuración OAuth2 - URLs CORRECTAS
const OAUTH_CONFIG = {
  jobber: {
    clientId: process.env.JOBBER_CLIENT_ID,
    clientSecret: process.env.JOBBER_CLIENT_SECRET,
    // URLs OFICIALES CORRECTAS DE JOBBER
    authUrl: 'https://secure.getjobber.com/oauth/authorize',
    tokenUrl: 'https://secure.getjobber.com/oauth/token',
    redirectUri: process.env.JOBBER_REDIRECT_URI || process.env.REDIRECT_URI || 'https://work-sync-delta.vercel.app/auth/callback',
    scope: 'read write',
    useApiKey: false
  },
  quickbooks: {
    clientId: process.env.QUICKBOOKS_CLIENT_ID,
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
    authUrl: 'https://appcenter.intuit.com/connect/oauth2',
    tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || process.env.REDIRECT_URI || 'https://work-sync-delta.vercel.app/auth/callback',
    scope: 'com.intuit.quickbooks.accounting',
    useApiKey: false
  }
};

// Generar URL de autorización
const generateAuthUrl = (provider, userId = 'default-user') => {
  const config = OAUTH_CONFIG[provider];
  if (!config) {
    throw new Error(`Proveedor no soportado: ${provider}`);
  }

  console.log(`🔗 Generando URL de autorización para ${provider}`);
  console.log(`Client ID: ${config.clientId ? 'SET' : 'NOT SET'}`);
  console.log(`Redirect URI: ${config.redirectUri}`);

  const state = JSON.stringify({ provider, userId, timestamp: Date.now() });
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state: encodeURIComponent(state)
  });

  const authUrl = `${config.authUrl}?${params.toString()}`;
  console.log(`✅ URL generada: ${authUrl.substring(0, 100)}...`);
  
  return authUrl;
};

// Intercambiar código por token
const exchangeCodeForToken = async (provider, code, userId, additionalParams = {}) => {
  const config = OAUTH_CONFIG[provider];
  if (!config) {
    throw new Error(`Proveedor no soportado: ${provider}`);
  }

  try {
    console.log(`🔄 Intercambiando código por token para ${provider}`);
    console.log(`Code: ${code ? 'PRESENTE' : 'AUSENTE'}`);
    console.log(`User ID: ${userId}`);
    
    // Preparar datos para el POST
    const tokenData = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret
    };

    console.log(`📤 Enviando request a: ${config.tokenUrl}`);
    console.log(`📤 Con redirect_uri: ${config.redirectUri}`);

    const tokenResponse = await axios.post(config.tokenUrl, new URLSearchParams(tokenData), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'WorkSync/1.0'
      },
      timeout: 10000
    });

    console.log(`✅ Token obtenido exitosamente para ${provider}`);
    console.log(`📊 Response status: ${tokenResponse.status}`);

    const tokenInfo = {
      access_token: tokenResponse.data.access_token,
      refresh_token: tokenResponse.data.refresh_token,
      expires_in: tokenResponse.data.expires_in || 3600,
      token_type: tokenResponse.data.token_type || 'Bearer',
      expires_at: Date.now() + ((tokenResponse.data.expires_in || 3600) * 1000),
      created_at: Date.now(),
      // Para QuickBooks, también guardamos realmId (company ID)
      ...(provider === 'quickbooks' && (tokenResponse.data.realmId || additionalParams.realmId) && {
        realmId: tokenResponse.data.realmId || additionalParams.realmId,
        company_id: tokenResponse.data.realmId || additionalParams.realmId
      }),
      // Incluir cualquier parámetro adicional
      ...additionalParams
    };

    // Guardar token en Firebase
    await saveToken(userId, provider, tokenInfo);
    console.log(`💾 Token guardado para ${provider}`);

    return tokenInfo;
  } catch (error) {
    console.error(`❌ Error intercambiando código por token (${provider}):`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method
      }
    });
    
    if (saveErrorLog) {
      await saveErrorLog(userId, {
        provider,
        error: 'exchange_code_for_token',
        message: error.response?.data || error.message,
        statusCode: error.response?.status,
        url: config.tokenUrl
      });
    }
    throw error;
  }
};

// Refrescar token
const refreshToken = async (provider, userId) => {
  const config = OAUTH_CONFIG[provider];
  const currentToken = await getToken(userId, provider);

  if (!currentToken || !currentToken.refresh_token) {
    throw new Error(`No hay refresh token disponible para ${provider}`);
  }

  try {
    console.log(`🔄 Refrescando token para ${provider}`);
    
    const refreshData = {
      grant_type: 'refresh_token',
      refresh_token: currentToken.refresh_token,
      client_id: config.clientId,
      client_secret: config.clientSecret
    };

    const refreshResponse = await axios.post(config.tokenUrl, new URLSearchParams(refreshData), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'WorkSync/1.0'
      },
      timeout: 10000
    });

    console.log(`✅ Token refrescado exitosamente para ${provider}`);

    const newTokenData = {
      access_token: refreshResponse.data.access_token,
      refresh_token: refreshResponse.data.refresh_token || currentToken.refresh_token,
      expires_in: refreshResponse.data.expires_in || 3600,
      token_type: refreshResponse.data.token_type || currentToken.token_type,
      expires_at: Date.now() + ((refreshResponse.data.expires_in || 3600) * 1000),
      created_at: currentToken.created_at,
      refreshed_at: Date.now(),
      // Preservar datos adicionales del token original
      ...(currentToken.realmId && { realmId: currentToken.realmId }),
      ...(currentToken.company_id && { company_id: currentToken.company_id })
    };

    // Actualizar token en Firebase
    await saveToken(userId, provider, newTokenData);

    return newTokenData;
  } catch (error) {
    console.error(`❌ Error refrescando token (${provider}):`, error.response?.data || error.message);
    if (saveErrorLog) {
      await saveErrorLog(userId, {
        provider,
        error: 'refresh_token',
        message: error.response?.data || error.message,
        statusCode: error.response?.status
      });
    }
    throw error;
  }
};

// Obtener token válido (refrescar si es necesario)
const getValidToken = async (provider, userId) => {
  try {
    const token = await getToken(userId, provider);
    
    if (!token) {
      throw new Error(`No hay token disponible para ${provider}. Necesitas autorizar la aplicación primero.`);
    }

    // Verificar si el token ha expirado (con margen de 5 minutos)
    const now = Date.now();
    const expiresAt = token.expires_at;
    const margin = 5 * 60 * 1000; // 5 minutos

    if (now >= (expiresAt - margin)) {
      console.log(`⏰ Token de ${provider} expirado, refrescando...`);
      return await refreshToken(provider, userId);
    }

    console.log(`✅ Token de ${provider} válido hasta: ${new Date(expiresAt).toLocaleString()}`);
    return token;
  } catch (error) {
    console.error(`❌ Error obteniendo token válido (${provider}):`, error.message);
    throw error;
  }
};

// Verificar estado de conexión
const checkConnectionStatus = async (userId) => {
  const status = {
    jobber: { 
      connected: false, 
      authenticated: false, 
      lastSync: null,
      error: null
    },
    quickbooks: { 
      connected: false, 
      authenticated: false, 
      lastSync: null,
      error: null
    }
  };

  // Verificar Jobber
  try {
    const jobberToken = await getToken(userId, 'jobber');
    if (jobberToken && jobberToken.access_token) {
      const now = Date.now();
      const isExpired = jobberToken.expires_at && now >= jobberToken.expires_at;
      
      status.jobber.connected = true;
      status.jobber.authenticated = !isExpired;
      status.jobber.lastSync = jobberToken.updatedAt || jobberToken.created_at;
      status.jobber.expiresAt = jobberToken.expires_at;
      status.jobber.isExpired = isExpired;
    }
  } catch (error) {
    console.error('Error verificando conexión de Jobber:', error);
    status.jobber.error = error.message;
  }

  // Verificar QuickBooks
  try {
    const quickbooksToken = await getToken(userId, 'quickbooks');
    if (quickbooksToken && quickbooksToken.access_token) {
      const now = Date.now();
      const isExpired = quickbooksToken.expires_at && now >= quickbooksToken.expires_at;
      
      status.quickbooks.connected = true;
      status.quickbooks.authenticated = !isExpired;
      status.quickbooks.lastSync = quickbooksToken.updatedAt || quickbooksToken.created_at;
      status.quickbooks.expiresAt = quickbooksToken.expires_at;
      status.quickbooks.isExpired = isExpired;
      status.quickbooks.companyId = quickbooksToken.realmId || quickbooksToken.company_id;
    }
  } catch (error) {
    console.error('Error verificando conexión de QuickBooks:', error);
    status.quickbooks.error = error.message;
  }

  return status;
};

// Desconectar proveedor
const disconnectProvider = async (provider, userId) => {
  try {
    console.log(`🔌 Desconectando ${provider} para usuario ${userId}`);
    await saveToken(userId, provider, null);
    return { success: true, message: `${provider} desconectado correctamente` };
  } catch (error) {
    console.error(`Error desconectando ${provider}:`, error);
    throw error;
  }
};

module.exports = {
  generateAuthUrl,
  exchangeCodeForToken,
  refreshToken,
  getValidToken,
  checkConnectionStatus,
  disconnectProvider
};