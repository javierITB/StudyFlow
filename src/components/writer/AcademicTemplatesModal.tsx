import React from 'react';
import { BookOpen, FileText, FlaskConical, Lightbulb, Sparkles, X } from 'lucide-react';

export interface AcademicTemplate {
  id: string;
  name: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
  defaultTitle: string;
  targetWords: number;
  htmlContent: string;
}

export const ACADEMIC_TEMPLATES: AcademicTemplate[] = [
  {
    id: 'essay',
    name: 'Ensayo Académico Argumentativo',
    badge: '1,200 palabras · Argumentación',
    description: 'Estructura clásica de tesis, fundamentación en 3 argumentos con evidencias, refutación y conclusión.',
    icon: <FileText className="w-5 h-5 text-indigo-400" />,
    defaultTitle: 'Ensayo: [Título de tu Investigación]',
    targetWords: 1200,
    htmlContent: `
      <table data-width="100%" data-align="center">
        <tbody>
          <tr>
            <th colspan="2" style="background-color: #312e81; color: #ffffff; font-size: 13pt; padding: 10px 14px; text-align: center; letter-spacing: 0.05em;">
              ENSAYO ACADÉMICO ARGUMENTATIVO
            </th>
          </tr>
          <tr>
            <td style="width: 50%;">
              <strong>Asignatura / Cátedra:</strong> [Nombre del Ramo]<br />
              <strong>Autor(a):</strong> [Tu Nombre Completo]
            </td>
            <td style="width: 50%;">
              <strong>Fecha de Entrega:</strong> ${new Date().toLocaleDateString('es-ES')}<br />
              <strong>Extensión Meta:</strong> 1.200 palabras sugeridas
            </td>
          </tr>
        </tbody>
      </table>

      <h1 style="text-align: center; margin-top: 1.5em; margin-bottom: 0.3em;">[Título Central del Ensayo o Pregunta Controversial]</h1>
      <p style="text-align: center; color: #64748b; font-size: 11pt; margin-bottom: 1.5em;"><em>Subtítulo: Delimitación del problema y alcance analítico</em></p>

      <blockquote style="border-left: 4px solid #6366f1; background-color: #f8fafc; padding: 14px 18px; margin: 1.5em 0; border-radius: 0 8px 8px 0;">
        <p style="margin-bottom: 6px; color: #4338ca; font-weight: bold; font-size: 11pt;">
          💡 TESIS CENTRAL O HIPÓTESIS DE PARTIDA
        </p>
        <p style="font-style: italic; color: #1e293b;">
          [Formula aquí en 1 o 2 oraciones contundentes la postura central que defenderás a lo largo de este ensayo. Ejemplo: «A pesar del avance de los modelos automatizados, el juicio crítico y la deliberación ética humana continúan siendo indispensables en la validación del conocimiento científico.»]
        </p>
      </blockquote>

      <h2>1. Introducción y Contextualización del Problema</h2>
      <p>Inicia presentando el panorama general del fenómeno en estudio. Explica por qué este debate es relevante en el estado actual de la disciplina y cuáles son las principales posturas encontradas. Concluye este apartado enunciando claramente tu tesis y adelantando la hoja de ruta argumentativa que seguirás en las siguientes secciones.</p>

      <h2>2. Primer Argumento: Fundamentación Teórica y Conceptual</h2>
      <p>Desarrolla aquí tu premisa analítica principal. Apóyate en autores seminales y marcos teóricos consolidados para fundamentar el rigor de tu afirmación.</p>

      <blockquote style="border-left: 3px solid #94a3b8; background-color: #f1f5f9; padding: 10px 16px; margin: 1.2em 0; font-style: italic;">
        <p>«Inserta aquí una cita textual relevante importada directamente desde tus lecturas en StudyFlexConnect mediante el Cajón de Citas de la derecha.»</p>
        <p style="text-align: right; font-size: 9.5pt; color: #64748b; font-style: normal; margin-top: 4px;">
          — Apellido, N. (Año), <em>Título de la Obra o Artículo</em>, pág. XX.
        </p>
      </blockquote>

      <p>Analiza e interpreta la cita anterior: explica de qué modo esta evidencia convalida el primer pilar de tu postura.</p>

      <h2>3. Segundo Argumento: Evidencia Empírica y Casos de Estudio</h2>
      <p>Presenta datos observables, investigaciones aplicadas o situaciones prácticas contrastables que demuestren que tu tesis cuenta con respaldo en la realidad operativa.</p>

      <h2>4. Sección Dialéctica: Contraargumento y Refutación</h2>
      <p>Un ensayo académico riguroso examina de frente las objeciones más serias de sus detractores para desmantelarlas o matizarlas:</p>

      <table data-width="100%" data-align="center">
        <tbody>
          <tr>
            <th style="background-color: #fee2e2; color: #991b1b; width: 50%;">
              ⚠️ Contraargumento (Objeción del Crítico)
            </th>
            <th style="background-color: #dcfce7; color: #166534; width: 50%;">
              🛡️ Refutación y Defensa Argumental
            </th>
          </tr>
          <tr>
            <td>
              <em>«Quienes se oponen a esta postura sostienen que [describe aquí la objeción más fuerte que podría plantearse]...»</em>
            </td>
            <td>
              <em>«Sin embargo, esta objeción pierde solidez al considerar que [presenta tu contra-evidencia empírica o analítica]...»</em>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>5. Conclusiones y Proyecciones</h2>
      <p>Recapitula sintéticamente los hallazgos sin limitarte a repetir la introducción. Responde a la pregunta: <em>¿Qué implicancias prácticas o éticas tiene haber demostrado esta tesis?</em> Señala posibles vacíos o nuevas preguntas de investigación que quedan abiertas para futuros estudios.</p>

      <hr />

      <h2>Referencias Bibliográficas (Formato APA 7ma Ed.)</h2>
      <p style="padding-left: 2em; text-indent: -2em; margin-bottom: 0.6em;">
        Apellido, A. A., & Apellido, B. B. (2024). <em>Título del libro o publicación científica</em>. Editorial o Nombre de la Revista, 12(3), 45-67.
      </p>
      <p style="padding-left: 2em; text-indent: -2em; margin-bottom: 0.6em;">
        Apellido, C. C. (2023). <em>Metodología de la investigación académica contemporánea</em>. Ediciones Universitarias.
      </p>
    `,
  },
  {
    id: 'feynman_synthesis',
    name: 'Síntesis Técnica Feynman',
    badge: '600 palabras · Dominio Conceptual',
    description: 'Explica un tema complejo con tus propias palabras simples, detecta vacíos y genera analogías intuitivas.',
    icon: <Lightbulb className="w-5 h-5 text-amber-400" />,
    defaultTitle: 'Síntesis Feynman: [Concepto a Dominar]',
    targetWords: 600,
    htmlContent: `
      <table data-width="100%" data-align="center">
        <tbody>
          <tr>
            <th colspan="2" style="background-color: #b45309; color: #ffffff; font-size: 13pt; padding: 10px 14px; text-align: center; letter-spacing: 0.05em;">
              MÉTODO FEYNMAN · PROTOCOLO DE DOMINIO CONCEPTUAL
            </th>
          </tr>
          <tr>
            <td style="width: 50%;">
              <strong>Concepto / Teorema Clave:</strong> [Nombre del Concepto]<br />
              <strong>Materia / Ramo:</strong> [Nombre de la Asignatura]
            </td>
            <td style="width: 50%;">
              <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}<br />
              <strong>Meta:</strong> Explicación sin lagunas en 4 pasos
            </td>
          </tr>
        </tbody>
      </table>

      <h1 style="text-align: center; margin-top: 1.5em; margin-bottom: 0.3em;">Síntesis Feynman: [Concepto a Dominar]</h1>
      <p style="text-align: center; color: #b45309; font-size: 11pt; margin-bottom: 1.5em;"><strong>Regla de Oro: Si no puedes explicarlo en lenguaje simple, aún no lo comprendes con suficiente profundidad.</strong></p>

      <table data-width="100%">
        <tbody>
          <tr>
            <th style="background-color: #fef3c7; color: #92400e; border-left: 4px solid #f59e0b;">
              PASO 1 · EXPLICACIÓN EN LENGUAJE COTIDIANO (Cero Jerga Técnica)
            </th>
          </tr>
          <tr>
            <td style="background-color: #fffbeb;">
              <p><em>Imagina que se lo explicas a una persona de 10 años o a un familiar sin formación en tu carrera. Prohibido usar tecnicismos salvo que los definas en la misma oración con palabras ordinarias:</em></p>
              <p>[Escribe aquí tu explicación en palabras simples y directas...]</p>
            </td>
          </tr>
        </tbody>
      </table>

      <table data-width="100%">
        <tbody>
          <tr>
            <th style="background-color: #dbeafe; color: #1e40af; border-left: 4px solid #3b82f6;">
              PASO 2 · LA ANALOGÍA DEL MUNDO REAL
            </th>
          </tr>
          <tr>
            <td style="background-color: #eff6ff;">
              <p><em>¿A qué mecanismo, objeto o experiencia de la vida cotidiana se parece este concepto? Las buenas analogías fijan la intuición en la memoria a largo plazo:</em></p>
              <p><strong>«Este concepto se parece a... porque cuando ocurre... el sistema responde...»</strong></p>
              <p>[Detalla aquí la comparación y sus límites: en qué se parece y en qué difiere...]</p>
            </td>
          </tr>
        </tbody>
      </table>

      <table data-width="100%">
        <tbody>
          <tr>
            <th style="background-color: #fce7f3; color: #9d174d; border-left: 4px solid #ec4899;">
              PASO 3 · DETECCIÓN DE LAGUNAS Y PUNTOS CIEGOS
            </th>
          </tr>
          <tr>
            <td style="background-color: #fdf2f8;">
              <p><em>¿En qué parte de tu explicación titubeaste o recurriste a una fórmula de memoria sin entender el porqué? Anota aquí esas dudas para revisarlas en el Visor:</em></p>
              <p>• <strong>Laguna 1:</strong> ¿Por qué ocurre exactamente que...? <em>[Respuesta clarificada tras consultar el material]</em></p>
              <p>• <strong>Laguna 2:</strong> ¿Bajo qué condiciones este modelo deja de cumplirse? <em>[Respuesta clarificada]</em></p>
            </td>
          </tr>
        </tbody>
      </table>

      <table data-width="100%">
        <tbody>
          <tr>
            <th style="background-color: #ede9fe; color: #5b21b6; border-left: 4px solid #8b5cf6;">
              PASO 4 · MODELO FORMAL O FORMULACIÓN MATEMÁTICA REFINADA
            </th>
          </tr>
          <tr>
            <td style="background-color: #f5f3ff;">
              <p><em>Escribe la fórmula, teorema o esquema formal y descompón el significado físico o lógico de cada uno de sus términos:</em></p>
              <blockquote style="text-align: center; font-size: 14pt; color: #4c1d95; background: #ffffff; border: 1px dashed #c4b5fd; padding: 10px; margin: 10px 0;">
                <strong>[ E = m · c² ]</strong> o tu fórmula matemática
              </blockquote>
              <table data-width="100%">
                <tbody>
                  <tr>
                    <th style="width: 25%;">Variable / Símbolo</th>
                    <th style="width: 50%;">Significado Conceptual en Palabras Claras</th>
                    <th style="width: 25%;">Unidades de Medida</th>
                  </tr>
                  <tr>
                    <td><strong>X</strong></td>
                    <td>Magnitud independiente de entrada</td>
                    <td>[Unidad SI]</td>
                  </tr>
                  <tr>
                    <td><strong>Y</strong></td>
                    <td>Respuesta o efecto resultante en el sistema</td>
                    <td>[Unidad SI]</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    `,
  },
  {
    id: 'lab_report',
    name: 'Informe Científico / Laboratorio',
    badge: '1,500 palabras · IMRyD',
    description: 'Formato estándar IMRyD (Introducción, Metodología, Resultados con Tablas y Discusión).',
    icon: <FlaskConical className="w-5 h-5 text-emerald-400" />,
    defaultTitle: 'Informe Experimental: [Nombre de la Práctica]',
    targetWords: 1500,
    htmlContent: `
      <table data-width="100%" data-align="center">
        <tbody>
          <tr>
            <th colspan="2" style="background-color: #065f46; color: #ffffff; font-size: 14pt; padding: 12px; text-align: center; letter-spacing: 0.05em;">
              INFORME DE LABORATORIO EXPERIMENTAL (FORMATO IMRyD)
            </th>
          </tr>
          <tr>
            <td style="width: 50%;">
              <strong>Práctica Nº:</strong> [01] · <strong>Título:</strong> [Nombre de la Experiencia]<br />
              <strong>Laboratorio / Cátedra:</strong> [Nombre de la Asignatura]<br />
              <strong>Profesor(a) / Guía:</strong> [Nombre del Docente]
            </td>
            <td style="width: 50%;">
              <strong>Grupo de Trabajo Nº:</strong> [XX]<br />
              <strong>Integrantes:</strong> [Nombre 1, Nombre 2, Nombre 3]<br />
              <strong>Fecha de Realización:</strong> ${new Date().toLocaleDateString('es-ES')}
            </td>
          </tr>
        </tbody>
      </table>

      <h1 style="text-align: center; margin-top: 1.5em; margin-bottom: 0.3em;">Informe Experimental: [Título de la Experiencia]</h1>
      <p style="text-align: center; color: #047857; font-size: 11pt; margin-bottom: 1.5em;"><em>Determinación cuantitativa de variables y contraste de hipótesis</em></p>

      <blockquote style="border-left: 4px solid #10b981; background-color: #f0fdf4; padding: 14px 18px; margin: 1.5em 0; border-radius: 0 8px 8px 0;">
        <p style="margin-bottom: 6px; color: #065f46; font-weight: bold; font-size: 11pt;">
          🔬 RESUMEN EJECUTIVO (ABSTRACT)
        </p>
        <p style="font-style: italic; color: #1e293b;">
          [Síntesis en un solo párrafo continuo (150–200 palabras) de la experiencia completa: explicita el fenómeno físico/químico estudiado, el principio metodológico y sensores utilizados, los valores cuantitativos clave obtenidos con su correspondiente incertidumbre instrumental (±) y la conclusión fundamental que valida o rechaza la hipótesis de trabajo.]
        </p>
      </blockquote>

      <h2>1. Objetivos de la Práctica</h2>
      <p>• <strong>Objetivo General:</strong> Determinar experimentalmente el comportamiento de [variable Y] en función de [variable X] bajo condiciones controladas de laboratorio.</p>
      <p>• <strong>Objetivos Específicos:</strong></p>
      <p style="margin-left: 1.5em;">1. Calibrar los sensores e instrumentos de medición minimizando errores sistemáticos.</p>
      <p style="margin-left: 1.5em;">2. Obtener una curva empírica de datos a partir de N repeticiones estadísticas.</p>
      <p style="margin-left: 1.5em;">3. Contrastar la pendiente de ajuste con el modelo teórico de referencia.</p>

      <h2>2. Metodología e Instrumental Utilizado</h2>
      <p>Describe el montaje experimental paso a paso. Indica las precauciones de seguridad y las fuentes de incertidumbre de cada equipo:</p>

      <table data-width="100%" data-align="center">
        <tbody>
          <tr>
            <th style="width: 35%;">Instrumento / Sensor</th>
            <th style="width: 30%;">Rango Operativo</th>
            <th style="width: 35%;">Incertidumbre Instrumental (±)</th>
          </tr>
          <tr>
            <td>Sensor de Medición / Multímetro</td>
            <td>0.0 - 100.0 unidades</td>
            <td>± 0.2 unidades</td>
          </tr>
          <tr>
            <td>Balanza Analítica / Calibre</td>
            <td>0.0 - 500.0 g</td>
            <td>± 0.01 g</td>
          </tr>
          <tr>
            <td>Cronómetro Digital</td>
            <td>0.0 - 3600.0 s</td>
            <td>± 0.01 s</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Tabla de Registro de Datos Experimentales</h2>
      <p>Valores tabulados a lo largo de las distintas series de muestreo:</p>

      <table data-width="100%" data-align="center">
        <tbody>
          <tr>
            <th style="width: 15%; text-align: center;">Ensayo #</th>
            <th style="width: 28%; text-align: center;">Var. Independiente (x)</th>
            <th style="width: 28%; text-align: center;">Var. Dependiente (y)</th>
            <th style="width: 29%; text-align: center;">Error Estimado (± Δy)</th>
          </tr>
          <tr>
            <td style="text-align: center;">1</td>
            <td style="text-align: center;">10.00</td>
            <td style="text-align: center;">24.35</td>
            <td style="text-align: center;">± 0.15</td>
          </tr>
          <tr>
            <td style="text-align: center;">2</td>
            <td style="text-align: center;">20.00</td>
            <td style="text-align: center;">48.12</td>
            <td style="text-align: center;">± 0.18</td>
          </tr>
          <tr>
            <td style="text-align: center;">3</td>
            <td style="text-align: center;">30.00</td>
            <td style="text-align: center;">71.80</td>
            <td style="text-align: center;">± 0.22</td>
          </tr>
          <tr>
            <td style="text-align: center;">4</td>
            <td style="text-align: center;">40.00</td>
            <td style="text-align: center;">96.05</td>
            <td style="text-align: center;">± 0.25</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Discusión de Resultados y Análisis de Error</h2>
      <p>Interpreta el comportamiento de los datos empíricos. Compara el valor experimental obtenido contra el valor teórico aceptado y calcula el error porcentual:</p>

      <blockquote style="border-left: 3px solid #059669; background-color: #ecfdf5; padding: 10px 14px; margin: 1em 0;">
        <p><strong>Cálculo de Error Porcentual:</strong> % Error = [ |V_teórico - V_experimental| / V_teórico ] × 100%</p>
        <p><em>Error obtenido en la práctica: [X.XX] % — [Indica si el resultado se encuentra dentro del rango admisible de tolerancia experimental].</em></p>
      </blockquote>

      <p>¿Qué factores explican las discrepancias observadas? Discute pérdidas por fricción, tolerancias térmicas o limitaciones del instrumental.</p>

      <h2>5. Conclusiones y Recomendaciones</h2>
      <p>1. Se logró convalidar la relación funcional predicha por el modelo teórico.</p>
      <p>2. Se recomienda para experiencias futuras utilizar instrumental de mayor resolución para acotar la incertidumbre inicial.</p>

      <hr />

      <h2>Referencias Bibliográficas</h2>
      <p style="padding-left: 2em; text-indent: -2em;">
        Giancoli, D. C. (2018). <em>Física experimental para ciencias e ingeniería</em>. Pearson Educación.
      </p>
    `,
  },
  {
    id: 'monograph',
    name: 'Monografía / Trabajo de Investigación',
    badge: '2,500 palabras · Extenso',
    description: 'Estructura por capítulos y secciones con portada, marco conceptual y desarrollo temático.',
    icon: <BookOpen className="w-5 h-5 text-purple-400" />,
    defaultTitle: 'Monografía: [Tema Central de Estudio]',
    targetWords: 2500,
    htmlContent: `
      <table data-width="100%" data-align="center">
        <tbody>
          <tr>
            <th style="background-color: #581c87; color: #ffffff; text-align: center; font-size: 13pt; padding: 14px; letter-spacing: 0.08em;">
              UNIVERSIDAD O INSTITUCIÓN ACADÉMICA<br />
              <span style="font-size: 10pt; font-weight: normal; opacity: 0.9;">FACULTAD DE [TU FACULTAD] · DEPARTAMENTO DE [TU DEPARTAMENTO]</span>
            </th>
          </tr>
        </tbody>
      </table>

      <h1 style="text-align: center; font-size: 22pt; font-weight: 800; line-height: 1.3; text-transform: uppercase; margin-top: 2em;">
        [TÍTULO COMPLETO DE LA MONOGRAFÍA O INVESTIGACIÓN ACADÉMICA]
      </h1>

      <p style="text-align: center; color: #64748b; font-size: 12pt; margin-top: 12px; margin-bottom: 30px;">
        <em>Subtítulo: Estudio crítico, análisis comparativo o propuesta aplicada</em>
      </p>

      <table data-width="80%" data-align="center">
        <tbody>
          <tr>
            <td style="padding: 14px 20px; border: 1px dashed #cbd5e1; background-color: #faf5ff;">
              <p><strong>Autor(a):</strong> [Tu Nombre Completo]</p>
              <p><strong>Profesor(a) Guía / Tutor:</strong> [Nombre del Docente]</p>
              <p><strong>Cátedra / Seminario:</strong> [Nombre de la Asignatura]</p>
              <p><strong>Ciudad y Fecha:</strong> [Tu Ciudad], ${new Date().toLocaleDateString('es-ES')}</p>
            </td>
          </tr>
        </tbody>
      </table>

      <div data-type="page-break"></div>

      <h2 style="text-align: center; margin-top: 1.5em;">ÍNDICE GENERAL DE CONTENIDOS</h2>
      <hr />

      <table data-width="100%">
        <tbody>
          <tr>
            <th style="width: 80%;">Sección / Capítulo</th>
            <th style="width: 20%; text-align: right;">Página</th>
          </tr>
          <tr>
            <td>Resumen Ejecutivo (Abstract) y Palabras Clave</td>
            <td style="text-align: right;">Pág. 2</td>
          </tr>
          <tr>
            <td>1. Introducción, Justificación y Delimitación</td>
            <td style="text-align: right;">Pág. 3</td>
          </tr>
          <tr>
            <td>2. Marco Teórico y Estado del Arte</td>
            <td style="text-align: right;">Pág. 4</td>
          </tr>
          <tr>
            <td>3. Desarrollo Temático y Análisis Crítico</td>
            <td style="text-align: right;">Pág. 6</td>
          </tr>
          <tr>
            <td>4. Conclusiones, Discusión y Recomendaciones</td>
            <td style="text-align: right;">Pág. 9</td>
          </tr>
          <tr>
            <td>5. Bibliografía General y Fuentes Consultadas</td>
            <td style="text-align: right;">Pág. 11</td>
          </tr>
        </tbody>
      </table>

      <div data-type="page-break"></div>

      <h2>Resumen Ejecutivo y Palabras Clave (Keywords)</h2>
      <blockquote style="border-left: 4px solid #8b5cf6; background-color: #faf5ff; padding: 14px 18px; margin: 1.5em 0; border-radius: 0 8px 8px 0;">
        <p><strong>Resumen (250 palabras máx):</strong></p>
        <p style="font-style: italic;">
          [Presenta una síntesis completa de la investigación: problema investigado, marco teórico, metodología, principales hallazgos descubiertos y conclusión nuclear de la tesis.]
        </p>
        <p style="margin-top: 10px; font-size: 10pt; color: #581c87;">
          <strong>Palabras Clave:</strong> [Palabra 1] · [Palabra 2] · [Palabra 3] · [Palabra 4] · [Palabra 5].
        </p>
      </blockquote>

      <h2>1. Introducción y Justificación</h2>
      <p>Plantea el problema de investigación con precisión. ¿Cuál es el vacío de conocimiento o conflicto disciplinar que justifica la elaboración de este trabajo? Delimita el marco temporal, geográfico o conceptual en el cual se inscribe el estudio.</p>

      <h2>2. Marco Teórico y Estado del Arte</h2>
      <p>Revisa la literatura científica previa relevante. Contrasta las principales corrientes teóricas que han intentado dar respuesta al problema planteado.</p>

      <h2>3. Desarrollo Temático y Discusión Analítica</h2>
      <p>Constituye el cuerpo central de la monografía. Divide este apartado en subsecciones temáticas numeradas (3.1, 3.2, 3.3) para desplegar el análisis con coherencia deductiva.</p>

      <h2>4. Conclusiones y Líneas Futuras</h2>
      <p>Sintetiza las respuestas a las preguntas de investigación formuladas inicialmente. Señala las limitaciones encontradas y propone preguntas abiertas para futuras investigaciones.</p>

      <hr />

      <h2>Referencias Bibliográficas</h2>
      <p style="padding-left: 2em; text-indent: -2em; margin-bottom: 0.6em;">
        Hernández Sampieri, R., Fernández Collado, C., & Baptista Lucio, P. (2018). <em>Metodología de la investigación</em> (6ta ed.). McGraw-Hill Education.
      </p>
    `,
  },
];

interface AcademicTemplatesModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (template: AcademicTemplate) => void;
}

export const AcademicTemplatesModal: React.FC<AcademicTemplatesModalProps> = ({
  open,
  onClose,
  onSelectTemplate,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Plantillas Académicas Guiadas</h3>
              <p className="text-[11px] text-slate-400">
                Estructuras probadas para redactar ensayos, informes y síntesis sin empezar en blanco.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de plantillas */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {ACADEMIC_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => {
                onSelectTemplate(tmpl);
                onClose();
              }}
              className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 cursor-pointer transition-all group flex items-start gap-3.5"
            >
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-700/60 group-hover:border-indigo-400/60 transition-colors flex-shrink-0 mt-0.5">
                {tmpl.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {tmpl.name}
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                    {tmpl.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {tmpl.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Pie */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <span>El contenido de la plantilla se cargará en el editor actual.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
