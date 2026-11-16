import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Image } from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { CustomTable, CustomTableRow, CustomTableCell, CustomTableHeader, LineHeight } from '../../lib/tiptap/CustomTableExtensions';
import { PageBreak } from '../../lib/tiptap/PageBreak';
import { FontSize } from '../../lib/tiptap/fontSize';
import { AutoPaginationExtension } from '../../lib/tiptap/AutoPaginationExtension';
import { WriterToolbar } from './WriterToolbar';
import { CitationsDrawer } from './CitationsDrawer';
import { AcademicTemplatesModal, AcademicTemplate, ACADEMIC_TEMPLATES } from './AcademicTemplatesModal';
import { TemplatesWelcomeHub } from './TemplatesWelcomeHub';
import { DocumentRecord, FolderRecord, StickyNoteRecord, StudyWorkDraft } from '../../types/studyflow';
import { exportHtmlToDocx, exportHtmlToMarkdown, exportHtmlToPdf, printFormattedDocument } from '../../lib/docxExport';
import { Clock, Expand, FileText, Target } from 'lucide-react';
import { useTimer } from '../../context/TimerContext';

interface StudyWriterProps {
  works: StudyWorkDraft[];
  activeWorkId?: string | null;
  onSelectWork?: (id: string | null) => void;
  notes: StickyNoteRecord[];
  documents: DocumentRecord[];
  folders: FolderRecord[];
  onSaveWork: (work: StudyWorkDraft) => Promise<void>;
  onCreateNewWork?: (template?: AcademicTemplate | null) => Promise<StudyWorkDraft>;
  onDeleteWork?: (id: string) => Promise<void>;
  onExportWorkToReadings: (work: StudyWorkDraft, targetFolderId: string | null) => Promise<void>;
  onNotify: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  templatesOpen?: boolean;
  onSetTemplatesOpen?: (open: boolean) => void;
  exportFolderModalOpen?: boolean;
  onSetExportFolderModalOpen?: (open: boolean) => void;
}

