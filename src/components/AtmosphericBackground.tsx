import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
  dx: number;
  dy: number;
  color: string;
  pulseSpeed: number;
  pulseOffset: number;
}

export const AtmosphericBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const colors = [
      'rgba(6, 182, 212, ',   // Cyan neon
      'rgba(59, 130, 246, ',  // Sky/Blue
      'rgba(245, 158, 11, ',  // Amber gold
      'rgba(217, 70, 239, ',  // Fuchsia
    ];

    // Initialize 42 floating particles
    const particleCount = Math.min(Math.floor((width * height) / 30000), 50);
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.8 + 0.8,
      baseAlpha: Math.random() * 0.35 + 0.15,
      alpha: Math.random() * 0.35 + 0.15,
      dx: (Math.random() - 0.5) * 0.35,
      dy: -Math.random() * 0.4 - 0.1, // gently float upwards
      color: colors[Math.floor(Math.random() * colors.length)],
      pulseSpeed: Math.random() * 0.02 + 0.008,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    let tick = 0;

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      // Render faint connection lines between nearby particles
      const maxDistance = 90;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const lineAlpha = (1 - dist / maxDistance) * 0.12;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(56, 189, 248, ${lineAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Render each particle
      particles.forEach(p => {
        // Move particle
        p.x += p.dx;
        p.y += p.dy;

        // Wrap edges smoothly
        if (p.y < -10) p.y = height + 10;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Subtle pulsing glow
        const currentAlpha = p.baseAlpha + Math.sin(tick * p.pulseSpeed + p.pulseOffset) * 0.12;
        const clampedAlpha = Math.max(0.05, Math.min(currentAlpha, 0.6));

        // Soft outer glow halo
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
        gradient.addColorStop(0, `${p.color}${clampedAlpha})`);
        gradient.addColorStop(1, `${p.color}0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core bright center
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.min(clampedAlpha * 1.5, 0.9)})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Slow-moving radial gradient mesh blobs */}
      <div
        className="absolute -top-[15%] -left-[10%] w-[650px] sm:w-[850px] h-[650px] sm:h-[850px] rounded-full blur-3xl opacity-30 animate-mesh-1 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.35) 0%, rgba(30, 58, 138, 0.2) 50%, transparent 70%)',
        }}
      />

      <div
        className="absolute top-[35%] -right-[15%] w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] rounded-full blur-3xl opacity-25 animate-mesh-2 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(88, 28, 135, 0.18) 50%, transparent 70%)',
        }}
      />

      <div
        className="absolute -bottom-[20%] left-[25%] w-[700px] sm:w-[900px] h-[700px] sm:h-[900px] rounded-full blur-3xl opacity-20 animate-mesh-3 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(180, 83, 9, 0.12) 50%, transparent 70%)',
        }}
      />

      {/* Subtle digital grid texture */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Interactive Micro-Particles Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-80" />

      {/* Atmospheric Vignette Frame */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(15,23,42,0.7)_100%)] pointer-events-none" />
    </div>
  );
};
