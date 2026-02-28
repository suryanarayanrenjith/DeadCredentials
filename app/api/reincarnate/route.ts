// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  if (isRateLimited(ip)) {
    return Response.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const { theme, length, characteristics } = await request.json();

    if (!theme || !length) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are the Phoenix Password Forge — a mystical AI that resurrects weak, dead passwords into strong, memorable new ones.

YOUR TASK: Generate exactly ONE strong replacement password.

RULES:
1. The password MUST be exactly ${Math.max(length, 16)} characters long
2. It MUST contain uppercase letters, lowercase letters, numbers, and special characters (!@#$%^&*-_+=?)
3. It MUST be inspired by the theme "${theme}" — weave the theme into the password creatively
4. It must NOT be a dictionary word, common phrase, or predictable pattern
5. It should be pronounceable or have a memorable structure (e.g., "Ph03n!x_R1s3s#24" for a phoenix theme)
6. Do NOT include spaces

OUTPUT FORMAT — respond with ONLY this exact JSON, nothing else:
{"password": "YOUR_GENERATED_PASSWORD", "explanation": "Brief 1-sentence explanation of the password's structure"}

Example output:
{"password": "Dr@g0n_Bl4ze#97!", "explanation": "Dragon theme with leet-speak substitutions, special chars, and random numbers"}

RESPOND WITH ONLY THE JSON. No markdown, no code blocks, no extra text.`;

    const userPrompt = `The user's old password was themed around "${theme}". It was ${length} characters long and had these weaknesses:
${characteristics?.hasUppercase === false ? "- No uppercase letters" : ""}
${characteristics?.hasNumbers === false ? "- No numbers" : ""}
${characteristics?.hasSymbols === false ? "- No special characters" : ""}
${characteristics?.isCommon ? "- Was a common/dictionary password" : ""}
${characteristics?.hasKeyboardPattern ? "- Had keyboard patterns" : ""}
${characteristics?.hasRepeatingChars ? "- Had repeating characters" : ""}
${characteristics?.length < 12 ? "- Too short (under 12 chars)" : ""}

Generate a strong reincarnation of this password that fixes ALL weaknesses while keeping the "${theme}" theme alive. The new password must score 80+ on any strength checker.`;

    return Response.json({
      systemPrompt,
      userPrompt,
    });
  } catch (error) {
    console.error("Reincarnate API error:", error);
    return Response.json(
      { error: "Failed to generate reincarnation prompt." },
      { status: 500 }
    );
  }
}
