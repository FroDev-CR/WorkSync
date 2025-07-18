import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authService, syncService } from '../services/api';
import './Dashboard.css';

const Dashboard = ({ authStatus }) => {
  const [syncHistory, setSyncHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Cargar historial de sincronización (se implementará después)
      // const historyResponse = await syncService.getSyncHistory();
      // if (historyResponse.success) {
      //   setSyncHistory(historyResponse.data);
      // }
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConnectionStatus = () => {
    const jobberConnected = authStatus.jobber.authenticated;
    const quickbooksConnected = authStatus.quickbooks.authenticated;
    
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

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Cargando dashboard...</p>
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
                <span className={`platform-dot ${authStatus.jobber.authenticated ? 'connected' : 'disconnected'}`}></span>
                <span className="platform-name">Jobber</span>
                <span className="platform-status-text">
                  {authStatus.jobber.authenticated ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              
              <div className="platform-item">
                <span className={`platform-dot ${authStatus.quickbooks.authenticated ? 'connected' : 'disconnected'}`}></span>
                <span className="platform-name">QuickBooks</span>
                <span className="platform-status-text">
                  {authStatus.quickbooks.authenticated ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
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

        {/* Estadísticas recientes */}
        <div className="dashboard-card recent-activity">
          <h3>Actividad Reciente</h3>
          <div className="activity-content">
            {syncHistory.length > 0 ? (
              <div className="activity-list">
                {syncHistory.slice(0, 5).map((item, index) => (
                  <div key={index} className="activity-item">
                    <span className="activity-time">{new Date(item.createdAt).toLocaleString()}</span>
                    <span className="activity-message">{item.message}</span>
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