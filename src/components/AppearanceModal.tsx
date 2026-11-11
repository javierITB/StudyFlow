import React, { useEffect } from 'react';
import {
  Check,
  FileText,
  Moon,
  Palette,
  RotateCcw,
  Sliders,
  Sparkles,
  Sun,
  Type,
  X,
} from 'lucide-react';
import {
  ACCENT_PALETTES,
  FONT_CHOICES,
  PAPER_TONES,
  THEME_PRESETS,
  UI_RADIUS_CHOICES,
  UI_SCALE_CHOICES,
} from '../lib/themes';
import { AppearanceSettings } from '../types/studyflow';

interface AppearanceModalProps {
  open: boolean;
  appearance: AppearanceSettings;
  onChange: (next: AppearanceSettings) => void;
  onReset: () => void;
  onClose: () => void;
}

export const AppearanceModal: React.FC<AppearanceModalProps> = ({
  open,
  appearance,
  onChange,
  onReset,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const updateField = <K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K]
  ) => {
    onChange({
      ...appearance,
      [key]: value,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="appearance-modal-title"
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0">
              <Palette className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h2
                id="appearance-modal-title"
                className="text-sm sm:text-base font-bold text-white truncate"
              >
                Personalizar Apariencia y Tema
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Todos los cambios se aplican al instante y se guardan en tu perfil
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar personalización"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Sección 1: Tema base */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Tema de interfaz
              </h3>
              <span className="text-[11px] text-slate-500">
                5 oscuros · 1 claro
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {THEME_PRESETS.map((theme) => {
                const isSelected = appearance.themeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => updateField('themeId', theme.id)}
                    className={`text-left p-3 rounded-xl border transition-all flex flex-col gap-2 ${isSelected
                        ? 'border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500/50'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* Mini vista previa de colores */}
                      <div className="flex items-center gap-1">
                        {theme.previewSwatches.map((hex, i) => (
                          <span
                            key={`${theme.id}-swatch-${i}`}
                            className="w-4 h-4 rounded-full border border-slate-600/50 shadow-inner"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/70">
                          {theme.mode === 'light' ? (
                            <>
                              <Sun className="w-2.5 h-2.5 text-amber-400" />
                              Claro
                            </>
                          ) : (
                            <>
                              <Moon className="w-2.5 h-2.5 text-indigo-300" />
                              Oscuro
                            </>
                          )}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-white">
                        {theme.name}
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug mt-0.5">
                        {theme.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Sección 2: Color de acento */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              Color de acento
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {ACCENT_PALETTES.map((accent) => {
                const isSelected = appearance.accentId === accent.id;
                return (
                  <button
                    key={accent.id}
                    type="button"
                    onClick={() => updateField('accentId', accent.id)}
                    className={`px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2 ${isSelected
                        ? 'border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500/40'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: accent.swatchHex }}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                    <span className="text-xs font-medium text-slate-200 truncate">
                      {accent.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Sección 3: Tono de hoja de lectura */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Tono de hoja en el visor (PDF y DOCX)
              </h3>
              <span className="text-[11px] text-slate-500">
                Reduce el brillo blanco al leer
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {PAPER_TONES.map((paper) => {
                const isSelected = appearance.paperTone === paper.id;
                return (
                  <button
                    key={paper.id}
                    type="button"
                    onClick={() => updateField('paperTone', paper.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${isSelected
                        ? 'border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500/40'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                  >
                    {/* Mini hoja simulada */}
                    <div
                      className="w-10 h-12 rounded-md border border-slate-500/40 p-1.5 flex flex-col justify-center gap-1 flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: paper.hex }}
                    >
                      <div
                        className="h-1 w-full rounded-full"
                        style={{ backgroundColor: 'rgba(15, 23, 42, 0.72)' }}
                      />
                      <div
                        className="h-1 w-4/5 rounded-full"
                        style={{ backgroundColor: 'rgba(15, 23, 42, 0.38)' }}
                      />
                      <div
                        className="h-1 w-full rounded-full"
                        style={{ backgroundColor: 'rgba(15, 23, 42, 0.38)' }}
                      />
                      <div
                        className="h-1 w-3/5 rounded-full"
                        style={{ backgroundColor: 'rgba(15, 23, 42, 0.28)' }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-white truncate">
                          {paper.name}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {paper.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Sección 4: Tipografía, esquinas y escala */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tipografía */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-indigo-400" />
                Tipografía
              </h3>
              <div className="space-y-1.5">
                {FONT_CHOICES.map((font) => {
                  const isSelected = appearance.fontFamily === font.id;
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => updateField('fontFamily', font.id)}
                      style={{ fontFamily: font.stack }}
                      className={`w-full px-3 py-2 rounded-xl border text-left text-xs flex items-center justify-between transition-all ${isSelected
                          ? 'border-indigo-500 bg-indigo-500/15 text-white font-semibold'
                          : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700'
                        }`}
                    >
                      <span className="truncate">{font.name}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bordes */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Estilo de esquinas
              </h3>
              <div className="space-y-1.5">
                {UI_RADIUS_CHOICES.map((choice) => {
                  const isSelected = appearance.uiRadius === choice.id;
                  const previewRadius =
                    choice.id === 'sharp'
                      ? 'rounded-sm'
                      : choice.id === 'soft'
                        ? 'rounded-full'
                        : 'rounded-md';
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => updateField('uiRadius', choice.id)}
                      className={`w-full px-3 py-2 rounded-xl border text-left text-xs flex items-center justify-between transition-all ${isSelected
                          ? 'border-indigo-500 bg-indigo-500/15 text-white font-semibold'
                          : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700'
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-3.5 h-3.5 border border-slate-400/70 bg-slate-700/60 ${previewRadius}`}
                        />
                        {choice.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Escala */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Tamaño de interfaz
              </h3>
              <div className="space-y-1.5">
                {UI_SCALE_CHOICES.map((scale) => {
                  const isSelected = appearance.uiScale === scale.id;
                  return (
                    <button
                      key={scale.id}
                      type="button"
                      onClick={() => updateField('uiScale', scale.id)}
                      className={`w-full px-3 py-2 rounded-xl border text-left text-xs flex items-center justify-between transition-all ${isSelected
                          ? 'border-indigo-500 bg-indigo-500/15 text-white font-semibold'
                          : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700'
                        }`}
                    >
                      <span>{scale.name}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Pie del modal */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer predeterminado
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors shadow-sm"
          >
            Aplicar y cerrar
          </button>
        </div>
      </div>
    </div>
  );
};