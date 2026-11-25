import React, { useEffect, useRef, useState } from 'react';
import { philox4x32 } from '../engine/prng';
import { REGIME_LABELS } from '../engine/presets';
import { ScenarioParameters, SimulationState } from '../engine/types';
import { EpistemicBadge } from './EpistemicBadge';

interface SimulationCanvasProps {
  state: SimulationState;
  params: ScenarioParameters;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ state, params }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [probe, setProbe] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear obsidian instrument background
    ctx.fillStyle = '#080B12';
    ctx.fillRect(0, 0, w, h);

    // Subtle scientific coordinate grid
    ctx.strokeStyle = '#141B29';
    ctx.lineWidth = 1;
    const grid = 40;
    for (let x = grid; x < w; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = grid; y < h; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (state.regime === 1) {
      drawPrebioticNetwork(ctx, w, h, state, params);
    } else if (state.regime === 2) {
      drawProtocellVesicles(ctx, w, h, state, params);
    } else if (state.regime === 3 || state.regime === 4) {
      drawMetabolicCompartments(ctx, w, h, state, params);
    } else if (state.regime === 5) {
      drawTuringField(ctx, w, h, state, params);
    } else {
      drawLandeMorphospace(ctx, w, h, state, params);
    }

    // Subtle frame axis ticks
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }, [state, params]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) / rect.width) * 100;
    const normY = (1 - (e.clientY - rect.top) / rect.height) * 100;
    setProbe({ x: normX, y: normY });
  };

  const regimeMeta = REGIME_LABELS[state.regime];

  return (
    <div className="relative flex-1 min-h-[280px] bg-[#080B12] border border-slate-800 rounded overflow-hidden flex flex-col">
      {/* Compact Instrument Header Overlay */}
      <div className="px-3 py-2 bg-[#0F1420]/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100">{regimeMeta.full}</span>
          <span className="text-slate-500 font-mono text-[11px]">{regimeMeta.timescale}</span>
        </div>
        <div className="flex items-center gap-2">
          <EpistemicBadge
            tier={
              state.regime === 1
                ? 'ASSUMPTION'
                : state.regime === 2 || state.regime === 5
                ? 'INTERPRETATION'
                : state.regime === 6
                ? 'UNCERTAINTY'
                : 'ESTIMATE'
            }
          />
          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
            {probe ? `PROBE (${probe.x.toFixed(1)}, ${probe.y.toFixed(1)})` : 'HOVER TO PROBE'}
          </span>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          width={860}
          height={420}
          data-testid="simulation-canvas"
          data-regime={state.regime}
          data-tick={state.tick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setProbe(null)}
          className="w-full h-full object-contain cursor-crosshair block"
        />
      </div>
    </div>
  );
};

