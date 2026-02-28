"use client";

import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  opacity: number;
  type: "skull" | "bone" | "lock" | "hash";
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  wobble: number;
  wobbleSpeed: number;
  wobblePhase: number;
}

const COLORS = [
  "#dc2626", "#ef4444", "#f87171", // reds
  "#71717a", "#a1a1aa", "#d4d4d8", // grays
  "#f59e0b", "#fbbf24",            // ambers (fire)
];

function drawSkull(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, opacity: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.06;

  const s = size * 0.5;

  // Skull shape
  ctx.beginPath();
  ctx.arc(0, -s * 0.15, s * 0.7, Math.PI, 0, false);
  ctx.quadraticCurveTo(s * 0.7, s * 0.5, s * 0.3, s * 0.65);
  ctx.lineTo(-s * 0.3, s * 0.65);
  ctx.quadraticCurveTo(-s * 0.7, s * 0.5, -s * 0.7, -s * 0.15);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#08080a";
  ctx.beginPath();
  ctx.ellipse(-s * 0.25, -s * 0.1, s * 0.15, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.25, -s * 0.1, s * 0.15, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.beginPath();
  ctx.moveTo(0, s * 0.15);
  ctx.lineTo(-s * 0.08, s * 0.28);
  ctx.lineTo(s * 0.08, s * 0.28);
  ctx.closePath();
  ctx.fill();

  // Teeth
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity * 0.5;
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(i * s * 0.12 - s * 0.04, s * 0.5, s * 0.08, s * 0.12);
  }

  ctx.restore();
}

function drawBone(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, opacity: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;

  const s = size * 0.3;
  // Shaft
  ctx.fillRect(-s * 1.2, -s * 0.12, s * 2.4, s * 0.24);
  // Knobs
  for (const dx of [-s * 1.2, s * 1.2]) {
    for (const dy of [-s * 0.2, s * 0.2]) {
      ctx.beginPath();
      ctx.arc(dx, dy, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawLock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, opacity: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.07;
  const s = size * 0.25;
  // Lock body
  ctx.fillRect(-s * 0.6, -s * 0.1, s * 1.2, s * 0.9);
  // Lock shackle
  ctx.beginPath();
  ctx.arc(0, -s * 0.1, s * 0.4, Math.PI, 0, false);
  ctx.stroke();
  // Keyhole
  ctx.fillStyle = "#08080a";
  ctx.beginPath();
  ctx.arc(0, s * 0.3, s * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHash(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, opacity: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = "round";
  const s = size * 0.3;
  // Hash symbol #
  ctx.beginPath();
  ctx.moveTo(-s * 0.3, -s * 0.6); ctx.lineTo(-s * 0.5, s * 0.6);
  ctx.moveTo(s * 0.3, -s * 0.6); ctx.lineTo(s * 0.1, s * 0.6);
  ctx.moveTo(-s * 0.7, -s * 0.2); ctx.lineTo(s * 0.7, -s * 0.2);
  ctx.moveTo(-s * 0.7, s * 0.2); ctx.lineTo(s * 0.7, s * 0.2);
  ctx.stroke();
  ctx.restore();
}

const DRAW_MAP = { skull: drawSkull, bone: drawBone, lock: drawLock, hash: drawHash };

interface SkullConfettiProps {
  active: boolean;
  duration?: number;
}

export default function SkullConfetti({ active, duration = 4000 }: SkullConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const startTime = useRef<number>(0);
  const isEmitting = useRef(false);

  const createParticle = useCallback((canvasWidth: number): Particle => {
    const types: Particle["type"][] = ["skull", "bone", "lock", "hash"];
    const type = types[Math.floor(Math.random() * types.length)];
    return {
      x: Math.random() * canvasWidth,
      y: -20 - Math.random() * 60,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 2 + 1,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.12,
      size: 14 + Math.random() * 18,
      opacity: 0.6 + Math.random() * 0.4,
      type,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 0,
      maxLife: 180 + Math.random() * 120,
      gravity: 0.04 + Math.random() * 0.03,
      wobble: Math.random() * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.03,
      wobblePhase: Math.random() * Math.PI * 2,
    };
  }, []);

  useEffect(() => {
    if (!active) {
      isEmitting.current = false;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas to full window
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    startTime.current = performance.now();
    isEmitting.current = true;
    particles.current = [];

    // Initial burst — 35 particles
    for (let i = 0; i < 35; i++) {
      const p = createParticle(canvas.width);
      p.y = -10 - Math.random() * 200;
      p.vy = 2 + Math.random() * 3;
      particles.current.push(p);
    }

    const animate = (now: number) => {
      const elapsed = now - startTime.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Keep emitting for duration
      if (isEmitting.current && elapsed < duration && Math.random() > 0.5) {
        particles.current.push(createParticle(canvas.width));
      }

      if (elapsed > duration) {
        isEmitting.current = false;
      }

      // Update & draw
      particles.current = particles.current.filter((p) => {
        p.life++;
        p.x += p.vx + Math.sin(p.wobblePhase + p.life * p.wobbleSpeed) * p.wobble;
        p.vy += p.gravity;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Fade out in last 30% of life
        const lifePct = p.life / p.maxLife;
        const alpha = lifePct > 0.7 ? p.opacity * (1 - (lifePct - 0.7) / 0.3) : p.opacity;

        if (p.life > p.maxLife || p.y > canvas.height + 50) return false;

        DRAW_MAP[p.type](ctx, p.x, p.y, p.size, p.rotation, alpha, p.color);
        return true;
      });

      if (particles.current.length > 0 || isEmitting.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [active, duration, createParticle]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 pointer-events-none"
      style={{ display: active ? "block" : "none" }}
    />
  );
}
