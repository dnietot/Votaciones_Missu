# Sistema de jurados

Aplicacion web para calificar 20 candidatas con 5 jurados, administracion, administrador del sistema y tablero en vivo. Puede funcionar localmente con archivo JSON o publicada en Render con Supabase.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fdnietot%2FVotaciones_Missu)

> Las referencias de lineas de este README corresponden al estado del codigo al 2026-10-06. Si se agregan lineas despues, vuelvan a generar el indice antes de usarlo como referencia de auditoria.

## Resumen funcional

- Los jurados califican candidatas por criterios: Entrevista, Gala, Traje de bano, Speech Top 10 y Pregunta final Top 5.
- Cada criterio se puede guardar por separado o varios a la vez. Un criterio enviado queda bloqueado y no se puede modificar despues.
- La organizacion registra el puntaje de comportamiento, selecciona Top 10 y Top 5, y ve resultados ordenados de mayor a menor.
- El administrador del sistema cambia nombres, actualiza contrasenas, valida calificaciones por candidata y elimina registros individuales cuando un jurado se equivoca.
- El tablero en vivo es de solo lectura y muestra ranking, categorias y detalle por candidata con actualizacion automatica.
- El sistema esta limitado a 5 jurados: `jurado1` a `jurado5`. `jurado6` queda retirado y se limpia si existe en datos anteriores.
- La interfaz permite cambiar entre espanol e ingles desde el boton `ES/EN`; la preferencia queda guardada en el navegador.
- Los campos de calificacion aceptan numeros decimales con punto o coma, pero bloquean letras y notacion cientifica como `1e2`.

## Accesos de prueba

- Organizacion: `admin` / `admin2026`
- Administrador del sistema: `sistema` / `sistema2026`
- Tablero en vivo: `tablero` / `tablero2026`
- Jurados: `jurado1` / `jurado1`, `jurado2` / `jurado2`, hasta `jurado5` / `jurado5`

En produccion las contrasenas se pueden cambiar desde el menu del administrador del sistema.

## Arquitectura

La aplicacion es deliberadamente simple: un servidor Node.js nativo, sin Express, y un frontend estatico con HTML, CSS y JavaScript.

| Capa | Archivo | Lineas clave | Responsabilidad |
| --- | --- | --- | --- |
| Servidor HTTP y API | `server.js` | `server.js:1`, `server.js:1216`, `server.js:1544` | Sirve archivos estaticos, protege rutas `/api/*`, administra sesiones, calcula resultados y persiste datos. |
| Frontend | `public/app.js` | `public/app.js:1`, `public/app.js:197`, `public/app.js:283` | Renderiza pantallas, consume la API, maneja eventos y actualiza el tablero. |
| HTML base | `public/index.html` | `public/index.html:6`, `public/index.html:13`, `public/index.html:41` | Define titulo, favicon, plantilla de login y carga de assets. |
| Estilos | `public/styles.css` | `public/styles.css:1`, `public/styles.css:397`, `public/styles.css:993` | Define tema visual, formularios, tablas, tablero y animaciones de carga. |
| Esquema Supabase | `supabase/schema.sql` | `supabase/schema.sql:1`, `supabase/schema.sql:51`, `supabase/schema.sql:76` | Crea tablas, indices, RLS y politicas para `service_role`. |
| Render | `render.yaml` | `render.yaml:1`, `render.yaml:6`, `render.yaml:8` | Configura despliegue como Web Service de Node en Render. |
| Variables ejemplo | `.env.example` | `.env.example:1` | Lista variables esperadas sin exponer llaves reales. |
| NPM | `package.json` | `package.json:7`, `package.json:10` | Define `npm start` y Node >= 20. |

## Librerias y runtime

- Node.js >= 20, definido en `package.json:10` y usado por Render con `NODE_VERSION` en `render.yaml:9`.
- Modulos nativos de Node: `http`, `fs`, `path` y `crypto`, importados en `server.js:1` a `server.js:4`.
- API `fetch` nativa de Node 20 para Supabase y ArcGIS.
- JavaScript del navegador sin framework. La funcion `api()` en `public/app.js:59` centraliza llamadas `fetch`.
- No hay dependencias externas en `package.json`; por eso el despliegue ejecuta `npm install`, pero no instala librerias adicionales.

## Flujo de datos

