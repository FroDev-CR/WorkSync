# WorkSync 🔄

Complete solution for synchronizing Jobber jobs to QuickBooks automatically using OAuth2. This project consists of a React frontend with Vite and integrates with a Spring Boot backend.

## ✨ Features

- 🔐 **Secure OAuth2 Authentication** with Jobber and QuickBooks
- 📋 **Intelligent Job Synchronization** for completed/invoiced jobs
- 🎯 **Bulk Job Selection** for batch synchronization
- 📊 **Comprehensive Dashboard** with statistics and connection status
- 📈 **Detailed History** of all synchronizations
- 🔄 **Automatic Token Refresh** for expired credentials
- 🖥️ **Responsive Interface** built with React + Vite
- ⚡ **Robust Error Handling** with mock data fallbacks
- 🎨 **Modern UI Components** with custom hooks and context

## 🚀 Quick Start

### 1. Frontend Setup

```bash
# Clone the repository
git clone <your-repository>
cd WorkSync

# Install frontend dependencies
cd frontend
npm install

# Start the development server
npm run dev
```

### 2. Backend Setup (Required for full functionality)

```bash
# Add your Spring Boot backend to the project
# The frontend expects the backend to run on https://worksync-integration-handler-625943711296.europe-west1.run.app
# See CLAUDE.md for integration details
```

### 3. Configuration

```bash
# Copy and edit the environment file
cp frontend/.env.example frontend/.env

# Configure your OAuth credentials:
# - JOBBER_CLIENT_ID
# - JOBBER_CLIENT_SECRET
# - QUICKBOOKS_CLIENT_ID
# - QUICKBOOKS_CLIENT_SECRET
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend**: https://worksync-integration-handler-625943711296.europe-west1.run.app
- **Mock Mode**: Works without backend for UI testing

## 📋 Requirements

- **Node.js** 18+
- **npm** or **yarn**
- **Java 17+** (for Spring Boot backend)
- **Jobber Account** with API access
- **QuickBooks Online Account**
- **Spring Boot Backend** (see integration guide)

## 🔧 Configuración Detallada

Consulta **[SETUP.md](./SETUP.md)** para:
- Configuración paso a paso de APIs
- Variables de entorno completas
- Solución de problemas comunes
- Configuración de Firebase
- Despliegue en producción

## 📁 Project Structure

```
WorkSync/
├── frontend/                    # React + Vite Frontend
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   │   ├── AuthStatus.jsx   # Authentication status display
│   │   │   ├── OAuthHandler.jsx # OAuth callback handler
│   │   │   └── Header.jsx       # Navigation header
│   │   ├── hooks/               # Custom React hooks
│   │   │   └── useWorkSyncAPI.js # API integration hooks
│   │   ├── pages/               # Main application pages
│   │   │   ├── Dashboard.jsx    # Main dashboard
│   │   │   ├── Jobs.jsx         # Job management
│   │   │   ├── History.jsx      # Sync history
│   │   │   └── Settings.jsx     # OAuth settings
│   │   ├── services/            # API services
│   │   │   └── api.js           # WorkSync API client
│   │   ├── App.jsx              # Main application component
│   │   └── main.jsx             # Application entry point
│   ├── package.json             # Frontend dependencies
│   ├── vite.config.js           # Vite configuration
│   └── .env                     # Environment variables
├── backend/                     # Spring Boot Backend (to be added)
│   └── [Spring Boot structure]
├── CLAUDE.md                    # Development documentation
├── SETUP.md                     # Configuration guide
└── README.md                    # This file
```

## 🔐 Seguridad

- Tokens OAuth2 almacenados de forma segura
- Refrescado automático de tokens expirados
- Variables de entorno para credenciales sensibles
- HTTPS requerido en producción
- Logs detallados para auditoría

## 🎯 Flujo de Uso

1. **🔗 Conectar** - Autoriza Jobber y QuickBooks en Configuración
2. **📋 Seleccionar** - Ve a Jobs y selecciona los trabajos a sincronizar
3. **🔄 Sincronizar** - Haz clic en "Sincronizar" para exportar a QuickBooks
4. **📊 Revisar** - Verifica el historial y estadísticas en Dashboard

## 🛠️ Scripts Disponibles

```bash
npm run dev          # Iniciar servidor de desarrollo
npm run start        # Iniciar servidor de producción
npm run verify       # Verificar configuración completa
npm run install:all  # Instalar todas las dependencias
npm run build        # Construir frontend para producción
```

## 🌐 API Endpoints

### Health & Status
- `GET /` - Basic health check
- `GET /health` - Detailed health status

### Authentication
- `GET /auth/status?userId=<id>` - OAuth connection status
- `GET /auth/jobber?userId=<id>` - Get Jobber OAuth URL
- `GET /auth/quickbooks?userId=<id>` - Get QuickBooks OAuth URL
- `POST /auth/disconnect` - Disconnect provider

### Jobs
- `GET /jobs?userId=<id>&page=1&perPage=50` - Get jobs with pagination
- `GET /jobs/recent?userId=<id>` - Get recent jobs
- `GET /jobs/pending?userId=<id>` - Get pending sync jobs

### Synchronization
- `POST /sync/job` - Sync individual job
- `POST /sync/multiple` - Sync multiple jobs
- `POST /sync/pending` - Sync all pending jobs
- `GET /sync/stats?userId=<id>` - Sync statistics

## 🔍 Solución de Problemas

### Errores Comunes

**❌ Error de conexión a APIs**
```bash
npm run verify  # Verificar configuración
```

**❌ Token expirado**
- Los tokens se refrescan automáticamente
- Reconecta en Configuración si es necesario

**❌ Jobs no aparecen**
- Verifica que tengas Jobs completados/facturados en Jobber
- Revisa los logs del servidor para errores específicos

### Logs y Debugging

- Revisa la consola del navegador para errores del frontend
- Revisa la terminal del servidor para errores de backend
- Usa `npm run verify` para diagnóstico completo

## 🚀 Despliegue en Producción

### Vercel (Recomendado)

1. Conecta tu repo a Vercel
2. Configura variables de entorno en Vercel Dashboard
3. Actualiza URLs de redirección OAuth con tu dominio
4. Deploy automático en cada push

### Variables de Entorno en Producción

```env
NODE_ENV=production
FRONTEND_URL=https://tu-dominio.vercel.app
JOBBER_REDIRECT_URI=https://tu-dominio.vercel.app/auth/callback
QUICKBOOKS_REDIRECT_URI=https://tu-dominio.vercel.app/auth/callback
# ... otras variables
```

## 📚 Tecnologías

### Backend
- **Node.js** + **Express** - Servidor API
- **axios** - Cliente HTTP para APIs externas
- **firebase-admin** - Base de datos y almacenamiento
- **cors** - Manejo de CORS
- **dotenv** - Variables de entorno

### Frontend
- **React** + **Vite** - Framework y build tool
- **React Router** - Navegación
- **CSS3** - Estilos personalizados
- **axios** - Cliente HTTP

### APIs Integradas
- **Jobber REST API** - Gestión de Jobs y clientes
- **QuickBooks API** - Creación de facturas y clientes
- **OAuth2** - Autenticación segura

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.

## 📞 Soporte

- 📖 Consulta [SETUP.md](./SETUP.md) para configuración detallada
- 🔍 Ejecuta `npm run verify` para diagnóstico
- 🐛 Reporta bugs en GitHub Issues
- 💡 Solicita features en GitHub Discussions

---

**¿Necesitas ayuda?** Revisa la documentación o ejecuta `npm run verify` para diagnosticar problemas de configuración. 