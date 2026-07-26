import { create } from "zustand";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  setUser: (u: User | null) => void;
  page: "login" | "register" | "dashboard" | "keys" | "settings";
  setPage: (p: AuthState["page"]) => void;
}

export const useStore = create<AuthState>((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
  page: "login",
  setPage: (page) => set({ page }),
}));