1. El navegador carga `public/index.html`.
2. `public/index.html:41` carga `public/app.js`.
3. `loadApp()` en `public/app.js:197` solicita `/api/bootstrap`.
4. `handleApi()` en `server.js:1216` valida sesion, arma el payload y devuelve usuarios seguros, candidatas, evaluaciones y resultados.
5. `renderApp()` en `public/app.js:283` decide que vista mostrar segun rol: jurado, administracion, sistema o tablero.
6. Cuando un jurado guarda, `submitScores()` en `public/app.js:880` llama `POST /api/evaluations`.
7. El servidor valida y bloquea criterios con `mergeLockedScores()` en `server.js:842`.
8. `computeResults()` en `server.js:918` recalcula ranking y totales.
9. `saveDb()` en `server.js:616` guarda en Supabase o en `data/database.json`, segun variables de entorno.

## Roles y permisos

| Rol | Usuario base | Pantalla | Permisos principales | Codigo |
| --- | --- | --- | --- | --- |
| Jurado | `jurado1` a `jurado5` | Calificacion | Guardar criterios propios y ver su acumulado. | `renderJuror()` en `public/app.js:645`; `POST /api/evaluations` en `server.js:1340`. |
| Organizacion | `admin` | Resultados y organizacion | Ver ranking, registrar comportamiento, activar Top 10 y Top 5. | `renderAdmin()` en `public/app.js:1377`; ruta admin en `server.js:1504`. |
| Administrador del sistema | `sistema` | Configuracion, Validacion, Correcciones | Cambiar nombres, contrasenas, borrar resultados de prueba y eliminar registros individuales. | `renderSystemAdmin()` en `public/app.js:909`; rutas sistema en `server.js:1389`, `server.js:1422`, `server.js:1443`, `server.js:1468`, `server.js:1491`. |
| Tablero | `tablero` | Tablero en vivo | Solo lectura, ranking y detalle en tiempo real. | `renderViewerDashboard()` en `public/app.js:340`; bloqueo de escritura por rol en `server.js:1340` y `server.js:1504`. |

## Pesos y reglas de calificacion

| Criterio | Peso | Etapa | Donde se define |
| --- | ---: | --- | --- |
| Entrevista | 30% | Preliminar | `WEIGHTS` en `server.js:33`; `JUROR_SCORE_META` en `public/app.js:101`. |
| Gala | 25% | Preliminar | `WEIGHTS` en `server.js:33`; `JUROR_SCORE_META` en `public/app.js:101`. |
| Traje de bano | 20% | Preliminar | `WEIGHTS` en `server.js:33`; `JUROR_SCORE_META` en `public/app.js:101`. |
| Speech Top 10 | 5% | Top 10 | `CRITERIA` en `server.js:42`; `requiredCriteriaForCandidate()` en `server.js:901`. |
| Pregunta final Top 5 | 5% | Top 5 | `CRITERIA` en `server.js:42`; `requiredCriteriaForCandidate()` en `server.js:901`. |
| Comportamiento | 15% | Administracion | `WEIGHTS` en `server.js:33`; campo administracion en `public/app.js:1433`. |

### Total normalizado vs acumulado

Este punto es importante para interpretar resultados.

El acumulado directo suma cada nota por su peso. Ejemplo:

```text
Entrevista 100 x 30% = 30.00
Gala        50 x 25% = 12.50
Traje       70 x 20% = 14.00
Acumulado directo    = 56.50
```

El ranking no muestra ese acumulado directo. Muestra `weightedTotal`, que es un total normalizado por la etapa activa:

```text
weightedTotal = weightedSum / expectedWeight
```

La etapa preliminar usa `expectedWeight = 0.90`, porque suma Entrevista, Gala, Traje de bano y Comportamiento. Eso esta en `stageWeightForCandidate()` en `server.js:908`.

Entonces, si el acumulado directo es `56.50`:

```text
56.50 / 0.90 = 62.78
```

Por eso una candidata puede mostrar un acumulado cercano a `56,80` y un total de ranking cercano a `62,78`. La formula exacta esta en `computeResults()` en `server.js:918`, especialmente `weightedSum` en `server.js:936`, `expectedWeight` en `server.js:957` y `weightedTotal` en `server.js:975`.

Tambien existe `availableTotal` en `server.js:976`, que normaliza solo sobre el peso ya disponible. Hoy no se usa como total principal del ranking.

## Reglas operativas

