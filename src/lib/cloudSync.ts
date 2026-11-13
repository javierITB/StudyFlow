import {
  DocumentOcclusionRecord,
  DocumentRecord,
  DocumentType,
  FolderColor,
  FolderRecord,
  FsrsCardState,
  KanbanZone,
  NoteColor,
  NoteFormat,
  PersistedPlanState,
  StickyNoteRecord,
  StudySettings,
  TaskRecord,
} from '../types/studyflow';
import { DEFAULT_STUDY_SETTINGS } from './studyMethods';
import { supabase } from './supabaseClient';
import { dbGet, dbPut } from './localDb';

const STORAGE_BUCKET = 'study-files';

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function mapNoteRow(n: Record<string, unknown>): StickyNoteRecord {
  const meta = (n.meta && typeof n.meta === 'object' ? n.meta : {}) as Record<
    string,
    unknown
  >;
  return {
    id: String(n.id),
    docId: (n.doc_id as string | null) || null,
    page: (n.page as number | null) ?? null,
    xRatio: (n.x_ratio as number | null) ?? null,
    yRatio: (n.y_ratio as number | null) ?? null,
    content: String(n.content || ''),
    color: ((n.color as string) || 'yellow') as NoteColor,
    zone: ((n.zone as string) || 'ideas') as KanbanZone,
    createdAt: String(n.created_at || new Date().toISOString()),
    userId: (n.user_id as string | undefined) || undefined,
    authorUsername: (n.author_username as string | null) ?? null,
    isShared: Boolean(n.is_shared),
    format: (meta.format as NoteFormat | undefined) || undefined,
    cornellCues: (meta.cornellCues as string | undefined) || undefined,
    cornellSummary: (meta.cornellSummary as string | undefined) || undefined,
    isComplex: typeof meta.isComplex === 'boolean' ? meta.isComplex : undefined,
    feynmanSimpleExplanation:
      (meta.feynmanSimpleExplanation as string | undefined) || undefined,
    feynmanGaps: (meta.feynmanGaps as string | undefined) || undefined,
    feynmanCompletedAt: (meta.feynmanCompletedAt as string | undefined) || undefined,
    fsrs: (meta.fsrs as FsrsCardState | undefined) || undefined,
  };
}

export function mapOcclusionRow(o: Record<string, unknown>): DocumentOcclusionRecord {
  const meta = (o.meta && typeof o.meta === 'object' ? o.meta : {}) as Record<
    string,
    unknown
  >;
  return {
    id: String(o.id),
    docId: String(o.doc_id),
    page: Number(o.page || 1),
    xRatio: Number(o.x_ratio || 0),
    yRatio: Number(o.y_ratio || 0),
    widthRatio: Number(o.width_ratio || 0.2),
    heightRatio: Number(o.height_ratio || 0.1),
    label: (o.label as string | undefined) || undefined,
    fsrs: (meta.fsrs as FsrsCardState | undefined) || undefined,
    createdAt: String(o.created_at || new Date().toISOString()),
    userId: (o.user_id as string | undefined) || undefined,
  };
}

