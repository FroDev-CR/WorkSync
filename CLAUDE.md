# WorkSync — Shine & Bright Centro de Control

## Que es este proyecto

Dashboard web (Vite + React) para **Shine & Bright House Cleaning Services LLC**, una empresa de limpieza que trabaja para builders (constructoras). Automatiza la actualizacion de invoices en QuickBooks Online a partir del reporte de Visits de Jobber, eliminando el trabajo manual de editar ~30+ invoices/mes uno por uno.

**Repo:** https://github.com/FroDev-CR/WorkSync.git
**Owner:** FroDev (dev.andresgr@gmail.com / GitHub: FroDev-CR)

## Estado actual (v0.1.0)

- Frontend funcional con UI responsive (mobile/tablet/desktop)
- Parser CSV funciona correctamente con datos reales de Jobber
- Webhook a Make funciona via proxy server-side (CORS fix)
- Flujo batch: envia todas las filas en un solo POST, Make usa Iterator para procesar cada una
- Make: flujo completo probado y funcionando (Webhook -> Search Customer -> Search Invoice -> Update Invoice)
- **Pendiente: pruebas de produccion con datos reales actuales**

## Flujo completo

```
[Frontend: Shine & Bright Centro de Control]
    |
    1. Click "Extraer ordenes" -> abre WorkSync Extractor (Streamlit externo)
    |   -> usuario descarga CSV de ordenes de SupplyPro
    |
    2. Usuario sube CSV a Jobber manualmente -> ejecuta trabajos -> descarga Visits Report
    |
    3. Sube CSV de Jobber al frontend -> parseo automatico -> tabla de revision
    |   -> click "Actualizar invoices" -> envia batch JSON al webhook de Make
    |
    4. Resumen: X enviados, Y manuales, Z EPO, W errores

[Make (Integromat): Webhook -> Iterator -> Search Customer -> Search Invoice -> Update Invoice]
    |
    -> Cada item del array actualiza un invoice en QuickBooks Online
```

## Arquitectura

```
Frontend (React SPA)
    |-- shine-bright-dashboard.jsx  (componente principal, toda la logica)
    |-- src/main.jsx                (entry point React)
    |-- index.html                  (HTML shell)
    |
    POST /api/webhook  (misma origen, sin CORS)
    |
    |-- [DEV]  vite.config.js proxy -> https://hook.us2.make.com/...
    |-- [PROD] api/webhook.js (Vercel serverless) -> https://hook.us2.make.com/...
    |
Make.com Scenario:
    Webhook -> Iterator (items[]) -> Filter "No EPO" -> Search Customer (QBO)
    -> Filter "Customer Found" -> Search Invoice (QBO) -> Update Invoice (QBO)
```

## Problema de CORS y solucion

Make webhooks NO devuelven headers CORS. El browser bloquea fetch() directo.
**Solucion:** Proxy server-side. El frontend llama a `/api/webhook` (misma origen),
y el servidor reenvia a Make donde CORS no aplica.

- **Dev:** Vite proxy en vite.config.js
- **Prod:** Vercel serverless function en api/webhook.js

## Limitacion del plan gratuito de Make

El plan free de Make NO permite activar escenarios 24/7 con webhooks. Solo funciona con "Run once".
**Solucion:** El frontend envia TODAS las filas en un solo POST como `{ items: [...] }`.
En Make, un modulo **Iterator** entre el Webhook y el resto del flujo descompone el array
y procesa cada item. Asi un solo "Run once" procesa todo el batch.

**Flujo operativo:**
1. En Make: click "Run once" (queda escuchando)
2. En la app: subir CSV y click "Actualizar invoices"
3. Make recibe el batch, Iterator lo descompone, procesa cada invoice

## Formato del CSV de Jobber (Visits Report)

Headers: `Date, Visit title, Client name, Service street, Service city, Service province, Service ZIP, Visit completed date, Assigned to, One-off job ($), ORDER NUMBER, NOTES, NOTAS INTERNAS`

**IMPORTANTE:** Las fechas vienen con comas dentro de comillas: `"Apr 02, 2026"`.
El parser CSV maneja esto correctamente con un parser single-pass que respeta comillas.

## Logica de parseo de Visit Titles

### 4 formatos de Visit title:

**Formato 1 — 4 segmentos (DRB, LGI 4-seg, Lennar):**
```
DRB Group - FIRST WASH / LOT 00.0101 / 5546 Miller Farm TH / 5546_004727
LGI Homes - FIRST WASH / LOT 00100013 / Robindale / RBN00_000730
Lennar Homes - QA CLEAN / LOT 0160 2554 / Bakers Creek 30 Dream / 31076673-000
```
Estructura: `{Builder} - {Service} / LOT {raw_number} / {Subdivision_raw} / {Order_number}`

