// src/store/authStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "@/types";
import api from "@/lib/api";

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  hydrated: boolean;

  setHydrated: (value: boolean) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      hydrated: false,

      setHydrated: (value: boolean) => {
        set({ hydrated: value });
      },

      login: (user: User, token: string) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),

      fetchMe: async () => {
        const { hydrated, token } = get();
        if (!hydrated || !token) return;

        try {
          const res = await api.get("/auth/me");
          const user = res.data?.data?.user;
          if (!user) return;

          set({
            user,
            isAuthenticated: true,
          });
        } catch (err) {
          // token invalid → consider logout
        }
      },
    }),
    {
      name: "auth-storage",

      storage: createJSONStorage(() => AsyncStorage),

      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },

      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
