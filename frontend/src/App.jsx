import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import History from './pages/History';
import Settings from './pages/Settings';
import OAuthHandler from './components/OAuthHandler';
import { workSyncAPI } from './services/api';
import './App.css';

function App() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [isBackendAvailable, setIsBackendAvailable] = useState(false);

  useEffect(() => {
    // Check backend health on app start
    const checkBackendHealth = async () => {
      try {
        const health = await workSyncAPI.checkHealth();
        setHealthStatus(health);
        setIsBackendAvailable(true);
        console.log('Backend is available:', health);
      } catch (error) {
        console.warn('Backend not available, running in mock mode');
        setIsBackendAvailable(false);
        setHealthStatus({ 
          success: false, 
          message: 'Backend not available - running in mock mode' 
        });
      }
    };

    checkBackendHealth();
  }, []);

  return (
    <Router>
      <div className="App">
        <Header isBackendAvailable={isBackendAvailable} />
        
        {!isBackendAvailable && (
          <div className="backend-warning">
            ⚠️ Backend not available - running in demo mode with mock data. 
            Start your Spring Boot backend on port 8080 for full functionality.
          </div>
        )}
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/auth/callback" element={<OAuthHandler />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;