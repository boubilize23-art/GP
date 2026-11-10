import {
  createContext, useContext, useState, useEffect, ReactNode, useCallback,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, describeSupabaseError, AUTH_REDIRECT_URL } from "../supabase";
import {
  saveRememberedCredentials, clearRememberedCredentials,
} from "../utils/security";

// ── Types ──────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "manager" | "user";

export interface OrgKey {
  /** Identifiant technique de l'organisation */
  id: string;
  key: string;
  ownerId: string;
  organizationName: string;
  createdAt: string;
  lastChangedAt?: string;
  description?: string;
  active: boolean;
  /** Fin de la licence de la société (null = illimitée) */
  licenceExpiresAt?: string | null;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatar: string;
  company: string;
  organizationKey: string;
  /** Identifiant technique de l'organisation du compte */
  organizationId: string | null;
  /** Administrateur principal de la plateforme : voit et gère toutes les sociétés */
  isSuperAdmin: boolean;
  managedBy?: string;
  createdAt: string;
  lastLogin: string;
  isActive: boolean;
}

export interface RecoveryRequest {
  type: "password" | "username";
  email: string;
  token: string;
  expiry: string;
  userId: string;
}

/**
 * Clé d'inscription administrateur : elle autorise la création d'une nouvelle
 * société et ne peut servir qu'une fois. Émise par l'administrateur principal.
 */
export interface AdminSignupKey {
  /** Clé affichée, formatée : XXXX-XXXX-XXXX */
  code: string;
  /** Pour qui est-elle prévue ? (libellé libre) */
  label: string;
  createdAt: string;
  usedAt?: string | null;
  usedEmail?: string | null;
  revokedAt?: string | null;
  /** Durée de licence accordée à l'ouverture de cette clé (jours) */
  licenceDays?: number;
}

/** Rôle visé par une clé d'invitation : directeur de poste ou utilisateur */
export type InvitationRole = "manager" | "user";

/**
 * Clé d'invitation émise par l'administrateur de société : une par poste.
 * Elle est RÉEMPLOYABLE (plusieurs utilisateurs peuvent s'en servir), valable
 * 30 jours, et elle détermine le rôle et l'encadrant du nouvel inscrit.
 */
export interface InvitationKey {
  id: string;
  /** Clé affichée, formatée : XXXX-XXXX-XXXX */
  code: string;
  /** Rôle attribué à qui s'inscrit avec cette clé */
  roleCible: InvitationRole;
  /** Poste concerné (ex : « Boutique Dakar ») */
  poste: string;
  /** Directeur de rattachement (null = l'administrateur de société) */
  managerId: string | null;
  managerName: string;
  organizationId: string;
  organizationName: string;
  label: string;
  createdAt: string;
  /** Fin de validité de la clé (null = jamais) */
  expiresAt: string | null;
  revokedAt: string | null;
  /** Nombre d'utilisateurs qui se sont inscrits avec cette clé */
  usesCount: number;
  lastUsedAt: string | null;
  lastUsedEmail: string | null;
}

/**
 * Ce que dit la base à propos d'une clé saisie au moment de l'inscription.
 * C'est la BASE qui décide du rôle et du poste : le formulaire ne fait que
 * l'afficher.
 */
export interface SignupKeyInfo {
  ok: boolean;
  /** Motif du refus : invalide, utilisee, expiree, revoquee, licence_expiree */
  reason?: string;
  /** Type de clé : inscription administrateur ou invitation */
  type?: "admin_societe" | "invitation";
  /** Rôle attribué par la clé */
  role?: UserRole;
  /** Durée de licence (inscription administrateur) */
  days?: number;
  /** Fin de validité de la clé */
  expiresAt?: string | null;
  /** Société visée (invitation) */
  organization?: string;
  /** Poste visé (invitation) */
  poste?: string;
}

/** État de la licence de la société de l'utilisateur connecté */
export interface OrgLicence {
  /** Fin de la licence (null = illimitée) */
  expiresAt: string | null;
  /** La société peut-elle encore écrire ? */
  active: boolean;
  /** Jours restants (null = illimitée) */
  daysLeft: number | null;
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

interface ProfileRow {
  id: string;
  email: string;
  username: string;
  full_name: string;
  company: string;
  role: UserRole;
  avatar: string;
  managed_by: string | null;
  organization_id: string | null;
  is_active: boolean;
  is_super_admin?: boolean;
  last_login: string | null;
  created_at: string;
}

interface OrgRow {
  id: string;
  name: string;
  join_code: string;
  description: string | null;
  active: boolean;
  created_at: string;
  last_changed_at: string;
  /** Fin de la licence de la société (null = illimitée) */
  licence_expires_at?: string | null;
}

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  orgKeys: OrgKey[];
  /** Identifiant technique de l'organisation (pour les écritures en base) */
  organizationId: string | null;
  /**
   * Société consultée : l'administrateur principal peut navigational dans les
   * données de n'importe quelle société cliente. `null` = sa propre société.
   */
  viewOrgId: string | null;
  setViewOrgId: (id: string | null) => void;
  /** Organisation effectivement affichée : celle consultée, sinon la sienne */
  activeOrgId: string | null;
  isAuthenticated: boolean;
  authError: string | null;
  lockoutInfo: { locked: boolean; remainingMs: number };
  recoveryRequests: RecoveryRequest[];
  isInitializing: boolean;
  purchaseRequests: PurchaseRequest[];

  login: (identifier: string, password: string, remember: boolean) => Promise<{ ok: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string; pendingConfirmation?: boolean }>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<{ success: boolean; token?: string; error?: string }>;
  forgotUsername: (email: string) => Promise<{ success: boolean; username?: string; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<Pick<User, "fullName" | "email" | "company" | "avatar">>) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  refreshLockout: () => void;

