import { ReactNode, useState, useRef, useEffect, useCallback } from "react";
import {
  LayoutDashboard, ShoppingCart, ShoppingBag, Users, Building2,
  TrendingUp, Package, ChevronRight, Menu, X,
  Settings, Calendar, Globe, BookOpen, ChevronDown,
  ChevronUp, ArrowUp, ArrowDown, Warehouse, UserCog, ClipboardList, HelpCircle, Receipt, AlertCircle,
  FileBarChart,
} from "lucide-react";
import { useSettings, CURRENCIES } from "../context/SettingsContext";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import UserMenu from "./UserMenu";

export type Page =
  | "dashboard"
  | "products"
  | "sales"
  | "purchases"
  | "clients"
  | "suppliers"
  | "receivables"
  | "results"
  | "stock"
  | "settings"
  | "team"
  | "approvals"
  | "tva"
  | "reports"
  | "guide";

const NAV_ITEMS: { id: Page; label: string; icon: ReactNode; color: string; roles?: string[] }[] = [
  { id: "dashboard",   label: "Tableau de bord",  icon: <LayoutDashboard size={18} />, color: "from-violet-500 to-indigo-500" },
  { id: "products",    label: "Produits",          icon: <Package size={18} />,         color: "from-orange-400 to-amber-500", roles: ["admin","manager"] },
  { id: "sales",       label: "Ventes",            icon: <ShoppingCart size={18} />,    color: "from-emerald-400 to-teal-500" },
  { id: "purchases",   label: "Achats",            icon: <ShoppingBag size={18} />,     color: "from-blue-400 to-cyan-500"   },
  { id: "approvals",   label: "Bons d'achat",      icon: <ClipboardList size={18} />,   color: "from-amber-400 to-orange-500" },
  { id: "stock",       label: "Stock",             icon: <Warehouse size={18} />,       color: "from-cyan-500 to-blue-600",  roles: ["admin","manager"] },
  { id: "clients",     label: "Clients",           icon: <Users size={18} />,           color: "from-pink-400 to-rose-500"   },
  { id: "suppliers",   label: "Fournisseurs",      icon: <Building2 size={18} />,       color: "from-purple-400 to-violet-500"},
  { id: "results",     label: "Résultats & CA",    icon: <TrendingUp size={18} />,      color: "from-green-400 to-emerald-500", roles: ["admin","manager"] },
  { id: "tva",         label: "Déclaration TVA",   icon: <Receipt size={18} />,         color: "from-violet-500 to-purple-600", roles: ["admin","manager"] },
  { id: "reports",     label: "Rapports",          icon: <FileBarChart size={18} />,     color: "from-slate-500 to-slate-700",   roles: ["admin","manager"] },
  { id: "team",        label: "Équipe",            icon: <UserCog size={18} />,         color: "from-indigo-400 to-violet-500" },
  { id: "guide",       label: "Guide d'utilisation", icon: <HelpCircle size={18} />,   color: "from-yellow-400 to-orange-400" },
];

interface LayoutProps {
  page: Page;
  onNavigate: (p: Page) => void;
  children: ReactNode;
}

