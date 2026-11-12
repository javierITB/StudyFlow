import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Send,
  Share2,
  StickyNote,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  DocumentRecord,
  DocumentShareRecord,
  FriendshipRecord,
  ShareLinkRecord,
  ShareMode,
  ShareRole,
  UserProfile,
} from '../types/studyflow';
import {
  buildShareUrl,
  createShareLink,
  fetchOutgoingSharesForDoc,
  fetchShareLinksForDoc,
  revokeShareLink,
  shareDocumentWithFriend,
  updateShareStatusOrRole,
} from '../lib/collaboration';
import { formatErrorMessageEs } from '../lib/errorMessages';

interface ShareDocumentModalProps {
  open: boolean;
  doc: DocumentRecord | null;
  user: UserProfile | null;
  friendships: FriendshipRecord[];
  onClose: () => void;
  onOpenFriendsModal: () => void;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ShareDocumentModal: React.FC<ShareDocumentModalProps> = ({
  open,
  doc,
  user,
  friendships,
  onClose,
  onOpenFriendsModal,
  onNotify,
}) => {
  const [shareMode, setShareMode] = useState<ShareMode>('collaborative');
  const [includeNotes, setIncludeNotes] = useState<boolean>(true);
  const [role, setRole] = useState<ShareRole>('collaborator');
  const [channel, setChannel] = useState<'friend' | 'link'>('friend');

  const [outgoingShares, setOutgoingShares] = useState<DocumentShareRecord[]>([]);
  const [activeLinks, setActiveLinks] = useState<ShareLinkRecord[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadShareMetadata = async () => {
    if (!user || !doc) return;
    setLoadingMeta(true);
    try {
      const [shares, links] = await Promise.all([
        fetchOutgoingSharesForDoc(user.id, doc.id),
        fetchShareLinksForDoc(user.id, doc.id),
      ]);
      setOutgoingShares(shares);
      setActiveLinks(links);
    } catch {
      // Silenciar si aún no hay tabla o está offline
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    if (open && user && doc) {
      setErrorMsg(null);
      void loadShareMetadata();
    }
  }, [open, user?.id, doc?.id]);

  if (!open || !doc || !user) return null;

  const acceptedFriends = friendships.filter((f) => f.status === 'accepted');

  const handleSendToFriend = async (friendId: string, friendLabel: string) => {
    setErrorMsg(null);
    setBusyId(friendId);
    try {
      await shareDocumentWithFriend({
        docId: doc.id,
        ownerId: user.id,
        recipientId: friendId,
        shareMode,
        includeNotes: shareMode === 'copy' ? includeNotes : false,
        role,
      });
      onNotify(
        shareMode === 'copy'
          ? `Copia enviada a ${friendLabel}`
          : `Invitación colaborativa enviada a ${friendLabel}`,
        'success'
      );
      await loadShareMetadata();
    } catch (err) {
      setErrorMsg(formatErrorMessageEs(err, 'No se pudo compartir el documento'));
    } finally {
      setBusyId(null);
    }
  };

  const handleGenerateLink = async () => {
    setErrorMsg(null);
    setBusyId('create-link');
    try {
      const link = await createShareLink({
        docId: doc.id,
        ownerId: user.id,
        shareMode,
        includeNotes: shareMode === 'copy' ? includeNotes : false,
        role,
      });
      const url = buildShareUrl(link.token);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopiedLinkId(link.id);
        window.setTimeout(() => setCopiedLinkId(null), 2000);
        onNotify('Enlace generado y copiado al portapapeles', 'success');
      } else {
        onNotify('Enlace generado correctamente', 'success');
      }
      await loadShareMetadata();
    } catch (err) {
      setErrorMsg(formatErrorMessageEs(err, 'No se pudo generar el enlace'));
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyExistingLink = async (link: ShareLinkRecord) => {
    const url = buildShareUrl(link.token);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(link.id);
      window.setTimeout(() => setCopiedLinkId(null), 2000);
      onNotify('Enlace copiado al portapapeles', 'success');
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    setBusyId(linkId);
    try {
      await revokeShareLink(linkId);
      setActiveLinks((prev) => prev.filter((l) => l.id !== linkId));
      onNotify('Enlace revocado', 'info');
    } catch (err) {
      setErrorMsg(formatErrorMessageEs(err, 'No se pudo revocar el enlace'));
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleShareRole = async (share: DocumentShareRecord) => {
    const nextRole: ShareRole =
      share.role === 'collaborator' ? 'viewer' : 'collaborator';
    setBusyId(share.id);
    try {
      await updateShareStatusOrRole(share.id, { role: nextRole });
      setOutgoingShares((prev) =>
        prev.map((s) => (s.id === share.id ? { ...s, role: nextRole } : s))
      );
      onNotify('Permiso actualizado', 'success');
    } catch (err) {
      setErrorMsg(formatErrorMessageEs(err, 'No se pudo actualizar el permiso'));
    } finally {
      setBusyId(null);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    setBusyId(shareId);
    try {
      await updateShareStatusOrRole(shareId, { status: 'revoked' });
      setOutgoingShares((prev) => prev.filter((s) => s.id !== shareId));
      onNotify('Acceso revocado', 'info');
    } catch (err) {
      setErrorMsg(formatErrorMessageEs(err, 'No se pudo quitar el acceso'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/35 flex items-center justify-center text-indigo-300 flex-shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                Compartir: {doc.name}
              </h3>
              <p className="text-[11px] text-slate-400">
                Envía una copia o inicia una sesión colaborativa en vivo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* 1. Modalidad */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-300">
              1. ¿Cómo quieres compartirlo?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShareMode('collaborative')}
                className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                  shareMode === 'collaborative'
                    ? 'bg-indigo-600/20 border-indigo-400 text-white'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5 text-slate-100">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sesión colaborativa</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Leen el mismo archivo en tiempo real con notas compartidas y privadas.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setShareMode('copy')}
                className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                  shareMode === 'copy'
                    ? 'bg-emerald-600/20 border-emerald-400 text-white'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5 text-slate-100">
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Compartir una copia</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Cada persona recibe su propia copia independiente en su biblioteca.
                </p>
              </button>
            </div>

            {/* Opciones según modalidad */}
            {shareMode === 'collaborative' ? (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-300 font-medium">
                  Permiso de los invitados:
                </span>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setRole('collaborator')}
                    className={`px-2.5 py-1 rounded-md font-medium ${
                      role === 'collaborator'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Colaborador (notas)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('viewer')}
                    className={`px-2.5 py-1 rounded-md font-medium ${
                      role === 'viewer'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Solo lectura
                  </button>
                </div>
              </div>
            ) : (
              <label className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 cursor-pointer">
                <span className="flex items-center gap-2 text-slate-200">
                  <StickyNote className="w-4 h-4 text-amber-300" />
                  <span>Incluir mis post-its actuales en la copia</span>
                </span>
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
              </label>
            )}
          </div>

          {/* 2. Canal: Amigo vs Enlace */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-300">
              2. ¿Por qué medio quieres enviarlo?
            </label>
            <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setChannel('friend')}
                className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 ${
                  channel === 'friend'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>A un amigo (@usuario)</span>
              </button>
              <button
                type="button"
                onClick={() => setChannel('link')}
                className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 ${
                  channel === 'link'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Con enlace (?share=)</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300">
                {errorMsg}
              </div>
            )}

            {channel === 'friend' ? (
              <div className="rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/70">
                {acceptedFriends.length === 0 ? (
                  <div className="p-4 text-center space-y-2">
                    <p className="text-slate-400">
                      Solo puedes enviar por @usuario a amigos aceptados para evitar spam de desconocidos.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenFriendsModal();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Agregar amigos por @usuario</span>
                    </button>
                  </div>
                ) : (
                  acceptedFriends.map((f) => {
                    const friendId = f.peer?.id || '';
                    const friendLabel = f.peer?.username
                      ? `@${f.peer.username}`
                      : f.peer?.fullName || 'Amigo';
                    const isBusy = busyId === friendId;

                    return (
                      <div
                        key={f.id}
                        className="p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">
                            {friendLabel}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {f.peer?.fullName}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isBusy || !friendId}
                          onClick={() =>
                            void handleSendToFriend(friendId, friendLabel)
                          }
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isBusy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Enviar</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={busyId === 'create-link'}
                  onClick={() => void handleGenerateLink()}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {busyId === 'create-link' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  <span>
                    Generar y copiar enlace (
                    {shareMode === 'copy'
                      ? 'Copia'
                      : role === 'collaborator'
                        ? 'Colaborador'
                        : 'Lectura'}
                    )
                  </span>
                </button>

                {activeLinks.length > 0 && (
                  <div className="rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/70">
                    {activeLinks.map((link) => (
                      <div
                        key={link.id}
                        className="p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] text-indigo-300 truncate">
                            ?share={link.token}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {link.shareMode === 'copy'
                              ? link.includeNotes
                                ? 'Copia con post-its'
                                : 'Copia simple'
                              : `Sesión en vivo · ${
                                  link.role === 'collaborator'
                                    ? 'Colaborador'
                                    : 'Solo lectura'
                                }`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleCopyExistingLink(link)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1"
                          >
                            {copiedLinkId === link.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>Copiar</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyId === link.id}
                            onClick={() => void handleRevokeLink(link.id)}
                            title="Revocar enlace"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Personas con acceso colaborativo */}
          {(loadingMeta || outgoingShares.length > 0) && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="font-semibold text-slate-300">
                Personas compartidas en este documento
              </div>
              {loadingMeta ? (
                <div className="flex items-center gap-2 text-slate-400 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Cargando accesos...</span>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/70">
                  {outgoingShares.map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">
                          @{s.recipientProfile?.username || 'estudiante'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {s.shareMode === 'copy'
                            ? `Copia (${s.status === 'accepted' ? 'Guardada' : 'Pendiente'})`
                            : `Sesión en vivo (${
                                s.status === 'accepted' ? 'Activa' : 'Pendiente'
                              })`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {s.shareMode === 'collaborative' && (
                          <button
                            type="button"
                            disabled={busyId === s.id}
                            onClick={() => void handleToggleShareRole(s)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium"
                          >
                            {s.role === 'collaborator'
                              ? 'Colaborador'
                              : 'Solo lectura'}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyId === s.id}
                          onClick={() => void handleRevokeShare(s.id)}
                          title="Quitar acceso"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

