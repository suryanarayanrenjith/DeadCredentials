import { buildBatchSummaryPrompts } from "@/lib/prompts";
import { generateLocalBatchSummary, type BatchStats } from "@/lib/localGenerator";
import { generateAIStream } from "@/lib/aiStream";
import { batchSummaryLimiter, getClientIP, isValidOrigin } from "@/lib/apiUtils";
import type { ToneOption } from "@/lib/types";

const VALID_TONES: ToneOption[] = ["victorian", "roast", "hollywood"];

function num(v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
}

function sanitizeStats(input: unknown): BatchStats {
  const s = (input ?? {}) as Partial<BatchStats>;
  const cleanList = (arr: unknown, withExtras: boolean) =>
    (Array.isArray(arr) ? arr : []).slice(0, 5).map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      return {
        masked: typeof o.masked === "string" ? o.masked.slice(0, 24) : "••••",
        score: num(o.score, 0, 100),
        ...(withExtras
          ? {
              breachCount: num(o.breachCount, -1),
              deathCause: typeof o.deathCause === "string" ? o.deathCause.slice(0, 40) : "unknown",
            }
          : {}),
      };
    });

  return {
    total: num(s.total, 0, 1000),
    alive: num(s.alive, 0, 1000),
    dead: num(s.dead, 0, 1000),
    avgScore: num(s.avgScore, 0, 100),
    totalBreaches: num(s.totalBreaches),
    mortalityRate: num(s.mortalityRate, 0, 100),
    weakest: cleanList(s.weakest, true) as BatchStats["weakest"],
    strongest: cleanList(s.strongest, false) as BatchStats["strongest"],
  };
}

export async function POST(request: Request) {
  if (!isValidOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (batchSummaryLimiter.isRateLimited(getClientIP(request))) {
    return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const tone: ToneOption = VALID_TONES.includes(body?.tone) ? body.tone : "victorian";
    const stats = sanitizeStats(body?.stats);

    const { system, user } = buildBatchSummaryPrompts(tone, stats);

    const { body: stream, engine } = await generateAIStream({
      system,
      user,
      temperature: 0.85,
      localFallback: () => generateLocalBatchSummary(tone, stats),
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Generator": engine,
      },
    });
  } catch {
    return Response.json({ error: "Failed to generate summary." }, { status: 500 });
  }
}
