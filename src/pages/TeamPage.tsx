import { useState } from "react";
import { useAuth, User, UserRole } from "../context/AuthContext";
import {
  Users, Shield, Key, Copy, CheckCircle,
  Crown, Briefcase, User as UserIcon, ChevronDown, ChevronRight,
  Search, Mail, Calendar, Building2,
  Ban, UserCheck, Trash2, AlertTriangle, X, Lock, Unlock, Clock,
} from "lucide-react";

const ROLE_CFG: Record<UserRole, { label: string; color: string; bg: string; border: string; icon: React.ReactNode; level: number }> = {
  admin:   { label: "Administrateur", color: "text-red-400",    bg: "bg-red-500/20",    border: "border-red-500/30",    icon: <Crown size={14} />,    level: 3 },
  manager: { label: "Manager",        color: "text-amber-400",  bg: "bg-amber-500/20",  border: "border-amber-500/30",  icon: <Briefcase size={14} />, level: 2 },
  user:    { label: "Utilisateur",    color: "text-blue-400",   bg: "bg-blue-500/20",   border: "border-blue-500/30",   icon: <UserIcon size={14} />,  level: 1 },
};

interface ConfirmModal {
  type: "block" | "unblock" | "delete";
  user: User;
}

export default function TeamPage() {
  const {
    currentUser, users, orgKeys,
    getVisibleUsers, getSubordinates,
    blockUser, unblockUser, deleteUser, canManageUser,
    resetUserPassword, setOrganizationBlocked,
  } = useAuth();

  const [search,        setSearch]        = useState("");
  const [filterRole,    setFilterRole]    = useState<"all" | UserRole>("all");
  const [filterStatus,  setFilterStatus]  = useState<"all" | "active" | "blocked">("all");
  const [copied,        setCopied]        = useState(false);
  const [expandedUser,  setExpandedUser]  = useState<string | null>(null);
  const [activeTab,     setActiveTab]     = useState<"team" | "org" | "all">("team");
  const [confirm,       setConfirm]       = useState<ConfirmModal | null>(null);
  const [actionMsg,     setActionMsg]     = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Réinitialisation du mot de passe d'un compte
  const [resetTarget,    setResetTarget]    = useState<User | null>(null);
  const [newPassword,    setNewPassword]    = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword,   setShowPassword]   = useState(false);
  const [showConfirm,    setShowConfirm]    = useState(false);
  const [resetError,     setResetError]     = useState<string | null>(null);
  const [resetLoading,   setResetLoading]   = useState(false);

  if (!currentUser) return null;

  const visibleUsers  = getVisibleUsers();
  const subordinates  = getSubordinates();

  const filtered = visibleUsers.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = filterRole   === "all" || u.role === filterRole;
    const matchStatus = filterStatus === "all"
      ? true
      : filterStatus === "active"  ? u.isActive
      : !u.isActive;
    return matchSearch && matchRole && matchStatus;
  });

  const admins   = visibleUsers.filter((u) => u.role === "admin");
  const managers = visibleUsers.filter((u) => u.role === "manager");
  const userList = visibleUsers.filter((u) => u.role === "user");

  const copyOrgKey = () => {
    navigator.clipboard.writeText(currentUser.organizationKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const flash = (type: "ok" | "err", text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 3500);
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    const { type, user } = confirm;
    setConfirm(null);

    // Les actions sont asynchrones : on attend le résultat réel de la base
    // avant d'afficher « bloqué » / « supprimé ».
    let res: { success: boolean; error?: string };
    if (type === "block")          res = await blockUser(user.id);
    else if (type === "unblock")   res = await unblockUser(user.id);
    else                           res = await deleteUser(user.id);

    if (res.success) flash("ok", type === "block" ? `${user.fullName} bloqué.` : type === "unblock" ? `${user.fullName} débloqué.` : `${user.fullName} supprimé.`);
    else flash("err", res.error ?? "Erreur.");
  };

  // ── Société d'appartenance d'un compte ──────────────────────────────────────
  const orgNameOf = (u: User): string =>
    orgKeys.find((o) => o.id === u.organizationId)?.organizationName ?? u.company;

  // ── Licence d'une société (administrateur principal) ───────────────────────
  const licenceInfo = (orgId: string) => {
    const org = orgKeys.find((o) => o.id === orgId);
    if (!org?.licenceExpiresAt) {
      return { state: "illimitee" as const, label: "Licence illimitée", days: null as number | null };
    }
    const ms = new Date(org.licenceExpiresAt).getTime() - Date.now();
    if (ms <= 0) return { state: "expiree" as const, label: "Licence expirée", days: 0 };
    return {
      state: "active" as const,
      label: `J-${Math.ceil(ms / 86400000)}`,
      days: Math.ceil(ms / 86400000),
    };
  };

  // ── Bloquer / débloquer toute une société ─────────────────────────────────
  const [busyOrg, setBusyOrg] = useState<string | null>(null);

  const handleToggleOrgBlock = async (orgId: string, orgName: string, blocked: boolean) => {
    setBusyOrg(orgId);
    const res = await setOrganizationBlocked(orgId, blocked);
    setBusyOrg(null);
    if (!res.success) {
      flash("err", res.error ?? "Erreur.");
      return;
    }
    flash(
      "ok",
      blocked
        ? `Société « ${orgName} » bloquée : ${res.count ?? 0} compte(s) ne peuvent plus écrire.`
        : `Société « ${orgName} » débloquée.`,
    );
  };

  // ── Réinitialisation du mot de passe ────────────────────────────────────────
  const openReset = (u: User) => {
    setResetTarget(u);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirm(false);
    setResetError(null);
  };

  const closeReset = () => {
    setResetTarget(null);
    setResetError(null);
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    if (newPassword.length < 8) {
      setResetError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setResetLoading(true);
    const res = await resetUserPassword(resetTarget.id, newPassword);
    setResetLoading(false);
    if (res.success) {
      flash("ok", `Mot de passe réinitialisé pour ${resetTarget.fullName}.`);
      closeReset();
    } else {
      setResetError(res.error ?? "Erreur lors de la réinitialisation.");
    }
  };

  const roleBadge = (role: UserRole) => {
    const cfg = ROLE_CFG[role];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  // ── Carte utilisateur ──────────────────────────────────────────────────────
  const UserCard = ({ u, depth = 0, flat = false }: { u: User; depth?: number; flat?: boolean }) => {
    const isExpanded  = expandedUser === u.id;
    const isMe        = u.id === currentUser.id;
    const canManage   = canManageUser(u.id);
    const mySubord    = flat ? [] : userList.filter((us) => us.managedBy === u.id);
    const supervisor  = users.find((mu) => mu.id === u.managedBy);
    const hasChildren = mySubord.length > 0;
    const companyLabel = currentUser.isSuperAdmin ? orgNameOf(u) : u.company;

    return (
      <div className={`${depth > 0 ? "ml-8 border-l-2 border-slate-700 pl-4" : ""}`}>
        <div className={`bg-slate-800/60 border rounded-xl p-4 mb-3 transition-all
          ${isMe ? "border-violet-500/50 shadow-lg shadow-violet-500/10" : !u.isActive ? "border-red-500/30 opacity-70" : "border-slate-700/50"}
          ${hasChildren ? "cursor-pointer hover:border-slate-600" : ""}`}
          onClick={() => hasChildren && setExpandedUser(isExpanded ? null : u.id)}>

          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Avatar + infos */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg
                  ${u.role === "admin" ? "bg-gradient-to-br from-red-500 to-rose-600 text-white" :
                    u.role === "manager" ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" :
                    "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"}`}>
                  {u.avatar}
                </div>
                {/* Indicateur statut */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-800 ${u.isActive ? "bg-emerald-400" : "bg-red-500"}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold text-sm">{u.fullName}</p>
                  {isMe && <span className="text-xs bg-violet-500/30 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30">Vous</span>}
                  {!u.isActive && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30 flex items-center gap-1"><Ban size={10} /> Bloqué</span>}
                </div>
                <p className="text-slate-400 text-xs">@{u.username} · {u.email}</p>
                {currentUser.isSuperAdmin && (
                  <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                    <Building2 size={11} /> {companyLabel}
                  </p>
                )}
              </div>
            </div>

            {/* Droite : rôle + actions */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {roleBadge(u.role)}
              {hasChildren && (
                <span className="text-slate-400 text-xs bg-slate-700 px-2 py-1 rounded-lg">
                  {mySubord.length} subordonné{mySubord.length > 1 ? "s" : ""}
                </span>
              )}

              {/* Boutons d'action (seulement si on peut gérer cet utilisateur) */}
              {canManage && !isMe && (
                <div className="flex items-center gap-1 ml-2">
                  {u.isActive ? (
                    <button
                      onClick={() => setConfirm({ type: "block", user: u })}
                      title="Bloquer le compte"
                      className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 transition-all"
                    >
                      <Lock size={13} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirm({ type: "unblock", user: u })}
                      title="Débloquer le compte"
                      className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all"
                    >
                      <Unlock size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => openReset(u)}
                    title="Réinitialiser le mot de passe"
                    className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border border-violet-500/30 transition-all"
                  >
                    <Key size={13} />
                  </button>
                  <button
                    onClick={() => setConfirm({ type: "delete", user: u })}
                    title="Supprimer le compte"
                    className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}

              {hasChildren && (
                isExpanded
                  ? <ChevronDown size={16} className="text-slate-400" />
                  : <ChevronRight size={16} className="text-slate-400" />
              )}
            </div>
          </div>

          {/* Détails expandés */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs mb-1 flex items-center gap-1"><Building2 size={12} /> {currentUser.isSuperAdmin ? "Société" : "Entreprise"}</p>
                <p className="text-white text-sm font-medium">{companyLabel}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs mb-1 flex items-center gap-1"><Calendar size={12} /> Dernière connexion</p>
                <p className="text-white text-sm font-medium">{new Date(u.lastLogin).toLocaleDateString("fr-FR")}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs mb-1 flex items-center gap-1"><Mail size={12} /> Email</p>
                <p className="text-white text-sm font-medium">{u.email}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs mb-1">Statut</p>
                <span className={`text-sm font-semibold flex items-center gap-1 ${u.isActive ? "text-emerald-400" : "text-red-400"}`}>
                  {u.isActive ? <><UserCheck size={13} /> Actif</> : <><Ban size={13} /> Bloqué</>}
                </span>
              </div>
              {supervisor && (
                <div className="bg-slate-900/50 rounded-lg p-3 col-span-2">
                  <p className="text-slate-500 text-xs mb-1">Supervisé par</p>
                  <p className="text-white text-sm font-medium">{supervisor.fullName} ({ROLE_CFG[supervisor.role].label})</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subordonnés */}
        {isExpanded && mySubord.map((sub) => (
          <UserCard key={sub.id} u={sub} depth={depth + 1} />
        ))}
      </div>
    );
  };

  // ── Rendu principal ────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Flash message */}
      {actionMsg && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border animate-fade-in
          ${actionMsg.type === "ok"
            ? "bg-emerald-900/90 border-emerald-500/50 text-emerald-200"
            : "bg-red-900/90 border-red-500/50 text-red-200"}`}>
          {actionMsg.type === "ok" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span className="text-sm font-medium">{actionMsg.text}</span>
        </div>
      )}

      {/* Modal de confirmation */}
      {confirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                ${confirm.type === "delete" ? "bg-red-500/20" : confirm.type === "block" ? "bg-amber-500/20" : "bg-emerald-500/20"}`}>
                {confirm.type === "delete" ? <Trash2 size={22} className="text-red-400" /> :
                 confirm.type === "block"  ? <Lock size={22} className="text-amber-400" /> :
                 <Unlock size={22} className="text-emerald-400" />}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  {confirm.type === "delete" ? "Supprimer le compte" :
                   confirm.type === "block"  ? "Bloquer le compte" : "Débloquer le compte"}
                </h3>
                <p className="text-slate-400 text-sm">{confirm.user.fullName} (@{confirm.user.username})</p>
              </div>
            </div>

            <div className={`rounded-xl p-4 mb-5 border
              ${confirm.type === "delete" ? "bg-red-500/10 border-red-500/30" :
                confirm.type === "block"  ? "bg-amber-500/10 border-amber-500/30" :
                "bg-emerald-500/10 border-emerald-500/30"}`}>
              <p className="text-sm text-slate-300">
                {confirm.type === "delete"
                  ? "⚠️ Cette action est irréversible. Le compte sera définitivement supprimé."
                  : confirm.type === "block"
                  ? "🔒 Ce compte sera bloqué. L'utilisateur ne pourra plus se connecter."
                  : "🔓 Ce compte sera réactivé. L'utilisateur pourra se reconnecter."}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <X size={15} /> Annuler
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all flex items-center justify-center gap-2
                  ${confirm.type === "delete" ? "bg-red-600 hover:bg-red-500" :
                    confirm.type === "block"  ? "bg-amber-600 hover:bg-amber-500" :
                    "bg-emerald-600 hover:bg-emerald-500"}`}
              >
                {confirm.type === "delete" ? <><Trash2 size={15} /> Supprimer</> :
                 confirm.type === "block"  ? <><Lock size={15} /> Bloquer</> :
                 <><Unlock size={15} /> Débloquer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de réinitialisation du mot de passe */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-violet-500/20">
                <Key size={22} className="text-violet-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Réinitialiser le mot de passe</h3>
                <p className="text-slate-400 text-sm">{resetTarget.fullName} (@{resetTarget.username})</p>
              </div>
            </div>

            <div className="rounded-xl p-4 mb-5 border bg-violet-500/10 border-violet-500/30">
              <p className="text-sm text-slate-300">
                🔑 L'email de récupération n'aboutit pas pour les clients externes : saisissez vous-même
                le nouveau mot de passe, puis transmettez-le au concerné.
              </p>
            </div>

            {/* Nouveau mot de passe */}
            <div className="mb-4">
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setResetError(null); }}
                  placeholder="8 caractères minimum"
                  autoComplete="new-password"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-4 pr-24 py-2.5 text-sm focus:outline-none focus:border-violet-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-700/70 rounded-lg px-2 py-1 transition-colors"
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </div>
            </div>

            {/* Confirmation du mot de passe */}
            <div className="mb-4">
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">Confirmer le mot de passe</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setResetError(null); }}
                  placeholder="Retapez le mot de passe"
                  autoComplete="new-password"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-4 pr-24 py-2.5 text-sm focus:outline-none focus:border-violet-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-700/70 rounded-lg px-2 py-1 transition-colors"
                >
                  {showConfirm ? "Masquer" : "Afficher"}
                </button>
              </div>
            </div>

            {resetError && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5">
                <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{resetError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeReset}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <X size={15} /> Annuler
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Key size={15} /> {resetLoading ? "Réinitialisation..." : "Réinitialiser"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
            Équipe & Organisation
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gérez les membres, rôles et permissions de votre organisation</p>
        </div>
      </div>

      {/* Règles de gestion (admin/manager) */}
      {(currentUser.role === "admin" || currentUser.role === "manager") && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/60 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown size={16} className="text-red-400" />
              <span className="text-red-400 font-bold text-sm">Administrateur</span>
            </div>
            <ul className="text-slate-400 text-xs space-y-1">
              <li>✅ Voit toute l'équipe</li>
              <li>✅ Bloque/débloque managers & utilisateurs</li>
              <li>✅ Supprime managers & utilisateurs</li>
              <li>✅ Approuve tous les bons d'achat</li>
            </ul>
          </div>
          <div className="bg-slate-800/60 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase size={16} className="text-amber-400" />
              <span className="text-amber-400 font-bold text-sm">Manager</span>
            </div>
            <ul className="text-slate-400 text-xs space-y-1">
              <li>✅ Voit ses utilisateurs</li>
              <li>✅ Bloque/débloque ses utilisateurs</li>
              <li>✅ Supprime ses utilisateurs</li>
              <li>✅ Approuve les bons d'achat</li>
            </ul>
          </div>
          <div className="bg-slate-800/60 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserIcon size={16} className="text-blue-400" />
              <span className="text-blue-400 font-bold text-sm">Utilisateur</span>
            </div>
            <ul className="text-slate-400 text-xs space-y-1">
              <li>✅ Saisit ventes & achats</li>
              <li>⚠️ Achats soumis pour approbation</li>
              <li>❌ Ne peut pas gérer l'équipe</li>
              <li>❌ Accès limité aux données</li>
            </ul>
          </div>
        </div>
      )}

      {/* Stats rapides */}
      <div className="grid grid-cols-4 gap-4">
        {(["admin", "manager", "user"] as UserRole[]).map((role) => {
          const cfg   = ROLE_CFG[role];
          const count = visibleUsers.filter((u) => u.role === role).length;
          const actif = visibleUsers.filter((u) => u.role === role && u.isActive).length;
          return (
            <div key={role} className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`flex items-center gap-1 font-semibold text-xs ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                <span className={`text-2xl font-black ${cfg.color}`}>{count}</span>
              </div>
              <p className="text-slate-500 text-xs">{actif} actif{actif > 1 ? "s" : ""}</p>
            </div>
          );
        })}
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 font-semibold text-xs flex items-center gap-1"><Ban size={12} /> Bloqués</span>
            <span className="text-2xl font-black text-red-400">{visibleUsers.filter((u) => !u.isActive).length}</span>
          </div>
          <p className="text-slate-500 text-xs">comptes inactifs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-800/60 border border-slate-700 rounded-xl p-1">
        {[
          { id: "team", label: "Membres & Hiérarchie", icon: <Users size={15} /> },
          { id: "org",  label: "Clé d'organisation",  icon: <Key size={15} />   },
          ...(currentUser.isSuperAdmin
            ? [{ id: "all", label: "Toutes les sociétés", icon: <Building2 size={15} /> }]
            : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "team" | "org" | "all")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all
              ${activeTab === tab.id ? "bg-violet-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Onglet Équipe ─────────────────────────────────────────────────────── */}
      {activeTab === "team" && (
        <div className="space-y-4">
          {/* Filtres */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un membre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as "all" | UserRole)}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
            >
              <option value="all">Tous les rôles</option>
              <option value="admin">Administrateurs</option>
              <option value="manager">Managers</option>
              <option value="user">Utilisateurs</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "blocked")}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs uniquement</option>
              <option value="blocked">Bloqués uniquement</option>
            </select>
          </div>

          {/* Hiérarchie ou liste filtrée */}
          {filterRole === "all" && search === "" && filterStatus === "all" ? (
            <div className="space-y-2">
              <p className="text-slate-500 text-xs uppercase tracking-widest mb-3">Structure hiérarchique</p>
              {admins.map((admin) => (
                <div key={admin.id}>
                  <UserCard u={admin} depth={0} />
                  {managers
                    .filter((m) => m.organizationKey === admin.organizationKey)
                    .map((mgr) => (
                      <div key={mgr.id} className="ml-8 border-l-2 border-amber-500/30 pl-4">
                        <UserCard u={mgr} depth={1} />
                        {userList
                          .filter((us) => us.managedBy === mgr.id)
                          .map((usr) => (
                            <div key={usr.id} className="ml-8 border-l-2 border-blue-500/30 pl-4">
                              <UserCard u={usr} depth={2} />
                            </div>
                          ))}
                      </div>
                    ))}
                  {/* Utilisateurs non rattachés à un manager */}
                  {userList
                    .filter((us) => !us.managedBy && us.organizationKey === admin.organizationKey)
                    .map((usr) => (
                      <div key={usr.id} className="ml-8 border-l-2 border-blue-500/30 pl-4">
                        <UserCard u={usr} depth={1} />
                      </div>
                    ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-slate-500 text-xs mb-3">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</p>
              {filtered.map((u) => <UserCard key={u.id} u={u} />)}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Search size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Aucun utilisateur trouvé</p>
                </div>
              )}
            </div>
          )}

          {/* Légende des actions */}
          {(currentUser.role === "admin" || currentUser.role === "manager") && (
            <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-xs font-semibold mb-3 flex items-center gap-2"><Shield size={13} /> Légende des actions disponibles</p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30"><Lock size={12} className="text-amber-400" /></div>
                  Bloquer le compte (connexion impossible)
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30"><Unlock size={12} className="text-emerald-400" /></div>
                  Débloquer le compte (réactiver l'accès)
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/30"><Trash2 size={12} className="text-red-400" /></div>
                  Supprimer définitivement le compte
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="p-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30"><Key size={12} className="text-violet-400" /></div>
                  Réinitialiser le mot de passe (8 caractères min.)
                </div>
              </div>
              <p className="text-slate-600 text-xs mt-3">
                {currentUser.role === "admin"
                  ? "En tant qu'administrateur, vous pouvez gérer tous les managers et utilisateurs."
                  : "En tant que manager, vous pouvez gérer uniquement les utilisateurs."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Clé d'organisation ──────────────────────────────────────────── */}
      {activeTab === "org" && (
        <div className="space-y-6">
          {/* Clé actuelle */}
          <div className="bg-slate-800/60 border border-violet-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <Key size={20} className="text-violet-400" />
              </div>
              <div>
                <h3 className="text-white font-bold">Clé d'organisation active</h3>
                <p className="text-slate-400 text-sm">Partagez cette clé avec vos managers et utilisateurs lors de leur inscription</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 font-mono text-lg font-bold text-violet-300 tracking-widest text-center">
                {currentUser.organizationKey}
              </div>
              <button
                onClick={copyOrgKey}
                className={`p-3 rounded-xl border transition-all ${copied ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"}`}
              >
                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
              </button>
            </div>

            {copied && (
              <p className="text-emerald-400 text-xs mt-2 text-center flex items-center justify-center gap-1">
                <CheckCircle size={12} /> Clé copiée dans le presse-papiers !
              </p>
            )}
          </div>

          {/* Guide d'invitation */}
          <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Mail size={18} className="text-violet-400" /> Guide d'invitation de l'équipe
            </h3>
            <div className="space-y-3">
              {[
                { n: 1, text: "Copiez votre clé d'organisation ci-dessus", sub: `Clé : ${currentUser.organizationKey}` },
                { n: 2, text: "Partagez-la avec votre équipe", sub: "Via email, messagerie ou en direct" },
                { n: 3, text: "Ils s'inscrivent sur GestioPro", sub: "Choisissent leur rôle (Manager ou Utilisateur)" },
                { n: 4, text: "Ils saisissent votre clé lors de l'inscription", sub: "Ils rejoignent automatiquement votre organisation" },
                { n: 5, text: "Ils apparaissent dans cet onglet", sub: "Vous pouvez alors les gérer depuis ici" },
              ].map(({ n, text, sub }) => (
                <div key={n} className="flex items-start gap-4 py-2">
                  <div className="w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">{n}</div>
                  <div>
                    <p className="text-white text-sm font-semibold">{text}</p>
                    {sub && <p className="text-slate-400 text-xs mt-0.5 font-mono">{sub}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Membres de l'org */}
          <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4">Membres de l'organisation ({subordinates.length + 1})</h3>
            <div className="space-y-2">
              {visibleUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                      ${u.role === "admin" ? "bg-red-500/20 text-red-400" :
                        u.role === "manager" ? "bg-amber-500/20 text-amber-400" :
                        "bg-blue-500/20 text-blue-400"}`}>
                      {u.avatar}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{u.fullName}</p>
                      <p className="text-slate-500 text-xs">@{u.username}</p>
                      {currentUser.isSuperAdmin && (
                        <p className="text-slate-500 text-xs flex items-center gap-1">
                          <Building2 size={11} /> {orgNameOf(u)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {roleBadge(u.role)}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                      {u.isActive ? "Actif" : "Bloqué"}
                    </span>
                    {u.id === currentUser.id && <span className="text-xs text-violet-400 font-semibold">Vous</span>}
                    {canManageUser(u.id) && (
                      <button
                        onClick={() => openReset(u)}
                        title="Réinitialiser le mot de passe"
                        className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border border-violet-500/30 transition-all"
                      >
                        <Key size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Onglet Toutes les sociétés (administrateur principal) ─────────────── */}
      {activeTab === "all" && currentUser.isSuperAdmin && (
        <div className="space-y-4">
          {/* Résumé plateforme */}
          <div className="bg-slate-800/40 border border-violet-500/30 rounded-xl p-4 flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Building2 size={17} className="text-violet-400" />
            </div>
            <p className="text-slate-400 text-xs">
              Vue administrateur principal : <span className="text-white font-semibold">{orgKeys.length}</span> société(s) ·
              {" "}<span className="text-white font-semibold">{users.length}</span> compte(s) au total.
            </p>
          </div>

          {/* Une carte par société */}
          {orgKeys.map((org) => {
            const members = users.filter((u) => u.organizationId === org.id);
            const lic = licenceInfo(org.id);
            const allBlocked = members.length > 0 && members.every((m) => !m.isActive);
            return (
              <div key={org.id} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-5">
                {/* En-tête société */}
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4 pb-4 border-b border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                      <Building2 size={18} className="text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{org.organizationName}</h3>
                      <p className="text-slate-400 text-xs font-mono tracking-widest">{org.key}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-slate-700/60 text-slate-300 px-2 py-1 rounded-lg">
                      {members.length} membre{members.length > 1 ? "s" : ""}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border
                      ${org.active
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                      {org.active ? "Active" : "Inactive"}
                    </span>

                    {/* Licence de la société */}
                    <span
                      title={
                        lic.state === "illimitee"
                          ? "Licence illimitée"
                          : lic.state === "expiree"
                            ? `Licence expirée le ${new Date(org.licenceExpiresAt as string).toLocaleDateString("fr-FR")} — écritures bloquées, données conservées`
                            : `Licence valide jusqu'au ${new Date(org.licenceExpiresAt as string).toLocaleDateString("fr-FR")}`
                      }
                      className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1
                        ${lic.state === "illimitee"
                          ? "bg-sky-500/20 text-sky-400 border-sky-500/30"
                          : lic.state === "expiree"
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"}`}
                    >
                      <Clock size={10} /> {lic.label}
                    </span>

                    {/* Bloquer / débloquer toute la société */}
                    <button
                      type="button"
                      disabled={busyOrg === org.id || members.length === 0}
                      onClick={() => handleToggleOrgBlock(org.id, org.organizationName, !allBlocked)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 ${
                        allBlocked
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                          : "bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25"
                      }`}
                      title={
                        allBlocked
                          ? "Réactiver tous les comptes de cette société"
                          : "Bloquer tous les comptes de cette société (les données sont conservées)"
                      }
                    >
                      {allBlocked ? <><UserCheck size={11} /> Débloquer</> : <><Ban size={11} /> Bloquer la société</>}
                    </button>
                  </div>
                </div>

                {/* Membres de la société */}
                <div className="space-y-2">
                  {members.map((u) => (
                    <UserCard key={u.id} u={u} flat />
                  ))}
                  {members.length === 0 && (
                    <p className="text-slate-500 text-xs text-center py-4">Aucun membre dans cette société.</p>
                  )}
                </div>
              </div>
            );
          })}

          {orgKeys.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Building2 size={40} className="mx-auto mb-3 opacity-30" />
              <p>Aucune société enregistrée sur la plateforme</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
