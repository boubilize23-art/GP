import { useRef, useState } from "react";
import { Building2, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import {
  LOGO_MAX_BYTES,
  deleteLogoFile,
  setOrganizationLogoUrl,
  uploadOrganizationLogo,
} from "../lib/organizationLogo";

interface Props {
  organizationId: string;
  logoUrl: string | null;
  companyName?: string;
  canEdit: boolean;
  onChanged: (url: string | null) => void;
}

/**
 * Dépôt du logo de la société (Paramètres → Organisation).
 * Le logo apparaît ensuite automatiquement sur les factures et les rapports PDF.
 */
export default function LogoUploader({
  organizationId,
  logoUrl,
  companyName,
  canEdit,
  onChanged,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const initials = (companyName || "GP")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  async function handleFile(file: File) {
    setError(null);
    setSuccess(null);
    if (!canEdit) return;

    setBusy(true);
    try {
      const url = await uploadOrganizationLogo(organizationId, file);
      await setOrganizationLogoUrl(organizationId, url);
      onChanged(url);
      setSuccess("Logo enregistré. Il apparaîtra sur vos factures et vos rapports.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le dépôt du logo a échoué.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      if (logoUrl) await deleteLogoFile(logoUrl);
      await setOrganizationLogoUrl(organizationId, null);
      onChanged(null);
      setSuccess("Logo supprimé.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "La suppression a échoué.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-slate-800 font-bold text-base">Logo de la société</h3>
        {logoUrl && canEdit && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600
                       hover:text-red-700 hover:bg-red-50 rounded-lg px-2.5 py-1.5
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={13} />
            Supprimer
          </button>
        )}
      </div>
      <p className="text-slate-500 text-xs mb-4">
        Il sera imprimé sur vos factures et en tête de vos rapports PDF. Format carré ou
        rectangulaire, fond transparent de préférence.
      </p>

      <div className="flex items-start gap-5">
        {/* Aperçu */}
        <div
          className="w-24 h-24 shrink-0 rounded-2xl border border-slate-200 bg-slate-50
                     flex items-center justify-center overflow-hidden"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo de la société"
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <div className="text-center text-slate-400">
              <Building2 size={22} className="mx-auto mb-1" />
              <span className="text-[10px] font-bold tracking-wide">{initials}</span>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="flex-1 min-w-0">
          {canEdit ? (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) void handleFile(f);
                }}
                onClick={() => inputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed px-4 py-4 text-center cursor-pointer
                            transition-colors ${
                              dragging
                                ? "border-violet-400 bg-violet-50"
                                : "border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50/40"
                            } ${busy ? "opacity-60 pointer-events-none" : ""}`}
              >
                {busy ? (
                  <Loader2 size={20} className="mx-auto text-violet-500 animate-spin" />
                ) : (
                  <Upload size={20} className="mx-auto text-violet-500 mb-1.5" />
                )}
                <p className="text-sm font-semibold text-slate-700">
                  {busy ? "Envoi en cours…" : "Déposer un logo ici"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  ou cliquez pour parcourir vos fichiers
                </p>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                PNG, JPG, WEBP ou GIF — {Math.round(LOGO_MAX_BYTES / 1024 / 1024)} Mo maximum.
                L&apos;image est automatiquement réduite à 512 px.
              </p>
            </>
          ) : (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-4 text-sm text-slate-500">
              Seul l&apos;administrateur de la société peut modifier le logo.
            </div>
          )}

          {error && (
            <p className="mt-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              {success}
            </p>
          )}
        </div>
      </div>

      {!logoUrl && canEdit && (
        <p className="mt-4 text-[11px] text-slate-400 flex items-start gap-1.5">
          <ImageIcon size={12} className="mt-0.5 shrink-0" />
          Sans logo, les factures utilisent le nom de la société et un monogramme.
        </p>
      )}
    </div>
  );
}