  createOrgKey: (name: string, description?: string) => Promise<{ success: boolean; key?: OrgKey; error?: string }>;
  updateOrgKey: (keyValue: string, description?: string) => Promise<{ success: boolean; error?: string }>;
  getMyOrgKey: () => OrgKey | null;
  validateOrgKey: (key: string) => Promise<OrgKey | null>;

  /** Clés d'inscription administrateur : elles autorisent la création d'une société */
  listAdminSignupKeys: () => Promise<AdminSignupKey[]>;
  createAdminSignupKey: (label?: string, licenceDays?: number) => Promise<{ success: boolean; code?: string; error?: string }>;
  revokeAdminSignupKey: (code: string) => Promise<{ success: boolean; error?: string }>;

  /** Licence de la société de l'utilisateur connecté */
  licence: OrgLicence;
  /** Rafraîchit l'état de la licence (après un renouvellement) */
  refreshLicence: () => Promise<void>;

  /** Clés d'invitation : une par poste, émises par l'administrateur de société */
  listInvitationKeys: () => Promise<InvitationKey[]>;
  createInvitationKey: (
    roleCible: InvitationRole,
    poste?: string,
    managerId?: string | null,
    label?: string,
    days?: number,
  ) => Promise<{ success: boolean; code?: string; error?: string }>;
  revokeInvitationKey: (code: string) => Promise<{ success: boolean; error?: string }>;

  /** Vérifie une clé AVANT l'inscription : la base décide du rôle et du poste */
  checkSignupKey: (code: string) => Promise<SignupKeyInfo>;
  /** Renouvelle la licence de la société avec une nouvelle clé (données conservées) */
  renewLicence: (code: string) => Promise<{ success: boolean; error?: string; expiresAt?: string | null }>;
  /** Bloque / débloque toute une société (administrateur principal uniquement) */
  setOrganizationBlocked: (orgId: string, blocked: boolean) => Promise<{ success: boolean; error?: string; count?: number }>;

  canViewUser: (targetUserId: string) => boolean;
  getVisibleUsers: () => User[];
  getSubordinates: () => User[];

