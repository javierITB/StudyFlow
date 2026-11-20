import React, { useState } from 'react';
import {
  MessageSquarePlus,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { UserProfile } from '../types/studyflow';
import { submitUserFeedback, AdminSuggestionRecord } from '../lib/adminData';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  open,
  onClose,
  user,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AdminSuggestionRecord['category']>('redaccion');
  const [priority, setPriority] = useState<AdminSuggestionRecord['priority']>('media');
  const [authorName, setAuthorName] = useState(user?.fullName || user?.username || '');
  const [authorEmail, setAuthorEmail] = useState(user?.email || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMessage('Por favor ingresa un título y una descripción detallada.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await submitUserFeedback({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        authorName: authorName.trim() || user?.fullName || 'Estudiante StudyFlow',
        authorEmail: authorEmail.trim() || user?.email || 'estudiante@studyflow.cl',
        userId: user?.id || null,
      });

      setIsSuccess(true);
      setTimeout(() => {
        // Reset form
        setTitle('');
        setDescription('');
        setIsSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al enviar la sugerencia. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-5 sm:p-6 space-y-4 text-slate-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de fondo */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                <span>Buzón de Sugerencias & Feedback</span>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </h2>
              <p className="text-xs text-slate-400">
                Tu opinión llega directo a la consola de administración root.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Estado de éxito */}
        {isSuccess ? (
          <div className="py-8 text-center space-y-3 relative z-10 animate-fade-in">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">¡Sugerencia enviada con éxito!</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Muchas gracias por colaborar. El administrador revisará tu aporte en el panel de gobernanza.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10 text-xs">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Categoría y Prioridad */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Módulo o Área</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="redaccion">Taller de Redacción</option>
                  <option value="visor_pdf">Material & Visor PDF</option>
                  <option value="pizarra">Pizarra & Dibujo</option>
                  <option value="pomodoro">Pomodoro & Métodos</option>
                  <option value="plantillas">Plantillas Comunitarias</option>
                  <option value="rendimiento">Rendimiento & Almacenamiento</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Importancia / Urgencia</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="baja">Baja (Idea o detalle)</option>
                  <option value="media">Media (Mejora deseada)</option>
                  <option value="alta">Alta (Muy necesaria)</option>
                  <option value="critica">Crítica (Fallo recurrente)</option>
                </select>
              </div>
            </div>

            {/* Título de la sugerencia */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Título o resumen del aporte <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ej: Permitir exportar citas directas a formato BibTeX"
                required
                maxLength={120}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Descripción detallada */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Detalle de tu propuesta o experiencia <span className="text-emerald-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
                placeholder="Explica qué mejorarías, cómo te ayudaría en tu flujo de estudio o describe el problema observado..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Datos del estudiante (si no está logueado o desea modificarlos) */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-slate-400 text-[11px] mb-0.5">Tu Nombre o Alias</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="ej: Vicente Torres"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-0.5">Correo para novedades</label>
                <input
                  type="email"
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  placeholder="ej: vicho@udp.cl"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Revisión periódica por administración</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar al Admin</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

