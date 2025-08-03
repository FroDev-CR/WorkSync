import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AuthStatus from '../components/AuthStatus';
import OAuthHandler from '../components/OAuthHandler';
import './Settings.css';

const Settings = ({ onAuthStatusChange }) => {
  const [searchParams] = useSearchParams();
  const [shouldShowOAuth, setShouldShowOAuth] = useState(false);

  useEffect(() => {
    // Check if we have OAuth callback parameters
    const hasOAuthParams = searchParams.get('connected') || 
                          searchParams.get('success') || 
                          searchParams.get('error');
    setShouldShowOAuth(!!hasOAuthParams);
  }, [searchParams]);

  const handleConnectionUpdate = (provider, connected) => {
    if (onAuthStatusChange) {
      onAuthStatusChange();
    }
  };

  // If we have OAuth parameters, show the OAuth handler
  if (shouldShowOAuth) {
    return <OAuthHandler onConnectionUpdate={handleConnectionUpdate} />;
  }

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Configuración</h1>
        <p>Gestiona las conexiones con Jobber y QuickBooks</p>
      </div>

      <AuthStatus userId="default-user" />

      <div className="settings-grid">
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
      </div>
    </div>
  );
};

export default Settings; 