import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  FileText,
  FolderOpen,
  Loader2,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  DocumentShareRecord,
  FolderRecord,
  FriendshipRecord,
  PublicProfile,
  UserProfile,
} from '../types/studyflow';
import { searchUsersByUsername } from '../lib/collaboration';
import { formatErrorMessageEs } from '../lib/errorMessages';

interface FriendsAndSharesModalProps {
  open: boolean;
  user: UserProfile | null;
  friendships: FriendshipRecord[];
  incomingShares: DocumentShareRecord[];
  folders: FolderRecord[];
  onClose: () => void;
  onSendFriendRequest: (addresseeId: string) => Promise<void>;
  onAcceptFriend: (friendshipId: string) => Promise<void>;
  onRejectOrRemoveFriend: (friendshipId: string) => Promise<void>;
  onAcceptCopyShare: (
    share: DocumentShareRecord,
    targetFolderId: string | null
  ) => Promise<void>;
  onAcceptCollaborativeShare: (share: DocumentShareRecord) => Promise<void>;
  onOpenSharedDocument: (docId: string) => void;
  onDismissOrLeaveShare: (shareId: string) => Promise<void>;
}

export const FriendsAndSharesModal: React.FC<FriendsAndSharesModalProps> = ({
  open,
  user,
  friendships,
  incomingShares,
  folders,
  onClose,
  onSendFriendRequest,
  onAcceptFriend,
  onRejectOrRemoveFriend,
  onAcceptCopyShare,
  onAcceptCollaborativeShare,
  onOpenSharedDocument,
  onDismissOrLeaveShare,
}) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'shares'>(
    'friends'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedFolderByShare, setSelectedFolderByShare] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!open || !user) return;
    const clean = searchQuery.trim().replace(/^@+/, '');
    if (clean.length < 2) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await searchUsersByUsername(clean);
        if (!cancelled) setSearchResults(res);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, user, searchQuery]);

  if (!open || !user) return null;

  const acceptedFriends = friendships.filter((f) => f.status === 'accepted');
  const incomingRequests = friendships.filter(
    (f) => f.status === 'pending' && f.addresseeId === user.id
  );
  const outgoingRequests = friendships.filter(
    (f) => f.status === 'pending' && f.requesterId === user.id
  );

  const pendingShares = incomingShares.filter((s) => s.status === 'pending');
  const activeCollabShares = incomingShares.filter(
    (s) => s.status === 'accepted' && s.shareMode === 'collaborative'
  );

  const getRelationshipWith = (peerId: string): FriendshipRecord | undefined =>
    friendships.find(
      (f) => f.requesterId === peerId || f.addresseeId === peerId
    );

  const runAction = async (id: string, fn: () => Promise<void>) => {
    setErrorMsg(null);
    setBusyId(id);
    try {
      await fn();
    } catch (err) {
      setErrorMsg(formatErrorMessageEs(err, 'No se pudo completar la acción'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/35 flex items-center justify-center text-indigo-300">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Amigos y Documentos Compartidos
              </h3>
              <p className="text-[11px] text-slate-400">
                Tu identificador: <span className="text-indigo-300 font-mono">@{user.username || 'sin_usuario'}</span>
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

        {/* Pestañas */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`py-1.5 px-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'friends'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Amigos ({acceptedFriends.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`py-1.5 px-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'requests'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Solicitudes ({incomingRequests.length + outgoingRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shares')}
            className={`py-1.5 px-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'shares'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Compartidos ({pendingShares.length + activeCollabShares.length})
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300">
            {errorMsg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === 'friends' && (
            <>
              {/* Buscar para agregar amigo */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-300">
                  Agregar compañero por @usuario o nombre
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar @usuario (ej: ana_med)"
                    autoCapitalize="none"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-8 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                  {isSearching && (
                    <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {searchQuery.trim().replace(/^@+/, '').length >= 2 && (
                  <div className="rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/70">
                    {searchResults.length === 0 && !isSearching ? (
                      <p className="p-3 text-slate-500 text-center">
                        No se encontraron estudiantes con ese @usuario.
                      </p>
                    ) : (
                      searchResults.map((profile) => {
                        const rel = getRelationshipWith(profile.id);
                        const isBusy = busyId === profile.id;
                        return (
                          <div
                            key={profile.id}
                            className="p-2.5 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate">
                                @{profile.username}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {profile.fullName}
                              </p>
                            </div>
                            {rel?.status === 'accepted' ? (
                              <span className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                                Amigos
                              </span>
                            ) : rel?.status === 'pending' ? (
                              rel.addresseeId === user.id ? (
                                <button
                                  type="button"
                                  disabled={busyId === rel.id}
                                  onClick={() =>
                                    void runAction(rel.id, () =>
                                      onAcceptFriend(rel.id)
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                                >
                                  Aceptar solicitud
                                </button>
                              ) : (
                                <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400">
                                  Solicitud enviada
                                </span>
                              )
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  void runAction(profile.id, () =>
                                    onSendFriendRequest(profile.id)
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1 disabled:opacity-50"
                              >
                                {isBusy ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <UserPlus className="w-3 h-3" />
                                )}
                                <span>Agregar</span>
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Lista de amigos aceptados */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-300">
                  Tus amigos conectados
                </div>
                {acceptedFriends.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-400 text-center">
                    Aún no tienes amigos agregados. Agrega a tus compañeros por su @usuario para compartir documentos directamente (o usa enlaces de invitación).
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/70">
                    {acceptedFriends.map((f) => (
                      <div
                        key={f.id}
                        className="p-3 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/35 flex items-center justify-center text-indigo-300 font-bold uppercase flex-shrink-0">
                            {(f.peer?.username || f.peer?.fullName || 'E').slice(
                              0,
                              1
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate">
                              @{f.peer?.username || 'usuario'}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {f.peer?.fullName}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={busyId === f.id}
                          onClick={() =>
                            void runAction(f.id, () =>
                              onRejectOrRemoveFriend(f.id)
                            )
                          }
                          title="Eliminar amistad"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="font-semibold text-slate-300">
                  Solicitudes recibidas ({incomingRequests.length})
                </div>
                {incomingRequests.length === 0 ? (
                  <p className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-500 text-center">
                    No tienes solicitudes pendientes.
                  </p>
                ) : (
                  <div className="rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/70">
                    {incomingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">
                            @{req.peer?.username || 'estudiante'}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {req.peer?.fullName}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busyId === req.id}
                            onClick={() =>
                              void runAction(req.id, () =>
                                onAcceptFriend(req.id)
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Aceptar</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyId === req.id}
                            onClick={() =>
                              void runAction(req.id, () =>
                                onRejectOrRemoveFriend(req.id)
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-300">
                  Solicitudes enviadas ({outgoingRequests.length})
                </div>
                {outgoingRequests.length === 0 ? (
                  <p className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-500 text-center">
                    No tienes solicitudes enviadas pendientes.
                  </p>
                ) : (
                  <div className="rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/70">
                    {outgoingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">
                            @{req.peer?.username || 'estudiante'}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            Esperando respuesta...
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={busyId === req.id}
                          onClick={() =>
                            void runAction(req.id, () =>
                              onRejectOrRemoveFriend(req.id)
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'shares' && (
            <div className="space-y-4">
              {pendingShares.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-emerald-300">
                    Recibidos pendientes ({pendingShares.length})
                  </div>
                  <div className="space-y-2">
                    {pendingShares.map((share) => {
                      const folderId = selectedFolderByShare[share.id] ?? '';
                      return (
                        <div
                          key={share.id}
                          className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-white flex items-center gap-1.5">
                                {share.shareMode === 'copy' ? (
                                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                                )}
                                <span className="truncate">{share.docName}</span>
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                De @{share.ownerProfile?.username || 'compañero'} ·{' '}
                                {share.shareMode === 'copy'
                                  ? share.includeNotes
                                    ? 'Copia con post-its'
                                    : 'Copia del archivo'
                                  : share.role === 'collaborator'
                                    ? 'Sesión colaborativa (Colaborador)'
                                    : 'Sesión colaborativa (Solo lectura)'}
                              </p>
                            </div>
                          </div>

                          {share.shareMode === 'copy' && folders.length > 0 && (
                            <select
                              value={folderId}
                              onChange={(e) =>
                                setSelectedFolderByShare((prev) => ({
                                  ...prev,
                                  [share.id]: e.target.value,
                                }))
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200"
                            >
                              <option value="">Guardar sin carpeta</option>
                              {folders.map((f) => (
                                <option key={f.id} value={f.id}>
                                  Carpeta: {f.name}
                                </option>
                              ))}
                            </select>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busyId === share.id}
                              onClick={() =>
                                void runAction(share.id, () =>
                                  share.shareMode === 'copy'
                                    ? onAcceptCopyShare(share, folderId || null)
                                    : onAcceptCollaborativeShare(share)
                                )
                              }
                              className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5"
                            >
                              {busyId === share.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {share.shareMode === 'copy'
                                  ? 'Guardar en mi biblioteca'
                                  : 'Unirse y abrir'}
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={busyId === share.id}
                              onClick={() =>
                                void runAction(share.id, () =>
                                  onDismissOrLeaveShare(share.id)
                                )
                              }
                              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                            >
                              Descartar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="font-semibold text-slate-300">
                  Sesiones colaborativas activas ({activeCollabShares.length})
                </div>
                {activeCollabShares.length === 0 ? (
                  <p className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-500 text-center">
                    No estás unido a ninguna sesión colaborativa en este momento.
                  </p>
                ) : (
                  <div className="rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/70">
                    {activeCollabShares.map((share) => (
                      <div
                        key={share.id}
                        className="p-3 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                            <span className="truncate">{share.docName}</span>
                          </p>
                          <p className="text-[11px] text-slate-400">
                            De @{share.ownerProfile?.username || 'autor'} ·{' '}
                            {share.role === 'collaborator'
                              ? 'Colaborador'
                              : 'Solo lectura'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onOpenSharedDocument(share.docId);
                              onClose();
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Abrir</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyId === share.id}
                            onClick={() =>
                              void runAction(share.id, () =>
                                onDismissOrLeaveShare(share.id)
                              )
                            }
                            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300"
                            title="Salir de esta sesión colaborativa"
                          >
                            Salir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