  blockUser: (targetId: string) => Promise<{ success: boolean; error?: string }>;
  unblockUser: (targetId: string) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (targetId: string) => Promise<{ success: boolean; error?: string }>;
  canManageUser: (targetId: string) => boolean;
  /** Réinitialise le mot de passe d'un compte (envoi d'email impossible pour les clients) */
  resetUserPassword: (targetId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;

  submitPurchaseRequest: (req: Omit<PurchaseRequest, "id" | "createdAt" | "status" | "requestedByName" | "requestedByRole" | "organizationKey">) => void;
  approvePurchaseRequest: (id: string) => void;
  rejectPurchaseRequest: (id: string, reason: string) => void;
  getPendingRequestsForMe: () => PurchaseRequest[];
  getMyRequests: () => PurchaseRequest[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Helpers ────────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "GP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Formate une clé d'organisation pour l'affichage : XXXX-XXXX-XXXX.
 * La base stocke la forme canonique (sans tirets) ; c'est plus sûr pour les
 * comparaisons, et l'utilisateur voit une clé lisible.
 */
function formatKey(code: string): string {
  const clean = (code ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (clean.length !== 12) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}`;
}

function profileToUser(p: ProfileRow, org: OrgRow | null): User {
  return {
    id: p.id,
    username: p.username,
    fullName: p.full_name,
    email: p.email,
    role: p.role,
    avatar: p.avatar || getInitials(p.full_name || p.username),
    company: p.company,
    organizationKey: org ? formatKey(org.join_code) : "",
    organizationId: p.organization_id ?? null,
    isSuperAdmin: !!p.is_super_admin,
    managedBy: p.managed_by ?? undefined,
    createdAt: (p.created_at ?? "").slice(0, 10),
    lastLogin: p.last_login ?? "",
    isActive: p.is_active,
  };
}

function orgToKey(org: OrgRow, ownerId: string): OrgKey {
  return {
    id: org.id,
    key: formatKey(org.join_code),
    ownerId,
    organizationName: org.name,
    createdAt: (org.created_at ?? "").slice(0, 10),
    lastChangedAt: (org.last_changed_at ?? "").slice(0, 10),
    description: org.description ?? undefined,
    active: org.active,
    licenceExpiresAt: org.licence_expires_at ?? null,
  };
}

/**
 * Traduit la fin de licence d'une société en un état lisible.
 * - null (illimitée) : la société peut écrire indéfiniment ;
 * - une date future  : licence active, il reste X jours ;
 * - une date passée   : licence expirée, la BASE bloque les écritures
 *   (les données restent intactes et lisibles).
 */
function computeLicence(expiresAt: string | null | undefined): OrgLicence {
  if (!expiresAt) return { expiresAt: null, active: true, daysLeft: null };
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return { expiresAt: null, active: true, daysLeft: null };
  return {
    expiresAt,
    active: ms > 0,
    daysLeft: ms > 0 ? Math.ceil(ms / 86400000) : 0,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers]                     = useState<User[]>([]);
  const [orgKeys, setOrgKeys]                 = useState<OrgKey[]>([]);
  const [currentUser, setCurrentUser]         = useState<User | null>(null);
  const [authError, setAuthError]             = useState<string | null>(null);
  const [recoveryRequests]                 = useState<RecoveryRequest[]>([]);
  const [isInitializing, setIsInitializing]   = useState(true);
  const [lockoutInfo, setLockoutInfo]         = useState({ locked: false, remainingMs: 0 });
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  /** Identifiant de l'organisation courante (pour les écritures) */
  const [organizationId, setOrganizationId]   = useState<string | null>(null);
  /** Société consultée (administrateur principal) : null = sa propre société */
  const [viewOrgId, setViewOrgId]             = useState<string | null>(null);
  /** Licence de la société de l'utilisateur connecté */
  const [licence, setLicence]                 = useState<OrgLicence>({ expiresAt: null, active: true, daysLeft: null });

  const isAuthenticated = currentUser !== null;
  /** Organisation affichée : celle consultée si l'admin principal en a choisi une */
  const activeOrgId = viewOrgId ?? organizationId;

  const clearError = () => setAuthError(null);
  const refreshLockout = () => setLockoutInfo({ locked: false, remainingMs: 0 });

  // ── Chargement de l'utilisateur connecté + de son équipe ─────────────────────
  const hydrate = useCallback(async (session: Session) => {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) {
      setAuthError(profileError.message);
      return;
    }
    if (!profileData) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setAuthError("Ce compte n'existe plus. Contactez votre administrateur.");
      return;
    }
    if (!profileData.is_active) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setAuthError("Ce compte est bloqué. Contactez votre administrateur.");
      return;
    }

    const profile = profileData as ProfileRow;

    // Toutes les organisations visibles : une seule pour un administrateur
    // client, toutes pour l'administrateur principal.
    const { data: orgData } = await supabase.from("organizations").select("*");
    const orgs = (orgData ?? []) as OrgRow[];
    const orgMap = new Map(orgs.map((o) => [o.id, o]));
    const org = profile.organization_id ? orgMap.get(profile.organization_id) ?? null : null;

    const { data: teamData } = await supabase.from("profiles").select("*");
    const team = ((teamData ?? []) as ProfileRow[]).map((p) =>
      profileToUser(p, p.organization_id ? orgMap.get(p.organization_id) ?? null : null),
    );

    setUsers(team);
    setOrgKeys(orgs.map((o) => orgToKey(o, profile.id)));
    setOrganizationId(org?.id ?? null);
    setViewOrgId(null);
    setCurrentUser(profileToUser(profile, org));
    setLicence(computeLicence(org?.licence_expires_at ?? null));
    setAuthError(null);

    // Mémorise la dernière connexion
    // ⚠️ postgrest-js n'envoie la requête qu'au `await` : sans lui, rien n'est écrit.
    await supabase
      .from("profiles")
      .update({ last_login: new Date().toISOString() })
      .eq("id", profile.id);

    // Rafraîchit les demandes d'achat de l'organisation
    void refreshPurchaseRequests(org?.id ?? null);
  }, []);

  const refreshPurchaseRequests = useCallback(async (orgId: string | null) => {
    if (!orgId) {
      setPurchaseRequests([]);
      return;
    }
    // ⚠️ filtre d'organisation obligatoire : l'administrateur principal a le
    // droit de lire les demandes d'achat de TOUTES les sociétés, mais l'écran
    // ne doit jamais mélanger les sociétés ("Bons d'achat").
    const { data } = await supabase
      .from("purchase_requests")
      .select("*")
      .eq("organization_id", orgId);
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    setPurchaseRequests(
      rows.map((r) => ({
        id: String(r.id ?? ""),
        requestedBy: String(r.requested_by ?? ""),
        requestedByName: String(r.requested_by_name ?? ""),
        requestedByRole: (String(r.requested_by_role ?? "user") as UserRole),
        organizationKey: "",
        supplierId: String(r.supplier_id ?? ""),
        supplierName: String(r.supplier_name ?? ""),
        items: Array.isArray(r.items) ? (r.items as PurchaseRequest["items"]) : [],
        total: Number(r.total ?? 0),
        date: String(r.date ?? "").slice(0, 10),
        note: String(r.note ?? ""),
        status: (String(r.status ?? "pending") as PurchaseRequest["status"]),
        reviewedBy: r.reviewed_by ? String(r.reviewed_by) : undefined,
        reviewedByName: r.reviewed_by_name ? String(r.reviewed_by_name) : undefined,
        reviewedAt: r.reviewed_at ? String(r.reviewed_at) : undefined,
        rejectionReason: r.rejection_reason ? String(r.rejection_reason) : undefined,
        createdAt: String(r.created_at ?? ""),
      })),
    );
  }, []);

  const refreshUsers = useCallback(async () => {
    const { data: teamData } = await supabase.from("profiles").select("*");
    const { data: orgData } = await supabase.from("organizations").select("*");
    const orgs = (orgData ?? []) as OrgRow[];
    const orgMap = new Map(orgs.map((o) => [o.id, o]));
    const team = ((teamData ?? []) as ProfileRow[]).map((p) =>
      profileToUser(p, p.organization_id ? orgMap.get(p.organization_id) ?? null : null),
    );
    setUsers(team);
    setOrgKeys(orgs.map((o) => orgToKey(o, currentUser?.id ?? "")));
  }, [currentUser?.id]);

  // ── Demandes d'achat : on suit la société consultée ─────────────────────────
  // (l'administrateur principal peut consulter les bons d'achat d'une autre
  //  société ; les autres comptes restent sur la leur).
  useEffect(() => {
    if (!currentUser) return;
    void refreshPurchaseRequests(activeOrgId);
  }, [activeOrgId, currentUser?.id]);

  // ── Initialisation + écoute de la session ───────────────────────────────────
  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (data.session) await hydrate(data.session);
      if (mounted) setIsInitializing(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Les requêtes réseau doivent être différées hors du callback d'authentification
      setTimeout(async () => {
        if (!mounted) return;
        if (session) {
          await hydrate(session);
        } else {
          setCurrentUser(null);
          setUsers([]);
          setOrgKeys([]);
          setOrganizationId(null);
          setPurchaseRequests([]);
        }
        setIsInitializing(false);
      }, 0);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [hydrate]);

  // ── Connexion ────────────────────────────────────────────────────────────────
  const login = async (identifier: string, password: string, remember: boolean) => {
    const clean = identifier.trim();
    if (!clean || !password) {
      const msg = "Veuillez remplir tous les champs.";
      setAuthError(msg);
      return { ok: false, error: msg };
    }

    let email = clean.toLowerCase();
    if (!email.includes("@")) {
      const { data } = await supabase.rpc("email_by_username", { p_username: clean });
      if (!data) {
        const msg = "Identifiant incorrect.";
        setAuthError(msg);
        return { ok: false, error: msg };
      }
      email = String(data);
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = describeSupabaseError(error);
      setAuthError(msg);
      return { ok: false, error: msg };
    }
    if (!data.session) {
      const msg = "Connexion impossible.";
      setAuthError(msg);
      return { ok: false, error: msg };
    }

    await hydrate(data.session);

    if (remember) {
      saveRememberedCredentials(identifier, password);
    } else {
      clearRememberedCredentials();
    }
    setAuthError(null);
    return { ok: true };
  };

  // ── Inscription ──────────────────────────────────────────────────────────────
  const register = async (
    data: RegisterData,
  ): Promise<{ success: boolean; error?: string; pendingConfirmation?: boolean }> => {
    if (data.password !== data.confirmPassword)
      return { success: false, error: "Les mots de passe ne correspondent pas." };
    if (data.password.length < 8)
      return { success: false, error: "Mot de passe trop court (8 caractères minimum)." };

    const email    = data.email.trim().toLowerCase();
    const username = data.username.trim().toLowerCase();
    const orgCode  = (data.organizationKey ?? "").trim().toUpperCase();

    if (!email.includes("@"))
      return { success: false, error: "Adresse email invalide." };

    // Le pseudo doit être libre
    const { data: taken } = await supabase.rpc("username_exists", { p_username: username });
    if (taken) return { success: false, error: "Ce nom d'utilisateur est déjà pris." };

    // ── Analyse de la clé saisie ───────────────────────────────────────────────
    // La BASE décide de tout : la clé d'inscription administrateur (émise par
    // l'administrateur principal) ouvre une société avec une licence de 30 jours ;
    // la clé d'invitation (émise par l'administrateur de société, une par poste)
    // rattache l'inscrit à SA société avec le rôle du poste. Le formulaire ne
    // fait qu'afficher la décision de la base.
    let keyType: "admin_societe" | "invitation" | "join_code" = "join_code";
    let keyRole: UserRole = data.role ?? "user";
    let keyInfo: SignupKeyInfo | null = null;

    if (orgCode) {
      const { data: info } = await supabase.rpc("check_signup_key", { p_code: orgCode });
      keyInfo = (info ?? null) as SignupKeyInfo | null;
      if (keyInfo?.ok && keyInfo.type === "admin_societe") {
        keyType = "admin_societe";
        keyRole = "admin";
      } else if (keyInfo?.ok && keyInfo.type === "invitation") {
        keyType = "invitation";
        keyRole = keyInfo.role === "manager" ? "manager" : "user";
      }
    }

    if (keyType === "join_code") {
      // Aucune clé d'inscription ni d'invitation : c'est le cas d'une
      // administrateur qui n'a pas de clé, ou d'une ancienne clé d'organisation.
      if (keyRole === "admin")
        return {
          success: false,
          error:
            "Clé d'inscription administrateur requise : demandez une clé à usage unique à l'administrateur principal de la plateforme.",
        };
      if (!orgCode)
        return { success: false, error: "Veuillez entrer la clé d'invitation fournie par votre administrateur." };
      const { data: orgName } = await supabase.rpc("check_join_code", { p_code: orgCode });
      if (!orgName)
        return {
          success: false,
          error: "Clé invalide ou déjà utilisée. Vérifiez la clé fournie par votre administrateur.",
        };
    }

    const { data: signUp, error } = await supabase.auth.signUp({
      email,
      password: data.password,
      options: {
        emailRedirectTo: AUTH_REDIRECT_URL,
        data: {
          username,
          full_name: data.fullName,
          company: data.company,
          // Pour une clé d'invitation, le rôle est celui du POSTE : on envoie
          // « user » et le serveur le remplace par le rôle de la clé.
          role: keyType === "admin_societe" ? "admin" : "user",
          // Transmise au serveur : le déclencheur handle_new_user() rattache
          // le profil à l'organisation dès la création du compte, même quand la
          // confirmation par email est activée (pas de session à ce moment-là).
          organization_key: keyType === "admin_societe" ? null : orgCode,
          // Clé d'inscription administrateur à usage unique : c'est elle qui
          // autorise la création de la société. Le serveur la consomme et elle
          // ne pourra plus jamais servir.
          admin_key: keyType === "admin_societe" ? orgCode : null,
        },
      },
    });

    if (error) return { success: false, error: describeSupabaseError(error) };

    const session = signUp.session;

    // Confirmation par email requise : le compte existe mais n'est pas encore actif
    if (!session) {
      return { success: true, pendingConfirmation: true };
    }

    // Rattachement à l'organisation
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();

    const effectiveRole = (profileData as ProfileRow | null)?.role ?? keyRole;

    if (effectiveRole === "admin") {
      // Le serveur a déjà créé la société et sa clé d'organisation au moment de
      // l'inscription (via le déclencheur). Cet appel est idempotent : il
      // renvoie la clé existante.
      const { error: orgError } = await supabase.rpc("create_organization", {
        p_name: data.company || "Mon organisation",
        p_code: null,
      });
      if (orgError) return { success: false, error: orgError.message };
    } else if (keyType === "invitation") {
      // Le serveur a rattaché le profil à la société via la clé d'invitation
      // (rôle du poste + encadrant). On ne fait rien d'autre ici.
      const attached = (profileData as ProfileRow | null)?.organization_id;
      if (!attached)
        return {
          success: false,
          error: "La clé d'invitation n'a pas pu être appliquée. Contactez votre administrateur.",
        };
    } else {
      const { data: joined, error: joinError } = await supabase.rpc("redeem_join_code", {
        p_code: orgCode,
      });
      if (joinError || !joined)
        return { success: false, error: "Clé d'organisation invalide. Vérifiez la clé fournie par votre administrateur." };
    }

    await hydrate(session);
    return { success: true };
  };

  // ── Déconnexion ──────────────────────────────────────────────────────────────
  const logout = () => {
    void supabase.auth.signOut();
    setCurrentUser(null);
    setUsers([]);
    setOrgKeys([]);
    setOrganizationId(null);
    setViewOrgId(null);
    setPurchaseRequests([]);
    setAuthError(null);
  };

  // ── Mot de passe oublié / récupération ──────────────────────────────────────
  const forgotPassword = async (email: string) => {
    const clean = email.trim().toLowerCase();
    if (!clean.includes("@")) return { success: false, error: "Adresse email invalide." };

    const { error } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: AUTH_REDIRECT_URL,
    });
    if (error) return { success: false, error: describeSupabaseError(error) };
    return { success: true };
  };

  const forgotUsername = async (email: string) => {
    const clean = email.trim().toLowerCase();
    const { data } = await supabase.rpc("username_by_email", { p_email: clean });
    if (!data) return { success: false, error: "Aucun compte associé à cet email." };
    return { success: true, username: String(data) };
  };

  const resetPassword = async (_token: string, newPassword: string) => {
    if (newPassword.length < 8) return { success: false, error: "Mot de passe trop court." };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: describeSupabaseError(error) };
    return { success: true };
  };

  // ── Profil ───────────────────────────────────────────────────────────────────
  const updateProfile = async (
    data: Partial<Pick<User, "fullName" | "email" | "company" | "avatar">>,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: "Non authentifié." };
    const patch: Record<string, unknown> = {};
    if (data.fullName !== undefined) patch.full_name = data.fullName;
    if (data.company !== undefined) patch.company = data.company;
    if (data.avatar !== undefined) patch.avatar = data.avatar;
    if (data.email !== undefined) {
      patch.email = data.email.trim().toLowerCase();
      const { error: emailError } = await supabase.auth.updateUser({ email: patch.email as string });
      if (emailError) return { success: false, error: describeSupabaseError(emailError) };
    }

    // ⚠️ sans `await`, la requête n'est jamais envoyée : l'interface affichait
    // « modifications enregistrées » alors que rien n'était écrit en base.
    const { error } = await supabase.from("profiles").update(patch).eq("id", currentUser.id);
    if (error) return { success: false, error: describeSupabaseError(error) };

    setCurrentUser({ ...currentUser, ...data });
    await refreshUsers();
    return { success: true };
  };

  // ── Clé d'organisation ───────────────────────────────────────────────────────
  const createOrgKey = async (
    name: string,
    description?: string,
  ): Promise<{ success: boolean; key?: OrgKey; error?: string }> => {
    if (!currentUser || currentUser.role !== "admin")
      return { success: false, error: "Seul un administrateur peut créer une clé d'organisation." };

    const existing = orgKeys[0];

    // Aucune limite de rotation : la base autorise autant de nouvelles clés
    // d'organisation que nécessaire (script 15). Les règles qui subsistent
    // (licence valide, compte actif, société active) sont vérifiées par le
    // serveur, pas par l'interface.
    //
    // La nouvelle clé est générée par le serveur : aléatoire, unique par société.
    // L'ancienne clé cesse immédiatement de fonctionner.
    const { data, error } = await supabase.rpc("rotate_join_code", { p_code: null });
    if (error) return { success: false, error: error.message };

    const newCode = formatKey(String(data ?? ""));
    if (!newCode) return { success: false, error: "La nouvelle clé n'a pas pu être générée." };

    await supabase
      .from("organizations")
      .update({ name: name || existing?.organizationName, description: description ?? null })
      .eq("id", organizationId ?? "");
    await refreshUsers();

    return {
      success: true,
      key: {
        id: organizationId ?? "",
        key: newCode,
        ownerId: currentUser.id,
        organizationName: name,
        createdAt: new Date().toISOString().split("T")[0],
        lastChangedAt: new Date().toISOString().split("T")[0],
        description,
        active: true,
      },
    };
  };

  const updateOrgKey = async (
    keyValue: string,
    description?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || currentUser.role !== "admin")
      return { success: false, error: "Seul un administrateur peut modifier une clé." };
    // ⚠️ sans `await`, la requête n'est jamais envoyée à la base.
    const { error } = await supabase
      .from("organizations")
      .update({ description: description ?? null })
      .eq("join_code", keyValue);
    if (error) return { success: false, error: describeSupabaseError(error) };
    await refreshUsers();
    return { success: true };
  };

  const getMyOrgKey = (): OrgKey | null => {
    if (!currentUser) return null;
    return orgKeys.find((k) => k.key === currentUser.organizationKey && k.active) ?? null;
  };

  const validateOrgKey = async (key: string): Promise<OrgKey | null> => {
    const { data } = await supabase.rpc("check_join_code", { p_code: key.trim().toUpperCase() });
    if (!data) return null;
    return {
      id: "",
      key: formatKey(key),
      ownerId: "",
      organizationName: String(data),
      createdAt: "",
      active: true,
    };
  };

  // ── Clés d'inscription administrateur (administrateur principal) ─────────────
  // Ces clés autorisent la création d'une nouvelle société : elles sont
  // consommées par le serveur au moment de l'inscription de l'administrateur.
  const listAdminSignupKeys = async (): Promise<AdminSignupKey[]> => {
    if (!currentUser?.isSuperAdmin) return [];
    const { data, error } = await supabase.rpc("list_admin_signup_keys");
    if (error) return [];
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    return rows.map((k) => ({
      code: formatKey(String(k.code ?? "")),
      label: String(k.label ?? ""),
      createdAt: String(k.created_at ?? ""),
      usedAt: (k.used_at as string | null) ?? null,
      usedEmail: (k.used_email as string | null) ?? null,
      revokedAt: (k.revoked_at as string | null) ?? null,
      licenceDays: k.licence_days != null ? Number(k.licence_days) : 30,
    }));
  };

  const createAdminSignupKey = async (
    label?: string,
    licenceDays = 30,
  ): Promise<{ success: boolean; code?: string; error?: string }> => {
    if (!currentUser?.isSuperAdmin)
      return {
        success: false,
        error: "Seul l'administrateur principal peut émettre une clé d'inscription administrateur.",
      };

    const { data, error } = await supabase.rpc("create_admin_signup_key", {
      p_label: label?.trim() ? label.trim() : null,
      p_licence_days: licenceDays,
    });
    if (error) return { success: false, error: describeSupabaseError(error) };

    const code = formatKey(String(data ?? ""));
    if (!code) return { success: false, error: "La clé n'a pas pu être générée." };
    return { success: true, code };
  };

  const revokeAdminSignupKey = async (
    code: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser?.isSuperAdmin)
      return {
        success: false,
        error: "Seul l'administrateur principal peut révoquer une clé.",
      };

    const { data, error } = await supabase.rpc("revoke_admin_signup_key", {
      p_code: code,
    });
    if (error) return { success: false, error: describeSupabaseError(error) };
    return { success: data === true };
  };

  // ── Licence de la société ────────────────────────────────────────────────────
  /** Relit la fin de licence de la société de l'utilisateur connecté. */
  const refreshLicence = useCallback(async () => {
    if (!organizationId) {
      setLicence({ expiresAt: null, active: true, daysLeft: null });
      return;
    }
    const { data } = await supabase
      .from("organizations")
      .select("licence_expires_at")
      .eq("id", organizationId)
      .maybeSingle();
    setLicence(computeLicence((data as { licence_expires_at?: string | null } | null)?.licence_expires_at ?? null));
  }, [organizationId]);

  /**
   * Renouvelle la licence avec une nouvelle clé délivrée par l'administrateur
   * principal. Les 30 jours repartent de zéro et LES DONNÉES SONT CONSERVÉES.
   */
  const renewLicence = async (
    code: string,
  ): Promise<{ success: boolean; error?: string; expiresAt?: string | null }> => {
    const clean = (code ?? "").trim().toUpperCase();
    if (!clean) return { success: false, error: "Veuillez saisir la clé de renouvellement." };

    const { data, error } = await supabase.rpc("renew_licence", { p_code: clean });
    if (error) return { success: false, error: describeSupabaseError(error) };

    const res = (data ?? null) as { ok?: boolean; expires_at?: string | null } | null;
    if (!res?.ok)
      return { success: false, error: "Cette clé de renouvellement est invalide ou a déjà été utilisée." };

    await refreshLicence();
    await refreshUsers();
    return { success: true, expiresAt: res.expires_at ?? null };
  };

  /** Bloque ou débloque toute une société (administrateur principal uniquement). */
  const setOrganizationBlocked = async (
    orgId: string,
    blocked: boolean,
  ): Promise<{ success: boolean; error?: string; count?: number }> => {
    if (!currentUser?.isSuperAdmin)
      return {
        success: false,
        error: "Seul l'administrateur principal peut bloquer une société.",
      };
    if (!orgId) return { success: false, error: "Société inconnue." };

    const { data, error } = await supabase.rpc("set_organization_blocked", {
      p_org_id: orgId,
      p_blocked: blocked,
    });
    if (error) return { success: false, error: describeSupabaseError(error) };
    await refreshUsers();
    return { success: true, count: Number(data ?? 0) };
  };

  // ── Clés d'invitation (administrateur de société) ───────────────────────────
  const listInvitationKeys = async (): Promise<InvitationKey[]> => {
    const { data, error } = await supabase.rpc("list_invitation_keys");
    if (error) return [];
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    return rows.map((k) => ({
      id: String(k.id ?? ""),
      code: formatKey(String(k.code ?? "")),
      roleCible: (String(k.role_cible ?? "user") as InvitationRole),
      poste: String(k.poste ?? ""),
      managerId: (k.manager_id as string | null) ?? null,
      managerName: String(k.manager_name ?? ""),
      organizationId: String(k.organization_id ?? ""),
      organizationName: String(k.organization_name ?? ""),
      label: String(k.label ?? ""),
      createdAt: String(k.created_at ?? ""),
      expiresAt: (k.expires_at as string | null) ?? null,
      revokedAt: (k.revoked_at as string | null) ?? null,
      usesCount: Number(k.uses_count ?? 0),
      lastUsedAt: (k.last_used_at as string | null) ?? null,
      lastUsedEmail: (k.last_used_email as string | null) ?? null,
    }));
  };

  const createInvitationKey = async (
    roleCible: InvitationRole,
    poste?: string,
    managerId?: string | null,
    label?: string,
    days = 30,
  ): Promise<{ success: boolean; code?: string; error?: string }> => {
    const { data, error } = await supabase.rpc("create_invitation_key", {
      p_role_cible: roleCible,
      p_poste: poste?.trim() ? poste.trim() : null,
      p_manager_id: managerId && managerId !== "" ? managerId : null,
      p_label: label?.trim() ? label.trim() : null,
      p_days: days,
    });
    if (error) return { success: false, error: describeSupabaseError(error) };

    const code = formatKey(String(data ?? ""));
    if (!code) return { success: false, error: "La clé n'a pas pu être générée." };
    return { success: true, code };
  };

  const revokeInvitationKey = async (code: string): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.rpc("revoke_invitation_key", { p_code: code });
    if (error) return { success: false, error: describeSupabaseError(error) };
    return { success: data === true };
  };

  /**
   * Vérifie une clé AVANT l'inscription. La base répond : type de clé, rôle
   * attribué, poste visé, durée de licence. Le formulaire se contente
   * d'afficher la réponse.
   */
  const checkSignupKey = async (code: string): Promise<SignupKeyInfo> => {
    const clean = (code ?? "").trim();
    if (!clean) return { ok: false, reason: "vide" };
    const { data, error } = await supabase.rpc("check_signup_key", { p_code: clean });
    if (error) return { ok: false, reason: "erreur" };
    const r = (data ?? null) as Record<string, unknown> | null;
    if (!r) return { ok: false, reason: "invalide" };
    return {
      ok: r.ok === true,
      reason: r.reason != null ? String(r.reason) : undefined,
      type: r.type != null ? (String(r.type) as SignupKeyInfo["type"]) : undefined,
      role: r.role != null ? (String(r.role) as UserRole) : undefined,
      days: r.days != null ? Number(r.days) : undefined,
      expiresAt: (r.expires_at as string | null) ?? null,
      organization: r.organization != null ? String(r.organization) : undefined,
      poste: r.poste != null ? String(r.poste) : undefined,
    };
  };

  // ── Visibilité de l'équipe ───────────────────────────────────────────────────
  const canViewUser = (targetUserId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.id === targetUserId) return true;
    const target = users.find((u) => u.id === targetUserId);
    if (!target) return false;
    // L'administrateur principal voit tous les comptes, toutes sociétés confondues.
    if (currentUser.isSuperAdmin) return true;
    // Un administrateur client ne voit jamais les comptes des administrateurs principaux.
    if (target.isSuperAdmin) return false;
    if (target.organizationId !== currentUser.organizationId) return false;
    if (currentUser.role === "admin") return true;
    if (currentUser.role === "manager")
      return target.role === "user" && target.managedBy === currentUser.id;
    return false;
  };

  const getVisibleUsers = (): User[] => {
    if (!currentUser) return [];
    // L'administrateur principal voit les comptes de toutes les sociétés.
    if (currentUser.isSuperAdmin) return users;
    if (currentUser.role === "admin")
      return users.filter(
        (u) => u.organizationId === currentUser.organizationId && !u.isSuperAdmin,
      );
    if (currentUser.role === "manager")
      return users.filter(
        (u) =>
          u.organizationId === currentUser.organizationId &&
          (u.id === currentUser.id || (u.role === "user" && u.managedBy === currentUser.id)),
      );
    return [currentUser];
  };

  const getSubordinates = (): User[] => {
    if (!currentUser) return [];
    if (currentUser.isSuperAdmin) return users.filter((u) => u.id !== currentUser.id);
    if (currentUser.role === "admin")
      return users.filter(
        (u) =>
          u.organizationId === currentUser.organizationId &&
          u.id !== currentUser.id &&
          !u.isSuperAdmin,
      );
    if (currentUser.role === "manager")
      return users.filter(
        (u) =>
          u.organizationId === currentUser.organizationId &&
          u.role === "user" &&
          u.managedBy === currentUser.id,
      );
    return [];
  };

  // ── Gestion des utilisateurs ─────────────────────────────────────────────────
  /** Nombre d'administrateurs principaux encore présents sur la plateforme */
  const superAdminCount = () => users.filter((u) => u.isSuperAdmin).length;

  /** Le compte visé est-il le dernier administrateur principal ? */
  const isLastSuperAdmin = (target: User) =>
    target.isSuperAdmin && superAdminCount() <= 1;

  const canManageUser = (targetId: string): boolean => {
    if (!currentUser) return false;
    const target = users.find((u) => u.id === targetId);
    if (!target) return false;
    if (target.id === currentUser.id) return false;

    // L'administrateur principal gère tous les comptes, toutes sociétés
    // confondues : les administrateurs clients comme leurs employés.
    if (currentUser.isSuperAdmin) return true;

    // Un administrateur client ne sort jamais de sa société.
    if (target.organizationId !== currentUser.organizationId) return false;
    // Un administrateur client ne peut jamais gérer un administrateur principal.
    if (target.isSuperAdmin) return false;
    if (currentUser.role === "admin") return target.role !== "admin";
    if (currentUser.role === "manager")
      return target.role === "user" && target.managedBy === currentUser.id;
    return false;
  };

  const blockUser = async (targetId: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: "Non authentifié." };
    if (!canManageUser(targetId)) return { success: false, error: "Permission refusée." };
    const target = users.find((u) => u.id === targetId);
    if (!target) return { success: false, error: "Utilisateur introuvable." };
    if (isLastSuperAdmin(target))
      return { success: false, error: "Impossible de bloquer le dernier administrateur principal." };
    if (!target.isActive) return { success: false, error: "Ce compte est déjà bloqué." };
    // ⚠️ sans `await`, la requête n'est jamais envoyée : l'interface annonçait
    // « bloqué » alors que le compte restait actif en base.
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", targetId);
    if (error) return { success: false, error: describeSupabaseError(error) };
    await refreshUsers();
    return { success: true };
  };

  const unblockUser = async (targetId: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: "Non authentifié." };
    if (!canManageUser(targetId)) return { success: false, error: "Permission refusée." };
    const target = users.find((u) => u.id === targetId);
    if (!target) return { success: false, error: "Utilisateur introuvable." };
    if (target.isActive) return { success: false, error: "Ce compte est déjà actif." };
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: true })
      .eq("id", targetId);
    if (error) return { success: false, error: describeSupabaseError(error) };
    await refreshUsers();
    return { success: true };
  };

  const deleteUser = async (targetId: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: "Non authentifié." };
    if (!canManageUser(targetId)) return { success: false, error: "Permission refusée." };
    const target = users.find((u) => u.id === targetId);
    if (!target) return { success: false, error: "Utilisateur introuvable." };
    if (isLastSuperAdmin(target))
      return { success: false, error: "Impossible de supprimer le dernier administrateur principal." };
    if (target.role === "admin" && !currentUser.isSuperAdmin) {
      const adminCount = users.filter(
        (u) => u.role === "admin" && u.organizationId === currentUser.organizationId,
      ).length;
      if (adminCount <= 1)
        return { success: false, error: "Impossible de supprimer le dernier administrateur." };
    }
    // Le profil est supprimé : le compte n'a plus accès à rien.
    // ⚠️ sans `await`, la suppression n'était jamais exécutée.
    const { error } = await supabase.from("profiles").delete().eq("id", targetId);
    if (error) return { success: false, error: describeSupabaseError(error) };
    await refreshUsers();
    return { success: true };
  };

  /**
   * Réinitialise le mot de passe d'un compte.
   * L'email de récupération ne part pas vers les clients (le SMTP intégré de
   * Supabase est réservé aux membres de l'équipe) : c'est l'administrateur qui
   * remet un nouveau mot de passe.
   */
  const resetUserPassword = async (
    targetId: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: "Non authentifié." };
    if (!canManageUser(targetId)) return { success: false, error: "Permission refusée." };
    const target = users.find((u) => u.id === targetId);
    if (!target) return { success: false, error: "Utilisateur introuvable." };
    if (newPassword.length < 8)
      return { success: false, error: "Mot de passe trop court (8 caractères minimum)." };
    if (newPassword !== newPassword.trim())
      return { success: false, error: "Le mot de passe ne doit pas commencer ni finir par un espace." };

    const { error } = await supabase.rpc("admin_set_password", {
      p_user_id: targetId,
      p_password: newPassword,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  // ── Demandes d'achat ─────────────────────────────────────────────────────────
  const submitPurchaseRequest = (
    req: Omit<PurchaseRequest, "id" | "createdAt" | "status" | "requestedByName" | "requestedByRole" | "organizationKey">,
  ) => {
    if (!currentUser || !activeOrgId) return;
    const newReq: PurchaseRequest = {
      ...req,
      id: crypto.randomUUID(),
      requestedByName: currentUser.fullName,
      requestedByRole: currentUser.role,
      organizationKey: currentUser.organizationKey,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    void supabase
      .from("purchase_requests")
      .insert({
        id: newReq.id,
        organization_id: activeOrgId,
        requested_by: newReq.requestedBy,
        requested_by_name: newReq.requestedByName,
        requested_by_role: newReq.requestedByRole,
        supplier_id: newReq.supplierId || null,
        supplier_name: newReq.supplierName,
        items: newReq.items,
        total: newReq.total,
        date: newReq.date,
        note: newReq.note,
        status: "pending",
      })
      .then(() => refreshPurchaseRequests(activeOrgId));
  };

  const approvePurchaseRequest = (id: string) => {
    if (!currentUser || !activeOrgId) return;
    void supabase
      .from("purchase_requests")
      .update({
        status: "approved",
        reviewed_by: currentUser.id,
        reviewed_by_name: currentUser.fullName,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .then(() => refreshPurchaseRequests(activeOrgId));
  };

  const rejectPurchaseRequest = (id: string, reason: string) => {
    if (!currentUser || !activeOrgId) return;
    void supabase
      .from("purchase_requests")
      .update({
        status: "rejected",
        reviewed_by: currentUser.id,
        reviewed_by_name: currentUser.fullName,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq("id", id)
      .then(() => refreshPurchaseRequests(activeOrgId));
  };

  const getPendingRequestsForMe = (): PurchaseRequest[] => {
    if (!currentUser) return [];
    if (currentUser.role === "user") return [];
    return purchaseRequests.filter((r) => {
      if (r.organizationKey !== currentUser.organizationKey && r.organizationKey !== "")
        return false;
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
    if (currentUser.role === "admin") return purchaseRequests;
    if (currentUser.role === "manager") {
      return purchaseRequests.filter(
        (r) =>
          r.requestedBy === currentUser.id ||
          users.find((u) => u.id === r.requestedBy)?.managedBy === currentUser.id,
      );
    }
    return purchaseRequests.filter((r) => r.requestedBy === currentUser.id);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser, users, orgKeys, organizationId, isAuthenticated, authError, lockoutInfo,
        viewOrgId, setViewOrgId, activeOrgId,
        recoveryRequests, isInitializing, purchaseRequests,
        login, register, logout, forgotPassword, forgotUsername, resetPassword,
        updateProfile, clearError, refreshLockout,
        createOrgKey, updateOrgKey, getMyOrgKey, validateOrgKey,
        listAdminSignupKeys, createAdminSignupKey, revokeAdminSignupKey,
        licence, refreshLicence,
        listInvitationKeys, createInvitationKey, revokeInvitationKey,
        checkSignupKey, renewLicence, setOrganizationBlocked,
        canViewUser, getVisibleUsers, getSubordinates,
        blockUser, unblockUser, deleteUser, canManageUser, resetUserPassword,
        submitPurchaseRequest, approvePurchaseRequest, rejectPurchaseRequest,
        getPendingRequestsForMe, getMyRequests,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
