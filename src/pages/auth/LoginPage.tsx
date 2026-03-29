import { useState, useEffect, FormEvent } from "react";
import {
  Eye, EyeOff, LogIn, TrendingUp, AlertCircle, User, Lock,
  ChevronRight, Shield, Clock, CheckCircle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  loadRememberedCredentials,
  isLockedOut,
  formatLockoutTime,
} from "../../utils/security";

interface LoginPageProps {
  onGoRegister: () => void;
  onGoForgot: () => void;
}

export default function LoginPage({ onGoRegister, onGoForgot }: LoginPageProps) {
  const { login, authError, clearError, lockoutInfo, refreshLockout } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [remember, setRemember] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // ── Restore remembered credentials ───────────────────────────────────────
  useEffect(() => {
    const saved = loadRememberedCredentials();
    if (saved) {
      setIdentifier(saved.identifier);
      setPassword(saved.password);
      setRemember(true);
    }
  }, []);

  // ── Lockout countdown ─────────────────────────────────────────────────────
  useEffect(() => {
    const info = isLockedOut();
    if (info.locked) setLockRemaining(info.remainingMs);
  }, [lockoutInfo]);

  useEffect(() => {
    if (lockRemaining <= 0) return;
    const interval = setInterval(() => {
      const info = isLockedOut();
      if (!info.locked) {
        setLockRemaining(0);
        refreshLockout();
        clearInterval(interval);
      } else {
        setLockRemaining(info.remainingMs);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockRemaining]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    const lockInfo = isLockedOut();
    if (lockInfo.locked) {
      setLockRemaining(lockInfo.remainingMs);
      return;
    }

    setLoading(true);
    const result = await login(identifier.trim(), password, remember);
    setLoading(false);

    if (!result.ok) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      refreshLockout();
      const newLock = isLockedOut();
      if (newLock.locked) setLockRemaining(newLock.remainingMs);
    } else {
      setLoginSuccess(true);
    }
  };

  const fillDemo = () => {
    setIdentifier("admin");
    setPassword("Admin@2025");
    setRemember(false);
    clearError();
  };

  const isLocked = lockRemaining > 0;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">

      {/* ── Left decorative panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -right-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <TrendingUp size={22} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-2xl tracking-tight">GestioPro</p>
              <p className="text-slate-400 text-sm">Gestion Commerciale Intelligente</p>
            </div>
          </div>

          <h1 className="text-4xl font-black text-white leading-tight mb-6">
            Pilotez votre<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
              activité commerciale
            </span><br />
            en temps réel
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-10">
            Ventes, achats, créances, fournisseurs, résultats — tout centralisé dans un tableau de bord puissant.
          </p>

          {[
            "Tableau de bord avec graphiques en temps réel",
            "Gestion multi-devises (25 devises supportées)",
            "Exercices comptables et rapports automatisés",
            "Sécurité renforcée — données chiffrées localement",
          ].map((feat, i) => (
            <div key={i} className="flex items-center gap-3 mb-3">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                <ChevronRight size={10} className="text-white" />
              </div>
              <span className="text-slate-300 text-sm">{feat}</span>
            </div>
          ))}
        </div>

        {/* Security badge */}
        <div className="relative z-10 flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <Shield size={14} className="text-emerald-400" />
            <span className="text-emerald-300 text-xs font-semibold">Connexion chiffrée SHA-256</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <Lock size={14} className="text-blue-400" />
            <span className="text-blue-300 text-xs font-semibold">Anti brute-force actif</span>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { val: "25+", label: "Devises" },
            { val: "100%", label: "Automatisé" },
            { val: "SHA-256", label: "Chiffrement" },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm text-center">
              <p className="text-xl font-black text-white">{stat.val}</p>
              <p className="text-slate-400 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right login form ──────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="text-white font-black text-xl">GestioPro</span>
          </div>

          {/* Success state */}
          {loginSuccess && (
            <div className="bg-white/5 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-10 shadow-2xl text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-white font-black text-2xl mb-2">Connexion réussie !</h2>
              <p className="text-slate-400 text-sm">Chargement de votre espace...</p>
              <div className="mt-4 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse rounded-full w-3/4" />
              </div>
            </div>
          )}

          {!loginSuccess && (
            <div
              className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl transition-all duration-200 ${
                shake ? "animate-wiggle" : ""
              }`}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-black text-white mb-1">Connexion</h2>
                <p className="text-slate-400 text-sm">Bienvenue ! Connectez-vous à votre espace.</p>
              </div>

              {/* Lockout banner */}
              {isLocked && (
                <div className="mb-4 flex items-start gap-3 px-4 py-3.5 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <Clock size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 text-sm font-bold">Accès temporairement bloqué</p>
                    <p className="text-red-300/70 text-xs mt-0.5">
                      Trop de tentatives échouées. Réessayez dans{" "}
                      <span className="font-mono font-bold">{formatLockoutTime(lockRemaining)}</span>
                    </p>
                    <div className="mt-2 w-full bg-red-900/30 rounded-full h-1 overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(100, (lockRemaining / (15 * 60 * 1000)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Demo tip */}
              {!isLocked && (
                <button
                  onClick={fillDemo}
                  className="w-full mb-5 flex items-center gap-3 px-4 py-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/20 transition group text-left"
                >
                  <span className="text-xl">💡</span>
                  <div>
                    <p className="text-indigo-300 text-xs font-bold">Compte démo disponible</p>
                    <p className="text-slate-400 text-xs">admin / Admin@2025</p>
                  </div>
                  <ChevronRight size={14} className="ml-auto text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
                {/* Identifier */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Email ou nom d'utilisateur
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="username"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); clearError(); }}
                      placeholder="admin ou admin@gestiopro.com"
                      required
                      disabled={isLocked}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-300">Mot de passe</label>
                    <button
                      type="button"
                      onClick={onGoForgot}
                      className="text-xs text-violet-400 hover:text-violet-300 transition"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? "text" : "password"}
                      name="current-password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearError(); }}
                      placeholder="••••••••"
                      required
                      disabled={isLocked}
                      className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      disabled={isLocked}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition disabled:opacity-50"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRemember(!remember)}
                    className={`w-10 h-5 rounded-full transition-all duration-200 flex items-center relative flex-shrink-0 ${
                      remember ? "bg-violet-600" : "bg-white/10"
                    }`}
                  >
                    <span
                      className={`absolute w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                        remember ? "left-5.5 translate-x-0.5" : "left-0.5"
                      }`}
                      style={{ left: remember ? "calc(100% - 18px)" : "2px" }}
                    />
                  </button>
                  <span className="text-slate-300 text-sm cursor-pointer select-none" onClick={() => setRemember(!remember)}>
                    Se souvenir de moi
                  </span>
                  {remember && (
                    <span className="text-xs text-violet-400 flex items-center gap-1">
                      <Shield size={10} /> Enregistré localement
                    </span>
                  )}
                </div>

                {/* Error */}
                {authError && !isLocked && (
                  <div className="flex items-start gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400 text-sm">{authError}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || isLocked}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-white font-bold text-sm transition shadow-lg shadow-violet-500/25 mt-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Vérification en cours...
                    </>
                  ) : (
                    <>
                      <LogIn size={16} />
                      Se connecter
                    </>
                  )}
                </button>
              </form>

              {/* Security info */}
              <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                <Shield size={11} className="text-emerald-400 flex-shrink-0" />
                <p className="text-emerald-400/70 text-xs">
                  Mot de passe chiffré SHA-256 · Blocage après 5 tentatives
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-slate-500 text-xs">ou</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <p className="text-center text-sm text-slate-400">
                Pas encore de compte ?{" "}
                <button
                  onClick={onGoRegister}
                  className="text-violet-400 hover:text-violet-300 font-bold transition"
                >
                  Créer un compte →
                </button>
              </p>
            </div>
          )}

          <p className="text-center text-slate-600 text-xs mt-6">
            © 2025 GestioPro — Gestion Commerciale Professionnelle
          </p>
        </div>
      </div>
    </div>
  );
}
