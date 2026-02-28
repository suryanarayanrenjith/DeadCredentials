"use client";

import { useEffect, useRef } from "react";

/**
 * Cryptography-themed canvas background:
 * - Falling hex/binary streams (matrix-style in red/crimson)
 * - Drifting lock & key glyphs
 * - Hash-character particles that dissolve
 * - Faint encrypted cipher text scrolling
 * - Subtle connection mesh between nodes
 */

const CRYPTO_CHARS = "0123456789ABCDEFabcdef";
const BINARY = "01";
const GLYPHS = ["\u2620", "\u26BF", "\u2318", "\u2021", "\u00A7", "\u00B6", "\u2020", "#", "$", "%", "&", "@", "!", "?", "*", "^", "~"];
const HEX_PREFIX = "0x";
const HASH_SNIPPETS = [
  "sha256:", "md5:", "bcrypt:", "AES-", "RSA-", "HMAC-",
  "salt:", "iv:", "nonce:", "pbkdf2:", "argon2:", "scrypt:",
];

interface Stream {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  length: number;
  opacity: number;
  fontSize: number;
  type: "hex" | "binary" | "hash";
  headBright: number;
}

interface FloatingGlyph {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  size: number;
  opacity: number;
  rotation: number;
  rotSpeed: number;
  fadeDir: number;
}

interface CipherNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulsePhase: number;
  pulseSpeed: number;
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // ── Streams (falling hex/binary columns) ──
    const STREAM_COUNT = Math.min(Math.floor(width / 50), 30);
    const streams: Stream[] = [];

    function makeStream(forceTop = false): Stream {
      const streamType = Math.random() < 0.3 ? "binary" : Math.random() < 0.2 ? "hash" : "hex";
      const len = 6 + Math.floor(Math.random() * 18);
      const chars: string[] = [];
      for (let i = 0; i < len; i++) {
        if (streamType === "binary") {
          chars.push(BINARY[Math.floor(Math.random() * 2)]);
        } else if (streamType === "hash") {
          const snippet = HASH_SNIPPETS[Math.floor(Math.random() * HASH_SNIPPETS.length)];
          chars.push(...snippet.split(""));
          break;
        } else {
          if (i === 0 && Math.random() < 0.3) {
            chars.push(HEX_PREFIX[0], HEX_PREFIX[1]);
          } else {
            chars.push(CRYPTO_CHARS[Math.floor(Math.random() * CRYPTO_CHARS.length)]);
          }
        }
      }
      return {
        x: Math.random() * width,
        y: forceTop ? -Math.random() * height * 0.5 : Math.random() * height,
        speed: 0.3 + Math.random() * 0.7,
        chars,
        length: chars.length,
        opacity: 0.12 + Math.random() * 0.2,
        fontSize: 9 + Math.floor(Math.random() * 4),
        type: streamType,
        headBright: 0.6 + Math.random() * 0.4,
      };
    }

    for (let i = 0; i < STREAM_COUNT; i++) {
      streams.push(makeStream());
    }

    // ── Floating glyphs (locks, keys, symbols) ──
    const GLYPH_COUNT = Math.min(Math.floor((width * height) / 130000), 10);
    const glyphs: FloatingGlyph[] = [];
    for (let i = 0; i < GLYPH_COUNT; i++) {
      glyphs.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        size: 14 + Math.random() * 10,
        opacity: 0.06 + Math.random() * 0.12,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.004,
        fadeDir: Math.random() < 0.5 ? 1 : -1,
      });
    }

    // ── Cipher nodes (connection mesh) ──
    const NODE_COUNT = Math.min(Math.floor((width * height) / 55000), 22);
    const CONNECTION_DIST = 150;
    const nodes: CipherNode[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: 1 + Math.random() * 1.5,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.008 + Math.random() * 0.012,
      });
    }

    let time = 0;

    function draw() {
      time++;
      ctx!.clearRect(0, 0, width, height);

      // ─── Draw streams ───
      for (const stream of streams) {
        stream.y += stream.speed;

        // Randomly mutate characters for a "decrypting" feel
        if (time % 6 === 0 && Math.random() < 0.3) {
          const idx = Math.floor(Math.random() * stream.chars.length);
          if (stream.type === "binary") {
            stream.chars[idx] = BINARY[Math.floor(Math.random() * 2)];
          } else if (stream.type === "hex") {
            stream.chars[idx] = CRYPTO_CHARS[Math.floor(Math.random() * CRYPTO_CHARS.length)];
          }
        }

        for (let i = 0; i < stream.chars.length; i++) {
          const charY = stream.y + i * (stream.fontSize + 2);
          if (charY < -20 || charY > height + 20) continue;

          const fadeRatio = 1 - i / stream.chars.length;
          const isHead = i === 0;
          const alpha = isHead
            ? stream.opacity * stream.headBright * 2.5
            : stream.opacity * fadeRatio;

          ctx!.font = `${stream.fontSize}px 'Courier New', monospace`;
          ctx!.fillStyle = isHead
            ? `rgba(248, 113, 113, ${Math.min(alpha, 0.6)})`
            : `rgba(220, 38, 38, ${Math.min(alpha, 0.35)})`;
          ctx!.fillText(stream.chars[i], stream.x, charY);
        }

        const totalHeight = stream.chars.length * (stream.fontSize + 2);
        if (stream.y > height + totalHeight) {
          Object.assign(stream, makeStream(true));
        }
      }

      // ─── Draw floating glyphs ───
      for (const g of glyphs) {
        g.x += g.vx;
        g.y += g.vy;
        g.rotation += g.rotSpeed;

        g.opacity += g.fadeDir * 0.0003;
        if (g.opacity > 0.18) g.fadeDir = -1;
        if (g.opacity < 0.04) g.fadeDir = 1;

        if (g.x < -30) g.x = width + 30;
        if (g.x > width + 30) g.x = -30;
        if (g.y < -30) g.y = height + 30;
        if (g.y > height + 30) g.y = -30;

        ctx!.save();
        ctx!.translate(g.x, g.y);
        ctx!.rotate(g.rotation);
        ctx!.font = `${g.size}px 'Courier New', monospace`;
        ctx!.fillStyle = `rgba(220, 38, 38, ${g.opacity})`;
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText(g.char, 0, 0);
        ctx!.restore();
      }

      // ─── Draw cipher nodes + mesh ───
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < -10) node.x = width + 10;
        if (node.x > width + 10) node.x = -10;
        if (node.y < -10) node.y = height + 10;
        if (node.y > height + 10) node.y = -10;

        const pulse = Math.sin(time * node.pulseSpeed + node.pulsePhase);
        const r = node.radius + pulse * 0.4;
        const nodeAlpha = 0.2 + pulse * 0.1;

        const grd = ctx!.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 5);
        grd.addColorStop(0, `rgba(220, 38, 38, ${nodeAlpha * 0.5})`);
        grd.addColorStop(0.5, `rgba(220, 38, 38, ${nodeAlpha * 0.12})`);
        grd.addColorStop(1, "rgba(220, 38, 38, 0)");
        ctx!.fillStyle = grd;
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, r * 5, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.fillStyle = `rgba(248, 113, 113, ${nodeAlpha})`;
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Connection lines
      ctx!.lineWidth = 0.35;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.1;
            ctx!.strokeStyle = `rgba(220, 38, 38, ${alpha})`;
            ctx!.beginPath();
            ctx!.moveTo(nodes[i].x, nodes[i].y);
            ctx!.lineTo(nodes[j].x, nodes[j].y);
            ctx!.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }

    draw();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const d = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * d;
      canvas.height = height * d;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(d, d);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
