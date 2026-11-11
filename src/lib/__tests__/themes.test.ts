import { describe, expect, it } from 'vitest';
import {
  ACCENT_PALETTES,
  applyAppearanceToDocument,
  DEFAULT_APPEARANCE,
  FONT_CHOICES,
  PAPER_TONES,
  resolveAppearance,
  THEME_PRESETS,
  UI_RADIUS_CHOICES,
  UI_SCALE_CHOICES,
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
  it('incluye todos los presets esperados con escalas completas', () => {
    expect(THEME_PRESETS).toHaveLength(6);
    expect(THEME_PRESETS.filter((t) => t.mode === 'light')).toHaveLength(1);
    expect(ACCENT_PALETTES).toHaveLength(6);
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
  });

  it('resolveAppearance mezcla valores parciales sin mutar los valores por defecto', () => {
    const base = resolveAppearance();
    expect(base).toEqual(DEFAULT_APPEARANCE);

    const custom = resolveAppearance({
      themeId: 'forest',
      paperTone: 'warm',
    });

    expect(custom).toEqual({
      ...DEFAULT_APPEARANCE,
      themeId: 'forest',
      paperTone: 'warm',
    });
    expect(DEFAULT_APPEARANCE.themeId).toBe('midnight');
    expect(DEFAULT_APPEARANCE.paperTone).toBe('pure');
  });

  it('applyAppearanceToDocument aplica atributos y variables CSS en el DOM', () => {
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
        paperTone: 'warm',
        fontFamily: 'serif',
        uiRadius: 'soft',
        uiScale: 'comfortable',
      });

      expect(attrs['data-theme-mode']).toBe('light');
      expect(attrs['data-theme-id']).toBe('paper_light');
      expect(attrs['data-ui-radius']).toBe('soft');
      expect(attrs['data-paper-tone']).toBe('warm');
      expect(props['--sf-bg-app']).toBe('241 244 248');
      expect(props['--sf-paper-bg']).toBe('#fbf6ea');
      expect(props['--sf-accent-300']).toBe('4 120 87');
      expect(props['--sf-font-sans']).toContain('Lora');
      expect(styleMock.fontSize).toBe('17px');
    } finally {
      if (prevDocument === undefined) {
        delete (globalThis as { document?: unknown }).document;
      } else {
        (globalThis as { document?: unknown }).document = prevDocument;
      }
    }
  });
});

