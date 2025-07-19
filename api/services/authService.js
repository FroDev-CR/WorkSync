// Servicio de autenticación OAuth2 para Jobber y QuickBooks
const axios = require('axios');
const { saveToken, getToken, saveErrorLog } = require('../config/firebase');

// Configuración OAuth2
const OAUTH_CONFIG = {
  jobber: {
    clientId: process.env.JOBBER_CLIENT_ID,
    clientSecret: process.env.JOBBER_CLIENT_SECRET,
    authUrl: 'https://secure.getjobber.com/oauth/authorize',
    tokenUrl: 'https://api.getjobber.com/oauth/token',
    redirectUri: process.env.JOBBER_REDIRECT_URI,
    scope: 'jobs.read jobs.write'
  },
  quickbooks: {
    clientId: process.env.QUICKBOOKS_CLIENT_ID,
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
    authUrl: 'https://appcenter.intuit.com/connect/oauth2',
    tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI,
    scope: 'com.intuit.quickbooks.accounting'
  }
};

// Generar URL de autorización
const generateAuthUrl = (provider, userId) => {
  const config = OAUTH_CONFIG[provider];
  if (!config) {
    throw new Error(`Proveedor no soportado: ${provider}`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state: JSON.stringify({ provider, userId })
  });

  return `${config.authUrl}?${params.toString()}`;
};

// Intercambiar código por token
const exchangeCodeForToken = async (provider, code, userId) => {
  const config = OAUTH_CONFIG[provider];
  if (!config) {
    throw new Error(`Proveedor no soportado: ${provider}`);
  }

  try {
    const tokenResponse = await axios.post(config.tokenUrl, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const tokenData = {
      access_token: tokenResponse.data.access_token,
      refresh_token: tokenResponse.data.refresh_token,
      expires_in: tokenResponse.data.expires_in,
      token_type: tokenResponse.data.token_type,
      expires_at: Date.now() + (tokenResponse.data.expires_in * 1000)
    };

    // Guardar token en Firebase
    await saveToken(userId, provider, tokenData);

    return tokenData;
  } catch (error) {
    console.error(`Error intercambiando código por token (${provider}):`, error.response?.data || error.message);
    await saveErrorLog(userId, {
      provider,
      error: 'exchange_code_for_token',
      message: error.response?.data || error.message
    });
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
    const refreshResponse = await axios.post(config.tokenUrl, {
      grant_type: 'refresh_token',
      refresh_token: currentToken.refresh_token,
      client_id: config.clientId,
      client_secret: config.clientSecret
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const newTokenData = {
      access_token: refreshResponse.data.access_token,
      refresh_token: refreshResponse.data.refresh_token || currentToken.refresh_token,
      expires_in: refreshResponse.data.expires_in,
      token_type: refreshResponse.data.token_type,
      expires_at: Date.now() + (refreshResponse.data.expires_in * 1000)
    };

    // Actualizar token en Firebase
    await saveToken(userId, provider, newTokenData);

    return newTokenData;
  } catch (error) {
    console.error(`Error refrescando token (${provider}):`, error.response?.data || error.message);
    await saveErrorLog(userId, {
      provider,
      error: 'refresh_token',
      message: error.response?.data || error.message
    });
    throw error;
  }
};

// Obtener token válido (refrescar si es necesario)
const getValidToken = async (provider, userId) => {
  try {
    const token = await getToken(userId, provider);
    
    if (!token) {
      throw new Error(`No hay token disponible para ${provider}`);
    }

    // Verificar si el token ha expirado (con margen de 5 minutos)
    const now = Date.now();
    const expiresAt = token.expires_at;
    const margin = 5 * 60 * 1000; // 5 minutos

    if (now >= (expiresAt - margin)) {
      console.log(`Token de ${provider} expirado, refrescando...`);
      return await refreshToken(provider, userId);
    }

    return token;
  } catch (error) {
    console.error(`Error obteniendo token válido (${provider}):`, error.message);
    throw error;
  }
};

// Verificar estado de conexión
const checkConnectionStatus = async (userId) => {
  const status = {
    jobber: { connected: false, lastSync: null },
    quickbooks: { connected: false, lastSync: null }
  };

  try {
    // Verificar Jobber
    const jobberToken = await getToken(userId, 'jobber');
    if (jobberToken && jobberToken.access_token) {
      status.jobber.connected = true;
      status.jobber.lastSync = jobberToken.updatedAt;
    }
  } catch (error) {
    console.error('Error verificando conexión de Jobber:', error);
  }

  try {
    // Verificar QuickBooks
    const quickbooksToken = await getToken(userId, 'quickbooks');
    if (quickbooksToken && quickbooksToken.access_token) {
      status.quickbooks.connected = true;
      status.quickbooks.lastSync = quickbooksToken.updatedAt;
    }
  } catch (error) {
    console.error('Error verificando conexión de QuickBooks:', error);
  }

  return status;
};

// Desconectar proveedor
const disconnectProvider = async (provider, userId) => {
  try {
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