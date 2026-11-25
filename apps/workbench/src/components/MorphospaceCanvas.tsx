import React, { useEffect, useRef } from 'react';
import { Compass } from 'lucide-react';

interface MorphospaceCanvasProps {
  traitMean: [number, number];
  optimum: [number, number];
}

export const MorphospaceCanvas: React.FC<MorphospaceCanvasProps> = ({ traitMean, optimum }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const scale = 80;

    // Draw adaptive landscape contours (Gaussian fitness peaks around optimum)
    const optX = cx + (optimum[0] - 1.5) * scale;
    const optY = cy - (optimum[1] - 1.5) * scale;

    for (let r = 20; r <= 200; r += 30) {
      ctx.strokeStyle = `rgba(16, 185, 129, ${0.4 * (1 - r / 220)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(optX, optY, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw Optimum Marker (Theta)
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(optX, optY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6ee7b7';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(`θ OPTIMUM [${optimum[0].toFixed(1)}, ${optimum[1].toFixed(1)}]`, optX + 12, optY + 4);

    // Draw Population Current Phenotype (z_bar)
    const curX = cx + (traitMean[0] - 1.5) * scale;
    const curY = cy - (traitMean[1] - 1.5) * scale;

    // Draw G-matrix Covariance Ellipse around current mean
    ctx.save();
    ctx.translate(curX, curY);
    ctx.rotate(-0.35); // Genetic correlation
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 35, 18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Draw Evolutionary Trajectory vector (Delta z = G * beta)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(curX, curY);
    ctx.lineTo(curX + (optX - curX) * 0.4, curY + (optY - curY) * 0.4);
    ctx.stroke();

    // Population mean point
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(curX, curY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`z̄ [${traitMean[0].toFixed(2)}, ${traitMean[1].toFixed(2)}]`, curX + 12, curY + 4);

    // Axes and labels
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, cy);
    ctx.lineTo(canvas.width - 40, cy);
    ctx.moveTo(cx, 40);
    ctx.lineTo(cx, canvas.height - 40);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.fillText('TRAIT 1: LOG BODY SIZE (g)', canvas.width - 200, cy - 8);
    ctx.fillText('TRAIT 2: METABOLIC EFFICIENCY', cx + 8, 55);
  }, [traitMean, optimum]);

  return (
    <div className="relative w-full h-full bg-[#0a0f1d] flex flex-col">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3 py-2 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
        <Compass className="w-4 h-4 text-amber-400" />
        <span>LANDE PHENOTYPIC SELECTION LANDSCAPE (Δz̄ = G β)</span>
      </div>
      <canvas ref={canvasRef} width={800} height={500} className="w-full h-full object-cover" />
    </div>
  );
};
