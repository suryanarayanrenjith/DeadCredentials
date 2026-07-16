import { buildObituaryPrompts } from "@/lib/prompts";
import { generateLocalObituary } from "@/lib/localGenerator";
import { generateAIStream } from "@/lib/aiStream";
import { obituaryLimiter, getClientIP, isValidOrigin } from "@/lib/apiUtils";
import type { PasswordCharacteristics } from "@/lib/passwordAnalyzer";
import type { ToneOption } from "@/lib/types";

const VALID_TONES: ToneOption[] = ["victorian", "roast", "hollywood"];

/** Coerce untrusted client input into a safe characteristics object. */
function sanitize(input: unknown): PasswordCharacteristics {
  const c = (input ?? {}) as Partial<PasswordCharacteristics>;
  return {
    length: Number.isFinite(c.length) ? Math.max(0, Math.min(128, Number(c.length))) : 0,
    hasUppercase: !!c.hasUppercase,
    hasLowercase: !!c.hasLowercase,
    hasNumbers: !!c.hasNumbers,
    hasSymbols: !!c.hasSymbols,
    isCommon: !!c.isCommon,
    hasKeyboardPattern: !!c.hasKeyboardPattern,
    hasRepeatingChars: !!c.hasRepeatingChars,
    hasSequentialNumbers: !!c.hasSequentialNumbers,
    estimatedCrackTime: typeof c.estimatedCrackTime === "string" ? c.estimatedCrackTime.slice(0, 60) : "unknown",
    strengthScore: Number.isFinite(c.strengthScore) ? Math.max(0, Math.min(100, Number(c.strengthScore))) : 0,
    deathCause: typeof c.deathCause === "string" ? c.deathCause.slice(0, 60) : "unknown",
    patterns: Array.isArray(c.patterns) ? c.patterns.filter((p) => typeof p === "string").slice(0, 12) : [],
  };
}

export async function POST(request: Request) {
  if (!isValidOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (obituaryLimiter.isRateLimited(getClientIP(request))) {
    return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const tone: ToneOption = VALID_TONES.includes(body?.tone) ? body.tone : "victorian";
    const characteristics = sanitize(body?.characteristics);
    const breachCount = Number.isFinite(body?.breachCount) ? Math.max(0, Number(body.breachCount)) : 0;

    const { system, user } = buildObituaryPrompts(tone, characteristics, breachCount);

    const { body: stream, engine } = await generateAIStream({
      system,
      user,
      temperature: 0.85,
      localFallback: () => generateLocalObituary(tone, characteristics, breachCount),
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Generator": engine,
      },
    });
  } catch {
    return Response.json({ error: "Failed to generate obituary." }, { status: 500 });
  }
}
