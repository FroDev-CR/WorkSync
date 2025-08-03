import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const Header = ({ authStatus, onAuthStatusChange }) => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/">
            <h1>WorkSync</h1>
          </Link>
        </div>

        <nav className="nav">
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/jobs" 
            className={`nav-link ${isActive('/jobs') ? 'active' : ''}`}
          >
            Jobs
          </Link>
          <Link 
            to="/history" 
            className={`nav-link ${isActive('/history') ? 'active' : ''}`}
          >
            Historial
          </Link>
          <Link 
            to="/settings" 
            className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
          >
            Configuración
          </Link>
        </nav>

        <div className="auth-status">
          <div className="auth-item">
            <span className={`status-dot ${authStatus?.jobber?.connected ? 'connected' : 'disconnected'}`}></span>
            <span className="platform-name">Jobber</span>
          </div>
          <div className="auth-item">
            <span className={`status-dot ${authStatus?.quickbooks?.connected ? 'connected' : 'disconnected'}`}></span>
            <span className="platform-name">QuickBooks</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 