import { create } from 'zustand';
import type { Profile, Project, Version } from '@/types';

interface AppState {
  profile: Profile | null;
  currentProject: Project | null;
  currentVersion: Version | null;
  setProfile: (p: Profile | null) => void;
  setCurrentProject: (p: Project | null) => void;
  setCurrentVersion: (v: Version | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  currentProject: null,
  currentVersion: null,
  setProfile: (profile) => set({ profile }),
  setCurrentProject: (currentProject) => set({ currentProject }),
  setCurrentVersion: (currentVersion) => set({ currentVersion }),
}));