- Criterios enviados no se editan: `mergeLockedScores()` rechaza cambios sobre valores previos en `server.js:842`.
- Guardado parcial o conjunto: los botones individuales se crean en `scoreField()` en `public/app.js:720`; el formulario completo se maneja en `bindJurorEvents()` en `public/app.js:772`.
- Top 10 maximo 10 y Top 5 maximo 5: `assertCandidateStageLimits()` en `server.js:890`.
- Top 5 implica Top 10: `normalizeCandidateStages()` en `server.js:883`.
- Resultados ordenados de mayor a menor: `computeResults()` ordena por `weightedTotal` en `server.js:983`; el frontend tambien protege el orden con `sortedResults()` en `public/app.js:95`.
- Carga visual al guardar: `startJurorSaveFeedback()` en `public/app.js:1066` y CSS del spinner en `public/styles.css:426`.
- Solo 5 jurados: `JUROR_COUNT` esta en `server.js:30`; `RETIRED_USER_IDS` retira `jurado6` en `server.js:31`.
- Cambio de idioma: `languageToggleHtml()` en `public/app.js:180` genera el boton `ES/EN`; `setLanguage()` en `public/app.js:170` guarda la preferencia en `localStorage`.
- Entrada numerica: `bindScoreInputGuards()` en `public/app.js:332` bloquea teclas no numericas en el navegador y `validateScore()` en `server.js:784` rechaza valores invalidos en el servidor.

## Supabase

Proyecto actual:

```text
concurso-jurados
https://ncvfxdfoggrccicboxjn.supabase.co
```

La app usa Supabase de dos formas:

- Base de datos REST: tablas `app_users`, `candidates`, `evaluations`, `audit_log`.
- Supabase Auth: usuarios con correo interno generado desde el usuario corto, por ejemplo `jurado1@jurados.example.com`.

Variables:

| Variable | Uso | Donde aparece |
| --- | --- | --- |
| `SUPABASE_URL` | URL del proyecto. | `server.js:11`, `.env.example:2`, `render.yaml:13`. |
| `SUPABASE_PUBLISHABLE_KEY` | Llave publica/publishable para Auth cliente-servidor. | `server.js:12`, `.env.example:3`, `render.yaml:15`. |
| `SUPABASE_SECRET_KEY` | Llave secreta de servidor para REST si no hay service role. | `server.js:14`, `.env.example:4`, `render.yaml:17`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave service role para operaciones protegidas y Auth Admin. Nunca debe ir al navegador. | `server.js:15`, `.env.example:5`, `render.yaml:19`. |
| `SUPABASE_SEED_AUTH_USERS` | Si es `false`, evita recrear usuarios Auth en cada arranque. | `server.js:349`, `render.yaml:21`. |
| `SUPABASE_AUTH_EMAIL_DOMAIN` | Dominio interno para correos Auth generados. | `server.js:21`. |

Seguridad:

- Las tablas tienen RLS activo en `supabase/schema.sql:76` a `supabase/schema.sql:79`.
- Las politicas permiten acceso completo solo a `service_role`, desde `supabase/schema.sql:87`, `supabase/schema.sql:95`, `supabase/schema.sql:103` y `supabase/schema.sql:111`.
- La llave `service_role` y la `secret key` se usan solo en servidor. No se envian a `public/app.js`.
- Las rutas `/api/*` se protegen por cookie `HttpOnly`, creada con `serializeCookie()` en `server.js:642` y `sessionCookieOptions()` en `server.js:667`.

## Esquema de base de datos

| Tabla | Linea | Campos principales | Uso |
| --- | ---: | --- | --- |
| `app_users` | `supabase/schema.sql:1` | `id`, `username`, `email`, `auth_user_id`, `name`, `role`, hashes de contrasena | Usuarios de app y roles. |
| `candidates` | `supabase/schema.sql:38` | `id`, `order_index`, `name`, `behavior_score`, `is_top10`, `is_top5` | Candidatas, etapas y comportamiento. |
| `evaluations` | `supabase/schema.sql:51` | `juror_id`, `candidate_id`, `scores`, `arcgis` | Votos por jurado y candidata. Tiene `unique (juror_id, candidate_id)`. |
| `audit_log` | `supabase/schema.sql:62` | `at`, `user_id`, `action`, `candidate_id` | Auditoria simple de cambios relevantes. |

Indices:

- `evaluations_juror_idx` en `supabase/schema.sql:70`.
- `evaluations_candidate_idx` en `supabase/schema.sql:73`.

