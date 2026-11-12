import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  FileText,
  Image as ImageIcon,
  Layout,
  Moon,
  Palette,
  Pipette,
  RotateCcw,
  Sliders,
  Sparkles,
  Sun,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import {
  ACCENT_PALETTES,
  compressWallpaperImage,
  FONT_CHOICES,
  PAPER_TONES,
  THEME_PRESETS,
  UI_RADIUS_CHOICES,
  UI_SCALE_CHOICES,
  WALLPAPER_CHOICES,
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
  const wallpaperInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

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

  const handleUploadWallpaper = async (file: File) => {
    setIsProcessingImage(true);
    try {
      const dataUrl = await compressWallpaperImage(file);
      onChange({
        ...appearance,
        wallpaperId: 'custom_image',
        customWallpaperDataUrl: dataUrl,
        wallpaperDim: appearance.wallpaperDim ?? 0.45,
      });
    } finally {
      setIsProcessingImage(false);
    }
  };

  const activeWallpaperId = appearance.wallpaperId || 'mesh_accent';
  const activeCustomColor = appearance.customAccentHex || '#10b981';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-[2px] fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="appearance-modal-title"
    >
      <div
        className="w-full max-w-4xl max-h-[88dvh] flex flex-col rounded-2xl bg-slate-900 border border-indigo-500/35 sf-accent-glow shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-indigo-500/25 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/45 flex items-center justify-center flex-shrink-0">
              <Palette className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h2
                id="appearance-modal-title"
                className="text-sm sm:text-base font-bold text-white truncate"
              >
                Personalizar Entorno, Tema y Fondo
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Cambia colores reales, acentos, fondos de pantalla, papel de lectura y tipografía
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* Sección 0: Estilo de Interfaz (Islas Dinámicas vs Clásico) */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5 text-indigo-400" />
                Estilo de Interfaz y Controles
              </h3>
              <span className="text-[11px] text-slate-400">
                Ajustable al instante
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(
                [
                  {
                    id: 'islands',
                    name: 'Islas Dinámicas (Por defecto)',
                    description:
                      'Navegación flotante arriba con burbuja compactable, controles de página abajo y mayor área libre.',
                  },
                  {
                    id: 'classic',
                    name: 'Barra Clásica',
                    description:
                      'Encabezado superior tradicional de ancho completo y barra de controles de lectura arriba.',
                  },
                ] as const
              ).map((opt) => {
                const currentStyle = appearance.layoutStyle || 'islands';
                const isSelected = currentStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateField('layoutStyle', opt.id)}
                    className={`text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-500/20 ring-1 ring-indigo-500/50'
                        : 'border-slate-800 bg-slate-950/45 hover:border-indigo-500/40 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">
                        {opt.name}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Sección 1: Tema base */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Tema de color del entorno
              </h3>
              <span className="text-[11px] text-slate-400">
                7 oscuros · 2 claros
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
                    className={`text-left p-3 rounded-xl border transition-all flex flex-col gap-2 ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-500/20 ring-1 ring-indigo-500/50'
                        : 'border-slate-800 bg-slate-950/45 hover:border-indigo-500/40 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {theme.previewSwatches.map((hex, i) => (
                          <span
                            key={`${theme.id}-swatch-${i}`}
                            className="w-4 h-4 rounded-full border border-white/20 shadow-inner"
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

          {/* Sección 2: Color de acento + selector libre */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-400" />
                Color de acento (botones, bordes, barras y brillos)
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {ACCENT_PALETTES.map((accent) => {
                const isSelected = appearance.accentId === accent.id;
                return (
                  <button
                    key={accent.id}
                    type="button"
                    onClick={() => updateField('accentId', accent.id)}
                    className={`px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-500/20 ring-1 ring-indigo-500/45'
                        : 'border-slate-800 bg-slate-950/45 hover:border-indigo-500/40 hover:bg-slate-900'
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

              {/* Selector libre de cualquier color hex */}
              <label
                className={`px-3 py-2 rounded-xl border transition-all flex items-center gap-2 cursor-pointer ${
                  appearance.accentId === 'custom'
                    ? 'border-indigo-400 bg-indigo-500/20 ring-1 ring-indigo-500/45'
                    : 'border-slate-800 bg-slate-950/45 hover:border-indigo-500/40 hover:bg-slate-900'
                }`}
                title="Elige cualquier tono exacto de acento"
              >
                <input
                  type="color"
                  value={activeCustomColor}
                  onChange={(e) => {
                    onChange({
                      ...appearance,
                      accentId: 'custom',
                      customAccentHex: e.target.value,
                    });
                  }}
                  className="w-5 h-5 rounded-md border-0 bg-transparent p-0 cursor-pointer flex-shrink-0"
                />
                <span className="text-xs font-medium text-slate-200 flex items-center gap-1 truncate">
                  <Pipette className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                  <span>Color libre</span>
                </span>
              </label>
            </div>
          </section>

          {/* Sección 3: Fondo de pantalla / Textura del entorno */}
          <section className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                Fondo de pantalla del visor y espacio de trabajo
              </h3>

              <div className="flex items-center gap-2">
                <input
                  ref={wallpaperInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUploadWallpaper(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  disabled={isProcessingImage}
                  onClick={() => wallpaperInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/45 text-indigo-200 text-[11px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isProcessingImage ? 'Procesando...' : 'Subir imagen propia'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {WALLPAPER_CHOICES.map((wp) => {
                const isSelected = activeWallpaperId === wp.id;
                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => updateField('wallpaperId', wp.id)}
                    className={`text-left p-2.5 rounded-xl border transition-all flex flex-col gap-2 ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-500/20 ring-1 ring-indigo-500/45'
                        : 'border-slate-800 bg-slate-950/45 hover:border-indigo-500/40 hover:bg-slate-900'
                    }`}
                  >
                    <div
                      className="h-12 w-full rounded-lg border border-white/10 relative overflow-hidden"
                      style={{
                        backgroundColor: 'rgb(var(--sf-bg-app))',
                        backgroundImage: wp.previewCss,
                        backgroundSize:
                          wp.id === 'ocean_grid' || wp.id === 'dots_studio'
                            ? '12px 12px'
                            : 'cover',
                      }}
                    >
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {wp.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {wp.desc}
                      </div>
                    </div>
                  </button>
                );
              })}

              {appearance.customWallpaperDataUrl && (
                <div
                  className={`p-2.5 rounded-xl border transition-all flex flex-col gap-2 ${
                    activeWallpaperId === 'custom_image'
                      ? 'border-indigo-400 bg-indigo-500/20 ring-1 ring-indigo-500/45'
                      : 'border-slate-800 bg-slate-950/45'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => updateField('wallpaperId', 'custom_image')}
                    className="h-12 w-full rounded-lg border border-white/10 relative overflow-hidden bg-cover bg-center"
                    style={{
                      backgroundImage: `url("${appearance.customWallpaperDataUrl}")`,
                    }}
                  >
                    {activeWallpaperId === 'custom_image' && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-white truncate">
                      Tu imagen
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...appearance,
                          wallpaperId: 'mesh_accent',
                          customWallpaperDataUrl: undefined,
                        })
                      }
                      title="Quitar imagen personalizada"
                      className="p-1 rounded text-rose-400 hover:bg-rose-500/15"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {activeWallpaperId === 'custom_image' && appearance.customWallpaperDataUrl && (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-300 font-medium">
                  Velo de contraste sobre la imagen ({Math.round((appearance.wallpaperDim ?? 0.45) * 100)}%)
                </span>
                <input
                  type="range"
                  min={15}
                  max={85}
                  value={Math.round((appearance.wallpaperDim ?? 0.45) * 100)}
                  onChange={(e) =>
                    updateField('wallpaperDim', Number(e.target.value) / 100)
                  }
                  className="w-48 accent-indigo-500 cursor-pointer"
                />
              </div>
            )}
          </section>

          {/* Sección 4: Tono de hoja de lectura */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Tono de hoja en el visor (PDF y DOCX)
              </h3>
              <span className="text-[11px] text-slate-400">
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
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-500/20 ring-1 ring-indigo-500/45'
                        : 'border-slate-800 bg-slate-950/45 hover:border-indigo-500/40 hover:bg-slate-900'
                    }`}
                  >
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

          {/* Sección 5: Tipografía, esquinas y escala */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      className={`w-full px-3 py-2 rounded-xl border text-left text-xs flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-500/20 text-white font-semibold'
                          : 'border-slate-800 bg-slate-950/45 text-slate-300 hover:border-indigo-500/40'
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
                      className={`w-full px-3 py-2 rounded-xl border text-left text-xs flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-500/20 text-white font-semibold'
                          : 'border-slate-800 bg-slate-950/45 text-slate-300 hover:border-indigo-500/40'
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
                      className={`w-full px-3 py-2 rounded-xl border text-left text-xs flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-500/20 text-white font-semibold'
                          : 'border-slate-800 bg-slate-950/45 text-slate-300 hover:border-indigo-500/40'
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
        <div className="px-4 sm:px-5 py-3.5 border-t border-indigo-500/25 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
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
