import { useAuthStatus, useOAuth } from '../hooks/useWorkSyncAPI';
import './AuthStatus.css';

const AuthStatus = ({ userId = 'default-user' }) => {
  const { authStatus, loading, error, refetch } = useAuthStatus(userId);
  const { getJobberAuthUrl, getQuickBooksAuthUrl, disconnectProvider, loading: oauthLoading } = useOAuth();

  const handleConnect = async (provider) => {
    try {
      let result;
      if (provider === 'jobber') {
        result = await getJobberAuthUrl(userId);
      } else if (provider === 'quickbooks') {
        result = await getQuickBooksAuthUrl(userId);
      }
      
      if (result.success && result.authUrl) {
        window.location.href = result.authUrl;
      }
    } catch (err) {
      console.error(`Failed to get ${provider} auth URL:`, err);
    }
  };

  const handleDisconnect = async (provider) => {
    try {
      const result = await disconnectProvider(provider, userId);
      if (result.success) {
        refetch();
      }
    } catch (err) {
      console.error(`Failed to disconnect ${provider}:`, err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="auth-status loading">
        <div className="loading-spinner"></div>
        <p>Loading authentication status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-status error">
        <div className="error-message">
          <h3>Error loading authentication status</h3>
          <p>{error}</p>
          <button onClick={refetch} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-status">
      <div className="auth-header">
        <h3>Integration Status</h3>
        <button onClick={refetch} className="refresh-button" disabled={loading}>
          🔄 Refresh
        </button>
      </div>
      
      <div className="providers">
        <div className="provider-card">
          <div className="provider-header">
            <h4>
              <img src="/jobber-icon.png" alt="Jobber" className="provider-icon" />
              Jobber
            </h4>
            <div className={`status-badge ${authStatus?.jobber?.connected ? 'connected' : 'disconnected'}`}>
              {authStatus?.jobber?.connected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
          </div>
          
          <div className="provider-details">
            {authStatus?.jobber?.connected ? (
              <>
                <div className="detail-row">
                  <span className="label">Authenticated:</span>
                  <span className={`value ${authStatus.jobber.authenticated ? 'success' : 'warning'}`}>
                    {authStatus.jobber.authenticated ? 'Yes' : 'No'}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="label">Last Sync:</span>
                  <span className="value">{formatDate(authStatus.jobber.lastSync)}</span>
                </div>
                
                <div className="detail-row">
                  <span className="label">Token Expires:</span>
                  <span className={`value ${authStatus.jobber.expired ? 'error' : 'success'}`}>
                    {authStatus.jobber.expiresAt ? formatDate(authStatus.jobber.expiresAt) : 'Unknown'}
                  </span>
                </div>
                
                {authStatus.jobber.error && (
                  <div className="detail-row">
                    <span className="label">Error:</span>
                    <span className="value error">{authStatus.jobber.error}</span>
                  </div>
                )}
                
                <button 
                  onClick={() => handleDisconnect('jobber')} 
                  className="disconnect-button"
                  disabled={oauthLoading}
                >
                  Disconnect Jobber
                </button>
              </>
            ) : (
              <button 
                onClick={() => handleConnect('jobber')} 
                className="connect-button"
                disabled={oauthLoading}
              >
                Connect to Jobber
              </button>
            )}
          </div>
        </div>

        <div className="provider-card">
          <div className="provider-header">
            <h4>
              <img src="/quickbooks-icon.png" alt="QuickBooks" className="provider-icon" />
              QuickBooks
            </h4>
            <div className={`status-badge ${authStatus?.quickbooks?.connected ? 'connected' : 'disconnected'}`}>
              {authStatus?.quickbooks?.connected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
          </div>
          
          <div className="provider-details">
            {authStatus?.quickbooks?.connected ? (
              <>
                <div className="detail-row">
                  <span className="label">Authenticated:</span>
                  <span className={`value ${authStatus.quickbooks.authenticated ? 'success' : 'warning'}`}>
                    {authStatus.quickbooks.authenticated ? 'Yes' : 'No'}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="label">Company ID:</span>
                  <span className="value">{authStatus.quickbooks.companyId || 'Not set'}</span>
                </div>
                
                <div className="detail-row">
                  <span className="label">Last Sync:</span>
                  <span className="value">{formatDate(authStatus.quickbooks.lastSync)}</span>
                </div>
                
                <div className="detail-row">
                  <span className="label">Token Expires:</span>
                  <span className={`value ${authStatus.quickbooks.expired ? 'error' : 'success'}`}>
                    {authStatus.quickbooks.expiresAt ? formatDate(authStatus.quickbooks.expiresAt) : 'Unknown'}
                  </span>
                </div>
                
                {authStatus.quickbooks.error && (
                  <div className="detail-row">
                    <span className="label">Error:</span>
                    <span className="value error">{authStatus.quickbooks.error}</span>
                  </div>
                )}
                
                <button 
                  onClick={() => handleDisconnect('quickbooks')} 
                  className="disconnect-button"
                  disabled={oauthLoading}
                >
                  Disconnect QuickBooks
                </button>
              </>
            ) : (
              <button 
                onClick={() => handleConnect('quickbooks')} 
                className="connect-button"
                disabled={oauthLoading}
              >
                Connect to QuickBooks
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthStatus;