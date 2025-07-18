# WorkSync

Herramienta para sincronizar Jobs de Jobber a QuickBooks de forma manual y automatizada.

## 🚀 Características

- Sincronización manual de Jobs de Jobber a QuickBooks
- Interfaz web simple y responsive
- Historial de sincronizaciones
- Manejo automático de tokens OAuth
- Logs de errores y actividad

## 📁 Estructura del Proyecto

```
WorkSync/
├── frontend/          # React + Vite (Interfaz web)
├── backend/           # Node.js + Express (API y lógica)
├── package.json       # Configuración del monorepo
└── README.md         # Este archivo
```

## 🛠️ Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone <tu-repositorio>
   cd WorkSync
   ```

2. **Instalar dependencias:**
   ```bash
   npm run install:all
   ```

3. **Configurar variables de entorno:**
   - Copiar `.env.example` a `.env` en la carpeta `backend/`
   - Configurar las credenciales de Jobber y QuickBooks

4. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

## 🔧 Configuración

### Variables de Entorno (backend/.env)

```env
# Jobber API
JOBBER_CLIENT_ID=tu_client_id
JOBBER_CLIENT_SECRET=tu_client_secret
JOBBER_REDIRECT_URI=http://localhost:3001/auth/jobber/callback

# QuickBooks API
QUICKBOOKS_CLIENT_ID=tu_client_id
QUICKBOOKS_CLIENT_SECRET=tu_client_secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3001/auth/quickbooks/callback

# Firebase
FIREBASE_PROJECT_ID=tu_project_id
FIREBASE_PRIVATE_KEY=tu_private_key
FIREBASE_CLIENT_EMAIL=tu_client_email

# Servidor
PORT=3001
NODE_ENV=development
```

## 📱 Uso

1. **Autenticación:** Conectar con Jobber y QuickBooks
2. **Sincronización:** Seleccionar Jobs de Jobber y exportar a QuickBooks
3. **Historial:** Revisar el historial de sincronizaciones
4. **Logs:** Ver logs de errores y actividad

## 🚀 Despliegue

El proyecto está configurado para desplegarse en Vercel:

1. Conectar el repositorio de GitHub a Vercel
2. Configurar las variables de entorno en Vercel
3. Desplegar automáticamente

## 📚 Tecnologías

- **Frontend:** React, Vite, CSS
- **Backend:** Node.js, Express
- **Base de Datos:** Firebase
- **Despliegue:** Vercel
- **APIs:** Jobber GraphQL, QuickBooks GraphQL

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abrir un Pull Request

## 📄 Licencia

MIT License 