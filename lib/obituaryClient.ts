/**
 * Client-side helpers that stream text from our own API routes (which proxy
 * Pollinations AI with a local fallback). They read the response body chunk by
 * chunk and invoke `onChunk` with the accumulated text so the UI can render a
 * live typewriter effect. The `X-Generator` header tells us which engine
 * produced the text so the UI can show an honest status badge.
 */

import type { PasswordCharacteristics } from "./passwordAnalyzer";
import type { BatchStats } from "./localGenerator";
import type { ToneOption } from "./types";

export type Engine = "pollinations" | "local";

async function streamText(
  url: string,
  body: unknown,
  onChunk: (fullText: string) => void,
  onEngine?: (engine: Engine) => void
): Promise<Engine> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = "The generator is unavailable right now. Please try again.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }

  const engine = (res.headers.get("X-Generator") as Engine) || "local";
  onEngine?.(engine);

  if (!res.body) {
    // No streaming support — read the whole body at once.
    const text = await res.text();
    onChunk(text);
    return engine;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onChunk(full);
  }
  full += decoder.decode();
  onChunk(full);
  return engine;
}

export function streamObituary(
  args: { tone: ToneOption; characteristics: PasswordCharacteristics; breachCount: number },
  onChunk: (fullText: string) => void,
  onEngine?: (engine: Engine) => void
): Promise<Engine> {
  return streamText("/api/obituary", args, onChunk, onEngine);
}

export function streamBatchSummary(
  args: { tone: ToneOption; stats: BatchStats },
  onChunk: (fullText: string) => void,
  onEngine?: (engine: Engine) => void
): Promise<Engine> {
  return streamText("/api/batch-summary", args, onChunk, onEngine);
}
