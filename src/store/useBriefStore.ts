import { create } from 'zustand'

interface BriefState {
  selectedCompanyId: string | null
  favoriteCompanyIds: string[]
  setSelectedCompanyId: (companyId: string) => void
  resetSelectedCompanyId: () => void
  toggleFavorite: (companyId: string) => void
  isFavorite: (companyId: string) => boolean
}

export const useBriefStore = create<BriefState>((set, get) => ({
  selectedCompanyId: null,
  favoriteCompanyIds: [],
  setSelectedCompanyId: (companyId) => set({ selectedCompanyId: companyId }),
  resetSelectedCompanyId: () => set({ selectedCompanyId: null }),
  toggleFavorite: (companyId) =>
    set((state) => ({
      favoriteCompanyIds: state.favoriteCompanyIds.includes(companyId)
        ? state.favoriteCompanyIds.filter((id) => id !== companyId)
        : [...state.favoriteCompanyIds, companyId],
    })),
  isFavorite: (companyId) => get().favoriteCompanyIds.includes(companyId),
}))
