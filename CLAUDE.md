# WorkSync - Claude Development Documentation

This document contains comprehensive information about the WorkSync project implementation, architecture decisions, and development guidelines for future Claude interactions.

## 📋 Project Overview

WorkSync is a React + Vite frontend application designed to integrate with a Spring Boot backend for synchronizing jobs between Jobber and QuickBooks using OAuth2 authentication.

### Key Technologies
- **Frontend**: React 19.1.0 + Vite 7.0.4
- **Backend**: Spring Boot (to be integrated)
- **State Management**: React Hooks + Custom Hooks
- **HTTP Client**: Fetch API (replaced Axios)
- **Styling**: Pure CSS3 with responsive design
- **Build Tool**: Vite with proxy configuration

## 🏗️ Architecture Implementation

### Frontend Architecture

```
src/
├── components/           # Reusable UI components
│   ├── AuthStatus.jsx   # OAuth status display with connect/disconnect
│   ├── OAuthHandler.jsx # OAuth callback processing
│   └── Header.jsx       # Navigation with auth indicators
├── hooks/               # Custom React hooks for API integration
│   └── useWorkSyncAPI.js # Complete API integration layer
├── pages/               # Route-based page components
│   ├── Dashboard.jsx    # Main overview with stats
│   ├── Jobs.jsx         # Job listing and bulk sync
│   ├── Settings.jsx     # OAuth management
│   └── History.jsx      # Sync history
├── services/            # API service layer
│   └── api.js           # WorkSyncAPI class with mock fallbacks
└── App.jsx              # Main app with routing
```

### Backend Integration Points

The frontend expects a Spring Boot backend running on `https://worksync-integration-handler-625943711296.europe-west1.run.app` with the following endpoint structure:

```
/auth/status              # Authentication status
/auth/{provider}          # OAuth URL generation
/auth/disconnect          # Provider disconnection
/jobs                     # Job listing with pagination
/jobs/recent              # Recent jobs
/jobs/pending             # Pending sync jobs
/sync/job                 # Individual job sync
/sync/multiple            # Bulk job sync
/sync/pending             # Sync all pending
/sync/stats               # Synchronization statistics
/health                   # Health check
```

## 🔧 Implementation Details

### API Service Layer

**File**: `frontend/src/services/api.js`

```javascript
class WorkSyncAPI {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }
  
  // Core request method with error handling and mock fallbacks
  async request(endpoint, options = {}) {
    // Includes mock data when backend unavailable
  }
  
  // Organized methods by feature:
  // - Health checks
  // - Authentication
  // - Jobs management
  // - Synchronization
}
```

**Key Features**:
- Fetch-based HTTP client (no external dependencies)
- Automatic mock data fallback when backend unavailable
- Comprehensive error handling
- Backward compatibility with legacy exports

### Custom Hooks System

**File**: `frontend/src/hooks/useWorkSyncAPI.js`

**Available Hooks**:

```javascript
// Base hook for API requests
useWorkSyncAPI() 
// Returns: { loading, error, executeRequest }

// Authentication management
useAuthStatus(userId)
// Returns: { authStatus, loading, error, refetch }

// Job data management
useJobs(params)
// Returns: { jobs, pagination, total, loading, error, refetch, fetchJobs }

useRecentJobs(userId)
// Returns: { recentJobs, loading, error, refetch }

usePendingSyncJobs(userId)
// Returns: { pendingJobs, loading, error, refetch }

// Synchronization operations
useJobSync()
// Returns: { syncJob, syncMultipleJobs, syncPendingJobs, loading, error }

// OAuth operations
useOAuth()
// Returns: { getJobberAuthUrl, getQuickBooksAuthUrl, disconnectProvider, loading, error }

// Statistics
useSyncStats(userId)
// Returns: { syncStats, loading, error, refetch }

// Health monitoring
useHealth()
// Returns: { healthStatus, checkHealth, getHealthStatus, loading, error }
```

### Component Architecture

#### AuthStatus Component
**File**: `frontend/src/components/AuthStatus.jsx`

- Displays comprehensive OAuth connection status
- Handles connect/disconnect actions
- Real-time status updates
- Error state management
- Mobile-responsive design

#### OAuthHandler Component
**File**: `frontend/src/components/OAuthHandler.jsx`

- Processes OAuth callback parameters
- Displays success/error states with animations
- Auto-redirects after processing
- Handles URL parameter cleanup

### Configuration Management

#### Vite Configuration
**File**: `frontend/vite.config.js`

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://worksync-integration-handler-625943711296.europe-west1.run.app',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          // Proxy logging for debugging
        }
      }
    }
  }
})
```

#### Environment Configuration
**File**: `frontend/.env`

```env
# Server Configuration
PORT=5173
NODE_ENV=development
VITE_API_BASE_URL=https://worksync-integration-handler-625943711296.europe-west1.run.app

# OAuth Configuration
JOBBER_CLIENT_ID=8c5d68a9-ab3b-4dcb-843a-ae60c50174f3
JOBBER_CLIENT_SECRET=cc75c58a7df359de84b950f9b549d41414657c02a8eb0d2548d27ba1c494c811
JOBBER_REDIRECT_URI=http://localhost:5173/settings

