# 💀 DeadCredentials

> *Every password has a story. Most end tragically.*

**DeadCredentials** is a darkly theatrical password security auditor that checks whether your password has been pwned, analyzes its strength, and generates a dramatic AI-written **obituary** for it — in your choice of Victorian, Comedy Roast, or Hollywood style.

Built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and powered by the [Have I Been Pwned](https://haveibeenpwned.com/Passwords) API + [Puter AI](https://puter.com) (Gemini 2.0 Flash).

---

## ✨ Features

### 🔍 Single Password Audit
- **Strength Meter** — 0–100 score with live visual feedback
- **Crack Time Estimator** — brute-force estimate at 10 billion attempts/second
- **Password DNA** — per-character heatmap showing which characters are weak, moderate, or strong, with hover tooltips explaining each segment
- **Security Breakdown** — checklist of 10 security criteria (uppercase, symbols, length, common patterns, etc.)
- **Threat Actor Profile** — classifies the attack vector most likely to compromise the password (dictionary attack, brute force, credential stuffing, etc.)
- **Fun Comparison Stats** — contextual percentile ranking against real-world passwords
- **Skull Confetti** — animated skull emojis rain down when a password dies
- **Sound FX** — funeral bell for dead passwords, victory chime for survivors

### 📝 AI Obituary Generator
Three distinct tones powered by streaming Gemini 2.0 Flash via Puter AI:

| Tone | Voice | Style |
|------|-------|-------|
| **Victorian** | Lord Reginald Cryptworth III | Florid Dickensian newspaper death notices |
| **Comedy Roast** | DJ CrackMaster | Savage, meme-laden stand-up roast |
| **Hollywood** | Epic film narrator | Cinematic slow-motion death sequence |

The obituary is streamed token-by-token and always references the specific characteristics of the checked password — it is never generic.

### 🔁 Password Reincarnation
After a password dies, the **Reincarnation Box** lets users enter a theme (e.g. "dragon", "space") and generates a cryptographically strong replacement password that fixes all detected weaknesses while keeping the theme alive.

### 📊 Batch CSV Mode
Upload or paste a CSV of up to **100 passwords** for bulk security auditing. Results include per-row strength scores, breach status, and a downloadable report.

### 🏴 Password Vault
A persistent session history of the last 20 passwords checked, displayed with masked values, strength bars, and alive/dead indicators.

---

## 🔒 Privacy & Security

- **k-Anonymity**: Only the first 5 characters of the SHA-1 hash are sent to HIBP. The full password — or even the full hash — is **never transmitted** to any external server.
- **No storage**: Passwords are never logged, stored, or persisted server-side.
- **Masked display**: The UI always shows passwords as dots (`••••••••`). Even the AI obituary prompt uses a dot placeholder — the actual password characters are never passed to the language model.
- **Rate limiting**: API routes enforce 10 requests per minute per IP to prevent abuse.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion 12 |
| Breach check | HIBP Pwned Passwords API (k-anonymity) |
| AI generation | Puter AI — Gemini 2.0 Flash (streamed, client-side) |
| Image export | html-to-image |
| Fonts | Geist Sans + Geist Mono (next/font) |

---

## 📁 Project Structure

```
dead-credentials/
├── app/
│   ├── page.tsx                  # Main UI — orchestrates all modes and state
│   ├── layout.tsx                # Root layout, metadata, Puter.js script
│   ├── globals.css               # Global styles, animations, particles
│   ├── api/
│   │   ├── check-password/       # POST — HIBP check, analysis, prompt generation
│   │   └── reincarnate/          # POST — generates AI prompt for password replacement
│   └── components/
│       ├── PasswordInput.tsx     # Secure password entry field
│       ├── StrengthMeter.tsx     # Animated 0–100 strength gauge
│       ├── CrackTimeVisualizer.tsx # Timeline-style crack time display
│       ├── ObituaryCard.tsx      # Streaming AI obituary with share/download
│       ├── SurvivalCard.tsx      # Shown for strong, unbreached passwords
│       ├── ReincarnationBox.tsx  # AI-powered password replacement UI
│       ├── ThreatActorProfile.tsx # Attack vector classification card
│       ├── BatchProcessor.tsx    # CSV upload and bulk audit
│       └── SkullConfetti.tsx     # Canvas-based skull particle effect
├── lib/
│   ├── passwordAnalyzer.ts       # Local strength scoring, DNA analysis, pattern detection
│   └── hibp.ts                   # HIBP k-anonymity SHA-1 prefix lookup
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm / yarn / pnpm / bun

### Installation

```bash
git clone https://github.com/suryanarayanrenjith/DeadCredentials.git
cd DeadCredentials
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

---

## 🧠 How It Works

1. **User enters a password** → submitted to `/api/check-password`
2. **Server** computes the SHA-1 hash, sends the 5-char prefix to HIBP, and receives back all matching hash suffixes + breach counts — without ever exposing the full password or hash externally
3. **Server** runs local analysis via `lib/passwordAnalyzer.ts`: strength scoring, crack time estimation, pattern detection, death cause classification
4. **Server** constructs a tone-specific system prompt and user prompt (with the password replaced by `••••••••`) and returns them to the client
5. **Client** calls Puter AI's `puter.ai.chat()` with the prompts, streaming the obituary token-by-token via `for await`
6. **Client** simultaneously renders the DNA heatmap, strength meter, threat profile, and other UI panels
7. If the password scores ≥ 80 and has zero breaches → **Survival Card** + victory chime. Otherwise → **Obituary Card** + skull confetti + funeral bell

---

## 📜 Password Strength Algorithm

Scoring is done entirely client-side in `lib/passwordAnalyzer.ts`:

- **Base score**: `min(length × 4, 40)` — up to 40 points for length
- **Character variety**: +5 lowercase, +10 uppercase, +10 numbers, +15 symbols
- **Mix bonus**: +10 for 3+ types, +10 for all 4 types
- **Penalties**: −40 common password, −15 keyboard pattern, −10 repeating chars, −10 sequential numbers, −20 if < 6 chars
- **Final score**: clamped to 0–100

---

## ⚙️ API Reference

### `POST /api/check-password`

**Body:**
```json
{ "password": "string", "tone": "victorian" | "roast" | "hollywood" }
```

**Response:**
```json
{
  "breachCount": 12345,
  "characteristics": { ... },
  "systemPrompt": "...",
  "userPrompt": "...",
  "maskedPassword": "pa****rd"
}
```

### `POST /api/reincarnate`

**Body:**
```json
{ "theme": "dragon", "length": 10, "characteristics": { ... } }
```

**Response:**
```json
{ "systemPrompt": "...", "userPrompt": "..." }
```

Both routes enforce **10 req/min per IP** rate limiting.

---

## 🎨 Design

- Dark gothic aesthetic with deep zinc/charcoal backgrounds and crimson (`#dc2626`) accents
- Animated floating particles, vignette overlay, and logo pulse ring
- Typewriter subtitle cycling through dramatic taglines
- All UI transitions use Framer Motion spring physics
- Responsive — works on mobile, tablet, and desktop

---

## 📄 License

[MIT]()

---

<div align="center">
  <sub>Built with ♥ using Next.js &nbsp;•&nbsp; Powered by HIBP & Puter AI</sub>
</div>
