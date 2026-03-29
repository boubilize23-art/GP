import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  hashPassword, verifyPassword, sanitize, sanitizeStrict,
  saveSession, loadSession, clearSession, refreshSession,
  incrementLoginAttempts, resetLoginAttempts, isLockedOut,
} from "../utils/security";

// ── Types ──────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "manager" | "user";

export interface OrgKey {
  key: string;
  ownerId: string;
  organizationName: string;
  createdAt: string;
  lastChangedAt?: string;
  description?: string;
  active: boolean;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  avatar: string;
  company: string;
  organizationKey: string;
  managedBy?: string;
  createdAt: string;
  lastLogin: string;
  resetToken?: string;
  resetTokenExpiry?: string;
  loginAttempts?: number;
  isActive: boolean;
}

export interface RecoveryRequest {
  type: "password" | "username";
  email: string;
  token: string;
  expiry: string;
  userId: string;
}

export interface RegisterData {
  username: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  company: string;
  role?: UserRole;
  organizationKey?: string;
  organizationName?: string;
  managedBy?: string;
}

export interface PurchaseRequest {
  id: string;
  requestedBy: string;
  requestedByName: string;
  requestedByRole: UserRole;
  organizationKey: string;
  supplierId: string;
  supplierName: string;
  items: { productId: string; productName: string; qty: number; unitPrice: number; total: number }[];
  total: number;
  date: string;
  note: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  orgKeys: OrgKey[];
  isAuthenticated: boolean;
  authError: string | null;
  lockoutInfo: { locked: boolean; remainingMs: number };
  recoveryRequests: RecoveryRequest[];
  isInitializing: boolean;
  purchaseRequests: PurchaseRequest[];

