import { create } from 'zustand'

const STORAGE_KEY = 'neuro-sema-user'

export const USER_NAME = 'Семён Пачков'

export const DEFAULT_VISITING_CARD_URL = 'https://yourcf.online/6ngq8h'

interface UserState {
  visitingCardUrl: string
  setVisitingCardUrl: (url: string) => void
}

function loadVisitingCardUrl(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { visitingCardUrl?: string }
      return parsed.visitingCardUrl || DEFAULT_VISITING_CARD_URL
    }
  } catch {
    // ignore
  }
  return DEFAULT_VISITING_CARD_URL
}

function saveVisitingCardUrl(url: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ visitingCardUrl: url }))
  } catch {
    // ignore
  }
}

export const useUserStore = create<UserState>((set) => ({
  visitingCardUrl: loadVisitingCardUrl(),
  setVisitingCardUrl: (url) => {
    saveVisitingCardUrl(url)
    set({ visitingCardUrl: url })
  },
}))