export const StudyWriter: React.FC<StudyWriterProps> = ({
  works,
  activeWorkId: activeWorkIdProp,
  onSelectWork,
  notes,
  documents,
  folders,
  onSaveWork,
  onCreateNewWork,
  onDeleteWork,
  onExportWorkToReadings,
  onNotify,
  templatesOpen: templatesOpenProp,
  onSetTemplatesOpen: onSetTemplatesOpenProp,
  exportFolderModalOpen: exportFolderModalOpenProp,
  onSetExportFolderModalOpen: onSetExportFolderModalOpenProp,
}) => {
  const { isStopwatchActive, elapsedSeconds, remainingSeconds } = useTimer();

  const [internalActiveWorkId] = useState<string | null>(null);

  const activeWorkId = activeWorkIdProp !== undefined ? activeWorkIdProp : internalActiveWorkId;

  const activeWork = useMemo(() => {
    if (!activeWorkId) return null;
    return works.find((w) => w.id === activeWorkId) || null;
  }, [works, activeWorkId]);

  const [title, setTitle] = useState<string>(activeWork?.title || 'Trabajo sin título');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isPagedMode, setIsPagedMode] = useState<boolean>(true);
  const [paperFormat, setPaperFormat] = useState<'letter' | 'legal' | 'a4'>(
    activeWork?.paperSize || 'letter'
  );
  const [pageInfo, setPageInfo] = useState<{
    pageCount: number;
    currentPage: number;
    lastPageFillerPx: number;
  }>({
    pageCount: 1,
    currentPage: 1,
    lastPageFillerPx: 760,
  });
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [citationsOpen, setCitationsOpen] = useState<boolean>(false);
  const [internalTemplatesOpen, setInternalTemplatesOpen] = useState<boolean>(false);
  const templatesOpen = templatesOpenProp !== undefined ? templatesOpenProp : internalTemplatesOpen;
  const setTemplatesOpen = onSetTemplatesOpenProp ?? setInternalTemplatesOpen;

  const [targetModalOpen, setTargetModalOpen] = useState<boolean>(false);
  const [internalExportModalOpen, setInternalExportModalOpen] = useState<boolean>(false);
  const exportFolderModalOpen =
    exportFolderModalOpenProp !== undefined
      ? exportFolderModalOpenProp
      : internalExportModalOpen;
  const setExportFolderModalOpen =
    onSetExportFolderModalOpenProp ?? setInternalExportModalOpen;
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Control de creación y prevención de duplicados al pulsar plantillas
  const [isCreatingWork, setIsCreatingWork] = useState<boolean>(false);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const isCreatingRef = useRef<boolean>(false);

  // Referencia al contenedor de trabajo para ajuste dinámico de zoom (Fit to Screen)
  const workspaceContainerRef = useRef<HTMLDivElement>(null);

  // Refs actualizadas para evitar cierres obsoletos dentro de TipTap onUpdate
  const activeWorkRef = useRef<StudyWorkDraft | null>(activeWork);
  activeWorkRef.current = activeWork;
  const titleRef = useRef<string>(title);
  titleRef.current = title;
  const paperFormatRef = useRef<'letter' | 'legal' | 'a4'>(paperFormat);
  paperFormatRef.current = paperFormat;

  // Métricas de ritmo de redacción
  const sessionStartWordsRef = useRef<number>(0);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const [sessionWordsWritten, setSessionWordsWritten] = useState<number>(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        underline: false,
        link: false,
      }),
      Underline,
      FontFamily,
      TextStyle,
      FontSize,
      LineHeight,
      Image,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'tableCell', 'tableHeader'],
      }),
      CustomTable.configure({ resizable: true }),
      CustomTableRow,
      CustomTableCell,
      CustomTableHeader,
      PageBreak,
      AutoPaginationExtension.configure({
        enabled: isPagedMode,
        paperFormat: paperFormat,
        onPaginationChange: (info) => {
          setPageInfo(info);
        },
      }),
    ],
    content: activeWork?.contentHtml || '<p>Comienza a redactar tu trabajo...</p>',
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setSessionWordsWritten(Math.max(0, words - sessionStartWordsRef.current));

      const currentWork = activeWorkRef.current;
      if (currentWork) {
        const updated: StudyWorkDraft = {
          ...currentWork,
          title: titleRef.current,
          paperSize: paperFormatRef.current,
          contentHtml: editor.getHTML(),
          contentText: text,
          wordCount: words,
          updatedAt: new Date().toISOString(),
        };
        void onSaveWork(updated);
      }
    },
  });

  // Sincronizar formato de papel con la extensión
  useEffect(() => {
    if (editor && editor.commands.setPaperFormat) {
      editor.commands.setPaperFormat(paperFormat);
    }
  }, [editor, paperFormat]);

  // Sincronizar modo paginado con la extensión
  useEffect(() => {
    if (editor && editor.commands.setPaginationEnabled) {
      editor.commands.setPaginationEnabled(isPagedMode);
    }
  }, [editor, isPagedMode]);

  // Al cambiar de trabajo activo
  useEffect(() => {
    if (activeWork) {
      setTitle(activeWork.title);
      const nextFormat: 'letter' | 'legal' | 'a4' =
        activeWork.paperSize ||
        ((typeof window !== 'undefined' &&
          (window.localStorage.getItem('sf_writer_default_paper_format') as
            | 'letter'
            | 'legal'
            | 'a4'
            | null)) ||
          'letter');
      setPaperFormat(nextFormat);
      if (editor && editor.commands.setPaperFormat) {
        editor.commands.setPaperFormat(nextFormat);
      }
      if (editor && editor.getHTML() !== activeWork.contentHtml) {
        editor.commands.setContent(activeWork.contentHtml || '<p>Comienza a redactar tu trabajo...</p>');
        const text = editor.getText();
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        sessionStartWordsRef.current = words;
        sessionStartTimeRef.current = Date.now();
        setSessionWordsWritten(0);
      }
    }
  }, [activeWork?.id, editor]);

  // Manejo de cambio de formato de papel (aplica a todo el documento completo y recuerda preferencia)
  const handleChangePaperFormat = (newFormat: 'letter' | 'legal' | 'a4') => {
    setPaperFormat(newFormat);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('sf_writer_default_paper_format', newFormat);
      } catch {
        // Ignorar
      }
    }
    if (editor && editor.commands.setPaperFormat) {
      editor.commands.setPaperFormat(newFormat);
    }
    if (activeWork && editor) {
      const updated: StudyWorkDraft = {
        ...activeWork,
        title,
        paperSize: newFormat,
        contentHtml: editor.getHTML(),
        contentText: editor.getText(),
        updatedAt: new Date().toISOString(),
      };
      void onSaveWork(updated);
    }
  };

  // Manejo de cambio de título
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (activeWork && editor) {
      const updated: StudyWorkDraft = {
        ...activeWork,
        title: newTitle,
        paperSize: paperFormat,
        contentHtml: editor.getHTML(),
        contentText: editor.getText(),
        updatedAt: new Date().toISOString(),
      };
      void onSaveWork(updated);
    }
  };

  // Zoom handlers y Ajuste al Ancho
  const handleZoomIn = () => setZoomLevel((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.55, Number((z - 0.1).toFixed(2))));
  const handleZoomReset = () => setZoomLevel(1);

  const handleZoomFit = useCallback(() => {
    if (!workspaceContainerRef.current) return;
    const available = workspaceContainerRef.current.clientWidth - 48; // padding lateral
    const paperPx = paperFormat === 'a4' ? 794 : 816;
    const target = Math.min(1.2, Math.max(0.55, available / paperPx));
    setZoomLevel(Number(target.toFixed(2)));
    onNotify(`Vista adaptada (${Math.round(target * 100)}%)`, 'info');
  }, [paperFormat, onNotify]);

  // Insertar cita del drawer
  const handleInsertCitation = useCallback(
    (citationHtml: string) => {
      if (editor) {
        editor.chain().focus().insertContent(citationHtml).run();
        onNotify('Cita insertada en el borrador', 'success');
      }
    },
    [editor, onNotify]
  );

  // Aplicar plantilla académica
  const handleSelectTemplate = useCallback(
    (tmpl: AcademicTemplate) => {
      if (editor) {
        setTitle(tmpl.defaultTitle);
        editor.commands.setContent(tmpl.htmlContent);
        if (activeWork) {
          const text = editor.getText();
          const words = text.trim() ? text.trim().split(/\s+/).length : 0;
          const updated: StudyWorkDraft = {
            ...activeWork,
            title: tmpl.defaultTitle,
            contentHtml: tmpl.htmlContent,
            contentText: text,
            wordCount: words,
            targetWordCount: tmpl.targetWords,
            updatedAt: new Date().toISOString(),
          };
          void onSaveWork(updated);
          onNotify(`Plantilla "${tmpl.name}" cargada correctamente`, 'success');
        }
      }
    },
    [editor, activeWork, onSaveWork, onNotify]
  );

  // Exportar a DOCX con dimensiones físicas exactas
  const handleExportDocx = async () => {
    if (!editor) return;
    try {
      await exportHtmlToDocx(editor.getHTML(), title, paperFormat);
      onNotify(`Documento Word (.docx) en formato ${paperFormat === 'legal' ? 'Oficio' : paperFormat === 'a4' ? 'A4' : 'Carta'} descargado`, 'success');
    } catch {
      onNotify('No se pudo generar el archivo .docx', 'error');
    }
  };

  // Descargar PDF directo sin abrir pestañas ni bloquear la ventana
  const handleExportPdf = async () => {
    if (!editor) return;
    onNotify('Generando PDF con tus márgenes y formato exacto...', 'info');
    try {
      await exportHtmlToPdf(editor.getHTML(), title, paperFormat);
      onNotify(`PDF (${paperFormat === 'legal' ? 'Oficio' : paperFormat === 'a4' ? 'A4' : 'Carta'}) descargado correctamente`, 'success');
    } catch {
      onNotify('No se pudo generar el archivo PDF', 'error');
    }
  };

  // Imprimir mediante iframe oculto sin abrir pestañas nuevas
  const handlePrintPdf = () => {
    if (!editor) return;
    printFormattedDocument(title, editor.getHTML(), paperFormat);
  };

  // Exportar a Markdown
  const handleExportMarkdown = () => {
    if (!editor) return;
    const md = exportHtmlToMarkdown(editor.getHTML());
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.trim().replace(/\s+/g, '_') || 'trabajo'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify('Archivo Markdown (.md) descargado', 'success');
  };

  // Agregar a Lecturas
  const handleConfirmAddToReadings = async () => {
    if (!activeWork) return;
    setExportFolderModalOpen(false);
    await onExportWorkToReadings(activeWork, selectedFolderId);
    onNotify(`"${title}" agregado a tu biblioteca de Material y Visor`, 'success');
  };

  const currentWords = editor ? (editor.getText().trim() ? editor.getText().trim().split(/\s+/).length : 0) : 0;
  const currentChars = editor ? editor.getText().length : 0;
  const targetPct =
    activeWork?.targetWordCount && activeWork.targetWordCount > 0
      ? Math.min(100, Math.round((currentWords / activeWork.targetWordCount) * 100))
      : null;

  // Palabras por minuto en la sesión
  const sessionMinutes = Math.max(0.1, (Date.now() - sessionStartTimeRef.current) / 60000);
  const wpm = Math.round(sessionWordsWritten / sessionMinutes);

  // Selección de plantilla desde el Hub de Bienvenida (con seguro anti-duplicados)
  const handleSelectTemplateFromHub = useCallback(
    async (templateId: string) => {
      if (isCreatingRef.current) return;
      isCreatingRef.current = true;
      setIsCreatingWork(true);
      setCreatingTemplateId(templateId);

      try {
        if (templateId === 'blank') {
          if (onCreateNewWork) {
            const created = await onCreateNewWork(null);
            onSelectWork?.(created.id);
          } else {
            const newWork: StudyWorkDraft = {
              id: `work_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              title: 'Documento en Blanco',
              contentHtml: '<p></p>',
              contentText: '',
              wordCount: 0,
              targetWordCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await onSaveWork(newWork);
            onSelectWork?.(newWork.id);
          }
          onNotify('Lienzo en blanco creado', 'success');
          return;
        }

        const tmpl = ACADEMIC_TEMPLATES.find((t) => t.id === templateId);
        if (tmpl) {
          if (onCreateNewWork) {
            const created = await onCreateNewWork(tmpl);
            onSelectWork?.(created.id);
          } else {
            const words = tmpl.htmlContent.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
            const newWork: StudyWorkDraft = {
              id: `work_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              title: tmpl.defaultTitle,
              contentHtml: tmpl.htmlContent,
              contentText: tmpl.name,
              wordCount: words,
              targetWordCount: tmpl.targetWords,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await onSaveWork(newWork);
            onSelectWork?.(newWork.id);
          }
          onNotify(`Plantilla "${tmpl.name}" iniciada`, 'success');
        }
      } catch {
        onNotify('No se pudo crear el trabajo', 'error');
      } finally {
        setIsCreatingWork(false);
        setCreatingTemplateId(null);
        isCreatingRef.current = false;
      }
    },
    [onCreateNewWork, onNotify, onSaveWork, onSelectWork]
  );

  // Si no hay trabajo activo seleccionado, renderizar Hub de Bienvenida y Plantillas
  if (!activeWork) {
    return (
      <div
        className={`h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden relative ${
          isFullScreen ? 'fixed inset-0 z-50' : ''
        }`}
      >
        <TemplatesWelcomeHub
          works={works}
          onSelectTemplate={handleSelectTemplateFromHub}
          onOpenWork={(id) => onSelectWork?.(id)}
          onDeleteWork={onDeleteWork}
          isCreating={isCreatingWork}
          creatingTemplateId={creatingTemplateId}
        />
      </div>
    );
  }

  const paperPixelWidth = paperFormat === 'a4' ? 794 : 816;

  return (
    <div className={`h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden relative ${isFullScreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Barra de Herramientas Superior */}
      <WriterToolbar
        editor={editor}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onZoomFit={handleZoomFit}
        isPagedMode={isPagedMode}
        onTogglePagedMode={() => setIsPagedMode((v) => !v)}
        paperFormat={paperFormat}
        onChangePaperFormat={handleChangePaperFormat}
        pageInfo={pageInfo}
        isFullScreen={isFullScreen}
        onToggleFullScreen={() => setIsFullScreen((v) => !v)}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onBackToHub={() => onSelectWork?.(null)}
        onToggleCitations={() => setCitationsOpen((v) => !v)}
        citationsOpen={citationsOpen}
        onExportDocx={handleExportDocx}
        onExportPdf={handleExportPdf}
        onPrintPdf={handlePrintPdf}
        onExportMarkdown={handleExportMarkdown}
        onAddToReadings={() => setExportFolderModalOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Área Central: Escritorio de Edición con Adaptabilidad y Hojas Reales */}
        <div
          ref={workspaceContainerRef}
          className="flex-1 overflow-auto sf-env-canvas p-3 sm:p-6 lg:p-8 flex flex-col items-center custom-scrollbar"
        >
          {/* Barra Superior Integrada del Documento: Formato, Título y Páginas */}
          <div
            className="w-full mb-4 flex items-center justify-between gap-3 select-none transition-all"
            style={{ maxWidth: `${paperPixelWidth}px` }}
          >
            <div className="flex-1 flex items-center gap-2.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {paperFormat === 'legal'
                    ? 'Oficio (216×330)'
                    : paperFormat === 'a4'
                      ? 'A4 (210×297)'
                      : 'Carta (216×279)'}
                </span>
              </span>

              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Título de tu trabajo académico..."
                className="flex-1 text-sm sm:text-base font-bold bg-slate-900/90 border border-slate-700/80 focus:border-indigo-400 rounded-xl px-3.5 py-1.5 text-white placeholder-slate-500 outline-none transition-all shadow-inner"
              />
            </div>

            <div className="flex items-center gap-2">
              {isPagedMode && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-sm">
                  <span>Pág.</span>
                  <strong className="text-indigo-300">{pageInfo.currentPage}</strong>
                  <span>de</span>
                  <strong className="text-white">{pageInfo.pageCount}</strong>
                </div>
              )}

              <button
                type="button"
                onClick={handleZoomFit}
                className="h-8 px-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-indigo-500/40 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1 transition-colors"
                title="Ajustar hoja al ancho de tu pantalla"
              >
                <Expand className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden md:inline">Ajustar</span>
              </button>
            </div>
          </div>

          {/* Lienzo de Papel Escalar */}
          <div
            className="w-full transition-transform origin-top flex flex-col items-center"
            style={{
              transform: `scale(${zoomLevel})`,
              width: zoomLevel > 1 ? `${zoomLevel * 100}%` : '100%',
              maxWidth: `${paperPixelWidth}px`,
            }}
          >
            <style>{`
              :root {
                --sheet-pad-x: 56px;
                --sheet-pad-y: 64px;
              }

              @media (max-width: 1024px) {
                :root {
                  --sheet-pad-x: 40px;
                  --sheet-pad-y: 48px;
                }
              }

              @media (max-width: 640px) {
                :root {
                  --sheet-pad-x: 24px;
                  --sheet-pad-y: 36px;
                }
              }

              .visual-page {
                background: var(--sf-paper-bg, #ffffff);
                color: #0f172a;
                width: 100%;
                max-width: ${paperPixelWidth}px;
                ${isPagedMode ? '' : 'min-height: 800px;'}
                padding: ${isPagedMode ? '52px var(--sheet-pad-x) 0 var(--sheet-pad-x)' : 'var(--sheet-pad-y) var(--sheet-pad-x)'};
                margin: 0 auto;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 24px 38px -6px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.08);
                border-radius: 4px;
                position: relative;
                font-family: 'Arial', sans-serif;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
              }

              .ProseMirror {
                outline: none;
                ${isPagedMode ? '' : 'flex: 1;'}
                line-height: 1.7;
                font-size: 11pt;
                color: #0f172a;
              }

              .ProseMirror p {
                margin-bottom: 0.9em;
                text-align: justify;
              }

              .ProseMirror h1 {
                font-size: 22pt;
                font-weight: 800;
                letter-spacing: -0.025em;
                margin-top: 1.2em;
                margin-bottom: 0.45em;
                color: #0f172a;
                line-height: 1.25;
              }

              .ProseMirror h2 {
                font-size: 15pt;
                font-weight: 700;
                letter-spacing: -0.015em;
                margin-top: 1.2em;
                margin-bottom: 0.4em;
                color: #1e293b;
                border-bottom: 1.5px solid #e2e8f0;
                padding-bottom: 4px;
              }

              .ProseMirror h3 {
                font-size: 12.5pt;
                font-weight: 600;
                margin-top: 1.1em;
                margin-bottom: 0.35em;
                color: #334155;
              }

              .ProseMirror blockquote {
                border-left: 4px solid #6366f1;
                background-color: #f8fafc;
                padding: 12px 18px;
                margin: 1.25em 0;
                border-radius: 0 8px 8px 0;
                color: #334155;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
              }

              .ProseMirror blockquote p {
                margin-bottom: 0.4em;
              }

              .ProseMirror blockquote p:last-child {
                margin-bottom: 0;
              }

              .ProseMirror hr {
                border: none;
                border-top: 1.5px solid #e2e8f0;
                margin: 1.5em 0;
              }

              .ProseMirror table {
                margin-top: 1.25em;
                margin-bottom: 1.25em;
                border-collapse: separate;
                border-spacing: 0;
                table-layout: fixed;
                width: 100%;
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid #cbd5e1;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.06);
              }

              .ProseMirror table[data-align="center"] { margin-left: auto !important; margin-right: auto !important; }
              .ProseMirror table[data-align="left"] { margin-left: 0 !important; margin-right: auto !important; }
              .ProseMirror table[data-align="right"] { margin-left: auto !important; margin-right: 0 !important; }

              .ProseMirror th {
                background-color: #f1f5f9;
                color: #0f172a;
                font-weight: 700;
                text-align: left;
                border-bottom: 2px solid #cbd5e1;
                border-right: 1px solid #e2e8f0;
                padding: 10px 14px;
                font-size: 10pt;
              }

              .ProseMirror td {
                border-bottom: 1px solid #e2e8f0;
                border-right: 1px solid #e2e8f0;
                padding: 10px 14px;
                font-size: 10pt;
                color: #1e293b;
                vertical-align: top;
                min-width: 1em;
              }

              .ProseMirror tr:last-child td {
                border-bottom: none;
              }

              .ProseMirror td:last-child,
              .ProseMirror th:last-child {
                border-right: none;
              }

              .ProseMirror tr:nth-child(even) td {
                background-color: #fafbfc;
              }

              /* ESTILOS DE CORTE DE HOJA AUTOMÁTICO Y ALTURA FIJA DE PÁGINA */
              .page-cut-marker {
                display: block;
                width: calc(100% + (2 * var(--sheet-pad-x)));
                margin-left: calc(-1 * var(--sheet-pad-x));
                margin-right: calc(-1 * var(--sheet-pad-x));
                user-select: none;
                pointer-events: none;
              }

              .page-cut-filler {
                display: block;
                width: 100%;
                background: var(--sf-paper-bg, #ffffff);
                pointer-events: none;
                user-select: none;
              }

              [data-manual-filler-page] {
                width: calc(100% + (2 * var(--sheet-pad-x)));
                margin-left: calc(-1 * var(--sheet-pad-x));
                margin-right: calc(-1 * var(--sheet-pad-x));
              }

              .page-cut-footer {
                background: var(--sf-paper-bg, #ffffff);
                padding: 12px var(--sheet-pad-x) 14px var(--sheet-pad-x);
                border-top: 1px solid #f1f5f9;
                border-bottom: 1px solid #cbd5e1;
                box-shadow: 0 10px 18px -4px rgba(0, 0, 0, 0.22);
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 10px;
                color: #94a3b8;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              }

              .page-cut-gap {
                height: 40px;
                background: rgb(var(--sf-bg-app, 16 18 24));
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                box-shadow: inset 0 8px 10px -4px rgba(0, 0, 0, 0.35), inset 0 -8px 10px -4px rgba(0, 0, 0, 0.35);
              }

              .page-cut-badge {
                background: rgba(15, 23, 42, 0.95);
                border: 1px solid rgba(99, 102, 241, 0.4);
                border-radius: 9999px;
                padding: 3.5px 14px;
                font-size: 10.5px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-weight: 700;
                color: #c7d2fe;
                display: flex;
                align-items: center;
                gap: 7px;
                box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
                letter-spacing: 0.04em;
              }

              .page-cut-dot {
                display: inline-block;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #818cf8;
              }

              .page-cut-header {
                background: var(--sf-paper-bg, #ffffff);
                padding: 14px var(--sheet-pad-x) 16px var(--sheet-pad-x);
                border-top: 1px solid #e2e8f0;
                box-shadow: 0 -4px 10px -2px rgba(0, 0, 0, 0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 10px;
                color: #94a3b8;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              }

              .page-cut-number {
                font-weight: 700;
                color: #64748b;
              }

              .page-cut-tag {
                text-transform: uppercase;
                letter-spacing: 0.05em;
                font-size: 9px;
                color: #94a3b8;
              }

              @media print {
                .page-cut-marker {
                  break-before: page;
                  page-break-before: always;
                }
                .page-cut-filler,
                .last-page-spacer,
                .page-cut-gap {
                  display: none !important;
                }
              }
            `}</style>

            {/* Hoja de Edición Live: Paginada (altura física fija) o Continua */}
            <div
              className="visual-page"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  e.preventDefault();
                  editor?.commands.focus('end');
                }
              }}
            >
              <EditorContent editor={editor} />

              {/* Relleno de altura fija de la última hoja y pie de página */}
              {isPagedMode && (
                <>
                  <div
                    className="last-page-spacer cursor-text"
                    style={{ height: `${pageInfo.lastPageFillerPx}px` }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor?.commands.focus('end');
                    }}
                  />
                  <div
                    className="py-3.5 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono select-none"
                    style={{
                      marginLeft: 'calc(-1 * var(--sheet-pad-x))',
                      marginRight: 'calc(-1 * var(--sheet-pad-x))',
                      paddingLeft: 'var(--sheet-pad-x)',
                      paddingRight: 'var(--sheet-pad-x)',
                      paddingBottom: '20px',
                    }}
                  >
                    <span>StudyFlexConnect · Redacción Académica</span>
                    <span className="font-semibold text-slate-500">
                      Página {pageInfo.pageCount} (Fin de documento)
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Cajón de Citas y Fuentes de Lectura */}
        <CitationsDrawer
          open={citationsOpen}
          onClose={() => setCitationsOpen(false)}
          notes={notes}
          documents={documents}
          onInsertCitation={handleInsertCitation}
        />
      </div>

      {/* Barra de Estado y Métricas Inferior */}
      <footer className="h-8 border-t border-indigo-500/20 bg-slate-900/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between text-[11px] text-slate-400 z-20 flex-shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span className="font-mono text-slate-200">
            <strong>{currentWords}</strong> palabras · <strong>{currentChars}</strong> caracteres
          </span>
          <span className="hidden sm:inline text-slate-500">|</span>
          <span className="hidden sm:inline font-mono">
            Ritmo: <strong>{wpm}</strong> pal/min
          </span>
          {isPagedMode && (
            <>
              <span className="hidden sm:inline text-slate-500">|</span>
              <span className="hidden sm:inline font-mono text-indigo-300">
                Pág. {pageInfo.currentPage} de {pageInfo.pageCount} ({paperFormat === 'legal' ? 'Oficio' : paperFormat === 'a4' ? 'A4' : 'Carta'})
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Meta de palabras */}
          <div
            onClick={() => setTargetModalOpen(true)}
            className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors"
            title="Ajustar meta de palabras"
          >
            <Target className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono">
              Meta: {activeWork?.targetWordCount ? `${activeWork.targetWordCount} pal` : 'Sin meta'}
            </span>
            {targetPct !== null && (
              <span className="text-emerald-400 font-bold font-mono">({targetPct}%)</span>
            )}
          </div>

          <span className="text-slate-500">|</span>

          {/* Temporizador conectado */}
          <div className="flex items-center gap-1 font-mono text-indigo-300">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {isStopwatchActive
                ? `Flowtime: ${Math.floor(elapsedSeconds / 60)}m`
                : `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`}
            </span>
          </div>
        </div>
      </footer>

      {/* Modal de Plantillas Académicas */}
      <AcademicTemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Modal para configurar Meta de Palabras */}
      {targetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              <span>Meta de Palabras</span>
            </h4>
            <p className="text-xs text-slate-400">
              Define cuántas palabras deseas redactar en este trabajo para seguir tu progreso.
            </p>
            <input
              type="number"
              defaultValue={activeWork?.targetWordCount || 1000}
              id="target-words-input"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTargetModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('target-words-input') as HTMLInputElement;
                  const val = parseInt(input?.value || '0', 10);
                  if (activeWork && editor) {
                    const updated: StudyWorkDraft = {
                      ...activeWork,
                      targetWordCount: val > 0 ? val : 0,
                      updatedAt: new Date().toISOString(),
                    };
                    void onSaveWork(updated);
                    onNotify('Meta de palabras actualizada', 'success');
                  }
                  setTargetModalOpen(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Guardar Meta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Exportar y Agregar a Lecturas */}
      {exportFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Agregar a Material de Lectura</span>
            </h4>
            <p className="text-xs text-slate-400">
              Convierte este borrador en un documento de tu biblioteca general para leerlo con SQ3R, oclusiones y notas.
            </p>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 block">Carpeta de Destino:</label>
              <select
                value={selectedFolderId || ''}
                onChange={(e) => setSelectedFolderId(e.target.value || null)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
              >
                <option value="">(Sin carpeta / Raíz)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExportFolderModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmAddToReadings()}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Confirmar y Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
