import { create } from "zustand";
import type { User, Org, Branch, Tenant } from "@/types/erp";

interface AuthState {
  user: User | null;
  org: Org | null;
  tenant: Tenant | null;
  currentBranch: Branch | null;
  branches: Branch[];
  isAuthenticated: boolean;
  isLoading: boolean;
  
  setUser: (user: User | null) => void;
  setOrg: (org: Org | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  setCurrentBranch: (branch: Branch | null) => void;
  setBranches: (branches: Branch[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  org: null,
  tenant: null,
  currentBranch: null,
  branches: [],
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setOrg: (org) => set({ org }),
  setTenant: (tenant) => set({ tenant }),
  setCurrentBranch: (branch) => set({ currentBranch: branch }),
  setBranches: (branches) => set({ branches }),
  logout: () => set({
    user: null,
    org: null,
    tenant: null,
    currentBranch: null,
    branches: [],
    isAuthenticated: false,
  }),
}));

