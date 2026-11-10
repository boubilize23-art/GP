import { useState, useEffect, useRef, useCallback, FormEvent } from "react";
import {
  Eye, EyeOff, UserPlus, TrendingUp, AlertCircle,
  User, Lock, Mail, Building2, ChevronLeft, CheckCircle2,
  Key, Info, Crown, BarChart2, UserCheck, Save, X, Loader2, Clock,
} from "lucide-react";import { useAuth, RegisterData, UserRole, SignupKeyInfo } from "../../context/AuthContext";
import { saveDraft, loadDraft, clearDraft, obfuscate, deobfuscate } from "../../utils/formDraft";

interface RegisterPageProps {
  onGoLogin: () => void;
}

// ── Brouillon de saisie ───────────────────────────────────────────────────────
// Conserve la saisie en cours pour survivre à un rafraîchissement (F5) ou à la
// fermeture de l'onglet.
const DRAFT_KEY = "gp_register_draft_v1";

interface RegisterDraft {
  step: 1 | 2;
  selectedRole: UserRole | null;
  form: RegisterData;
  adminKey?: string;
  adminKeyConfirmed?: boolean;
  adminKeyLocked?: boolean;
  /** Mot de passe obfusqué (jamais en clair dans le stockage) */
  password: string;
}

const EMPTY_FORM: RegisterData = {
  username: "", fullName: "", email: "",
  password: "", confirmPassword: "",
  company: "", role: "user", organizationKey: "",
};

/**
 * Un brouillon ne compte comme « saisie en cours » que s'il contient une vraie
 * information saisie par l'utilisateur (le champ `role` est toujours rempli,
 * il ne doit donc pas être comptabilisé).
 */
function hasUserInput(selectedRole: UserRole | null, form: RegisterData): boolean {
  if (selectedRole) return true;
  return !!(
    form.fullName || form.username || form.email ||
    form.company || form.password || form.organizationKey
  );
}

function draftHasContent(draft: RegisterDraft | null): boolean {
  if (!draft || !draft.form) return false;
  return hasUserInput(draft.selectedRole, draft.form);
}

