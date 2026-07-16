# 💀 DeadCredentials

> *Every password has a story. Most end tragically.*

**DeadCredentials** is a darkly theatrical password security auditor that checks whether your password has been pwned, analyzes its strength, and generates a dramatic **obituary** for it in your choice of Victorian, Comedy Roast, or Hollywood style.

**100% free. No sign-up. No API keys. No accounts. Fully open source.** — for you *and* your users, forever. The app works even offline.

Built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and powered by the [Have I Been Pwned](https://haveibeenpwned.com/Passwords) API + [Pollinations AI](https://pollinations.ai) (with a built-in local generation engine as a guaranteed fallback).

---

## 🆓 Free & Open, No Sign-up — How

Every feature runs without a single account, key, or payment:

- **AI text (obituaries + batch summaries)** is generated through [Pollinations AI](https://pollinations.ai) — a free, open, **no-API-key, no-sign-up** generative service — proxied through the app's own server routes (so no third-party script runs in your browser, and no credentials are ever needed).
- **If Pollinations is unavailable, rate-limited, or you're offline**, the app transparently falls back to a **rich built-in local generation engine** (`lib/localGenerator.ts`) that produces varied, specific obituaries with zero external calls. You always get a result — an honest **"AI / Local"** badge tells you which engine wrote it.
- **Password generation & reincarnation** happen **entirely locally** with the Web Crypto CSPRNG (`lib/generator.ts`) — more secure than asking a language model to invent a password, and it never touches the network.
- **Breach checks** run **in your browser** against HIBP's free k-anonymity range API — the SHA-1 hash is computed client-side and only a 5-char prefix is sent, directly from your browser.

There is nothing to configure and nothing to pay. Clone it, run it, deploy it.

---

## 🛡️ Trust: Your Password Never Leaves Your Device

A password checker is only worth using if you can trust it isn't harvesting what you type. DeadCredentials is built so that trust is **verifiable, not just promised**:

- **Hashed in your browser.** Your password is SHA-1 hashed on your device with the Web Crypto API. Only the **first 5 characters** of that hash are sent to Have I Been Pwned (k-anonymity). Your password — and the other 35 hash characters — never leave your device.
- **No server endpoint accepts a password.** Strength analysis, hashing, breach lookup, and password generation all run client-side. The only server routes that exist — `/api/obituary` and `/api/batch-summary` — receive computed statistics, never a password.
- **Live proof in the UI.** After every check, a "Verified: what left your device" panel shows the exact 5-char hash prefix that was transmitted — and reminds you that you can confirm it yourself in **DevTools → Network** (the only external request is that prefix to `api.pwnedpasswords.com`).
- **The AI only sees statistics.** Obituaries are generated from numbers (length, entropy, breach count) with the password shown as dots — never the real characters.
- **Nothing is stored.** No database, no password logging, no cookies, no analytics, no tracking.
- **Open source.** Every line is public — read it, fork it, run it yourself.

An expandable **Trust & Privacy** panel at the top of the app spells all of this out for every visitor.

---

## ✨ Features

### 🔍 Single Password Audit
- **Live strength preview** — a strength bar + entropy readout updates as you type, before you even submit
- **Strength Meter** — 0–100 score, estimated crack time, and **entropy in bits**
- **Password DNA** — per-character heatmap showing which characters are weak, moderate, or strong, with hover tooltips
- **Security Breakdown** — checklist of 10 security criteria
- **Threat Actor Profile** — classifies the attacker most likely to compromise the password
- **Crack Time Analysis** — technical, pop-culture, and historical reference frames
- **Skull Confetti + Sound FX** — funeral bell for dead passwords, victory chime for survivors

### 📝 AI Obituary Generator
Three distinct tones, streamed token-by-token:

| Tone | Voice | Style |
|------|-------|-------|
| **Victorian** | Lord Reginald Cryptworth III | Florid Dickensian death notices |
| **Comedy Roast** | DJ CrackMaster | Savage, meme-laden stand-up roast |
| **Hollywood** | Epic film narrator | Cinematic slow-motion death sequence |

The obituary always references the specific characteristics of the checked password — never generic — and the password itself is always rendered as bullet dots (`••••••••`), never revealed to the model.

### 🔥 Strong Password Forge *(new)*
A dedicated, fully-local generator tool:
- **Random mode** — length slider + toggles for uppercase / lowercase / numbers / symbols, with real entropy
- **Passphrase mode** — memorable multi-word passphrases (e.g. `Cobalt-Meteor-Willow-47`) with separator and capitalization options
- Live strength + entropy readout, one-click copy — generated in your browser with a cryptographic RNG, never sent anywhere

### 🔁 Password Reincarnation
After a password dies, the **Reincarnation Box** forges a cryptographically-strong replacement that keeps your theme alive (e.g. "dragon" → `Dr49on+G2LeJvgs&`) while fixing every detected weakness. Generated locally with a secure RNG.

### 📊 Batch CSV Mode
Upload or paste a CSV of up to **100 passwords** for bulk auditing, with a dramatic AI (or local) batch summary and a downloadable report.

### 🏴 Password Vault
A session history of the last 20 passwords checked, with masked values, strength bars, and alive/dead indicators.

### 📱 Installable PWA
A web manifest + theme colors make DeadCredentials installable to the home screen and usable as a standalone app.

---

## 🔒 Privacy & Security

- **Client-side hashing + k-Anonymity**: The SHA-1 hash is computed in your browser; only the first 5 characters are sent to HIBP (directly, browser → HIBP). The full password and the full hash are **never transmitted** anywhere.
- **No password ever reaches our server**: There is no backend route that accepts a password — the only server routes generate obituary text from computed statistics.
- **No storage**: Passwords are never logged, stored, or persisted anywhere.
- **Masked display**: The UI always shows passwords as dots (`••••••••`). The AI never receives the real password — obituary prompts are built only from computed characteristics.
- **Locked-down CSP**: The browser talks only to the app's own origin and `api.pwnedpasswords.com`. No third-party scripts run in the page.
- **Rate limiting**: The AI proxy routes enforce per-IP limits to prevent abuse.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion 12 |
| Breach check | HIBP Pwned Passwords API (k-anonymity, **in-browser**) |
| AI generation | Pollinations AI (free, no key) → local engine fallback, streamed |
| Password generation | Web Crypto CSPRNG (**in-browser**) |
| Image export | html-to-image |
| Fonts | Geist Sans + Geist Mono (next/font) |

---

## 📁 Project Structure

```
dead-credentials/
├── app/
│   ├── page.tsx                  # Main UI — orchestrates all modes and state
│   ├── layout.tsx                # Root layout, metadata, PWA manifest
│   ├── globals.css               # Global styles, animations, particles
│   ├── api/
│   │   ├── obituary/             # POST — streams obituary (Pollinations → local)
│   │   └── batch-summary/        # POST — streams batch summary (Pollinations → local)
│   └── components/
│       ├── TrustPanel.tsx        # Expandable "your password never leaves" panel
│       ├── PasswordInput.tsx     # Secure entry field + live strength preview
│       ├── StrengthMeter.tsx     # Score, crack time, entropy
│       ├── PasswordGenerator.tsx # Strong password / passphrase forge (local)
│       ├── ObituaryCard.tsx      # Streaming obituary with share/download
│       ├── ReincarnationBox.tsx  # In-browser themed password replacement
│       ├── BatchProcessor.tsx    # CSV upload + bulk audit (in-browser) + summary
│       └── … (ThreatActorProfile, CrackTimeVisualizer, SkullConfetti, etc.)
└── lib/
    ├── passwordAnalyzer.ts       # Strength scoring, DNA, entropy, patterns
    ├── hibpClient.ts             # In-browser HIBP k-anonymity breach check
    ├── passwordUtils.ts          # Client-safe password masking
    ├── generator.ts              # Crypto-strong password/passphrase generator
    ├── localGenerator.ts         # Local obituary + batch summary engine
    ├── prompts.ts                # Server-side AI prompt construction
    ├── aiStream.ts               # Pollinations streaming + local fallback
    ├── obituaryClient.ts         # Client-side streaming helpers
    └── apiUtils.ts               # Rate limiting, CSRF/origin check (AI routes)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm / yarn / pnpm / bun

### Installation & Development

```bash
git clone https://github.com/suryanarayanrenjith/DeadCredentials.git
cd DeadCredentials
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment variables required.

### Production Build

```bash
npm run build
npm start
```

### Optional configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `POLLINATIONS_URL` | `https://text.pollinations.ai/openai` | Point the free AI layer elsewhere, or set to an unreachable value to force the local engine. |

---

## 🧠 How It Works

1. **User enters a password** → the browser runs local analysis (strength, entropy, crack time, patterns, death cause), computes the SHA-1 hash locally, and sends only the 5-char prefix to HIBP (k-anonymity). The password never leaves the device.
2. **Obituary** → the client streams from `/api/obituary`, passing only the computed characteristics + breach count (never the password). The route builds a tone-specific prompt (password shown as dots), calls Pollinations AI, and pipes the tokens back. If Pollinations stalls, errors, or you're offline, the route seamlessly streams a locally-generated obituary instead.
3. **Results** render the DNA heatmap, strength meter, threat profile, crack-time frames, and breakdown.
4. Strong, unbreached passwords (score ≥ 80, zero breaches) get a **Survival Card** + victory chime; everything else gets an **Obituary Card** + skull confetti + funeral bell, then a locally-forged **Reincarnation**.

---

## ⚙️ API Reference

Only the AI proxy routes exist server-side, and **none of them ever receive a password**. They enforce per-IP rate limiting and same-origin CSRF checks.

### `POST /api/obituary` · `POST /api/batch-summary`
Stream `text/plain` token-by-token. The `X-Generator` response header is `pollinations` or `local`.
```json
// /api/obituary body — computed stats only, never the password
{ "tone": "victorian" | "roast" | "hollywood", "characteristics": { … }, "breachCount": 12345 }
```

### No password-accepting endpoints
Breach checking and reincarnation run entirely in the browser (`lib/hibpClient.ts`, `lib/generator.ts`), so **no server route accepts a password** — the app ships only the two AI text routes above.

### Breach check (in the browser, not an app route)
`GET https://api.pwnedpasswords.com/range/{first5OfSha1}` — called directly from your browser; only the 5-char prefix is sent.

---

## 📄 License

[MIT](https://github.com/suryanarayanrenjith/DeadCredentials/blob/master/LICENSE)

---

<div align="center">
  <sub>Built with ♥ using Next.js &nbsp;•&nbsp; Powered by HIBP &amp; Pollinations AI &nbsp;•&nbsp; 100% free, no sign-up, open source</sub>
</div>
