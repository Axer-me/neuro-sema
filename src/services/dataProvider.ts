import { companies } from '../mocks/companies'
import type { CompanyBrief } from '../types'

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })

export async function getCompanies(): Promise<CompanyBrief[]> {
  await wait(120)
  return companies
}

export async function getCompanyById(id: string): Promise<CompanyBrief | undefined> {
  await wait(120)
  return companies.find((company) => company.id === id)
}
