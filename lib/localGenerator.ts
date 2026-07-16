/**
 * Local, dependency-free generation engine.
 *
 * This is the heart of DeadCredentials' "free forever, no sign-up, works
 * offline" guarantee. Every piece of creative text the app produces —
 * obituaries and batch summaries — can be generated entirely here, with zero
 * external services, zero API keys, and zero cost. The optional Pollinations
 * AI enhancement layer (see lib/aiStream.ts) sits on top of this; if it is
 * ever unavailable, rate-limited, or offline, the app degrades to these
 * generators without the user noticing a broken experience.
 *
 * The output format intentionally matches what the ObituaryCard parser
 * expects: a bold title line beginning with "IN MEMORIAM" / "FAREWELL" /
 * "THE ROAST OF" etc., followed by blank-line-separated paragraphs. The
 * password is always rendered as bullet dots — never the real characters.
 */

import type { PasswordCharacteristics } from "./passwordAnalyzer";
import type { ToneOption } from "./types";

const DOTS = "••••••••";

/* ── Randomness helpers ── */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ── Shared fact fragments ── */

function compositionSummary(c: PasswordCharacteristics): string {
  const has: string[] = [];
  if (c.hasLowercase) has.push("lowercase letters");
  if (c.hasUppercase) has.push("uppercase letters");
  if (c.hasNumbers) has.push("numbers");
  if (c.hasSymbols) has.push("symbols");
  return has.length ? has.join(", ") : "a single lonely character class";
}

function missingSummary(c: PasswordCharacteristics): string[] {
  const missing: string[] = [];
  if (!c.hasUppercase) missing.push("uppercase letters");
  if (!c.hasNumbers) missing.push("numbers");
  if (!c.hasSymbols) missing.push("symbols");
  return missing;
}

function breachLine(breachCount: number): string {
  if (breachCount <= 0) return "";
  if (breachCount === 1) return "seen once before in the wild";
  if (breachCount < 100) return `seen ${breachCount.toLocaleString()} times across leaked databases`;
  if (breachCount < 100_000) return `dragged through ${breachCount.toLocaleString()} separate breaches`;
  return `exposed a staggering ${breachCount.toLocaleString()} times — practically public property`;
}

/* ════════════════════════════════════════════════════════════════════
   VICTORIAN — Lord Reginald Cryptworth III
   ════════════════════════════════════════════════════════════════════ */

function victorian(c: PasswordCharacteristics, breachCount: number): string {
  const openings = [
    `It is with the heaviest of digital hearts that we record the passing of ${DOTS}, a password of ${c.length} characters, lost to the electric ether after a most lamentable career.`,
    `The Daily Breach Gazette regrets to announce the untimely expiration of ${DOTS}, who departed this authenticated world at the tender length of ${c.length} characters.`,
    `Gather, ye weary administrators, for ${DOTS} is no more — a credential of but ${c.length} characters, extinguished forthwith in the vast computational colonies.`,
    `We commit to memory the erstwhile ${DOTS}, a password whose ${c.length}-character constitution proved most grievously insufficient against the machineries of our age.`,
  ];

  const lifeHistory = [
    `Composed of ${compositionSummary(c)}, the deceased entered service full of hope, hitherto unaware that ${c.strengthScore < 40 ? "such modest fortifications" : "even respectable defenses"} could not forever withstand the relentless siege engines of the modern cracker.`,
    `In life it comprised ${compositionSummary(c)} — a constitution its creator no doubt believed clever, though history, as ever, was of a different and most unforgiving opinion.`,
    `The departed was assembled from ${compositionSummary(c)}, and for a brief and shining epoch it guarded its account with the quiet dignity of the doomed.`,
  ];

  const causeOfDeath = [
    `The attending coroner records the cause of death as ${c.deathCause}, an ignominious end estimated to require no more than ${c.estimatedCrackTime}.`,
    `Death arrived by way of ${c.deathCause}; the assembled physicians of cryptography estimate the whole grim affair should have taken but ${c.estimatedCrackTime}.`,
    `By ${c.deathCause} was it undone — a fate the almanacs predicted would unfold within ${c.estimatedCrackTime}.`,
  ];

  const missing = missingSummary(c);
  const failings = missing.length
    ? `The deceased is survived by its many absences, chief among them ${missing.join(", ")}, whose want hastened its decline.`
    : `Though possessed of every character class known to polite society, its brevity betrayed it in the end.`;

  const breach = breachCount > 0
    ? `Records show the departed was ${breachLine(breachCount)} — a most public humiliation for one so private in purpose.`
    : `Mercifully, it was found in no known ledger of breaches, though weakness alone was sufficient to seal its fate.`;

  const relations = [
    `It is mourned by its surviving relations — the ever-foolish "password123", the incorrigible "qwerty", and cousin "letmein", who could not attend, being themselves indisposed in a breach of their own.`,
    `Among the bereaved are its kin: "abc123", who wept openly, and "iloveyou", who was, predictably, compromised on the way to the service.`,
    `Its family gathers in grief: "admin", "monkey", and dear old "123456", the patriarch, who has outlived them all through sheer, baffling persistence.`,
  ];

  const lessons = [
    `Let this most grievous passing serve as a solemn lesson: length is the truest armour, and a passphrase of many words shall outlast the cleverest of substitutions. May stronger credentials take its place.`,
    `We close this notice with a moral, as is our custom: complexity without length is a candle in a hurricane. Choose sixteen characters or more, and choose them at random. So endeth the lesson.`,
    `Remember well the fate of ${DOTS}, and let no account be guarded by so frail a sentinel again. A worthy successor awaits those wise enough to forge one.`,
  ];

  const title = `**${pick(["IN MEMORIAM", "FAREWELL", "A SOLEMN NOTICE"])}: ${DOTS}**`;

  return [
    title,
    pick(openings),
    `${pick(lifeHistory)} ${failings}`,
    `${pick(causeOfDeath)} ${breach}`,
    pick(relations),
    pick(lessons),
  ].join("\n\n");
}

