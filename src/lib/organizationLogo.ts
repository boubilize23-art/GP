/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  GESTIOPRO — Logo de la société
 * ═══════════════════════════════════════════════════════════════════════════
 *  Dépose, redimensionnement et suppression du logo d'une société dans le
 *  bucket Supabase Storage « logos ». L'URL publique est ensuite enregistrée
 *  dans public.organizations.logo_url.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { supabase } from "../supabase";

export const LOGO_BUCKET = "logos";
export const LOGO_MAX_BYTES = 1024 * 1024; // 1 Mo
export const LOGO_MAX_SIDE = 512; // côté maximal en pixels

/**
 * Formats acceptés en entrée. Le fichier déposé est TOUJOURS converti en PNG :
 * c'est le seul format que l'incorporation dans un PDF sait gérer de façon
 * fiable, et cela garantit un rendu identique sur tous les navigateurs.
 */
const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
];

/** Cache mémoire : évite de re-télécharger la ligne organisation à chaque rendu. */
const logoCache = new Map<string, string | null>();

export function invalidateOrganizationLogo(orgId: string | null): void {
  if (orgId) logoCache.delete(orgId);
}

export function getCachedOrganizationLogo(orgId: string | null): string | null {
  if (!orgId) return null;
  return logoCache.has(orgId) ? logoCache.get(orgId) ?? null : null;
}

export function setCachedOrganizationLogo(orgId: string, url: string | null): void {
  logoCache.set(orgId, url);
}

/**
 * Redimensionne une image pour que son côté le plus long ne dépasse pas
 * LOGO_MAX_SIDE, et la convertit en PNG.
 */
async function resizeImage(file: File, maxSide: number = LOGO_MAX_SIDE): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.max(bitmap.width, bitmap.height);
  const scale = ratio > maxSide ? maxSide / ratio : 1;
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de préparer l'image.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png", 0.92)
  );
  if (!blob) throw new Error("Impossible de convertir l'image.");
  return blob;
}

/** Dépose le logo d'une société et renvoie son URL publique. */
export async function uploadOrganizationLogo(
  organizationId: string,
  file: File
): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error("Format non accepté. Utilisez PNG, JPG, WEBP ou GIF.");
  }
  if (file.size > LOGO_MAX_BYTES) {
    throw new Error("Le fichier dépasse 1 Mo.");
  }

  const blob = await resizeImage(file);
  if (blob.size > LOGO_MAX_BYTES) {
    throw new Error("L'image est trop lourde, même après redimensionnement.");
  }

  const path = `${organizationId}/logo-${Date.now()}.png`;
  const { error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, blob, { upsert: true, contentType: "image/png" });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Extrait le chemin de stockage à partir d'une URL publique. */
export function logoPathFromUrl(url: string): string | null {
  const m = url.match(/\/storage\/v1\/object\/public\/logos\/(.+)$/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/** Supprime le fichier du bucket (best effort : l'échec n'empêche pas la suppression du champ). */
export async function deleteLogoFile(url: string): Promise<void> {
  const path = logoPathFromUrl(url);
  if (!path) return;
  try {
    await supabase.storage.from(LOGO_BUCKET).remove([path]);
  } catch {
    /* le fichier restera dans le bucket, sans conséquence fonctionnelle */
  }
}

/** Enregistre (ou efface) l'URL du logo dans la ligne organization. */
export async function setOrganizationLogoUrl(
  organizationId: string,
  url: string | null
): Promise<void> {
  const { error } = await supabase
    .from("organizations")
    .update({ logo_url: url })
    .eq("id", organizationId);
  if (error) throw new Error(error.message);
  setCachedOrganizationLogo(organizationId, url);
}

/**
 * Charge l'image du logo en base64 (data URL) pour l'incorporer dans un PDF.
 * Retourne null si le logo est absent ou si l'image ne peut pas être lue.
 */
export async function fetchLogoAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
