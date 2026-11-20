import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  FileText,
  Link2,
  Loader2,
  Send,
  Share2,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  FriendshipRecord,
  ShareMode,
  ShareRole,
  StudyWorkDraft,
  UserProfile,
  WorkShareLinkRecord,
  WorkShareRecord,
} from '../../types/studyflow';
import {
  buildWorkShareUrl,
  createWorkShareLink,
  fetchOutgoingSharesForWork,
  fetchWorkShareLinks,
  revokeWorkShareLink,
  shareWorkWithFriend,
  updateWorkShareStatusOrRole,
} from '../../lib/collaboration';
import { formatErrorMessageEs } from '../../lib/errorMessages';

interface ShareWorkModalProps {
  open: boolean;
  work: StudyWorkDraft | null;
  user: UserProfile | null;
  friendships: FriendshipRecord[];
  onClose: () => void;
  onOpenFriendsModal: () => void;
  onNotify: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ShareWorkModal: React.FC<ShareWorkModalProps> = ({
  open,
  work,
  user,
  friendships,
  onClose,
  onOpenFriendsModal,
  onNotify,
}) => {
  const [shareMode, setShareMode] = useState<ShareMode>('collaborative');
  const [role, setRole] = useState<ShareRole>('collaborator');
  const [channel, setChannel] = useState<'friend' | 'link'>('friend');

  const [outgoingShares, setOutgoingShares] = useState<WorkShareRecord[]>([]);
  const [activeLinks, setActiveLinks] = useState<WorkShareLinkRecord[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadShareMetadata = async () => {
    if (!user || !work) return;
    setLoadingMeta(true);
    try {
      const [shares, links] = await Promise.all([
        fetchOutgoingSharesForWork(user.id, work.id),
        fetchWorkShareLinks(user.id, work.id),
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
    if (open && user && work) {
      setErrorMsg(null);
      void loadShareMetadata();
    }
  }, [open, user?.id, work?.id]);

  if (!open || !work || !user) return null;

  const acceptedFriends = friendships.filter((f) => f.status === 'accepted');

  const handleSendToFriend = async (friendId: string, friendLabel: string) => {
    setErrorMsg(null);
    setBusyId(friendId);
    try {
      await shareWorkWithFriend({
        workId: work.id,
        ownerId: user.id,
        recipientId: friendId,
        shareMode,
        role,
      });
      onNotify(
        shareMode === 'copy'
          ? `Copia enviada a ${friendLabel}`
          : `Invitación a redacción colaborativa enviada a ${friendLabel}`,
        'success'
      );
      await loadShareMetadata();
    } catch (err) {
      setErrorMsg(formatErrorMessageEs(err, 'No se pudo compartir la redacción'));
    } finally {
      setBusyId(null);
    }
  };

  const handleGenerateLink = async () => {
    setErrorMsg(null);
    setBusyId('create-link');
    try {
      const link = await createWorkShareLink({
        workId: work.id,
        ownerId: user.id,
        shareMode,
        role,
      });
      const url = buildWorkShareUrl(link.token);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopiedLinkId(link.id);
        window.setTimeout(() => setCopiedLinkId(null), 2000);
        onNotify('Enlace de redacción copiado al portapapeles', 'success');
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

  const handleCopyExistingLink = async (link: WorkShareLinkRecord) => {
    const url = buildWorkShareUrl(link.token);
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
      await revokeWorkShareLink(linkId);
      setActiveLinks((prev) => prev.filter((l) => l.id !== linkId));
      onNotify('Enlace revocado', 'info');
    } catch (err) {
      setErrorMsg(formatErrorMessageEs(err, 'No se pudo revocar el enlace'));
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleShareRole = async (share: WorkShareRecord) => {
    const nextRole: ShareRole =
      share.role === 'collaborator' ? 'viewer' : 'collaborator';
    setBusyId(share.id);
    try {
      await updateWorkShareStatusOrRole(share.id, { role: nextRole });
      setOutgoingShares((prev) =>
        prev.map((s) => (s.id === share.id ? { ...s, role: nextRole } : s))
      );
      onNotify('Permiso de redacción actualizado', 'success');
    } catch (err) {
      setErrorMsg(formatErrorMessageEs(err, 'No se pudo actualizar el permiso'));
    } finally {
      setBusyId(null);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    setBusyId(shareId);
    try {
      await updateWorkShareStatusOrRole(shareId, { status: 'revoked' });
      setOutgoingShares((prev) => prev.filter((s) => s.id !== shareId));
      onNotify('Acceso revocado', 'info');
    } catch (err) {
      setErrorMsg(formatErrorMessageEs(err, 'No se pudo quitar el acceso'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 flex-shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-white truncate">
                Compartir redacción
              </h2>
              <p className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                <span className="font-medium text-slate-300">{work.title || 'Trabajo sin título'}</span>
                <span>• {work.wordCount} palabras</span>
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

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Selector de Modo: Colaborativo vs Copia independiente */}
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              1. Modalidad de compartición
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShareMode('collaborative')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  shareMode === 'collaborative'
                    ? 'bg-teal-500/15 border-teal-400/80 text-white shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Users
                    className={`w-4 h-4 ${
                      shareMode === 'collaborative'
                        ? 'text-teal-300'
                        : 'text-slate-400'
                    }`}
                  />
                  <span className="font-semibold text-xs text-white">
                    Redacción colaborativa
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Edición conjunta y simultánea en tiempo real. Los cambios se sincronizan en vivo.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setShareMode('copy')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  shareMode === 'copy'
                    ? 'bg-teal-500/15 border-teal-400/80 text-white shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Copy
                    className={`w-4 h-4 ${
                      shareMode === 'copy'
                        ? 'text-teal-300'
                        : 'text-slate-400'
                    }`}
                  />
                  <span className="font-semibold text-xs text-white">
                    Enviar como copia
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Tu amigo recibe un duplicado independiente. Puede editarlo a su gusto sin modificar el tuyo.
                </p>
              </button>
            </div>
          </div>

          {/* Opciones según modo */}
          {shareMode === 'collaborative' && (
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-300">
                Permiso asignado
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="radio"
                    name="work-role"
                    checked={role === 'collaborator'}
                    onChange={() => setRole('collaborator')}
                    className="accent-teal-500"
                  />
                  <span>Editor colaborativo (puede escribir y editar)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="radio"
                    name="work-role"
                    checked={role === 'viewer'}
                    onChange={() => setRole('viewer')}
                    className="accent-teal-500"
                  />
                  <span>Lector (solo lectura)</span>
                </label>
              </div>
            </div>
          )}

          {/* Selector de Canal: Amigo directo vs Enlace */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                2. Destinatario
              </label>
              <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setChannel('friend')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    channel === 'friend'
                      ? 'bg-teal-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Amigos añadidos
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('link')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    channel === 'link'
                      ? 'bg-teal-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Enlace público
                </button>
              </div>
            </div>

            {channel === 'friend' && (
              <div className="space-y-2">
                {acceptedFriends.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-center space-y-2">
                    <p className="text-slate-400">
                      No tienes amigos agregados todavía en tu red de estudio.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenFriendsModal();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600/30 hover:bg-teal-600/40 border border-teal-500/40 text-teal-200 text-xs font-medium"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Buscar y añadir amigos (@usuario)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {acceptedFriends.map((f) => {
                      const peer = f.peer;
                      if (!peer) return null;
                      const isBusy = busyId === peer.id;
                      const alreadyShared = outgoingShares.some(
                        (s) => s.recipientId === peer.id
                      );
                      return (
                        <div
                          key={f.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60"
                        >
                          <div className="min-w-0 flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-semibold text-xs">
                              {peer.fullName.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate text-xs">
                                {peer.fullName}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {peer.username ? `@${peer.username}` : 'Sin @username'}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleSendToFriend(
                                peer.id,
                                peer.username ? `@${peer.username}` : peer.fullName
                              )
                            }
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              alreadyShared
                                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                : 'bg-teal-600 hover:bg-teal-500 text-white shadow-sm'
                            }`}
                          >
                            {isBusy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>{alreadyShared ? 'Volver a enviar' : 'Compartir'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {channel === 'link' && (
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Cualquier persona con el enlace podrá{' '}
                  {shareMode === 'copy'
                    ? 'crear una copia propia de esta redacción'
                    : `unirse como ${role === 'collaborator' ? 'editor colaborativo' : 'lector'}`}
                  .
                </p>
                <button
                  type="button"
                  disabled={busyId === 'create-link'}
                  onClick={handleGenerateLink}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium transition-colors shadow-sm"
                >
                  {busyId === 'create-link' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  <span>Generar enlace de invitación</span>
                </button>
              </div>
            )}
          </div>

          {/* Enlaces activos */}
          {activeLinks.length > 0 && (
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Enlaces generados activos ({activeLinks.length})
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {activeLinks.map((lnk) => {
                  const isCopied = copiedLinkId === lnk.id;
                  const isBusy = busyId === lnk.id;
                  return (
                    <div
                      key={lnk.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-800/80 border border-slate-700/80"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <Link2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                        <span className="truncate text-slate-300 text-[11px]">
                          {lnk.shareMode === 'copy' ? 'Copia' : `Colaborativo (${lnk.role})`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyExistingLink(lnk)}
                          className="px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] flex items-center gap-1"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-300">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRevokeLink(lnk.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-700/60"
                          title="Revocar enlace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Accesos existentes de amigos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Accesos concedidos ({outgoingShares.length})
              </label>
              {loadingMeta && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
            </div>

            {outgoingShares.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">
                Aún no has compartido esta redacción con ningún amigo.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {outgoingShares.map((s) => {
                  const peer = s.recipientProfile;
                  const isBusy = busyId === s.id;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate text-xs">
                          {peer?.fullName || 'Amigo'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {peer?.username ? `@${peer.username}` : ''} •{' '}
                          {s.shareMode === 'copy' ? 'Copia independiente' : 'Colaborativa en vivo'} •{' '}
                          <span
                            className={
                              s.status === 'accepted'
                                ? 'text-emerald-400'
                                : 'text-amber-400'
                            }
                          >
                            {s.status === 'accepted' ? 'Aceptado' : 'Pendiente'}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {s.shareMode === 'collaborative' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleShareRole(s)}
                            className="px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px]"
                            title="Cambiar rol entre editor y observador"
                          >
                            {s.role === 'collaborator' ? 'Editor' : 'Lector'}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRevokeShare(s.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-700/60"
                          title="Revocar acceso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            {shareMode === 'collaborative'
              ? '🟢 Permite editar al mismo tiempo en tiempo real.'
              : '📋 Envía un borrador independiente sin alterar el tuyo.'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};

