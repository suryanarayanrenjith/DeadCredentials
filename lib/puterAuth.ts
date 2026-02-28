/**
 * Puter.js authentication helper.
 *
 * On localhost Puter.js works without auth.  On deployed sites (e.g. Vercel)
 * it requires the user to sign in via a popup.  This module centralises that
 * check so every call-site stays clean.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  // Minimal type surface for the fields we actually use.
  var puter: {
    auth: {
      isSignedIn: () => boolean;
      signIn: () => Promise<void>;
    };
    ai: {
      chat: (
        messages: Array<{ role: string; content: string }>,
        options?: { model?: string; stream?: boolean; temperature?: number }
      ) => Promise<any>;
    };
  } | undefined;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Ensure the Puter SDK is loaded AND the user is authenticated.
 * - On localhost this is usually a no-op.
 * - On deployed sites it triggers a one-time popup sign-in.
 *
 * Throws a user-friendly message if the SDK never loaded.
 */
export async function ensurePuterReady(): Promise<void> {
  if (typeof globalThis.puter === "undefined") {
    throw new Error("AI service is still loading. Please try again in a moment.");
  }

  // On localhost / puter.com the user is already considered signed in.
  try {
    if (!globalThis.puter.auth.isSignedIn()) {
      await globalThis.puter.auth.signIn();
    }
  } catch {
    // Some older SDK builds don't expose `isSignedIn`.
    // In that case, just try signing in – it's idempotent.
    try {
      await globalThis.puter.auth.signIn();
    } catch {
      // If sign-in itself fails (popup blocked, etc.) let it bubble.
      throw new Error(
        "Could not sign in to the AI service. Please allow the popup and try again."
      );
    }
  }
}
