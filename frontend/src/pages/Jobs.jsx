import { useState, useEffect } from 'react';
import { jobsService } from '../services/api';
import './Jobs.css';

const Jobs = ({ authStatus }) => {
  const [jobs, setJobs] = useState([]);
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authStatus.jobber.authenticated) {
      loadJobs();
    }
  }, [authStatus.jobber.authenticated]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      // Esta funcionalidad se implementará después
      // const response = await jobsService.getJobberJobs();
      // if (response.success) {
      //   setJobs(response.data);
      // }
      
      // Datos de ejemplo por ahora
      setJobs([
        {
          id: '1',
          title: 'Mantenimiento de jardín',
          client: 'Juan Pérez',
          status: 'completed',
          total: 150.00,
          date: '2024-01-15'
        },
        {
          id: '2',
          title: 'Limpieza de piscina',
          client: 'María García',
          status: 'scheduled',
          total: 200.00,
          date: '2024-01-20'
        }
      ]);
    } catch (error) {
      setMessage('Error cargando Jobs: ' + error.message);
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

    if (!authStatus.quickbooks.authenticated) {
      setMessage('Debes conectar QuickBooks antes de sincronizar');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Esta funcionalidad se implementará después
      // await jobsService.syncJobsToQuickBooks(selectedJobs);
      setMessage(`Sincronizando ${selectedJobs.length} Jobs a QuickBooks...`);
      setSelectedJobs([]);
    } catch (error) {
      setMessage('Error sincronizando Jobs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!authStatus.jobber.authenticated) {
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
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
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
          disabled={loading || selectedJobs.length === 0 || !authStatus.quickbooks.authenticated}
        >
          Sincronizar ({selectedJobs.length})
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
                <h3>{job.title}</h3>
                <span className={`status-badge ${job.status}`}>
                  {job.status === 'completed' ? 'Completado' : 'Programado'}
                </span>
              </div>
              
              <div className="job-details">
                <p><strong>Cliente:</strong> {job.client}</p>
                <p><strong>Fecha:</strong> {job.date}</p>
                <p><strong>Total:</strong> ${job.total}</p>
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
        </div>
      )}
    </div>
  );
};

export default Jobs; 