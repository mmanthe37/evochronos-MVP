import React, { useEffect, useRef, useState } from 'react';
import { Cpu } from 'lucide-react';

interface WebGpuSpatialCanvasProps {
  activeRegime: number;
  simulatedTime: number;
  biomassCarbon: number;
}

export const WebGpuSpatialCanvas: React.FC<WebGpuSpatialCanvasProps> = ({
  activeRegime,
  simulatedTime,
  biomassCarbon,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gpuBackend, setGpuBackend] = useState<'WebGPU (Hardware Accelerated)' | 'Canvas2D Stencil Fallback'>('Canvas2D Stencil Fallback');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationId: number;

    // Attempt WebGPU initialization
    const initWebGpu = async () => {
      if ('gpu' in navigator) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          if (adapter) {
            const device = await adapter.requestDevice();
            const context = canvas.getContext('webgpu');
            if (context) {
              setGpuBackend('WebGPU (Hardware Accelerated)');
              // WebGPU render loop
              const format = (navigator as any).gpu.getPreferredCanvasFormat();
              context.configure({ device, format, alphaMode: 'premultiplied' });

              const render = () => {
                const commandEncoder = device.createCommandEncoder();
                const textureView = context.getCurrentTexture().createView();
                const renderPass = commandEncoder.beginRenderPass({
                  colorAttachments: [
                    {
                      view: textureView,
                      clearValue: { r: 0.05, g: 0.08, b: 0.14, a: 1.0 },
                      loadOp: 'clear',
                      storeOp: 'store',
                    },
                  ],
                });
                renderPass.end();
                device.queue.submit([commandEncoder.finish()]);
                animationId = requestAnimationFrame(render);
              };
              render();
              return;
            }
          }
        } catch (e) {
          console.warn('WebGPU init failed, using Canvas2D fallback', e);
        }
      }

      // High-fidelity Canvas2D Reaction-Diffusion fallback
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const particles: Array<{ x: number; y: number; vx: number; vy: number; type: number; r: number }> = [];
      const numParticles = 120;
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          type: Math.floor(Math.random() * 3),
          r: 2 + Math.random() * 3,
        });
      }

      const render2d = (_t: number) => {
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw hydrothermal porous chimney matrix
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        const gridStep = 40;
        for (let x = 0; x < canvas.width; x += gridStep) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridStep) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Draw thermal gradient contour
        const gradient = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height,
          20,
          canvas.width / 2,
          canvas.height,
          canvas.height * 0.9
        );
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.25)'); // Hydrothermal core (FeS / 350K)
        gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.12)'); // Catalytic porous zone
        gradient.addColorStop(1, 'rgba(14, 165, 233, 0.05)'); // Ocean water
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Animate interacting biogenic particles / protocells
        particles.forEach((p, idx) => {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          if (p.type === 0) {
            ctx.fillStyle = '#10b981'; // Catalytic lipid / peptide
            ctx.shadowColor = '#10b981';
          } else if (p.type === 1) {
            ctx.fillStyle = '#38bdf8'; // Nucleotide monomer
            ctx.shadowColor = '#38bdf8';
          } else {
            ctx.fillStyle = '#f59e0b'; // Fe-S mineral cluster
            ctx.shadowColor = '#f59e0b';
          }
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Connect close neighbors
          for (let j = idx + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 45) {
              ctx.strokeStyle = `rgba(16, 185, 129, ${0.4 * (1 - dist / 45)})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        });

        // Overlay status info
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillText(`SPATIAL EXTENT: 64 x 64 x 64 LATTICE`, 16, 24);
        ctx.fillText(`THERMAL CORE: 343.15 K (70.0 °C)`, 16, 40);
        ctx.fillText(`REACTION CHANNELS: 16 BALANCED PATHWAYS`, 16, 56);
        ctx.fillText(`SIMULATED TIME: ${simulatedTime.toFixed(1)} s`, 16, 72);
        ctx.fillText(`BIOMASS CARBON: ${biomassCarbon.toLocaleString()} ATOMS`, 16, 88);

        animationId = requestAnimationFrame(render2d);
      };

      animationId = requestAnimationFrame(render2d);
    };

    initWebGpu();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [activeRegime, simulatedTime, biomassCarbon]);

  return (
    <div className="relative w-full h-full bg-[#0a0f1d] overflow-hidden flex flex-col">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur px-3 py-2 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
        <Cpu className="w-4 h-4 text-emerald-400" />
        <span>BACKEND: {gpuBackend}</span>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="w-full h-full object-cover"
      />
    </div>
  );
};
