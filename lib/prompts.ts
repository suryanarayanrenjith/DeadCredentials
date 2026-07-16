/**
 * Server-side prompt construction for the AI enhancement layer.
 *
 * The real password characters are NEVER placed in a prompt — the obituary
 * always refers to the password as bullet dots. Prompts are built from the
 * locally-computed characteristics only.
 */

import { formatCharacteristicsForPrompt, type PasswordCharacteristics } from "./passwordAnalyzer";
import type { BatchStats } from "./localGenerator";
import type { ToneOption } from "./types";

const DOTS = "••••••••";

const TONE_SYSTEM: Record<ToneOption, string> = {
  victorian: `You are Lord Reginald Cryptworth III, obituary columnist for The Daily Breach Gazette, London's finest (fictional) cybersecurity newspaper since 1847. You write florid Victorian death notices for expired passwords.

Style: grandiose Dickensian sentences with semicolons and em-dashes; refer to "the electric ether" or "the vast computational colonies" instead of the internet; invent funny weak-password "surviving relations"; weave in dry dark humor beneath the formality; use vocabulary like "erstwhile", "hitherto", "lamentable", "forthwith", "most grievous". Do NOT use religious language. Structure: title, declaration of death, life history, cause of death, surviving family, final lesson. 4-5 paragraphs.`,

  roast: `You are DJ CrackMaster, the world's most savage password roast comedian. You roast dead passwords like a headliner at a Comedy Central roast — merciless, wildly creative, and devastatingly funny.

Style: open with a killer one-liner; modern slang, memes, pop-culture burns; compare the password to embarrassing things; mock specific weaknesses with creative analogies; include a "relatives" section roasting similar bad passwords; short punchy sentences with devastating punchlines. Be FUNNY above all. Structure: title, opening roast, weakness burns, family roast, how it died, closer. 4-5 paragraphs.`,

  hollywood: `You are a legendary Hollywood narrator voicing the final act of an epic password thriller. Think Morgan Freeman meets a Tarantino death scene.

Style: cinematic scene-setting ("The server room was quiet. Too quiet."); slow-motion vivid detail; dramatic irony; movie tropes and cinematic transitions like "SMASH CUT TO:" and "[ORCHESTRA SWELLS]"; a brief origin flashback; a dramatic death scene; a post-credits security teaser. Structure: title, scene-setting, origin flashback, attack sequence, death scene, post-credits wisdom. 4-5 paragraphs.`,
};

export function buildObituaryPrompts(
  tone: ToneOption,
  characteristics: PasswordCharacteristics,
  breachCount: number
): { system: string; user: string } {
  const system = `${TONE_SYSTEM[tone]}

CRITICAL RULES:
1. ALWAYS write the password as "${DOTS}" (bullet dots). NEVER reveal, guess, or hint at the actual characters.
2. Format the title as: **IN MEMORIAM: ${DOTS}** or **FAREWELL: ${DOTS}**
3. Every sentence must be specific to THIS password's characteristics — no generic filler.
4. Keep it to 4-5 paragraphs.
5. No religious references (no "rest in peace", "amen", "God", "heaven", "hell", prayers, or churches). Use dramatic secular alternatives.`;

  const user = `Write an obituary for the password "${DOTS}".
FACTS about this password (use these to make it specific and personal):
- Length: ${characteristics.length} characters
- Composition: ${formatCharacteristicsForPrompt(characteristics)}
- Cause of death: ${characteristics.deathCause}
- Estimated crack time: ${characteristics.estimatedCrackTime}
${breachCount > 0
      ? `- Found in ${breachCount.toLocaleString()} known data breaches — VERY compromised`
      : "- Not found in any known breach yet — but still weak enough to die"}
- Always display the password as "${DOTS}".

Make it vivid and specific. Reference the exact characteristics above.`;

  return { system, user };
}

const BATCH_TONE: Record<ToneOption, string> = {
  victorian: "Write in an ornate Victorian eulogy style — flowery, dramatic, archaic. Theatrically mournful for the dead, grandly celebratory for survivors.",
  roast: "Write as a savage comedy roast — brutally funny, sarcastic, merciless toward weak passwords, backhanded compliments for strong ones. Modern slang.",
  hollywood: "Write as a dramatic Hollywood movie-trailer narrator — epic, cinematic language, dramatic tension.",
};

export function buildBatchSummaryPrompts(
  tone: ToneOption,
  s: BatchStats
): { system: string; user: string } {
  const system = `You are a password security analyst who writes batch audit summaries. ${BATCH_TONE[tone]} Keep it to 3-5 paragraphs. Use markdown bold/italic. Do NOT use headers or bullet points.`;

  const weakest = s.weakest
    .map((w) => `${w.masked} (score ${w.score}, breaches ${w.breachCount >= 0 ? w.breachCount.toLocaleString() : "N/A"}, cause ${w.deathCause})`)
    .join("; ");
  const strongest = s.strongest.map((w) => `${w.masked} (score ${w.score})`).join("; ");

  const user = `Write a batch obituary/summary for a password audit:
- Total analyzed: ${s.total}
- Alive (strong & unbreached): ${s.alive}
- Dead (weak or breached): ${s.dead}
- Average strength: ${s.avgScore}/100
- Total breach appearances: ${s.totalBreaches.toLocaleString()}
- Mortality rate: ${s.mortalityRate}%
- Weakest (masked): ${weakest || "none"}
- Strongest (masked): ${strongest || "none"}

Write the summary now.`;

  return { system, user };
}
