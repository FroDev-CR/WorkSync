import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { authService } from './services/api';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import History from './pages/History';
import Settings from './pages/Settings';
import Header from './components/Header';
import './App.css';

function App() {
  const [authStatus, setAuthStatus] = useState({
    jobber: { authenticated: false },
    quickbooks: { authenticated: false }
  });
  const [loading, setLoading] = useState(true);

  // Verificar estado de autenticación al cargar
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await authService.getAuthStatus();
      if (response.success) {
        setAuthStatus(response.data);
      }
    } catch (error) {
      console.error('Error verificando estado de autenticación:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar mensajes de URL (para callbacks de OAuth)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success) {
      alert(`¡Autenticación exitosa con ${success}!`);
      checkAuthStatus();
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (error) {
      alert(`Error de autenticación: ${decodeURIComponent(error)}`);
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Cargando WorkSync...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <Header authStatus={authStatus} onAuthStatusChange={checkAuthStatus} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard authStatus={authStatus} />} />
            <Route path="/jobs" element={<Jobs authStatus={authStatus} />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings authStatus={authStatus} onAuthStatusChange={checkAuthStatus} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