## Rutas API

| Ruta | Metodo | Linea | Permiso | Funcion |
| --- | --- | ---: | --- | --- |
| `/api/login` | POST | `server.js:1222` | Publica | Valida usuario y crea cookie de sesion. |
| `/api/logout` | POST | `server.js:1264` | Sesion | Cierra sesion local y Supabase. |
| `/api/bootstrap` | GET | `server.js:1289` | Sesion | Devuelve datos iniciales segun rol. |
| `/api/results` | GET | `server.js:1319` | Admin, sistema o tablero | Devuelve resultados calculados. |
| `/api/results.csv` | GET | `server.js:1328` | Admin | Exporta resultados en CSV. |
| `/api/evaluations` | POST | `server.js:1340` | Jurado | Guarda criterios de una candidata. |
| `/api/system/users/:id/password` | POST | `server.js:1389` | Sistema | Actualiza contrasena de admin, jurados, tablero o propia. |
| `/api/system/evaluations/:id` | DELETE | `server.js:1422` | Sistema | Elimina un registro individual de votacion. |
| `/api/system/candidates/:id` | POST | `server.js:1443` | Sistema | Cambia nombre de candidata. |
| `/api/system/jurors/:id` | POST | `server.js:1468` | Sistema | Cambia nombre de jurado. |
| `/api/system/reset-results` | POST | `server.js:1491` | Sistema | Borra resultados de prueba y reinicia etapas/comportamiento. |
| `/api/admin/candidates/:id` | POST | `server.js:1504` | Admin | Actualiza comportamiento, Top 10 y Top 5. |

## Frontend por pantallas

| Pantalla | Funcion principal | Linea | Que hace |
| --- | --- | ---: | --- |
| Login | `renderLogin()` | `public/app.js:210` | Usa el template HTML y envia credenciales. |
| Jurado | `renderJuror()` | `public/app.js:645` | Lista candidatas, muestra formulario y acumulado individual. |
| Administracion | `renderAdmin()` | `public/app.js:1377` | Muestra resultados y organizacion de comportamiento/etapas. |
| Sistema | `renderSystemAdmin()` | `public/app.js:909` | Muestra pestanas Configuracion, Validacion y Correcciones. |
| Tablero | `renderViewerDashboard()` | `public/app.js:340` | Muestra ranking, categorias y detalle por candidata. |

## Archivos publicos

| Archivo | Lineas clave | Detalle |
| --- | --- | --- |
| `public/index.html` | `public/index.html:6` | Titulo de la pestana. |
| `public/index.html` | `public/index.html:7` | Favicon con logo. |
| `public/index.html` | `public/index.html:9` | CSS con version para evitar cache. |
| `public/index.html` | `public/index.html:13` | Template de login. |
| `public/index.html` | `public/index.html:31` | Accesos de prueba visibles. |
| `public/index.html` | `public/index.html:41` | Carga `app.js` con version para evitar cache. |
| `public/favicon.png` | Archivo completo | Logo usado como icono de pestana. |

## Estilos principales

| Bloque | Linea | Uso |
| --- | ---: | --- |
| Variables de tema | `public/styles.css:1` | Colores, fuente y sombras. |
| Login | `public/styles.css:48` | Pantalla de acceso. |
| Botones y formularios | `public/styles.css:100`, `public/styles.css:132` | Formularios de login, jurado y admin. |
| Layout app | `public/styles.css:173` | Estructura general. |
| Topbar | `public/styles.css:179` | Barra superior y boton salir. |
| Lista candidatas | `public/styles.css:249` | Botones de seleccion. |
| Tabs | `public/styles.css:321` | Pestanas admin/sistema/tablero. |
| Formulario jurado | `public/styles.css:356` | Inputs de calificacion. |
| Spinner guardado | `public/styles.css:397` | Animacion mientras guarda. |
| Acumulado | `public/styles.css:540` | Tarjeta de acumulado por jurado. |
| Sistema/admin | `public/styles.css:601` | Grillas de configuracion y validacion. |
| Correcciones | `public/styles.css:747` | Boton de eliminar votacion individual. |
| Resultados | `public/styles.css:811` | Tabla de ranking. |
| Tablero | `public/styles.css:993` | Metricas, categorias y detalle. |
| Responsive | `public/styles.css:1149`, `public/styles.css:1189` | Ajustes tablet y movil. |