/* ════════════════════════════════════════════════════════════════════
   ROAST — DJ CrackMaster
   ════════════════════════════════════════════════════════════════════ */

function roast(c: PasswordCharacteristics, breachCount: number): string {
  const openers = [
    `Ohhh we gotta talk about ${DOTS}. ${c.length} characters of pure, uncut disappointment. This password walked into the breach like it paid rent there.`,
    `Ladies and gentlemen, put your hands together for ${DOTS} — a ${c.length}-character password so weak it apologized to the hacker for wasting their time.`,
    `So ${DOTS} thought it was safe. ${c.length} characters. Bless its heart. This thing has the structural integrity of a wet paper towel.`,
    `Let's roast ${DOTS}, everybody. ${c.length} characters that a toaster could crack while making toast. And the toast would be done first.`,
  ];

  const weaknessBurns = [
    `It's rocking ${compositionSummary(c)} and calling that "security." My guy, that's not a password, that's a suggestion.`,
    `Built out of ${compositionSummary(c)} — the cybersecurity equivalent of locking your front door with a "Live, Laugh, Love" sign.`,
    `You went with ${compositionSummary(c)}? That's not a fortress, that's a screen door on a submarine.`,
  ];

  const missing = missingSummary(c);
  const missingBurn = missing.length
    ? `And it's got NO ${missing.join(", no ")}. It's basically showing up to a gunfight with a strongly-worded letter.`
    : `Okay okay, it's got all four character types — and it's STILL this weak. That's like having every ingredient and still burning the water.`;

  const crackBurns = [
    `Time to crack? ${c.estimatedCrackTime}. A script kiddie could do it during a bathroom break — and he wouldn't even wash his hands after.`,
    `This dies via ${c.deathCause} in about ${c.estimatedCrackTime}. That's not a crack time, that's a sneeze.`,
    `Cause of death: ${c.deathCause}. ETA: ${c.estimatedCrackTime}. Blink and you'll miss the funeral.`,
  ];

  const breach = breachCount > 0
    ? `Oh, and it's been ${breachLine(breachCount)}. This password isn't compromised, it's a CELEBRITY. Hackers have a group chat about it.`
    : `It hasn't even shown up in a breach yet — not because it's strong, but because hackers haven't finished laughing.`;

  const familyRoast = [
    `It's survived by its equally tragic family: "password1", the overachiever; "qwerty", the one who peaked in 1998; and "123456", who's honestly doing better than all of them.`,
    `Shoutout to the relatives — "admin", "welcome", and "letmein" — a family reunion that doubles as a breach database.`,
    `Its cousins "monkey" and "dragon" send their regards, mostly because they're already in the same leaked spreadsheet.`,
  ];

  const closers = [
    `Moment of silence for ${DOTS}. Actually no, it doesn't deserve one. Go make a 16-character passphrase and never speak of this again. Mic drop.`,
    `RIP to a real one — and by "real one" I mean a real security disaster. Do better. DJ CrackMaster out.`,
    `In conclusion: ${DOTS} was a warning, not a password. Delete it, forget it, and let a strong one rise from its ashes. This password is DONE.`,
  ];

  const title = `**${pick(["THE ROAST OF", "FAREWELL", "IN MEMORIAM"])}: ${DOTS}**`;

  return [
    title,
    pick(openers),
    `${pick(weaknessBurns)} ${missingBurn}`,
    `${pick(crackBurns)} ${breach}`,
    pick(familyRoast),
    pick(closers),
  ].join("\n\n");
}

