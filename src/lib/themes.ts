import {
  AccentColorId,
  AppearanceSettings,
  FontChoiceId,
  PaperToneId,
  ThemePresetId,
  UiRadiusId,
  UiScaleId,
} from '../types/studyflow';

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  themeId: 'midnight',
  accentId: 'indigo',
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
    name: 'Medianoche Slate',
    description: 'Tema clásico oscuro equilibrado',
    mode: 'dark',
    previewSwatches: ['#020617', '#0f172a', '#4f46e5'],
    tokens: {
      bgApp: '2 6 23',
      bgPanel: '15 23 42',
      bgElevated: '30 41 59',
      borderStrong: '51 65 85',
      textMuted: '71 85 105',
      textSubtle: '100 116 139',
      textSecondary: '148 163 184',
      textPrimary: '203 213 225',
      textBright: '226 232 240',
      textHigh: '241 245 249',
      textMax: '248 250 252',
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidiana OLED',
    description: 'Negro profundo de alto contraste nocturno',
    mode: 'dark',
    previewSwatches: ['#000000', '#111115', '#6366f1'],
    tokens: {
      bgApp: '4 4 6',
      bgPanel: '16 16 20',
      bgElevated: '28 28 36',
      borderStrong: '52 52 64',
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
    id: 'nordic',
    name: 'Noche Nórdica',
    description: 'Azul pizarra frío suave para la vista',
    mode: 'dark',
    previewSwatches: ['#1d2330', '#272f40', '#38bdf8'],
    tokens: {
      bgApp: '29 35 48',
      bgPanel: '39 47 64',
      bgElevated: '52 62 84',
      borderStrong: '72 86 114',
      textMuted: '98 114 142',
      textSubtle: '126 142 170',
      textSecondary: '166 180 205',
      textPrimary: '206 216 233',
      textBright: '224 231 243',
      textHigh: '238 242 249',
      textMax: '248 250 253',
    },
  },
  {
    id: 'forest',
    name: 'Bosque Sereno',
    description: 'Verde oscuro natural anti-fatiga visual',
    mode: 'dark',
    previewSwatches: ['#071410', '#0e221c', '#10b981'],
    tokens: {
      bgApp: '7 20 16',
      bgPanel: '14 34 28',
      bgElevated: '22 49 41',
      borderStrong: '40 78 66',
      textMuted: '76 114 102',
      textSubtle: '108 148 135',
      textSecondary: '154 190 178',
      textPrimary: '204 226 219',
      textBright: '223 238 233',
      textHigh: '240 248 245',
      textMax: '248 252 250',
    },
  },
  {
    id: 'espresso',
    name: 'Café Nocturno',
    description: 'Tonos cálidos oscuros bajos en luz azul',
    mode: 'dark',
    previewSwatches: ['#14100d', '#211a15', '#f59e0b'],
    tokens: {
      bgApp: '20 16 13',
      bgPanel: '33 26 21',
      bgElevated: '49 39 32',
      borderStrong: '78 64 53',
      textMuted: '112 94 80',
      textSubtle: '144 124 108',
      textSecondary: '184 166 150',
      textPrimary: '222 210 198',
      textBright: '236 227 218',
      textHigh: '247 242 236',
      textMax: '253 250 247',
    },
  },
  {
    id: 'paper_light',
    name: 'Papel Académico',
    description: 'Tema claro luminoso estilo cuaderno',
    mode: 'light',
    previewSwatches: ['#f1f4f8', '#ffffff', '#4f46e5'],
    tokens: {
      bgApp: '241 244 248',
      bgPanel: '255 255 255',
      bgElevated: '226 232 240',
      borderStrong: '203 213 225',
      textMuted: '100 116 139',
      textSubtle: '71 85 105',
      textSecondary: '71 85 105',
      textPrimary: '51 65 85',
      textBright: '30 41 59',
      textHigh: '15 23 42',
      textMax: '15 23 42',
    },
  },
];

export interface AccentPaletteDefinition {
  id: AccentColorId;
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
      '950': '46 16 101',
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
    swatchHex: '#059669',
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
      '950': '2 44 34',
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
      '950': '8 47 73',
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
      '950': '69 26 3',
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
    swatchHex: '#e11d48',
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
      '950': '76 5 25',
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

export function resolveAppearance(
  partial?: Partial<AppearanceSettings>
): AppearanceSettings {
  return {
    ...DEFAULT_APPEARANCE,
    ...(partial || {}),
  };
}

export function applyAppearanceToDocument(appearance: AppearanceSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const theme =
    THEME_PRESETS.find((t) => t.id === appearance.themeId) || THEME_PRESETS[0];
  const accent =
    ACCENT_PALETTES.find((a) => a.id === appearance.accentId) || ACCENT_PALETTES[0];
  const paper =
    PAPER_TONES.find((p) => p.id === appearance.paperTone) || PAPER_TONES[0];
  const font =
    FONT_CHOICES.find((f) => f.id === appearance.fontFamily) || FONT_CHOICES[0];
  const scale =
    UI_SCALE_CHOICES.find((s) => s.id === appearance.uiScale) || UI_SCALE_CHOICES[1];

  root.setAttribute('data-theme-mode', theme.mode);
  root.setAttribute('data-theme-id', theme.id);
  root.setAttribute('data-ui-radius', appearance.uiRadius);
  root.setAttribute('data-paper-tone', appearance.paperTone);

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

  const scaleMap = theme.mode === 'light' ? accent.lightScale : accent.darkScale;
  Object.entries(scaleMap).forEach(([shade, rgb]) => {
    s.setProperty(`--sf-accent-${shade}`, rgb);
  });

  s.setProperty('--sf-paper-bg', paper.hex);
  s.setProperty('--sf-font-sans', font.stack);
  s.fontSize = scale.fontSizePx;
}