// ── Jauge mot de passe ────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8 caractères minimum", ok: password.length >= 8 },
    { label: "Majuscule", ok: /[A-Z]/.test(password) },
    { label: "Minuscule", ok: /[a-z]/.test(password) },
    { label: "Chiffre", ok: /\d/.test(password) },
    { label: "Caractère spécial", ok: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const levels = ["", "Très faible", "Faible", "Moyen", "Fort", "Très fort"];
  const colors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-emerald-500"];
  const textColors = ["", "text-red-400", "text-orange-400", "text-yellow-400", "text-blue-400", "text-emerald-400"];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : "bg-white/10"}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${textColors[score]}`}>{levels[score]}</span>
        <div className="flex gap-2 flex-wrap justify-end">
          {checks.map((c, i) => (
            <span key={i} title={c.label} className={`text-xs px-1.5 py-0.5 rounded border ${c.ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/10 text-slate-500"}`}>
              {c.ok ? "✓" : "○"} {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Rôle card ─────────────────────────────────────────────────────────────────
const ROLES = [
  {
    value: "admin" as UserRole,
    label: "Administrateur",
    icon: Crown,
    emoji: "👑",
    color: "from-violet-500 to-indigo-600",
    border: "border-violet-500/60",
    bg: "bg-violet-500/10",
    text: "text-violet-300",
    desc: "Accès complet • Crée sa propre société • Gère managers et utilisateurs",
    keyLabel: "Clé d'inscription administrateur",
    keyInfo: "L'administrateur principal de la plateforme vous a communiqué une clé à usage unique. Elle vous autorise à créer votre société. Elle sera consommée au moment de la création de votre compte : elle ne pourra plus jamais servir.",
  },
  {
    value: "manager" as UserRole,
    label: "Manager",
    icon: BarChart2,
    emoji: "📊",
    color: "from-blue-500 to-cyan-500",
    border: "border-blue-500/60",
    bg: "bg-blue-500/10",
    text: "text-blue-300",
    desc: "Gestion des opérations • Valide les bons d'achat • Supervise les utilisateurs",
    keyLabel: "Clé d'organisation (fournie par l'admin)",
    keyInfo: "Votre administrateur vous a communiqué une clé. Saisissez-la ici pour rejoindre son organisation.",
  },
  {
    value: "user" as UserRole,
    label: "Utilisateur",
    icon: UserCheck,
    emoji: "👤",
    color: "from-emerald-500 to-teal-500",
    border: "border-emerald-500/60",
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    desc: "Saisie des ventes et demandes d'achat • Les achats nécessitent une validation",
    keyLabel: "Clé d'organisation (fournie par l'admin ou le manager)",
    keyInfo: "Votre administrateur ou manager vous a communiqué une clé. Saisissez-la pour rejoindre l'organisation.",
  },
];

/**
 * Messages d'erreur renvoyés par la base quand une clé est refusée.
 * La base est l'arbitre : le formulaire ne fait que traduire sa réponse.
 */
const KEY_ERRORS: Record<string, string> = {
  invalide:
    "Cette clé est invalide. Vérifiez la clé communiquée par votre administrateur.",
  utilisee:
    "Cette clé d'inscription a déjà été utilisée : elle ne peut servir qu'une fois.",
  expiree:
    "Cette clé est expirée. Demandez-en une nouvelle à votre administrateur.",
  revoquee:
    "Cette clé a été révoquée par votre administrateur.",
  licence_expiree:
    "La licence de la société est expirée : contactez l'administrateur principal de la plateforme.",
};

export default function RegisterPage({ onGoLogin }: RegisterPageProps) {
  const { register, checkSignupKey } = useAuth();

  // ── Reprise d'une saisie en cours ──────────────────────────────────────────
  // Le brouillon est lu une seule fois au montage : il restaure l'étape, le rôle
  // choisi, les champs saisis et la clé d'organisation même après un F5.
  const [draft] = useState<RegisterDraft | null>(() => loadDraft<RegisterDraft>(DRAFT_KEY));
  const [restoredNotice, setRestoredNotice] = useState<boolean>(() => draftHasContent(draft));
  const submittedRef = useRef(false);

  const [step, setStep] = useState<1 | 2>(() => (draft?.step === 2 && draft?.selectedRole ? 2 : 1));
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(() => draft?.selectedRole ?? null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  /** Vrai uniquement si la confirmation par email est réactivée sur le projet Supabase */
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  /** Ce que la BASE dit de la clé saisie : type, rôle, poste, durée */
  const [keyInfo, setKeyInfo] = useState<SignupKeyInfo | null>(null);
  const [checkingKey, setCheckingKey] = useState(false);

  const [form, setForm] = useState<RegisterData>(() => {
    const savedPassword = draft?.password ? deobfuscate(draft.password) : "";
    return {
      ...EMPTY_FORM,
      ...(draft?.form ?? {}),
      role: draft?.selectedRole ?? "user",
      password: savedPassword,
      confirmPassword: savedPassword,
    };
  });

  // ── Sauvegarde automatique de la saisie ────────────────────────────────────
  // Chaque modification est enregistrée (avec un léger délai pour éviter d'écrire
  // à chaque frappe) : un F5, un crash ou la fermeture de l'onglet ne perd rien.
  useEffect(() => {
    if (submittedRef.current) {
      clearDraft(DRAFT_KEY);
      return;
    }

    const hasContent = hasUserInput(selectedRole, form);

    if (!hasContent) {
      clearDraft(DRAFT_KEY);
      return;
    }

    const timer = setTimeout(() => {
      saveDraft<RegisterDraft>(DRAFT_KEY, {
        step,
        selectedRole,
        form: { ...form, password: "", confirmPassword: "" },
        password: form.password ? obfuscate(form.password) : "",
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [step, selectedRole, form]);

  // Le message « saisie restaurée » disparaît tout seul après quelques secondes
  useEffect(() => {
    if (!restoredNotice) return;
    const timer = setTimeout(() => setRestoredNotice(false), 8000);
    return () => clearTimeout(timer);
  }, [restoredNotice]);

  const set = (k: keyof RegisterData, v: string) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setFormError(null);
  };

  // ── Repartir de zéro (efface le brouillon) ─────────────────────────────────
  const handleResetDraft = () => {
    clearDraft(DRAFT_KEY);
    setStep(1);
    setSelectedRole(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setRestoredNotice(false);
  };

  const roleInfo = ROLES.find((r) => r.value === selectedRole);

  // ── Vérification de la clé auprès de la BASE ───────────────────────────────
  // C'est la base qui sait ce que la clé accorde : type de clé, rôle, poste
  // visé et durée de licence. L'écran se contente de l'afficher.
  const verifyKey = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (code.length < 4) {
        setKeyInfo(null);
        return;
      }
      setCheckingKey(true);
      const info = await checkSignupKey(code);
      setKeyInfo(info);
      setCheckingKey(false);
    },
    [checkSignupKey],
  );

  // Vérification automatique quand la clé change (avec un léger délai)
  useEffect(() => {
    const code = (form.organizationKey ?? "").trim();
    if (!code) {
      setKeyInfo(null);
      return;
    }
    const timer = setTimeout(() => void verifyKey(code), 500);
    return () => clearTimeout(timer);
  }, [form.organizationKey, verifyKey]);

  /** Rôle accordé par la clé (jamais choisi à la main) */
  const roleFromKey = (info: SignupKeyInfo | null): UserRole | null => {
    if (!info?.ok) return null;
    if (info.type === "admin_societe") return "admin";
    if (info.type === "invitation") return info.role === "manager" ? "manager" : "user";
    return null;
  };

  // ── Step 1 : Saisie de la clé (c'est elle qui décide du rôle) ─────────────
  const handleNextStep = async () => {
    const code = (form.organizationKey ?? "").trim();
    if (!code) {
      setFormError("Veuillez saisir la clé qui vous a été communiquée.");
      return;
    }
    setFormError(null);
    setCheckingKey(true);
    const info = await checkSignupKey(code);
    setKeyInfo(info);
    setCheckingKey(false);

    if (!info.ok) {
      setFormError(
        KEY_ERRORS[info.reason ?? "invalide"] ??
          "Cette clé est invalide ou a déjà été utilisée.",
      );
      return;
    }
    const role = roleFromKey(info);
    if (!role) {
      setFormError("Cette clé n'accorde aucun accès. Contactez votre administrateur.");
      return;
    }
    setSelectedRole(role);
    setForm((prev) => ({ ...prev, role }));
    setStep(2);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.organizationKey?.trim()) {
      setFormError(
        selectedRole === "admin"
          ? "Veuillez entrer la clé d'inscription administrateur communiquée par l'administrateur principal de la plateforme."
          : "Veuillez entrer la clé d'invitation fournie par votre administrateur.",
      );
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    const result = await register({ ...form, role: selectedRole ?? "user" });
    setLoading(false);
    if (!result.success) {
      setFormError(result.error ?? "Erreur inconnue.");
    } else {
      // Compte créé : le brouillon n'a plus lieu d'être
      submittedRef.current = true;
      clearDraft(DRAFT_KEY);
      setPendingConfirmation(!!result.pendingConfirmation);
      setSuccess(true);
    }
  };

  // ── Écran succès ──────────────────────────────────────────────────────────
  if (success) {
    // Cas particulier : la confirmation par email est activée sur le projet
    if (pendingConfirmation) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6">
          <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-500/30">
              <Mail size={36} className="text-white" />
            </div>
            <h2 className="text-2xl font-black text-white mb-3">Vérifiez votre email</h2>
            <p className="text-slate-400 text-sm mb-2">
              Bienvenue <span className="text-white font-bold">{form.fullName}</span> 👋
            </p>
            <p className="text-slate-400 text-sm mb-6">
              Un lien de confirmation a été envoyé à{" "}
              <span className="text-white font-semibold">{form.email}</span>.
              Cliquez sur ce lien pour activer votre compte, puis revenez vous connecter.
            </p>
            <p className="text-xs text-slate-500 mb-6">
              💡 Pensez à vérifier vos courriers indésirables.
            </p>

            <button
              onClick={onGoLogin}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl text-white font-bold text-sm transition shadow-lg"
            >
              Se connecter →
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6">
        <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
            <CheckCircle2 size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Compte créé avec succès !</h2>
          <p className="text-slate-400 mb-2">
            Bienvenue <span className="text-white font-bold">{form.fullName}</span> 👋
          </p>
          <p className="text-slate-400 text-sm mb-6">
            Votre espace GestioPro est prêt.
          </p>

          {/* Récapitulatif */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left mb-6 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs">Rôle</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                selectedRole === "admin" ? "bg-violet-500/20 text-violet-300" :
                selectedRole === "manager" ? "bg-blue-500/20 text-blue-300" :
                "bg-emerald-500/20 text-emerald-300"
              }`}>
                {roleInfo?.emoji} {roleInfo?.label}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs">Utilisateur</span>
              <span className="text-white text-xs font-semibold">@{form.username}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs">Email</span>
              <span className="text-white text-xs">{form.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs">Entreprise</span>
              <span className="text-white text-xs">{form.company}</span>
            </div>
            {selectedRole === "admin" && (
              <div className="pt-2 border-t border-white/10">
                <p className="text-slate-400 text-xs mb-1">🔑 Votre clé d'organisation :</p>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Elle a été créée automatiquement, en aléatoire, pour la société
                  <span className="text-white font-semibold"> {form.company || "créée"}</span>.
                  Vous la retrouverez dans <span className="text-violet-300">Paramètres → Organisation</span>
                  dès votre première connexion : c'est elle que vous
                  partagerez à vos équipes (une seule clé pour toute la société).
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onGoLogin}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl text-white font-bold text-sm transition shadow-lg"
          >
            Se connecter →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      {/* ── Panneau gauche ── */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <TrendingUp size={22} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-2xl">GestioPro</p>
              <p className="text-slate-400 text-sm">Gestion Commerciale</p>
            </div>
          </div>

          <h2 className="text-3xl font-black text-white mb-4">
            Rejoignez<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
              votre organisation
            </span>
          </h2>

          {/* Schéma hiérarchique */}
          <div className="space-y-2 mb-8">
            <p className="text-slate-400 text-sm mb-3">Hiérarchie des rôles :</p>
            {/* Admin */}
            <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/30 rounded-xl p-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm flex-shrink-0">👑</div>
              <div className="flex-1">
                <p className="text-white text-sm font-bold">Administrateur</p>
                <p className="text-slate-400 text-xs">Crée la clé • Dirige tout</p>
              </div>
              <Key size={14} className="text-violet-400" />
            </div>
            {/* Arrow */}
            <div className="ml-4 text-slate-600 text-xs pl-4 border-l-2 border-dashed border-slate-700 py-1">
              ↓ Partage la clé
            </div>
            {/* Manager */}
            <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 ml-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm flex-shrink-0">📊</div>
              <div className="flex-1">
                <p className="text-white text-sm font-bold">Manager</p>
                <p className="text-slate-400 text-xs">Reçoit la clé • Valide les achats</p>
              </div>
            </div>
            {/* Arrow */}
            <div className="ml-8 text-slate-600 text-xs pl-4 border-l-2 border-dashed border-slate-700 py-1">
              ↓ Partage la clé
            </div>
            {/* User */}
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 ml-8">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-sm flex-shrink-0">👤</div>
              <div className="flex-1">
                <p className="text-white text-sm font-bold">Utilisateur</p>
                <p className="text-slate-400 text-xs">Reçoit la clé • Demande d'achat</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
            <p className="text-amber-300 text-xs flex items-start gap-2">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              <span><strong>Une seule clé</strong> relie toute l'organisation. L'administrateur la crée et la partage avec son équipe.</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Formulaire droite ── */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 lg:p-10 overflow-y-auto">
        <div className="w-full max-w-lg">
          <button onClick={onGoLogin} className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-6 text-sm">
            <ChevronLeft size={16} /> Retour à la connexion
          </button>

          {/* Indicateur d'étapes */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition ${step >= 1 ? "bg-violet-600 text-white" : "bg-white/10 text-slate-400"}`}>1</div>
            <div className={`flex-1 h-0.5 rounded transition ${step >= 2 ? "bg-violet-600" : "bg-white/10"}`} />
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition ${step >= 2 ? "bg-violet-600 text-white" : "bg-white/10 text-slate-400"}`}>2</div>
            <div className="text-slate-500 text-xs ml-2">
              {step === 1 ? "Votre clé d'accès" : "Informations du compte"}
            </div>
          </div>

          {/* Sauvegarde automatique + remise à zéro */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <span className="flex items-center gap-1.5 text-xs text-emerald-400/90">
              <Save size={12} />
              Saisie enregistrée automatiquement
            </span>
            <button
              type="button"
              onClick={handleResetDraft}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition"
              title="Effacer la saisie enregistrée et recommencer à zéro"
            >
              <X size={12} />
              Tout effacer
            </button>
          </div>

          {/* Bandeau « saisie restaurée » */}
          {restoredNotice && (
            <div className="flex items-start gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl mb-5">
              <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-300 text-sm flex-1">
                Saisie restaurée — vous continuez exactement où vous en étiez.
              </p>
              <button
                type="button"
                onClick={() => setRestoredNotice(false)}
                className="text-slate-500 hover:text-white transition"
                aria-label="Fermer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

            {/* ═══ ÉTAPE 1 : Saisie de la clé ═══ */}
            {step === 1 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-white mb-1">Votre clé d'accès</h2>
                  <p className="text-slate-400 text-sm">
                    La clé communiquée par votre administrateur détermine votre rôle et votre poste.
                    C'est la plateforme qui la vérifie : elle vous dira exactement ce qu'elle accorde.
                  </p>
                </div>

                {/* Champ de saisie de la clé */}
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Clé d'inscription ou d'invitation
                  </label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={form.organizationKey ?? ""}
                      onChange={(e) => set("organizationKey", e.target.value.toUpperCase())}
                      placeholder="XXXX-XXXX-XXXX"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm font-semibold tracking-wider focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                    />
                    {checkingKey && (
                      <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-violet-400 animate-spin" />
                    )}
                  </div>
                </div>

                {/* Ce que la BASE accorde — c'est elle qui décide */}
                {keyInfo?.ok && (() => {
                  const role = roleFromKey(keyInfo);
                  const r = ROLES.find((x) => x.value === role);
                  const Icon = r?.icon ?? Key;
                  return (
                    <div className={`rounded-2xl border p-4 mb-5 ${r?.bg} ${r?.border}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${r?.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon size={18} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm">
                            {keyInfo.type === "admin_societe"
                              ? "Administrateur de société"
                              : keyInfo.role === "manager"
                                ? "Directeur de poste"
                                : "Utilisateur"}
                          </p>
                          <ul className="text-slate-300 text-xs mt-1.5 space-y-1">
                            {keyInfo.type === "admin_societe" && (
                              <>
                                <li className="flex items-center gap-1.5">
                                  <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                                  Votre société sera créée automatiquement
                                </li>
                                <li className="flex items-center gap-1.5">
                                  <Clock size={12} className="text-emerald-400 flex-shrink-0" />
                                  Licence de {keyInfo.days ?? 30} jours
                                </li>
                              </>
                            )}
                            {keyInfo.type === "invitation" && (
                              <>
                                {keyInfo.organization && (
                                  <li className="flex items-center gap-1.5">
                                    <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                                    Société : {keyInfo.organization}
                                  </li>
                                )}
                                {keyInfo.poste && (
                                  <li className="flex items-center gap-1.5">
                                    <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                                    Poste : {keyInfo.poste}
                                  </li>
                                )}
                              </>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {keyInfo && !keyInfo.ok && !formError && (
                  <div className="flex items-start gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-5">
                    <AlertCircle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-300 text-sm">
                      {KEY_ERRORS[keyInfo.reason ?? "invalide"] ?? "Cette clé est invalide."}
                    </p>
                  </div>
                )}

                {formError && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
                    <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{formError}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={checkingKey || !keyInfo?.ok}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white font-bold text-sm transition shadow-lg"
                >
                  {checkingKey ? "Vérification…" : "Continuer →"}
                </button>

                <p className="text-center text-sm text-slate-500 mt-5">
                  Déjà inscrit ?{" "}
                  <button onClick={onGoLogin} className="text-violet-400 hover:text-violet-300 font-bold transition">
                    Se connecter →
                  </button>
                </p>
              </div>
            )}

            {/* ═══ ÉTAPE 2 : Formulaire ═══ */}
            {step === 2 && selectedRole && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-3 mb-5">
                  <button type="button" onClick={() => { setStep(1); setFormError(null); }} className="text-slate-400 hover:text-white transition">
                    <ChevronLeft size={18} />
                  </button>
                  <div>
                    <h2 className="text-xl font-black text-white">Créer votre compte</h2>
                    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mt-1 ${roleInfo?.bg} ${roleInfo?.text} border ${roleInfo?.border}`}>
                      {roleInfo?.emoji} {roleInfo?.label}
                    </div>
                  </div>
                </div>

                {/* Nom complet */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Nom complet *</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={form.fullName} onChange={(e) => set("fullName", e.target.value)}
                      placeholder="Jean Dupont" required
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition" />
                  </div>
                </div>

                {/* Username + Entreprise */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Identifiant *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                      <input type="text" value={form.username}
                        onChange={(e) => set("username", e.target.value.toLowerCase().replace(/\s/g, ""))}
                        placeholder="jean_dupont" required
                        className="w-full pl-8 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">
                      {selectedRole === "admin" ? "Entreprise *" : "Entreprise"}
                    </label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      {selectedRole === "admin" ? (
                        <input type="text" value={form.company} onChange={(e) => set("company", e.target.value)}
                          placeholder="Ma Société" required
                          className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition" />
                      ) : (
                        <input type="text" value={keyInfo?.organization ?? ""} readOnly
                          className="w-full pl-10 pr-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-slate-400 text-sm cursor-not-allowed" />
                      )}
                    </div>
                    {selectedRole !== "admin" && (
                      <p className="text-slate-500 text-xs mt-1">Votre société est définie par votre clé.</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Email *</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                      placeholder="jean@societe.com" required
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition" />
                  </div>
                </div>

                {/* ═══ RAPPEL DE LA CLÉ (déjà vérifiée à l'étape 1) ═══ */}
                <div className={`rounded-2xl border p-4 space-y-3 ${roleInfo?.bg} ${roleInfo?.border}`}>
                  <div className="flex items-start gap-2">
                    <Key size={16} className={`${roleInfo?.text} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${roleInfo?.text}`}>
                        {keyInfo?.type === "admin_societe"
                          ? "Clé d'inscription administrateur"
                          : "Clé d'invitation"}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {keyInfo?.type === "admin_societe"
                          ? "Elle autorise la création de votre société et de sa licence. Elle ne pourra plus jamais servir."
                          : "Elle vous rattache à votre société, au poste prévu par votre administrateur."}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={form.organizationKey ?? ""}
                      readOnly
                      className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/20 rounded-xl text-slate-300 font-mono text-sm font-bold tracking-widest"
                    />
                  </div>

                  <ul className="text-slate-400 text-xs space-y-1">
                    {keyInfo?.type === "admin_societe" && (
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
                        Licence de {keyInfo.days ?? 30} jours
                      </li>
                    )}
                    {keyInfo?.type === "invitation" && keyInfo.organization && (
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
                        Société : {keyInfo.organization}
                      </li>
                    )}
                    {keyInfo?.type === "invitation" && keyInfo.poste && (
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
                        Poste : {keyInfo.poste}
                      </li>
                    )}
                  </ul>
                </div>

                {/* Mot de passe */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Mot de passe *</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={showPass ? "text" : "password"} value={form.password}
                      onChange={(e) => set("password", e.target.value)} placeholder="••••••••" required
                      className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <PasswordStrength password={form.password} />
                </div>

                {/* Confirmer mot de passe */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Confirmer *</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={showConfirm ? "text" : "password"} value={form.confirmPassword}
                      onChange={(e) => set("confirmPassword", e.target.value)} placeholder="••••••••" required
                      className={`w-full pl-10 pr-10 py-2.5 bg-white/5 border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition ${form.confirmPassword && form.password !== form.confirmPassword ? "border-red-500/50" : "border-white/10"}`} />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition">
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">⚠ Les mots de passe ne correspondent pas</p>
                  )}
                  {form.confirmPassword && form.password === form.confirmPassword && (
                    <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1"><CheckCircle2 size={11} /> Mots de passe identiques</p>
                  )}
                </div>

                {/* Erreur globale */}
                {formError && (
                  <div className="flex items-start gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400 text-sm">{formError}</p>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 rounded-xl text-white font-bold text-sm transition shadow-lg shadow-violet-500/25 mt-2">
                  {loading ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : <UserPlus size={16} />}
                  {loading ? "Création en cours..." : "Créer mon compte"}
                </button>

                <p className="text-center text-sm text-slate-500 mt-4">
                  Déjà inscrit ?{" "}
                  <button onClick={onGoLogin} className="text-violet-400 hover:text-violet-300 font-bold transition">Se connecter →</button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