## Indice de funciones del servidor

| Funcion | Archivo:linea | Que hace |
| --- | --- | --- |
| `ensureDir` | `server.js:66` | Crea directorios locales si no existen. |
| `hashPassword` | `server.js:70` | Hashea contrasenas con PBKDF2 y sal. |
| `usernameToAuthEmail` | `server.js:74` | Convierte usuario corto en correo interno para Supabase Auth. |
| `makeUser` | `server.js:82` | Crea un usuario local con rol, hash y metadatos. |
| `defaultDatabase` | `server.js:97` | Construye la base inicial con admin, sistema, tablero, 5 jurados y 20 candidatas. |
| `ensureDefaultAppUsers` | `server.js:145` | Garantiza que existan usuarios sistema y tablero en datos viejos. |
| `retiredAppUsers` | `server.js:162` | Detecta usuarios retirados, actualmente `jurado6`. |
| `pruneRetiredAppUsers` | `server.js:166` | Elimina usuarios retirados y sus evaluaciones del objeto de base. |
| `isSupabasePlatformApiKey` | `server.js:178` | Distingue llaves nuevas `sb_publishable` o `sb_secret`. |
| `withSupabaseApiKey` | `server.js:182` | Agrega `apikey` y `Authorization` cuando aplica. |
| `supabaseHeaders` | `server.js:193` | Construye headers para Data API. |
| `supabaseRequest` | `server.js:200` | Ejecuta solicitudes REST contra tablas de Supabase. |
| `supabaseDelete` | `server.js:217` | Ejecuta deletes REST en Supabase. |
| `supabaseAuthHeaders` | `server.js:227` | Construye headers para Supabase Auth. |
| `supabaseAuthRequest` | `server.js:236` | Ejecuta solicitudes a `/auth/v1`. |
| `createSupabaseAuthUser` | `server.js:271` | Crea usuario en Supabase Auth desde un usuario de app. |
| `getSupabaseAuthUserById` | `server.js:304` | Busca usuario Auth por UUID. |
| `findSupabaseAuthUserByEmail` | `server.js:317` | Busca usuario Auth por correo interno. |
| `updateSupabaseAuthPassword` | `server.js:327` | Actualiza contrasena en Supabase Auth Admin. |
| `ensureSupabaseAuthUsers` | `server.js:347` | Sincroniza usuarios de app con Supabase Auth. |
| `deleteSupabaseAuthUser` | `server.js:376` | Elimina un usuario retirado de Supabase Auth. |
| `cleanupRetiredSupabaseUsers` | `server.js:395` | Limpia usuarios retirados en tablas y Auth. |
| `signInWithSupabaseAuth` | `server.js:408` | Inicia sesion contra Supabase Auth. |
| `refreshSupabaseAuthSession` | `server.js:428` | Refresca tokens de Auth. |
| `verifySupabaseAuthSession` | `server.js:440` | Verifica sesion Supabase y refresca si esta por vencer. |
| `supabaseUpsert` | `server.js:456` | Hace upsert masivo por tabla. |
| `auditId` | `server.js:468` | Genera id estable para auditoria. |
| `fromSupabaseRows` | `server.js:476` | Convierte filas Supabase al modelo interno. |
| `toSupabaseRows` | `server.js:519` | Convierte modelo interno a filas Supabase. |
| `loadSupabaseDb` | `server.js:560` | Carga datos de Supabase y aplica limpieza/sincronizacion. |
| `saveSupabaseDb` | `server.js:590` | Guarda usuarios, candidatas, evaluaciones y auditoria en Supabase. |
| `loadDb` | `server.js:598` | Decide si cargar Supabase o JSON local. |
| `saveDb` | `server.js:616` | Decide si guardar Supabase o JSON local. |
| `safeUser` | `server.js:628` | Devuelve usuario sin hash ni sal. |
| `signSessionId` | `server.js:638` | Firma ids de sesion con HMAC. |
| `serializeCookie` | `server.js:642` | Construye cabecera `Set-Cookie`. |
| `parseCookies` | `server.js:652` | Lee cookies entrantes. |
| `sessionCookieValue` | `server.js:663` | Empaqueta id y firma de sesion. |
| `sessionCookieOptions` | `server.js:667` | Define `HttpOnly`, `SameSite`, expiracion y `Secure`. |
| `createSession` | `server.js:677` | Guarda sesion en memoria. |
| `revokeAppSessionsForUser` | `server.js:683` | Revoca sesiones locales al cambiar contrasena. |
| `getSignedSession` | `server.js:691` | Valida firma de cookie y recupera sesion. |
| `clearSessionCookie` | `server.js:705` | Borra cookie de sesion. |
| `getSessionUser` | `server.js:709` | Valida usuario actual y sesion Supabase. |
| `sendJson` | `server.js:734` | Responde JSON. |
| `sendText` | `server.js:744` | Responde texto o contenido estatico. |
| `readRequestBody` | `server.js:753` | Lee y parsea JSON del request. |
| `numberOrNull` | `server.js:775` | Convierte valores numericos o null. |
| `validateScore` | `server.js:782` | Valida notas entre 1 y 100. |
| `validateName` | `server.js:794` | Valida nombres no vacios y hasta 80 caracteres. |
| `validatePassword` | `server.js:801` | Valida longitud y espacios de contrasenas. |
| `canSystemAdminChangePassword` | `server.js:816` | Controla a quien puede cambiar contrasena el sistema. |
| `passwordManagedUsers` | `server.js:823` | Lista usuarios manejables por sistema. |
| `updateUserPassword` | `server.js:829` | Actualiza contrasena local y Supabase Auth. |
| `mergeLockedScores` | `server.js:842` | Mezcla criterios nuevos y bloquea los ya enviados. |
| `normalizeCandidateStages` | `server.js:883` | Sincroniza banderas Top 10 y Top 5. |
| `assertCandidateStageLimits` | `server.js:890` | Impide mas de 10 Top 10 y mas de 5 Top 5. |
| `requiredCriteriaForCandidate` | `server.js:901` | Define criterios obligatorios por etapa. |
| `stageWeightForCandidate` | `server.js:908` | Devuelve peso esperado: 0.90, 0.95 o 1.00. |
| `scoreIsPresent` | `server.js:914` | Detecta notas numericas validas. |
| `computeResults` | `server.js:918` | Calcula promedios, totales, jurados completos y ranking. |
| `getEvaluation` | `server.js:987` | Busca evaluacion por jurado y candidata. |
| `makeEvaluation` | `server.js:993` | Crea evaluacion inicial vacia. |
| `resetResultsForTesting` | `server.js:1011` | Borra evaluaciones y reinicia comportamiento/etapas. |
| `deleteEvaluationForCorrection` | `server.js:1033` | Elimina una evaluacion individual y registra auditoria. |
| `getArcgisToken` | `server.js:1050` | Obtiene token de ArcGIS si la sincronizacion esta activa. |
| `syncEvaluationToArcgis` | `server.js:1078` | Sincroniza una evaluacion con Feature Layer opcional. |
| `csvValue` | `server.js:1147` | Escapa valores para CSV. |
| `resultsToCsv` | `server.js:1152` | Convierte resultados a CSV. |
| `serveStatic` | `server.js:1186` | Sirve archivos de `public`. |
| `handleApi` | `server.js:1216` | Router principal de todas las rutas `/api/*`. |

