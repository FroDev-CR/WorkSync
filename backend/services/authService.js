const axios = require('axios');
const { firebaseUtils } = require('../config/firebase');

class AuthService {
  constructor() {
    this.jobberConfig = {
      clientId: process.env.JOBBER_CLIENT_ID,
      clientSecret: process.env.JOBBER_CLIENT_SECRET,
      redirectUri: process.env.JOBBER_REDIRECT_URI,
      authUrl: 'https://api.getjobber.com/api/oauth/authorize',
      tokenUrl: 'https://api.getjobber.com/api/oauth/token'
    };

    this.quickbooksConfig = {
      clientId: process.env.QUICKBOOKS_CLIENT_ID,
      clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
      redirectUri: process.env.QUICKBOOKS_REDIRECT_URI,
      authUrl: 'https://appcenter.intuit.com/connect/oauth2',
      tokenUrl: process.env.QUICKBOOKS_TOKEN_URL
    };
  }

  // Generar URL de autorización para Jobber
  getJobberAuthUrl(state = null) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.jobberConfig.clientId,
      redirect_uri: this.jobberConfig.redirectUri
    });

    if (state) {
      params.append('state', state);
    }

    return `${this.jobberConfig.authUrl}?${params.toString()}`;
  }

  // Generar URL de autorización para QuickBooks
  getQuickBooksAuthUrl(state = null) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.quickbooksConfig.clientId,
      redirect_uri: this.quickbooksConfig.redirectUri,
      scope: 'com.intuit.quickbooks.accounting'
    });

    if (state) {
      params.append('state', state);
    }

    return `${this.quickbooksConfig.authUrl}?${params.toString()}`;
  }

  // Intercambiar código de autorización por tokens (Jobber)
  async exchangeJobberCode(code) {
    try {
      const response = await axios.post(this.jobberConfig.tokenUrl, {
        client_id: this.jobberConfig.clientId,
        client_secret: this.jobberConfig.clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.jobberConfig.redirectUri
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokens = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: new Date(Date.now() + (60 * 60 * 1000)).toISOString() // 1 hora
      };

      // Guardar tokens en Firebase
      await firebaseUtils.saveTokens('jobber', tokens);

      return {
        success: true,
        tokens
      };
    } catch (error) {
      console.error('Error intercambiando código de Jobber:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Intercambiar código de autorización por tokens (QuickBooks)
  async exchangeQuickBooksCode(code, realmId) {
    try {
      const response = await axios.post(this.quickbooksConfig.tokenUrl, {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.quickbooksConfig.redirectUri
      }, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.quickbooksConfig.clientId}:${this.quickbooksConfig.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokens = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        realm_id: realmId,
        expires_at: new Date(Date.now() + (response.data.expires_in * 1000)).toISOString()
      };

      // Guardar tokens en Firebase
      await firebaseUtils.saveTokens('quickbooks', tokens);

      return {
        success: true,
        tokens
      };
    } catch (error) {
      console.error('Error intercambiando código de QuickBooks:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Refrescar token de Jobber
  async refreshJobberToken(refreshToken) {
    try {
      const response = await axios.post(this.jobberConfig.tokenUrl, {
        client_id: this.jobberConfig.clientId,
        client_secret: this.jobberConfig.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokens = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: new Date(Date.now() + (60 * 60 * 1000)).toISOString()
      };

      // Guardar tokens actualizados en Firebase
      await firebaseUtils.saveTokens('jobber', tokens);

      return {
        success: true,
        tokens
      };
    } catch (error) {
      console.error('Error refrescando token de Jobber:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Refrescar token de QuickBooks
  async refreshQuickBooksToken(refreshToken) {
    try {
      const response = await axios.post(this.quickbooksConfig.tokenUrl, {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.quickbooksConfig.clientId}:${this.quickbooksConfig.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokens = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: new Date(Date.now() + (response.data.expires_in * 1000)).toISOString()
      };

      // Guardar tokens actualizados en Firebase
      await firebaseUtils.saveTokens('quickbooks', tokens);

      return {
        success: true,
        tokens
      };
    } catch (error) {
      console.error('Error refrescando token de QuickBooks:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Verificar si los tokens están válidos
  async getValidTokens(platform) {
    const tokens = await firebaseUtils.getTokens(platform);
    
    if (!tokens) {
      return null;
    }

    // Verificar si el token ha expirado
    const now = new Date();
    const expiresAt = new Date(tokens.expires_at);
    
    if (now >= expiresAt) {
      // Token expirado, intentar refrescar
      const refreshResult = platform === 'jobber' 
        ? await this.refreshJobberToken(tokens.refresh_token)
        : await this.refreshQuickBooksToken(tokens.refresh_token);
      
      return refreshResult.success ? refreshResult.tokens : null;
    }

    return tokens;
  }

  // Verificar estado de autenticación
  async getAuthStatus() {
    const jobberTokens = await this.getValidTokens('jobber');
    const quickbooksTokens = await this.getValidTokens('quickbooks');

    return {
      jobber: {
        authenticated: !!jobberTokens,
        tokens: jobberTokens
      },
      quickbooks: {
        authenticated: !!quickbooksTokens,
        tokens: quickbooksTokens
      }
    };
  }
}

module.exports = new AuthService(); 