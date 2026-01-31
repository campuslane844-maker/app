// src/store/onboardingStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";


type Role = "student" | "parent" | "teacher" | "";

interface OnboardingState {
  role: Role;
  idToken: string;
  name: string;
  phone: string;
  pincode: string;
  state: string;
  city: string;
  country: string;
  age?: number;
  upiId?: string;
  classLevel?: string | null;
  classOther?: string;
  referralCode?: string;

  setField: (key: keyof OnboardingState, value: any) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      role: "",
      idToken: "",
      name: "",
      phone: "",
      pincode: "",
      state: "",
      city: "",
      country: "",
      upiId: "",
      age: undefined,
      classLevel: null,
      classOther: "",
      referralCode: "",


      setField: (key, value) => set((state) => ({ ...state, [key]: value })),
      reset: () =>
        set({
          role: "",
          idToken: "",
          name: "",
          phone: "",
          pincode: "",
          state: "",
          city: "",
          upiId: "",
          country: "",
          classLevel: null,
          classOther: "",
          referralCode: "",
          age: undefined,
        }),
    }),
    {
      name: "onboarding-storage", 
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
