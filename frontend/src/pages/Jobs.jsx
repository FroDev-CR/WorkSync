import { useState, useEffect } from 'react';
import { useJobs, useAuthStatus, useJobSync } from '../hooks/useWorkSyncAPI';
import './Jobs.css';

const Jobs = () => {
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [message, setMessage] = useState('');
  
  const { authStatus, loading: authLoading } = useAuthStatus('default-user');
  const { jobs, loading, error, refetch } = useJobs({ userId: 'default-user' });
  const { syncMultipleJobs, loading: syncLoading } = useJobSync();

  useEffect(() => {
    if (error) {
      setMessage('Error cargando Jobs: ' + error);
      
      // Show example jobs if there's an authentication error
      if (error.includes('token') || error.includes('auth')) {
        // The error handling is now managed by the hook
        setMessage('Error de autenticación. Mostrando datos de ejemplo.');
      }
    }
  }, [error]);

  const handleJobSelection = (jobId) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const handleSelectAll = () => {
    if (selectedJobs.length === jobs.length) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(jobs.map(job => job.id));
    }
  };

  const handleSync = async () => {
    if (selectedJobs.length === 0) {
      setMessage('Selecciona al menos un Job para sincronizar');
      return;
    }

    if (!authStatus?.quickbooks?.connected) {
      setMessage('Debes conectar QuickBooks antes de sincronizar');
      return;
    }

    setMessage('');

    try {
      const result = await syncMultipleJobs(selectedJobs, 'default-user');
      
      if (result.success) {
        if (result.successfulJobs > 0) {
          setMessage(`✅ Sincronización exitosa: ${result.successfulJobs} Jobs sincronizados`);
          setSelectedJobs([]);
          refetch(); // Reload jobs
        } else if (result.failedJobs > 0) {
          setMessage(`❌ Error sincronizando ${result.failedJobs} Jobs`);
        }
      } else {
        setMessage(`❌ Error en la sincronización: ${result.message}`);
      }
    } catch (error) {
      console.error('Error sincronizando Jobs:', error);
      setMessage('Error sincronizando Jobs: ' + error.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CR');
  };

  const getStatusText = (status) => {
    const statusMap = {
      'completed': 'Completado',
      'invoiced': 'Facturado',
      'scheduled': 'Programado',
      'in_progress': 'En Progreso',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  if (!authStatus?.jobber?.connected) {
    return (
      <div className="jobs">
        <div className="jobs-header">
          <h1>Jobs</h1>
          <p>Conecta Jobber para ver y sincronizar tus Jobs</p>
        </div>
        <div className="connection-required">
          <p>Necesitas conectar tu cuenta de Jobber para ver los Jobs.</p>
          <p>Ve a Configuración para conectar Jobber.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="jobs">
      <div className="jobs-header">
        <h1>Jobs de Jobber</h1>
        <p>Selecciona los Jobs que quieres sincronizar a QuickBooks</p>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') || message.includes('❌') ? 'error' : message.includes('✅') ? 'success' : 'info'}`}>
          {message}
        </div>
      )}

      <div className="jobs-actions">
        <button 
          className="btn btn-secondary"
          onClick={handleSelectAll}
          disabled={loading || jobs.length === 0}
        >
          {selectedJobs.length === jobs.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
        </button>
        
        <button 
          className="btn btn-primary"
          onClick={handleSync}
          disabled={syncLoading || selectedJobs.length === 0 || !authStatus?.quickbooks?.connected}
        >
          {syncLoading ? 'Sincronizando...' : `Sincronizar (${selectedJobs.length})`}
        </button>
      </div>

      {loading ? (
        <div className="jobs-loading">
          <div className="loading-spinner"></div>
          <p>Cargando Jobs...</p>
        </div>
      ) : jobs.length > 0 ? (
        <div className="jobs-grid">
          {jobs.map(job => (
            <div 
              key={job.id} 
              className={`job-card ${selectedJobs.includes(job.id) ? 'selected' : ''}`}
              onClick={() => handleJobSelection(job.id)}
            >
              <div className="job-header">
                <h3>{job.title || `Job ${job.id}`}</h3>
                <span className={`status-badge ${job.status}`}>
                  {getStatusText(job.status)}
                </span>
              </div>
              
              <div className="job-details">
                <p><strong>Cliente:</strong> {job.client?.name || 'Cliente no especificado'}</p>
                <p><strong>Fecha:</strong> {formatDate(job.scheduled_date || job.created_at)}</p>
                <p><strong>Total:</strong> {formatCurrency(job.total_amount)}</p>
              </div>
              
              <div className="job-selection">
                <input 
                  type="checkbox" 
                  checked={selectedJobs.includes(job.id)}
                  onChange={() => handleJobSelection(job.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-jobs">
          <p>No hay Jobs disponibles</p>
          <p>Los Jobs aparecerán aquí una vez que estén completados o facturados en Jobber.</p>
        </div>
      )}
    </div>
  );
};

export default Jobs; 