import React, { useState } from 'react';
import {
  AlertCircle,
  Globe,
  Loader2,
  Tag,
  UploadCloud,
  X,
} from 'lucide-react';
import { StudyWorkDraft, CommunityTemplateRecord } from '../../types/studyflow';
import { publishWorkAsCommunityTemplate } from '../../lib/communityTemplates';

interface PublishTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  work: StudyWorkDraft | null;
  currentUserId?: string | null;
  currentUserName?: string | null;
  currentUserHandle?: string | null;
  onPublished?: (template: CommunityTemplateRecord) => void;
  onOpenAuthModal?: () => void;
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const CATEGORY_PRESETS = [
  'Ingeniería & Tecnología',
  'Ciencias de la Salud & Medicina',
  'Ciencias Exactas & Físico-Matemáticas',
  'Derecho & Ciencias Jurídicas',
  'Ciencias Sociales & Psicología',
  'Humanidades & Filosofía',
  'Economía, Negocios & Gestión',
  'Artes & Diseño',
  'Metodología de la Investigación',
  'General / Multidisciplinario',
];

export const PublishTemplateModal: React.FC<PublishTemplateModalProps> = ({
  isOpen,
  onClose,
  work,
  currentUserId,
  currentUserName,
  currentUserHandle,
  onPublished,
  onOpenAuthModal,
  onNotify,
}) => {
  const [title, setTitle] = useState(work?.title || '');
  const [category, setCategory] = useState('Ingeniería & Tecnología');
  const [technicalProfile, setTechnicalProfile] = useState('');
  const [description, setDescription] = useState('');
  const [targetWords, setTargetWords] = useState<number>(
    work?.targetWordCount || work?.wordCount || 1000
  );
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentUserId) {
      setErrorMsg('Debes iniciar sesión con una cuenta para publicar en la comunidad.');
      return;
    }

    if (!work || !work.contentHtml.trim()) {
      setErrorMsg('El documento no tiene contenido para publicar como plantilla.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Ingresa un título para la plantilla.');
      return;
    }

    if (!description.trim() || description.trim().length < 15) {
      setErrorMsg('Proporciona una descripción clara de al menos 15 caracteres sobre cómo usar esta plantilla.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const published = await publishWorkAsCommunityTemplate({
        title: title.trim(),
        category,
        technicalProfile: technicalProfile.trim() || category,
        description: description.trim(),
        targetWords: Number(targetWords) || 0,
        paperSize: work.paperSize || 'letter',
        contentHtml: work.contentHtml,
        contentText: work.contentText || '',
        tags: parsedTags,
        authorId: currentUserId,
        authorName: currentUserName || 'Autor de StudyFlow',
        authorUsername: currentUserHandle || null,
      });

      onNotify?.(`¡Plantilla "${published.title}" publicada en la comunidad!`, 'success');
      onPublished?.(published);
      onClose();
    } catch (err: any) {
      console.error('Error publicando plantilla:', err);
      setErrorMsg(err.message || 'Error al publicar en Supabase.');
      onNotify?.('No se pudo publicar la plantilla', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Encabezado */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Publicar en la Comunidad
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  Acceso Público
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Comparte la estructura de este documento con otros estudiantes e investigadores.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo del formulario */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar text-xs">
          {!currentUserId && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <p className="font-semibold mb-1">Se requiere iniciar sesión</p>
                <p className="text-amber-300/90 text-[11px]">
                  Para que tu plantilla tenga autoría pública y pueda recibir calificaciones de otros usuarios, debes conectar tu cuenta.
                </p>
                {onOpenAuthModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuthModal();
                    }}
                    className="mt-2 px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-[11px] hover:bg-amber-400 transition-colors"
                  >
                    Iniciar Sesión
                  </button>
                )}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Título de la Plantilla */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Título de la Plantilla <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Paper IEEE Doble Columna, Protocolo de Tesis APA 7..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-white outline-none transition-colors"
              required
            />
          </div>

          {/* Categoría & Perfil Técnico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Área de Conocimiento <span className="text-rose-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-white outline-none transition-colors"
              >
                {CATEGORY_PRESETS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Perfil Técnico Específico
              </label>
              <input
                type="text"
                value={technicalProfile}
                onChange={(e) => setTechnicalProfile(e.target.value)}
                placeholder="Ej: IEEE / APA / Ensayos Clínicos"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-white outline-none transition-colors"
              />
            </div>
          </div>

          {/* Descripción e Instrucciones de Uso */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Descripción y Guía de Redacción <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Explica para qué sirve esta plantilla, qué secciones incluye (ej: Hipótesis, Discusión, Citas) y recomendaciones para quien la use..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-white outline-none transition-colors resize-none"
              required
            />
          </div>

          {/* Meta de Palabras y Etiquetas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Meta de Palabras Sugerida
              </label>
              <input
                type="number"
                min={0}
                step={50}
                value={targetWords}
                onChange={(e) => setTargetWords(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-white outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-indigo-400" />
                <span>Etiquetas (separadas por coma)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ej: tesis, informe, apa7, investigacion"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-white outline-none transition-colors"
              />
            </div>
          </div>

          {/* Resumen del Documento Origen */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>
              Palabras actuales: <strong className="text-white">{work?.wordCount || 0}</strong>
            </span>
            <span>
              Formato: <strong className="text-indigo-300 uppercase">{work?.paperSize || 'carta'}</strong>
            </span>
            <span>
              Autor público: <strong className="text-emerald-400">{currentUserName || 'Anónimo'}</strong>
            </span>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !currentUserId}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-lg disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Publicar en Comunidad</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