export async function fetchCloudSnapshot(userId: string): Promise<{
  folders: FolderRecord[];
  documents: DocumentRecord[];
  notes: StickyNoteRecord[];
  occlusions: DocumentOcclusionRecord[];
  tasks: TaskRecord[];
  studySettings: StudySettings;
  planState: PersistedPlanState | null;
  username: string | null;
  fullName: string | null;
}> {
  if (!supabase) {
    throw new Error('Supabase no configurado');
  }

  const [foldersRes, docsRes, notesRes, occRes, tasksRes, profileRes, planRes] =
    await Promise.all([
      supabase.from('folders').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('documents').select('*').eq('user_id', userId).order('upload_date'),
      supabase.from('notes').select('*').order('created_at'),
      supabase.from('document_occlusions').select('*').order('created_at'),
      supabase.from('tasks').select('*').eq('user_id', userId).order('created_at'),
      supabase
        .from('profiles')
        .select('study_settings, username, full_name')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('study_plans')
        .select('plan_data')
        .eq('user_id', userId)
        .eq('id', `active_${userId}`)
        .maybeSingle(),
    ]);

  if (foldersRes.error) throw foldersRes.error;
  if (docsRes.error) throw docsRes.error;
  if (notesRes.error) throw notesRes.error;
  if (tasksRes.error) throw tasksRes.error;

  const folders: FolderRecord[] = (foldersRes.data || []).map((f) => ({
    id: f.id,
    name: f.name,
    color: (f.color || 'indigo') as FolderColor,
    createdAt: f.created_at,
  }));

  const documents: DocumentRecord[] = [];
  for (const d of docsRes.data || []) {
    const cachedLocal = await dbGet<DocumentRecord>('documents', d.id);
    documents.push({
      id: d.id,
      folderId: d.folder_id || null,
      name: d.name,
      fileType: (d.file_type || 'pdf') as DocumentType,
      size: Number(d.size || 0),
      pageCount: Number(d.page_count || 1),
      currentPage: Number(d.current_page || 1),
      uploadDate: d.upload_date,
      storagePath: d.storage_path || null,
      deadline: (d.deadline as string | null) ?? cachedLocal?.deadline ?? null,
      data: cachedLocal?.data,
    });
  }

  const notes: StickyNoteRecord[] = (notesRes.data || []).map((n) =>
    mapNoteRow(n as Record<string, unknown>)
  );

  // Si la tabla document_occlusions aún no fue migrada en Supabase, no bloquear snapshot
  const occlusions: DocumentOcclusionRecord[] =
    !occRes.error && occRes.data
      ? occRes.data.map((o) => mapOcclusionRow(o as Record<string, unknown>))
      : [];

  const tasks: TaskRecord[] = (tasksRes.data || []).map((t) => ({
    id: t.id,
    title: t.title,
    docId: t.doc_id || null,
    folderId: t.folder_id || null,
    completed: Boolean(t.completed),
    createdAt: t.created_at,
  }));

  const remoteSettings = (profileRes.data?.study_settings || {}) as Partial<StudySettings>;
  const studySettings: StudySettings = {
    ...DEFAULT_STUDY_SETTINGS,
    ...remoteSettings,
    appearance: {
      ...(DEFAULT_STUDY_SETTINGS.appearance!),
      ...(remoteSettings.appearance || {}),
    },
  };

  const planState = (planRes.data?.plan_data as PersistedPlanState | undefined) || null;

  return {
    folders,
    documents,
    notes,
    occlusions,
    tasks,
    studySettings,
    planState,
    username: (profileRes.data?.username as string | null) ?? null,
    fullName: (profileRes.data?.full_name as string | null) ?? null,
  };
}

export async function uploadDocumentBinaryToCloud(
  userId: string,
  doc: DocumentRecord,
  buffer: ArrayBuffer
): Promise<string | null> {
  if (!supabase) return null;
  const storagePath = `${userId}/${doc.id}/${sanitizeFileName(doc.name)}`;
  const mimeMap: Record<DocumentType, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType: mimeMap[doc.fileType],
    upsert: true,
  });
  if (error) throw error;
  return storagePath;
}

export async function downloadDocumentBinaryFromCloud(
  doc: DocumentRecord
): Promise<ArrayBuffer | null> {
  if (!supabase || !doc.storagePath) return null;
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(doc.storagePath);
  if (error || !data) throw error || new Error('No se pudo descargar el archivo');
  const buffer = await data.arrayBuffer();
  await dbPut('documents', { ...doc, data: buffer });
  return buffer;
}

export async function cloudUpsertFolder(userId: string, folder: FolderRecord): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('folders').upsert({
    id: folder.id,
    user_id: userId,
    name: folder.name,
    color: folder.color,
    created_at: folder.createdAt,
  });
  if (error) throw error;
}

