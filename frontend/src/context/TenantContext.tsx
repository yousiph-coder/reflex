"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { BillingUsage, OrganizationInfo, UserInfo } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import {
  apiClient,
  clearSession as clearStorageSession,
  triggerPaywallModal,
} from "@/lib/api-client";

export const DEFAULT_ORGANIZATIONS: OrganizationInfo[] = [
  {
    id: "a2cda21d-3124-4a01-9878-626f00a1453e",
    name: "AutoHeal Production",
    slug: "autoheal-demo",
    plan: "free",
    role: "owner",
  },
  {
    id: "7d3edbbe-d4da-4b9c-a1c1-de62258ff115",
    name: "Acme Corp (Staging)",
    slug: "acme-staging",
    plan: "free",
    role: "admin",
  },
  {
    id: "1a3606ed-0c1c-4f4f-9cc8-269be45769ee",
    name: "Dev Sandbox",
    slug: "dev-sandbox",
    plan: "free",
    role: "member",
  },
];

interface TenantContextType {
  currentOrg: OrganizationInfo;
  organizations: OrganizationInfo[];
  setCurrentOrg: (org: OrganizationInfo) => void;
  switchOrganization: (orgId: string) => void;
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  user: UserInfo | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  billingUsage: BillingUsage | null;
  refreshUsage: () => Promise<BillingUsage | null>;
  openUpgradeModal: () => void;
  loginWithGitHub: () => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const TOKEN_KEY = "autoheal_session_token";
const ORG_KEY = "autoheal_current_org";
const USER_KEY = "autoheal_user";

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [currentOrg, setCurrentOrgState] = useState<OrganizationInfo>(DEFAULT_ORGANIZATIONS[0]);
  const [organizations, setOrganizations] = useState<OrganizationInfo[]>(DEFAULT_ORGANIZATIONS);

  // ── Explicit Auth State (Single Source of Truth) ─────────────
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [billingUsage, setBillingUsage] = useState<BillingUsage | null>(null);

  // Synchronize session details and user profiles
  const applySession = useCallback((sbSession: Session | null) => {
    setSession(sbSession);
    setSupabaseUser(sbSession?.user ?? null);

    if (sbSession?.access_token && sbSession?.user) {
      const sbUser = sbSession.user;
      const email = sbUser.email || "user@autoheal.dev";
      const name =
        sbUser.user_metadata?.name ||
        sbUser.user_metadata?.full_name ||
        sbUser.email?.split("@")[0] ||
        "SRE Engineer";
      const avatarUrl =
        sbUser.user_metadata?.avatar_url ||
        sbUser.user_metadata?.picture ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces";

      const mappedUser: UserInfo = {
        id: sbUser.id,
        name,
        email,
        avatarUrl,
        role: sbUser.user_metadata?.role || "Site Reliability Engineer",
      };

      const userDefaultOrg: OrganizationInfo = {
        id: sbUser.id,
        name: `${email.split("@")[0]}'s Workspace`,
        slug: `${email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-")}-workspace`,
        plan: "free",
        role: "owner",
      };

      setUser(mappedUser);
      setSessionToken(sbSession.access_token);

      try {
        localStorage.setItem(TOKEN_KEY, sbSession.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(mappedUser));
        document.cookie = `${TOKEN_KEY}=${sbSession.access_token}; path=/; max-age=604800; SameSite=Lax`;

        // Restore or initialize organization
        const storedOrg = localStorage.getItem(ORG_KEY);
        if (storedOrg) {
          try {
            const parsed = JSON.parse(storedOrg);
            if (parsed?.id) setCurrentOrgState(parsed);
          } catch {
            // ignore
          }
        } else {
          setCurrentOrgState(userDefaultOrg);
          setOrganizations((prev) => [userDefaultOrg, ...prev]);
          localStorage.setItem(ORG_KEY, JSON.stringify(userDefaultOrg));
          document.cookie = `autoheal_current_org_id=${userDefaultOrg.id}; path=/; max-age=604800; SameSite=Lax`;
        }
      } catch (e) {
        console.warn("[TenantContext] Failed to persist session to storage:", e);
      }
    } else {
      setSessionToken(null);
      setUser(null);
      clearStorageSession();
    }
  }, []);

