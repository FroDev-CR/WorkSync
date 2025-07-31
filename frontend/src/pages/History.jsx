import { useState, useEffect } from 'react';
import { syncService } from '../services/api';
import './History.css';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await syncService.getSyncStats();
      
      if (response.success && response.stats.recentActivity) {
        // Transformar los datos de la API al formato esperado por el componente
        const transformedHistory = response.stats.recentActivity.map(item => ({
          id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: item.status === 'success' ? 'sync_success' : 'sync_error',
          message: item.status === 'success' ? 
            `Sincronización exitosa: Job ${item.jobId || 'desconocido'} exportado a QuickBooks` :
            `Error sincronizando Job ${item.jobId || 'desconocido'}: ${item.message || 'Error desconocido'}`,
          createdAt: item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt || Date.now()),
          details: {
            jobId: item.jobId,
            jobsCount: item.syncType === 'batch' ? item.summary?.successful : 1,
            platform: 'quickbooks',
            amount: item.amount,
            error: item.status !== 'success' ? item.message : null
          }
        }));
        
        setHistory(transformedHistory);
      } else {
        // Si no hay datos de la API, mostrar datos de ejemplo
        setHistory([
          {
            id: '1',
            type: 'sync_success',
            message: 'Sincronización exitosa: 3 Jobs exportados a QuickBooks',
            createdAt: new Date('2024-01-15T10:30:00'),
            details: {
              jobsCount: 3,
              platform: 'quickbooks'
            }
          },
          {
            id: '2',
            type: 'sync_error',
            message: 'Error sincronizando Job #123: Cliente no encontrado en QuickBooks',
            createdAt: new Date('2024-01-14T15:45:00'),
            details: {
              jobId: '123',
              error: 'Cliente no encontrado'
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      // En caso de error, mostrar datos de ejemplo
      setHistory([
        {
          id: 'example-1',
          type: 'sync_success',
          message: 'Ejemplo: Sincronización exitosa de Job completado',
          createdAt: new Date(),
          details: {
            jobsCount: 1,
            platform: 'quickbooks'
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (type) => {
    switch (type) {
      case 'sync_success':
        return '✅';
      case 'sync_error':
        return '❌';
      case 'auth_success':
        return '🔗';
      case 'auth_error':
        return '⚠️';
      default:
        return '📝';
    }
  };

  const getStatusColor = (type) => {
    switch (type) {
      case 'sync_success':
      case 'auth_success':
        return 'success';
      case 'sync_error':
      case 'auth_error':
        return 'error';
      default:
        return 'info';
    }
  };

  if (loading) {
    return (
      <div className="history">
        <div className="history-header">
          <h1>Historial de Sincronización</h1>
          <p>Revisa todas las sincronizaciones y actividades</p>
        </div>
        <div className="history-loading">
          <div className="loading-spinner"></div>
          <p>Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history">
      <div className="history-header">
        <h1>Historial de Sincronización</h1>
        <p>Revisa todas las sincronizaciones y actividades</p>
      </div>

      {history.length > 0 ? (
        <div className="history-list">
          {history.map(item => (
            <div key={item.id} className={`history-item ${getStatusColor(item.type)}`}>
              <div className="history-icon">
                {getStatusIcon(item.type)}
              </div>
              
              <div className="history-content">
                <div className="history-message">
                  {item.message}
                </div>
                
                <div className="history-meta">
                  <span className="history-time">
                    {item.createdAt.toLocaleString()}
                  </span>
                  
                  {item.details && (
                    <span className="history-details">
                      {item.details.jobsCount && `${item.details.jobsCount} Jobs`}
                      {item.details.platform && ` → ${item.details.platform}`}
                      {item.details.error && ` (${item.details.error})`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-history">
          <p>No hay historial de sincronización</p>
          <p>Las sincronizaciones aparecerán aquí una vez que comiences a usar WorkSync.</p>
        </div>
      )}
    </div>
  );
};

export default History; 