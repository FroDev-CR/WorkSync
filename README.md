# WorkSync 🔄

Herramienta completa para sincronizar Jobs de Jobber a QuickBooks de forma automática mediante OAuth2.

## ✨ Características

- 🔐 **Autenticación OAuth2** segura con Jobber y QuickBooks
- 📋 **Sincronización inteligente** de Jobs completados/facturados
- 🎯 **Selección múltiple** de Jobs para sincronización en lote
- 📊 **Dashboard completo** con estadísticas y estado de conexiones
- 📈 **Historial detallado** de todas las sincronizaciones
- 🔄 **Refrescado automático** de tokens expirados
- 💾 **Almacenamiento flexible** (Firebase o memoria)
- 🖥️ **Interfaz responsive** y fácil de usar
- ⚡ **Manejo robusto de errores** y logs detallados

## 🚀 Inicio Rápido

### 1. Instalación

```bash
# Clonar el repositorio
git clone <tu-repositorio>
cd WorkSync

# Instalar todas las dependencias
npm run install:all
```

### 2. Configuración

```bash
# Copiar archivo de configuración
cp backend/env.example .env

# Editar .env con tus credenciales (ver SETUP.md para detalles)
```

### 3. Ejecutar

```bash
# Iniciar el backend
npm run dev

# En otra terminal, iniciar el frontend
cd frontend
npm run dev
```

### 4. Verificar

```bash
# Ejecutar script de verificación
npm run verify
```

## 📋 Requisitos

- **Node.js** 16+ 
- **npm** o **yarn**
- **Cuenta Jobber** con acceso a API
- **Cuenta QuickBooks Online**
- **Firebase** (opcional, para persistencia)

## 🔧 Configuración Detallada

Consulta **[SETUP.md](./SETUP.md)** para:
- Configuración paso a paso de APIs
- Variables de entorno completas
- Solución de problemas comunes
- Configuración de Firebase
- Despliegue en producción

## 📁 Estructura del Proyecto

```
WorkSync/
├── api/                    # Backend API
│   ├── services/          # Servicios de integración
│   │   ├── authService.js    # OAuth2 y tokens
│   │   ├── jobberService.js  # API de Jobber
│   │   ├── quickbooksService.js # API de QuickBooks
│   │   └── syncService.js    # Lógica de sincronización
│   ├── config/
│   │   └── firebase.js       # Configuración Firebase
│   └── index.js              # Servidor principal
├── frontend/               # Frontend React
│   ├── src/
│   │   ├── components/       # Componentes reutilizables
│   │   ├── pages/           # Páginas principales
│   │   │   ├── Dashboard.jsx # Panel principal
│   │   │   ├── Jobs.jsx     # Gestión de Jobs
│   │   │   ├── History.jsx  # Historial
│   │   │   └── Settings.jsx # Configuración
│   │   └── services/
│   │       └── api.js       # Cliente API
├── SETUP.md               # Guía de configuración
├── verify-setup.js       # Script de verificación
└── README.md             # Este archivo
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

## 🌐 Endpoints de API

- `GET /health` - Estado del servidor
- `GET /auth/status` - Estado de conexiones OAuth
- `GET /auth/jobber` - Iniciar OAuth con Jobber
- `GET /auth/quickbooks` - Iniciar OAuth con QuickBooks
- `GET /auth/callback` - Callback OAuth universal
- `GET /jobs` - Obtener Jobs de Jobber
- `POST /sync/job` - Sincronizar Job individual
- `POST /sync/multiple` - Sincronizar múltiples Jobs
- `GET /sync/stats` - Estadísticas de sincronización

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