function drawPrebioticNetwork(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: SimulationState,
  params: ScenarioParameters
) {
  const isVent = params.environmentMode === 'alkaline_vent';

  // Thermal / boundary gradient
  const grad = isVent
    ? ctx.createRadialGradient(w * 0.5, h * 0.96, 25, w * 0.5, h * 0.9, h * 0.95)
    : ctx.createLinearGradient(0, 0, 0, h);

  if (isVent) {
    grad.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
    grad.addColorStop(0.45, 'rgba(6, 182, 212, 0.10)');
    grad.addColorStop(1, 'rgba(8, 11, 18, 0)');
  } else {
    // Wet-dry evaporative desiccation phase wave
    const dryPhase = 0.5 + 0.5 * Math.sin(state.tick * 0.35);
    grad.addColorStop(0, `rgba(245, 158, 11, ${0.06 + dryPhase * 0.12})`);
    grad.addColorStop(0.55, 'rgba(14, 165, 233, 0.08)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.14)');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Deterministic particle positions from Philox(seed, i + tick)
  const count = Math.min(110, 32 + state.species.monomer + state.species.catalyst * 2 + state.species.lipid);
  const pts: Array<{ x: number; y: number; kind: number; r: number }> = [];

  for (let i = 0; i < count; i++) {
    const [r0, r1, r2, r3] = philox4x32(params.seed, i + 100, 1);
    const baseX = (r0 / 4294967296) * (w - 80) + 40;
    const baseY = (r1 / 4294967296) * (h - 70) + 35;
    const angle = (r2 / 4294967296) * Math.PI * 2 + state.tick * 0.08 * ((r3 % 3) + 1);
    const orbit = 12 + (r3 % 28);
    const x = Math.max(24, Math.min(w - 24, baseX + Math.cos(angle) * orbit));
    const y = Math.max(24, Math.min(h - 24, baseY + Math.sin(angle) * orbit));

    let kind = 0; // monomer/formate
    if (i < Math.min(28, state.species.catalyst + 3)) kind = 1; // FeS / catalyst polymer
    else if (i < Math.min(54, state.species.catalyst + state.species.lipid + 5)) kind = 2; // lipid amphiphile

    pts.push({ x, y, kind, r: kind === 1 ? 5.2 : kind === 2 ? 3.8 : 2.8 });
  }

  // Draw RAF autocatalytic edges between catalysts & nearby monomers
  const maxDist = 55 + state.rafClosureRatio * 48;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].kind !== 1) continue;
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      const d = Math.hypot(dx, dy);
      if (d < maxDist) {
        ctx.strokeStyle =
          pts[j].kind === 1
            ? `rgba(16, 185, 129, ${0.55 * (1 - d / maxDist)})`
            : `rgba(6, 182, 212, ${0.32 * (1 - d / maxDist)})`;
        ctx.lineWidth = pts[j].kind === 1 ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[j].x, pts[j].y);
        ctx.stroke();
      }
    }
  }

  // Draw species nodes
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.kind === 1 ? '#10B981' : p.kind === 2 ? '#F59E0B' : '#38BDF8';
    ctx.fill();
  }

  // Telemetry corner overlay
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillText(
    `MODE: ${isVent ? 'ALKALINE VENT (FeS CATALYSIS)' : 'WET-DRY EVAPORATIVE CYCLING'}  |  T = ${params.temperatureK} K`,
    16,
    24
  );
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(
    `DELTA G: ${state.gibbsFreeEnergyKJ.toFixed(2)} kJ/mol  |  RAF CLOSURE: ${(state.rafClosureRatio * 100).toFixed(1)}%  |  LIPIDS: ${state.species.lipid}`,
    16,
    42
  );

  // Legend bottom-left
  const legendY = h - 16;
  const legendItems = [
    { color: '#10B981', label: `Catalysts (${state.species.catalyst})` },
    { color: '#F59E0B', label: `Lipids (${state.species.lipid})` },
    { color: '#38BDF8', label: `Monomers (${state.species.monomer})` },
  ];
  let lx = 16;
  for (const item of legendItems) {
    ctx.fillStyle = item.color;
    ctx.fillRect(lx, legendY - 8, 8, 8);
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(item.label, lx + 13, legendY);
    lx += 145;
  }
}

function drawProtocellVesicles(
  ctx: CanvasRenderingContext2D,
  w: number,
  _h: number,
  state: SimulationState,
  params: ScenarioParameters
) {
  const numVesicles = Math.min(36, Math.max(3, state.vesicleCount));
  const isCatastrophe = state.eigenMargin < 1.0;

  for (let i = 0; i < numVesicles; i++) {
    const [r0, r1, r2] = philox4x32(params.seed, i + 500, 2);
    const cols = 6;
    const row = Math.floor(i / cols);
    const col = i % cols;
    const jitterX = ((r0 / 4294967296) - 0.5) * 34 + Math.cos(state.tick * 0.1 + i) * 7;
    const jitterY = ((r1 / 4294967296) - 0.5) * 24 + Math.sin(state.tick * 0.09 + i) * 6;
    const cx = 95 + col * ((w - 190) / (cols - 1)) + jitterX;
    const cy = 92 + (row % 4) * 76 + jitterY;
    const radius = 20 + (r2 % 10);

    // Lipid bilayer membrane
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = isCatastrophe ? 'rgba(244, 63, 94, 0.08)' : 'rgba(6, 182, 212, 0.09)';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = isCatastrophe ? 'rgba(244, 63, 94, 0.65)' : 'rgba(6, 182, 212, 0.75)';
    if (isCatastrophe) ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Internal RNA replicator fidelity ring
    const fidelityArc = Math.max(0.05, state.masterSequenceFraction) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.52, -Math.PI / 2, -Math.PI / 2 + fidelityArc);
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = state.masterSequenceFraction > 0.35 ? '#10B981' : '#F43F5E';
    ctx.stroke();
  }

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillText(
    `EIGEN MARGIN (L_max / L): ${state.eigenMargin.toFixed(2)}x  |  MASTER SEQUENCE: ${(state.masterSequenceFraction * 100).toFixed(1)}%  |  VESICLES: ${state.vesicleCount}`,
    16,
    24
  );
  ctx.fillStyle = isCatastrophe ? '#FB7185' : '#34D399';
  ctx.fillText(
    isCatastrophe
      ? 'ERROR CATASTROPHE REGIME: 1 - q > ln(sigma_0) / L — MASTER SEQUENCE MELTING'
      : 'QUASISPECIES COHERENT: COPYING FIDELITY ABOVE EIGEN THRESHOLD',
    16,
    42
  );
}

