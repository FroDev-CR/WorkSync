import { useState, useEffect } from 'react';
import { jobsService, syncService, authService } from '../services/api';
import './Jobs.css';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [authStatus, setAuthStatus] = useState({
    jobber: { connected: false },
    quickbooks: { connected: false }
  });
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    loadAuthStatus();
  }, []);

  useEffect(() => {
    if (authStatus.jobber.connected) {
      loadJobs();
    }
  }, [authStatus.jobber.connected]);

  const loadAuthStatus = async () => {
    try {
      const response = await authService.getAuthStatus();
      setAuthStatus(response.status);
    } catch (error) {
      console.error('Error cargando estado de autenticación:', error);
    }
  };

  const loadJobs = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      // Intentar cargar Jobs recientes primero
      const response = await jobsService.getRecentJobs();
      if (response.success) {
        setJobs(response.jobs || []);
      } else {
        setMessage('Error cargando Jobs: ' + (response.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error cargando Jobs:', error);
      setMessage('Error cargando Jobs: ' + error.message);
      
      // Si hay error de autenticación, mostrar datos de ejemplo
      if (error.message.includes('token')) {
        setJobs([
          {
            id: '1',
            title: 'Mantenimiento de jardín',
            client: { name: 'Juan Pérez' },
            status: 'completed',
            total_amount: 150.00,
            scheduled_date: '2024-01-15'
          },
          {
            id: '2',
            title: 'Limpieza de piscina',
            client: { name: 'María García' },
            status: 'completed',
            total_amount: 200.00,
            scheduled_date: '2024-01-20'
          },
          {
            id: '3',
            title: 'Reparación de aire acondicionado',
            client: { name: 'Carlos López' },
            status: 'invoiced',
            total_amount: 350.00,
            scheduled_date: '2024-01-25'
          }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

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

    if (!authStatus.quickbooks.connected) {
      setMessage('Debes conectar QuickBooks antes de sincronizar');
      return;
    }

    setSyncLoading(true);
    setMessage('');

    try {
      // Sincronizar Jobs seleccionados
      const result = await syncService.syncMultipleJobs(selectedJobs);
      
      if (result.successful.length > 0) {
        setMessage(`✅ Sincronización exitosa: ${result.successful.length} Jobs sincronizados`);
        setSelectedJobs([]);
        // Recargar Jobs para actualizar el estado
        await loadJobs();
      } else if (result.skipped.length > 0) {
        setMessage(`⚠️ ${result.skipped.length} Jobs ya estaban sincronizados`);
        setSelectedJobs([]);
      } else if (result.failed.length > 0) {
        setMessage(`❌ Error sincronizando ${result.failed.length} Jobs`);
      }
    } catch (error) {
      console.error('Error sincronizando Jobs:', error);
      setMessage('Error sincronizando Jobs: ' + error.message);
    } finally {
      setSyncLoading(false);
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

  if (!authStatus.jobber.connected) {
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
          disabled={syncLoading || selectedJobs.length === 0 || !authStatus.quickbooks.connected}
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