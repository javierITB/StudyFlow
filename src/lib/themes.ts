import {
  AccentColorId,
  AppearanceSettings,
  FontChoiceId,
  PaperToneId,
  ThemePresetId,
  UiRadiusId,
  UiScaleId,
  WallpaperId,
} from '../types/studyflow';

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  themeId: 'midnight',
  accentId: 'indigo',
  customAccentHex: '#10b981',
  wallpaperId: 'mesh_accent',
  wallpaperDim: 0.45,
  paperTone: 'pure',
  fontFamily: 'inter',
  uiRadius: 'modern',
  uiScale: 'normal',
};

export interface ThemePaletteDefinition {
  id: ThemePresetId;
  name: string;
  description: string;
  mode: 'dark' | 'light';
  previewSwatches: [string, string, string];
  tokens: {
    bgApp: string;
    bgPanel: string;
    bgElevated: string;
    borderStrong: string;
    textMuted: string;
    textSubtle: string;
    textSecondary: string;
    textPrimary: string;
    textBright: string;
    textHigh: string;
    textMax: string;
  };
}

export const THEME_PRESETS: ThemePaletteDefinition[] = [
  {
    id: 'midnight',
    name: 'Medianoche Grafito',
    description: 'Gris carbón equilibrado con acento limpio',
    mode: 'dark',
    previewSwatches: ['#101218', '#181c24', '#4f46e5'],
    tokens: {
      bgApp: '16 18 24',
      bgPanel: '24 28 36',
      bgElevated: '36 41 53',
      borderStrong: '58 66 84',
      textMuted: '86 96 116',
      textSubtle: '116 126 146',
      textSecondary: '160 170 188',
      textPrimary: '210 218 230',
      textBright: '229 234 242',
      textHigh: '243 246 250',
      textMax: '250 251 253',
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidiana OLED',
    description: 'Negro profundo de alto contraste nocturno',
    mode: 'dark',
    previewSwatches: ['#050508', '#101015', '#6366f1'],
    tokens: {
      bgApp: '5 5 8',
      bgPanel: '16 16 21',
      bgElevated: '28 28 36',
      borderStrong: '54 54 68',
      textMuted: '82 82 96',
      textSubtle: '113 113 128',
      textSecondary: '161 161 176',
      textPrimary: '212 212 222',
      textBright: '228 228 236',
      textHigh: '244 244 248',
      textMax: '255 255 255',
    },
  },
  {
    id: 'forest',
    name: 'Bosque Esmeralda',
    description: 'Verde bosque real con atmósfera relajante',
    mode: 'dark',
    previewSwatches: ['#0b2b22', '#123d31', '#10b981'],
    tokens: {
      bgApp: '11 43 34',
      bgPanel: '18 61 49',
      bgElevated: '26 82 66',
      borderStrong: '44 122 99',
      textMuted: '88 152 130',
      textSubtle: '126 186 164',
      textSecondary: '170 216 199',
      textPrimary: '214 240 230',
      textBright: '232 248 241',
      textHigh: '244 252 248',
      textMax: '251 255 253',
    },
  },
  {
    id: 'rose_night',
    name: 'Rosa Nocturno',
    description: 'Entorno ciruela y rosa oscuro envolvente',
    mode: 'dark',
    previewSwatches: ['#26101d', '#36172a', '#ec4899'],
    tokens: {
      bgApp: '38 16 29',
      bgPanel: '54 23 42',
      bgElevated: '74 33 58',
      borderStrong: '116 56 92',
      textMuted: '154 96 130',
      textSubtle: '186 130 163',
      textSecondary: '214 174 198',
      textPrimary: '238 214 228',
      textBright: '247 230 240',
      textHigh: '252 242 248',
      textMax: '255 250 253',
    },
  },
  {
    id: 'crimson_night',
    name: 'Carmesí Estudio',
    description: 'Tonos vino y rojizo intenso anti-reflejo',
    mode: 'dark',
    previewSwatches: ['#260d12', '#38131a', '#dc2626'],
    tokens: {
      bgApp: '38 13 18',
      bgPanel: '56 19 26',
      bgElevated: '77 28 38',
      borderStrong: '122 48 62',
      textMuted: '158 92 104',
      textSubtle: '190 128 138',
      textSecondary: '218 172 179',
      textPrimary: '241 214 218',
      textBright: '249 230 233',
      textHigh: '253 242 244',
      textMax: '255 250 251',
    },
  },
  {
    id: 'nordic',
    name: 'Azul Nórdico',
    description: 'Azul frío profundo tipo estudio ártico',
    mode: 'dark',
    previewSwatches: ['#132033', '#1c2d46', '#38bdf8'],
    tokens: {
      bgApp: '19 32 51',
      bgPanel: '28 45 70',
      bgElevated: '40 63 95',
      borderStrong: '65 97 143',
      textMuted: '104 134 176',
      textSubtle: '138 166 204',
      textSecondary: '178 198 225',
      textPrimary: '214 226 242',
      textBright: '230 238 249',
      textHigh: '242 247 253',
      textMax: '250 252 255',
    },
  },
  {
    id: 'espresso',
    name: 'Café Terracota',
    description: 'Tonos cálidos tostados bajos en luz azul',
    mode: 'dark',
    previewSwatches: ['#1e140e', '#2e1f16', '#f59e0b'],
    tokens: {
      bgApp: '30 20 14',
      bgPanel: '46 31 22',
      bgElevated: '66 45 32',
      borderStrong: '109 77 57',
      textMuted: '142 108 86',
      textSubtle: '174 142 120',
      textSecondary: '206 182 164',
      textPrimary: '232 218 206',
      textBright: '244 234 226',
      textHigh: '251 245 240',
      textMax: '255 252 249',
    },
  },
  {
    id: 'paper_light',
    name: 'Papel Académico',
    description: 'Tema claro luminoso estilo cuaderno',
    mode: 'light',
    previewSwatches: ['#eef2f7', '#ffffff', '#4f46e5'],
    tokens: {
      bgApp: '238 242 247',
      bgPanel: '255 255 255',
      bgElevated: '221 229 239',
      borderStrong: '192 204 220',
      textMuted: '100 116 139',
      textSubtle: '71 85 105',
      textSecondary: '71 85 105',
      textPrimary: '51 65 85',
      textBright: '30 41 59',
      textHigh: '15 23 42',
      textMax: '15 23 42',
    },
  },
  {
    id: 'rose_light',
    name: 'Cuaderno Rosa',
    description: 'Tema claro suave con matices rosáceos',
    mode: 'light',
    previewSwatches: ['#fdf2f5', '#ffffff', '#db2777'],
    tokens: {
      bgApp: '253 242 245',
      bgPanel: '255 255 255',
      bgElevated: '250 227 234',
      borderStrong: '236 192 207',
      textMuted: '138 92 110',
      textSubtle: '108 68 84',
      textSecondary: '98 58 74',
      textPrimary: '78 42 58',
      textBright: '58 28 42',
      textHigh: '42 18 30',
      textMax: '36 14 25',
    },
  },
];

export interface AccentPaletteDefinition {
  id: Exclude<AccentColorId, 'custom'>;
  name: string;
  swatchHex: string;
  darkScale: Record<string, string>;
  lightScale: Record<string, string>;
}

export const ACCENT_PALETTES: AccentPaletteDefinition[] = [
  {
    id: 'indigo',
    name: 'Índigo',
    swatchHex: '#4f46e5',
    darkScale: {
      '50': '238 242 255',
      '100': '224 231 255',
      '200': '199 210 254',
      '300': '165 180 252',
      '400': '129 140 248',
      '500': '99 102 241',
      '600': '79 70 229',
      '700': '67 56 202',
      '800': '55 48 163',
      '900': '49 46 129',
      '950': '30 27 75',
    },
    lightScale: {
      '50': '238 242 255',
      '100': '224 231 255',
      '200': '67 56 202',
      '300': '67 56 202',
      '400': '79 70 229',
      '500': '99 102 241',
      '600': '79 70 229',
      '700': '67 56 202',
      '800': '55 48 163',
      '900': '238 242 255',
      '950': '238 242 255',
    },
  },
  {
    id: 'violet',
    name: 'Violeta',
    swatchHex: '#7c3aed',
    darkScale: {
      '50': '245 243 255',
      '100': '237 233 254',
      '200': '221 214 254',
      '300': '196 181 253',
      '400': '167 139 250',
      '500': '139 92 246',
      '600': '124 58 237',
      '700': '109 40 217',
      '800': '91 33 182',
      '900': '76 29 149',
      '950': '59 22 118',
    },
    lightScale: {
      '50': '245 243 255',
      '100': '237 233 254',
      '200': '109 40 217',
      '300': '109 40 217',
      '400': '124 58 237',
      '500': '139 92 246',
      '600': '124 58 237',
      '700': '109 40 217',
      '800': '91 33 182',
      '900': '245 243 255',
      '950': '245 243 255',
    },
  },
  {
    id: 'emerald',
    name: 'Esmeralda',
    swatchHex: '#10b981',
    darkScale: {
      '50': '236 253 245',
      '100': '209 250 229',
      '200': '167 243 208',
      '300': '110 231 183',
      '400': '52 211 153',
      '500': '16 185 129',
      '600': '5 150 105',
      '700': '4 120 87',
      '800': '6 95 70',
      '900': '6 78 59',
      '950': '6 78 59',
    },
    lightScale: {
      '50': '236 253 245',
      '100': '209 250 229',
      '200': '4 120 87',
      '300': '4 120 87',
      '400': '5 150 105',
      '500': '16 185 129',
      '600': '5 150 105',
      '700': '4 120 87',
      '800': '6 95 70',
      '900': '236 253 245',
      '950': '236 253 245',
    },
  },
  {
    id: 'sky',
    name: 'Cielo',
    swatchHex: '#0284c7',
    darkScale: {
      '50': '240 249 255',
      '100': '224 242 254',
      '200': '186 230 253',
      '300': '125 211 252',
      '400': '56 189 248',
      '500': '14 165 233',
      '600': '2 132 199',
      '700': '3 105 161',
      '800': '7 89 133',
      '900': '12 74 110',
      '950': '10 60 92',
    },
    lightScale: {
      '50': '240 249 255',
      '100': '224 242 254',
      '200': '3 105 161',
      '300': '3 105 161',
      '400': '2 132 199',
      '500': '14 165 233',
      '600': '2 132 199',
      '700': '3 105 161',
      '800': '7 89 133',
      '900': '240 249 255',
      '950': '240 249 255',
    },
  },
  {
    id: 'amber',
    name: 'Ámbar',
    swatchHex: '#d97706',
    darkScale: {
      '50': '255 251 235',
      '100': '254 243 199',
      '200': '253 230 138',
      '300': '252 211 77',
      '400': '251 191 36',
      '500': '245 158 11',
      '600': '217 119 6',
      '700': '180 83 9',
      '800': '146 64 14',
      '900': '120 53 15',
      '950': '86 36 8',
    },
    lightScale: {
      '50': '255 251 235',
      '100': '254 243 199',
      '200': '180 83 9',
      '300': '180 83 9',
      '400': '217 119 6',
      '500': '245 158 11',
      '600': '217 119 6',
      '700': '180 83 9',
      '800': '146 64 14',
      '900': '255 251 235',
      '950': '255 251 235',
    },
  },
  {
    id: 'rose',
    name: 'Coral',
    swatchHex: '#f43f5e',
    darkScale: {
      '50': '255 241 242',
      '100': '255 228 230',
      '200': '254 205 211',
      '300': '253 164 175',
      '400': '251 113 133',
      '500': '244 63 94',
      '600': '225 29 72',
      '700': '190 18 60',
      '800': '159 18 57',
      '900': '136 19 55',
      '950': '96 12 38',
    },
    lightScale: {
      '50': '255 241 242',
      '100': '255 228 230',
      '200': '190 18 60',
      '300': '190 18 60',
      '400': '225 29 72',
      '500': '244 63 94',
      '600': '225 29 72',
      '700': '190 18 60',
      '800': '159 18 57',
      '900': '255 241 242',
      '950': '255 241 242',
    },
  },
  {
    id: 'pink',
    name: 'Rosa',
    swatchHex: '#ec4899',
    darkScale: {
      '50': '253 242 248',
      '100': '252 231 243',
      '200': '251 207 232',
      '300': '249 168 212',
      '400': '244 114 182',
      '500': '236 72 153',
      '600': '219 39 119',
      '700': '190 24 93',
      '800': '157 23 77',
      '900': '131 24 67',
      '950': '92 16 47',
    },
    lightScale: {
      '50': '253 242 248',
      '100': '252 231 243',
      '200': '190 24 93',
      '300': '190 24 93',
      '400': '219 39 119',
      '500': '236 72 153',
      '600': '219 39 119',
      '700': '190 24 93',
      '800': '157 23 77',
      '900': '253 242 248',
      '950': '253 242 248',
    },
  },
  {
    id: 'crimson',
    name: 'Rojo Carmesí',
    swatchHex: '#dc2626',
    darkScale: {
      '50': '254 242 242',
      '100': '254 226 226',
      '200': '254 202 202',
      '300': '252 165 165',
      '400': '248 113 113',
      '500': '239 68 68',
      '600': '220 38 38',
      '700': '185 28 28',
      '800': '153 27 27',
      '900': '127 29 29',
      '950': '92 20 20',
    },
    lightScale: {
      '50': '254 242 242',
      '100': '254 226 226',
      '200': '185 28 28',
      '300': '185 28 28',
      '400': '220 38 38',
      '500': '239 68 68',
      '600': '220 38 38',
      '700': '185 28 28',
      '800': '153 27 27',
      '900': '254 242 242',
      '950': '254 242 242',
    },
  },
];

export const WALLPAPER_CHOICES: Array<{
  id: WallpaperId;
  name: string;
  desc: string;
  previewCss: string;
}> = [
  {
    id: 'solid',
    name: 'Limpio del Tema',
    desc: 'Color sólido sin textura',
    previewCss: 'linear-gradient(135deg, rgb(var(--sf-bg-app)), rgb(var(--sf-bg-panel)))',
  },
  {
    id: 'mesh_accent',
    name: 'Aurora del Acento',
    desc: 'Degradado dinámico con tu acento',
    previewCss:
      'radial-gradient(circle at 25% 20%, rgb(var(--sf-accent-500) / 0.65), transparent 60%), radial-gradient(circle at 80% 80%, rgb(var(--sf-accent-600) / 0.45), rgb(var(--sf-bg-app)))',
  },
  {
    id: 'botanical',
    name: 'Bosque Esmeralda',
    desc: 'Atmósfera verde orgánica',
    previewCss:
      'radial-gradient(circle at 20% 15%, rgba(16, 185, 129, 0.55), transparent 55%), linear-gradient(145deg, #06291f, #0d3b2e, #051c16)',
  },
  {
    id: 'rose_bloom',
    name: 'Bruma Rosácea',
    desc: 'Degradado rosado y ciruela suave',
    previewCss:
      'radial-gradient(circle at 30% 20%, rgba(236, 72, 153, 0.55), transparent 58%), linear-gradient(145deg, #2d1022, #451833, #1f0a17)',
  },
  {
    id: 'crimson_dusk',
    name: 'Ocaso Carmesí',
    desc: 'Degradado rojizo profundo',
    previewCss:
      'radial-gradient(circle at 25% 20%, rgba(220, 38, 38, 0.55), transparent 58%), linear-gradient(145deg, #2b0c12, #42121b, #1d080c)',
  },
  {
    id: 'ocean_grid',
    name: 'Cuadrícula Estudio',
    desc: 'Retícula técnica adaptada al acento',
    previewCss:
      'linear-gradient(rgb(var(--sf-accent-400) / 0.28) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--sf-accent-400) / 0.28) 1px, rgb(var(--sf-bg-app)) 1px)',
  },
  {
    id: 'dots_studio',
    name: 'Libreta de Puntos',
    desc: 'Matriz punteada estilo cuaderno',
    previewCss:
      'radial-gradient(rgb(var(--sf-accent-400) / 0.5) 1.5px, rgb(var(--sf-bg-app)) 1.5px)',
  },
];

export const PAPER_TONES: Array<{
  id: PaperToneId;
  name: string;
  hex: string;
  desc: string;
}> = [
  { id: 'pure', name: 'Blanco Puro', hex: '#ffffff', desc: 'Máximo contraste' },
  { id: 'warm', name: 'Papel Crema', hex: '#fbf6ea', desc: 'Cálido anti-fatiga' },
  { id: 'soft_gray', name: 'Gris E-Ink', hex: '#edf0f4', desc: 'Suave tipo lector' },
];

export const FONT_CHOICES: Array<{
  id: FontChoiceId;
  name: string;
  stack: string;
}> = [
  { id: 'inter', name: 'Moderna (Inter)', stack: "'Inter', system-ui, sans-serif" },
  { id: 'serif', name: 'Editorial (Lora)', stack: "'Lora', Georgia, serif" },
  { id: 'mono', name: 'Técnica (Mono)', stack: "'JetBrains Mono', monospace" },
];

export const UI_RADIUS_CHOICES: Array<{ id: UiRadiusId; name: string }> = [
  { id: 'modern', name: 'Estándar' },
  { id: 'sharp', name: 'Recto' },
  { id: 'soft', name: 'Suave' },
];

export const UI_SCALE_CHOICES: Array<{ id: UiScaleId; name: string; fontSizePx: string }> =
  [
    { id: 'compact', name: 'Compacta (94%)', fontSizePx: '15px' },
    { id: 'normal', name: 'Estándar (100%)', fontSizePx: '16px' },
    { id: 'comfortable', name: 'Amplia (106%)', fontSizePx: '17px' },
  ];

function parseHexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return [
      parseInt(cleaned.slice(0, 2), 16),
      parseInt(cleaned.slice(2, 4), 16),
      parseInt(cleaned.slice(4, 6), 16),
    ];
  }
  return [16, 185, 129];
}