## Indice de funciones del frontend

| Funcion | Archivo:linea | Que hace |
| --- | --- | --- |
| `escapeHtml` | `public/app.js:35` | Escapa texto para evitar HTML inyectado. |
| `formatNumber` | `public/app.js:44` | Formatea numeros con locale `es-CO`. |
| `roleLabel` | `public/app.js:52` | Muestra nombre amigable del rol. |
| `api` | `public/app.js:59` | Wrapper de `fetch` con JSON y manejo de errores. |
| `candidateBadges` | `public/app.js:75` | Genera etiquetas Top 10 y Top 5. |
| `stageCounts` | `public/app.js:82` | Cuenta candidatas seleccionadas en Top 10 y Top 5. |
| `updateCandidateState` | `public/app.js:89` | Actualiza candidata local y resultados. |
| `sortedResults` | `public/app.js:95` | Ordena resultados por total descendente. |
| `requiredKeys` | `public/app.js:114` | Define criterios requeridos en frontend. |
| `evaluationFor` | `public/app.js:121` | Busca evaluacion propia por candidata. |
| `activeJurorScoreMeta` | `public/app.js:125` | Devuelve criterios activos para el jurado. |
| `scoreValue` | `public/app.js:129` | Normaliza nota digitada o guardada. |
| `scoreAccumulator` | `public/app.js:136` | Calcula acumulado directo visible al jurado. |
| `accumulatorHtml` | `public/app.js:158` | Renderiza tarjeta de acumulado. |
| `evaluationStatus` | `public/app.js:172` | Muestra estado pendiente/parcial/completo. |
| `selectDefaultCandidate` | `public/app.js:182` | Selecciona candidata inicial segun rol. |
| `loadApp` | `public/app.js:197` | Carga bootstrap inicial y decide login/app. |
| `renderLogin` | `public/app.js:210` | Renderiza login y maneja envio. |
| `stopDashboardAutoRefresh` | `public/app.js:234` | Detiene intervalo del tablero. |
| `ensureDashboardAutoRefresh` | `public/app.js:240` | Crea intervalo de actualizacion del tablero. |
| `refreshDashboardData` | `public/app.js:245` | Recarga datos para tablero en vivo. |
| `topbarHtml` | `public/app.js:265` | Renderiza barra superior. |
| `renderApp` | `public/app.js:283` | Enruta pantalla por rol. |
| `renderUnsupportedRole` | `public/app.js:308` | Muestra error para rol no soportado. |
| `renderCandidateList` | `public/app.js:319` | Renderiza lista de candidatas. |
| `renderViewerDashboard` | `public/app.js:340` | Renderiza tablero en vivo. |
| `metricCard` | `public/app.js:393` | Renderiza tarjeta de metrica. |
| `formatDashboardTime` | `public/app.js:402` | Formatea hora de actualizacion. |
| `renderViewerRanking` | `public/app.js:411` | Tabla ranking del tablero. |
| `viewerRankingRow` | `public/app.js:440` | Fila de ranking del tablero. |
| `renderViewerCategories` | `public/app.js:458` | Vista de lideres por categoria. |
| `renderCategoryBoard` | `public/app.js:466` | Tarjeta de una categoria. |
| `categoryValue` | `public/app.js:490` | Extrae valor de categoria. |
| `categoryLeaderRow` | `public/app.js:495` | Fila de lider por categoria. |
| `renderViewerCandidate` | `public/app.js:505` | Detalle del tablero por candidata. |
| `viewerCandidateButton` | `public/app.js:546` | Boton de candidata en tablero. |
| `viewerScoreTile` | `public/app.js:559` | Tarjeta de nota por criterio. |
| `viewerCandidateJurorTable` | `public/app.js:569` | Tabla de jurados por candidata. |
| `viewerJurorRow` | `public/app.js:597` | Fila de jurado en tablero. |
| `bindViewerDashboardEvents` | `public/app.js:622` | Eventos de tabs y candidata del tablero. |
| `renderJuror` | `public/app.js:645` | Pantalla principal del jurado. |
| `scoreField` | `public/app.js:720` | Campo de calificacion con guardado individual. |
| `weightRow` | `public/app.js:737` | Fila de pesos. |
| `currentScoreValues` | `public/app.js:746` | Lee valores actuales del formulario. |
| `updateScoreAccumulator` | `public/app.js:756` | Actualiza acumulado en vivo al escribir. |
| `bindJurorEvents` | `public/app.js:772` | Eventos de busqueda, candidata y guardado. |
| `startJurorSaveFeedback` | `public/app.js:816` | Activa spinner y bloquea campos al guardar. |
| `restoreJurorSaveFeedback` | `public/app.js:840` | Restaura formulario si falla el guardado. |
| `completeJurorSaveFeedback` | `public/app.js:863` | Muestra guardado exitoso antes de refrescar. |
| `submitScores` | `public/app.js:880` | Envia calificaciones a la API. |
| `renderSystemAdmin` | `public/app.js:909` | Pantalla del administrador del sistema. |
| `renderSystemSettings` | `public/app.js:936` | Configuracion de nombres y contrasenas. |
| `renderSystemCorrections` | `public/app.js:989` | Vista para borrar registros individuales. |
| `correctionRows` | `public/app.js:1008` | Construye filas de correcciones. |
| `correctionRowHtml` | `public/app.js:1033` | HTML de cada registro corregible. |
| `formatCorrectionDate` | `public/app.js:1050` | Formatea fecha de correccion. |
| `renderSystemValidation` | `public/app.js:1060` | Vista de validacion por candidata. |
| `renderValidationCandidateList` | `public/app.js:1095` | Lista candidatas para validacion. |
| `validationTableHtml` | `public/app.js:1115` | Tabla de jurados/calificaciones. |
| `evaluationForJurorCandidate` | `public/app.js:1144` | Busca evaluacion por jurado y candidata. |
| `validationRowHtml` | `public/app.js:1150` | Fila de validacion por jurado. |
| `deleteEvaluationButton` | `public/app.js:1175` | Boton para eliminar votacion individual. |
| `validationScoreCell` | `public/app.js:1189` | Celda de nota o estado. |
| `passwordManagedRows` | `public/app.js:1195` | Lista usuarios con contrasena editable. |
| `passwordEditRow` | `public/app.js:1204` | Fila de edicion de contrasena. |
| `nameEditRow` | `public/app.js:1226` | Fila para editar nombre. |
| `bindSystemAdminEvents` | `public/app.js:1240` | Eventos del administrador del sistema. |
| `renderAdmin` | `public/app.js:1377` | Pantalla de administracion. |
| `renderAdminSetup` | `public/app.js:1402` | Organizacion de comportamiento y etapas. |
| `renderResultsTable` | `public/app.js:1452` | Tabla de resultados de admin. |
| `resultRow` | `public/app.js:1489` | Fila de resultados. |
| `nextStagePayload` | `public/app.js:1540` | Payload Top 10/Top 5 respetando limites. |
| `bindAdminEvents` | `public/app.js:1557` | Eventos de administracion. |