QUICKBOOKS_CLIENT_ID=ABqcJ0SviLXE2ngu7URZi8cY9LMuQbtf7QnTk9pOorICEB4nwx
QUICKBOOKS_CLIENT_SECRET=gBcMaZcdbklORBhxxnBfqerPsJMO2o3H47tHNLeX
QUICKBOOKS_REDIRECT_URI=http://localhost:5173/settings
```

## 🛠️ Development Standards

### Error Handling Patterns

1. **API Level**: Try-catch with mock fallbacks
2. **Hook Level**: Error state management with user feedback
3. **Component Level**: Graceful degradation with loading states
4. **Global Level**: Optional chaining for null safety

### State Management

- **Local State**: useState for component-specific data
- **API State**: Custom hooks with caching and error handling
- **Global State**: Props drilling (minimal, consider Context for expansion)

### CSS Architecture

- **Component-scoped CSS**: Each component has its own CSS file
- **Responsive Design**: Mobile-first approach with CSS Grid/Flexbox
- **Design System**: Consistent colors, spacing, and typography
- **Animations**: Subtle transitions for better UX

### Code Quality Standards

1. **Naming Conventions**:
   - Components: PascalCase (e.g., `AuthStatus.jsx`)
   - Hooks: camelCase with "use" prefix (e.g., `useWorkSyncAPI`)
   - Files: Match component names
   - CSS Classes: kebab-case with component prefix

2. **Error Handling**:
   - Always use optional chaining for object properties
   - Provide meaningful error messages
   - Include loading states for async operations
   - Implement fallback UI for error states

3. **Performance**:
   - Use React.memo for expensive renders (when needed)
   - Implement proper cleanup in useEffect
   - Avoid unnecessary re-renders with dependency arrays

## 🔄 Integration Guidelines

### Adding the Spring Boot Backend

1. **Directory Structure**:
   ```
   WorkSync/
   ├── frontend/        # Existing React app
   ├── backend/         # Add Spring Boot here
   └── package.json     # Root package.json for scripts
   ```

2. **Backend Requirements**:
   - Must run on port 8080
   - Implement all endpoints as documented in the API integration guide
   - Return JSON responses matching the frontend expectations
   - Include CORS configuration for localhost:5173

3. **Expected Response Formats**:

   **Auth Status** (`GET /auth/status`):
   ```json
   {
     "success": true,
     "jobber": {
       "connected": false,
       "authenticated": false,
       "lastSync": null,
       "expiresAt": null,
       "expired": false,
       "error": null
     },
     "quickbooks": {
       "connected": false,
       "authenticated": false,
       "lastSync": null,
       "expiresAt": null,
       "expired": false,
       "companyId": null,
       "error": null
     }
   }
   ```

   **Jobs List** (`GET /jobs`):
   ```json
   {
     "success": true,
     "jobs": [...],
     "pagination": {
       "page": 1,
       "perPage": 50,
       "totalPages": 3,
       "hasNext": true,
       "hasPrevious": false
     },
     "total": 125
   }
   ```

### Mock Data System

The frontend includes a comprehensive mock data system in `api.js` that activates when the backend is unavailable:

- Returns realistic data structures
- Maintains UI functionality
- Allows frontend development without backend
- Automatically switches to real backend when available

### OAuth Flow Implementation

1. **Frontend Flow**:
   - User clicks "Connect" in AuthStatus component
   - Frontend calls `/auth/{provider}?userId=...`
   - Backend returns OAuth URL
   - Frontend redirects to OAuth URL
   - Provider redirects to `/settings` with parameters
   - OAuthHandler processes the callback
   - AuthStatus updates automatically

2. **URL Parameters**:
   - Success: `?connected=provider&success=true`
   - Error: `?error=error_type&error_description=...`

## 🚨 Common Issues & Solutions

### 1. White Screen / Component Crashes
**Cause**: Null reference errors when accessing nested properties
**Solution**: Use optional chaining (`?.`) for all nested object access

### 2. API Requests to Wrong Port
**Cause**: Vite proxy not working or backend not running
**Solution**: 
- Restart Vite dev server after proxy changes
- Ensure backend runs on port 8080
- Check proxy logs in browser console

### 3. CORS Issues
**Cause**: Backend not configured for frontend origin
**Solution**: Add CORS configuration for `http://localhost:5173`

### 4. Environment Variables Not Loading
**Cause**: Missing VITE_ prefix or server restart needed
**Solution**: Prefix with `VITE_` and restart dev server

## 📚 API Integration Guide Reference

The complete API integration guide is included in the project and covers:

- Environment configuration
- All API endpoints with examples
- React integration patterns
- Error handling strategies
- OAuth flow implementation
- Component usage examples

## 🔮 Future Enhancements

### Recommended Improvements

1. **State Management**: Consider React Context or Zustand for complex state
2. **Testing**: Add Jest + React Testing Library
3. **Type Safety**: Migrate to TypeScript
4. **Build Optimization**: Code splitting and lazy loading
5. **Accessibility**: ARIA labels and keyboard navigation
6. **Internationalization**: Support multiple languages
7. **PWA Features**: Offline functionality and notifications

### Performance Optimizations

1. **Bundle Analysis**: Use `npm run build && npx vite preview` to analyze
2. **Image Optimization**: Add optimized icons for providers
3. **Caching**: Implement service worker for API caching
4. **Lazy Loading**: Split routes into separate bundles

## 🎯 Development Commands

```bash
# Frontend Development
cd frontend
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build

# Debugging
npm run dev -- --debug    # Enable debug logging
npm run build -- --debug  # Debug build process
```

## 📝 Notes for Future Development

1. **Always test with both mock and real backend data**
2. **Use the custom hooks for all API interactions**
3. **Follow the established error handling patterns**
4. **Maintain responsive design principles**
5. **Update this document when making architectural changes**
6. **Consider the OAuth flow when modifying authentication**
7. **Test proxy configuration after backend changes**

---

**Last Updated**: Implementation completed with full React frontend, custom hooks, comprehensive error handling, and Spring Boot backend integration points ready.

**Status**: Frontend complete, backend integration pending, mock data system active.