export async function cloudDeleteFolder(userId: string, folderId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function cloudUpsertDocument(
  userId: string,
  doc: DocumentRecord
): Promise<void> {
  if (!supabase) return;
  const basePayload = {
    id: doc.id,
    user_id: userId,
    folder_id: doc.folderId,
    name: doc.name,
    file_type: doc.fileType,
    size: doc.size,
    page_count: doc.pageCount,
    current_page: doc.currentPage,
    storage_path: doc.storagePath || null,
    upload_date: doc.uploadDate,
  };
  const { error } = await supabase.from('documents').upsert({
    ...basePayload,
    deadline: doc.deadline ?? null,
  });
  if (error) {
    // Fallback si aún no existe columna `deadline` (migración v3 pendiente)
    if (String(error.message || '').toLowerCase().includes('deadline')) {
      const retry = await supabase.from('documents').upsert(basePayload);
      if (retry.error) throw retry.error;
      return;
    }
    throw error;
  }
}

export async function cloudDeleteDocument(
  userId: string,
  doc: DocumentRecord
): Promise<void> {
  if (!supabase) return;
  if (doc.storagePath) {
    await supabase.storage.from(STORAGE_BUCKET).remove([doc.storagePath]);
  }
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', doc.id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function cloudUpsertNote(userId: string, note: StickyNoteRecord): Promise<void> {
  if (!supabase) return;
  const basePayload = {
    id: note.id,
    user_id: note.userId || userId,
    doc_id: note.docId,
    page: note.page,
    x_ratio: note.xRatio,
    y_ratio: note.yRatio,
    content: note.content,
    color: note.color,
    zone: note.zone,
    is_shared: Boolean(note.isShared),
    author_username: note.authorUsername ?? null,
    created_at: note.createdAt,
  };
  const meta: Record<string, unknown> = {};
  if (note.format) meta.format = note.format;
  if (note.cornellCues !== undefined) meta.cornellCues = note.cornellCues;
  if (note.cornellSummary !== undefined) meta.cornellSummary = note.cornellSummary;
  if (note.isComplex !== undefined) meta.isComplex = note.isComplex;
  if (note.feynmanSimpleExplanation !== undefined) {
    meta.feynmanSimpleExplanation = note.feynmanSimpleExplanation;
  }
  if (note.feynmanGaps !== undefined) meta.feynmanGaps = note.feynmanGaps;
  if (note.feynmanCompletedAt !== undefined) {
    meta.feynmanCompletedAt = note.feynmanCompletedAt;
  }
  if (note.fsrs) meta.fsrs = note.fsrs;

  const { error } = await supabase.from('notes').upsert({
    ...basePayload,
    meta,
  });
  if (error) {
    // Fallback retrocompatible si aún no existe columna `meta` en Supabase
    if (String(error.message || '').toLowerCase().includes('meta')) {
      const retry = await supabase.from('notes').upsert(basePayload);
      if (retry.error) throw retry.error;
      return;
    }
    throw error;
  }
}

export async function cloudDeleteNote(_userId: string, noteId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('notes').delete().eq('id', noteId);
  if (error) throw error;
}

export async function cloudUpsertOcclusion(
  userId: string,
  occlusion: DocumentOcclusionRecord
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('document_occlusions').upsert({
    id: occlusion.id,
    user_id: occlusion.userId || userId,
    doc_id: occlusion.docId,
    page: occlusion.page,
    x_ratio: occlusion.xRatio,
    y_ratio: occlusion.yRatio,
    width_ratio: occlusion.widthRatio,
    height_ratio: occlusion.heightRatio,
    label: occlusion.label ?? null,
    meta: occlusion.fsrs ? { fsrs: occlusion.fsrs } : {},
    created_at: occlusion.createdAt,
  });
  if (error) {
    // Si la tabla document_occlusions aún no existe en nube, permanecer sin romper flujo local
    const msg = String(error.message || '').toLowerCase();
    if (msg.includes('document_occlusions') || msg.includes('does not exist')) {
      return;
    }
    throw error;
  }
}

export async function cloudDeleteOcclusion(
  _userId: string,
  occlusionId: string
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('document_occlusions')
    .delete()
    .eq('id', occlusionId);
  if (error) {
    const msg = String(error.message || '').toLowerCase();
    if (msg.includes('document_occlusions') || msg.includes('does not exist')) {
      return;
    }
    throw error;
  }
}

export async function cloudUpsertTask(userId: string, task: TaskRecord): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('tasks').upsert({
    id: task.id,
    user_id: userId,
    doc_id: task.docId,
    folder_id: task.folderId,
    title: task.title,
    completed: task.completed,
    created_at: task.createdAt,
  });
  if (error) throw error;
}

export async function cloudDeleteTask(userId: string, taskId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function cloudSaveStudySettings(
  userId: string,
  settings: StudySettings
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    study_settings: settings,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function cloudSavePlanState(
  userId: string,
  planState: PersistedPlanState
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('study_plans').upsert({
    id: `active_${userId}`,
    user_id: userId,
    plan_data: planState,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

