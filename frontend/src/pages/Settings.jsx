import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService } from '../services/api';
import './Settings.css';

const Settings = ({ onAuthStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [authStatus, setAuthStatus] = useState({
    jobber: { connected: false },
    quickbooks: { connected: false }
  });
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    loadAuthStatus();
  }, []);

  // Manejar parámetros de callback OAuth
  useEffect(() => {
    const connected = searchParams.get('connected');
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const description = searchParams.get('description');

    if (connected && success) {
      setMessage(`✅ ¡${connected.charAt(0).toUpperCase() + connected.slice(1)} conectado exitosamente!`);
      // Recargar estado de autenticación
      setTimeout(() => {
        loadAuthStatus();
        if (onAuthStatusChange) onAuthStatusChange();
      }, 1000);
      
      // Limpiar parámetros de URL
      setSearchParams({});
    } else if (error) {
      setMessage(`❌ Error de conexión: ${description || error}`);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, onAuthStatusChange]);

  const loadAuthStatus = async () => {
    try {
      const response = await authService.getAuthStatus();
      setAuthStatus(response.status);
    } catch (error) {
      console.error('Error cargando estado de autenticación:', error);
    }
  };

  const handleConnect = async (platform) => {
    setLoading(true);
    setMessage('');

    try {
      let response;
      if (platform === 'jobber') {
        response = await authService.getJobberAuthUrl();
      } else {
        response = await authService.getQuickBooksAuthUrl();
      }

      const authUrl = response.authUrl;
      
      // Abrir ventana de autorización
      const authWindow = window.open(authUrl, '_blank', 'width=600,height=700');
      
      setMessage(`Redirigiendo a ${platform} para autorización...`);
      
      // Verificar si la ventana se cerró (opcional)
      if (authWindow) {
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            // Recargar estado después de un momento
            setTimeout(() => {
              loadAuthStatus();
            }, 2000);
          }
        }, 1000);
      }
    } catch (error) {
      console.error(`Error conectando con ${platform}:`, error);
      setMessage(`Error conectando con ${platform}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (platform) => {
    setLoading(true);
    setMessage('');

    try {
      await authService.disconnectPlatform(platform);
      setMessage(`${platform} desconectado correctamente`);
      await loadAuthStatus(); // Actualizar estado
    } catch (error) {
      console.error(`Error desconectando ${platform}:`, error);
      setMessage(`Error desconectando ${platform}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Configuración</h1>
        <p>Gestiona las conexiones con Jobber y QuickBooks</p>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="settings-grid">
        {/* Configuración de Jobber */}
        <div className="settings-card">
          <div className="card-header">
            <h3>Jobber</h3>
            <span className={`status-badge ${authStatus.jobber.connected ? 'connected' : 'disconnected'}`}>
              {authStatus.jobber.connected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          
          <div className="card-content">
            <p>Conecta tu cuenta de Jobber para acceder a los Jobs y sincronizarlos.</p>
            
            <div className="connection-actions">
              {authStatus.jobber.connected ? (
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDisconnect('jobber')}
                  disabled={loading}
                >
                  Desconectar Jobber
                </button>
              ) : (
                <button 
                  className="btn btn-primary"
                  onClick={() => handleConnect('jobber')}
                  disabled={loading}
                >
                  Conectar Jobber
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Configuración de QuickBooks */}
        <div className="settings-card">
          <div className="card-header">
            <h3>QuickBooks</h3>
            <span className={`status-badge ${authStatus.quickbooks.connected ? 'connected' : 'disconnected'}`}>
              {authStatus.quickbooks.connected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          
          <div className="card-content">
            <p>Conecta tu cuenta de QuickBooks para recibir los Jobs sincronizados.</p>
            
            <div className="connection-actions">
              {authStatus.quickbooks.connected ? (
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDisconnect('quickbooks')}
                  disabled={loading}
                >
                  Desconectar QuickBooks
                </button>
              ) : (
                <button 
                  className="btn btn-primary"
                  onClick={() => handleConnect('quickbooks')}
                  disabled={loading}
                >
                  Conectar QuickBooks
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="settings-card info-card">
          <h3>Información Importante</h3>
          <div className="info-content">
            <div className="info-item">
              <h4>🔐 Seguridad</h4>
              <p>Los tokens de acceso se almacenan de forma segura y se refrescan automáticamente cuando expiran.</p>
            </div>
            
            <div className="info-item">
              <h4>🔄 Sincronización</h4>
              <p>Una vez conectadas ambas plataformas, podrás seleccionar Jobs de Jobber y sincronizarlos a QuickBooks.</p>
            </div>
            
            <div className="info-item">
              <h4>📊 Historial</h4>
              <p>Todas las sincronizaciones se registran en el historial para seguimiento y auditoría.</p>
            </div>

            <div className="info-item">
              <h4>⚠️ Nota Importante</h4>
              <p>Para que la sincronización funcione correctamente, necesitas tener Jobs completados o facturados en Jobber.</p>
            </div>
          </div>
        </div>

        {/* Estado de conexiones */}
        <div className="settings-card status-card">
          <h3>Estado de Conexiones</h3>
          <div className="status-content">
            <div className="status-item">
              <span className="status-label">Jobber:</span>
              <span className={`status-value ${authStatus.jobber.connected ? 'connected' : 'disconnected'}`}>
                {authStatus.jobber.connected ? '✅ Conectado' : '❌ Desconectado'}
              </span>
            </div>
            
            <div className="status-item">
              <span className="status-label">QuickBooks:</span>
              <span className={`status-value ${authStatus.quickbooks.connected ? 'connected' : 'disconnected'}`}>
                {authStatus.quickbooks.connected ? '✅ Conectado' : '❌ Desconectado'}
              </span>
            </div>
            
            <div className="status-item">
              <span className="status-label">Listo para sincronizar:</span>
              <span className={`status-value ${authStatus.jobber.connected && authStatus.quickbooks.connected ? 'ready' : 'not-ready'}`}>
                {authStatus.jobber.connected && authStatus.quickbooks.connected ? '✅ Sí' : '❌ No'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 