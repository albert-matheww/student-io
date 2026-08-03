import { create } from "zustand";
import type { DifficultyPreference, LearningStyle } from "@/lib/api";

interface OnboardingState {
  name: string;
  school: string;
  courseName: string;
  degree: string;
  semester: string;
  subjects: string[];
  learningStyle: LearningStyle | null;
  difficultyPreference: DifficultyPreference | null;

  courseId: string | null;
  courseDisplayName: string;

  setProfile: (fields: Partial<Omit<OnboardingState, "setProfile" | "setCourse" | "reset">>) => void;
  setCourse: (courseId: string, courseDisplayName: string) => void;
  reset: () => void;
}

const initialState = {
  name: "",
  school: "",
  courseName: "",
  degree: "",
  semester: "",
  subjects: [] as string[],
  learningStyle: null,
  difficultyPreference: null,
  courseId: null,
  courseDisplayName: "",
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setProfile: (fields) => set(fields),
  setCourse: (courseId, courseDisplayName) => set({ courseId, courseDisplayName }),
  reset: () => set(initialState),
}));
