'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Check, RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  onCancel?: () => void;
  width?: number;
  height?: number;
  className?: string;
  disabled?: boolean;
}

export function SignaturePad({
  onSave,
  onCancel,
  width = 400,
  height = 200,
  className = '',
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Set drawing styles
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  const getCoordinates = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ('touches' in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      const point = getCoordinates(e);
      if (!point) return;

      setIsDrawing(true);
      setLastPoint(point);
    },
    [disabled, getCoordinates]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled) return;
      e.preventDefault();

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      const point = getCoordinates(e);
      if (!point || !lastPoint) return;

      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      setLastPoint(point);
      setHasSignature(true);
    },
    [isDrawing, disabled, lastPoint, getCoordinates]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    setHasSignature(false);
  }, [width, height]);

  const saveSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    // Export as PNG base64
    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  }, [hasSignature, onSave]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className={`touch-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-crosshair'}`}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-400 text-sm">Sign here</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearCanvas}
          disabled={disabled || !hasSignature}
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Clear
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={disabled}
          >
            <Eraser className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={saveSignature}
          disabled={disabled || !hasSignature}
          className="bg-green-600 hover:bg-green-700"
        >
          <Check className="h-4 w-4 mr-1" />
          Confirm Signature
        </Button>
      </div>
    </div>
  );
}
