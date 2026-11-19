import { describe, expect, it, vi } from 'vitest';
import {
  HIGHLIGHTER_COLORS,
  PEN_COLORS,
  isPointNearStroke,
  renderStrokesToCanvas,
} from '../strokeEngine';
import { DrawingStroke } from '../../types/studyflow';

describe('strokeEngine (Suite de trazos y destacados PDF)', () => {
  it('contiene paletas de colores válidas para destacador y lápiz', () => {
    expect(HIGHLIGHTER_COLORS.length).toBeGreaterThanOrEqual(5);
    expect(PEN_COLORS.length).toBeGreaterThanOrEqual(5);
    expect(HIGHLIGHTER_COLORS.some((c) => c.value === '#facc15')).toBe(true);
    expect(PEN_COLORS.some((c) => c.value === '#0f172a')).toBe(true);
  });

  it('detecta colisiones de borrador con puntos cercanos al trazo', () => {
    const stroke: DrawingStroke = {
      id: 'stroke_1',
      tool: 'pen',
      color: '#0f172a',
      size: 4,
      opacity: 1,
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.5, y: 0.5 },
        { x: 0.9, y: 0.9 },
      ],
    };

    const width = 1000;
    const height = 1000;

    // Punto exactamente sobre la línea central (0.3, 0.3)
    const hitPoint = { x: 0.3, y: 0.3 };
    expect(isPointNearStroke(hitPoint, stroke, 10, width, height)).toBe(true);

    // Punto muy alejado (0.1, 0.9)
    const farPoint = { x: 0.1, y: 0.9 };
    expect(isPointNearStroke(farPoint, stroke, 10, width, height)).toBe(false);
  });

  it('detecta colisión con trazo de punto único', () => {
    const strokeDot: DrawingStroke = {
      id: 'dot_1',
      tool: 'highlighter',
      color: '#facc15',
      size: 16,
      opacity: 0.4,
      points: [{ x: 0.5, y: 0.5 }],
    };

    const width = 500;
    const height = 500;

    // Directamente en el punto
    expect(isPointNearStroke({ x: 0.5, y: 0.5 }, strokeDot, 5, width, height)).toBe(true);

    // Ligeramente al lado dentro de la tolerancia de tamaño 16/2 + 5 = 13px
    expect(isPointNearStroke({ x: 0.51, y: 0.51 }, strokeDot, 10, width, height)).toBe(true);

    // Lejos
    expect(isPointNearStroke({ x: 0.1, y: 0.1 }, strokeDot, 5, width, height)).toBe(false);
  });

  it('renderiza trazos de destacador con multiply y opacidad sobre canvas context', () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      globalCompositeOperation: '',
      globalAlpha: 1,
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      lineCap: '',
      lineJoin: '',
    } as unknown as CanvasRenderingContext2D;

    const strokes: DrawingStroke[] = [
      {
        id: 's_highlight',
        tool: 'highlighter',
        color: '#facc15',
        size: 18,
        opacity: 0.42,
        points: [
          { x: 0.1, y: 0.2 },
          { x: 0.2, y: 0.2 },
          { x: 0.3, y: 0.2 },
        ],
      },
    ];

    renderStrokesToCanvas(mockCtx, strokes, 800, 1000, 1);

    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.moveTo).toHaveBeenCalledWith(80, 200);
    expect(mockCtx.quadraticCurveTo).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
  });
});

