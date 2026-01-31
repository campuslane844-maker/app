import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "@/lib/api";

export type UserRole = "student" | "teacher";

export interface Subscription {
  status: "active" | "cancelled" | "expired";
  currentEnd?: string;
  endDate?: string;
  // student-specific
  plan?: "monthly" | "yearly";
  isFree?: boolean;
  // teacher-specific
  planCode?: string;
  uploadLimit?: number | null;
  uploadsUsed?: number;
}

interface SubscriptionState {
  loading: boolean;
  isSubscribed: boolean;
  subscription: Subscription | null;

  fetchSubscription: (role: UserRole) => Promise<void>;
  clearSubscription: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      loading: true,
      isSubscribed: false,
      subscription: null,

      fetchSubscription: async (role: UserRole) => {
        try {
          set({ loading: true });
          
          const endpoint =
            (role === "teacher" || role === undefined)
              ? "/teacher-subscription/me"
              : "/student-subscription/me";

          const res = await api.get(endpoint);

          // normalize response shape
          if (role === "teacher") {
            set({
              isSubscribed: res.data.isSubscribed,
              subscription: res.data.subscription,
              loading: false,
            });
          } else {
            set({
              isSubscribed: res.data.isSubscribed,
              subscription: res.data.subscription,
              loading: false,
            });
          }
        } catch {
          set({
            isSubscribed: false,
            subscription: null,
            loading: false,
          });
        }
      },

      clearSubscription: () => {
        set({
          isSubscribed: false,
          subscription: null,
          loading: false,
        });
      },
    }),
    {
      name: "subscription-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isSubscribed: state.isSubscribed,
        subscription: state.subscription,
      }),

      version: 1,
    }
  )
);
