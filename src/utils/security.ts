/**
 * 🔒 GestioPro — Security Utilities
 * Hachage, sanitisation, rate limiting, session tokens, CSRF
 */

// ── Simple hash (SHA-256 simulé via Web Crypto API) ──────────────────────────
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "gestioPro$salt#2025");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

// ── Sanitize input (XSS prevention) ─────────────────────────────────────────
export function sanitize(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}

export function sanitizeStrict(input: string): string {
  // Remove all non-alphanumeric except @ . _ - space
  return input.replace(/[^a-zA-Z0-9@._\-\s]/g, "").trim();
}

// ── Rate Limiter (brute force protection) ────────────────────────────────────
const ATTEMPT_KEY = "gp_login_attempts";
const LOCKOUT_KEY = "gp_lockout_until";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function getLoginAttempts(): number {
  return parseInt(localStorage.getItem(ATTEMPT_KEY) || "0", 10);
}

export function incrementLoginAttempts(): number {
  const attempts = getLoginAttempts() + 1;
  localStorage.setItem(ATTEMPT_KEY, String(attempts));
  if (attempts >= MAX_ATTEMPTS) {
    const until = Date.now() + LOCKOUT_DURATION_MS;
    localStorage.setItem(LOCKOUT_KEY, String(until));
  }
  return attempts;
}

export function resetLoginAttempts(): void {
  localStorage.removeItem(ATTEMPT_KEY);
  localStorage.removeItem(LOCKOUT_KEY);
}

export function isLockedOut(): { locked: boolean; remainingMs: number } {
  const until = parseInt(localStorage.getItem(LOCKOUT_KEY) || "0", 10);
  if (!until) return { locked: false, remainingMs: 0 };
  const remaining = until - Date.now();
  if (remaining <= 0) {
    localStorage.removeItem(LOCKOUT_KEY);
    localStorage.removeItem(ATTEMPT_KEY);
    return { locked: false, remainingMs: 0 };
  }
  return { locked: true, remainingMs: remaining };
}

export function formatLockoutTime(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

// ── Session Token ─────────────────────────────────────────────────────────────
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── CSRF Token ────────────────────────────────────────────────────────────────
export function generateCsrfToken(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Password strength scorer ─────────────────────────────────────────────────
export interface PasswordStrength {
  score: number; // 0-5
  label: string;
  color: string;
  checks: { label: string; ok: boolean }[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const checks = [
    { label: "Au moins 8 caractères",         ok: password.length >= 8 },
    { label: "Une majuscule (A-Z)",            ok: /[A-Z]/.test(password) },
    { label: "Une minuscule (a-z)",            ok: /[a-z]/.test(password) },
    { label: "Un chiffre (0-9)",               ok: /\d/.test(password) },
    { label: "Un caractère spécial (!@#...)",  ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const labels = ["Très faible", "Faible", "Moyen", "Bon", "Fort", "Très fort"];
  const colors = ["#ef4444", "#f97316", "#eab308", "#3b82f6", "#22c55e", "#10b981"];
  return { score, label: labels[score], color: colors[score], checks };
}

// ── LocalStorage encryption (simple obfuscation for remembered creds) ────────
const REMEMBER_KEY = "gp_remember";
const SESSION_KEY = "gp_session";
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 jours

function obfuscate(str: string): string {
  return btoa(encodeURIComponent(str));
}

function deobfuscate(str: string): string {
  try {
    return decodeURIComponent(atob(str));
  } catch {
    return "";
  }
}

export interface RememberedCredentials {
  identifier: string;
  passwordHint: string; // stored obfuscated
}

export function saveRememberedCredentials(identifier: string, password: string): void {
  const data = { identifier: obfuscate(identifier), passwordHint: obfuscate(password) };
  localStorage.setItem(REMEMBER_KEY, JSON.stringify(data));
}

export function loadRememberedCredentials(): { identifier: string; password: string } | null {
  const raw = localStorage.getItem(REMEMBER_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return {
      identifier: deobfuscate(data.identifier),
      password: deobfuscate(data.passwordHint),
    };
  } catch {
    return null;
  }
}

export function clearRememberedCredentials(): void {
  localStorage.removeItem(REMEMBER_KEY);
}

// ── Session persistence ───────────────────────────────────────────────────────
export interface StoredSession {
  userId: string;
  token: string;
  expiresAt: number;
}

export function saveSession(userId: string): string {
  const token = generateSessionToken();
  const session: StoredSession = {
    userId,
    token,
    expiresAt: Date.now() + SESSION_TTL,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return token;
}

export function loadSession(): StoredSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session: StoredSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function refreshSession(userId: string): void {
  saveSession(userId);
}
