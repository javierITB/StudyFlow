import { DrawingStroke, StrokePoint } from '../types/studyflow';

export const HIGHLIGHTER_COLORS = [
  { label: 'Amarillo', value: '#facc15' },
  { label: 'Verde menta', value: '#4ade80' },
  { label: 'Celeste', value: '#38bdf8' },
  { label: 'Rosa pastel', value: '#f472b6' },
  { label: 'Lavanda', value: '#c084fc' },
  { label: 'Durazno', value: '#fb923c' },
];

export const PEN_COLORS = [
  { label: 'Carbón', value: '#0f172a' },
  { label: 'Azul', value: '#1d4ed8' },
  { label: 'Rojo', value: '#dc2626' },
  { label: 'Verde', value: '#16a34a' },
  { label: 'Púrpura', value: '#7c3aed' },
  { label: 'Blanco', value: '#f8fafc' },
];

/**
 * Dibuja un conjunto de trazos vectoriales sobre un canvas 2D
 */
export function renderStrokesToCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: DrawingStroke[],
  width: number,
  height: number,
  dpr: number = 1
): void {
  ctx.save();
  ctx.scale(dpr, dpr);

  for (const stroke of strokes) {
    if (!stroke.points || stroke.points.length === 0) continue;

    ctx.save();

    if (stroke.tool === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = stroke.opacity || 0.42;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = stroke.opacity || 1.0;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    const points = stroke.points;
    if (points.length === 1) {
      // Punto único
      const p = points[0];
      const px = p.x * width;
      const py = p.y * height;
      ctx.beginPath();
      ctx.arc(px, py, stroke.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
    } else {
      ctx.beginPath();
      const firstX = points[0].x * width;
      const firstY = points[0].y * height;
      ctx.moveTo(firstX, firstY);

      if (points.length === 2) {
        ctx.lineTo(points[1].x * width, points[1].y * height);
      } else {
        // Suavizado por punto medio con curvas cuadráticas
        for (let i = 1; i < points.length - 1; i++) {
          const currentX = points[i].x * width;
          const currentY = points[i].y * height;
          const nextX = points[i + 1].x * width;
          const nextY = points[i + 1].y * height;
          const midX = (currentX + nextX) / 2;
          const midY = (currentY + nextY) / 2;
          ctx.quadraticCurveTo(currentX, currentY, midX, midY);
        }
        const last = points[points.length - 1];
        ctx.lineTo(last.x * width, last.y * height);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Distancia euclidiana mínima entre un punto (px, py) y un segmento (x1, y1)-(x2, y2)
 */
function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

/**
 * Determina si una coordenada de borrador colisiona con un trazo
 */
export function isPointNearStroke(
  pointRatio: StrokePoint,
  stroke: DrawingStroke,
  tolerancePx: number,
  width: number,
  height: number
): boolean {
  if (!stroke.points || stroke.points.length === 0) return false;
  const px = pointRatio.x * width;
  const py = pointRatio.y * height;
  const hitDistance = (stroke.size / 2) + tolerancePx;

  if (stroke.points.length === 1) {
    const sx = stroke.points[0].x * width;
    const sy = stroke.points[0].y * height;
    return Math.hypot(px - sx, py - sy) <= hitDistance;
  }

  for (let i = 0; i < stroke.points.length - 1; i++) {
    const x1 = stroke.points[i].x * width;
    const y1 = stroke.points[i].y * height;
    const x2 = stroke.points[i + 1].x * width;
    const y2 = stroke.points[i + 1].y * height;

    if (distToSegment(px, py, x1, y1, x2, y2) <= hitDistance) {
      return true;
    }
  }

  return false;
}