function mixRgb(
  base: [number, number, number],
  target: [number, number, number],
  weight: number
): string {
  const r = Math.round(base[0] * (1 - weight) + target[0] * weight);
  const g = Math.round(base[1] * (1 - weight) + target[1] * weight);
  const b = Math.round(base[2] * (1 - weight) + target[2] * weight);
  return `${r} ${g} ${b}`;
}

export function buildCustomAccentScale(
  hex: string,
  mode: 'dark' | 'light'
): Record<string, string> {
  const base = parseHexToRgb(hex);
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [10, 14, 22];

  if (mode === 'light') {
    const deepText = mixRgb(base, black, 0.34);
    const softTint = mixRgb(base, white, 0.88);
    return {
      '50': mixRgb(base, white, 0.92),
      '100': softTint,
      '200': deepText,
      '300': deepText,
      '400': mixRgb(base, black, 0.14),
      '500': mixRgb(base, black, 0.04),
      '600': mixRgb(base, black, 0.18),
      '700': deepText,
      '800': mixRgb(base, black, 0.44),
      '900': softTint,
      '950': softTint,
    };
  }

  return {
    '50': mixRgb(base, white, 0.9),
    '100': mixRgb(base, white, 0.8),
    '200': mixRgb(base, white, 0.65),
    '300': mixRgb(base, white, 0.45),
    '400': mixRgb(base, white, 0.22),
    '500': `${base[0]} ${base[1]} ${base[2]}`,
    '600': mixRgb(base, black, 0.14),
    '700': mixRgb(base, black, 0.28),
    '800': mixRgb(base, black, 0.42),
    '900': mixRgb(base, black, 0.56),
    '950': mixRgb(base, black, 0.66),
  };
}

