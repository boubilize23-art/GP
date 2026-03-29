import { useState, useRef, useEffect } from "react";
import {
  User, LogOut, Settings, ChevronDown, Shield, Clock,
  Building2, Mail, CheckCircle2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface UserMenuProps {
  onNavigateSettings: () => void;
}

const ROLE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  admin:   { label: "Administrateur", color: "text-violet-400", icon: "👑" },
  manager: { label: "Manager",        color: "text-blue-400",   icon: "📊" },
  user:    { label: "Utilisateur",    color: "text-emerald-400",icon: "👤" },
};

export default function UserMenu({ onNavigateSettings }: UserMenuProps) {
  const { currentUser, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!currentUser) return null;

  const roleInfo = ROLE_LABELS[currentUser.role] ?? ROLE_LABELS.user;

  const formatLastLogin = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition group"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-md shadow-violet-500/20">
          {currentUser.avatar}
        </div>
        <div className="hidden sm:block text-left min-w-0">
          <p className="text-slate-800 text-xs font-bold truncate max-w-24">{currentUser.fullName}</p>
          <p className={`text-xs truncate ${roleInfo.color}`}>{roleInfo.icon} {roleInfo.label}</p>
        </div>
        <ChevronDown
          size={12}
          className={`text-slate-400 transition-transform hidden sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                {currentUser.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-bold text-sm truncate">{currentUser.fullName}</p>
                <p className="text-slate-400 text-xs truncate">@{currentUser.username}</p>
                <span className={`inline-flex items-center gap-1 text-xs font-medium mt-1 ${roleInfo.color}`}>
                  <Shield size={10} /> {roleInfo.label}
                </span>
              </div>
            </div>

            {/* Info pills */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Mail size={11} className="text-slate-500 flex-shrink-0" />
                <span className="truncate">{currentUser.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Building2 size={11} className="text-slate-500 flex-shrink-0" />
                <span className="truncate">{currentUser.company}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock size={11} className="text-slate-500 flex-shrink-0" />
                <span>Dernière connexion : {formatLastLogin(currentUser.lastLogin)}</span>
              </div>
            </div>

            {/* Status badge */}
            <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg w-fit">
              <CheckCircle2 size={11} className="text-emerald-400" />
              <span className="text-emerald-400 text-xs font-medium">Connecté</span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={() => { onNavigateSettings(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 transition text-sm"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-slate-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Mon profil</p>
                <p className="text-xs text-slate-400">Modifier mes informations</p>
              </div>
            </button>

            <button
              onClick={() => { onNavigateSettings(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 transition text-sm"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Settings size={14} className="text-slate-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Paramètres</p>
                <p className="text-xs text-slate-400">Devise, exercice, préférences</p>
              </div>
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              onClick={() => { logout(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition text-sm group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-50 group-hover:bg-red-100 flex items-center justify-center flex-shrink-0 transition">
                <LogOut size={14} className="text-red-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Se déconnecter</p>
                <p className="text-xs text-red-400">Fermer la session</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
