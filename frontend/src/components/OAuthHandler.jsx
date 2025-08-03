import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const OAuthHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const connected = searchParams.get('connected');
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const state = searchParams.get('state');
    
    if (success && connected) {
      // Handle successful connection
      console.log(`${connected} connected successfully`);
      
      // Show success message or toast notification
      if (window.showNotification) {
        window.showNotification(`${connected} connected successfully!`, 'success');
      }
      
      // Redirect to settings page after 2 seconds
      setTimeout(() => {
        navigate('/settings?connectionSuccess=true&provider=' + connected);
      }, 2000);
      
    } else if (error) {
      // Handle error
      console.error('OAuth error:', error);
      
      // Show error message or toast notification
      if (window.showNotification) {
        window.showNotification(`Connection failed: ${error}`, 'error');
      }
      
      // Redirect to settings page with error
      setTimeout(() => {
        navigate('/settings?connectionError=' + encodeURIComponent(error));
      }, 2000);
    } else {
      // No specific parameters, redirect to settings
      navigate('/settings');
    }
  }, [searchParams, navigate]);

  // Show loading state while handling OAuth callback
  return (
    <div className="oauth-handler">
      <div className="loading-container">
        <div className="spinner"></div>
        <h2>Processing Authentication...</h2>
        <p>Please wait while we complete your connection.</p>
      </div>
      
      <style jsx>{`
        .oauth-handler {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .loading-container {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          text-align: center;
          max-width: 400px;
          width: 90%;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        h2 {
          color: #333;
          margin-bottom: 0.5rem;
        }
        
        p {
          color: #666;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default OAuthHandler;