export function resolveAppearance(
  partial?: Partial<AppearanceSettings>
): AppearanceSettings {
  return {
    ...DEFAULT_APPEARANCE,
    ...(partial || {}),
  };
}

function buildWallpaperCss(
  appearance: AppearanceSettings,
  mode: 'dark' | 'light'
): { bgImage: string; bgSize: string; bgRepeat: string } {
  const wp = appearance.wallpaperId || 'mesh_accent';
  const dim = Math.min(0.85, Math.max(0.15, appearance.wallpaperDim ?? 0.45));

  if (wp === 'custom_image' && appearance.customWallpaperDataUrl) {
    const safeUrl = appearance.customWallpaperDataUrl.replace(/"/g, '%22');
    return {
      bgImage: `linear-gradient(rgb(var(--sf-bg-app) / ${dim}), rgb(var(--sf-bg-app) / ${dim})), url("${safeUrl}")`,
      bgSize: 'cover',
      bgRepeat: 'no-repeat',
    };
  }

  const alphaPrimary = mode === 'light' ? 0.16 : 0.28;
  const alphaSecondary = mode === 'light' ? 0.1 : 0.18;

  switch (wp) {
    case 'solid':
      return { bgImage: 'none', bgSize: 'cover', bgRepeat: 'no-repeat' };
    case 'botanical':
      return {
        bgImage:
          mode === 'light'
            ? 'radial-gradient(ellipse 75% 55% at 15% 15%, rgba(16, 185, 129, 0.22), transparent 65%), radial-gradient(ellipse 65% 50% at 85% 85%, rgba(5, 150, 105, 0.18), transparent 65%)'
            : 'radial-gradient(ellipse 80% 60% at 18% 12%, rgba(16, 185, 129, 0.34), transparent 62%), radial-gradient(ellipse 70% 55% at 88% 85%, rgba(4, 120, 87, 0.30), transparent 65%), linear-gradient(155deg, rgba(6, 78, 59, 0.25), transparent 65%)',
        bgSize: 'cover',
        bgRepeat: 'no-repeat',
      };
    case 'rose_bloom':
      return {
        bgImage:
          mode === 'light'
            ? 'radial-gradient(ellipse 75% 55% at 20% 15%, rgba(236, 72, 153, 0.20), transparent 65%), radial-gradient(ellipse 65% 50% at 85% 85%, rgba(219, 39, 119, 0.16), transparent 65%)'
            : 'radial-gradient(ellipse 80% 60% at 20% 15%, rgba(236, 72, 153, 0.34), transparent 62%), radial-gradient(ellipse 70% 55% at 85% 85%, rgba(190, 24, 93, 0.28), transparent 65%), linear-gradient(155deg, rgba(131, 24, 67, 0.24), transparent 65%)',
        bgSize: 'cover',
        bgRepeat: 'no-repeat',
      };
    case 'crimson_dusk':
      return {
        bgImage:
          mode === 'light'
            ? 'radial-gradient(ellipse 75% 55% at 20% 15%, rgba(220, 38, 38, 0.18), transparent 65%), radial-gradient(ellipse 65% 50% at 85% 85%, rgba(185, 28, 28, 0.14), transparent 65%)'
            : 'radial-gradient(ellipse 80% 60% at 20% 15%, rgba(239, 68, 68, 0.30), transparent 62%), radial-gradient(ellipse 70% 55% at 85% 85%, rgba(185, 28, 28, 0.30), transparent 65%), linear-gradient(155deg, rgba(127, 29, 29, 0.26), transparent 65%)',
        bgSize: 'cover',
        bgRepeat: 'no-repeat',
      };
    case 'ocean_grid':
      return {
        bgImage: `linear-gradient(rgb(var(--sf-accent-500) / ${mode === 'light' ? 0.11 : 0.15}) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--sf-accent-500) / ${mode === 'light' ? 0.11 : 0.15}) 1px, transparent 1px), radial-gradient(ellipse 85% 55% at 50% 0%, rgb(var(--sf-accent-500) / ${alphaPrimary}), transparent 72%)`,
        bgSize: '32px 32px, 32px 32px, 100% 100%',
        bgRepeat: 'repeat, repeat, no-repeat',
      };
    case 'dots_studio':
      return {
        bgImage: `radial-gradient(rgb(var(--sf-accent-400) / ${mode === 'light' ? 0.24 : 0.28}) 1.35px, transparent 1.35px), radial-gradient(ellipse 85% 55% at 50% 0%, rgb(var(--sf-accent-500) / ${alphaPrimary}), transparent 72%)`,
        bgSize: '22px 22px, 100% 100%',
        bgRepeat: 'repeat, no-repeat',
      };
    case 'mesh_accent':
    default:
      return {
        bgImage: `radial-gradient(ellipse 85% 52% at 25% 0%, rgb(var(--sf-accent-500) / ${alphaPrimary}), transparent 66%), radial-gradient(ellipse 65% 48% at 88% 92%, rgb(var(--sf-accent-600) / ${alphaSecondary}), transparent 68%)`,
        bgSize: 'cover',
        bgRepeat: 'no-repeat',
      };
  }
}

export function applyAppearanceToDocument(appearance: AppearanceSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const theme =
    THEME_PRESETS.find((t) => t.id === appearance.themeId) || THEME_PRESETS[0];
  const paper =
    PAPER_TONES.find((p) => p.id === appearance.paperTone) || PAPER_TONES[0];
  const font =
    FONT_CHOICES.find((f) => f.id === appearance.fontFamily) || FONT_CHOICES[0];
  const scale =
    UI_SCALE_CHOICES.find((s) => s.id === appearance.uiScale) || UI_SCALE_CHOICES[1];

  let scaleMap: Record<string, string>;
  if (appearance.accentId === 'custom' && appearance.customAccentHex) {
    scaleMap = buildCustomAccentScale(appearance.customAccentHex, theme.mode);
  } else {
    const accent =
      ACCENT_PALETTES.find((a) => a.id === appearance.accentId) || ACCENT_PALETTES[0];
    scaleMap = theme.mode === 'light' ? accent.lightScale : accent.darkScale;
  }

  root.setAttribute('data-theme-mode', theme.mode);
  root.setAttribute('data-theme-id', theme.id);
  root.setAttribute('data-ui-radius', appearance.uiRadius);
  root.setAttribute('data-paper-tone', appearance.paperTone);
  root.setAttribute('data-wallpaper-id', appearance.wallpaperId || 'mesh_accent');

  const s = root.style;
  s.setProperty('--sf-bg-app', theme.tokens.bgApp);
  s.setProperty('--sf-bg-panel', theme.tokens.bgPanel);
  s.setProperty('--sf-bg-elevated', theme.tokens.bgElevated);
  s.setProperty('--sf-border-strong', theme.tokens.borderStrong);
  s.setProperty('--sf-text-muted', theme.tokens.textMuted);
  s.setProperty('--sf-text-subtle', theme.tokens.textSubtle);
  s.setProperty('--sf-text-secondary', theme.tokens.textSecondary);
  s.setProperty('--sf-text-primary', theme.tokens.textPrimary);
  s.setProperty('--sf-text-bright', theme.tokens.textBright);
  s.setProperty('--sf-text-high', theme.tokens.textHigh);
  s.setProperty('--sf-text-max', theme.tokens.textMax);

  Object.entries(scaleMap).forEach(([shade, rgb]) => {
    s.setProperty(`--sf-accent-${shade}`, rgb);
  });

  const wpCss = buildWallpaperCss(appearance, theme.mode);
  s.setProperty('--sf-env-bg', wpCss.bgImage);
  s.setProperty('--sf-env-bg-size', wpCss.bgSize);
  s.setProperty('--sf-env-bg-repeat', wpCss.bgRepeat);

  s.setProperty('--sf-paper-bg', paper.hex);
  s.setProperty('--sf-font-sans', font.stack);
  s.fontSize = scale.fontSizePx;
}

export function compressWallpaperImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) {
        reject(new Error('Archivo de imagen vacío'));
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        const maxDim = 1440;
        const ratio = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round((img.width || maxDim) * ratio));
        const height = Math.max(1, Math.round((img.height || maxDim) * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