## Render y publicacion

Render lee `render.yaml`:

- Servicio web Node en `render.yaml:1`.
- Nombre `votaciones-missu` en `render.yaml:3`.
- Build command `npm install` en `render.yaml:6`.
- Start command `npm start` en `render.yaml:7`.
- Variables de entorno desde `render.yaml:8`.

Publicacion recomendada:

1. Subir cambios a GitHub.
2. Render detecta el push y despliega.
3. Verificar `https://votaciones-missu.onrender.com`.
4. Si cambia JS o CSS, actualizar version en `public/index.html:9` y `public/index.html:41` para evitar cache.

## Ejecutar localmente

```powershell
npm start
```

Luego abrir:

```text
http://localhost:3000
```

Si no hay variables Supabase, usa `data/database.json`. Ese archivo no se sube al repositorio porque puede contener resultados de prueba.

## Variables de entorno

Minimas para produccion:

```text
APP_SECRET=un_texto_largo_aleatorio
SUPABASE_URL=https://ncvfxdfoggrccicboxjn.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
SUPABASE_SEED_AUTH_USERS=false
```

Opcionales:

```text
SUPABASE_AUTH_EMAIL_DOMAIN=jurados.example.com
COOKIE_SECURE=true
PUBLIC_URL=https://votaciones-missu.onrender.com
ARCGIS_SYNC_ENABLED=true
ARCGIS_FEATURE_LAYER_URL=https://services.arcgis.com/.../FeatureServer/0
ARCGIS_USERNAME=usuario_arcgis
ARCGIS_PASSWORD=contrasena_arcgis
ARCGIS_TOKEN=token_arcgis
```

