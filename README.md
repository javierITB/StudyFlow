<div align="center">

# 📚 StudyFlow 2.0

### Lee tus PDFs, Word y PowerPoint con foco real, ruta diaria adaptativa y apuntes sin distracciones.

[![Live Demo](https://img.shields.io/badge/Probar_Online-studyflexconnect.vercel.app-10b981?style=for-the-badge&logo=vercel&logoColor=white)](https://studyflexconnect.vercel.app)
[![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_&_Sync-3ecf8e?style=for-the-badge&logo=supabase&logoColor=black)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Vitest-17_tests_passing-729b1b?style=for-the-badge&logo=vitest&logoColor=white)](#calidad-y-pruebas)

**Empieza en 10 segundos sin crear cuenta** (todo se guarda en tu navegador) o inicia sesión gratis para sincronizar tu biblioteca, notas y avance entre **PC, iPad/tablet y navegador**.

</div>

---

## 🎯 ¿Qué es StudyFlow y para qué sirve en la práctica?

Cuando se acerca una prueba, solemos terminar con **diez pestañas abiertas**: un lector de PDF por un lado, diapositivas por otro, una app de Pomodoro aparte, apuntes sueltos en Word y la duda constante de *"¿realmente alcanzo a leer todo antes del examen?"*.

**StudyFlow 2.0** reúne todo tu flujo de estudio en **un solo espacio tranquilo**:

* **Sube tu material tal como lo entrega tu profe**: guías y papers en **PDF**, resúmenes en **Word (`.docx`)** o clases en **PowerPoint (`.pptx`)**, ordenados en carpetas por ramo.
* **Convierte páginas en un plan diario realista**: ingresa la fecha y hora de tu evaluación y el sistema divide el material en **etapas claras por día**, empaquetando lecturas cortas y programando descansos automáticos al cambiar de archivo.
* **Descubre tu velocidad real de lectura**: si no sabes si usar Pomodoro de `25/5`, `50/10` o avanzar por páginas, activa **Medir mi ritmo**; mientras lees unas páginas, StudyFlow mide cuánto tardas realmente y te recomienda ciclos hechos a tu medida.
* **Toma apuntes sin tapar lo que estás leyendo**: pega **post-its al margen** fuera de la hoja (con clasificación directa para repaso) y luego expórtalos ordenados en **PDF**.

---

## 🚀 Tu flujo de estudio en 4 pasos

1. **Carga tus archivos y organízalos por ramo**
   Arrastra tus `.pdf`, `.docx` o `.pptx` a la barra lateral. Cada documento recuerda automáticamente la última página que estabas leyendo.
2. **Define tu meta o calibra tu ritmo**
   Elige cuándo rindes tu prueba (y qué archivos entran). Si es tu primera vez, puedes seguir el **Tutorial Express interactivo** desde el botón `?` en la barra superior o activar el **Modo Diagnóstico** mientras lees 3–5 páginas.
3. **Lee cómodo (en PC, iPad o pantalla completa)**
   * Alterna entre **1 hoja** o **2 hojas tipo libro** (avanzando de una en una).
   * Activa **Pantalla completa (Modo Inmersivo)** con barra flotante inferior para leer sin distracciones.
   * Haz clic en **+ Al margen** para crear notas adhesivas laterales que nunca tapan el texto (en tablet, si no tienes notas afuera de la hoja, la página queda fija horizontalmente para leer sin deslizamientos incómodos).
4. **Repasa y exporta tus apuntes**
   Pasa a la pestaña **Pizarra y Exportación** para ver todas tus notas clasificadas en 4 columnas (*Ideas Clave*, *Preguntas y Repaso*, *Resumen y Síntesis*, *Tareas y Acciones*) y descárgalas en un **reporte PDF** listo para estudiar antes de entrar a sala.

---

## ✨ Funcionalidades destacadas

| Área | Lo que incluye |
| :--- | :--- |
| **📖 Visor multi-formato** | Renderizado local en navegador para `.pdf` (`pdfjs-dist`), `.docx` (`mammoth` con paginación virtual) y `.pptx` (`jszip` + parser XML con notas del orador). |
| **🗺️ Ruta diaria inteligente** | Etapas agrupadas enfocadas en tu paso actual, días futuros colapsables para evitar agobio visual, empaquetado de documentos cortos y diagnóstico de viabilidad frente a tu *deadline*. |
| **⏱️ Pomodoro y Diagnóstico Real** | 5 presets (*Clásico*, *Bloque Profundo*, *Micro-Sesiones*, *Extenso 75/15*, *Por Páginas*) + modo personalizado, alertas Web Audio suaves, transición con pantalla en *blur* y calibración por velocidad real. |
| **🗒️ Post-its + Pizarra Kanban** | Notas arrastrables por hoja o margen externo, 4 colores, filtro por ramo/archivo en pizarra Kanban y exportación vectorial a PDF (`jsPDF`). |
| **🎨 Personalización real del entorno** | 9 temas claros/oscuros (ej. *Medianoche Grafito*, *Bosque Esmeralda*, *Rosa Nocturno*, *Carmesí Estudio*, *Cuaderno Rosa*), 8 acentos + color libre, 7 fondos o imagen propia, tono de papel (*Blanco*, *Crema*, *E-Ink*), tipografía y escala UI. |
| **☁️ Offline-first + Nube opcional** | Funciona 100 % local en **IndexedDB** y permite respaldo portátil **JSON**. Si habilitas **Supabase**, sincroniza cuentas multi-estudiante, apuntes, planes y archivos privados entre dispositivos. |
| **📱 Adaptado a PC, iPad/Tablet y móvil** | Proporciones adaptativas para pantallas tipo **iPad**, panel lateral colapsable, bloqueo horizontal en lectura táctil sin márgenes activos y tutorial guiado omitible. |

---

## 🛠️ Stack Tecnológico y Perfil Técnico

Para reclutadores y desarrolladores interesados en la arquitectura: StudyFlow 2.0 está construido como una aplicación **local-first** modular en cliente, con motores de dominio puros testables y sincronización optimista opcional sobre Supabase.

> 📄 **Documentación técnica completa:** consulta [`docs/ARQUITECTURA.md`](./docs/ARQUITECTURA.md) para ver el diagrama de arquitectura, decisiones de ingeniería, diseño de parsers en cliente, políticas RLS en Postgres/Storage y estrategia de pruebas.

* **Frontend**: React 19 · TypeScript 5.7 · Vite 7 · Tailwind CSS 3.4 · Lucide Icons
* **Motores en cliente**: `pdfjs-dist` (Canvas PDF) · `mammoth` (DOCX + sanitización DOM) · `jszip` + parser XML (`DrawingML` PPTX) · `jspdf` (reportes PDF) · Web Audio API
* **Persistencia & Backend-as-a-Service**: IndexedDB (`StudyFlow_Persistent_DB` v2) · Supabase Auth + PostgreSQL (con Row Level Security) + Storage privado (`study-files`)
* **Calidad**: Vitest (pruebas unitarias sobre motores de ruta, diagnóstico, parsing, temas y traducción de errores) + TypeScript strict build (`tsc -b`)

<details>
<summary><strong>Ver estructura principal del repositorio</strong></summary>

```text
StudyFlow/
├── docs/
│   └── ARQUITECTURA.md          # Diseño técnico, flujo de datos y decisiones de ingeniería
├── supabase/
│   └── schema.sql               # Tablas, triggers, políticas RLS por usuario y bucket privado
├── src/
│   ├── components/
│   │   ├── DocumentViewer.tsx   # Visor PDF/DOCX/PPTX, modo 2 hojas, fullscreen y post-its
│   │   ├── DocumentSidebar.tsx  # Carpetas por ramo, carga drag & drop y vista de ruta
│   │   ├── PomodoroAndPlanner.tsx # Reloj Pomodoro, métodos y configurador de ruta
│   │   ├── RouteTimeline.tsx    # Línea de tiempo colapsable por día y etapa
│   │   ├── KanbanBoard.tsx      # Pizarra de 4 zonas + exportación PDF
│   │   ├── AppearanceModal.tsx  # Editor en vivo de temas, acentos, fondos y papel
│   │   ├── DiagnosticModal.tsx  # Calibración de velocidad lectora real
│   │   ├── TutorialOverlay.tsx  # Onboarding guiado interactivo con spotlight
│   │   ├── AccountModal.tsx     # Sesión Supabase y respaldo portátil JSON
│   │   └── Navbar.tsx           # Navegación responsiva multi-dispositivo
│   ├── context/
│   │   └── TimerContext.tsx     # Máquina de estados del temporizador y progreso de ruta
│   ├── lib/
│   │   ├── routePlanner.ts      # Algoritmo de planificación secuencial por bloques/días
│   │   ├── diagnosticEngine.ts  # Cálculo estadístico de velocidad lectora y recomendación
│   │   ├── cloudSync.ts         # Sincronización bidireccional y binario en Supabase Storage
│   │   ├── localDb.ts           # Capa tipada sobre IndexedDB
│   │   ├── themes.ts            # Generación dinámica de escalas RGB y CSS vars (--sf-*)
│   │   ├── errorMessages.ts     # Traductor de errores Auth/PostgREST/Storage/Parsers a ES
│   │   └── __tests__/           # Suite unitaria en Vitest
│   └── types/studyflow.ts       # Contratos y tipos de dominio
├── vite.config.ts               # Build Vite con inyección segura de variables públicas
└── vercel.json                  # Rewrite SPA para despliegue en Vercel
```

</details>

---

## 💻 Instalación y Desarrollo Local

### Requisitos

* **Node.js 18+** y `npm`

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/javierITB/StudyFlow.git
cd StudyFlow
npm install
npm run dev
```

Con esto la aplicación ya funciona de inmediato en `http://localhost:5173` en **Modo Local (IndexedDB)**.

### 2. Calidad y pruebas

```bash
npm test         # Ejecuta las 5 suites unitarias con Vitest (17 pruebas)
npm run build    # Verifica tipos con tsc -b y genera el bundle en dist/
```

---

## ☁️ Despliegue en Vercel y Cuentas Multi-Estudiante (Supabase)

Si deseas habilitar cuentas individuales por estudiante, sincronización en la nube y almacenamiento de archivos:

1. **Crea un proyecto en [Supabase](https://supabase.com)** y ejecuta [`supabase/schema.sql`](./supabase/schema.sql) en el **SQL Editor**. Esto crea las tablas `profiles`, `folders`, `documents`, `notes`, `tasks`, `study_plans`, el trigger automático de registro, políticas RLS por `auth.uid()` y el bucket privado `study-files`.
2. **Configura tus variables de entorno** (en `.env.local` localmente o en **Vercel → Settings → Environment Variables** para el entorno *Production*):
   * `SUPABASE_URL` *(o `VITE_SUPABASE_URL`)*
   * `SUPABASE_PUBLISHABLE_KEY` *(o `SUPABASE_ANON_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY`)*
   > 🔒 Por seguridad, [`vite.config.ts`](./vite.config.ts) inyecta únicamente estas claves públicas en el cliente y nunca expone secretos como `SUPABASE_SERVICE_ROLE_KEY`.
3. **Configura Authentication → URL Configuration en Supabase**: agrega `http://localhost:5173` y tu dominio de producción (ej. `https://studyflexconnect.vercel.app`) en **Site URL / Redirect URLs**.
4. **Despliega en Vercel** con *Framework Preset: Vite*, *Build Command:* `npm run build` y *Output Directory:* `dist` ([`vercel.json`](./vercel.json) ya resuelve el *SPA fallback*).

---

## 👤 Autor

Desarrollado por **Vicente Torres** ([@javierITB](https://github.com/javierITB)) — *vicente.torresb@mail.udp.cl*

Si te ayudó a ordenar tus estudios o te sirvió de referencia técnica, ¡una ⭐ en el repositorio siempre es bienvenida!
