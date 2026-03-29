import { useState } from "react";
import {
  Settings, Globe, Calendar, Plus, Trash2, CheckCircle,
  Lock, Edit3, X, Save, AlertTriangle, ChevronDown,
  BadgeCheck, Clock, User, Building2, Mail, Phone,
  Camera, Shield, Key, Eye, EyeOff, Copy, RefreshCw,
  Crown, Users, Info, CheckCircle2, BookOpen,
} from "lucide-react";
import { useSettings, CURRENCIES, FiscalYear } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";

const STATUS_CONFIG = {
  active: { label: "Actif", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle size={12} /> },
  closed: { label: "Clôturé", color: "bg-slate-100 text-slate-500 border-slate-200", icon: <Lock size={12} /> },
  draft: { label: "Brouillon", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock size={12} /> },
};

type Tab = "profile" | "currency" | "fiscal" | "orgkey";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const {
    currency, setCurrency,
    fiscalYears, activeFiscalYear,
    addFiscalYear, updateFiscalYear, deleteFiscalYear,
    setActiveFiscalYear, closeFiscalYear,
    formatAmount,
  } = useSettings();

  const { currentUser, updateProfile } = useAuth();

  // ── Profile state ─────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    fullName: currentUser?.fullName || "",
    email: currentUser?.email || "",
    company: currentUser?.company || "",
    phone: "",
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: "", newPwd: "", confirm: "" });
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });
  const [pwdError, setPwdError] = useState("");

  // ── Currency state ────────────────────────────────────────
  const [currencySearch, setCurrencySearch] = useState("");
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  // ── Fiscal year state ─────────────────────────────────────
  const [showFYForm, setShowFYForm] = useState(false);
  const [editingFY, setEditingFY] = useState<FiscalYear | null>(null);
  const [fyForm, setFyForm] = useState({
    label: "", startDate: "", endDate: "",
    status: "draft" as FiscalYear["status"],
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  const filteredCurrencies = CURRENCIES.filter(
    (c) =>
      c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.symbol.toLowerCase().includes(currencySearch.toLowerCase())
  );

  const openNewFY = () => {
    const nextYear = fiscalYears.length > 0
      ? Math.max(...fiscalYears.map((f) => parseInt(f.startDate.slice(0, 4)))) + 1
      : currentYear;
    setFyForm({
      label: `Exercice ${nextYear}`,
      startDate: `${nextYear}-01-01`,
      endDate: `${nextYear}-12-31`,
      status: "draft",
    });
    setEditingFY(null);
    setShowFYForm(true);
  };

  const openEditFY = (fy: FiscalYear) => {
    setFyForm({ label: fy.label, startDate: fy.startDate, endDate: fy.endDate, status: fy.status });
    setEditingFY(fy);
    setShowFYForm(true);
  };

  const handleSaveFY = () => {
    if (!fyForm.label || !fyForm.startDate || !fyForm.endDate) return;
    if (editingFY) {
      updateFiscalYear(editingFY.id, fyForm);
    } else {
      addFiscalYear(fyForm);
    }
    setShowFYForm(false);
    setEditingFY(null);
  };

  const handleSaveProfile = () => {
    updateProfile({ fullName: profileForm.fullName, email: profileForm.email, company: profileForm.company });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handleChangePwd = () => {
    setPwdError("");
    if (!pwdForm.current) { setPwdError("Entrez votre mot de passe actuel"); return; }
    if (pwdForm.newPwd.length < 6) { setPwdError("Le nouveau mot de passe doit avoir au moins 6 caractères"); return; }
    if (pwdForm.newPwd !== pwdForm.confirm) { setPwdError("Les mots de passe ne correspondent pas"); return; }
    setPwdForm({ current: "", newPwd: "", confirm: "" });
    setShowPwdForm(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const fyProgress = (fy: FiscalYear) => {
    const start = new Date(fy.startDate).getTime();
    const end = new Date(fy.endDate).getTime();
    const now = Date.now();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  const initials = (currentUser?.fullName || "U")
    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  // ── Org key state ─────────────────────────────────────────────────────────
  const { getMyOrgKey, createOrgKey, generateOrgKey, users, currentUser: cu } = useAuth();
  const myOrgKey = getMyOrgKey();
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyDesc, setNewKeyDesc] = useState("");
  const [keyError, setKeyError] = useState("");
  const [keySuccess, setKeySuccess] = useState("");
  const [generatedPreview, setGeneratedPreview] = useState(() => generateOrgKey());
  const [keyConfirm, setKeyConfirm] = useState("");
  const [keyConfirmed, setKeyConfirmed] = useState(false);

  const orgMembers = cu
    ? users.filter((u) => u.organizationKey === cu.organizationKey && u.id !== cu.id)
    : [];

  const handleCopyOrgKey = () => {
    if (!myOrgKey) return;
    navigator.clipboard.writeText(myOrgKey.key).then(() => {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    });
  };

  const handleConfirmKey = () => {
    if (keyConfirm.trim().toUpperCase() !== generatedPreview.toUpperCase()) {
      setKeyError("La clé de confirmation ne correspond pas.");
      return;
    }
    setKeyConfirmed(true);
    setKeyError("");
  };

  const handleCreateOrgKey = () => {
    setKeyError(""); setKeySuccess("");
    if (!newKeyName.trim()) { setKeyError("Le nom de l'organisation est requis."); return; }
    if (!keyConfirmed) { setKeyError("Veuillez confirmer la clé avant de créer."); return; }
    const result = createOrgKey(newKeyName.trim(), newKeyDesc.trim() || undefined);
    if (!result.success) { setKeyError(result.error ?? "Erreur."); return; }
    setKeySuccess(`Nouvelle clé créée : ${result.key?.key}`);
    setShowKeyForm(false);
    setKeyConfirmed(false);
    setKeyConfirm("");
    setNewKeyName(""); setNewKeyDesc("");
  };

  const handleRefreshPreview = () => {
    setGeneratedPreview(generateOrgKey());
    setKeyConfirm("");
    setKeyConfirmed(false);
    setKeyError("");
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile",  label: "Profil",    icon: <User size={16} /> },
    { id: "currency", label: "Devise",    icon: <Globe size={16} /> },
    { id: "fiscal",   label: "Exercices", icon: <Calendar size={16} /> },
    ...(currentUser?.role === "admin" ? [{ id: "orgkey" as Tab, label: "Clé d'org.", icon: <Key size={16} /> }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
          <Settings size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-slate-800 font-bold text-xl">Paramètres</h2>
          <p className="text-slate-500 text-sm">Profil, devise et exercices comptables</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === tab.id
                ? "bg-white text-slate-800 shadow"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── PROFIL ───────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center gap-4 shadow-sm">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-3xl">{initials}</span>
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border-2 border-slate-200 flex items-center justify-center shadow hover:bg-slate-50 transition">
                <Camera size={14} className="text-slate-600" />
              </button>
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-800 text-lg">{currentUser?.fullName}</p>
              <p className="text-slate-500 text-sm">@{currentUser?.username}</p>
              <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold ${
                currentUser?.role === "admin" ? "bg-violet-100 text-violet-700" :
                currentUser?.role === "manager" ? "bg-blue-100 text-blue-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {currentUser?.role === "admin" ? "Administrateur" :
                 currentUser?.role === "manager" ? "Manager" : "Utilisateur"}
              </span>
            </div>
            <div className="w-full border-t border-slate-100 pt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Mail size={14} /> <span className="truncate">{currentUser?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Building2 size={14} /> <span>{currentUser?.company || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Shield size={14} /> <span>Compte actif sécurisé</span>
              </div>
            </div>
          </div>

          {/* Profile form */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <User size={16} className="text-violet-500" /> Informations personnelles
              </h3>

              {profileSaved && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2 text-sm font-semibold">
                  <CheckCircle size={16} /> Modifications enregistrées !
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nom complet</label>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nom d'utilisateur</label>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                    value={`@${currentUser?.username}`}
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Adresse email</label>
                  <input
                    type="email"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Entreprise</label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      value={profileForm.company}
                      onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                      placeholder="Nom de l'entreprise"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Téléphone</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="+33 6 00 00 00 00"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl font-semibold text-sm shadow hover:opacity-90 transition"
                >
                  <Save size={15} /> Enregistrer le profil
                </button>
              </div>
            </div>

            {/* Sécurité */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Shield size={16} className="text-rose-500" /> Sécurité du compte
              </h3>

              {!showPwdForm ? (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center">
                      <Key size={16} className="text-rose-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">Mot de passe</p>
                      <p className="text-slate-400 text-xs">Dernière modification : inconnue</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPwdForm(true)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white transition"
                  >
                    Modifier
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {pwdError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2 text-sm">
                      <AlertTriangle size={14} /> {pwdError}
                    </div>
                  )}
                  {(["current", "new", "confirm"] as const).map((field) => (
                    <div key={field}>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        {field === "current" ? "Mot de passe actuel" : field === "new" ? "Nouveau mot de passe" : "Confirmer le nouveau"}
                      </label>
                      <div className="relative">
                        <input
                          type={showPwd[field] ? "text" : "password"}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                          value={field === "current" ? pwdForm.current : field === "new" ? pwdForm.newPwd : pwdForm.confirm}
                          onChange={(e) => setPwdForm({
                            ...pwdForm,
                            [field === "current" ? "current" : field === "new" ? "newPwd" : "confirm"]: e.target.value
                          })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd({ ...showPwd, [field]: !showPwd[field] })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPwd[field] ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setShowPwdForm(false); setPwdError(""); }}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                      Annuler
                    </button>
                    <button onClick={handleChangePwd}
                      className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold text-sm shadow hover:opacity-90 transition">
                      <Key size={14} /> Changer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DEVISE ───────────────────────────────────────────── */}
      {activeTab === "currency" && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Globe size={16} className="text-blue-500" /> Devise de travail
            </h3>

            {/* Current */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
                <span className="text-white font-black text-xl">{currency.symbol}</span>
              </div>
              <div>
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Devise active</p>
                <p className="text-slate-800 font-black text-lg">{currency.name}</p>
                <p className="text-slate-500 text-sm">{currency.code} — Aperçu : {formatAmount(1250000)}</p>
              </div>
            </div>

            {/* Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Choisir une devise</label>
              <div className="relative">
                <button
                  onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-700 hover:border-violet-300 transition"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{currency.symbol}</span>
                    {currency.name} ({currency.code})
                  </span>
                  <ChevronDown size={16} className={`transition-transform ${showCurrencyDropdown ? "rotate-180" : ""}`} />
                </button>

                {showCurrencyDropdown && (
                  <div className="absolute z-50 top-full mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                      <input
                        autoFocus
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                        placeholder="Rechercher une devise..."
                        value={currencySearch}
                        onChange={(e) => setCurrencySearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredCurrencies.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => { setCurrency(c); setShowCurrencyDropdown(false); setCurrencySearch(""); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition text-left ${
                            c.code === currency.code ? "bg-violet-50 text-violet-700 font-semibold" : "text-slate-700"
                          }`}
                        >
                          <span className="text-base w-7 text-center">{c.symbol}</span>
                          <span className="flex-1">{c.name}</span>
                          <span className="text-slate-400 text-xs font-mono">{c.code}</span>
                          {c.code === currency.code && <CheckCircle size={14} className="text-violet-500" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview amounts */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-3">Aperçu du formatage</p>
              <div className="grid grid-cols-3 gap-3">
                {[999, 12500, 1000000].map((n) => (
                  <div key={n} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                    <p className="text-xs text-slate-400 mb-1">{n.toLocaleString()}</p>
                    <p className="font-bold text-slate-800 text-sm">{formatAmount(n)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EXERCICES ────────────────────────────────────────── */}
      {activeTab === "fiscal" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{fiscalYears.length} exercice(s) enregistré(s)</p>
            <button
              onClick={openNewFY}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl font-semibold text-sm shadow hover:opacity-90 transition"
            >
              <Plus size={15} /> Nouvel exercice
            </button>
          </div>

          {/* Form */}
          {showFYForm && (
            <div className="bg-white rounded-2xl border border-violet-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen size={16} className="text-violet-500" />
                  {editingFY ? "Modifier l'exercice" : "Nouvel exercice comptable"}
                </h3>
                <button onClick={() => setShowFYForm(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Libellé</label>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    value={fyForm.label}
                    onChange={(e) => setFyForm({ ...fyForm, label: e.target.value })}
                    placeholder="Ex: Exercice 2025"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Date de début</label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    value={fyForm.startDate}
                    onChange={(e) => setFyForm({ ...fyForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Date de fin</label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    value={fyForm.endDate}
                    onChange={(e) => setFyForm({ ...fyForm, endDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Statut</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    value={fyForm.status}
                    onChange={(e) => setFyForm({ ...fyForm, status: e.target.value as FiscalYear["status"] })}
                  >
                    <option value="draft">Brouillon</option>
                    <option value="active">Actif</option>
                    <option value="closed">Clôturé</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowFYForm(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                  Annuler
                </button>
                <button onClick={handleSaveFY}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl font-semibold text-sm shadow hover:opacity-90 transition">
                  <Save size={14} /> {editingFY ? "Mettre à jour" : "Créer l'exercice"}
                </button>
              </div>
            </div>
          )}

          {/* List */}
          {fiscalYears.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <Calendar size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">Aucun exercice comptable</p>
              <p className="text-slate-400 text-sm mt-1">Créez votre premier exercice pour commencer</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fiscalYears.map((fy) => {
                const progress = fyProgress(fy);
                const cfg = STATUS_CONFIG[fy.status];
                const isActive = activeFiscalYear?.id === fy.id;
                return (
                  <div
                    key={fy.id}
                    className={`bg-white rounded-2xl border p-5 shadow-sm transition ${
                      isActive ? "border-violet-300 ring-1 ring-violet-200" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isActive ? "bg-gradient-to-br from-violet-500 to-indigo-600" : "bg-slate-100"
                        }`}>
                          <BookOpen size={18} className={isActive ? "text-white" : "text-slate-400"} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-800">{fy.label}</p>
                            {isActive && (
                              <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-bold rounded-full">
                                ★ ACTIF
                              </span>
                            )}
                            <span className={`flex items-center gap-1 px-2 py-0.5 border rounded-full text-xs font-semibold ${cfg.color}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </div>
                          <p className="text-slate-500 text-sm mt-0.5">
                            Du {new Date(fy.startDate).toLocaleDateString("fr-FR")} au {new Date(fy.endDate).toLocaleDateString("fr-FR")}
                          </p>
                          {fy.status === "active" && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-violet-400 to-indigo-500 rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-400 font-mono">{progress}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {fy.status !== "active" && fy.status !== "closed" && (
                          <button
                            onClick={() => setActiveFiscalYear(fy.id)}
                            className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition"
                          >
                            <BadgeCheck size={13} className="inline mr-1" /> Activer
                          </button>
                        )}
                        {fy.status === "active" && (
                          <button
                            onClick={() => closeFiscalYear(fy.id)}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 transition"
                          >
                            <Lock size={12} className="inline mr-1" /> Clôturer
                          </button>
                        )}
                        <button
                          onClick={() => openEditFY(fy)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit3 size={15} />
                        </button>
                        {!isActive && (
                          deleteConfirm === fy.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => { deleteFiscalYear(fy.id); setDeleteConfirm(null); }}
                                className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs font-bold">
                                Confirmer
                              </button>
                              <button onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs">
                                Non
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(fy.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                              <Trash2 size={15} />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CLÉ D'ORGANISATION (Admin seulement) ─────────────────────────────── */}
      {activeTab === "orgkey" && currentUser?.role === "admin" && (
        <div className="space-y-6">

          {/* Clé active actuelle */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Key size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-slate-800 font-bold text-base">Clé d'organisation active</h3>
                <p className="text-slate-500 text-xs">Partagez cette clé avec vos managers et utilisateurs</p>
              </div>
            </div>

            {myOrgKey ? (
              <div className="space-y-4">
                {/* Affichage de la clé */}
                <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Organisation</p>
                      <p className="text-slate-800 font-bold text-base">{myOrgKey.organizationName}</p>
                    </div>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold">
                      <CheckCircle2 size={12} /> Active
                    </span>
                  </div>
                  <div className="bg-white border border-violet-200 rounded-xl px-5 py-4 flex items-center justify-between">
                    <span className="font-mono font-black text-violet-700 text-2xl tracking-[0.2em]">
                      {myOrgKey.key}
                    </span>
                    <button
                      onClick={handleCopyOrgKey}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition ${copiedKey ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200"}`}
                    >
                      {copiedKey ? <><CheckCircle2 size={15} /> Copié !</> : <><Copy size={15} /> Copier</>}
                    </button>
                  </div>
                  {myOrgKey.description && (
                    <p className="text-slate-500 text-xs mt-3 flex items-center gap-1.5">
                      <Info size={12} /> {myOrgKey.description}
                    </p>
                  )}
                </div>

                {/* Infos création */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p className="text-slate-400 text-xs mb-1">Créée le</p>
                    <p className="text-slate-800 text-sm font-semibold">{new Date(myOrgKey.createdAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p className="text-slate-400 text-xs mb-1">Dernière modification</p>
                    <p className="text-slate-800 text-sm font-semibold">
                      {myOrgKey.lastChangedAt ? new Date(myOrgKey.lastChangedAt).toLocaleDateString("fr-FR") : "—"}
                    </p>
                  </div>
                </div>

                {/* Instruction de partage */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-amber-800 text-sm font-bold mb-2 flex items-center gap-2">
                    <Info size={15} /> Comment partager votre clé ?
                  </p>
                  <div className="space-y-1.5 text-amber-700 text-xs">
                    <p>1. <strong>Copiez</strong> la clé ci-dessus (bouton "Copier")</p>
                    <p>2. <strong>Envoyez-la</strong> à vos managers et utilisateurs par email, message, etc.</p>
                    <p>3. Lors de leur <strong>inscription</strong>, ils collent cette clé dans le champ "Clé d'organisation"</p>
                    <p>4. Ils rejoignent automatiquement <strong>votre organisation</strong> et vous pouvez voir leur travail</p>
                  </div>
                </div>

                {/* Bouton nouvelle clé */}
                <button
                  onClick={() => { setShowKeyForm(!showKeyForm); setKeyError(""); setKeySuccess(""); setKeyConfirmed(false); setKeyConfirm(""); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition shadow"
                >
                  <RefreshCw size={15} /> Générer une nouvelle clé
                </button>
                <p className="text-slate-400 text-xs flex items-center gap-1.5 -mt-2">
                  <Shield size={12} /> Modification autorisée une fois par mois maximum
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Key size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Aucune clé d'organisation</p>
                <p className="text-sm mt-1">Créez votre première clé pour inviter votre équipe</p>
              </div>
            )}
          </div>

          {/* Formulaire nouvelle clé */}
          {showKeyForm && (
            <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-6">
              <h3 className="text-slate-800 font-bold text-base mb-4 flex items-center gap-2">
                <RefreshCw size={16} className="text-violet-600" /> Nouvelle clé d'organisation
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nom de l'organisation *</label>
                  <input type="text" value={newKeyName} onChange={(e) => { setNewKeyName(e.target.value); setKeyError(""); }}
                    placeholder="Ex: GestioPro SARL"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Description (optionnelle)</label>
                  <input type="text" value={newKeyDesc} onChange={(e) => setNewKeyDesc(e.target.value)}
                    placeholder="Ex: Clé principale exercice 2025"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition" />
                </div>

                {/* Aperçu de la nouvelle clé */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nouvelle clé générée</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="font-mono font-black text-slate-800 text-lg tracking-widest">{generatedPreview}</span>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => { navigator.clipboard.writeText(generatedPreview); }}
                          className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-500" title="Copier">
                          <Copy size={14} />
                        </button>
                        <button type="button" onClick={handleRefreshPreview}
                          className="p-1.5 hover:bg-slate-200 rounded-lg transition text-slate-500" title="Régénérer">
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirmation de la clé */}
                {!keyConfirmed ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                      <span className="text-amber-600">⚠ Confirmez</span> en retapant la clé ci-dessus
                    </label>
                    <div className="flex gap-2">
                      <input type="text" value={keyConfirm}
                        onChange={(e) => { setKeyConfirm(e.target.value.toUpperCase()); setKeyError(""); }}
                        placeholder="XXXX-XXXX-XXXX"
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition" />
                      <button type="button" onClick={handleConfirmKey}
                        className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition">
                        <Shield size={15} />
                      </button>
                    </div>
                    <p className="text-slate-400 text-xs mt-1.5">Recopiez exactement la clé pour confirmer que vous l'avez bien notée</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <div>
                      <p className="text-emerald-700 text-sm font-bold">Clé confirmée</p>
                      <p className="text-slate-400 text-xs">Vous pouvez maintenant créer la nouvelle clé</p>
                    </div>
                  </div>
                )}

                {keyError && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle size={14} className="text-red-500" />
                    <p className="text-red-600 text-sm">{keyError}</p>
                  </div>
                )}

                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-700 text-xs font-bold mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle size={13} /> Attention — Action irréversible
                  </p>
                  <p className="text-red-600 text-xs">
                    La création d'une nouvelle clé <strong>invalidera l'ancienne</strong>. Tous les membres devront mettre à jour leur clé. Vous ne pourrez modifier cette clé qu'<strong>une fois par mois</strong>.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleCreateOrgKey}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition shadow">
                    <Save size={15} /> Créer la nouvelle clé
                  </button>
                  <button onClick={() => { setShowKeyForm(false); setKeyError(""); setKeyConfirmed(false); setKeyConfirm(""); }}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition">
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}

          {keySuccess && (
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <p className="text-emerald-700 text-sm font-semibold">{keySuccess}</p>
            </div>
          )}

          {/* Membres de l'organisation */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Users size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-slate-800 font-bold text-base">Membres de l'organisation</h3>
                <p className="text-slate-500 text-xs">{orgMembers.length} membre{orgMembers.length > 1 ? "s" : ""} utilisant votre clé</p>
              </div>
            </div>

            {orgMembers.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Users size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucun membre pour l'instant</p>
                <p className="text-xs mt-1">Partagez votre clé pour inviter votre équipe</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orgMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      m.role === "manager" ? "bg-gradient-to-br from-blue-500 to-cyan-500" : "bg-gradient-to-br from-emerald-500 to-teal-500"
                    }`}>
                      {m.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 font-semibold text-sm truncate">{m.fullName}</p>
                      <p className="text-slate-400 text-xs">@{m.username} · {m.email}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      m.role === "manager"
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    }`}>
                      {m.role === "manager" ? "📊 Manager" : "👤 Utilisateur"}
                    </span>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${m.isActive ? "bg-emerald-400" : "bg-slate-300"}`} title={m.isActive ? "Actif" : "Inactif"} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Explication hiérarchie */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-slate-800 font-bold text-base mb-4 flex items-center gap-2">
              <Crown size={16} className="text-violet-600" /> Hiérarchie de votre organisation
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Crown size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-violet-800 font-bold text-sm">👑 Vous (Administrateur)</p>
                  <p className="text-violet-600 text-xs">Accès complet • Voit tout le travail de l'équipe • Valide les achats</p>
                </div>
              </div>
              <div className="ml-4 pl-3 border-l-2 border-dashed border-slate-300">
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-blue-800 font-bold text-sm">📊 Managers ({orgMembers.filter(m => m.role === "manager").length})</p>
                    <p className="text-blue-600 text-xs">Voit son travail + celui de ses utilisateurs • Valide les achats des utilisateurs</p>
                  </div>
                </div>
              </div>
              <div className="ml-8 pl-3 border-l-2 border-dashed border-slate-300">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-emerald-800 font-bold text-sm">👤 Utilisateurs ({orgMembers.filter(m => m.role === "user").length})</p>
                    <p className="text-emerald-600 text-xs">Saisie uniquement • Les achats nécessitent une validation hiérarchique</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

