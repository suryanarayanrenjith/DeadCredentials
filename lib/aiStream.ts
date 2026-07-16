/**
 * AI enhancement layer — streams creative text from Pollinations.AI, a free,
 * open, no-API-key, no-sign-up generative service. If Pollinations is
 * unreachable, rate-limited, times out, STALLS, or returns nothing, we
 * transparently fall back to the fully-local generator (lib/localGenerator.ts)
 * so the user always gets a result. Nothing here requires a key, an account,
 * or payment.
 *
 * The only anonymous model (openai-fast / GPT-OSS 20B) is a reasoning model,
 * so we request `reasoning_effort: "low"` to collapse the hidden chain-of-
 * thought and reach visible content within a second or two, and we ignore any
 * `delta.reasoning` tokens — only `delta.content` reaches the user.
 *
 * Returns a plain-text ReadableStream plus which engine produced it, so the
 * client can surface an honest "AI / Local" status badge.
 */

// Overridable so the free AI layer can be pointed elsewhere or disabled for
// testing. Defaults to Pollinations' anonymous, no-key, no-sign-up endpoint.
const POLLINATIONS_URL = process.env.POLLINATIONS_URL || "https://text.pollinations.ai/openai";
const CONNECT_TIMEOUT_MS = 12_000; // time to receive response headers
const FIRST_CONTENT_TIMEOUT_MS = 15_000; // time to receive the first content token

export type Engine = "pollinations" | "local";

interface AIStreamOptions {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  localFallback: () => string;
}

/**
 * Parse an OpenAI-style SSE body into a plain UTF-8 text stream, ignoring
 * reasoning deltas. A watchdog guarantees the stream never hangs: if no
 * content token arrives in time, we cancel the upstream and emit local text.
 */
function sseToTextStream(
  source: ReadableStream<Uint8Array>,
  localFallback: () => string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = source.getReader();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let produced = false;
      let settled = false;
      let buffer = "";

      const finish = (emitFallback: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        reader.cancel().catch(() => {});
        if (emitFallback && !produced) controller.enqueue(encoder.encode(localFallback()));
        controller.close();
      };

      const watchdog = setTimeout(() => finish(true), FIRST_CONTENT_TIMEOUT_MS);

      (async () => {
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (settled) return;
            if (done) {
              finish(true); // if nothing was produced, emit local
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload);
                const delta: string | undefined = json?.choices?.[0]?.delta?.content;
                if (delta) {
                  if (!produced) {
                    produced = true;
                    clearTimeout(watchdog); // content flowing — cancel the watchdog
                  }
                  controller.enqueue(encoder.encode(delta));
                }
              } catch {
                // Ignore keep-alives / non-JSON lines.
              }
            }
          }
        } catch {
          finish(true);
        }
      })();
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}

/** Stream locally-generated text in small chunks for a live typewriter feel. */
function localTextStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const tokens = text.match(/\S+\s*/g) ?? [text];
  let i = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (i >= tokens.length) {
        controller.close();
        return;
      }
      const group = tokens.slice(i, i + 3).join("");
      i += 3;
      controller.enqueue(encoder.encode(group));
      if (i < tokens.length) {
        await new Promise((r) => setTimeout(r, 14));
      }
    },
  });
}

export async function generateAIStream(
  opts: AIStreamOptions
): Promise<{ body: ReadableStream<Uint8Array>; engine: Engine }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);

  try {
    const res = await fetch(POLLINATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai-fast",
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        temperature: opts.temperature ?? 0.85,
        max_tokens: opts.maxTokens ?? 800,
        reasoning_effort: "low",
        stream: true,
        referrer: "deadcredentials",
        private: true,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok && res.body) {
      return { body: sseToTextStream(res.body, opts.localFallback), engine: "pollinations" };
    }
  } catch {
    // Network error / timeout / abort — fall through to local.
  } finally {
    clearTimeout(timeout);
  }

  return { body: localTextStream(opts.localFallback()), engine: "local" };
}
