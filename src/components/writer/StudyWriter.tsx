import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Image } from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { CustomTable, CustomTableRow, CustomTableCell, CustomTableHeader, LineHeight, sanitizeAndPaginateOversizedNodes } from '../../lib/tiptap/CustomTableExtensions';
import { PageBreak } from '../../lib/tiptap/PageBreak';
import { FontSize } from '../../lib/tiptap/fontSize';
import { AutoPaginationExtension } from '../../lib/tiptap/AutoPaginationExtension';
import { Superscript, Subscript } from '../../lib/tiptap/AcademicScriptExtensions';
import { TextColor, AcademicHighlight } from '../../lib/tiptap/AcademicColorExtensions';
import { IndentExtension } from '../../lib/tiptap/IndentExtension';
import Link from '@tiptap/extension-link';
import { WriterToolbar } from './WriterToolbar';
import { FloatingFormatMenu } from './FloatingFormatMenu';
import { TableControlBar } from './TableControlBar';
import { CitationsDrawer } from './CitationsDrawer';
import { AcademicTemplatesModal, AcademicTemplate, ACADEMIC_TEMPLATES } from './AcademicTemplatesModal';
import { TemplatesWelcomeHub } from './TemplatesWelcomeHub';
import { PublishTemplateModal } from './PublishTemplateModal';
import { ShareWorkModal } from './ShareWorkModal';
import { ImportDocumentModal } from './ImportDocumentModal';
import { FloatingImportProgress } from './FloatingImportProgress';
import { prepareDocumentImport, ImportProgressState } from '../../lib/documentImportEngine';
import { AcademicStyleProfile, parseMarkdownToHtml, isMarkdownContent } from '../../lib/markdownParser';
import {
  CommunityTemplateRecord,
  DocumentRecord,
  FolderRecord,
  FriendshipRecord,
  LayoutStyleId,
  StickyNoteRecord,
  StudyWorkDraft,
  UserProfile,
  WorkCollaboratorPresence,
} from '../../types/studyflow';
import { exportHtmlToDocx, exportHtmlToMarkdown, exportHtmlToPdf, printFormattedDocument } from '../../lib/docxExport';
import { subscribeToWorkCollaboration } from '../../lib/collaboration';
import { BookOpen, Clock, Columns, Expand, FileText, ListTree, Target, ZoomIn, ZoomOut } from 'lucide-react';
import { useTimer } from '../../context/TimerContext';
import { DocumentOutlineDrawer } from './DocumentOutlineDrawer';
import { ParallelContinuationSheet } from './ParallelContinuationSheet';

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
  onRenameWork?: (id: string, newTitle: string) => Promise<void> | void;
  onShareWork?: (work: StudyWorkDraft) => void;
  onExportWorkToReadings: (work: StudyWorkDraft, targetFolderId: string | null) => Promise<void>;
  onNotify: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  templatesOpen?: boolean;
  onSetTemplatesOpen?: (open: boolean) => void;
  importModalOpen?: boolean;
  onSetImportModalOpen?: (open: boolean) => void;
  exportFolderModalOpen?: boolean;
  onSetExportFolderModalOpen?: (open: boolean) => void;
  layoutStyle?: LayoutStyleId;
  currentUser?: { id: string; name?: string; username?: string | null } | null;
  userProfile?: UserProfile | null;
  friendships?: FriendshipRecord[];
  onOpenAccountModal?: () => void;
  onOpenFriendsModal?: () => void;
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
  onRenameWork,
  onShareWork: onShareWorkProp,
  onExportWorkToReadings,
  onNotify,
  templatesOpen: templatesOpenProp,
  onSetTemplatesOpen: onSetTemplatesOpenProp,
  importModalOpen: importModalOpenProp,
  onSetImportModalOpen: onSetImportModalOpenProp,
  exportFolderModalOpen: exportFolderModalOpenProp,
  onSetExportFolderModalOpen: onSetExportFolderModalOpenProp,
  layoutStyle = 'islands',
  currentUser,
  userProfile,
  friendships = [],
  onOpenAccountModal,
  onOpenFriendsModal,
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

  // Sincronización reactiva inmediata de estado local ante cambios en el documento activo
  const [syncedWorkId, setSyncedWorkId] = useState<string | null>(activeWork?.id || null);
  if (activeWork && activeWork.id !== syncedWorkId) {
    setSyncedWorkId(activeWork.id);
    const workTitle = activeWork.title || 'Trabajo sin título';
    const workPaper = activeWork.paperSize || 'letter';
    setTitle(workTitle);
    setPaperFormat(workPaper);
  } else if (!activeWork && syncedWorkId !== null) {
    setSyncedWorkId(null);
  }
  const [pageInfo, setPageInfo] = useState<{
    pageCount: number;
    currentPage: number;
    lastPageFillerPx: number;
    breakPositions?: number[];
  }>({
    pageCount: 1,
    currentPage: 1,
    lastPageFillerPx: 760,
    breakPositions: [],
  });

  const [isOutlineOpen, setIsOutlineOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('sf_writer_outline_open') === 'true';
    }
    return false;
  });

  const [isParallelView, setIsParallelView] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('sf_writer_outline_open', String(isOutlineOpen));
      } catch {
        // ignore storage errors
      }
    }
  }, [isOutlineOpen]);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [citationsOpen, setCitationsOpen] = useState<boolean>(false);
  const [internalTemplatesOpen, setInternalTemplatesOpen] = useState<boolean>(false);
  const templatesOpen = templatesOpenProp !== undefined ? templatesOpenProp : internalTemplatesOpen;
  const setTemplatesOpen = onSetTemplatesOpenProp ?? setInternalTemplatesOpen;

  const [targetModalOpen, setTargetModalOpen] = useState<boolean>(false);
  const [publishModalOpen, setPublishModalOpen] = useState<boolean>(false);
  const [internalImportModalOpen, setInternalImportModalOpen] = useState<boolean>(false);
  const isImportModalOpen = importModalOpenProp !== undefined ? importModalOpenProp : internalImportModalOpen;
  const setIsImportModalOpen = onSetImportModalOpenProp ?? setInternalImportModalOpen;
  const [importProgress, setImportProgress] = useState<ImportProgressState | null>(null);
  const [droppedImportFile, setDroppedImportFile] = useState<File | null>(null);

  const [internalExportModalOpen, setInternalExportModalOpen] = useState<boolean>(false);
  const exportFolderModalOpen =
    exportFolderModalOpenProp !== undefined
      ? exportFolderModalOpenProp
      : internalExportModalOpen;
  const setExportFolderModalOpen =
    onSetExportFolderModalOpenProp ?? setInternalExportModalOpen;
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Compartir redacción (en vivo / copia)
  const [shareWorkModalOpen, setShareWorkModalOpen] = useState<boolean>(false);
  const [shareWorkTarget, setShareWorkTarget] = useState<StudyWorkDraft | null>(null);

  const handleOpenShare = (workToShare?: StudyWorkDraft) => {
    const target = workToShare || activeWork;
    if (!target) return;
    if (!currentUser) {
      onNotify('Inicia sesión para compartir redacciones y colaborar', 'info');
      onOpenAccountModal?.();
      return;
    }
    if (onShareWorkProp) {
      onShareWorkProp(target);
      return;
    }
    setShareWorkTarget(target);
    setShareWorkModalOpen(true);
  };

  // Colaboración en tiempo real (Realtime Channel & Presence)
  const [collabPeers, setCollabPeers] = useState<WorkCollaboratorPresence[]>([]);
  const isRemoteUpdateRef = useRef<boolean>(false);
  const collabSubscriptionRef = useRef<ReturnType<typeof subscribeToWorkCollaboration> | null>(null);
  const broadcastDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Control de creación y prevención de duplicados al pulsar plantillas
  const [isCreatingWork, setIsCreatingWork] = useState<boolean>(false);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const isCreatingRef = useRef<boolean>(false);

  // Referencia al contenedor de trabajo para ajuste dinámico de zoom (Fit to Screen)
  const workspaceContainerRef = useRef<HTMLDivElement>(null);

  // Referencia a editor para inserción asíncrona de bloques en segundo plano
  const editorRef = useRef<any>(null);

  // Banderas de control de sincronización para evitar sobrescrituras cruzadas entre documentos
  const isSwitchingWorkRef = useRef<boolean>(false);
  const loadedContentWorkIdRef = useRef<string | null>(activeWork?.id || null);
  const titleDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      Superscript,
      Subscript,
      TextColor,
      AcademicHighlight,
      IndentExtension,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          class: 'text-indigo-600 underline cursor-pointer hover:text-indigo-800',
        },
      }),
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
    editorProps: {
      handlePaste(_view, event) {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const text = clipboardData.getData('text/plain');
        if (!text || !text.trim()) return false;

        const html = clipboardData.getData('text/html');

        // Detectar si el texto contiene sintaxis y estructura de Markdown (#, ```, |, >, listas, etc.)
        if (isMarkdownContent(text)) {
          // Si el HTML trae estructura semántica rica real (h1, table, ul, blockquote)
          // y NO contiene caracteres de Markdown crudos como # o ```, respetamos el HTML nativo.
          const hasRichHtmlStructure =
            Boolean(html) &&
            /<(h[1-6]|table|ul|ol|blockquote)[\s>]/i.test(html) &&
            !/(^|\n)#{1,6}\s+|```/m.test(html);

          if (!hasRichHtmlStructure) {
            event.preventDefault();
            const parsed = parseMarkdownToHtml(text);
            if (parsed && parsed !== '<p></p>') {
              editorRef.current?.commands.insertContent(parsed);
              setTimeout(() => {
                if (editorRef.current) {
                  sanitizeAndPaginateOversizedNodes(editorRef.current);
                }
              }, 60);
              return true;
            }
          }
        }
        return false;
      },
    },
    content: activeWork?.contentHtml || '<p>Comienza a redactar tu trabajo...</p>',
    onUpdate: ({ editor }) => {
      // 1. Silenciar si estamos cambiando de documento o si es una actualización remota colaborativa
      if (isSwitchingWorkRef.current || isRemoteUpdateRef.current) {
        return;
      }

      const currentWork = activeWorkRef.current;
      // 2. Comprobar que el documento activo coincide con el contenido cargado en el editor TipTap
      if (!currentWork || currentWork.id !== loadedContentWorkIdRef.current) {
        return;
      }

      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setSessionWordsWritten(Math.max(0, words - sessionStartWordsRef.current));

      // 3. Guardar solo el contenido editado sin alterar el título ni la configuración de otro documento
      const updated: StudyWorkDraft = {
        ...currentWork,
        title: titleRef.current || currentWork.title || 'Trabajo sin título',
        paperSize: paperFormatRef.current || currentWork.paperSize || 'letter',
        contentHtml: editor.getHTML(),
        contentText: text,
        wordCount: words,
        updatedAt: new Date().toISOString(),
      };
      void onSaveWork(updated);

      // 4. Emitir broadcast colaborativo debounced a compañeros en vivo
      if (collabSubscriptionRef.current) {
        if (broadcastDebounceRef.current) {
          clearTimeout(broadcastDebounceRef.current);
        }
        broadcastDebounceRef.current = setTimeout(() => {
          collabSubscriptionRef.current?.broadcastContentUpdate({
            contentHtml: editor.getHTML(),
            contentText: text,
            title: titleRef.current || currentWork.title,
            paperSize: paperFormatRef.current || currentWork.paperSize,
            wordCount: words,
          });
        }, 250);
      }
    },
  });

  editorRef.current = editor;

  // Sanear tablas y bloques de código extensos al montar el editor
  useEffect(() => {
    if (editor) {
      setTimeout(() => {
        sanitizeAndPaginateOversizedNodes(editor);
      }, 100);
    }
  }, [editor]);

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
    if (!activeWork) {
      loadedContentWorkIdRef.current = null;
      return;
    }

    if (!editor) return;

    // Si ya está cargado este trabajo exactamente y el editor está en sincronía, no recargar
    if (loadedContentWorkIdRef.current === activeWork.id) {
      return;
    }

    // Activar guardia para evitar sobrescrituras cruzadas de nombres o formato
    isSwitchingWorkRef.current = true;
    loadedContentWorkIdRef.current = activeWork.id;

    const currentDocTitle = activeWork.title || 'Trabajo sin título';
    setTitle(currentDocTitle);
    titleRef.current = currentDocTitle;

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
    paperFormatRef.current = nextFormat;

    if (editor.commands.setPaperFormat) {
      editor.commands.setPaperFormat(nextFormat);
    }

    // Inyectar contenido en TipTap con emitUpdate: false para no disparar onUpdate espurio
    editor.commands.setContent(
      activeWork.contentHtml || '<p>Comienza a redactar tu trabajo...</p>',
      { emitUpdate: false }
    );

    // Ajustar si el usuario tiene rol de solo lectura en documento colaborativo
    const isReadOnly = activeWork.isShared === true && activeWork.sharedRole === 'viewer';
    editor.setEditable(!isReadOnly);

    const text = editor.getText();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    sessionStartWordsRef.current = words;
    sessionStartTimeRef.current = Date.now();
    setSessionWordsWritten(0);

    setTimeout(() => {
      isSwitchingWorkRef.current = false;
      if (editor) {
        sanitizeAndPaginateOversizedNodes(editor);
      }
    }, 60);
  }, [activeWork?.id, editor]);

  // Suscripción silenciosa en tiempo real al canal de redacción colaborativa
  useEffect(() => {
    if (!activeWork?.id || !currentUser?.id) {
      setCollabPeers([]);
      return;
    }

    const sub = subscribeToWorkCollaboration({
      workId: activeWork.id,
      userId: currentUser.id,
      username: currentUser.username || currentUser.name || 'Estudiante',
      fullName: currentUser.name || 'Estudiante',
      onPresenceChange: (peers) => {
        setCollabPeers(peers.filter((p) => p.userId !== currentUser.id));
      },
      onRemoteContentUpdate: (payload) => {
        if (!editorRef.current || payload.workId !== activeWorkRef.current?.id) return;

        const currentHtml = editorRef.current.getHTML();
        if (payload.contentHtml !== currentHtml) {
          isRemoteUpdateRef.current = true;
          editorRef.current.commands.setContent(payload.contentHtml, { emitUpdate: false });
          isRemoteUpdateRef.current = false;
        }

        if (payload.title && payload.title !== titleRef.current) {
          setTitle(payload.title);
          titleRef.current = payload.title;
        }

        if (payload.paperSize && payload.paperSize !== paperFormatRef.current) {
          setPaperFormat(payload.paperSize);
          paperFormatRef.current = payload.paperSize;
          if (editorRef.current.commands.setPaperFormat) {
            editorRef.current.commands.setPaperFormat(payload.paperSize);
          }
        }

        const currentW = activeWorkRef.current;
        if (currentW) {
          void onSaveWork({
            ...currentW,
            title: payload.title || currentW.title,
            paperSize: payload.paperSize || currentW.paperSize,
            contentHtml: payload.contentHtml,
            contentText: payload.contentText || currentW.contentText,
            wordCount: payload.wordCount || 0,
            updatedAt: payload.timestamp || new Date().toISOString(),
          });
        }
      },
    });

    collabSubscriptionRef.current = sub;

    return () => {
      sub.unsubscribe();
      collabSubscriptionRef.current = null;
      setCollabPeers([]);
    };
  }, [activeWork?.id, currentUser?.id, currentUser?.username, currentUser?.name, onSaveWork]);

  // Manejo de cambio de formato de papel (aplica a todo el documento completo y recuerda preferencia)
  const handleChangePaperFormat = (newFormat: 'letter' | 'legal' | 'a4') => {
    setPaperFormat(newFormat);
    paperFormatRef.current = newFormat;
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
    const currentWork = activeWorkRef.current;
    if (currentWork && editor) {
      const updated: StudyWorkDraft = {
        ...currentWork,
        title: titleRef.current || currentWork.title || 'Trabajo sin título',
        paperSize: newFormat,
        contentHtml: editor.getHTML(),
        contentText: editor.getText(),
        updatedAt: new Date().toISOString(),
      };
      void onSaveWork(updated);

      if (collabSubscriptionRef.current) {
        collabSubscriptionRef.current.broadcastContentUpdate({
          contentHtml: editor.getHTML(),
          contentText: editor.getText(),
          title: titleRef.current || currentWork.title,
          paperSize: newFormat,
          wordCount: currentWork.wordCount,
        });
      }
    }
  };

  // Manejo de cambio de título
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    titleRef.current = newTitle;

    const currentWork = activeWorkRef.current;
    if (!currentWork || !editor) return;

    if (titleDebounceTimerRef.current) {
      clearTimeout(titleDebounceTimerRef.current);
    }

    // Debounce de 250ms para no saturar IndexedDB en cada pulsación y evitar re-renders lentos
    titleDebounceTimerRef.current = setTimeout(() => {
      const targetWork = activeWorkRef.current;
      if (targetWork && targetWork.id === currentWork.id) {
        const updated: StudyWorkDraft = {
          ...targetWork,
          title: newTitle,
          paperSize: paperFormatRef.current || targetWork.paperSize || 'letter',
          contentHtml: editor.getHTML(),
          contentText: editor.getText(),
          updatedAt: new Date().toISOString(),
        };
        void onSaveWork(updated);

        if (collabSubscriptionRef.current) {
          collabSubscriptionRef.current.broadcastContentUpdate({
            contentHtml: editor.getHTML(),
            contentText: editor.getText(),
            title: newTitle,
            paperSize: paperFormatRef.current || targetWork.paperSize,
            wordCount: targetWork.wordCount,
          });
        }
      }
    }, 250);
  };

  const handleTitleBlur = () => {
    if (titleDebounceTimerRef.current) {
      clearTimeout(titleDebounceTimerRef.current);
      titleDebounceTimerRef.current = null;
    }
    const currentWork = activeWorkRef.current;
    if (!currentWork || !editor) return;

    const trimmed = title.trim() || 'Trabajo sin título';
    if (trimmed !== title) {
      setTitle(trimmed);
      titleRef.current = trimmed;
    }

    const updated: StudyWorkDraft = {
      ...currentWork,
      title: trimmed,
      paperSize: paperFormatRef.current || currentWork.paperSize || 'letter',
      contentHtml: editor.getHTML(),
      contentText: editor.getText(),
      updatedAt: new Date().toISOString(),
    };
    void onSaveWork(updated);

    if (collabSubscriptionRef.current) {
      collabSubscriptionRef.current.broadcastContentUpdate({
        contentHtml: editor.getHTML(),
        contentText: editor.getText(),
        title: trimmed,
        paperSize: paperFormatRef.current || currentWork.paperSize,
        wordCount: currentWork.wordCount,
      });
    }
  };

  useEffect(() => {
    return () => {
      if (titleDebounceTimerRef.current) {
        clearTimeout(titleDebounceTimerRef.current);
      }
    };
  }, []);

  // Zoom handlers y Ajuste al Ancho
  const handleZoomIn = () => setZoomLevel((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.55, Number((z - 0.1).toFixed(2))));
  const handleZoomReset = () => setZoomLevel(1);

  const handleZoomFit = useCallback(() => {
    if (!workspaceContainerRef.current) return;
    const available = workspaceContainerRef.current.clientWidth - 48; // padding lateral
    const singlePaperPx = paperFormat === 'a4' ? 794 : 816;
    const requiredWidth = isParallelView && isPagedMode ? singlePaperPx * 2 + 32 : singlePaperPx;
    const target = Math.min(1.2, Math.max(0.35, available / requiredWidth));
    setZoomLevel(Number(target.toFixed(2)));
    onNotify(`Vista adaptada (${Math.round(target * 100)}%)`, 'info');
  }, [paperFormat, isParallelView, isPagedMode, onNotify]);

  // Navegar suavemente hacia una página específica del documento
  const handleNavigateToPage = useCallback(
    (targetPage: number) => {
      if (!editor || !workspaceContainerRef.current) return;
      const breaks = pageInfo.breakPositions || [];
      const targetPos = targetPage <= 1 ? 0 : (breaks[targetPage - 2] ?? 0);
      editor.chain().focus().setTextSelection(targetPos).run();

      try {
        const dom = editor.view.nodeDOM(targetPos);
        if (dom instanceof HTMLElement) {
          dom.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      } catch {
        // fallback
      }

      try {
        const coords = editor.view.coordsAtPos(targetPos);
        if (coords && workspaceContainerRef.current) {
          const container = workspaceContainerRef.current;
          const rect = container.getBoundingClientRect();
          const targetTop = container.scrollTop + (coords.top - rect.top) - 60;
          container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
        }
      } catch {
        // fallback
      }
    },
    [editor, pageInfo.breakPositions]
  );

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
      if (editor && activeWork) {
        setTitle(tmpl.defaultTitle);
        titleRef.current = tmpl.defaultTitle;
        isSwitchingWorkRef.current = true;
        editor.commands.setContent(tmpl.htmlContent, { emitUpdate: false });
        setTimeout(() => {
          isSwitchingWorkRef.current = false;
        }, 50);

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
            setTitle(created.title);
            titleRef.current = created.title;
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
            setTitle(newWork.title);
            titleRef.current = newWork.title;
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
            setTitle(created.title);
            titleRef.current = created.title;
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
            setTitle(newWork.title);
            titleRef.current = newWork.title;
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

  // Selección de plantilla comunitaria desde el Hub
  const handleSelectCommunityTemplateFromHub = useCallback(
    async (tmpl: CommunityTemplateRecord) => {
      if (isCreatingRef.current) return;
      isCreatingRef.current = true;
      setIsCreatingWork(true);
      setCreatingTemplateId(tmpl.id);

      try {
        const text = tmpl.contentText || tmpl.contentHtml.replace(/<[^>]*>/g, ' ').trim();
        const words = text ? text.split(/\s+/).length : 0;
        const newWork: StudyWorkDraft = {
          id: `work_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: tmpl.title,
          contentHtml: tmpl.contentHtml,
          contentText: text,
          wordCount: words,
          targetWordCount: tmpl.targetWords,
          paperSize: tmpl.paperSize || 'letter',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setTitle(tmpl.title);
        titleRef.current = tmpl.title;
        setPaperFormat(tmpl.paperSize || 'letter');
        paperFormatRef.current = tmpl.paperSize || 'letter';
        await onSaveWork(newWork);
        onSelectWork?.(newWork.id);
        onNotify(`Plantilla comunitaria "${tmpl.title}" cargada`, 'success');
      } catch {
        onNotify('No se pudo crear el trabajo desde la plantilla', 'error');
      } finally {
        setIsCreatingWork(false);
        setCreatingTemplateId(null);
        isCreatingRef.current = false;
      }
    },
    [onNotify, onSaveWork, onSelectWork]
  );

  // Manejo de importación progresiva por bloques (.md, .docx, .pdf, .pptx, .txt)
  const handleConfirmImport = async (
    file: File,
    options: {
      title: string;
      profile: AcademicStyleProfile;
      paperSize: 'letter' | 'legal' | 'a4';
    }
  ) => {
    setIsImportModalOpen(false);
    setDroppedImportFile(null);

    try {
      const prepared = await prepareDocumentImport(file, {
        profile: options.profile,
        paperSize: options.paperSize,
        title: options.title,
        onProgress: (p) => setImportProgress(p),
      });

      const newWorkId = `work_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const text = prepared.initialBlockHtml.replace(/<[^>]*>/g, ' ').trim();
      const words = text ? text.split(/\s+/).length : 0;
      const docTitle = prepared.title.trim() || 'Documento Importado';

      const newWork: StudyWorkDraft = {
        id: newWorkId,
        title: docTitle,
        contentHtml: prepared.initialBlockHtml,
        contentText: text,
        wordCount: words,
        targetWordCount: prepared.totalEstimatedWords || 1000,
        paperSize: prepared.paperSize,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setTitle(docTitle);
      titleRef.current = docTitle;
      setPaperFormat(prepared.paperSize);
      paperFormatRef.current = prepared.paperSize;

      await onSaveWork(newWork);
      onSelectWork?.(newWork.id);
      onNotify(`Documento "${docTitle}" iniciado en Redacción`, 'success');

      // Si el documento cuenta con bloques adicionales, transmitirlos en streaming progresivo
      if (prepared.remainingBlocks && prepared.remainingBlocks.length > 0) {
        let currentHtml = prepared.initialBlockHtml;
        const total = prepared.totalBlocks;

        setTimeout(async () => {
          for (let b = 0; b < prepared.remainingBlocks.length; b++) {
            await new Promise((r) => setTimeout(r, 200));
            const blockHtml = prepared.remainingBlocks[b];
            currentHtml += '\n' + blockHtml;
            const blockWords = currentHtml.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;

            const currentTitle = titleRef.current || docTitle;
            const currentPaper = paperFormatRef.current || prepared.paperSize;

            const updated: StudyWorkDraft = {
              ...newWork,
              title: currentTitle,
              paperSize: currentPaper,
              contentHtml: currentHtml,
              contentText: currentHtml.replace(/<[^>]*>/g, ' ').trim(),
              wordCount: blockWords,
              updatedAt: new Date().toISOString(),
            };
            await onSaveWork(updated);

            // Inyectar al final del editor TipTap silenciando onUpdate para no corromper títulos ni orden
            if (editorRef.current && activeWorkRef.current?.id === newWorkId) {
              isSwitchingWorkRef.current = true;
              const docSize = editorRef.current.state.doc.content.size;
              editorRef.current.commands.insertContentAt(docSize, blockHtml);
              setTimeout(() => {
                isSwitchingWorkRef.current = false;
              }, 40);
            }

            setImportProgress({
              fileName: prepared.fileName,
              fileType: prepared.fileType,
              percent: Math.round(((b + 2) / total) * 100),
              currentBlock: b + 2,
              totalBlocks: total,
              statusText:
                b + 2 >= total
                  ? 'Documento interpretado al 100%'
                  : `Interpretando bloque ${b + 2} de ${total}...`,
              isComplete: b + 2 >= total,
            });
          }

          onNotify('¡Importación completada al 100%!', 'success');
        }, 300);
      }
    } catch (err: any) {
      console.error('Error al importar documento:', err);
      setImportProgress((prev) =>
        prev
          ? {
              ...prev,
              isComplete: true,
              error: err.message,
              statusText: 'Error al interpretar archivo',
            }
          : null
      );
      onNotify(err.message || 'No se pudo importar el documento', 'error');
    }
  };

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
          onSelectCommunityTemplate={handleSelectCommunityTemplateFromHub}
          onOpenWork={(id) => onSelectWork?.(id)}
          onDeleteWork={onDeleteWork}
          onRenameWork={onRenameWork}
          onShareWork={(work) => handleOpenShare(work)}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          isCreating={isCreatingWork}
          creatingTemplateId={creatingTemplateId}
          currentUserId={currentUser?.id}
          onOpenAuthModal={onOpenAccountModal}
          onNotify={onNotify}
        />

        {/* Modal de Compartición de Redacción (en vivo / copia) */}
        <ShareWorkModal
          open={shareWorkModalOpen}
          work={shareWorkTarget}
          user={
            userProfile ||
            (currentUser
              ? {
                  id: currentUser.id,
                  email: '',
                  fullName: currentUser.name || '',
                  username: currentUser.username || null,
                }
              : null)
          }
          friendships={friendships}
          onClose={() => {
            setShareWorkModalOpen(false);
            setShareWorkTarget(null);
          }}
          onOpenFriendsModal={() => {
            setShareWorkModalOpen(false);
            onOpenFriendsModal?.();
          }}
          onNotify={onNotify}
        />

        {/* Modal de Importación Progresiva */}
        <ImportDocumentModal
          isOpen={isImportModalOpen}
          onClose={() => {
            setIsImportModalOpen(false);
            setDroppedImportFile(null);
          }}
          droppedFile={droppedImportFile}
          onConfirmImport={handleConfirmImport}
        />

        {/* Notificación Flotante de Progreso en Esquina Inferior Derecha */}
        <FloatingImportProgress
          progress={importProgress}
          onDismiss={() => setImportProgress(null)}
        />
      </div>
    );
  }

  const paperPixelWidth = paperFormat === 'a4' ? 794 : 816;

  return (
    <div className={`h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden relative ${isFullScreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Barra de Herramientas Superior Académica */}
      <WriterToolbar
        editor={editor}
        layoutStyle={layoutStyle}
        isFullScreen={isFullScreen}
        onToggleFullScreen={() => setIsFullScreen((v) => !v)}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onPublishTemplate={() => setPublishModalOpen(true)}
        onShareWork={() => handleOpenShare(activeWork)}
        collaboratorsPresence={collabPeers}
        isSharedWork={Boolean(activeWork?.isShared)}
        sharedRole={activeWork?.sharedRole || 'owner'}
        onBackToHub={() => onSelectWork?.(null)}
        onToggleCitations={() => setCitationsOpen((v) => !v)}
        citationsOpen={citationsOpen}
        onExportDocx={handleExportDocx}
        onExportPdf={handleExportPdf}
        onPrintPdf={handlePrintPdf}
        onExportMarkdown={handleExportMarkdown}
        onAddToReadings={() => setExportFolderModalOpen(true)}
      />

      {/* Barra de Control Contextual de Tablas (cuando el cursor está dentro de una tabla) */}
      <TableControlBar editor={editor} />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Panel Izquierdo: Índice de Títulos (Colapsable y Minimalista) */}
        <DocumentOutlineDrawer
          isOpen={isOutlineOpen}
          onToggle={() => setIsOutlineOpen((v) => !v)}
          editor={editor}
          containerRef={workspaceContainerRef}
        />

        {/* Área Central: Escritorio de Edición con Adaptabilidad y Hojas Reales */}
        <div
          ref={workspaceContainerRef}
          className="flex-1 overflow-auto sf-env-canvas p-3 sm:p-6 lg:p-8 flex flex-col items-center custom-scrollbar"
        >
          {/* Barra Superior Integrada del Documento: Formato, Título y Páginas */}
          <div
            className="w-full mb-4 flex items-center justify-between gap-3 select-none transition-all"
            style={{
              maxWidth:
                isParallelView && isPagedMode
                  ? `${paperPixelWidth * 2 + 48}px`
                  : `${paperPixelWidth}px`,
            }}
          >
            <div className="flex-1 flex items-center gap-2.5">
              <div className="relative flex-shrink-0">
                <select
                  value={paperFormat}
                  onChange={(e) => handleChangePaperFormat(e.target.value as 'letter' | 'legal' | 'a4')}
                  className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 hover:border-indigo-400 px-2.5 py-1.5 rounded-lg cursor-pointer outline-none transition-colors"
                  title="Formato físico del papel (Carta, Oficio, A4)"
                >
                  <option value="letter" className="bg-slate-900 text-white">Carta (216×279)</option>
                  <option value="legal" className="bg-slate-900 text-white">Oficio (216×330)</option>
                  <option value="a4" className="bg-slate-900 text-white">A4 (210×297)</option>
                </select>
              </div>

              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder="Título de tu trabajo académico..."
                className="flex-1 text-sm sm:text-base font-bold bg-slate-900/90 border border-slate-700/80 focus:border-indigo-400 rounded-xl px-3.5 py-1.5 text-white placeholder-slate-500 outline-none transition-all shadow-inner"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Botón de Índice de Títulos */}
              <button
                type="button"
                onClick={() => setIsOutlineOpen((v) => !v)}
                className={`h-8 px-2.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-colors shadow-sm ${
                  isOutlineOpen
                    ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-200'
                    : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white'
                }`}
                title="Mostrar u ocultar el índice y árbol de títulos"
              >
                <ListTree className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden md:inline">Índice</span>
              </button>

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
              maxWidth:
                isParallelView && isPagedMode
                  ? `${paperPixelWidth * 2 + 48}px`
                  : `${paperPixelWidth}px`,
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

              .ProseMirror h4 {
                font-size: 11pt;
                font-weight: 700;
                margin-top: 1em;
                margin-bottom: 0.3em;
                color: #475569;
                letter-spacing: -0.01em;
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
                border-top: 1.5px solid #cbd5e1;
                margin: 1.5em 0;
              }

              .ProseMirror sup {
                font-size: 0.75em;
                vertical-align: super;
                line-height: 0;
                font-weight: 600;
                color: #4338ca;
              }

              .ProseMirror sub {
                font-size: 0.75em;
                vertical-align: sub;
                line-height: 0;
                font-weight: 600;
              }

              .ProseMirror mark {
                background-color: #fef08a;
                border-radius: 3px;
                padding: 1px 3px;
              }

              .ProseMirror a {
                color: #2563eb;
                text-decoration: underline;
                cursor: pointer;
              }
              .ProseMirror a:hover {
                color: #1d4ed8;
              }

              .ProseMirror code {
                background-color: #f1f5f9;
                color: #0f172a;
                padding: 2px 5px;
                border-radius: 4px;
                font-family: "JetBrains Mono", monospace;
                font-size: 0.9em;
              }

              .ProseMirror pre {
                background-color: #0f172a;
                color: #f8fafc;
                padding: 12px 16px;
                border-radius: 8px;
                font-family: "JetBrains Mono", monospace;
                font-size: 0.85em;
                overflow-x: auto;
                margin: 1em 0;
              }

              .ProseMirror pre code {
                background: transparent;
                color: inherit;
                padding: 0;
              }

              .ProseMirror ul {
                list-style-type: disc;
                padding-left: 1.5em;
                margin-bottom: 0.9em;
              }

              .ProseMirror ol {
                list-style-type: decimal;
                padding-left: 1.5em;
                margin-bottom: 0.9em;
              }

              .ProseMirror li {
                margin-bottom: 0.35em;
              }

              .ProseMirror [data-indent="1"] {
                margin-left: 1.27cm !important;
              }
              .ProseMirror [data-indent="2"] {
                margin-left: 2.54cm !important;
              }
              .ProseMirror [data-indent="3"] {
                margin-left: 3.81cm !important;
              }
              .ProseMirror [data-indent="4"] {
                margin-left: 5.08cm !important;
              }

              .ProseMirror table {
                margin-top: 1.25em;
                margin-bottom: 1.25em;
                border-collapse: collapse;
                table-layout: fixed;
                width: 100%;
                border-radius: 6px;
                border: 1px solid #cbd5e1;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.06);
                box-sizing: border-box;
                position: relative;
              }

              .ProseMirror table[data-align="center"] { margin-left: auto !important; margin-right: auto !important; }
              .ProseMirror table[data-align="left"] { margin-left: 0 !important; margin-right: auto !important; }
              .ProseMirror table[data-align="right"] { margin-left: auto !important; margin-right: 0 !important; }

              .ProseMirror th {
                background-color: #f1f5f9;
                color: #0f172a;
                font-weight: 700;
                text-align: left;
                border: 1px solid #cbd5e1;
                padding: 8px 12px;
                font-size: 10pt;
                position: relative !important;
                box-sizing: border-box !important;
                min-width: 25px;
                overflow-wrap: anywhere;
                word-break: break-word;
              }

              .ProseMirror td {
                border: 1px solid #cbd5e1;
                padding: 8px 12px;
                font-size: 10pt;
                color: #1e293b;
                vertical-align: top;
                position: relative !important;
                box-sizing: border-box !important;
                min-width: 25px;
                overflow-wrap: anywhere;
                word-break: break-word;
              }

              .ProseMirror tr:nth-child(even) td {
                background-color: #fafbfc;
              }

              /* Selector y celda activa de TipTap tables */
              .ProseMirror .selectedCell:after {
                z-index: 2;
                position: absolute;
                content: "";
                left: 0; right: 0; top: 0; bottom: 0;
                background: rgba(99, 102, 241, 0.18);
                pointer-events: none;
              }

              /* Manilla visual de redimensionamiento de columna al arrastrar el borde */
              .ProseMirror .column-resize-handle {
                position: absolute;
                right: -2px;
                top: 0;
                bottom: -2px;
                width: 4px;
                background-color: #6366f1;
                pointer-events: none;
                z-index: 20;
              }

              .ProseMirror.resize-cursor {
                cursor: col-resize !important;
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

            {/* Contenedor Flex: Si está en paralelo muestra Hoja Principal (izquierda) y Hoja de Continuación (derecha) */}
            <div
              className={`w-full flex ${
                isParallelView && isPagedMode
                  ? 'flex-row justify-center items-start gap-6 lg:gap-8'
                  : 'flex-col items-center'
              }`}
            >
              {/* Hoja de Edición Live Principal */}
              <div
                className="visual-page"
                style={{
                  maxWidth: `${paperPixelWidth}px`,
                }}
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget && editor) {
                    // Calcular la posición exacta del documento correspondiente a las coordenadas (X, Y)
                    // evitando saltar al final del documento si el usuario pulsa en los márgenes
                    const domRect = editor.view.dom.getBoundingClientRect();
                    const targetX = Math.max(domRect.left + 2, Math.min(domRect.right - 2, e.clientX));
                    const pos = editor.view.posAtCoords({ left: targetX, top: e.clientY });
                    if (pos && typeof pos.pos === 'number') {
                      e.preventDefault();
                      editor.chain().focus().setTextSelection(pos.pos).run();
                    }
                  }
                }}
              >
                <FloatingFormatMenu editor={editor} />
                <EditorContent editor={editor} />

                {/* Relleno de altura fija de la última hoja y pie de página */}
                {isPagedMode && (
                  <>
                    <div
                      className="last-page-spacer cursor-text"
                      style={{ height: `${pageInfo.lastPageFillerPx}px` }}
                      onMouseDown={(e) => {
                        if (editor) {
                          e.preventDefault();
                          const domRect = editor.view.dom.getBoundingClientRect();
                          const targetX = Math.max(domRect.left + 2, Math.min(domRect.right - 2, e.clientX));
                          const pos = editor.view.posAtCoords({ left: targetX, top: e.clientY });
                          if (pos && typeof pos.pos === 'number') {
                            editor.chain().focus().setTextSelection(pos.pos).run();
                          } else {
                            editor.commands.focus('end');
                          }
                        }
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

              {/* Hoja de Continuación en Paralelo (vista de 2 páginas lado a lado) */}
              {isParallelView && isPagedMode && (
                <ParallelContinuationSheet
                  currentPage={pageInfo.currentPage}
                  totalPages={pageInfo.pageCount}
                  paperFormat={paperFormat}
                  editor={editor}
                  breakPositions={pageInfo.breakPositions}
                  onClose={() => setIsParallelView(false)}
                  onNavigateToPage={handleNavigateToPage}
                  paperPixelWidth={paperPixelWidth}
                />
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

      {/* Barra de Estado y Métricas Inferior (Dock de Visualización y Escritura) */}
      <footer className="h-9 border-t border-indigo-500/20 bg-slate-900/95 backdrop-blur-md px-2.5 sm:px-4 flex items-center justify-between text-[11px] text-slate-400 z-20 flex-shrink-0 select-none gap-2 overflow-x-auto scrollbar-none">
        {/* Izquierda: Métricas de redacción en vivo */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
          <span className="font-mono text-slate-200">
            <strong>{currentWords}</strong> pal · <strong>{currentChars}</strong> car
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline font-mono">
            Ritmo: <strong>{wpm}</strong> pal/min
          </span>
          <span className="hidden md:inline text-slate-600">|</span>
          {/* Meta de palabras */}
          <div
            onClick={() => setTargetModalOpen(true)}
            className="hidden md:flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors"
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
        </div>

        {/* Derecha: Zoom, Modo Hojas, Formato Físico de Papel y Temporizador */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-auto">
          {/* Controles de Zoom */}
          <div className="flex items-center bg-slate-950/80 border border-slate-700/80 rounded-lg p-0.5 gap-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              className="h-6 w-6 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Alejar zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span
              onClick={handleZoomReset}
              className="text-[10px] font-mono font-bold text-slate-300 px-1 cursor-pointer hover:text-white"
              title="Restablecer a 100%"
            >
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="h-6 w-6 flex items-center justify-center rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Acercar zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomFit}
              className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold text-indigo-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Ajustar ancho automáticamente al espacio de pantalla"
            >
              Ajustar
            </button>
          </div>

          {/* Switch Modo Hojas Paginadas vs Continuo */}
          <button
            type="button"
            onClick={() => {
              setIsPagedMode((v) => {
                const next = !v;
                if (!next) setIsParallelView(false);
                return next;
              });
            }}
            className={`h-7 px-2 rounded-lg border text-[10.5px] font-medium flex items-center gap-1 transition-all ${
              isPagedMode
                ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200 shadow-sm'
                : 'bg-slate-950/80 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600'
            }`}
            title={
              isPagedMode
                ? 'Modo actual: Hojas físicas paginadas. Clic para modo continuo.'
                : 'Modo actual: Lienzo continuo sin saltos. Clic para ver hojas físicas.'
            }
          >
            <BookOpen className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">{isPagedMode ? 'Hojas' : 'Continuo'}</span>
          </button>

          {/* Switch Hojas en Paralelo (dos páginas lado a lado para ver la continuación) */}
          {isPagedMode && (
            <button
              type="button"
              onClick={() => {
                setIsParallelView((v) => {
                  const next = !v;
                  if (next) {
                    onNotify('Vista de 2 hojas en paralelo activada (pliego de lectura)', 'info');
                  }
                  return next;
                });
              }}
              className={`h-7 px-2 rounded-lg border text-[10.5px] font-medium flex items-center gap-1 transition-all ${
                isParallelView
                  ? 'bg-cyan-600/30 border-cyan-500/50 text-cyan-200 shadow-sm'
                  : 'bg-slate-950/80 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600'
              }`}
              title={
                isParallelView
                  ? 'Modo actual: 2 Hojas en Paralelo. Clic para volver a 1 hoja.'
                  : 'Clic para ver 2 hojas en paralelo (continuación a la derecha).'
              }
            >
              <Columns className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">{isParallelView ? '2 Hojas' : '1 Hoja'}</span>
            </button>
          )}

          {/* Selector de Papel Físico: Carta (216x279), Oficio (216x330), A4 (210x297) */}
          <div className="flex items-center bg-slate-950/80 border border-slate-700/80 rounded-lg px-1.5 h-7">
            <select
              value={paperFormat}
              onChange={(e) => handleChangePaperFormat(e.target.value as 'letter' | 'legal' | 'a4')}
              className="bg-transparent text-slate-200 text-[10.5px] font-medium outline-none cursor-pointer"
              title="Formato físico del documento y salto de página"
            >
              <option value="letter" className="bg-slate-900 text-white">Carta (216 × 279 mm)</option>
              <option value="legal" className="bg-slate-900 text-white">Oficio (216 × 330 mm)</option>
              <option value="a4" className="bg-slate-900 text-white">A4 (210 × 297 mm)</option>
            </select>
          </div>

          {/* Indicador de Página en Modo Hojas */}
          {isPagedMode && (
            <span className="hidden xl:inline font-mono text-[10px] text-indigo-300 bg-indigo-950/50 border border-indigo-500/30 px-2 py-1 rounded-md">
              Pág. {pageInfo.currentPage} de {pageInfo.pageCount}
            </span>
          )}

          {/* Temporizador Conectado */}
          <div className="flex items-center gap-1 font-mono text-[10.5px] text-indigo-300 bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-lg">
            <Clock className="w-3 h-3 text-indigo-400" />
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

      {/* Modal de Publicar como Plantilla Comunitaria */}
      <PublishTemplateModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        work={activeWork}
        currentUserId={currentUser?.id}
        currentUserName={currentUser?.name}
        currentUserHandle={currentUser?.username}
        onNotify={onNotify}
        onOpenAuthModal={onOpenAccountModal}
      />

      {/* Modal de Importación Progresiva */}
      <ImportDocumentModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setDroppedImportFile(null);
        }}
        droppedFile={droppedImportFile}
        onConfirmImport={handleConfirmImport}
      />

      {/* Modal de Compartición de Redacción (en vivo / copia) */}
      <ShareWorkModal
        open={shareWorkModalOpen}
        work={shareWorkTarget}
        user={
          userProfile ||
          (currentUser
            ? {
                id: currentUser.id,
                email: '',
                fullName: currentUser.name || '',
                username: currentUser.username || null,
              }
            : null)
        }
        friendships={friendships}
        onClose={() => {
          setShareWorkModalOpen(false);
          setShareWorkTarget(null);
        }}
        onOpenFriendsModal={() => {
          setShareWorkModalOpen(false);
          onOpenFriendsModal?.();
        }}
        onNotify={onNotify}
      />

      {/* Notificación Flotante de Progreso en Esquina Inferior Derecha */}
      <FloatingImportProgress
        progress={importProgress}
        onDismiss={() => setImportProgress(null)}
      />
    </div>
  );
};
