import { create } from 'zustand'

interface BriefState {
  selectedCompanyId: string | null
  setSelectedCompanyId: (companyId: string) => void
  resetSelectedCompanyId: () => void
}

export const useBriefStore = create<BriefState>((set) => ({
  selectedCompanyId: null,
  setSelectedCompanyId: (companyId) => set({ selectedCompanyId: companyId }),
  resetSelectedCompanyId: () => set({ selectedCompanyId: null }),
}))
