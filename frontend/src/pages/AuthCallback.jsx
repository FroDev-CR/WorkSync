import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/api';
import './AuthCallback.css';

const AuthCallback = () => {
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Procesando autorización...');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        console.log('=== CALLBACK FRONTEND ===');
        console.log('Code:', code ? 'PRESENTE' : 'AUSENTE');
        console.log('State:', state ? 'PRESENTE' : 'AUSENTE');
        console.log('Error:', error || 'NINGUNO');

        if (error) {
          setStatus('error');
          setMessage(`Error de autorización: ${error}${errorDescription ? ': ' + errorDescription : ''}`);
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Parámetros de autorización faltantes');
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }

        // Parsear el state para obtener información del proveedor
        let stateData;
        try {
          stateData = JSON.parse(decodeURIComponent(state));
        } catch (parseError) {
          console.error('Error parseando state:', parseError);
          setStatus('error');
          setMessage('State parameter inválido');
          setTimeout(() => navigate('/settings'), 3000);
          return;
        }

        const { provider, userId } = stateData;
        console.log(`Procesando callback de ${provider} para usuario ${userId}`);

        setMessage(`Conectando con ${provider.charAt(0).toUpperCase() + provider.slice(1)}...`);

        // Hacer la petición al backend para intercambiar el código por token
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/callback?${searchParams.toString()}`, {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          setStatus('success');
          setMessage(`¡${provider.charAt(0).toUpperCase() + provider.slice(1)} conectado exitosamente!`);
          
          // Redirigir a configuración después de 2 segundos
          setTimeout(() => {
            navigate('/settings?connected=' + provider);
          }, 2000);
        } else {
          const errorData = await response.text();
          console.error('Error en callback:', errorData);
          setStatus('error');
          setMessage(`Error conectando con ${provider}: ${errorData}`);
          setTimeout(() => navigate('/settings'), 3000);
        }

      } catch (error) {
        console.error('Error procesando callback:', error);
        setStatus('error');
        setMessage('Error procesando autorización: ' + error.message);
        setTimeout(() => navigate('/settings'), 3000);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="auth-callback">
      <div className="callback-container">
        <div className={`callback-status ${status}`}>
          {status === 'processing' && (
            <div className="loading-spinner"></div>
          )}
          
          {status === 'success' && (
            <div className="success-icon">✅</div>
          )}
          
          {status === 'error' && (
            <div className="error-icon">❌</div>
          )}
          
          <h2>{message}</h2>
          
          {status === 'processing' && (
            <p>Por favor espera mientras procesamos tu autorización...</p>
          )}
          
          {status === 'success' && (
            <p>Serás redirigido automáticamente a la página de configuración.</p>
          )}
          
          {status === 'error' && (
            <p>Serás redirigido automáticamente. Si el problema persiste, inténtalo de nuevo.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;