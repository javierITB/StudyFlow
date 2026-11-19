import React, { useEffect, useRef } from 'react';
import { DrawingStroke, DrawingToolType, StrokePoint } from '../../types/studyflow';
import { isPointNearStroke, renderStrokesToCanvas } from '../../lib/strokeEngine';

interface PdfDrawingCanvasProps {
  width: number;
  height: number;
  strokes: DrawingStroke[];
  onStrokesChange: (strokes: DrawingStroke[]) => void;
  isDrawingMode: boolean;
  activeTool: DrawingToolType;
  color: string;
  strokeSize: number;
}

export const PdfDrawingCanvas: React.FC<PdfDrawingCanvasProps> = ({
  width,
  height,
  strokes,
  onStrokesChange,
  isDrawingMode,
  activeTool,
  color,
  strokeSize,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const currentPointsRef = useRef<StrokePoint[]>([]);

  // Redibujar trazos guardados y trazo en progreso
  const redraw = (currentPoints: StrokePoint[] = []) => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    // Configurar dimensiones reales y lógicas del canvas
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar trazos existentes
    renderStrokesToCanvas(ctx, strokes, width, height, dpr);

    // Dibujar trazo activo en curso
    if (currentPoints.length > 0 && activeTool !== 'eraser') {
      const activeStroke: DrawingStroke = {
        id: 'active_stroke',
        tool: activeTool,
        color,
        size: strokeSize,
        opacity: activeTool === 'highlighter' ? 0.42 : 1.0,
        points: currentPoints,
      };
      renderStrokesToCanvas(ctx, [activeStroke], width, height, dpr);
    }
  };

  useEffect(() => {
    redraw();
  }, [width, height, strokes, isDrawingMode]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): StrokePoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    return {
      x: Math.max(0, Math.min(1, x / rect.width)),
      y: Math.max(0, Math.min(1, y / rect.height)),
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // Ignorar si no soporta captura
    }

    isPointerDownRef.current = true;
    const pt = getCanvasPoint(e);
    if (!pt) return;

    if (activeTool === 'eraser') {
      // Borrar trazos que colisionen con este punto inicial
      const remaining = strokes.filter(
        (s) => !isPointNearStroke(pt, s, 14, width, height)
      );
      if (remaining.length !== strokes.length) {
        onStrokesChange(remaining);
      }
    } else {
      currentPointsRef.current = [pt];
      redraw(currentPointsRef.current);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !isPointerDownRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const pt = getCanvasPoint(e);
    if (!pt) return;

    if (activeTool === 'eraser') {
      const remaining = strokes.filter(
        (s) => !isPointNearStroke(pt, s, 14, width, height)
      );
      if (remaining.length !== strokes.length) {
        onStrokesChange(remaining);
      }
    } else {
      currentPointsRef.current.push(pt);
      redraw(currentPointsRef.current);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !isPointerDownRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // Ignorar si no soporta captura
    }

    isPointerDownRef.current = false;

    if (activeTool !== 'eraser' && currentPointsRef.current.length > 0) {
      const newStroke: DrawingStroke = {
        id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tool: activeTool,
        color,
        size: strokeSize,
        opacity: activeTool === 'highlighter' ? 0.42 : 1.0,
        points: [...currentPointsRef.current],
      };
      onStrokesChange([...strokes, newStroke]);
    }

    currentPointsRef.current = [];
    redraw();
  };

  const handlePointerCancel = () => {
    isPointerDownRef.current = false;
    currentPointsRef.current = [];
    redraw();
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className={`absolute inset-0 transition-opacity ${isDrawingMode
          ? 'z-30 pointer-events-auto touch-none cursor-crosshair'
          : 'z-10 pointer-events-none'
        }`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
};