**Formato 2 — 2 segmentos (NVR, Mungo, LGI recleans):**
```
NVR INC - RYAN HOMES - NHO CLEAN / LOT 2006A LANEY FARMS
MUNGO HOMES - RECLEAN / LOT 45 WILLOWBROOK
```
Estructura: `{Builder} - {Service} / LOT {number} {Subdivision}`

**Formato 3 — Sin espacio antes del / (LGI variante):**
```
LGI Homes - EXTRA RECLEAN/  LOT 101 APPLEWOOD
```

**Formato 4 — Sin separador / (Beechwood):**
```
BEECHWOOD CAROLINAS - EXTRA RECLEAN MODEL HOME LOT 8 LAKESIDE POINT
BEECHWOOD CAROLINAS - EXTRA RECLEAN SALES CENTER LAKESIDE POINT  (-> MANUAL)
```

### Reglas de limpieza de LOT number por builder:

| Builder | LOT raw | LOT limpio | Regla |
|---------|---------|------------|-------|
| DRB | 00.0101 | 101 | Quitar punto, quitar "00" prefix, strip leading zeros |
| LGI (4-seg) | 00100013 | 13 | Si 8 chars y empieza con "001", quitar "001" + strip zeros |
| Lennar | 0160 2554 | 160 | Tomar solo primer numero, strip leading zeros |
| NVR (2-seg) | 2006A | 2006A | Ya limpio |
| Mungo (2-seg) | 45 | 45 | Ya limpio |

### QBO Customer format:
Siempre: `{SUBDIVISION} LOT {numero_limpio}`
Ejemplos: MILLER FARM LOT 101, LANEY FARMS LOT 2006A, ROBINDALE LOT 13

### Extraccion del Service Type:
Del primer segmento del Visit title, tomar todo despues del ultimo " - ".
Normalizar: RE-CLEAN -> RECLEAN, RE CLEAN -> RECLEAN.
Matchear contra KNOWN_SERVICES (orden importa, mas especificos primero).

## IDs de servicios en QuickBooks Online

```javascript
const SERVICE_IDS = {
  "FIRST WASH": "1010000182",
  "EXTRA RECLEAN": "1010000201",
  "FINAL CLEAN": "1010000063",
  "QA CLEAN": "1010000064",
  "NHO CLEAN": "1010000062",
  "RECLEAN": "1010000251",
  "REWASH": "1010000092",
  "ROUGH RECLEAN": "1010000003",
  "TOUCH UP": "1010000031",
  "PSD RECLEAN": "1010000101",
  "SITE CLEAN": "1010000141",
};
```

Servicios que NO tienen ID mapeado (van como MANUAL o sin item):
CELEBRATION WALK CLEAN, ROUGH CLEAN, PSD CLEAN, BRICK CLEAN,
EXTRA LABOR, CARPET STAINS, BARRER, TLC RECLEAN, PSD RECLEAN (tiene ID pero verificar)

## Datos que se envian al webhook de Make

```json
{
  "items": [
    {
      "qboCustomer": "MILLER FARM LOT 101",
      "serviceType": "FIRST WASH",
      "serviceId": "1010000182",
      "orderNumber": "5546_004727",
      "amount": "200",
      "assignedTo": "Carlos Guillen",
      "date": "Apr 02, 2026",
      "visitTitle": "DRB Group - FIRST WASH / LOT 00.0101 / 5546 Miller Farm TH / 5546_004727",
      "qboQuery": "select * from customer where DisplayName like '%MILLER FARM LOT 101%'"
    }
  ]
}
```

## Configuracion de Make (escenario "Integration Google Sheets")

**Modulo 1: Webhooks -> Custom webhook**
- URL: https://hook.us2.make.com/1gmk49s06qr9lfcd1rq29oj3rmju501p
- Recibe JSON con campo `items` (array)

**Modulo 12: Flow Control -> Iterator**
- Array: `{{1.items}}`
- Descompone el array en items individuales

**Filtro "No EPO":**
- Condicion 1: `{{12.orderNumber}}` Does not contain "EPO"
- AND Condicion 2: `{{12.qboCustomer}}` Not equal to "MANUAL"

**Modulo 4: QuickBooks -> Search for Customers**
- Search by: query (Map activado)
- Query: `{{12.qboQuery}}`

**Filtro "Customer found":**
- Condicion: Customer ID > 0

**Modulo 7: QuickBooks -> Search for Invoices**
- Query: `select * from invoice where CustomerRef = '{{4.Customer ID}}' and Balance > '0' MAXRESULTS 1`