/* ════════════════════════════════════════════════════════════════════
   HOLLYWOOD — Epic narrator
   ════════════════════════════════════════════════════════════════════ */

function hollywood(c: PasswordCharacteristics, breachCount: number): string {
  const openers = [
    `The server room was quiet. Too quiet. Somewhere in the dark, ${DOTS} — ${c.length} characters, one heartbeat — stood guard, unaware this would be its final night.`,
    `FADE IN. A single cursor blinks in the void. This is the story of ${DOTS}, ${c.length} characters that believed, right up until the end, that they were enough.`,
    `They said it couldn't fall. They were wrong. This is the last stand of ${DOTS} — ${c.length} characters against an army it never saw coming.`,
  ];

  const origin = [
    `[FLASHBACK] We see it born — ${compositionSummary(c)}, typed in haste, full of hope, on a laptop that smelled of fresh coffee and false confidence.`,
    `[ORCHESTRA SWELLS] Once, it was new. Assembled from ${compositionSummary(c)}, it dreamed of protecting something that mattered. It never asked to be a hero. It never got the chance.`,
    `In a montage set to soaring strings, ${DOTS} is created — ${compositionSummary(c)} — and for one golden moment, it is invincible. Cut to black.`,
  ];

  const attack = [
    `SMASH CUT TO: the attack. A brute-force barrage lit the screens crimson. The method — ${c.deathCause}. The clock read ${c.estimatedCrackTime}, and the clock never lies.`,
    `Then came the assault. In glorious, terrible slow motion, ${c.deathCause} tore through the last line of defense. The whole battle lasted ${c.estimatedCrackTime}.`,
    `The hacker's fingers hovered, then struck. ${c.deathCause}. ${c.estimatedCrackTime} on the timer. The music stops. It's over before the popcorn's cold.`,
  ];

  const breach = breachCount > 0
    ? `Intelligence reports later confirmed the horror: our hero had already been ${breachLine(breachCount)}. The betrayal was total. Roll the dramatic zoom.`
    : `It had never appeared in a single breach — a clean record, a tragic hero — and still it fell. Somewhere, a violin weeps.`;

  const missing = missingSummary(c);
  const flaw = missing.length
    ? `Its fatal flaw, revealed in the final act: it never had ${missing.join(", ")}. The one thing that could have saved it.`
    : `It had everything — every character class, every trick — and still, its length was its Achilles' heel.`;

  const deathScene = [
    `In its final frame, ${DOTS} whispered its last words: "I thought I was strong enough." The screen faded. The account was breached. Silence.`,
    `The camera pulls back. ${DOTS} flickers once, twice, and is gone. A single tear rolls down a sysadmin's cheek. FADE TO BLACK.`,
    `And so our hero fell, not with a bang, but with the soft click of an unauthorized login. The credits begin to roll.`,
  ];

  const postCredits = [
    `[POST-CREDITS SCENE] A new password rises from the wreckage — sixteen characters, forged in randomness, ready for a sequel no hacker will ever want to watch. DIRECTED BY BRUTE_FORCE.`,
    `[MID-CREDITS] A hooded figure types a passphrase of four random words. It glows. The franchise continues. This time, the good guys win.`,
    `[STINGER] Fade in on a password manager, humming quietly, generating something uncrackable. The real hero was strong credentials all along. THE END... or is it?`,
  ];

  const title = `**${pick(["THE FINAL ACT", "IN MEMORIAM", "FAREWELL"])}: ${DOTS}**`;

  return [
    title,
    pick(openers),
    `${pick(origin)} ${flaw}`,
    `${pick(attack)} ${breach}`,
    pick(deathScene),
    pick(postCredits),
  ].join("\n\n");
}

