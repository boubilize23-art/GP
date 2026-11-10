import { useState, useEffect } from "react";
import { AppProvider } from "./context/AppContext";
import { SettingsProvider } from "./context/SettingsContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout, { Page } from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import SalesPage from "./pages/SalesPage";
import PurchasesPage from "./pages/PurchasesPage";
import ClientsPage from "./pages/ClientsPage";
import SuppliersPage from "./pages/SuppliersPage";
import ResultsPage from "./pages/ResultsPage";
import SettingsPage from "./pages/SettingsPage";
import StockPage from "./pages/StockPage";
import TeamPage from "./pages/TeamPage";
import PurchaseApprovalsPage from "./pages/PurchaseApprovalsPage";
import GuidePage from "./pages/GuidePage";
import TVAPage from "./pages/TVAPage";
import ReportsPage from "./pages/ReportsPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPage from "./pages/auth/ForgotPage";
import { TrendingUp } from "lucide-react";

type AuthView = "login" | "register" | "forgot";

// ── Mémorisation de la navigation ────────────────────────────────────────────
// Sans cela, un rafraîchissement (F5) renvoie l'utilisateur à l'écran de connexion
// ou au tableau de bord, en perdant le formulaire d'inscription en cours.
const AUTH_VIEW_KEY = "gp_auth_view_v1";
const CURRENT_PAGE_KEY = "gp_current_page_v1";

const ALL_PAGES: Page[] = [
  "dashboard", "products", "sales", "purchases", "clients", "suppliers",
  "receivables", "results", "stock", "settings", "team", "approvals", "tva", "guide",
];

function loadAuthView(): AuthView {
  try {
    const v = localStorage.getItem(AUTH_VIEW_KEY);
    if (v === "login" || v === "register" || v === "forgot") return v;
  } catch {
    /* stockage indisponible */
  }
  return "login";
}

function loadCurrentPage(): Page {
  try {
    const v = localStorage.getItem(CURRENT_PAGE_KEY);
    if (v && ALL_PAGES.includes(v as Page)) return v as Page;
  } catch {
    /* stockage indisponible */
  }
  return "dashboard";
}

// ── Loading screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-500/40 animate-pulse">
            <TrendingUp size={36} className="text-white" />
          </div>
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 blur-lg animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-white font-black text-3xl tracking-tight">GestioPro</p>
          <p className="text-slate-400 text-sm mt-1">Chargement de votre session...</p>
        </div>
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full animate-[loadbar_1.5s_ease-in-out_infinite]" />
        </div>
        <p className="text-slate-600 text-xs flex items-center gap-2">
          <span>🔒</span> Vérification de la session sécurisée...
        </p>
      </div>
    </div>
  );
}

// ── Auth Gate ─────────────────────────────────────────────────────────────────
function AuthGate() {
  const { isAuthenticated, isInitializing } = useAuth();
  const [authView, setAuthView] = useState<AuthView>(loadAuthView);

  // Retrouver le même écran après un rafraîchissement
  useEffect(() => {
    try {
      localStorage.setItem(AUTH_VIEW_KEY, authView);
    } catch {
      /* stockage indisponible */
    }
  }, [authView]);

  if (isInitializing) return <LoadingScreen />;

  if (!isAuthenticated) {
    if (authView === "register") return <RegisterPage onGoLogin={() => setAuthView("login")} />;
    if (authView === "forgot") return <ForgotPage onGoLogin={() => setAuthView("login")} />;
    return (
      <LoginPage
        onGoRegister={() => setAuthView("register")}
        onGoForgot={() => setAuthView("forgot")}
      />
    );
  }

  return <AppInner />;
}

// ── App Inner (authenticated) ─────────────────────────────────────────────────
function AppInner() {
  const { currentUser } = useAuth();
  const [page, setPage] = useState<Page>(loadCurrentPage);

  // Retrouver la même section après un rafraîchissement
  useEffect(() => {
    try {
      localStorage.setItem(CURRENT_PAGE_KEY, page);
    } catch {
      /* stockage indisponible */
    }
  }, [page]);

  const isAdmin = currentUser?.role === "admin";
  const isManager = currentUser?.role === "manager";

  const renderPage = () => {
    switch (page) {
      case "dashboard":  return <DashboardPage onNavigate={(p) => setPage(p as Page)} />;
      case "sales":      return <SalesPage />;
      case "purchases":  return <PurchasesPage />;
      case "approvals":  return <PurchaseApprovalsPage />;
      case "clients":    return <ClientsPage />;
      case "suppliers":  return <SuppliersPage />;
      case "team":       return <TeamPage />;
      case "settings":   return <SettingsPage />;
      // Admin/Manager only
      case "products":   return (isAdmin || isManager) ? <ProductsPage /> : <NoAccess />;
      case "stock":      return (isAdmin || isManager) ? <StockPage /> : <NoAccess />;
      case "results":    return (isAdmin || isManager) ? <ResultsPage /> : <NoAccess />;
      case "tva":        return (isAdmin || isManager) ? <TVAPage /> : <NoAccess />;
      case "reports":    return (isAdmin || isManager) ? <ReportsPage /> : <NoAccess />;
      case "guide":      return <GuidePage />;
      default:           return <DashboardPage onNavigate={(p) => setPage(p as Page)} />;
    }
  };

  return (
    <Layout page={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  );
}

// ── No Access ─────────────────────────────────────────────────────────────────
function NoAccess() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
      <div className="w-20 h-20 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-4xl">🔒</div>
      <h2 className="text-white font-bold text-xl">Accès refusé</h2>
      <p className="text-slate-400 text-sm text-center max-w-xs">
        Vous n'avez pas les permissions nécessaires pour accéder à cette section.
        Contactez votre administrateur.
      </p>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppProvider>
          <AuthGate />
        </AppProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
