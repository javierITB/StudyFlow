import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Check,
  Copy,
  FileText,
  Loader2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  DocumentShareRecord,
  FolderRecord,
  FriendshipRecord,
} from '../types/studyflow';

interface NotificationsBellProps {
  currentUserId: string | null;
  friendships: FriendshipRecord[];
  incomingShares: DocumentShareRecord[];
  folders: FolderRecord[];
  onAcceptFriend: (friendshipId: string) => Promise<void>;
  onRejectFriend: (friendshipId: string) => Promise<void>;
  onAcceptCopyShare: (
    share: DocumentShareRecord,
    targetFolderId: string | null
  ) => Promise<void>;
  onAcceptCollaborativeShare: (share: DocumentShareRecord) => Promise<void>;
  onDismissShare: (shareId: string) => Promise<void>;
  onOpenFriendsModal: () => void;
}

export const NotificationsBell: React.FC<NotificationsBellProps> = ({
  currentUserId,
  friendships,
  incomingShares,
  folders,
  onAcceptFriend,
  onRejectFriend,
  onAcceptCopyShare,
  onAcceptCollaborativeShare,
  onDismissShare,
  onOpenFriendsModal,
}) => {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedFolderByShare, setSelectedFolderByShare] = useState<
    Record<string, string>
  >({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  if (!currentUserId) return null;

  const pendingFriendRequests = friendships.filter(
    (f) => f.status === 'pending' && f.addresseeId === currentUserId
  );
  const pendingShares = incomingShares.filter((s) => s.status === 'pending');

  const hasAny =
    pendingFriendRequests.length > 0 || pendingShares.length > 0;

  const runAction = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      {/* Campana silenciosa y libre de distractores (sin punto, sin badge, sin sonido) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Notificaciones de amistad y documentos compartidos"
        aria-label="Notificaciones"
        aria-expanded={open}
        className={`flex items-center justify-center p-1.5 xl:px-2 xl:py-1.5 rounded-lg border transition-colors ${
          open
            ? 'bg-indigo-600/25 border-indigo-400/60 text-indigo-200'
            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
        }`}
      >
        <Bell className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-13 sm:top-full sm:mt-2 w-[calc(100vw-1rem)] sm:w-88 max-w-sm rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl z-50 overflow-hidden text-xs">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-white">Notificaciones</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenFriendsModal();
                }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Abrir panel social
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-800/80">
            {!hasAny ? (
              <div className="p-6 text-center space-y-1.5 text-slate-400">
                <Bell className="w-6 h-6 mx-auto text-slate-600" />
                <p className="font-medium text-slate-300">
                  Sin notificaciones pendientes
                </p>
                <p className="text-[11px] text-slate-500">
                  Cuando recibas una solicitud de amistad o un documento compartido aparecerá aquí.
                </p>
              </div>
            ) : (
              <>
                {pendingFriendRequests.map((req) => {
                  const isBusy = busyId === req.id;
                  return (
                    <div key={req.id} className="p-3.5 space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 flex-shrink-0">
                          <UserCheck className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-slate-200 leading-snug">
                            <span className="font-semibold text-white">
                              {req.peer?.username
                                ? `@${req.peer.username}`
                                : req.peer?.fullName || 'Estudiante'}
                            </span>{' '}
                            te envió una solicitud de amistad.
                          </p>
                          {req.peer?.fullName && req.peer?.username && (
                            <p className="text-[11px] text-slate-400 truncate">
                              {req.peer.fullName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-9">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            void runAction(req.id, () => onAcceptFriend(req.id))
                          }
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          {isBusy ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          <span>Aceptar</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            void runAction(req.id, () => onRejectFriend(req.id))
                          }
                          className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  );
                })}

                {pendingShares.map((share) => {
                  const isBusy = busyId === share.id;
                  const targetFolderId =
                    selectedFolderByShare[share.id] ?? '';
                  const senderLabel = share.ownerProfile?.username
                    ? `@${share.ownerProfile.username}`
                    : share.ownerProfile?.fullName || 'Un compañero';

                  return (
                    <div key={share.id} className="p-3.5 space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 flex-shrink-0">
                          {share.shareMode === 'copy' ? (
                            <Copy className="w-3.5 h-3.5" />
                          ) : (
                            <Users className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-slate-200 leading-snug">
                            <span className="font-semibold text-white">
                              {senderLabel}
                            </span>{' '}
                            {share.shareMode === 'copy'
                              ? 'te compartió una copia de:'
                              : 'te invitó a colaborar en:'}
                          </p>
                          <p className="text-[11px] font-semibold text-indigo-300 truncate flex items-center gap-1 mt-0.5">
                            <FileText className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{share.docName}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {share.shareMode === 'copy'
                              ? share.includeNotes
                                ? 'Incluye sus post-its compartidos'
                                : 'Solo documento'
                              : share.role === 'collaborator'
                                ? 'Permiso: Colaborador con notas'
                                : 'Permiso: Solo lectura'}
                          </p>
                        </div>
                      </div>

                      {share.shareMode === 'copy' && folders.length > 0 && (
                        <div className="pl-9">
                          <select
                            value={targetFolderId}
                            onChange={(e) =>
                              setSelectedFolderByShare((prev) => ({
                                ...prev,
                                [share.id]: e.target.value,
                              }))
                            }
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">Guardar sin carpeta (raíz)</option>
                            {folders.map((f) => (
                              <option key={f.id} value={f.id}>
                                Carpeta: {f.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pl-9">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            void runAction(share.id, () =>
                              share.shareMode === 'copy'
                                ? onAcceptCopyShare(
                                    share,
                                    targetFolderId || null
                                  )
                                : onAcceptCollaborativeShare(share)
                            )
                          }
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          {isBusy ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          <span>
                            {share.shareMode === 'copy'
                              ? 'Guardar copia'
                              : 'Unirse y abrir'}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            void runAction(share.id, () =>
                              onDismissShare(share.id)
                            )
                          }
                          className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium disabled:opacity-50"
                        >
                          Descartar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

