import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authService, syncService } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [authStatus, setAuthStatus] = useState({
    jobber: { connected: false, lastSync: null },
    quickbooks: { connected: false, lastSync: null }
  });
  const [syncStats, setSyncStats] = useState({
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    totalAmount: 0,
    lastSync: null,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar estado de autenticación
      const authResponse = await authService.getAuthStatus();
      setAuthStatus(authResponse.status);

      // Cargar estadísticas de sincronización
      const statsResponse = await syncService.getSyncStats();
      if (statsResponse.success) {
        setSyncStats(statsResponse.stats);
      }
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
      setError('Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getConnectionStatus = () => {
    const jobberConnected = authStatus.jobber.connected;
    const quickbooksConnected = authStatus.quickbooks.connected;
    
    if (jobberConnected && quickbooksConnected) {
      return {
        status: 'ready',
        message: 'Listo para sincronizar',
        color: '#10b981'
      };
    } else if (jobberConnected || quickbooksConnected) {
      return {
        status: 'partial',
        message: 'Conecta ambas plataformas para sincronizar',
        color: '#f59e0b'
      };
    } else {
      return {
        status: 'disconnected',
        message: 'Conecta Jobber y QuickBooks para empezar',
        color: '#ef4444'
      };
    }
  };

  const connectionStatus = getConnectionStatus();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={loadDashboardData} className="retry-button">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Bienvenido a WorkSync - Sincroniza tus Jobs de Jobber a QuickBooks</p>
      </div>

      <div className="dashboard-grid">
        {/* Estado de conexiones */}
        <div className="dashboard-card connection-status">
          <h3>Estado de Conexiones</h3>
          <div className="status-content">
            <div className="status-indicator" style={{ backgroundColor: connectionStatus.color }}>
              <span className="status-text">{connectionStatus.message}</span>
            </div>
            
            <div className="platform-status">
              <div className="platform-item">
                <span className={`platform-dot ${authStatus.jobber.connected ? 'connected' : 'disconnected'}`}></span>
                <span className="platform-name">Jobber</span>
                <span className="platform-status-text">
                  {authStatus.jobber.connected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              
              <div className="platform-item">
                <span className={`platform-dot ${authStatus.quickbooks.connected ? 'connected' : 'disconnected'}`}></span>
                <span className="platform-name">QuickBooks</span>
                <span className="platform-status-text">
                  {authStatus.quickbooks.connected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas de sincronización */}
        <div className="dashboard-card sync-stats">
          <h3>Estadísticas de Sincronización</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">{syncStats.totalSyncs}</div>
              <div className="stat-label">Total Sincronizaciones</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-number success">{syncStats.successfulSyncs}</div>
              <div className="stat-label">Exitosas</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-number error">{syncStats.failedSyncs}</div>
              <div className="stat-label">Fallidas</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-number amount">{formatCurrency(syncStats.totalAmount)}</div>
              <div className="stat-label">Monto Total</div>
            </div>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="dashboard-card quick-actions">
          <h3>Acciones Rápidas</h3>
          <div className="actions-grid">
            <Link to="/jobs" className="action-card">
              <div className="action-icon">📋</div>
              <h4>Ver Jobs</h4>
              <p>Explora y selecciona Jobs de Jobber</p>
            </Link>
            
            <Link to="/history" className="action-card">
              <div className="action-icon">📊</div>
              <h4>Historial</h4>
              <p>Revisa sincronizaciones anteriores</p>
            </Link>
            
            <Link to="/settings" className="action-card">
              <div className="action-icon">⚙️</div>
              <h4>Configuración</h4>
              <p>Gestiona conexiones y preferencias</p>
            </Link>
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="dashboard-card recent-activity">
          <h3>Actividad Reciente</h3>
          <div className="activity-content">
            {syncStats.recentActivity.length > 0 ? (
              <div className="activity-list">
                {syncStats.recentActivity.slice(0, 5).map((item, index) => (
                  <div key={index} className="activity-item">
                    <span className="activity-time">
                      {new Date(item.createdAt?.toDate?.() || item.createdAt).toLocaleString()}
                    </span>
                    <span className="activity-message">
                      {item.status === 'success' ? '✅' : '❌'} {item.message || 'Sincronización'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-activity">
                <p>No hay actividad reciente</p>
                <p>¡Comienza sincronizando algunos Jobs!</p>
              </div>
            )}
          </div>
        </div>

        {/* Guía de uso */}
        <div className="dashboard-card usage-guide">
          <h3>¿Cómo usar WorkSync?</h3>
          <div className="guide-steps">
            <div className="guide-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Conecta las plataformas</h4>
                <p>Ve a Configuración y conecta tu cuenta de Jobber y QuickBooks</p>
              </div>
            </div>
            
            <div className="guide-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Selecciona Jobs</h4>
                <p>Ve a Jobs para ver y seleccionar los Jobs que quieres sincronizar</p>
              </div>
            </div>
            
            <div className="guide-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Sincroniza</h4>
                <p>Haz clic en "Sincronizar" para exportar los Jobs a QuickBooks</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 