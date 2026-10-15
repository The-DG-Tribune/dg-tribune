import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  type User,
} from "firebase/auth";
import { auth } from "@/services/firebase/config";

/**
 * Auth service - Document 03/07 Authentication.
 * Only one administrator account exists (created directly in the
 * Firebase console). There is no signup/register flow anywhere in
 * this app - see Document 07.
 */

/** Friendly, non-technical error messages - never expose raw Firebase errors. */
function toFriendlyAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Something went wrong signing in. Please try again.";
  }
}

export async function signIn(email: string, password: string): Promise<User> {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (err) {
    const code = (err as { code?: string }).code ?? "unknown";
    throw new Error(toFriendlyAuthError(code));
  }
}

/**
 * Sends Firebase's standard password-reset email. Always resolves the same way
 * whether or not the address is registered, so it can't be used to find out
 * which emails have accounts.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (err) {
    const code = (err as { code?: string }).code ?? "unknown";
    if (code === "auth/network-request-failed") {
      throw new Error("Network error. Check your connection and try again.");
    }
    if (code === "auth/too-many-requests") {
      throw new Error("Too many attempts. Please wait a few minutes and try again.");
    }
    if (code === "auth/invalid-email") {
      throw new Error("That email address doesn't look right.");
    }
    // Any other result (including user-not-found) is treated as sent.
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/** Subscribe to auth state changes. Returns an unsubscribe function. */
export function onAuthStateChanged(callback: (user: User | null) => void) {
  return firebaseOnAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
