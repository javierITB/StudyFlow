# Especificación Técnica y Arquitectura del Sistema: StudyFlow

## 1. Visión General y Objetivo del Proyecto

**StudyFlow** es una aplicación web embebida de arquitectura cliente puro (*single-page application* sin backend propietario) diseñada para optimizar los flujos de estudio universitario y profesional. Integra gestión documental persistente, lectura analítica asistida mediante notas adhesivas contextuales, un planificador dinámico de sesiones Pomodoro basado en el volumen de páginas y una fecha límite (*deadline*), un tablero kanban interactivo de apuntes y un motor de exportación a PDF.

El objetivo central del sistema es erradicar la procrastinación y la sobrecarga cognitiva mediante la conversión algorítmica del volumen de lectura en bloques de trabajo Pomodoro viables frente a una fecha de entrega fija, manteniendo todos los datos privados en el navegador del usuario.

---

## 2. Pila Tecnológica y Dependencias

La solución está construida en un único archivo autónomo (`index.html`) con las siguientes librerías cargadas vía CDN:

| Tecnología / Librería | Versión | Propósito en el Proyecto |
| :--- | :--- | :--- |
| **HTML5 / CSS3 / ES6+** | Estándar | Estructura, reactividad nativa y eventos del DOM. |
| **Tailwind CSS** | 3.x CDN | Sistema de diseño responsivo en modo oscuro (paleta `slate-950` e `indigo-600`). |
| **PDF.js** | 3.11.174 | Renderizado de documentos PDF en elementos `<canvas>` HTML5 y extracción de metadatos (recuento de páginas). |
| **jsPDF** | 2.5.1 | Generación vectorial y maquetación de informes PDF estructurados a partir de las notas de la pizarra. |
| **IndexedDB API** | Nativa | Persistencia local de archivos binarios (ArrayBuffers/Blobs), notas adhesivas y tareas. |
| **Web Audio API** | Nativa | Síntesis acústica procedural mediante osciladores senoidales y triangulares para avisos sonoros sin archivos externos. |

---

## 3. Modelo de Datos y Persistencia (IndexedDB)

La persistencia se implementa mediante una base de datos local llamada `StudyFlow_Persistent_DB` (versión 1). 

### 3.1. Object Stores y Esquemas

#### Store `documents` (Almacenamiento de Archivos PDF)
* **KeyPath**: `id` (string, formato `doc_[timestamp]_[hash]`)
* **Índices**: `uploadDate`
* **Estructura del registro**:
  ```typescript
  interface DocumentRecord {
    id: string;              // Identificador único
    name: string;            // Nombre original del archivo (ej. "Calculo_Cap1.pdf")
    size: number;            // Tamaño en bytes
    pageCount: number;       // Cantidad de páginas calculadas con PDF.js
    uploadDate: string;      // Fecha ISO (ej. "2026-11-11T14:30:00.000Z")
    currentPage: number;     // Última página leída para reanudación de lectura
    data: ArrayBuffer;       // Archivo binario completo para reconstrucción offline
  }
  ```

#### Store `notes` (Post-its y Apuntes)
* **KeyPath**: `id` (string, formato `note_[timestamp]_[hash]`)
* **Índices**: `docId`, `zone`
* **Estructura del registro**:
  ```typescript
  interface StickyNoteRecord {
    id: string;              // Identificador único
    docId: string | null;    // ID del documento asociado (null para notas generales)
    page: number | null;     // Número de página física donde está fijada la nota
    xRatio: number | null;   // Coordenada horizontal relativa (0.0 a 1.0 respecto al canvas)
    yRatio: number | null;   // Coordenada vertical relativa (0.0 a 1.0 respecto al canvas)
    content: string;         // Texto redactado por el usuario
    color: string;           // 'yellow' | 'cyan' | 'green' | 'lavender'
    zone: string;            // 'ideas' | 'preguntas' | 'resumen' | 'tareas'
    createdAt: string;       // Marca temporal ISO
  }
  ```

#### Store `tasks` (Lista de Quehaceres / To-Do)
* **KeyPath**: `id` (string, formato `task_[timestamp]`)
* **Estructura del registro**:
  ```typescript
  interface TaskRecord {
    id: string;              // Identificador de tarea
    title: string;           // Descripción textual
    docId: string | null;    // Documento relacionado (opcional)
    completed: boolean;      // Estado booleano de completitud
    createdAt: string;       // Marca temporal ISO
  }
  ```

---

## 4. Lógica de Negocio y Algoritmos Implementados

### 4.1. Algoritmo de Estimación Pomodoro y Viabilidad Temporal

El cálculo de planificación vincula directamente el volumen documental con la ventana de tiempo disponible:

1. **Volumen de lectura consolidado ($P_{\text{total}}$):**
   $$P_{\text{total}} = \sum_{d \in D_{\text{seleccionados}}} d.\text{pageCount}$$

