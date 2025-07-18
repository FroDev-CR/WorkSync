import { useState } from 'react';
import { authService } from '../services/api';
import './Settings.css';

const Settings = ({ authStatus, onAuthStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleConnect = async (platform) => {
    setLoading(true);
    setMessage('');

    try {
      let authUrl;
      if (platform === 'jobber') {
        const response = await authService.getJobberAuthUrl();
        authUrl = response.data.authUrl;
      } else {
        const response = await authService.getQuickBooksAuthUrl();
        authUrl = response.data.authUrl;
      }

      // Abrir ventana de autorización
      window.open(authUrl, '_blank', 'width=600,height=700');
      
      setMessage(`Redirigiendo a ${platform} para autorización...`);
    } catch (error) {
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
      onAuthStatusChange(); // Actualizar estado
    } catch (error) {
      setMessage(`Error desconectando ${platform}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshTokens = async (platform) => {
    setLoading(true);
    setMessage('');

    try {
      await authService.refreshTokens(platform);
      setMessage(`Tokens de ${platform} refrescados correctamente`);
      onAuthStatusChange(); // Actualizar estado
    } catch (error) {
      setMessage(`Error refrescando tokens de ${platform}: ${error.message}`);
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
            <span className={`status-badge ${authStatus.jobber.authenticated ? 'connected' : 'disconnected'}`}>
              {authStatus.jobber.authenticated ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          
          <div className="card-content">
            <p>Conecta tu cuenta de Jobber para acceder a los Jobs y sincronizarlos.</p>
            
            <div className="connection-actions">
              {authStatus.jobber.authenticated ? (
                <>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleRefreshTokens('jobber')}
                    disabled={loading}
                  >
                    Refrescar Tokens
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDisconnect('jobber')}
                    disabled={loading}
                  >
                    Desconectar
                  </button>
                </>
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
            <span className={`status-badge ${authStatus.quickbooks.authenticated ? 'connected' : 'disconnected'}`}>
              {authStatus.quickbooks.authenticated ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          
          <div className="card-content">
            <p>Conecta tu cuenta de QuickBooks para recibir los Jobs sincronizados.</p>
            
            <div className="connection-actions">
              {authStatus.quickbooks.authenticated ? (
                <>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleRefreshTokens('quickbooks')}
                    disabled={loading}
                  >
                    Refrescar Tokens
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDisconnect('quickbooks')}
                    disabled={loading}
                  >
                    Desconectar
                  </button>
                </>
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
              <p>Los tokens de acceso se almacenan de forma segura en Firebase y se refrescan automáticamente cuando expiran.</p>
            </div>
            
            <div className="info-item">
              <h4>🔄 Sincronización</h4>
              <p>Una vez conectadas ambas plataformas, podrás seleccionar Jobs de Jobber y sincronizarlos a QuickBooks.</p>
            </div>
            
            <div className="info-item">
              <h4>📊 Historial</h4>
              <p>Todas las sincronizaciones se registran en el historial para seguimiento y auditoría.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 