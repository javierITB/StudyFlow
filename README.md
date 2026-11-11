# StudyFlow 2.0

Plataforma de estudio en **React + TypeScript + Vite + Tailwind CSS** con soporte multi-formato (`.pdf`, `.docx`, `.pptx`), organización por carpetas/ramos, métodos de estudio flexibles (por tiempo o por páginas), generador de ruta inteligente hacia la fecha objetivo, notas adhesivas, pizarra Kanban con exportación a PDF y sincronización multi-estudiante con **Supabase**.

## Desarrollo Local

```bash
npm install
npm run dev
```

Pruebas unitarias y build de producción:

```bash
npm test
npm run build
```

## Despliegue en Vercel y Cuentas Multi-Estudiante (Supabase)

StudyFlow funciona **de forma local offline con IndexedDB** incluso sin configurar Supabase. Para habilitar cuentas de estudiantes, login y sincronización en la nube:

1. **Crear proyecto en Supabase** y ejecutar el script [`supabase/schema.sql`](./supabase/schema.sql) en el **SQL Editor** de Supabase (crea las tablas `profiles`, `folders`, `documents`, `notes`, `tasks`, `study_plans`, políticas RLS por usuario y el bucket privado `study-files`).
2. **Variables de entorno** (en `.env.local` para desarrollo o en **Vercel → Settings → Environment Variables**):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Desplegar en Vercel:**
   - Conecta el repositorio en Vercel (`Framework Preset: Vite`, `Build Command: npm run build`, `Output Directory: dist`).
   - [`vercel.json`](./vercel.json) ya incluye el rewrite SPA para producción.