2. **Tiempo de estudio requerido en minutos ($T_{\text{lectura}}$):**
   $$T_{\text{lectura}} = P_{\text{total}} \times v$$
   *Donde $v$ es la velocidad de lectura configurada por el usuario (por defecto: $3\text{ min/página}$).*

3. **Bloques Pomodoro requeridos ($N_{\text{pomodoros}}$):**
   Considerando bloques de trabajo canónicos de $25\text{ minutos}$:
   $$N_{\text{pomodoros}} = \left\lceil \frac{T_{\text{lectura}}}{25} \right\rceil$$

4. **Tiempo de dedicación integral ($T_{\text{dedicacion}}$):**
   Incluyendo los descansos cortos asociados ($5\text{ minutos}$ por cada bloque):
   $$T_{\text{dedicacion}} = \frac{T_{\text{lectura}} + (N_{\text{pomodoros}} \times 5)}{60} \quad \text{[en horas]}$$

5. **Ventana de tiempo disponible ($H_{\text{limite}}$):**
   Diferencia en horas entre la fecha límite fijada ($\text{Deadline}$) y la hora actual ($\text{Now}$):
   $$H_{\text{limite}} = \frac{\text{Deadline} - \text{Now}}{1000 \times 60 \times 60}$$

6. **Diagnóstico de Viabilidad (Semáforo de Carga):**
   * **Sobrecarga Crítica:** $T_{\text{dedicacion}} > H_{\text{limite}}$ (El tiempo necesario supera el tiempo real disponible).
   * **Horario Ajustado:** $T_{\text{dedicacion}} > (0.65 \times H_{\text{limite}})$ (Se requiere destinar más del 65% del tiempo restante sin pausas largas ni sueño).
   * **Ritmo Óptimo:** $T_{\text{dedicacion}} \le (0.65 \times H_{\text{limite}})$ (Plan sostenible con ritmo distribuido).

7. **Ritmo diario sugerido ($R_{\text{diario}}$):**
   Calculado si $H_{\text{limite}} > 0$:
   $$R_{\text{diario}} = \frac{N_{\text{pomodoros}}}{H_{\text{limite}} / 24} \quad \text{[pomodoros/día]}$$

---

## 5. Descripción Detallada de los Módulos

### Módulo 1: Gestor Documental y Visor PDF con Post-its

* **Zona Drag-and-Drop:** Procesa archivos locales de tipo `application/pdf`, los convierte a `ArrayBuffer`, consulta con PDF.js la propiedad `pdfDoc.numPages` y los persiste en IndexedDB.
* **Visor Interactivo en Canvas:** Renderizado dinámico según el factor de zoom (`zoom = 1.0` por defecto, ajustable de `0.5x` a `2.5x` y botón de ajuste automático a la anchura del contenedor). Guarda automáticamente la última página consultada para cada archivo.
* **Capa de Notas Adhesivas (Overlay):**
  * Capa posicionada de forma absoluta directamente sobre el `<canvas>` del visor.
  * Al activar el modo "Pegar Nota", se calcula la posición en porcentajes relativos ($x_{\text{ratio}} = x / \text{ancho}$, $y_{\text{ratio}} = y / \text{alto}$). Esto asegura que si el usuario hace zoom o redimensiona la ventana, la nota adhesiva conserve con exactitud su ubicación conceptual sobre el texto del documento.
  * Selector de paleta cromática pastel (Amarillo `#fef08a`, Celeste `#bae6fd`, Verde `#bbf7d0`, Lavanda `#e9d5ff`).

### Módulo 2: Temporizador Pomodoro y Lista de Tareas

* **Reloj Circular SVG:** Perímetro del círculo de radio 44 ($2 \times \pi \times 44 \approx 276.46$). El desfase `strokeDashoffset` se actualiza segundo a segundo para brindar retroalimentación visual continua.
* **Control de Modos:**
  * Estudio: $25\text{ minutos}$ ($1500\text{ s}$).
  * Descanso Corto: $5\text{ minutos}$ ($300\text{ s}$).
  * Descanso Largo: $15\text{ minutos}$ ($900\text{ s}$) tras cada 4 ciclos completados.
* **Sintetizador Web Audio API:** Al completar un ciclo, un oscilador senoidal genera un acorde armónico ascendente ($C_5 = 523.25\text{ Hz} \to G_5 = 783.99\text{ Hz}$) con curva de ganancia exponencial para un timbre suave no invasivo.
* **Lista de Tareas:** Permite vincular tareas específicas a documentos existentes en la base de datos o crearlas de forma independiente, con filtros de estado (*Todas*, *Pendientes*, *Completadas*).

### Módulo 3: Pizarra Kanban Interactiva y Exportador PDF