No se deben subir llaves reales al repositorio.

## ArcGIS opcional

La aplicacion no depende de ArcGIS para funcionar. Si `ARCGIS_SYNC_ENABLED` no es `true` o falta `ARCGIS_FEATURE_LAYER_URL`, `syncEvaluationToArcgis()` devuelve estado `skipped` en `server.js:1078`.

Si se configura, cada evaluacion guardada queda marcada como `pending` en `server.js:1366`, se intenta sincronizar en `server.js:1379`, y si falla queda con `status: "error"` en `server.js:1381`.

## Checklist de pruebas despues de cambios

- Revisar sintaxis:

```powershell
node --check server.js
node --check public/app.js
```

- Probar login de cada rol.
- Como jurado, guardar un criterio individual y luego varios criterios juntos.
- Confirmar que un criterio guardado queda bloqueado.
- Como administracion, seleccionar Top 10 y Top 5 y validar limites.
- Como sistema, validar calificaciones por candidata y eliminar una evaluacion individual de prueba.
- Como tablero, confirmar que no se puede cargar votaciones y que solo muestra resultados.
- Revisar que el total del ranking se interprete como `weightedTotal` normalizado, no como acumulado directo.
- Probar el boton `ES/EN` en login, jurado, administracion, sistema y tablero.
- Confirmar que los campos de calificacion no permitan escribir `e`, `+` ni `-`, y que la API rechace valores como `1e2`.