/* ── Public API ── */

export function generateLocalObituary(
  tone: ToneOption,
  characteristics: PasswordCharacteristics,
  breachCount: number
): string {
  switch (tone) {
    case "roast":
      return roast(characteristics, breachCount);
    case "hollywood":
      return hollywood(characteristics, breachCount);
    case "victorian":
    default:
      return victorian(characteristics, breachCount);
  }
}

/* ════════════════════════════════════════════════════════════════════
   BATCH SUMMARY
   ════════════════════════════════════════════════════════════════════ */

export interface BatchStats {
  total: number;
  alive: number;
  dead: number;
  avgScore: number;
  totalBreaches: number;
  mortalityRate: number;
  weakest: { masked: string; score: number; breachCount: number; deathCause: string }[];
  strongest: { masked: string; score: number }[];
}

export function generateLocalBatchSummary(tone: ToneOption, s: BatchStats): string {
  const weakestList = s.weakest.map((w) => `**${w.masked}** (${w.score}/100)`).join(", ");
  const strongestList = s.strongest.map((w) => `**${w.masked}** (${w.score}/100)`).join(", ");

  if (tone === "roast") {
    return [
      `Well, well, well. ${s.total} passwords walked in, and ${s.dead} of them left in a body bag. That's a ${s.mortalityRate}% mortality rate — this isn't an audit, it's a crime scene.`,
      `The average strength limped in at **${s.avgScore}/100**, and collectively you racked up ${s.totalBreaches.toLocaleString()} breach appearances. That's not a password list, that's a hacker's wishlist.`,
      `The absolute disasters: ${weakestList || "honestly, all of them"}. These didn't get cracked, they *volunteered*. Meanwhile the only ones with a pulse — ${strongestList || "a rare few"} — get a slow, sarcastic clap.`,
      `Do yourself a favor: retire the weak ones tonight, install a password manager, and never let a batch look this tragic again. DJ CrackMaster, signing off.`,
    ].join("\n\n");
  }

  if (tone === "hollywood") {
    return [
      `FADE IN. ${s.total} passwords marched into the arena. Only ${s.alive} would walk out alive. This is their story — a ${s.mortalityRate}% mortality rate written in crimson across the servers.`,
      `The average combatant scored a mere **${s.avgScore}/100**, and together they carried the weight of ${s.totalBreaches.toLocaleString()} past betrayals. [ORCHESTRA SWELLS]`,
      `In the fallen ranks: ${weakestList || "too many to name"} — heroes who never stood a chance. And among the survivors, ${strongestList || "a precious few"}, standing defiant as the smoke clears.`,
      `[POST-CREDITS] The lesson echoes: length, randomness, and a password manager are the only armor that matters. Roll credits. The sequel writes itself.`,
    ].join("\n\n");
  }

  // victorian
  return [
    `The Daily Breach Gazette hereby records the results of a most extensive audit: ${s.total} credentials examined, of which ${s.dead} were pronounced expired — a mortality of ${s.mortalityRate}%, grievous by any measure.`,
    `The collective strength was found to be a modest **${s.avgScore} of 100**, and the assembled passwords were, in sum, ${breachLine(s.totalBreaches) || "spared the indignity of the breach ledgers"}.`,
    `Chief among the departed we note ${weakestList || "a great many of frail constitution"}, whose weakness invited their ruin. We reserve our respects for the survivors — ${strongestList || "a rare and worthy few"} — who yet stand against the tide.`,
    `Let the living learn from the dead: forge passphrases of length and randomness, entrust them to a proper manager, and may no future audit read so mournfully. So endeth the reckoning.`,
  ].join("\n\n");
}