* **Zonas de Clasificación (Swimlanes):**
  1. *Ideas Clave* (`ideas`)
  2. *Preguntas y Repaso* (`preguntas`)
  3. *Resumen y Síntesis* (`resumen`)
  4. *Tareas y Acciones* (`tareas`)
* **Mecanismo Drag-and-Drop HTML5:** Arrastre nativo mediante `dragstart`, `dragover` y `drop`. Cambia la propiedad `zone` del registro en IndexedDB en tiempo real y refresca la vista.
* **Filtro Documental:** Permite aislar visualmente las notas de un documento particular o visualizarlas todas juntas de manera panorámica.
* **Motor de Exportación a PDF (`jsPDF`):**
  * Itera sobre todas las notas (o las del documento filtrado).
  * Agrupa las notas por documento de procedencia.
  * Genera una portada ejecutiva con fecha de exportación, total de notas y separadores de sección.
  * Realiza salto de página automático (`doc.addPage()`) si el alto del bloque supera el límite imprimible de la hoja A4 ($275\text{ mm}$).
  * Divide cadenas de texto largas mediante `doc.splitTextToSize` para evitar truncamientos.

---

## 6. Estado Global de la Aplicación (`AppState`)

El estado reactivo se gestiona centralizadamente a través del objeto `AppState`:

```javascript
const AppState = {
  currentModule: 'docs',       // Módulo activo: 'docs' | 'pomodoro' | 'board'
  db: null,                    // Instancia IDBDatabase
  documents: [],               // Lista de metadatos de documentos cargados
  activeDocId: null,           // ID del documento abierto en el visor
  activePdfDoc: null,          // Objeto proxy de PDF.js
  currentPage: 1,              // Página activa
  totalPages: 0,               // Total de páginas del PDF activo
  zoom: 1.0,                   // Nivel de zoom escalar
  stickyMode: false,           // Flag de captura de clics para notas adhesivas
  selectedColor: 'yellow',     // Color de nota activo
  notes: [],                   // Colección en memoria de notas
  tasks: [],                   // Colección en memoria de tareas
  taskFilter: 'all',           // 'all' | 'pending' | 'completed'
  audioEnabled: true,          // Flag de audio
  audioCtx: null,              // Instancia AudioContext

  planner: {
    deadline: '',              // Cadena ISO local de la fecha límite
    speedMinPerPage: 3,        // Minutos requeridos por página
    selectedDocIds: [],        // Documentos seleccionados para el cálculo
    calculatedPomodoros: 0,    // Total de bloques requeridos calculados
    calculatedWorkMinutes: 25  // Duración estándar del bloque de trabajo
  },

  timer: {
    mode: 'study',             // 'study' | 'short' | 'long'
    studyDuration: 25 * 60,
    shortDuration: 5 * 60,
    longDuration: 15 * 60,
    remainingSeconds: 25 * 60,
    isRunning: false,
    intervalId: null,
    cyclesCompleted: 0,
    totalPlannedPomodoros: 0
  }
};
```

---

## 7. Directrices de Diseño y UX Implementadas

1. **Cero Emojis:** Todos los indicadores visuales, acciones y estados utilizan exclusivamente iconos SVG limpios (estilo Heroicons / Feather).
2. **Sistema de Color Semántico:**
   * Fondo principal: `slate-950` (`#020617`).
   * Superficies de paneles: `slate-900` (`#0f172a`) con bordes en `slate-800` (`#1e293b`).
   * Acentos de marca: `indigo-600` (`#4f46e5`) con sombras `shadow-indigo-600/30`.
   * Éxito/Completitud: `emerald-400` / `emerald-600`.
   * Alertas de plazo: `amber-400` / `rose-500`.
3. **Modales y Diálogos:** No se hace uso de funciones bloqueantes del navegador (`alert()`, `confirm()`). Todas las confirmaciones destructivas se procesan mediante un modal flotante con desenfoque de fondo (`backdrop-blur-sm`).

---

## 8. Guía para Futuras Extensiones (Próximos Pasos para LLMs/Desarrolladores)

Si se desea ampliar la plataforma en iteraciones posteriores, las áreas naturales de crecimiento son:

1. **Búsqueda Full-Text en PDFs:** Utilizar el método `getTextContent()` de PDF.js para permitir búsqueda de términos clave dentro del visor y resaltar ocurrencias.
2. **Resaltador de Texto Vectorial:** Añadir una capa de selección de texto (`TextLayer` de PDF.js) para permitir marcaje directo de párrafos además de las notas adhesivas flotantes.
3. **Sincronización en la Nube:** Crear un conector opcional a WebDAV, Google Drive o Supabase manteniendo el esquema actual de IndexedDB como capa de caché local sin conexión.
4. **Exportación Markdown:** Incorporar una función adicional en la pizarra para descargar todas las notas como un archivo Markdown estructurado con títulos por zona y enlaces a páginas del documento.