  login: (identifier: string, password: string, remember: boolean) => Promise<{ ok: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  forgotPassword: (email: string) => { success: boolean; token?: string; error?: string };
  forgotUsername: (email: string) => { success: boolean; username?: string; error?: string };
  resetPassword: (token: string, newPassword: string) => { success: boolean; error?: string };
  updateProfile: (data: Partial<Pick<User, "fullName" | "email" | "company" | "avatar">>) => void;
  clearError: () => void;
  refreshLockout: () => void;

  createOrgKey: (name: string, description?: string) => { success: boolean; key?: OrgKey; error?: string };
  updateOrgKey: (keyValue: string, description?: string) => { success: boolean; error?: string };
  getMyOrgKey: () => OrgKey | null;
  validateOrgKey: (key: string) => OrgKey | null;

  canViewUser: (targetUserId: string) => boolean;
  getVisibleUsers: () => User[];
  getSubordinates: () => User[];

  blockUser:   (targetId: string) => { success: boolean; error?: string };
  unblockUser: (targetId: string) => { success: boolean; error?: string };
  deleteUser:  (targetId: string) => { success: boolean; error?: string };
  canManageUser: (targetId: string) => boolean;

  submitPurchaseRequest: (req: Omit<PurchaseRequest, "id" | "createdAt" | "status" | "requestedByName" | "requestedByRole" | "organizationKey">) => void;
  approvePurchaseRequest: (id: string) => void;
  rejectPurchaseRequest: (id: string, reason: string) => void;
  getPendingRequestsForMe: () => PurchaseRequest[];
  getMyRequests: () => PurchaseRequest[];

  generateOrgKey: () => string;
}

// ── Storage ────────────────────────────────────────────────────────────────────
const USERS_KEY    = "gp_users_v4";
const RECOVERY_KEY = "gp_recovery_v2";
const PURCHASE_KEY = "gp_purchase_requests_v1";
const ORG_KEYS_KEY = "gp_org_keys_v1";
const MAX_ATTEMPTS = 5;

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
function loadUsers(): User[] {
  try { const r = localStorage.getItem(USERS_KEY); if (r) return JSON.parse(r); } catch {}
  return [];
}
function saveUsers(u: User[]) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
function loadRecovery(): RecoveryRequest[] {
  try { const r = localStorage.getItem(RECOVERY_KEY); if (r) return JSON.parse(r); } catch {}
  return [];
}
function saveRecovery(r: RecoveryRequest[]) { localStorage.setItem(RECOVERY_KEY, JSON.stringify(r)); }
function loadPurchaseRequests(): PurchaseRequest[] {
  try { const r = localStorage.getItem(PURCHASE_KEY); if (r) return JSON.parse(r); } catch {}
  return [];
}
function savePurchaseRequests(r: PurchaseRequest[]) { localStorage.setItem(PURCHASE_KEY, JSON.stringify(r)); }
function loadOrgKeys(): OrgKey[] {
  try { const r = localStorage.getItem(ORG_KEYS_KEY); if (r) return JSON.parse(r); } catch {}
  return [];
}
function saveOrgKeys(k: OrgKey[]) { localStorage.setItem(ORG_KEYS_KEY, JSON.stringify(k)); }

function generateKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${seg()}-${seg()}-${seg()}`;
}

// ── Context ────────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers]                       = useState<User[]>([]);
  const [orgKeys, setOrgKeys]                   = useState<OrgKey[]>([]);
  const [currentUser, setCurrentUser]           = useState<User | null>(null);
  const [authError, setAuthError]               = useState<string | null>(null);
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([]);
  const [isInitializing, setIsInitializing]     = useState(true);
  const [lockoutInfo, setLockoutInfo]           = useState<{ locked: boolean; remainingMs: number }>({ locked: false, remainingMs: 0 });
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);

  const isAuthenticated = currentUser !== null;

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      let loadedUsers = loadUsers();
      let loadedKeys  = loadOrgKeys();
      const DEFAULT_KEY = "GEST-2025-DEMO";

      if (loadedUsers.length === 0) {
        const adminHash   = await hashPassword("Admin@2025");
        const managerHash = await hashPassword("Manager@2025");
        const userHash    = await hashPassword("User@2025");
        const now  = new Date().toISOString();
        const today = now.split("T")[0];

        const defaultAdmin: User = {
          id: "admin-001", username: "admin", fullName: "Administrateur Principal",
          email: "admin@gestiopro.com", passwordHash: adminHash, role: "admin",
          avatar: "AD", company: "GestioPro SARL", organizationKey: DEFAULT_KEY,
          createdAt: today, lastLogin: now, isActive: true,
        };
        const defaultManager: User = {
          id: "manager-001", username: "manager", fullName: "Manager Commercial",
          email: "manager@gestiopro.com", passwordHash: managerHash, role: "manager",
          avatar: "MC", company: "GestioPro SARL", organizationKey: DEFAULT_KEY,
          managedBy: "admin-001", createdAt: today, lastLogin: now, isActive: true,
        };
        const defaultUser: User = {
          id: "user-001", username: "utilisateur", fullName: "Utilisateur Standard",
          email: "user@gestiopro.com", passwordHash: userHash, role: "user",
          avatar: "US", company: "GestioPro SARL", organizationKey: DEFAULT_KEY,
          managedBy: "manager-001", createdAt: today, lastLogin: now, isActive: true,
        };
        loadedUsers = [defaultAdmin, defaultManager, defaultUser];
        saveUsers(loadedUsers);
      }

      if (loadedKeys.length === 0) {
        const defaultOrgKey: OrgKey = {
          key: DEFAULT_KEY, ownerId: "admin-001",
          organizationName: "GestioPro SARL",
          createdAt: new Date().toISOString().split("T")[0],
          description: "Clé d'organisation par défaut", active: true,
        };
        loadedKeys = [defaultOrgKey];
        saveOrgKeys(loadedKeys);
      }

      // ✅ FIX ÉQUIPE : Corriger les managers/users sans managedBy
      // Si un manager n'a pas de managedBy, on l'assigne à l'admin de son org
      let needsSave = false;
      const fixedUsers = loadedUsers.map((u) => {
        if (u.role === "manager" && !u.managedBy) {
          const adminOfOrg = loadedUsers.find(
            (a) => a.role === "admin" && a.organizationKey === u.organizationKey
          );
          if (adminOfOrg) {
            needsSave = true;
            return { ...u, managedBy: adminOfOrg.id };
          }
        }
        if (u.role === "user" && !u.managedBy) {
          // Assigner au manager de la même org, sinon à l'admin
          const managerOfOrg = loadedUsers.find(
            (m) => m.role === "manager" && m.organizationKey === u.organizationKey
          );
          const adminOfOrg = loadedUsers.find(
            (a) => a.role === "admin" && a.organizationKey === u.organizationKey
          );
          const supervisor = managerOfOrg || adminOfOrg;
          if (supervisor) {
            needsSave = true;
            return { ...u, managedBy: supervisor.id };
          }
        }
        return u;
      });
      if (needsSave) {
        saveUsers(fixedUsers);
        loadedUsers = fixedUsers;
      }

      setUsers(loadedUsers);
      setOrgKeys(loadedKeys);
      setRecoveryRequests(loadRecovery());
      setPurchaseRequests(loadPurchaseRequests());

      const session = loadSession();
      if (session) {
        const user = loadedUsers.find((u) => u.id === session.userId && u.isActive);
        if (user) {
          const updated = { ...user, lastLogin: new Date().toISOString() };
          const newUsers = loadedUsers.map((u) => (u.id === user.id ? updated : u));
          saveUsers(newUsers);
          setUsers(newUsers);
          setCurrentUser(updated);
          refreshSession(user.id);
        } else {
          clearSession();
        }
      }
      setIsInitializing(false);
    }
    init();
  }, []);

  useEffect(() => {
    refreshLockout();
    const interval = setInterval(refreshLockout, 5000);
    return () => clearInterval(interval);
  }, []);

  const refreshLockout = () => setLockoutInfo(isLockedOut());
  const clearError = () => setAuthError(null);

  // ── Login ─────────────────────────────────────────────────────────────────────
  const login = async (identifier: string, password: string, remember: boolean) => {
    const lockout = isLockedOut();
    if (lockout.locked) {
      const mins = Math.ceil(lockout.remainingMs / 60000);
      const msg = `Compte bloqué. Réessayez dans ${mins} minute${mins > 1 ? "s" : ""}.`;
      setAuthError(msg); setLockoutInfo(lockout);
      return { ok: false, error: msg };
    }
    const cleanId = sanitizeStrict(identifier).toLowerCase();
    if (!cleanId || !password) return { ok: false, error: "Veuillez remplir tous les champs." };

    const user = users.find(
      (u) => (u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId) && u.isActive
    );
    if (!user) {
      const attempts = incrementLoginAttempts(); refreshLockout();
      const remaining = MAX_ATTEMPTS - attempts;
      const msg = remaining > 0
        ? `Identifiant incorrect. ${remaining} tentative${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}.`
        : "Trop de tentatives. Compte bloqué 15 min.";
      setAuthError(msg);
      return { ok: false, error: msg };
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const attempts = incrementLoginAttempts(); refreshLockout();
      const remaining = MAX_ATTEMPTS - attempts;
      const msg = remaining > 0
        ? `Mot de passe incorrect. ${remaining} tentative${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}.`
        : "Trop de tentatives. Compte bloqué 15 min.";
      setAuthError(msg);
      return { ok: false, error: msg };
    }
    resetLoginAttempts(); refreshLockout();
    const updated = { ...user, lastLogin: new Date().toISOString() };
    const newUsers = users.map((u) => (u.id === user.id ? updated : u));
    saveUsers(newUsers); setUsers(newUsers); setCurrentUser(updated); setAuthError(null);
    saveSession(user.id);
    if (remember) {
      const { saveRememberedCredentials } = await import("../utils/security");
      saveRememberedCredentials(identifier, password);
    } else {
      const { clearRememberedCredentials } = await import("../utils/security");
      clearRememberedCredentials();
    }
    return { ok: true };
  };

  // ── Register ──────────────────────────────────────────────────────────────────
  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    if (data.password !== data.confirmPassword)
      return { success: false, error: "Les mots de passe ne correspondent pas." };
    if (data.password.length < 8)
      return { success: false, error: "Mot de passe trop court (8 caractères minimum)." };

    const cleanEmail    = sanitize(data.email).toLowerCase();
    const cleanUsername = sanitizeStrict(data.username).toLowerCase();
    const cleanFullName = sanitize(data.fullName);
    const cleanCompany  = sanitize(data.company);
    const role          = data.role ?? "user";

    if (users.find((u) => u.email.toLowerCase() === cleanEmail))
      return { success: false, error: "Cet email est déjà utilisé." };
    if (users.find((u) => u.username.toLowerCase() === cleanUsername))
      return { success: false, error: "Ce nom d'utilisateur est déjà pris." };

    let orgKey   = "";
    let managedBy: string | undefined = undefined;

    if (role === "admin") {
      if (!data.organizationKey || data.organizationKey.trim().length < 8)
        return { success: false, error: "Veuillez créer une clé d'organisation valide (minimum 8 caractères)." };
      const keyValue = data.organizationKey.trim().toUpperCase();
      const keyExists = loadOrgKeys().find((k) => k.key === keyValue);
      if (keyExists) return { success: false, error: "Cette clé d'organisation est déjà utilisée. Choisissez-en une autre." };
      orgKey = keyValue;
      const newOrgKey: OrgKey = {
        key: orgKey, ownerId: "pending",
        organizationName: cleanCompany,
        createdAt: new Date().toISOString().split("T")[0],
        description: data.organizationName || `Organisation de ${cleanFullName}`,
        active: true,
      };
      const updatedKeys = [...loadOrgKeys(), newOrgKey];
      saveOrgKeys(updatedKeys);
      setOrgKeys(updatedKeys);
    } else {
      // Manager ou Utilisateur : clé fournie par l'admin
      if (!data.organizationKey || data.organizationKey.trim().length === 0)
        return { success: false, error: "Veuillez entrer la clé d'organisation fournie par votre administrateur." };

      const keyValue = data.organizationKey.trim().toUpperCase();
      const currentKeys = loadOrgKeys();
      let orgKeyObj = currentKeys.find((k) => k.key === keyValue && k.active);

      // ✅ FIX : Si la clé n'existe pas localement (autre appareil), on la crée automatiquement
      if (!orgKeyObj) {
        if (keyValue.length < 6)
          return { success: false, error: "Clé d'organisation trop courte. Vérifiez la clé fournie par votre administrateur." };
        const autoKey: OrgKey = {
          key: keyValue, ownerId: "shared",
          organizationName: cleanCompany || "Organisation partagée",
          createdAt: new Date().toISOString().split("T")[0],
          description: "Clé partagée par l'administrateur",
          active: true,
        };
        const updatedKeys = [...currentKeys, autoKey];
        saveOrgKeys(updatedKeys);
        setOrgKeys(updatedKeys);
        orgKeyObj = autoKey;
      }

      orgKey = keyValue;

      // ✅ FIX ÉQUIPE : Assigner automatiquement le managedBy correct
      const allUsers = loadUsers();
      if (role === "manager") {
        // Le manager est géré par l'admin de l'organisation
        const adminOfOrg = allUsers.find((u) => u.role === "admin" && u.organizationKey === keyValue);
        managedBy = adminOfOrg?.id;
      } else if (role === "user") {
        // L'utilisateur est géré par le manager de l'org, sinon l'admin
        const managerOfOrg = allUsers.find((u) => u.role === "manager" && u.organizationKey === keyValue);
        const adminOfOrg   = allUsers.find((u) => u.role === "admin"   && u.organizationKey === keyValue);
        managedBy = (managerOfOrg || adminOfOrg)?.id;
      }
    }

    const passwordHash = await hashPassword(data.password);
    const newId = uuidv4();
    const newUser: User = {
      id: newId, username: cleanUsername, fullName: cleanFullName,
      email: cleanEmail, passwordHash, role,
      avatar: getInitials(cleanFullName), company: cleanCompany,
      organizationKey: orgKey,
      managedBy: data.managedBy || managedBy,
      createdAt: new Date().toISOString().split("T")[0],
      lastLogin: new Date().toISOString(), isActive: true,
    };

    // Si admin, mettre à jour l'ownerId de la clé
    if (role === "admin") {
      const updatedKeys = loadOrgKeys().map((k) =>
        k.key === orgKey ? { ...k, ownerId: newId } : k
      );
      saveOrgKeys(updatedKeys);
      setOrgKeys(updatedKeys);
    }

    const newUsers = [...users, newUser];
    saveUsers(newUsers); setUsers(newUsers);
    return { success: true };
  };

  // ── Logout ────────────────────────────────────────────────────────────────────
  const logout = () => { clearSession(); setCurrentUser(null); setAuthError(null); };

  // ── Forgot / Reset ────────────────────────────────────────────────────────────
  const forgotPassword = (email: string) => {
    const user = users.find((u) => u.email.toLowerCase() === sanitize(email).toLowerCase());
    if (!user) return { success: false, error: "Aucun compte associé à cet email." };
    const token  = Math.random().toString(36).slice(2, 10).toUpperCase();
    const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const req: RecoveryRequest = { type: "password", email: user.email, token, expiry, userId: user.id };
    const newReqs = [...recoveryRequests.filter((r) => r.userId !== user.id || r.type !== "password"), req];
    saveRecovery(newReqs); setRecoveryRequests(newReqs);
    return { success: true, token };
  };

  const forgotUsername = (email: string) => {
    const user = users.find((u) => u.email.toLowerCase() === sanitize(email).toLowerCase());
    if (!user) return { success: false, error: "Aucun compte associé à cet email." };
    return { success: true, username: user.username };
  };

  const resetPassword = (token: string, newPassword: string) => {
    const req = recoveryRequests.find((r) => r.token === token && r.type === "password");
    if (!req) return { success: false, error: "Code invalide." };
    if (new Date(req.expiry) < new Date()) return { success: false, error: "Code expiré." };
    if (newPassword.length < 8) return { success: false, error: "Mot de passe trop court." };
    hashPassword(newPassword).then((hash) => {
      const newUsers = users.map((u) => (u.id === req.userId ? { ...u, passwordHash: hash } : u));
      saveUsers(newUsers); setUsers(newUsers);
    });
    const newReqs = recoveryRequests.filter((r) => r.token !== token);
    saveRecovery(newReqs); setRecoveryRequests(newReqs);
    return { success: true };
  };

  // ── Profile ───────────────────────────────────────────────────────────────────
  const updateProfile = (data: Partial<Pick<User, "fullName" | "email" | "company" | "avatar">>) => {
    if (!currentUser) return;
    const updated  = { ...currentUser, ...data };
    const newUsers = users.map((u) => (u.id === currentUser.id ? updated : u));
    saveUsers(newUsers); setUsers(newUsers); setCurrentUser(updated);
  };

  // ── Org Key Management ─────────────────────────────────────────────────────────
  const createOrgKey = (name: string, description?: string): { success: boolean; key?: OrgKey; error?: string } => {
    if (!currentUser || currentUser.role !== "admin")
      return { success: false, error: "Seul un administrateur peut créer une clé d'organisation." };
    const existingKey = orgKeys.find((k) => k.ownerId === currentUser.id);
    if (existingKey) {
      const lastChanged = existingKey.lastChangedAt || existingKey.createdAt;
      const daysSince = (Date.now() - new Date(lastChanged).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 30) {
        const daysLeft = Math.ceil(30 - daysSince);
        return { success: false, error: `Vous ne pouvez modifier votre clé qu'une fois par mois. Prochain changement dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}.` };
      }
    }
    const newKey: OrgKey = {
      key: generateKey(), ownerId: currentUser.id,
      organizationName: name,
      createdAt: new Date().toISOString().split("T")[0],
      lastChangedAt: new Date().toISOString().split("T")[0],
      description, active: true,
    };
    const oldKeyValue = existingKey ? existingKey.key : null;
    const updatedKeys = orgKeys.map((k) => k.ownerId === currentUser.id ? { ...k, active: false } : k);
    updatedKeys.push(newKey);
    const updatedUsers = users.map((u) =>
      u.organizationKey === (oldKeyValue || currentUser.organizationKey)
        ? { ...u, organizationKey: newKey.key }
        : u
    );
    saveOrgKeys(updatedKeys); setOrgKeys(updatedKeys);
    saveUsers(updatedUsers); setUsers(updatedUsers);
    setCurrentUser({ ...currentUser, organizationKey: newKey.key });
    return { success: true, key: newKey };
  };

  const updateOrgKey = (keyValue: string, description?: string): { success: boolean; error?: string } => {
    if (!currentUser || currentUser.role !== "admin")
      return { success: false, error: "Seul un administrateur peut modifier une clé." };
    const existingKey = orgKeys.find((k) => k.key === keyValue && k.ownerId === currentUser.id);
    if (!existingKey) return { success: false, error: "Clé introuvable." };
    const updated = orgKeys.map((k) =>
      k.key === keyValue ? { ...k, description, lastChangedAt: new Date().toISOString().split("T")[0] } : k
    );
    saveOrgKeys(updated); setOrgKeys(updated);
    return { success: true };
  };

  const getMyOrgKey = (): OrgKey | null => {
    if (!currentUser) return null;
    return orgKeys.find((k) => k.key === currentUser.organizationKey && k.active) ?? null;
  };

  const validateOrgKey = (key: string): OrgKey | null => {
    return orgKeys.find((k) => k.key === key.trim().toUpperCase() && k.active) ?? null;
  };

  // ── ✅ VISIBILITÉ ÉQUIPE — Corrigée ────────────────────────────────────────────
  const canViewUser = (targetUserId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.id === targetUserId) return true;
    const target = users.find((u) => u.id === targetUserId);
    if (!target) return false;
    // Doit être dans la même organisation
    if (target.organizationKey !== currentUser.organizationKey) return false;
    // Admin voit tout le monde dans son org
    if (currentUser.role === "admin") return true;
    // Manager voit ses utilisateurs directs + lui-même
    if (currentUser.role === "manager") {
      return target.role === "user" && target.managedBy === currentUser.id;
    }
    return false;
  };

  const getVisibleUsers = (): User[] => {
    if (!currentUser) return [];
    // Admin : voit tous les membres de son organisation
    if (currentUser.role === "admin") {
      return users.filter((u) => u.organizationKey === currentUser.organizationKey);
    }
    // Manager : voit lui-même + ses utilisateurs directs
    if (currentUser.role === "manager") {
      return users.filter((u) =>
        u.organizationKey === currentUser.organizationKey &&
        (u.id === currentUser.id || (u.role === "user" && u.managedBy === currentUser.id))
      );
    }
    // Utilisateur : voit seulement lui-même
    return [currentUser];
  };

  const getSubordinates = (): User[] => {
    if (!currentUser) return [];
    // Admin : tous les membres sauf lui-même
    if (currentUser.role === "admin") {
      return users.filter((u) =>
        u.organizationKey === currentUser.organizationKey && u.id !== currentUser.id
      );
    }
    // Manager : uniquement ses utilisateurs directs
    if (currentUser.role === "manager") {
      return users.filter((u) =>
        u.organizationKey === currentUser.organizationKey &&
        u.role === "user" &&
        u.managedBy === currentUser.id
      );
    }
    return [];
  };

  // ── ✅ GESTION UTILISATEURS — Corrigée ─────────────────────────────────────────
  const canManageUser = (targetId: string): boolean => {
    if (!currentUser) return false;
    const target = users.find((u) => u.id === targetId);
    if (!target) return false;
    if (target.id === currentUser.id) return false;
    if (target.organizationKey !== currentUser.organizationKey) return false;
    // Admin peut gérer managers et utilisateurs (pas les autres admins)
    if (currentUser.role === "admin") return target.role !== "admin";
    // Manager peut gérer uniquement ses utilisateurs directs
    if (currentUser.role === "manager") {
      return target.role === "user" && target.managedBy === currentUser.id;
    }
    return false;
  };

  const blockUser = (targetId: string): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: "Non authentifié." };
    if (!canManageUser(targetId)) return { success: false, error: "Permission refusée." };
    const target = users.find((u) => u.id === targetId);
    if (!target) return { success: false, error: "Utilisateur introuvable." };
    if (!target.isActive) return { success: false, error: "Ce compte est déjà bloqué." };
    const updated = users.map((u) => u.id === targetId ? { ...u, isActive: false } : u);
    saveUsers(updated); setUsers(updated);
    return { success: true };
  };

  const unblockUser = (targetId: string): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: "Non authentifié." };
    if (!canManageUser(targetId)) return { success: false, error: "Permission refusée." };
    const target = users.find((u) => u.id === targetId);
    if (!target) return { success: false, error: "Utilisateur introuvable." };
    if (target.isActive) return { success: false, error: "Ce compte est déjà actif." };
    const updated = users.map((u) => u.id === targetId ? { ...u, isActive: true } : u);
    saveUsers(updated); setUsers(updated);
    return { success: true };
  };

  const deleteUser = (targetId: string): { success: boolean; error?: string } => {
    if (!currentUser) return { success: false, error: "Non authentifié." };
    if (!canManageUser(targetId)) return { success: false, error: "Permission refusée." };
    const target = users.find((u) => u.id === targetId);
    if (!target) return { success: false, error: "Utilisateur introuvable." };
    if (target.role === "admin") {
      const adminCount = users.filter((u) => u.role === "admin" && u.organizationKey === currentUser.organizationKey).length;
      if (adminCount <= 1) return { success: false, error: "Impossible de supprimer le dernier administrateur." };
    }
    const updated = users.filter((u) => u.id !== targetId);
    saveUsers(updated); setUsers(updated);
    return { success: true };
  };

  // ── ✅ BONS D'ACHAT — Corrigés ─────────────────────────────────────────────────
  const submitPurchaseRequest = (req: Omit<PurchaseRequest, "id" | "createdAt" | "status" | "requestedByName" | "requestedByRole" | "organizationKey">) => {
    if (!currentUser) return;
    const newReq: PurchaseRequest = {
      ...req, id: uuidv4(),
      requestedByName: currentUser.fullName,
      requestedByRole: currentUser.role,
      organizationKey: currentUser.organizationKey,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const updated = [...purchaseRequests, newReq];
    savePurchaseRequests(updated); setPurchaseRequests(updated);
  };

  const approvePurchaseRequest = (id: string) => {
    if (!currentUser) return;
    const updated = purchaseRequests.map((r) =>
      r.id === id
        ? { ...r, status: "approved" as const, reviewedBy: currentUser.id, reviewedByName: currentUser.fullName, reviewedAt: new Date().toISOString() }
        : r
    );
    savePurchaseRequests(updated); setPurchaseRequests(updated);
  };

  const rejectPurchaseRequest = (id: string, reason: string) => {
    if (!currentUser) return;
    const updated = purchaseRequests.map((r) =>
      r.id === id
        ? { ...r, status: "rejected" as const, reviewedBy: currentUser.id, reviewedByName: currentUser.fullName, reviewedAt: new Date().toISOString(), rejectionReason: reason }
        : r
    );
    savePurchaseRequests(updated); setPurchaseRequests(updated);
  };

  // ✅ Admin voit TOUTES les demandes de son org
  // ✅ Manager voit SEULEMENT les demandes de ses utilisateurs directs
  const getPendingRequestsForMe = (): PurchaseRequest[] => {
    if (!currentUser) return [];
    if (currentUser.role === "user") return [];
    return purchaseRequests.filter((r) => {
      if (r.organizationKey !== currentUser.organizationKey) return false;
      if (r.status !== "pending") return false;
      if (currentUser.role === "admin") return true;
      if (currentUser.role === "manager") {
        const requester = users.find((u) => u.id === r.requestedBy);
        return requester?.managedBy === currentUser.id;
      }
      return false;
    });
  };

  const getMyRequests = (): PurchaseRequest[] => {
    if (!currentUser) return [];
    if (currentUser.role === "admin") {
      return purchaseRequests.filter((r) => r.organizationKey === currentUser.organizationKey);
    }
    if (currentUser.role === "manager") {
      return purchaseRequests.filter((r) =>
        r.organizationKey === currentUser.organizationKey &&
        (r.requestedBy === currentUser.id ||
         users.find((u) => u.id === r.requestedBy)?.managedBy === currentUser.id)
      );
    }
    return purchaseRequests.filter((r) => r.requestedBy === currentUser.id);
  };

  const generateOrgKey = (): string => generateKey();

  return (
    <AuthContext.Provider value={{
      currentUser, users, orgKeys, isAuthenticated, authError, lockoutInfo,
      recoveryRequests, isInitializing, purchaseRequests,
      login, register, logout, forgotPassword, forgotUsername, resetPassword,
      updateProfile, clearError, refreshLockout,
      createOrgKey, updateOrgKey, getMyOrgKey, validateOrgKey,
      canViewUser, getVisibleUsers, getSubordinates,
      blockUser, unblockUser, deleteUser, canManageUser,
      submitPurchaseRequest, approvePurchaseRequest, rejectPurchaseRequest,
      getPendingRequestsForMe, getMyRequests, generateOrgKey,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
