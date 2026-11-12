import { RealtimeChannel } from '@supabase/supabase-js';
import {
  CollaboratorPresence,
  DocumentRecord,
  DocumentShareRecord,
  DocumentType,
  FriendshipRecord,
  FriendshipStatus,
  PublicProfile,
  RedeemedShareLinkResult,
  ShareLinkRecord,
  ShareMode,
  ShareRole,
  ShareStatus,
  StickyNoteRecord,
} from '../types/studyflow';
import {
  cloudUpsertDocument,
  cloudUpsertNote,
  downloadDocumentBinaryFromCloud,
  mapNoteRow,
  uploadDocumentBinaryToCloud,
} from './cloudSync';
import { dbPut } from './localDb';
import { supabase } from './supabaseClient';

const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'studyflow',
  'support',
  'soporte',
  'system',
  'sistema',
  'root',
]);

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

export function validateUsernameFormat(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = normalizeUsername(raw);
  if (!normalized) {
    return { valid: false, normalized, error: 'Ingresa un nombre de usuario.' };
  }
  if (normalized.length < 3 || normalized.length > 24) {
    return {
      valid: false,
      normalized,
      error: 'Debe tener entre 3 y 24 caracteres.',
    };
  }
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Usa solo minúsculas (a-z), números (0-9) o guión bajo (_).',
    };
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Ese nombre de usuario está reservado.',
    };
  }
  return { valid: true, normalized };
}

export function isEmailIdentifier(identifier: string): boolean {
  const trimmed = identifier.trim();
  const atIndex = trimmed.indexOf('@');
  return atIndex > 0 && trimmed.indexOf('.', atIndex) > atIndex;
}

export function extractShareTokenFromSearch(search: string): string | null {
  try {
    const params = new URLSearchParams(search);
    const token = params.get('share')?.trim();
    return token || null;
  } catch {
    return null;
  }
}

export function buildShareUrl(token: string): string {
  if (typeof window === 'undefined') return `?share=${encodeURIComponent(token)}`;
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('share', token);
  return url.toString();
}

export function canEditNote(
  note: StickyNoteRecord,
  currentUserId: string | null
): boolean {
  if (!currentUserId) return true; // Modo local
  if (!note.userId) return true;
  return note.userId === currentUserId;
}

export function canDeleteNote(
  note: StickyNoteRecord,
  activeDoc: DocumentRecord | null,
  currentUserId: string | null
): boolean {
  if (!currentUserId) return true; // Modo local
  if (!note.userId || note.userId === currentUserId) return true;
  // El dueño del documento puede moderar (eliminar) notas compartidas en su documento
  if (
    activeDoc &&
    note.isShared &&
    (!activeDoc.sharedRole || activeDoc.sharedRole === 'owner') &&
    (!activeDoc.ownerId || activeDoc.ownerId === currentUserId)
  ) {
    return true;
  }
  return false;
}

