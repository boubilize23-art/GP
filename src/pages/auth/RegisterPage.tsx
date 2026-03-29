import { useState, FormEvent } from "react";
import {
  Eye, EyeOff, UserPlus, TrendingUp, AlertCircle,
  User, Lock, Mail, Building2, ChevronLeft, CheckCircle2,
  Shield, Key, Copy, RefreshCw, Info, Crown, BarChart2, UserCheck,
} from "lucide-react";
import { useAuth, RegisterData, UserRole } from "../../context/AuthContext";

interface RegisterPageProps {
  onGoLogin: () => void;
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
    desc: "Accès complet • Crée sa propre clé d'organisation • Gère managers et utilisateurs",
    keyLabel: "Créer votre clé d'organisation",
    keyInfo: "En tant qu'administrateur, vous créez votre propre clé que vous partagerez avec vos managers et utilisateurs.",
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

// ── Génération de clé côté client (preview) ────────────────────────────────────
function generatePreviewKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${seg()}-${seg()}-${seg()}`;
}

export default function RegisterPage({ onGoLogin }: RegisterPageProps) {
  const { register, generateOrgKey } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Admin: clé générée et confirmée
  const [adminKey, setAdminKey] = useState(() => generatePreviewKey());
  const [adminKeyConfirm, setAdminKeyConfirm] = useState("");
  const [adminKeyConfirmed, setAdminKeyConfirmed] = useState(false);
  const [adminKeyLocked, setAdminKeyLocked] = useState(false);

  const [form, setForm] = useState<RegisterData>({
    username: "", fullName: "", email: "",
    password: "", confirmPassword: "",
    company: "", role: "user", organizationKey: "",
  });

  const set = (k: keyof RegisterData, v: string) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setFormError(null);
  };

  const roleInfo = ROLES.find((r) => r.value === selectedRole);

  // ── Step 1 : Choix du rôle ─────────────────────────────────────────────────
  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setForm((prev) => ({ ...prev, role, organizationKey: "" }));
    setAdminKeyConfirmed(false);
    setAdminKeyLocked(false);
    setAdminKeyConfirm("");
    setFormError(null);
  };

  const handleNextStep = () => {
    if (!selectedRole) { setFormError("Veuillez sélectionner un rôle."); return; }
    setFormError(null);
    setStep(2);
  };

  // ── Admin key management ──────────────────────────────────────────────────
  const handleGenerateNewKey = () => {
    if (adminKeyLocked) return;
    const newKey = generateOrgKey();
    setAdminKey(newKey);
    setAdminKeyConfirm("");
    setAdminKeyConfirmed(false);
    setCopiedKey(false);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(adminKey).then(() => {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    });
  };

  const handleConfirmAdminKey = () => {
    if (adminKeyConfirm.trim().toUpperCase() !== adminKey.toUpperCase()) {
      setFormError("La clé de confirmation ne correspond pas. Copiez exactement la clé générée.");
      return;
    }
    setAdminKeyConfirmed(true);
    setAdminKeyLocked(true);
    setForm((prev) => ({ ...prev, organizationKey: adminKey }));
    setFormError(null);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (selectedRole === "admin" && !adminKeyConfirmed) {
      setFormError("Veuillez confirmer votre clé d'organisation avant de créer le compte.");
      return;
    }
    if (selectedRole !== "admin" && !form.organizationKey?.trim()) {
      setFormError("Veuillez entrer la clé d'organisation fournie par votre administrateur.");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    const result = await register({ ...form, role: selectedRole ?? "user" });
    setLoading(false);
    if (!result.success) {
      setFormError(result.error ?? "Erreur inconnue.");
    } else {
      setSuccess(true);
    }
  };

  // ── Écran succès ──────────────────────────────────────────────────────────
  if (success) {
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
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-2 flex items-center justify-between">
                  <span className="text-violet-300 font-mono font-bold text-sm tracking-widest">{form.organizationKey}</span>
                  <button onClick={handleCopyKey} className="text-violet-400 hover:text-violet-300 transition">
                    <Copy size={14} />
                  </button>
                </div>
                <p className="text-slate-500 text-xs mt-1.5">Partagez cette clé avec vos managers et utilisateurs.</p>
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
          <div className="flex items-center gap-3 mb-6">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition ${step >= 1 ? "bg-violet-600 text-white" : "bg-white/10 text-slate-400"}`}>1</div>
            <div className={`flex-1 h-0.5 rounded transition ${step >= 2 ? "bg-violet-600" : "bg-white/10"}`} />
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition ${step >= 2 ? "bg-violet-600 text-white" : "bg-white/10 text-slate-400"}`}>2</div>
            <div className="text-slate-500 text-xs ml-2">
              {step === 1 ? "Choisir votre rôle" : "Informations du compte"}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

            {/* ═══ ÉTAPE 1 : Sélection du rôle ═══ */}
            {step === 1 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-white mb-1">Quel est votre rôle ?</h2>
                  <p className="text-slate-400 text-sm">Choisissez votre position dans l'organisation.</p>
                </div>

                <div className="space-y-3 mb-6">
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const isSelected = selectedRole === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => handleSelectRole(r.value)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                          isSelected
                            ? `${r.bg} ${r.border} shadow-lg`
                            : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                            <Icon size={18} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-white font-bold text-sm">{r.emoji} {r.label}</p>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                                  <CheckCircle2 size={13} className="text-white" />
                                </div>
                              )}
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">{r.desc}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {formError && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
                    <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{formError}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!selectedRole}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white font-bold text-sm transition shadow-lg"
                >
                  Continuer →
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
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Entreprise *</label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={form.company} onChange={(e) => set("company", e.target.value)}
                        placeholder="Ma Société" required
                        className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition" />
                    </div>
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

                {/* ═══ SECTION CLÉ D'ORGANISATION ═══ */}
                <div className={`rounded-2xl border p-4 space-y-3 ${roleInfo?.bg} ${roleInfo?.border}`}>
                  <div className="flex items-start gap-2">
                    <Key size={16} className={`${roleInfo?.text} flex-shrink-0 mt-0.5`} />
                    <div>
                      <p className={`text-sm font-bold ${roleInfo?.text}`}>{roleInfo?.keyLabel}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{roleInfo?.keyInfo}</p>
                    </div>
                  </div>

                  {/* ADMIN: Génération + Confirmation */}
                  {selectedRole === "admin" && (
                    <div className="space-y-3">
                      {/* Clé générée */}
                      <div>
                        <p className="text-xs text-slate-400 mb-1.5">Clé générée automatiquement :</p>
                        <div className="flex items-center gap-2">
                          <div className={`flex-1 bg-black/30 border ${adminKeyLocked ? "border-emerald-500/50" : "border-white/20"} rounded-xl px-4 py-2.5 flex items-center justify-between`}>
                            <span className="font-mono font-bold text-white tracking-widest text-sm">{adminKey}</span>
                            <div className="flex items-center gap-1.5 ml-2">
                              <button type="button" onClick={handleCopyKey}
                                className={`p-1.5 rounded-lg transition ${copiedKey ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-white/10 text-slate-400 hover:text-white"}`}
                                title="Copier la clé">
                                {copiedKey ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                              </button>
                              {!adminKeyLocked && (
                                <button type="button" onClick={handleGenerateNewKey}
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
                                  title="Générer une nouvelle clé">
                                  <RefreshCw size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        {copiedKey && <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1"><CheckCircle2 size={11} /> Clé copiée !</p>}
                      </div>

                      {/* Confirmation de la clé */}
                      {!adminKeyConfirmed ? (
                        <div>
                          <p className="text-xs text-slate-400 mb-1.5">
                            <span className="text-amber-400 font-semibold">⚠ Confirmez</span> en retapant la clé ci-dessus :
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={adminKeyConfirm}
                              onChange={(e) => { setAdminKeyConfirm(e.target.value.toUpperCase()); setFormError(null); }}
                              placeholder="XXXX-XXXX-XXXX"
                              className="flex-1 px-3 py-2.5 bg-black/30 border border-white/20 rounded-xl text-white placeholder-slate-600 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                            />
                            <button
                              type="button"
                              onClick={handleConfirmAdminKey}
                              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-white text-sm font-bold transition"
                            >
                              <Shield size={14} />
                            </button>
                          </div>
                          <p className="text-slate-500 text-xs mt-1.5">Cette confirmation garantit que vous avez bien noté votre clé.</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
                          <CheckCircle2 size={16} className="text-emerald-400" />
                          <div>
                            <p className="text-emerald-300 text-xs font-bold">Clé confirmée et verrouillée</p>
                            <p className="text-slate-500 text-xs">Modifiable une fois par mois maximum après création</p>
                          </div>
                        </div>
                      )}

                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                        <p className="text-amber-300 text-xs">
                          📋 <strong>Partagez cette clé</strong> avec vos managers et utilisateurs pour qu'ils puissent rejoindre votre organisation.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* MANAGER / USER: Saisie de la clé reçue */}
                  {(selectedRole === "manager" || selectedRole === "user") && (
                    <div>
                      <div className="relative">
                        <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={form.organizationKey ?? ""}
                          onChange={(e) => set("organizationKey", e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                          placeholder="XXXX-XXXX-XXXX"
                          maxLength={14}
                          className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/20 rounded-xl text-white placeholder-slate-600 font-mono text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                        />
                      </div>
                      <p className="text-slate-500 text-xs mt-1.5 flex items-center gap-1">
                        <Info size={11} />
                        Format : XXXX-XXXX-XXXX (fourni par votre administrateur)
                      </p>
                    </div>
                  )}
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