  // ── Unified Session Subscription on Mount ────────────────────
  useEffect(() => {
    let mounted = true;

    // 1. Initial getSession call
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      applySession(initialSession);
      setIsLoading(false);
    });

    // 2. Real-time auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      applySession(newSession);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  // Update current organization
  const setCurrentOrg = useCallback((org: OrganizationInfo) => {
    setCurrentOrgState(org);
    try {
      localStorage.setItem(ORG_KEY, JSON.stringify(org));
      document.cookie = `autoheal_current_org_id=${org.id}; path=/; max-age=604800; SameSite=Lax`;
      window.dispatchEvent(new CustomEvent("autoheal_org_changed", { detail: org }));
    } catch (e) {
      console.warn("[TenantContext] Failed to persist organization:", e);
    }
  }, []);

  const switchOrganization = useCallback(
    (orgId: string) => {
      const target = organizations.find((o) => o.id === orgId);
      if (target) {
        const activePlan = (billingUsage?.plan || "free").toLowerCase() as any;
        setCurrentOrg({ ...target, plan: activePlan });
      }
    },
    [organizations, setCurrentOrg, billingUsage]
  );

  // Sign in via GitHub OAuth (Supabase)
  const loginWithGitHub = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      console.error("[TenantContext] GitHub OAuth sign in failed:", e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign in with Email / Password (Supabase)
  const loginWithPassword = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.session) {
        applySession(data.session);
      }
    } catch (e: any) {
      console.error("[TenantContext] Email login failed:", e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [applySession]);

  // Sign up with Email / Password (Supabase)
  const signUpWithPassword = useCallback(
    async (email: string, password: string, name?: string) => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split("@")[0],
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          applySession(data.session);
        }
      } catch (e: any) {
        console.error("[TenantContext] Sign up failed:", e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [applySession]
  );

  // Logout: signs out of Supabase and flushes local tokens & cookies
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("[TenantContext] Error signing out of Supabase:", e);
    }

    clearStorageSession();
    setSession(null);
    setSupabaseUser(null);
    setSessionToken(null);
    setUser(null);
    setBillingUsage(null);
    router.push("/login");
  }, [router]);

  // ── Billing Usage & Upgrade Flow ────────────────────────────
  const refreshUsage = useCallback(async (): Promise<BillingUsage | null> => {
    try {
      const usage = await apiClient.getBillingUsage();
      setBillingUsage(usage);
      if (usage?.plan) {
        const normalizedPlan = usage.plan.toLowerCase() as any;
        setCurrentOrgState((prev) => {
          if (prev.plan !== normalizedPlan) {
            const updated = { ...prev, plan: normalizedPlan };
            try {
              localStorage.setItem(ORG_KEY, JSON.stringify(updated));
            } catch {}
            return updated;
          }
          return prev;
        });
        setOrganizations((prev) =>
          prev.map((org) => ({ ...org, plan: normalizedPlan }))
        );
      }
      return usage;
    } catch (e) {
      console.warn("[TenantContext] Failed to fetch billing usage:", e);
      return null;
    }
  }, []);

  const openUpgradeModal = useCallback(() => {
    triggerPaywallModal();
  }, []);

  // Fetch initial billing usage when authenticated
  useEffect(() => {
    if (session?.access_token || sessionToken) {
      refreshUsage();
    }
  }, [session, sessionToken, refreshUsage]);

  const value: TenantContextType = {
    currentOrg,
    organizations,
    setCurrentOrg,
    switchOrganization,
    session,
    supabaseUser,
    user,
    sessionToken,
    isAuthenticated: Boolean(session || sessionToken),
    isLoading,
    billingUsage,
    refreshUsage,
    openUpgradeModal,
    loginWithGitHub,
    loginWithPassword,
    signUpWithPassword,
    logout,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
