import { describe, expect, it } from 'vitest';
import {
  ACCENT_PALETTES,
  applyAppearanceToDocument,
  buildCustomAccentScale,
  DEFAULT_APPEARANCE,
  FONT_CHOICES,
  PAPER_TONES,
  resolveAppearance,
  THEME_PRESETS,
  UI_RADIUS_CHOICES,
  UI_SCALE_CHOICES,
  WALLPAPER_CHOICES,
} from '../themes';

const EXPECTED_SHADES = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
];

describe('themes', () => {
  it('incluye todos los presets de color, acentos y fondos con escalas completas', () => {
    expect(THEME_PRESETS).toHaveLength(9);
    expect(THEME_PRESETS.filter((t) => t.mode === 'light')).toHaveLength(2);
    expect(ACCENT_PALETTES).toHaveLength(8);
    expect(WALLPAPER_CHOICES).toHaveLength(7);
    expect(PAPER_TONES).toHaveLength(3);
    expect(FONT_CHOICES).toHaveLength(3);
    expect(UI_RADIUS_CHOICES).toHaveLength(3);
    expect(UI_SCALE_CHOICES).toHaveLength(3);

    for (const accent of ACCENT_PALETTES) {
      for (const shade of EXPECTED_SHADES) {
        expect(accent.darkScale[shade]).toMatch(/^\d+\s+\d+\s+\d+$/);
        expect(accent.lightScale[shade]).toMatch(/^\d+\s+\d+\s+\d+$/);
      }
    }

    const customDark = buildCustomAccentScale('#e11d48', 'dark');
    const customLight = buildCustomAccentScale('#e11d48', 'light');
    for (const shade of EXPECTED_SHADES) {
      expect(customDark[shade]).toMatch(/^\d+\s+\d+\s+\d+$/);
      expect(customLight[shade]).toMatch(/^\d+\s+\d+\s+\d+$/);
    }
  });

  it('resolveAppearance mezcla valores parciales sin mutar los valores por defecto', () => {
    const base = resolveAppearance();
    expect(base).toEqual(DEFAULT_APPEARANCE);

    const custom = resolveAppearance({
      themeId: 'rose_night',
      wallpaperId: 'rose_bloom',
      paperTone: 'warm',
    });

    expect(custom).toEqual({
      ...DEFAULT_APPEARANCE,
      themeId: 'rose_night',
      wallpaperId: 'rose_bloom',
      paperTone: 'warm',
    });
    expect(DEFAULT_APPEARANCE.themeId).toBe('midnight');
    expect(DEFAULT_APPEARANCE.wallpaperId).toBe('mesh_accent');
    expect(DEFAULT_APPEARANCE.paperTone).toBe('pure');
  });

  it('applyAppearanceToDocument aplica tema, acento libre, wallpaper y atributos CSS', () => {
    const attrs: Record<string, string> = {};
    const props: Record<string, string> = {};
    const styleMock = {
      fontSize: '',
      setProperty: (k: string, v: string) => {
        props[k] = v;
      },
    };
    const prevDocument = (globalThis as { document?: unknown }).document;

    (globalThis as { document?: unknown }).document = {
      documentElement: {
        setAttribute: (k: string, v: string) => {
          attrs[k] = v;
        },
        style: styleMock,
      },
    };

    try {
      applyAppearanceToDocument({
        themeId: 'paper_light',
        accentId: 'emerald',
        wallpaperId: 'ocean_grid',
        paperTone: 'warm',
        fontFamily: 'serif',
        uiRadius: 'soft',
        uiScale: 'comfortable',
      });

      expect(attrs['data-theme-mode']).toBe('light');
      expect(attrs['data-theme-id']).toBe('paper_light');
      expect(attrs['data-ui-radius']).toBe('soft');
      expect(attrs['data-paper-tone']).toBe('warm');
      expect(attrs['data-wallpaper-id']).toBe('ocean_grid');
      expect(props['--sf-bg-app']).toBe('238 242 247');
      expect(props['--sf-paper-bg']).toBe('#fbf6ea');
      expect(props['--sf-accent-300']).toBe('4 120 87');
      expect(props['--sf-env-bg-repeat']).toContain('repeat');
      expect(props['--sf-font-sans']).toContain('Lora');
      expect(styleMock.fontSize).toBe('17px');

      applyAppearanceToDocument({
        themeId: 'forest',
        accentId: 'emerald',
        wallpaperId: 'custom_image',
        customWallpaperDataUrl: 'data:image/jpeg;base64,abc123',
        wallpaperDim: 0.5,
        paperTone: 'pure',
        fontFamily: 'inter',
        uiRadius: 'modern',
        uiScale: 'normal',
      });

      expect(attrs['data-theme-mode']).toBe('dark');
      expect(attrs['data-theme-id']).toBe('forest');
      expect(attrs['data-wallpaper-id']).toBe('custom_image');
      expect(props['--sf-bg-app']).toBe('11 43 34');
      expect(props['--sf-bg-panel']).toBe('18 61 49');
      expect(props['--sf-accent-500']).toBe('16 185 129');
      expect(props['--sf-accent-600']).toBe('5 150 105');
      expect(props['--sf-env-bg']).toContain('data:image/jpeg;base64,abc123');
      expect(props['--sf-env-bg-repeat']).toBe('no-repeat');

      applyAppearanceToDocument({
        themeId: 'crimson_night',
        accentId: 'custom',
        customAccentHex: '#ff3366',
        paperTone: 'pure',
        fontFamily: 'inter',
        uiRadius: 'modern',
        uiScale: 'normal',
      });

      expect(attrs['data-theme-id']).toBe('crimson_night');
      expect(props['--sf-accent-500']).toBe('255 51 102');
    } finally {
      if (prevDocument === undefined) {
        delete (globalThis as { document?: unknown }).document;
      } else {
        (globalThis as { document?: unknown }).document = prevDocument;
      }
    }
  });
});