export default function Layout({ page, onNavigate, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [quickDevise, setQuickDevise] = useState(false);
  const { currency, setCurrency, activeFiscalYear } = useSettings();
  const { products } = useApp();
  const { currentUser, getPendingRequestsForMe, orgKeys, organizationId, viewOrgId, setViewOrgId, licence } = useAuth();

  /**
   * Bandeau « licence expirée » : la BASE refuse déjà les écritures, ce bandeau
   * explique pourquoi à l'utilisateur et comment/getting la licence à
   * renouveler. L'administrateur principal n'est jamais bloqué.
   */
  const licenceBlocked = !licence.active && !currentUser?.isSuperAdmin;

  /** Nom de la société de l'administrateur principal (sa société d'origine) */
  const ownOrgName =
    orgKeys.find((o) => o.id === organizationId)?.organizationName ??
    currentUser?.company ??
    "Mon organisation";

  // Stock alerts count
  const stockAlertCount = products.filter(
    (p) => p.stock <= (p.minStock ?? 5)
  ).length;

  // Pending purchase approvals
  const pendingApprovals = getPendingRequestsForMe().length;

  // Filter nav by role
  const userRole = currentUser?.role ?? "user";
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  // ── Scroll management ──────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [showScrollBtns, setShowScrollBtns] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const maxScroll = el.scrollHeight - el.clientHeight;
    setCanScrollUp(scrollTop > 30);
    setCanScrollDown(scrollTop < maxScroll - 30);
    setShowScrollBtns(maxScroll > 50);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, page]);

  // Reset scroll on page change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0 });
    }
    setTimeout(updateScrollState, 100);
  }, [page, updateScrollState]);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

  const scrollUp = () => {
    scrollRef.current?.scrollBy({ top: -400, behavior: "smooth" });
  };

  const scrollDown = () => {
    scrollRef.current?.scrollBy({ top: 400, behavior: "smooth" });
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-16"} transition-all duration-300 bg-slate-900 flex flex-col shadow-2xl z-20 flex-shrink-0`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <TrendingUp size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight">GestioPro</p>
              <p className="text-slate-400 text-xs truncate">Gestion Commerciale</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-slate-400 hover:text-white transition-colors flex-shrink-0"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 relative group ${
                  active
                    ? "text-white bg-slate-800"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-0 h-full w-1 rounded-r-full bg-gradient-to-b from-violet-400 to-indigo-500" />
                )}
                <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br ${item.color}`}>
                  <span className="text-white">{item.icon}</span>
                </span>
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-left font-medium truncate">{item.label}</span>
                    {item.id === "stock" && stockAlertCount > 0 && (
                      <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center">
                        {stockAlertCount}
                      </span>
                    )}
                    {item.id === "approvals" && pendingApprovals > 0 && (
                      <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center">
                        {pendingApprovals}
                      </span>
                    )}
                    {active && <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />}
                  </>
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="my-2 mx-4 border-t border-slate-700/60" />

          {/* Settings */}
          <button
            onClick={() => onNavigate("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 relative group ${
              page === "settings"
                ? "text-white bg-slate-800"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            {page === "settings" && (
              <span className="absolute left-0 top-0 h-full w-1 rounded-r-full bg-gradient-to-b from-slate-400 to-slate-500" />
            )}
            <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-slate-500 to-slate-600">
              <Settings size={15} className="text-white" />
            </span>
            {sidebarOpen && (
              <>
                <span className="flex-1 text-left font-medium">Paramètres</span>
                {page === "settings" && <ChevronRight size={14} className="text-slate-400" />}
              </>
            )}
          </button>
        </nav>

        {/* Sidebar footer */}
        {sidebarOpen && (
          <div className="px-4 py-4 border-t border-slate-700 space-y-2">
            {activeFiscalYear && (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg">
                <BookOpen size={12} className="text-emerald-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-emerald-400 font-medium truncate">{activeFiscalYear.label}</p>
                  <p className="text-xs text-slate-500">Exercice actif</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg">
              <Globe size={12} className="text-violet-400 flex-shrink-0" />
              <p className="text-xs text-violet-300 font-mono font-bold">{currency.symbol}</p>
              <p className="text-xs text-slate-400 truncate">{currency.code} – {currency.name}</p>
            </div>
            <p className="text-slate-600 text-xs px-1">© 2025 GestioPro v2.0</p>
          </div>
        )}
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 shadow-sm flex-shrink-0">

          {/* Page title */}
          <div className="min-w-0">
            <h1 className="text-slate-800 font-bold text-base leading-tight truncate">
              {[...NAV_ITEMS, { id: "settings", label: "Paramètres" }, { id: "team", label: "Équipe" }, { id: "approvals", label: "Bons d'achat" }].find((n) => n.id === page)?.label}
            </h1>
            <p className="text-slate-400 text-xs">
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>

          {/* Scroll buttons TOP (in topbar) */}
          {showScrollBtns && (
            <div className="hidden md:flex items-center gap-1 ml-2">
              <button
                onClick={scrollToTop}
                disabled={!canScrollUp}
                title="Aller en haut"
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  canScrollUp
                    ? "bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-600 cursor-pointer"
                    : "bg-slate-50 text-slate-300 cursor-not-allowed"
                }`}
              >
                <ArrowUp size={13} />
              </button>
              <button
                onClick={scrollToBottom}
                disabled={!canScrollDown}
                title="Aller en bas"
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  canScrollDown
                    ? "bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-600 cursor-pointer"
                    : "bg-slate-50 text-slate-300 cursor-not-allowed"
                }`}
              >
                <ArrowDown size={13} />
              </button>
            </div>
          )}

          {/* Right zone */}
          <div className="ml-auto flex items-center gap-2">

            {/* Société consultée — administrateur principal uniquement */}
            {currentUser?.isSuperAdmin && orgKeys.length > 1 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-50 border border-violet-200">
                <Building2 size={13} className="text-violet-500 flex-shrink-0" />
                <select
                  value={viewOrgId ?? ""}
                  onChange={(e) => setViewOrgId(e.target.value || null)}
                  title="Données de la société affichée"
                  className="bg-transparent text-xs font-semibold text-violet-700 focus:outline-none max-w-[200px]"
                >
                  <option value="">Ma société ({ownOrgName})</option>
                  {orgKeys
                    .filter((o) => o.id !== organizationId)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.organizationName}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Role badge */}
            {currentUser && (
              <span className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border
                ${currentUser.role === "admin" ? "bg-red-500/10 border-red-500/30 text-red-400" :
                  currentUser.role === "manager" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                  "bg-blue-500/10 border-blue-500/30 text-blue-400"}`}>
                {currentUser.role === "admin" ? "👑" : currentUser.role === "manager" ? "💼" : "👤"}
                {currentUser.role === "admin" ? "Admin" : currentUser.role === "manager" ? "Manager" : "Utilisateur"}
              </span>
            )}

            {/* Pending approvals bell */}
            {pendingApprovals > 0 && (
              <button
                onClick={() => onNavigate("approvals")}
                className="relative w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center hover:bg-amber-500/30 transition"
                title={`${pendingApprovals} bon(s) d'achat en attente`}
              >
                <span className="text-amber-400 text-sm">🔔</span>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center">
                  {pendingApprovals}
                </span>
              </button>
            )}

            {/* Fiscal year chip */}
            {activeFiscalYear && (
              <button
                onClick={() => onNavigate("settings")}
                title="Gérer les exercices"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
              >
                <Calendar size={12} />
                {activeFiscalYear.label}
              </button>
            )}

            {/* Currency quick-switcher */}
            <div className="relative">
              <button
                onClick={() => setQuickDevise(!quickDevise)}
                title="Changer de devise"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg text-xs font-bold text-violet-700 hover:bg-violet-100 transition"
              >
                <Globe size={12} />
                <span className="font-mono">{currency.symbol}</span>
                <span className="hidden sm:inline">{currency.code}</span>
                <ChevronDown size={11} className={`transition-transform ${quickDevise ? "rotate-180" : ""}`} />
              </button>

              {quickDevise && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Devise rapide</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => { setCurrency(c); setQuickDevise(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left border-b border-slate-50 last:border-0 transition ${
                          currency.code === c.code ? "bg-violet-50" : ""
                        }`}
                      >
                        <span className="w-10 text-center text-xs font-black text-slate-700 bg-slate-100 rounded py-0.5">
                          {c.symbol}
                        </span>
                        <span className="flex-1 text-xs text-slate-700 truncate">{c.name}</span>
                        <span className="text-xs font-mono text-slate-400">{c.code}</span>
                        {currency.code === c.code && (
                          <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="px-3 py-2 border-t border-slate-100">
                    <button
                      onClick={() => { onNavigate("settings"); setQuickDevise(false); }}
                      className="text-xs text-violet-600 font-medium hover:underline"
                    >
                      ⚙️ Paramètres avancés →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings button */}
            <button
              onClick={() => onNavigate("settings")}
              title="Paramètres"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                page === "settings"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              <Settings size={15} />
            </button>

            {/* User menu */}
            <UserMenu onNavigateSettings={() => onNavigate("settings")} />
          </div>
        </header>

        {/* ── Scroll up button (fixed top of content) ───────────────────── */}
        {showScrollBtns && canScrollUp && (
          <div className="relative flex-shrink-0">
            <div className="absolute left-1/2 -translate-x-1/2 top-2 z-10 flex gap-2">
              <button
                onClick={scrollUp}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-slate-200 rounded-full shadow-md text-xs font-semibold text-slate-600 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-all"
              >
                <ChevronUp size={14} />
                Défiler vers le haut
              </button>
            </div>
          </div>
        )}

        {/* ── Bandeau licence expirée ─────────────────────────────────────── */}
        {licenceBlocked && (
          <div className="flex items-start gap-3 px-6 py-3 bg-red-50 border-b border-red-200 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-red-800 text-sm font-bold">
                Licence expirée — les saisies sont bloquées
              </p>
              <p className="text-red-600 text-xs mt-0.5">
                {licence.expiresAt
                  ? `La licence de votre société a expiré le ${new Date(licence.expiresAt).toLocaleDateString("fr-FR")}.`
                  : "La licence de votre société a expiré."}{" "}
                Vos données sont intactes et restent consultables : demandez une clé de renouvellement à
                l'administrateur principal de la plateforme (Paramètres → Organisation).
              </p>
            </div>
          </div>
        )}

        {/* ── Page content ─────────────────────────────────────────────── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 scroll-smooth"
          onScroll={updateScrollState}
        >
          {children}

          {/* ── Scroll down button (bottom of content) ────────────────── */}
          {showScrollBtns && canScrollDown && (
            <div className="flex justify-center mt-4 pb-2">
              <button
                onClick={scrollDown}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-slate-200 rounded-full shadow-md text-xs font-semibold text-slate-600 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-all"
              >
                <ChevronDown size={14} />
                Défiler vers le bas
              </button>
            </div>
          )}
        </div>

        {/* ── Fixed floating scroll buttons (right side) ───────────────── */}
        {showScrollBtns && (
          <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-30">
            <button
              onClick={scrollToTop}
              disabled={!canScrollUp}
              title="Retour en haut"
              className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
                canScrollUp
                  ? "bg-violet-600 text-white hover:bg-violet-500 hover:scale-110 cursor-pointer shadow-violet-500/30"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-50"
              }`}
            >
              <ArrowUp size={16} />
            </button>
            <button
              onClick={scrollToBottom}
              disabled={!canScrollDown}
              title="Aller en bas"
              className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
                canScrollDown
                  ? "bg-violet-600 text-white hover:bg-violet-500 hover:scale-110 cursor-pointer shadow-violet-500/30"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-50"
              }`}
            >
              <ArrowDown size={16} />
            </button>
          </div>
        )}
      </main>

      {/* Overlay for quick devise dropdown */}
      {quickDevise && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setQuickDevise(false)}
        />
      )}
    </div>
  );
}
