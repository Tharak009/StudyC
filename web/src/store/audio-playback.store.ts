import { create } from "zustand";

interface AudioPlaybackState {
  activeAudioId: string | null;
  playbackSpeed: number; // 1, 1.5, or 2
  playAudio: (id: string) => void;
  stopAudio: (id?: string) => void;
  setPlaybackSpeed: (speed: number) => void;
}

export const useAudioPlaybackStore = create<AudioPlaybackState>((set, get) => ({
  activeAudioId: null,
  playbackSpeed: 1,

  playAudio: (id: string) => {
    set({ activeAudioId: id });
  },

  stopAudio: (id?: string) => {
    const current = get().activeAudioId;
    if (!id || current === id) {
      set({ activeAudioId: null });
    }
  },

  setPlaybackSpeed: (speed: number) => {
    set({ playbackSpeed: speed });
  }
}));
