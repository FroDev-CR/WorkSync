const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { firebaseUtils } = require('../config/firebase');

// Obtener estado de autenticación
router.get('/status', async (req, res) => {
  try {
    const authStatus = await authService.getAuthStatus();
    res.json({
      success: true,
      data: authStatus
    });
  } catch (error) {
    console.error('Error obteniendo estado de autenticación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Generar URL de autorización para Jobber
router.get('/jobber/url', (req, res) => {
  try {
    const state = req.query.state || null;
    const authUrl = authService.getJobberAuthUrl(state);
    
    res.json({
      success: true,
      data: {
        authUrl
      }
    });
  } catch (error) {
    console.error('Error generando URL de Jobber:', error);
    res.status(500).json({
      success: false,
      error: 'Error generando URL de autorización'
    });
  }
});

// Callback de Jobber
router.get('/jobber/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('Error en callback de Jobber:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=${encodeURIComponent('Código de autorización no recibido')}`);
    }

    const result = await authService.exchangeJobberCode(code);
    
    if (result.success) {
      // Guardar log de éxito
      await firebaseUtils.saveErrorLog({
        type: 'auth_success',
        platform: 'jobber',
        message: 'Autenticación exitosa con Jobber'
      });

      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?success=jobber`);
    } else {
      // Guardar log de error
      await firebaseUtils.saveErrorLog({
        type: 'auth_error',
        platform: 'jobber',
        message: result.error,
        code: code
      });

      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=${encodeURIComponent(result.error)}`);
    }
  } catch (error) {
    console.error('Error en callback de Jobber:', error);
    
    // Guardar log de error
    await firebaseUtils.saveErrorLog({
      type: 'auth_error',
      platform: 'jobber',
      message: error.message
    });

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=${encodeURIComponent('Error interno del servidor')}`);
  }
});

// Generar URL de autorización para QuickBooks
router.get('/quickbooks/url', (req, res) => {
  try {
    const state = req.query.state || null;
    const authUrl = authService.getQuickBooksAuthUrl(state);
    
    res.json({
      success: true,
      data: {
        authUrl
      }
    });
  } catch (error) {
    console.error('Error generando URL de QuickBooks:', error);
    res.status(500).json({
      success: false,
      error: 'Error generando URL de autorización'
    });
  }
});

// Callback de QuickBooks
router.get('/quickbooks/callback', async (req, res) => {
  try {
    const { code, realmId, state, error } = req.query;

    if (error) {
      console.error('Error en callback de QuickBooks:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=${encodeURIComponent(error)}`);
    }

    if (!code || !realmId) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=${encodeURIComponent('Código de autorización o Realm ID no recibido')}`);
    }

    const result = await authService.exchangeQuickBooksCode(code, realmId);
    
    if (result.success) {
      // Guardar log de éxito
      await firebaseUtils.saveErrorLog({
        type: 'auth_success',
        platform: 'quickbooks',
        message: 'Autenticación exitosa con QuickBooks',
        realmId: realmId
      });

      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?success=quickbooks`);
    } else {
      // Guardar log de error
      await firebaseUtils.saveErrorLog({
        type: 'auth_error',
        platform: 'quickbooks',
        message: result.error,
        code: code,
        realmId: realmId
      });

      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=${encodeURIComponent(result.error)}`);
    }
  } catch (error) {
    console.error('Error en callback de QuickBooks:', error);
    
    // Guardar log de error
    await firebaseUtils.saveErrorLog({
      type: 'auth_error',
      platform: 'quickbooks',
      message: error.message
    });

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=${encodeURIComponent('Error interno del servidor')}`);
  }
});

// Refrescar tokens manualmente
router.post('/refresh/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const tokens = await firebaseUtils.getTokens(platform);
    
    if (!tokens || !tokens.refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'No hay tokens para refrescar'
      });
    }

    const result = platform === 'jobber' 
      ? await authService.refreshJobberToken(tokens.refresh_token)
      : await authService.refreshQuickBooksToken(tokens.refresh_token);

    if (result.success) {
      res.json({
        success: true,
        message: 'Tokens refrescados correctamente'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error(`Error refrescando tokens de ${req.params.platform}:`, error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Desconectar plataforma
router.post('/disconnect/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    
    // Eliminar tokens de Firebase
    if (firebaseUtils.db) {
      await firebaseUtils.db.collection('tokens').doc(platform).delete();
    }

    // Guardar log de desconexión
    await firebaseUtils.saveErrorLog({
      type: 'disconnect',
      platform: platform,
      message: `Plataforma ${platform} desconectada`
    });

    res.json({
      success: true,
      message: `${platform} desconectado correctamente`
    });
  } catch (error) {
    console.error(`Error desconectando ${req.params.platform}:`, error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router; 