function generateSecureToken(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export async function checkUsernameAvailable(rawUsername: string): Promise<boolean> {
  const check = validateUsernameFormat(rawUsername);
  if (!check.valid) return false;
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('is_username_available', {
    p_username: check.normalized,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function resolveEmailForLogin(identifier: string): Promise<string | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;
  if (isEmailIdentifier(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('resolve_login_email', {
    p_identifier: normalizeUsername(trimmed),
  });
  if (error) throw error;
  return (data as string | null) || null;
}

export async function updateMyUsername(
  userId: string,
  rawUsername: string
): Promise<string> {
  const check = validateUsernameFormat(rawUsername);
  if (!check.valid) {
    throw new Error(check.error || 'Nombre de usuario inválido');
  }
  if (!supabase) throw new Error('Supabase no configurado');
  const available = await checkUsernameAvailable(check.normalized);
  if (!available) {
    throw new Error(`El usuario @${check.normalized} no está disponible.`);
  }
  const { error } = await supabase
    .from('profiles')
    .update({ username: check.normalized, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
  return check.normalized;
}

export async function searchUsersByUsername(query: string): Promise<PublicProfile[]> {
  if (!supabase) return [];
  const clean = normalizeUsername(query);
  if (clean.length < 2) return [];
  const { data, error } = await supabase.rpc('search_public_profiles', {
    p_query: clean,
  });
  if (error) throw error;
  return ((data || []) as Array<{ id: string; username: string | null; full_name: string | null }>).map(
    (row) => ({
      id: row.id,
      username: row.username,
      fullName: row.full_name || row.username || 'Estudiante',
    })
  );
}

export async function fetchPublicProfilesMap(
  ids: string[]
): Promise<Map<string, PublicProfile>> {
  const map = new Map<string, PublicProfile>();
  if (!supabase || ids.length === 0) return map;
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return map;

  const { data, error } = await supabase.rpc('get_public_profiles_by_ids', {
    p_ids: uniqueIds,
  });
  if (error || !data) return map;
  for (const row of data as Array<{
    id: string;
    username: string | null;
    full_name: string | null;
  }>) {
    map.set(row.id, {
      id: row.id,
      username: row.username,
      fullName: row.full_name || row.username || 'Estudiante',
    });
  }
  return map;
}

export async function fetchFriendships(userId: string): Promise<FriendshipRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  const rows = data || [];
  const peerIds = rows.map((r) =>
    r.requester_id === userId ? (r.addressee_id as string) : (r.requester_id as string)
  );
  const profilesMap = await fetchPublicProfilesMap(peerIds);

  return rows.map((r) => {
    const peerId = r.requester_id === userId ? r.addressee_id : r.requester_id;
    return {
      id: r.id,
      requesterId: r.requester_id,
      addresseeId: r.addressee_id,
      status: r.status as FriendshipStatus,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      peer: profilesMap.get(peerId) || {
        id: peerId,
        username: null,
        fullName: 'Estudiante',
      },
    };
  });
}

export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase.from('friendships').insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
    status: 'pending',
  });
  if (error) throw error;
}

export async function respondFriendRequest(
  friendshipId: string,
  status: 'accepted' | 'rejected'
): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  if (status === 'rejected') {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);
  if (error) throw error;
}

export async function removeFriendship(friendshipId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw error;
}

export async function fetchIncomingShares(
  userId: string
): Promise<DocumentShareRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('document_shares')
    .select(
      'id, doc_id, owner_id, recipient_id, share_mode, include_notes, role, status, created_at, updated_at, documents(name, file_type, page_count, storage_path, size)'
    )
    .eq('recipient_id', userId)
    .neq('status', 'revoked')
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rows = data || [];
  const ownerIds = rows.map((r) => r.owner_id as string);
  const profilesMap = await fetchPublicProfilesMap(ownerIds);

  return rows.map((r) => {
    const docObj = Array.isArray(r.documents) ? r.documents[0] : r.documents;
    return {
      id: r.id,
      docId: r.doc_id,
      ownerId: r.owner_id,
      recipientId: r.recipient_id,
      shareMode: r.share_mode as ShareMode,
      includeNotes: Boolean(r.include_notes),
      role: r.role as ShareRole,
      status: r.status as ShareStatus,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      docName: docObj?.name || 'Documento compartido',
      fileType: (docObj?.file_type || 'pdf') as DocumentType,
      pageCount: Number(docObj?.page_count || 1),
      storagePath: docObj?.storage_path || null,
      size: Number(docObj?.size || 0),
      ownerProfile: profilesMap.get(r.owner_id),
    };
  });
}

export async function fetchOutgoingSharesForDoc(
  ownerId: string,
  docId: string
): Promise<DocumentShareRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('document_shares')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('doc_id', docId)
    .neq('status', 'revoked')
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rows = data || [];
  const recipientIds = rows.map((r) => r.recipient_id as string);
  const profilesMap = await fetchPublicProfilesMap(recipientIds);

  return rows.map((r) => ({
    id: r.id,
    docId: r.doc_id,
    ownerId: r.owner_id,
    recipientId: r.recipient_id,
    shareMode: r.share_mode as ShareMode,
    includeNotes: Boolean(r.include_notes),
    role: r.role as ShareRole,
    status: r.status as ShareStatus,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    recipientProfile: profilesMap.get(r.recipient_id),
  }));
}

export async function fetchSharedDocumentsWithMe(
  userId: string
): Promise<DocumentRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('document_shares')
    .select(
      'id, doc_id, owner_id, role, status, share_mode, documents(id, name, file_type, size, page_count, current_page, storage_path, upload_date)'
    )
    .eq('recipient_id', userId)
    .eq('share_mode', 'collaborative')
    .eq('status', 'accepted');

  if (error) throw error;
  const rows = data || [];
  const ownerIds = rows.map((r) => r.owner_id as string);
  const profilesMap = await fetchPublicProfilesMap(ownerIds);

  const docs: DocumentRecord[] = [];
  for (const r of rows) {
    const d = Array.isArray(r.documents) ? r.documents[0] : r.documents;
    if (!d) continue;
    const ownerProfile = profilesMap.get(r.owner_id);
    docs.push({
      id: d.id,
      folderId: null,
      name: d.name,
      fileType: (d.file_type || 'pdf') as DocumentType,
      size: Number(d.size || 0),
      pageCount: Number(d.page_count || 1),
      currentPage: Number(d.current_page || 1),
      uploadDate: d.upload_date,
      storagePath: d.storage_path || null,
      ownerId: r.owner_id,
      ownerUsername: ownerProfile?.username || ownerProfile?.fullName || null,
      sharedRole: r.role as 'collaborator' | 'viewer',
      shareId: r.id,
    });
  }
  return docs;
}

