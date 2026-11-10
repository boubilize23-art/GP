import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  GESTIOPRO — Connexion à Supabase
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  Les valeurs sont lues dans les variables d'environnement Vite :
 *      VITE_SUPABASE_URL               → https://xxxx.supabase.co
 *      VITE_SUPABASE_PUBLISHABLE_KEY   → sb_publishable_...
 *
 *  Les valeurs de repli ci-dessous garantissent que l'application fonctionne
 *  même si le fichier .env.local n'a pas été créé. La clé publishable est
 *  faite pour être visible dans le code applicatif (elle est protégée par les
 *  politiques RLS de la base) — ce n'est PAS la clé secrète.
 *
 *  ⚠️  Ne jamais placer la clé secrète (sb_secret_... ou service_role) ici :
 *      elle contourne RLS et donnerait un accès complet à la base.
 */

const FALLBACK_URL = "https://bdoodzgwriyqsejspajf.supabase.co";
const FALLBACK_PUBLISHABLE_KEY = "sb_publishable_YyET21izLenA6fkDy4aH9g_comJm1OO";

export const SUPABASE_URL: string =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || FALLBACK_URL;

export const SUPABASE_PUBLISHABLE_KEY: string =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  FALLBACK_PUBLISHABLE_KEY;

/**
 * Adresse vers laquelle l'utilisateur est renvoyé après un email de confirmation
 * ou de réinitialisation de mot de passe.
 *
 * Par défaut on utilise l'adresse courante de l'application — ce qui est
 * correct en local. MAIS : un lien envoyé par email pointe vers une adresse
 * fixe. Si l'application est ouverte sur un autre appareil (téléphone) ou
 * déployée, il faut déclarer l'adresse publique dans VITE_AUTH_REDIRECT_URL
 * ET l'ajouter dans Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export const AUTH_REDIRECT_URL: string = (
  (import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined)?.trim() ||
  (typeof window !== "undefined" ? window.location.origin : "")
).replace(/\/+$/, "");

/** Vrai si les variables d'environnement ont bien été chargées */
export const usingEnvFile = Boolean(
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim(),
);

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // indispensable pour les liens de récupération
    },
    global: {
      headers: { "X-Client-Info": "gestiopro-web" },
    },
  },
);

/**
 * Message d'erreur lisible quand la connexion à Supabase est impossible.
 * @param error erreur renvoyée par le client
 */
export function describeSupabaseError(error: unknown): string {
  const err = error as { message?: string; code?: string } | null;
  if (!err) return "Erreur inconnue.";
  const msg = err.message || "";

  if (msg.includes("Invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (msg.includes("Email not confirmed")) {
    return "Votre email n'est pas encore confirmé. Cliquez sur le lien reçu par email.";
  }
  if (msg.includes("User already registered")) {
    return "Un compte existe déjà avec cet email.";
  }
  if (msg.includes("rate limit") || err.code === "429") {
    return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
  }
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
    return "Connexion à Supabase impossible. Vérifiez votre connexion internet.";
  }
  if (msg.includes("Password should be")) {
    return "Mot de passe trop faible : il faut au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.";
  }
  return msg || "Erreur inconnue.";
}
