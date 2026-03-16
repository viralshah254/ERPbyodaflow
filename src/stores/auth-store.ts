import { create } from "zustand";
import type { User, Org, Branch, Tenant } from "@/types/erp";

interface AuthState {
  user: User | null;
  org: Org | null;
  tenant: Tenant | null;
  currentBranch: Branch | null;
  branches: Branch[];
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isPlatformOperator: boolean;

  setUser: (user: User | null) => void;
  setOrg: (org: Org | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  setCurrentBranch: (branch: Branch | null) => void;
  setBranches: (branches: Branch[]) => void;
  setPermissions: (permissions: string[]) => void;
  setSession: (payload: {
    user: User | null;
    org: Org | null;
    tenant: Tenant | null;
    currentBranch: Branch | null;
    branches: Branch[];
    permissions: string[];
    isPlatformOperator?: boolean;
  }) => void;
  finishHydration: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  org: null,
  tenant: null,
  currentBranch: null,
  branches: [],
  permissions: [],
  isAuthenticated: false,
  isLoading: true,
  isPlatformOperator: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setOrg: (org) => set({ org }),
  setTenant: (tenant) => set({ tenant }),
  setCurrentBranch: (branch) => set({ currentBranch: branch }),
  setBranches: (branches) => set({ branches }),
  setPermissions: (permissions) => set({ permissions }),
  setSession: ({ user, org, tenant, currentBranch, branches, permissions, isPlatformOperator }) =>
    set({
      user,
      org,
      tenant,
      currentBranch,
      branches,
      permissions,
      isAuthenticated: !!user,
      isLoading: false,
      isPlatformOperator: isPlatformOperator === true,
    }),
  finishHydration: () => set({ isLoading: false }),
  logout: () => set({
    user: null,
    org: null,
    tenant: null,
    currentBranch: null,
    branches: [],
    permissions: [],
    isAuthenticated: false,
    isLoading: false,
    isPlatformOperator: false,
  }),
}));

