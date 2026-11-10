import { useState, useEffect, FormEvent } from "react";
import {
  Mail, ChevronLeft, TrendingUp, KeyRound, User,
  AlertCircle, CheckCircle2, RefreshCw, Eye, EyeOff, Lock, ArrowRight
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

type ForgotMode = "choice" | "password" | "password-sent" | "username" | "reset" | "username-found";

interface ForgotPageProps {
  onGoLogin: () => void;
}

export default function ForgotPage({ onGoLogin }: ForgotPageProps) {
  const { forgotPassword, forgotUsername, resetPassword } = useAuth();
  const [mode, setMode] = useState<ForgotMode>("choice");
  const [email, setEmail] = useState("");
  const [foundUsername, setFoundUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Le lien de récupération envoyé par email arrive avec #type=recovery
  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) {
      setMode("reset");
    }
  }, []);

  const reset = () => {
    setMode("choice");
    setEmail("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setResetSuccess(false);
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await forgotPassword(email.trim());
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Erreur.");
    } else {
      setMode("password-sent");
    }
  };

  const handleForgotUsername = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await forgotUsername(email.trim());
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Erreur.");
    } else {
      setFoundUsername(result.username!);
      setMode("username-found");
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const result = await resetPassword("", newPassword);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Erreur.");
    } else {
      setResetSuccess(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <TrendingUp size={18} className="text-white" />
          </div>
          <span className="text-white font-black text-xl">GestioPro</span>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

          {/* ── CHOICE MODE ─────────────────────────────────── */}
          {mode === "choice" && (
            <>
              <button onClick={onGoLogin} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm mb-6">
                <ChevronLeft size={16} /> Retour
              </button>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
                  <KeyRound size={28} className="text-violet-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Aide à la connexion</h2>
                <p className="text-slate-400 text-sm">Que souhaitez-vous récupérer ?</p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => { setMode("password"); setError(null); }}
                  className="w-full flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-violet-500/40 transition group text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
                    <Lock size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">Mot de passe oublié</p>
                    <p className="text-slate-400 text-xs mt-0.5">Réinitialiser votre mot de passe via email</p>
                  </div>
                  <ArrowRight size={16} className="text-slate-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                </button>

                <button
                  onClick={() => { setMode("username"); setError(null); }}
                  className="w-full flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-indigo-500/40 transition group text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                    <User size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">Nom d'utilisateur oublié</p>
                    <p className="text-slate-400 text-xs mt-0.5">Retrouver votre identifiant par email</p>
                  </div>
                  <ArrowRight size={16} className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </>
          )}

          {/* ── FORGOT PASSWORD ──────────────────────────────── */}
          {mode === "password" && (
            <>
              <button onClick={() => { setMode("choice"); setError(null); }} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm mb-6">
                <ChevronLeft size={16} /> Retour
              </button>
              <div className="mb-7">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center mb-4">
                  <Lock size={20} className="text-white" />
                </div>
                <h2 className="text-xl font-black text-white mb-1">Mot de passe oublié</h2>
                <p className="text-slate-400 text-sm">Entrez votre email pour recevoir un code de récupération.</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Adresse email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      placeholder="votre@email.com"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                    />
                  </div>
                  {import.meta.env.DEV && (
                    <p className="text-xs text-slate-500 mt-1.5">💡 Compte démo : admin@gestioPro.com</p>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 rounded-xl text-white font-bold text-sm transition"
                >
                  {loading ? <RefreshCw size={15} className="animate-spin" /> : <Mail size={15} />}
                  {loading ? "Vérification..." : "Envoyer le code de récupération"}
                </button>
              </form>
            </>
          )}

          {/* ── EMAIL DE RÉCUPÉRATION ENVOYÉ ───────────────── */}
          {mode === "password-sent" && (
            <div className="text-center py-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-500/30">
                <Mail size={36} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-white mb-3">Email envoyé !</h2>
              <p className="text-slate-400 text-sm mb-6">
                Un lien de réinitialisation a été envoyé à{" "}
                <span className="text-white font-semibold">{email}</span>.
                Ouvrez ce lien pour choisir votre nouveau mot de passe.
              </p>
              <p className="text-xs text-slate-500 mb-6">
                💡 Pensez à vérifier vos courriers indésirables. Si le message n'arrive pas, contactez votre administrateur.
              </p>
              <button
                onClick={onGoLogin}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-white font-bold text-sm transition hover:from-violet-500 hover:to-indigo-500"
              >
                Retour à la connexion →
              </button>
            </div>
          )}

          {/* ── RESET PASSWORD ───────────────────────────────── */}
          {mode === "reset" && !resetSuccess && (
            <>
              <button onClick={() => { setMode("password"); setError(null); }} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm mb-6">
                <ChevronLeft size={16} /> Retour
              </button>
              <div className="mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4">
                  <KeyRound size={20} className="text-white" />
                </div>
                <h2 className="text-xl font-black text-white mb-1">Nouveau mot de passe</h2>
                <p className="text-slate-400 text-sm">Choisissez votre nouveau mot de passe.</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* New password */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Nouveau mot de passe</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Confirm */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Confirmer</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                      placeholder="••••••••"
                      required
                      className={`w-full pl-10 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition ${
                        confirmPassword && newPassword !== confirmPassword ? "border-red-500/50" : "border-white/10"
                      }`}
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 rounded-xl text-white font-bold text-sm transition"
                >
                  {loading ? <RefreshCw size={15} className="animate-spin" /> : <Lock size={15} />}
                  {loading ? "Mise à jour..." : "Réinitialiser le mot de passe"}
                </button>
              </form>
            </>
          )}

          {/* ── RESET SUCCESS ────────────────────────────────── */}
          {mode === "reset" && resetSuccess && (
            <div className="text-center py-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-white mb-3">Mot de passe mis à jour !</h2>
              <p className="text-slate-400 text-sm mb-8">
                Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
              </p>
              <button
                onClick={onGoLogin}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-white font-bold text-sm transition hover:from-violet-500 hover:to-indigo-500"
              >
                Se connecter maintenant →
              </button>
            </div>
          )}

          {/* ── FORGOT USERNAME ──────────────────────────────── */}
          {mode === "username" && (
            <>
              <button onClick={() => { setMode("choice"); setError(null); }} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm mb-6">
                <ChevronLeft size={16} /> Retour
              </button>
              <div className="mb-7">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mb-4">
                  <User size={20} className="text-white" />
                </div>
                <h2 className="text-xl font-black text-white mb-1">Nom d'utilisateur oublié</h2>
                <p className="text-slate-400 text-sm">Entrez votre email pour retrouver votre identifiant.</p>
              </div>

              <form onSubmit={handleForgotUsername} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Adresse email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      placeholder="votre@email.com"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>
                  {import.meta.env.DEV && (
                    <p className="text-xs text-slate-500 mt-1.5">💡 Compte démo : admin@gestioPro.com</p>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-60 rounded-xl text-white font-bold text-sm transition"
                >
                  {loading ? <RefreshCw size={15} className="animate-spin" /> : <User size={15} />}
                  {loading ? "Recherche..." : "Trouver mon identifiant"}
                </button>
              </form>
            </>
          )}

          {/* ── USERNAME FOUND ───────────────────────────────── */}
          {mode === "username-found" && (
            <div className="text-center py-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30">
                <User size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-white mb-3">Identifiant retrouvé !</h2>
              <p className="text-slate-400 text-sm mb-4">
                Le nom d'utilisateur associé à <span className="text-white font-medium">{email}</span> est :
              </p>
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl px-6 py-4 mb-8">
                <p className="text-3xl font-black text-white font-mono">@{foundUsername}</p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={onGoLogin}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-white font-bold text-sm transition hover:from-violet-500 hover:to-indigo-500"
                >
                  Se connecter →
                </button>
                <button
                  onClick={reset}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm transition hover:bg-white/10"
                >
                  Autre problème de connexion
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © 2025 GestioPro — Gestion Commerciale Professionnelle
        </p>
      </div>
    </div>
  );
}
