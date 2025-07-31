# Guía de Configuración de WorkSync

Esta guía te ayudará a configurar WorkSync para sincronizar Jobs de Jobber a QuickBooks.

## 📋 Requisitos Previos

1. **Cuenta de Jobber** con acceso a la API
2. **Cuenta de QuickBooks Online** 
3. **Proyecto Firebase** (opcional, se puede usar sin Firebase)
4. **Node.js** versión 16 o superior
5. **npm** o **yarn**

## 🔧 Configuración de APIs

### 1. Configurar Jobber API

1. Ve a [Jobber Developer Portal](https://developer.getjobber.com/)
2. Crea una nueva aplicación OAuth2
3. Configura la URL de redirección:
   - Desarrollo: `http://localhost:3001/auth/callback`
   - Producción: `https://tu-dominio.vercel.app/auth/callback`
4. Anota tu `Client ID` y `Client Secret`

### 2. Configurar QuickBooks API

1. Ve a [Intuit Developer Dashboard](https://developer.intuit.com/)
2. Crea una nueva aplicación QuickBooks Online
3. Configura la URL de redirección:
   - Desarrollo: `http://localhost:3001/auth/callback`
   - Producción: `https://tu-dominio.vercel.app/auth/callback`
4. Anota tu `Client ID` y `Client Secret`

### 3. Configurar Firebase (Opcional)

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita Firestore Database
4. Ve a Configuración del proyecto > Cuentas de servicio
5. Genera una nueva clave privada (archivo JSON)
6. Anota los datos de configuración

## 🛠️ Instalación

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd WorkSync
```

### 2. Instalar dependencias

```bash
# Instalar dependencias del proyecto principal
npm install

# Instalar dependencias del frontend
cd frontend
npm install
cd ..

# Instalar dependencias del backend (si existe carpeta backend separada)
cd backend
npm install
cd ..
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y configura las variables:

```bash
cp backend/env.example .env
```

Edita el archivo `.env` con tus credenciales:

```env
# Configuración del Servidor
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Jobber API
JOBBER_CLIENT_ID=tu_jobber_client_id
JOBBER_CLIENT_SECRET=tu_jobber_client_secret
JOBBER_REDIRECT_URI=http://localhost:3001/auth/callback

# QuickBooks API
QUICKBOOKS_CLIENT_ID=tu_quickbooks_client_id
QUICKBOOKS_CLIENT_SECRET=tu_quickbooks_client_secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3001/auth/callback

# Firebase Configuration (Opcional)
FIREBASE_PROJECT_ID=tu_firebase_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTu_private_key_aqui\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=tu_firebase_client_email@project.iam.gserviceaccount.com

# URLs de las APIs
JOBBER_API_URL=https://api.getjobber.com/api
QUICKBOOKS_API_BASE=https://sandbox-quickbooks.api.intuit.com
QUICKBOOKS_DISCOVERY_BASE=https://appcenter.intuit.com
QUICKBOOKS_TOKEN_URL=https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
```

### 4. Configurar Firebase (si lo usas)

Si decides usar Firebase para almacenamiento persistente:

1. Coloca tu archivo de credenciales de Firebase como `api/firebase-service-account.json`
2. O configura todas las variables de entorno de Firebase en el archivo `.env`

## 🚀 Ejecutar la aplicación

### Desarrollo Local

```bash
# Ejecutar el backend
npm run dev

# En otra terminal, ejecutar el frontend
cd frontend
npm run dev
```

La aplicación estará disponible en:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Producción (Vercel)

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno en Vercel:
   - Ve a tu proyecto en Vercel Dashboard
   - Settings > Environment Variables
   - Agrega todas las variables del archivo `.env`
3. Actualiza las URLs de redirección en Jobber y QuickBooks para usar tu dominio de Vercel

## ✅ Verificar la configuración

### 1. Verificar endpoints

Visita estos endpoints para verificar que todo funciona:

- http://localhost:3001/health (debería devolver status: healthy)
- http://localhost:3001/auth/jobber/config (verificar configuración de Jobber)
- http://localhost:3001/auth/quickbooks/config (verificar configuración de QuickBooks)

### 2. Probar autenticación

1. Ve a http://localhost:5173
2. Ve a Configuración
3. Haz clic en "Conectar Jobber" y completa la autorización
4. Haz clic en "Conectar QuickBooks" y completa la autorización

### 3. Probar sincronización

1. Ve a la sección "Jobs"
2. Deberías ver tus Jobs de Jobber
3. Selecciona algunos Jobs y haz clic en "Sincronizar"
4. Verifica en QuickBooks que se crearon las facturas

## 🔍 Solución de problemas

### Error de conexión a APIs

- Verifica que las credenciales están correctas
- Asegúrate de que las URLs de redirección coinciden exactamente
- Revisa los logs del servidor para errores específicos

### Problemas de Firebase

- Si no tienes Firebase configurado, la aplicación seguirá funcionando usando almacenamiento en memoria
- Los tokens se perderán al reiniciar el servidor sin Firebase

### Errores de sincronización

- Verifica que tienes Jobs completados o facturados en Jobber
- Asegúrate de que QuickBooks está en modo sandbox para pruebas
- Revisa el historial de sincronización para ver errores específicos

## 📚 Estructura del proyecto

```
WorkSync/
├── api/                    # Backend API
│   ├── services/          # Servicios de integración
│   ├── config/           # Configuración (Firebase, etc.)
│   └── index.js          # Servidor principal
├── frontend/             # Frontend React
│   ├── src/
│   │   ├── components/   # Componentes reutilizables
│   │   ├── pages/       # Páginas principales
│   │   └── services/    # Servicios de API
├── .env                 # Variables de entorno
└── package.json        # Configuración del proyecto
```

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs del servidor
2. Verifica que todas las variables de entorno están configuradas
3. Asegúrate de que las URLs de redirección son exactas
4. Prueba los endpoints de verificación mencionados arriba

## 🔒 Seguridad

- Nunca compartas tus credenciales de API
- Usa HTTPS en producción
- Las credenciales se almacenan de forma segura en Firebase o variables de entorno
- Los tokens se refrescan automáticamente cuando expiran