function drawMetabolicCompartments(
  ctx: CanvasRenderingContext2D,
  _w: number,
  _h: number,
  state: SimulationState,
  params: ScenarioParameters
) {
  const isEuk = state.regime === 4;

  const boxes = isEuk
    ? [
        { x: 34, y: 96, bw: 192, bh: 230, title: 'ABIOTIC SUBSTRATE', accent: '#38BDF8', metric: `${(Number(state.pools.abiotic.C) / 1000).toFixed(0)}k C`, sub: 'Dissolved Pool' },
        { x: 334, y: 96, bw: 192, bh: 230, title: 'HOST CYTOSOL', accent: '#10B981', metric: `Clades: ${state.cladeCount}`, sub: 'Glycolytic Block' },
        { x: 634, y: 96, bw: 192, bh: 230, title: 'SYMBIONT / MITO', accent: '#F59E0B', metric: `${state.atpPerGene.toFixed(0)}x ATP/gene`, sub: 'OxPhos / Syntrophy' },
      ]
    : [
        { x: 76, y: 96, bw: 260, bh: 230, title: 'DISSOLVED RESERVOIR', accent: '#38BDF8', metric: `K_m = ${(params.monodKm / 1000).toFixed(0)}k`, sub: 'Closed Abiotic Pool' },
        { x: 524, y: 96, bw: 260, bh: 230, title: 'PROKARYOTE dFBA GUILD', accent: '#10B981', metric: `mu = ${state.prokaryoteGrowthRate.toFixed(3)} /hr`, sub: 'Nullspace S*v = 0' },
      ];

  for (const b of boxes) {
    ctx.fillStyle = '#0F1420';
    ctx.fillRect(b.x, b.y, b.bw, b.bh);
    ctx.strokeStyle = b.accent;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x, b.y, b.bw, b.bh);

    ctx.fillStyle = b.accent;
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(b.title, b.x + 14, b.y + 26);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText(b.metric, b.x + 14, b.y + 56);

    ctx.fillStyle = '#64748B';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(b.sub, b.x + 14, b.y + 78);
  }

  const drawArrow = (x1: number, y1: number, x2: number, y2: number, label: string, color: string) => {
    const dir = x2 > x1 ? 1 : -1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Arrowhead
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - dir * 7, y2 - 4);
    ctx.lineTo(x2 - dir * 7, y2 + 4);
    ctx.closePath();
    ctx.fill();

    // Flux pulse dot
    const phase = (state.tick * 0.14) % 1;
    const px = x1 + (x2 - x1) * phase;
    const py = y1 + (y2 - y1) * phase;
    ctx.beginPath();
    ctx.arc(px, py, 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, (x1 + x2) / 2, y1 - 10);
    ctx.textAlign = 'left';
  };

  if (isEuk) {
    drawArrow(228, 195, 332, 195, 'Monod C/N', '#38BDF8');
    drawArrow(528, 178, 632, 178, 'Pyruvate', '#10B981');
    drawArrow(632, 244, 528, 244, 'ATP / H2 Pull', '#F59E0B');
  } else {
    drawArrow(338, 188, 522, 188, 'Monod Uptake (S*v=0)', '#38BDF8');
    drawArrow(522, 248, 338, 248, 'Detritus / CO2 Cycle', '#94A3B8');
  }

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillText(
    isEuk
      ? `SYNTROPHIC H2 PULL: ${params.syntrophyDeltaG.toFixed(1)} kJ/mol  |  ATP EXPANSION: ${state.atpPerGene.toFixed(0)}x / GENE  |  ZERO LOOP VIOLATIONS`
      : `MONOD UPTAKE GROWTH: ${state.prokaryoteGrowthRate.toFixed(3)} /hr  |  BIOMASS C: ${Number(state.pools.biomass.C).toLocaleString()} ATOMS`,
    16,
    24
  );
}

