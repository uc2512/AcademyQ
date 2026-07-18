# Guía de Despliegue en Vercel - AcademiQ

Esta guía explica paso a paso cómo subir y configurar **AcademiQ** en Vercel de forma exitosa, configurando la base de datos Neon, la autenticación de Google y el almacenamiento de Vercel Blob.

---

## Paso 1: Subir el proyecto a GitHub
Crea un repositorio en tu cuenta de GitHub y sube el código del proyecto:
```bash
git init
git add .
git commit -m "feat: setup academiq release"
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git branch -M main
git push -u origin main
```

---

## Paso 2: Crear el proyecto en Vercel
1. Ingresa a [Vercel](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **Add New** > **Project**.
3. Importa tu repositorio recién creado.

---

## Paso 3: Configurar las Variables de Entorno en Vercel
Antes de hacer clic en **Deploy**, despliega la sección **Environment Variables** y configura las siguientes variables clave:

### 1. Base de Datos (Neon)
*   **Nombre:** `DATABASE_URL`
*   **Valor:** Pega la cadena de conexión de tu base de datos de Neon Postgres (la misma que usas en el archivo `.env.local`).

### 2. Autenticación (Auth.js)
*   **Nombre:** `AUTH_SECRET`
*   **Valor:** Un string aleatorio seguro. Puedes generarlo en tu terminal local ejecutando:
    ```bash
    npx auth secret
    ```
*   **Nombre:** `AUTH_TRUST_HOST`
*   **Valor:** `true` (necesario para producción).

### 3. Autenticación con Google (Google OAuth)
1. Ve a la [Google Cloud Console](https://console.cloud.google.com/).
2. Crea o selecciona tu proyecto académico.
3. Ve a **API y Servicios** > **Credenciales**.
4. En **Orígenes de JavaScript autorizados**, añade la URL de tu app en Vercel:
   `https://tu-proyecto.vercel.app`
5. En **URIs de redireccionamiento autorizados**, añade la ruta de callback de Auth.js:
   `https://tu-proyecto.vercel.app/api/auth/callback/google`
6. Copia las credenciales y añádelas en Vercel:
   *   **Nombre:** `AUTH_GOOGLE_ID` (ID de cliente)
   *   **Nombre:** `AUTH_GOOGLE_SECRET` (Secreto de cliente)

---

## Paso 4: Configurar Vercel Blob Storage (Archivos)
Para que la subida de PDFs y fotos funcione en la nube en lugar de guardarse en el disco temporal de la instancia:
1. Una vez desplegado tu proyecto en Vercel, ve a la pestaña **Storage** en el panel de control de tu proyecto en Vercel.
2. Selecciona **Connect Database** > **Create New** > **Blob**.
3. Sigue los sencillos pasos para crear el storage de Blob.
4. Esto inyectará automáticamente la variable de entorno `BLOB_READ_WRITE_TOKEN` en tu proyecto de Vercel.
5. ¡Listo! El código híbrido de AcademiQ detectará la variable y comenzará a subir tus archivos a la nube de Vercel de forma automática.

---

## Paso 5: Ejecutar Migraciones de Base de Datos
Para asegurarte de que las tablas estén físicamente creadas y sincronizadas en tu base de datos de Neon de producción:
1. Puedes ejecutar el comando de sincronización desde tu consola local apuntando temporalmente tu `.env.local` a la base de datos de producción:
   ```bash
   npm run db:push
   ```
2. O puedes añadir un script de `build` en tu `package.json` para que corra antes de compilar en Vercel. (Actualmente ya hemos corrido `db:push` en tu base de datos, por lo que las tablas ya existen).