**Modulo 8: QuickBooks -> Update an Invoice**
- Invoice ID: del modulo 7
- Amount: `{{12.amount}}`
- Unit price: `{{12.amount}}`
- Description: `{{12.serviceType}}`
- Item (Map): `{{12.serviceId}}`
- Quantity: 1
- Sales term: 2 (= Net 15)
- Private note: `{{12.assignedTo}}`
- Customer memo: `{{12.assignedTo}}`
- Custom field 1: `{{12.orderNumber}}`
- Transaction date: VACIO (no cambiar)

## Builders y sus customers en QBO

| Builder | Company Name en QBO | Formato |
|---------|-------------------|---------|
| DRB Group | DRB Group | 4 segmentos |
| LGI Homes | LGI Homes, Inc. / LGI HOMES LLC | 4 seg o 2 seg |
| NVR / Ryan Homes | NVR INC - RYAN HOMES | 2 segmentos |
| Lennar Homes | Lennar Homes / Lennar Homes LLC | 4 segmentos |
| Mungo Homes | MUNGO HOMES | 2 segmentos |
| Beechwood Carolinas | BEECHWOOD CAROLINAS | Sin / (irregular) |

## Conexion QBO

- Empresa: SHINE & BRIGHT HOUSE CLEANING SERVICES LLC
- Company ID: 9130357688170776
- Conectado en Make con modulo nativo de QuickBooks Online

## URLs y credenciales

- **Make webhook:** https://hook.us2.make.com/1gmk49s06qr9lfcd1rq29oj3rmju501p
- **SupplyPro Extractor:** https://worksyncextractor.streamlit.app/
- **WorkSyncExtractor GitHub:** https://github.com/FroDev-CR/WorkSyncExtractor
- **Google Sheet "Jobber Reports":** ID 16bFNxp5iXlZV5kJhMGfHAjd7FYXiZ2NRRp-XYALzn1A
- **QBO Company ID:** 9130357688170776
- **Jobber App Client ID:** 8c5d68a9-ab3b-4dcb-843a-ae60c50174f3

## Flujo alternativo con Google Sheets

Existe un flujo alternativo usando Google Sheets como trigger (funciona pero es manual):
- Sheet: "Jobber Reports" (ID: 16bFNxp5iXlZV5kJhMGfHAjd7FYXiZ2NRRp-XYALzn1A)
- Columnas N-U tienen formulas que computan QBO_CUSTOMER, SERVICE_TYPE, ORDER_NUMBER, QBO_QUERY
- Fue probado exitosamente y actualizo invoices reales en QBO

## Stack tecnico

- **Frontend:** React 18 + Vite 6 (sin Tailwind, CSS custom con variables y animaciones)
- **Proxy dev:** Vite dev server proxy
- **Proxy prod:** Vercel serverless function (api/webhook.js)
- **Deploy:** Vercel (vercel.json configurado)
- **Integracion:** Make.com (Integromat) - free plan
- **Fuentes:** Inter + JetBrains Mono (Google Fonts)
- **Responsive:** Mobile-first con breakpoints en 768px y 480px

## Filas que van como MANUAL

- Beechwood con formato irregular (sin LOT claro, como "SALES CENTER")
- Lennar Site Clean sin LOT
- LGI con formato no estandar
- Son ~2-4 por reporte, las procesa la colaboradora a mano

## Notas tecnicas importantes

1. **CSV Parser:** Single-pass, maneja comillas, comas internas y saltos de linea dentro de campos
2. **Make free plan:** 1000 ops/mes. Cada invoice = ~4 ops. Con batch de 50 = ~200 ops
3. **Multiple invoices per customer:** La query usa `MAXRESULTS 1` para el primero con balance > 0
4. **Feedback del frontend:** El webhook responde "Accepted" inmediatamente. El status "Enviado" confirma que Make recibio los datos, NO que QBO se actualizo. Hay que verificar en Make.
5. **Run once en Make:** Obligatorio antes de enviar desde la app. El escenario no se puede dejar activo 24/7 en free plan.

## Proximos pasos

### Prioridad alta:
- Pruebas de produccion con datos reales actuales
- Verificar que todos los builders parsean correctamente con datos frescos
- Validar que los invoices se actualizan correctamente en QBO

### Prioridad media:
- Deploy a Vercel para que la colaboradora pueda usar la app sin npm run dev
- Manejo de errores mas granular (que pasa si customer no existe, invoice ya pagado, etc)
- Considerar upgrade de Make a plan pago para scheduling automatico

### Prioridad baja / futuro:
- Crear customers automaticamente cuando no existen en QBO
- Integrar API de Jobber (GraphQL) para subir CSV y descargar reports automaticamente
- ARRAYFORMULA en Google Sheets para no arrastrar formulas
- Mapeo de Income Accounts por tipo de servicio