function drawTuringField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: SimulationState,
  params: ScenarioParameters
) {
  const cols = 38;
  const rows = 18;
  const padX = 56;
  const padY = 64;
  const cellW = (w - padX * 2) / cols;
  const cellH = (h - padY - 36) / rows;
  const freq = state.turingWavelengthUm > 0 ? Math.max(0.25, 9.5 / state.turingWavelengthUm) : 0.1;
  const amp = state.turingPatternEnergy;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wave =
        Math.sin(c * freq + state.tick * 0.06) * Math.cos(r * freq * 1.1 - state.tick * 0.04) +
        0.5 * Math.cos((c + r) * freq * 0.7);
      const val = Math.max(0, Math.min(1, 0.5 + wave * 0.42 * amp));
      // Calibrated Cyan-to-Amber laboratory heatmap
      const red = Math.round(14 + val * 231);
      const green = Math.round(28 + (1 - Math.abs(val - 0.5) * 1.4) * 155);
      const blue = Math.round(45 + (1 - val) * 175);
      ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
      ctx.fillRect(padX + c * cellW, padY + r * cellH, cellW - 1, cellH - 1);
    }
  }

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillText(
    `TURING D_v / D_u: ${params.turingDiffusionRatio}x  |  WAVELENGTH: ${state.turingWavelengthUm > 0 ? `${state.turingWavelengthUm.toFixed(1)} um` : 'HOMOGENEOUS'}  |  MICHOD SYNERGY: ${state.michodConvexity.toFixed(2)}x`,
    16,
    24
  );
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(
    state.turingPatternEnergy >= 0.35
      ? 'STANDING MORPHOGEN BIFURCATION ACTIVE (GERM-SOMA SPECIALIZATION)'
      : 'SUB-CRITICAL DIFFUSION RATIO: HOMOGENEOUS TISSUE FIELD',
    16,
    42
  );
}

function drawLandeMorphospace(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: SimulationState,
  params: ScenarioParameters
) {
  const cx = w * 0.44;
  const cy = h * 0.54;
  const scale = 95;

  const toScreen = (z: [number, number]): [number, number] => [
    cx + (z[0] - 1.2) * scale,
    cy - (z[1] - 1.0) * scale,
  ];

  // Axes
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, cy);
  ctx.lineTo(w - 48, cy);
  ctx.moveTo(cx, 54);
  ctx.lineTo(cx, h - 32);
  ctx.stroke();

  // Adaptive landscape contours around optimum
  const [optX, optY] = toScreen(state.traitOptimum);
  for (let rad = 24; rad <= 190; rad += 28) {
    ctx.strokeStyle = `rgba(16, 185, 129, ${0.42 * (1 - rad / 210)})`;
    ctx.beginPath();
    ctx.arc(optX, optY, rad, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Historical trait trajectory trail
  if (state.history.length > 1) {
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    state.history.forEach((pt, idx) => {
      const [px, py] = toScreen(pt.traitMean);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  // Optimum marker
  ctx.fillStyle = '#10B981';
  ctx.beginPath();
  ctx.arc(optX, optY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6EE7B7';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillText(`OPTIMUM theta [${state.traitOptimum[0].toFixed(1)}, ${state.traitOptimum[1].toFixed(1)}]`, optX + 10, optY - 8);

  // Current mean + G-matrix covariance ellipse
  const [curX, curY] = toScreen(state.traitMean);
  ctx.save();
  ctx.translate(curX, curY);
  const tilt = -Math.sign(params.landeG12) * 0.785;
  ctx.rotate(params.landeG12 === 0 ? 0 : tilt);
  const major = 28 * Math.sqrt(1 + Math.abs(params.landeG12));
  const minor = 28 * Math.sqrt(Math.max(0.12, 1 - Math.abs(params.landeG12)));
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, major, minor, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Direct selection beta vector (dashed) vs Deflected G*beta vector (solid amber)
  const bLen = 58;
  const bNorm = Math.hypot(params.landeBeta1, params.landeBeta2) || 1;
  ctx.strokeStyle = '#94A3B8';
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(curX, curY);
  ctx.lineTo(curX + (params.landeBeta1 / bNorm) * bLen, curY - (params.landeBeta2 / bNorm) * bLen);
  ctx.stroke();
  ctx.setLineDash([]);

  const dz1 = params.landeBeta1 + params.landeG12 * params.landeBeta2;
  const dz2 = params.landeG12 * params.landeBeta1 + params.landeBeta2;
  const dzNorm = Math.hypot(dz1, dz2) || 1;
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(curX, curY);
  ctx.lineTo(curX + (dz1 / dzNorm) * bLen, curY - (dz2 / dzNorm) * bLen);
  ctx.stroke();

  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(curX, curY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FCD34D';
  ctx.fillText(`z_bar [${state.traitMean[0].toFixed(2)}, ${state.traitMean[1].toFixed(2)}]`, curX + 10, curY + 14);

  ctx.fillStyle = '#CBD5E1';
  ctx.fillText(
    `LANDE G_12: ${params.landeG12.toFixed(2)}  |  DEFLECTION: ${state.landeDeflectionDeg.toFixed(1)} deg  |  ORR BDMI P_iso: ${(state.speciationProb * 100).toFixed(1)}% (k=${state.substitutionsK})`,
    16,
    24
  );
  ctx.fillStyle = '#64748B';
  ctx.fillText('TRAIT 1: LOG BODY MASS', w - 185, cy - 8);
  ctx.fillText('TRAIT 2: METABOLIC EFF.', cx + 8, 66);
}