export async function shareDocumentWithFriend(params: {
  docId: string;
  ownerId: string;
  recipientId: string;
  shareMode: ShareMode;
  includeNotes: boolean;
  role: ShareRole;
}): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase.from('document_shares').insert({
    doc_id: params.docId,
    owner_id: params.ownerId,
    recipient_id: params.recipientId,
    share_mode: params.shareMode,
    include_notes: params.includeNotes,
    role: params.shareMode === 'copy' ? 'viewer' : params.role,
    status: 'pending',
  });
  if (error) throw error;
}

export async function updateShareStatusOrRole(
  shareId: string,
  patch: { status?: ShareStatus; role?: ShareRole }
): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  if (patch.status === 'revoked') {
    const { error } = await supabase.from('document_shares').delete().eq('id', shareId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('document_shares')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', shareId);
  if (error) throw error;
}

export async function createShareLink(params: {
  docId: string;
  ownerId: string;
  shareMode: ShareMode;
  includeNotes: boolean;
  role: ShareRole;
  expiresInDays?: number | null;
}): Promise<ShareLinkRecord> {
  if (!supabase) throw new Error('Supabase no configurado');
  const token = generateSecureToken();
  const expiresAt =
    params.expiresInDays && params.expiresInDays > 0
      ? new Date(Date.now() + params.expiresInDays * 86_400_000).toISOString()
      : null;

  const { data, error } = await supabase
    .from('share_links')
    .insert({
      token,
      doc_id: params.docId,
      owner_id: params.ownerId,
      share_mode: params.shareMode,
      include_notes: params.includeNotes,
      role: params.shareMode === 'copy' ? 'viewer' : params.role,
      expires_at: expiresAt,
    })
    .select('*')
    .single();

  if (error || !data) throw error || new Error('No se pudo generar el enlace');
  return {
    id: data.id,
    token: data.token,
    docId: data.doc_id,
    ownerId: data.owner_id,
    shareMode: data.share_mode as ShareMode,
    includeNotes: Boolean(data.include_notes),
    role: data.role as ShareRole,
    revoked: Boolean(data.revoked),
    expiresAt: data.expires_at,
    createdAt: data.created_at,
  };
}

export async function fetchShareLinksForDoc(
  ownerId: string,
  docId: string
): Promise<ShareLinkRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('doc_id', docId)
    .eq('revoked', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    token: row.token,
    docId: row.doc_id,
    ownerId: row.owner_id,
    shareMode: row.share_mode as ShareMode,
    includeNotes: Boolean(row.include_notes),
    role: row.role as ShareRole,
    revoked: Boolean(row.revoked),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

export async function revokeShareLink(linkId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase
    .from('share_links')
    .update({ revoked: true })
    .eq('id', linkId);
  if (error) throw error;
}

export async function redeemShareLink(token: string): Promise<RedeemedShareLinkResult> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase.rpc('redeem_share_link', {
    p_token: token,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('ENLACE_INVALIDO_O_EXPIRADO');
  return {
    shareId: row.share_id,
    docId: row.doc_id,
    docName: row.doc_name,
    fileType: row.file_type as DocumentType,
    size: Number(row.size || 0),
    pageCount: Number(row.page_count || 1),
    storagePath: row.storage_path || null,
    ownerId: row.owner_id,
    ownerUsername: row.owner_username || null,
    shareMode: row.share_mode as ShareMode,
    includeNotes: Boolean(row.include_notes),
    role: row.role as ShareRole,
    status: row.status as ShareStatus,
  };
}

export async function acceptDocumentCopy(params: {
  shareId: string;
  sourceDocId: string;
  docName: string;
  fileType: DocumentType;
  size: number;
  pageCount: number;
  storagePath: string | null;
  includeNotes: boolean;
  recipientId: string;
  targetFolderId: string | null;
}): Promise<{ newDoc: DocumentRecord; copiedNotes: StickyNoteRecord[] }> {
  if (!supabase) throw new Error('Supabase no configurado');

  const sourceStub: DocumentRecord = {
    id: params.sourceDocId,
    folderId: null,
    name: params.docName,
    fileType: params.fileType,
    size: params.size,
    pageCount: params.pageCount,
    currentPage: 1,
    uploadDate: new Date().toISOString(),
    storagePath: params.storagePath,
  };

  const buffer = await downloadDocumentBinaryFromCloud(sourceStub);
  if (!buffer) {
    throw new Error('No se pudo descargar el archivo original desde la nube.');
  }

  const newDocId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const newDoc: DocumentRecord = {
    id: newDocId,
    folderId: params.targetFolderId,
    name: params.docName,
    fileType: params.fileType,
    size: params.size,
    pageCount: params.pageCount,
    currentPage: 1,
    uploadDate: new Date().toISOString(),
  };

  const newStoragePath = await uploadDocumentBinaryToCloud(
    params.recipientId,
    newDoc,
    buffer
  );
  newDoc.storagePath = newStoragePath;

  await cloudUpsertDocument(params.recipientId, newDoc);
  const fullLocalDoc: DocumentRecord = { ...newDoc, data: buffer };
  await dbPut('documents', fullLocalDoc);

  const copiedNotes: StickyNoteRecord[] = [];
  if (params.includeNotes) {
    const { data: sourceNotes } = await supabase
      .from('notes')
      .select('*')
      .eq('doc_id', params.sourceDocId);

    for (const rawNote of sourceNotes || []) {
      const mapped = mapNoteRow(rawNote as Record<string, unknown>);
      const cloned: StickyNoteRecord = {
        ...mapped,
        id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        docId: newDocId,
        userId: params.recipientId,
        authorUsername: null,
        isShared: false,
        createdAt: new Date().toISOString(),
      };
      await dbPut('notes', cloned);
      await cloudUpsertNote(params.recipientId, cloned);
      copiedNotes.push(cloned);
    }
  }

  await supabase
    .from('document_shares')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', params.shareId);

  return { newDoc: fullLocalDoc, copiedNotes };
}

export async function fetchNotesForDocument(docId: string): Promise<StickyNoteRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('doc_id', docId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data || []).map((row) => mapNoteRow(row as Record<string, unknown>));
}

export function subscribeToDocumentCollaboration(params: {
  docId: string;
  userId: string;
  username: string;
  fullName: string;
  initialPage: number;
  onNoteUpsert: (note: StickyNoteRecord) => void;
  onNoteDelete: (noteId: string) => void;
  onPresenceChange: (peers: CollaboratorPresence[]) => void;
}): {
  updatePage: (page: number) => void;
  unsubscribe: () => void;
} {
  if (!supabase) {
    return {
      updatePage: () => {},
      unsubscribe: () => {},
    };
  }

  let currentPage = params.initialPage;
  const channelName = `doc-collab:${params.docId}`;
  const channel: RealtimeChannel = supabase.channel(channelName, {
    config: {
      presence: { key: params.userId },
    },
  });

  const emitPresence = () => {
    const state = channel.presenceState<CollaboratorPresence>();
    const peers: CollaboratorPresence[] = [];
    for (const entries of Object.values(state)) {
      if (entries && entries.length > 0) {
        peers.push(entries[0]);
      }
    }
    params.onPresenceChange(peers);
  };

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `doc_id=eq.${params.docId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as Record<string, unknown>;
          const mapped = mapNoteRow(row);
          // Solo mostrar si es nota propia o nota compartida
          if (mapped.userId === params.userId || mapped.isShared) {
            params.onNoteUpsert(mapped);
          } else if (payload.eventType === 'UPDATE' && !mapped.isShared) {
            // Si otro usuario pasó su nota a privada, quitarla de nuestra vista
            params.onNoteDelete(mapped.id);
          }
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as Record<string, unknown> | undefined;
          if (oldRow?.id) {
            params.onNoteDelete(String(oldRow.id));
          }
        }
      }
    )
    .on('presence', { event: 'sync' }, emitPresence)
    .on('presence', { event: 'join' }, emitPresence)
    .on('presence', { event: 'leave' }, emitPresence)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId: params.userId,
          username: params.username,
          fullName: params.fullName,
          page: currentPage,
          onlineAt: new Date().toISOString(),
        });
      }
    });

  return {
    updatePage: (page: number) => {
      currentPage = page;
      void channel.track({
        userId: params.userId,
        username: params.username,
        fullName: params.fullName,
        page,
        onlineAt: new Date().toISOString(),
      });
    },
    unsubscribe: () => {
      void supabase?.removeChannel(channel);
    },
  };
}

export function subscribeToSocialNotifications(params: {
  userId: string;
  onRefreshNeeded: () => void;
}): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`social-inbox:${params.userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'friendships',
        filter: `addressee_id=eq.${params.userId}`,
      },
      () => params.onRefreshNeeded()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'friendships',
        filter: `requester_id=eq.${params.userId}`,
      },
      () => params.onRefreshNeeded()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'document_shares',
        filter: `recipient_id=eq.${params.userId}`,
      },
      () => params.onRefreshNeeded()
    )
    .subscribe();

  return () => {
    void supabase?.removeChannel(channel);
  };
}
