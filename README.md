# Sistema de jurados

Aplicación web para calificar 20 candidatas con 6 jurados. Puede funcionar localmente con archivo JSON o publicada en Render con Supabase.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fdnietot%2FVotaciones_Missu)

## Accesos de prueba

- Organización: `admin` / `admin2026`
- Administrador del sistema: `sistema` / `sistema2026`
- Jurados: `jurado1` / `jurado1`, `jurado2` / `jurado2`, hasta `jurado6` / `jurado6`

## Pesos

- Entrevista: 30%
- Gala: 25%
- Traje de baño: 20%
- Speech Top 10: 5%
- Pregunta final Top 5: 5%
- Comportamiento / informe durante concentración: 15%

## Reglas actuales

- Cada jurado califica a todas las candidatas.
- Cada criterio puede guardarse por separado o junto con otros criterios llenos.
- Un criterio enviado no se puede editar.
- Si una candidata pasa a Top 10 o Top 5, se habilita solo el criterio nuevo de esa etapa.
- Los resultados generales solo son visibles para la organización.
- La organización registra el puntaje adicional de comportamiento y controla Top 10 / Top 5.
- El administrador del sistema solo cambia nombres de jurados y candidatas.
- El administrador del sistema puede borrar resultados de prueba: elimina calificaciones y reinicia comportamiento / Top 10 / Top 5, conservando nombres y usuarios.

## Ejecutar

```powershell
node server.js
```

Luego abrir:

```text
http://localhost:3000
```

La base local `data/database.json` se crea sola si no existe. No se sube al repositorio para evitar publicar resultados de prueba.

## Supabase Auth y base de datos

Proyecto creado:

```text
concurso-jurados
https://ncvfxdfoggrccicboxjn.supabase.co
```

Las tablas ya fueron creadas y cargadas con datos iniciales. Si necesitas recrearlas en otro proyecto, usa `supabase/schema.sql`.

La primera vez que la app se conecte a Supabase, creará automáticamente los perfiles y usuarios de Supabase Auth para:

- `admin`
- `sistema`
- `jurado1` a `jurado6`
- `Candidata 1` a `Candidata 20`

El formulario sigue pidiendo usuario corto (`admin`, `sistema`, `jurado1`, etc.). Internamente la app usa correos de Auth como `admin@jurados.example.com`. Puedes cambiar ese dominio con `SUPABASE_AUTH_EMAIL_DOMAIN`.

Las rutas `/api/*` quedan protegidas con una cookie `HttpOnly`; cada sesión se valida contra Supabase Auth en el servidor. La `secret key` nunca se envía al navegador.

## Render

Publica este repositorio como servicio web de Node:

```text
https://github.com/dnietot/Votaciones_Missu
```

Configuración:

- Build command: `npm install`
- Start command: `npm start`
- Service type: `Web Service`
- Runtime: `Node`
- Plan sugerido para pruebas: `Free`

Variables de entorno:

```text
APP_SECRET=un_texto_largo_aleatorio
SUPABASE_URL=https://ncvfxdfoggrccicboxjn.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_IYJoxnSkIDqqFXlw3FMMog_3ft8itzt
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Render también puede leer el archivo `render.yaml`, dejando `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY` para llenarlas desde el panel.
`SUPABASE_SERVICE_ROLE_KEY` es la llave `service_role` legacy que necesita Supabase Auth Admin para crear usuarios Auth desde el servidor y, si está presente, la app la usa para escrituras protegidas por RLS. `SUPABASE_SECRET_KEY` puede ser una llave nueva de Supabase con formato `sb_secret_...` y queda como respaldo para acceso de servidor. No subas ninguna llave real al repositorio.
En producción, `SUPABASE_SEED_AUTH_USERS=false` evita recrear usuarios de Supabase Auth en cada arranque cuando ya fueron creados.

Para publicarlo:

1. Entrar a Render y crear un `Blueprint` o un `Web Service` desde GitHub.
2. Seleccionar `dnietot/Votaciones_Missu`.
3. Confirmar que Render lea `render.yaml`.
4. Pegar las tres variables de Supabase cuando Render las solicite.
5. Esperar el primer deploy y abrir la URL `onrender.com`.

Para un evento real, conviene subir de `Free` a un plan pago antes de la votación, porque los servicios gratuitos pueden pausarse por inactividad.

## ArcGIS opcional

La aplicación ya no necesita ArcGIS. Si más adelante quieres sincronizar también con una capa de ArcGIS, define estas variables:

```powershell
$env:ARCGIS_SYNC_ENABLED="true"
$env:ARCGIS_FEATURE_LAYER_URL="https://services.arcgis.com/.../FeatureServer/0"
$env:ARCGIS_USERNAME="tu_usuario"
$env:ARCGIS_PASSWORD="tu_contraseña"
node server.js
```
