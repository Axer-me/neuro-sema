import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import semaProfileImg from './assets/sema-profile.jpg'
import semaTabletImg from './assets/sema-tablet.png'
import { getCompanies, getCompanyById } from './services/dataProvider'
import { useBriefStore } from './store/useBriefStore'
import { DEFAULT_VISITING_CARD_URL, USER_NAME, useUserStore } from './store/useUserStore'
import type { CompanyBrief, SystemFilter } from './types'
import { SYSTEM_FILTERS } from './types'

const SEARCH_PLACEHOLDER = 'ИНН, наименование или группа'

function App() {
  return (
    <div className="min-h-screen bg-white text-[#1f1f1f]">
      <div className="mx-auto flex min-h-screen max-w-[1180px] flex-col px-6 py-6 lg:px-10">
        <TopNavigation />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<StartPage />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/company/:companyId" element={<CompanyPage />} />
            <Route path="/visiting-card" element={<VisitingCardPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function parseSearchPage(value: string | null): number {
  const page = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

function buildSearchParams(
  query: string,
  systems: SystemFilter[],
  page = 1,
) {
  const params = new URLSearchParams()
  params.set('q', query)
  if (systems.length > 0) {
    params.set('systems', systems.join(','))
  }
  if (page > 1) {
    params.set('page', String(page))
  }
  return params
}

const SEARCH_LAYOUT_MS = 480
const SEARCH_SCROLL_DURATION_MS = 720
const SEARCH_RESULT_STAGGER_MS = 70
const RESULTS_PER_PAGE = 4
const MISSING_VALUE = 'Нет информации'
type ReportSection = 'full-report' | 'offers' | 'risks'

const REPORT_SECTION_LABELS: Record<ReportSection, string> = {
  'full-report': 'Полный отчёт',
  offers: 'Предложения',
  risks: 'Риски',
}

function getRevealStyle(delayMs: number) {
  return {
    animationDelay: `${SEARCH_LAYOUT_MS + delayMs}ms`,
    animationFillMode: 'forwards',
  } as const
}

function parseReportSection(value: string | null): ReportSection {
  if (value === 'offers' || value === 'risks') {
    return value
  }
  return 'full-report'
}

function StartPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const resultsRef = useRef<HTMLDivElement>(null)
  const scrollFrameRef = useRef<number>()
  const { resetSelectedCompanyId } = useBriefStore()

  const submittedQuery = searchParams.get('q')?.trim() ?? ''
  const systemsParam = searchParams.get('systems') ?? ''
  const urlSystems = useMemo(() => parseSystemFilters(systemsParam), [systemsParam])
  const showResults = submittedQuery.length > 0

  const [query, setQuery] = useState(submittedQuery)
  const [selectedSystems, setSelectedSystems] = useState<SystemFilter[]>(urlSystems)
  const [isResultsCollapsed, setIsResultsCollapsed] = useState(false)

  useEffect(() => {
    resetSelectedCompanyId()
  }, [resetSelectedCompanyId])

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
    setSelectedSystems(parseSystemFilters(systemsParam))
  }, [searchParams, systemsParam])

  useEffect(() => {
    if (!showResults) {
      setIsResultsCollapsed(false)
      return
    }

    setIsResultsCollapsed(false)
  }, [showResults, submittedQuery, systemsParam])

  useEffect(() => {
    if (!showResults || isResultsCollapsed) {
      return
    }

    let cancelled = false

    const runScroll = () => {
      if (cancelled) {
        return
      }

      const element = resultsRef.current
      if (!element) {
        return
      }

      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current)
      }

      const offset = 32
      const startY = window.scrollY
      const targetY = element.getBoundingClientRect().top + window.scrollY - offset
      const distance = targetY - startY

      if (Math.abs(distance) < 4) {
        return
      }

      let startTime: number | null = null

      const step = (timestamp: number) => {
        if (cancelled) {
          return
        }

        if (startTime === null) {
          startTime = timestamp
        }

        const progress = Math.min((timestamp - startTime) / SEARCH_SCROLL_DURATION_MS, 1)
        const eased = 1 - (1 - progress) ** 3

        window.scrollTo(0, startY + distance * eased)

        if (progress < 1) {
          scrollFrameRef.current = requestAnimationFrame(step)
        }
      }

      scrollFrameRef.current = requestAnimationFrame(step)
    }

    const timeoutId = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(runScroll)
      })
    }, SEARCH_LAYOUT_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current)
      }
    }
  }, [showResults, isResultsCollapsed, submittedQuery, systemsParam])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return
    }

    navigate(`/?${buildSearchParams(trimmedQuery, selectedSystems).toString()}`)
  }

  return (
    <>
      <section
        className={`rounded-[2.25rem] border border-black/5 bg-white shadow-[0_24px_60px_rgba(17,17,17,0.08)] ${
          showResults ? 'mt-2' : 'mt-8 lg:mt-10'
        }`}
      >
        <div
          className={`mx-auto max-w-5xl px-6 transition-[padding] duration-[480ms] ease-search sm:px-10 lg:px-14 ${
            showResults ? 'pb-10 pt-12' : 'py-16 lg:py-20'
          }`}
        >
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-alfa-red/80">
              ИИ-помощник для клиентского менеджера
            </p>
            <div
              className={`mt-5 flex items-center justify-center gap-3 sm:gap-4 ${
                showResults ? 'mt-3' : ''
              }`}
            >
              <h1
                className={`font-semibold tracking-tight text-[#171717] ${
                  showResults ? 'text-4xl sm:text-5xl' : 'text-5xl sm:text-6xl'
                }`}
              >
                Нейро-Сёма
              </h1>
              <img
                src={semaTabletImg}
                alt="Сёма"
                className={`w-auto shrink-0 object-contain ${
                  showResults ? 'h-14 sm:h-16' : 'h-16 sm:h-20 lg:h-24'
                }`}
              />
            </div>
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-[480ms] ease-search ${
                showResults ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
              }`}
            >
              <div className="overflow-hidden">
                <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#666666] sm:text-lg">
                  Я знаю всё о твоём клиенте
                </p>
              </div>
            </div>
          </div>

          <form
            className={`mx-auto max-w-5xl transition-[margin] duration-[480ms] ease-search ${
              showResults ? 'mt-8' : 'mt-12'
            }`}
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SystemFiltersDropdown
                selectedSystems={selectedSystems}
                onChange={setSelectedSystems}
                size="large"
              />
              <input
                className="h-16 min-w-0 flex-1 rounded-[1.5rem] border border-black/10 bg-white px-5 text-base text-[#171717] outline-none transition placeholder:text-[#b0b0b0] focus:border-alfa-red focus:shadow-[0_0_0_4px_rgba(239,49,36,0.08)]"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={SEARCH_PLACEHOLDER}
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="h-16 shrink-0 rounded-[1.5rem] bg-alfa-red px-9 text-base font-medium text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Найти
              </button>
            </div>
          </form>

          {showResults ? (
            <div className="mx-auto mt-7 max-w-5xl">
              <div className="flex justify-end">
                <button
                  type="button"
                  aria-expanded={!isResultsCollapsed}
                  onClick={() => setIsResultsCollapsed((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#171717] transition hover:border-alfa-red/35 hover:bg-[#fff5f4] hover:text-alfa-red"
                >
                  <span>{isResultsCollapsed ? 'Показать результаты' : 'Свернуть результаты'}</span>
                  <span
                    className={`inline-flex transition-transform duration-300 ${
                      isResultsCollapsed ? 'rotate-180' : ''
                    }`}
                  >
                    <ChevronUpIcon />
                  </span>
                </button>
              </div>

              <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-500 ease-search ${
                  isResultsCollapsed ? 'pointer-events-none grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
                }`}
              >
                <div className="min-h-0">
                  <div
                    key={`${submittedQuery}-${systemsParam}`}
                    ref={resultsRef}
                    className="max-w-5xl border-t border-black/6 pt-10 [animation-fill-mode:forwards] animate-search-reveal"
                  >
                    <SearchResultsPanel
                      query={submittedQuery}
                      selectedSystems={urlSystems}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
      <ChatAssistant />
    </>
  )
}

function SearchResultsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    navigate(`/?${searchParams.toString()}`, { replace: true })
  }, [navigate, searchParams])

  return null
}

function SearchResultsPanel({
  query,
  selectedSystems,
}: {
  query: string
  selectedSystems: SystemFilter[]
}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [companies, setCompanies] = useState<CompanyBrief[]>([])
  const [loading, setLoading] = useState(true)
  const currentPage = parseSearchPage(searchParams.get('page'))
  const [summaryOffset, setSummaryOffset] = useState(0)
  const resultsSectionRef = useRef<HTMLElement>(null)
  const summaryAsideRef = useRef<HTMLElement>(null)
  const { selectedCompanyId, setSelectedCompanyId, resetSelectedCompanyId } = useBriefStore()

  useEffect(() => {
    let active = true

    void getCompanies().then((result) => {
      if (!active) {
        return
      }

      setCompanies(result)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  const filteredCompanies = useMemo(() => {
    const byQuery = filterCompanies(companies, query)

    if (selectedSystems.length === 0) {
      return byQuery
    }

    return byQuery.filter((company) =>
      selectedSystems.some((system) => company.systems.includes(system)),
    )
  }, [companies, query, selectedSystems])

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / RESULTS_PER_PAGE))

  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * RESULTS_PER_PAGE
    return filteredCompanies.slice(startIndex, startIndex + RESULTS_PER_PAGE)
  }, [filteredCompanies, currentPage])

  const setCurrentPage = (updater: number | ((page: number) => number)) => {
    const nextPage = typeof updater === 'function' ? updater(currentPage) : updater
    const params = new URLSearchParams(searchParams)

    if (nextPage <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(nextPage))
    }

    setSearchParams(params, { replace: true })
  }

  useEffect(() => {
    if (loading) {
      return
    }

    if (currentPage > totalPages) {
      const params = new URLSearchParams(searchParams)
      if (totalPages <= 1) {
        params.delete('page')
      } else {
        params.set('page', String(totalPages))
      }
      setSearchParams(params, { replace: true })
    }
  }, [loading, currentPage, totalPages, searchParams, setSearchParams])

  useEffect(() => {
    if (loading) {
      return
    }

    if (filteredCompanies.length === 0) {
      resetSelectedCompanyId()
      return
    }

    if (!selectedCompanyId || !paginatedCompanies.some((company) => company.id === selectedCompanyId)) {
      setSelectedCompanyId(paginatedCompanies[0].id)
    }
  }, [
    filteredCompanies,
    loading,
    paginatedCompanies,
    resetSelectedCompanyId,
    selectedCompanyId,
    setSelectedCompanyId,
  ])

  const selectedCompany =
    paginatedCompanies.find((company) => company.id === selectedCompanyId) ?? paginatedCompanies[0]
  const selectedIndex = selectedCompany
    ? paginatedCompanies.findIndex((company) => company.id === selectedCompany.id)
    : -1

  useEffect(() => {
    const syncOffset = () => {
      if (window.innerWidth < 768) {
        setSummaryOffset(0)
        return
      }

      const resultsEl = resultsSectionRef.current
      const asideEl = summaryAsideRef.current
      if (!resultsEl || !asideEl || selectedIndex < 0 || paginatedCompanies.length <= 1) {
        setSummaryOffset(0)
        return
      }

      const available = resultsEl.getBoundingClientRect().height - asideEl.getBoundingClientRect().height
      if (available <= 0) {
        setSummaryOffset(0)
        return
      }

      const ratio = selectedIndex / (paginatedCompanies.length - 1)
      setSummaryOffset(available * ratio)
    }

    syncOffset()

    const observer = new ResizeObserver(() => {
      syncOffset()
    })

    if (resultsSectionRef.current) {
      observer.observe(resultsSectionRef.current)
    }
    if (summaryAsideRef.current) {
      observer.observe(summaryAsideRef.current)
    }

    window.addEventListener('resize', syncOffset)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncOffset)
    }
  }, [selectedIndex, paginatedCompanies.length, currentPage, loading])

  const openCompanyBrief = (companyId: string, section: ReportSection) => {
    const params = buildSearchParams(query, selectedSystems, currentPage)
    params.set('section', section)
    navigate(
      `/company/${companyId}?${params.toString()}`,
      { state: { backPage: currentPage } },
    )
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="opacity-0 animate-search-reveal" style={getRevealStyle(0)}>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-alfa-red/80">
            Результаты поиска
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#171717] sm:text-3xl">
            Ответы на вопросы, которые вы даже не задавали
          </h2>
        </div>

        <div
          className="rounded-[1.5rem] border border-black/6 bg-[#fafafa] px-5 py-4 text-sm text-[#444444] opacity-0 animate-search-reveal"
          style={getRevealStyle(90)}
        >
          <div>
            Запрос: <span className="font-medium text-[#171717]">{query}</span>
          </div>
          <div className="mt-1">
            Найдено компаний:{' '}
            <span className="font-medium text-[#171717]">{filteredCompanies.length}</span>
          </div>
          {selectedSystems.length > 0 ? (
            <div className="mt-1">
              Фильтры:{' '}
              <span className="font-medium text-[#171717]">{selectedSystems.length}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <section
          ref={resultsSectionRef}
          className="w-full shrink-0 rounded-[2rem] border border-black/5 bg-[#fafafa] p-6 opacity-0 animate-search-reveal md:max-w-[420px]"
          style={getRevealStyle(160)}
        >
          <div>
            <h3 className="text-xl font-semibold text-[#171717]">Компании</h3>
            <p className="mt-2 text-sm text-[#5f5f5f]">
              Выберите карточку — краткий summary появится справа.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {loading ? (
              <CardSkeleton />
            ) : filteredCompanies.length > 0 ? (
              paginatedCompanies.map((company, index) => {
                const isSelected = selectedCompany?.id === company.id

                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => setSelectedCompanyId(company.id)}
                    className={`rounded-[1.75rem] border-2 bg-white p-5 text-left opacity-0 transition animate-search-reveal ${
                      isSelected
                        ? 'border-alfa-red bg-[#fff5f4] shadow-[0_0_0_1px_rgba(239,49,36,1),0_16px_40px_rgba(239,49,36,0.14)]'
                        : 'border-transparent ring-1 ring-black/8 hover:ring-alfa-red/35'
                    }`}
                    style={getRevealStyle(220 + Math.min(6, index) * SEARCH_RESULT_STAGGER_MS)}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#737373]">
                      <span>{company.industry}</span>
                      <span className="text-alfa-red">•</span>
                      <span>{company.segment}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-[#171717]">{company.name}</h3>
                    <div className="mt-3 grid gap-2 text-sm text-[#5f5f5f] sm:grid-cols-2">
                      <span>ИНН: {company.inn}</span>
                      <span>Группа: {company.groupName}</span>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-black/10 bg-white p-8 text-center">
                <h3 className="text-lg font-semibold text-[#171717]">Ничего не найдено</h3>
                <p className="mt-3 text-sm leading-6 text-[#5f5f5f]">
                  Измените запрос или сбросьте фильтры и попробуйте снова.
                </p>
              </div>
            )}
          </div>

          {!loading && filteredCompanies.length > RESULTS_PER_PAGE ? (
            <div className="mt-6 flex items-center justify-between rounded-[1.25rem] border border-black/8 bg-white px-3 py-2.5">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded-lg px-3 py-1.5 text-sm text-[#171717] transition hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Назад
              </button>
              <p className="text-sm text-[#5f5f5f]">
                Страница <span className="font-medium text-[#171717]">{currentPage}</span> из{' '}
                <span className="font-medium text-[#171717]">{totalPages}</span>
              </p>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg px-3 py-1.5 text-sm text-[#171717] transition hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Далее
              </button>
            </div>
          ) : null}
        </section>

        <aside
          ref={summaryAsideRef}
          className="w-full min-w-0 flex-1 rounded-[2rem] border border-black/5 bg-[#171717] p-6 text-white opacity-0 shadow-[0_24px_60px_rgba(17,17,17,0.14)] animate-search-reveal md:sticky md:top-6"
          style={{
            ...getRevealStyle(220),
            marginTop: summaryOffset > 0 ? `${summaryOffset}px` : undefined,
            transition: 'margin-top 420ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {selectedCompany && filteredCompanies.length > 0 ? (
            <>
              <p className="text-xs uppercase tracking-[0.24em] text-alfa-red/85">Краткий summary</p>
              <ShortSummaryPanel company={selectedCompany} />

              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                {(['full-report', 'offers', 'risks'] as ReportSection[]).map((section) => (
                  <button
                    key={section}
                    type="button"
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                      section === 'full-report'
                        ? 'border-alfa-red bg-alfa-red text-white hover:brightness-105'
                        : 'border-white/15 bg-white/5 text-white hover:border-white/35 hover:bg-white/10'
                    }`}
                    onClick={() => openCompanyBrief(selectedCompany.id, section)}
                  >
                    {REPORT_SECTION_LABELS[section]}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-white/15 bg-white/5 p-6 text-center">
              <BrandBadge />
              <h2 className="mt-6 text-xl font-semibold text-white">Выберите компанию</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
                Краткий summary появится здесь после выбора карточки слева.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function CompanyPage() {
  const { companyId } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [company, setCompany] = useState<CompanyBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const query = searchParams.get('q')?.trim() ?? ''
  const selectedSystems = parseSystemFilters(searchParams.get('systems'))
  const section = parseReportSection(searchParams.get('section'))
  const stateBackPage =
    typeof (location.state as { backPage?: unknown } | null)?.backPage === 'number'
      ? ((location.state as { backPage?: number }).backPage ?? 1)
      : undefined
  const backPage = stateBackPage ?? parseSearchPage(searchParams.get('page'))
  const backParams = buildSearchParams(query, selectedSystems, backPage)
  const sectionTabs = (Object.keys(REPORT_SECTION_LABELS) as ReportSection[]).map((value) => ({
    value,
    label: REPORT_SECTION_LABELS[value],
  }))

  useEffect(() => {
    let active = true

    if (!companyId) {
      setLoading(false)
      return () => {
        active = false
      }
    }

    void getCompanyById(companyId).then((result) => {
      if (!active) {
        return
      }

      setCompany(result ?? null)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [companyId])

  if (loading) {
    return <CardSkeleton />
  }

  if (!company) {
    return (
      <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-[0_24px_60px_rgba(17,17,17,0.08)]">
        <h2 className="text-2xl font-semibold text-[#171717]">Компания не найдена</h2>
        <p className="mt-3 text-sm text-[#525252]">
          Возможно, ссылка устарела или данных для этого brief пока нет.
        </p>
        <div className="mt-6">
          <PageNavActions
            backTo={`/?${backParams.toString()}`}
            backLabel="К результатам поиска"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-black/5 bg-white shadow-[0_24px_60px_rgba(17,17,17,0.08)]">
        <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-end lg:justify-between lg:p-8">
          <div className="flex-1">
            <PageNavActions
              backTo={`/?${backParams.toString()}`}
              backLabel="К результатам поиска"
              favoriteCompanyId={company.id}
            />
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-alfa-red/80">
              Полный brief
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#171717]">
              {company.name}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#525252]">{company.summary}</p>
          </div>

          <div className="rounded-[1.5rem] bg-[#171717] px-5 py-4 text-sm text-white">
            <div>
              ИНН: <span className="text-white/75">{company.inn}</span>
            </div>
            <div>
              Контакт: <span className="text-white/75">{company.contactRole}</span>
            </div>
            <div className="mt-1">
              Группа: <span className="text-white/75">{company.groupName}</span>
            </div>
            <div className="mt-1">
              Триггер: <span className="text-white/75">{company.lastEvent}</span>
            </div>
            {query ? (
              <div className="mt-1">
                Запрос: <span className="text-white/75">{query}</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="h-2 w-full bg-alfa-red" />
      </div>

      <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_24px_60px_rgba(17,17,17,0.08)]">
        <div className="flex flex-wrap gap-2">
          {sectionTabs.map((tab) => {
            const params = new URLSearchParams(backParams)
            params.set('section', tab.value)

            return (
              <Link
                key={tab.value}
                to={`/company/${company.id}?${params.toString()}`}
                state={{ backPage }}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  tab.value === section
                    ? 'border-alfa-red bg-alfa-red text-white'
                    : 'border-black/10 bg-white text-[#171717] hover:border-black/20 hover:bg-[#fafafa]'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        <div className="mt-6">
          {section === 'full-report' ? (
            <div className="space-y-6">
              <ReportGrid company={company} />
              <FullReportBlocks company={company} />
              <PublicPresencePanel company={company} />
            </div>
          ) : section === 'offers' ? (
            <ChecklistPanel title="Предложения для клиента" items={getOffers(company)} />
          ) : (
            <ChecklistPanel title="Риски и ограничения" items={getRiskChecks(company)} />
          )}
        </div>
      </section>
    </div>
  )
}

function TopNavigation() {
  return (
    <header className="flex items-center justify-end gap-5 py-2 text-sm text-[#6d6d6d]">
      <span className="cursor-default">Избранное</span>
      <button
        type="button"
        aria-label="Уведомления"
        className="rounded-full p-1 text-[#171717] transition hover:bg-black/5"
      >
        <BellIcon />
      </button>
      <UserAccountMenu />
    </header>
  )
}

function UserAccountMenu() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    { label: 'Профиль', disabled: true },
    { label: 'Настройки', disabled: true },
    { label: 'Визитка', disabled: false },
    { label: 'Выход', disabled: true },
  ] as const

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        aria-label={`Личный кабинет — ${USER_NAME}`}
        aria-expanded={isOpen}
        className="overflow-hidden rounded-full ring-2 ring-transparent transition hover:ring-alfa-red/25"
      >
        <img
          src={semaProfileImg}
          alt={USER_NAME}
          className="h-9 w-9 object-cover object-top"
        />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-50 w-52 pt-2">
          <div className="overflow-hidden rounded-[1.25rem] border border-black/8 bg-white shadow-[0_16px_40px_rgba(17,17,17,0.12)]">
            <div className="border-b border-black/6 px-4 py-3">
              <p className="text-sm font-semibold text-[#171717]">{USER_NAME}</p>
              <p className="mt-0.5 text-xs text-[#737373]">Личный кабинет</p>
            </div>
            <ul className="py-1.5">
              {menuItems.map((item) => (
                <li key={item.label}>
                  {item.disabled ? (
                    <span className="block cursor-default px-4 py-2.5 text-sm text-[#b0b0b0]">
                      {item.label}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        navigate('/visiting-card')
                      }}
                      className="block w-full px-4 py-2.5 text-left text-sm font-medium text-[#171717] transition hover:bg-[#fff5f4] hover:text-alfa-red"
                    >
                      {item.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function normalizeVisitingCardUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return `https://${trimmed}`
}

function isValidVisitingCardUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function buildQrCodeUrl(url: string): string {
  return `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=220&margin=1`
}

function VisitingCardPreview({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-center gap-6 px-6 py-10 sm:flex-row sm:items-start sm:justify-center sm:gap-10">
      <div className="w-full max-w-sm overflow-hidden rounded-[1.5rem] border border-black/8 bg-white shadow-[0_12px_32px_rgba(17,17,17,0.08)]">
        <div className="bg-gradient-to-br from-[#fff5f4] to-white px-6 py-8 text-center">
          <img
            src={semaProfileImg}
            alt={USER_NAME}
            className="mx-auto h-20 w-20 rounded-full object-cover object-top ring-2 ring-white shadow-md"
          />
          <p className="mt-4 text-xl font-semibold text-[#171717]">{USER_NAME}</p>
          <p className="mt-1 text-sm text-[#737373]">Виртуальная визитная карточка</p>
        </div>
        <div className="border-t border-black/6 px-6 py-5">
          <p className="break-all text-center text-sm leading-6 text-[#666666]">{url}</p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex h-12 items-center justify-center rounded-[1rem] bg-alfa-red text-sm font-medium text-white transition hover:brightness-105"
          >
            Открыть визитку
          </a>
        </div>
      </div>

      <div className="flex flex-col items-center text-center">
        <img
          src={buildQrCodeUrl(url)}
          alt={`QR-код визитки ${USER_NAME}`}
          width={220}
          height={220}
          className="rounded-[1rem] border border-black/8 bg-white p-2"
        />
        <p className="mt-3 max-w-[220px] text-xs leading-5 text-[#737373]">
          Отсканируйте QR-код или откройте ссылку — так работает yourcf.online
        </p>
      </div>
    </div>
  )
}

function VisitingCardPage() {
  const navigate = useNavigate()
  const { visitingCardUrl, setVisitingCardUrl } = useUserStore()
  const [inputValue, setInputValue] = useState(visitingCardUrl)
  const [previewUrl, setPreviewUrl] = useState(() =>
    isValidVisitingCardUrl(normalizeVisitingCardUrl(visitingCardUrl))
      ? normalizeVisitingCardUrl(visitingCardUrl)
      : '',
  )

  useEffect(() => {
    setInputValue(visitingCardUrl)
    const normalized = normalizeVisitingCardUrl(visitingCardUrl)
    setPreviewUrl(isValidVisitingCardUrl(normalized) ? normalized : '')
  }, [visitingCardUrl])

  const handleApply = () => {
    const normalized = normalizeVisitingCardUrl(inputValue)
    if (!normalized || !isValidVisitingCardUrl(normalized)) {
      return
    }
    setVisitingCardUrl(normalized)
    setPreviewUrl(normalized)
  }

  const normalizedInput = normalizeVisitingCardUrl(inputValue)
  const canApply = isValidVisitingCardUrl(normalizedInput) && normalizedInput !== visitingCardUrl

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#666666] transition hover:text-alfa-red"
      >
        <BackIcon />
        Назад
      </button>

      <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_24px_60px_rgba(17,17,17,0.08)] sm:p-8">
        <div className="flex items-start gap-4">
          <img
            src={semaProfileImg}
            alt={USER_NAME}
            className="h-16 w-16 shrink-0 rounded-full object-cover object-top ring-2 ring-black/5"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-alfa-red/80">
              Личный кабинет
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#171717]">Визитка</h1>
            <p className="mt-2 text-sm leading-7 text-[#666666]">
              {USER_NAME} — ссылка на электронную визитку. Сервисы вроде yourcf.online не
              встраиваются в iframe, поэтому показываем карточку и QR-код.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <label
            htmlFor="visiting-card-url"
            className="text-xs font-semibold uppercase tracking-[0.22em] text-[#737373]"
          >
            Ссылка на электронную визитку
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="visiting-card-url"
              type="url"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleApply()
                }
              }}
              placeholder={DEFAULT_VISITING_CARD_URL}
              className="h-14 min-w-0 flex-1 rounded-[1.25rem] border border-black/10 bg-white px-4 text-base text-[#171717] outline-none transition placeholder:text-[#b0b0b0] focus:border-alfa-red focus:shadow-[0_0_0_4px_rgba(239,49,36,0.08)]"
            />
            <button
              type="button"
              onClick={handleApply}
              disabled={!canApply}
              className="h-14 shrink-0 rounded-[1.25rem] bg-alfa-red px-7 text-base font-medium text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Показать
            </button>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#737373]">
            Превью визитки
          </p>
          <div className="mt-3 overflow-hidden rounded-[1.5rem] border border-black/8 bg-[#fafafa]">
            {previewUrl ? (
              <VisitingCardPreview url={previewUrl} />
            ) : (
              <div className="flex min-h-[280px] items-center justify-center px-6 py-10 text-center text-sm leading-7 text-[#999999]">
                Вставьте ссылку и нажмите «Показать», чтобы загрузить превью визитки.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 17a2 2 0 0 0 4 0" />
    </svg>
  )
}

function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
      {isOpen ? (
        <div className="pointer-events-auto w-[min(100vw-3rem,320px)] overflow-hidden rounded-[1.5rem] border border-black/8 bg-white shadow-[0_20px_50px_rgba(17,17,17,0.14)]">
          <div className="flex items-center justify-between gap-3 border-b border-black/6 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff5f4] text-alfa-red">
                <ChatBotIcon />
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold text-[#171717]">Помощник</p>
                <p className="text-xs text-[#737373]">онлайн</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Свернуть чат"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1.5 text-[#737373] transition hover:bg-black/5 hover:text-[#171717]"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="space-y-3 px-4 py-4">
            <div className="max-w-[92%] rounded-[1.1rem] rounded-bl-md bg-[#f5f5f5] px-3.5 py-2.5 text-left text-sm leading-6 text-[#404040]">
              Добро пожаловать в Нейро-Сёму! Расскажу, как пользоваться сайтом перед звонком клиенту.
            </div>
            <div className="ml-auto max-w-[88%] rounded-[1.1rem] rounded-br-md bg-alfa-red px-3.5 py-2.5 text-right text-sm leading-6 text-white">
              С чего начать?
            </div>
            <div className="max-w-[92%] rounded-[1.1rem] rounded-bl-md bg-[#f5f5f5] px-3.5 py-2.5 text-left text-sm leading-6 text-[#404040]">
              На главной введи ИНН, название или группу — поиск сразу по всем полям. Можно
              отфильтровать по системам (SFA, Pega, ClaimCRM и др.).
            </div>
            <div className="ml-auto max-w-[88%] rounded-[1.1rem] rounded-br-md bg-alfa-red px-3.5 py-2.5 text-right text-sm leading-6 text-white">
              Что будет в карточке компании?
            </div>
            <div className="max-w-[92%] rounded-[1.1rem] rounded-bl-md bg-[#f5f5f5] px-3.5 py-2.5 text-left text-sm leading-6 text-[#404040]">
              Три раздела: Полный отчёт, Предложения и Риски — всё для подготовки к разговору с
              клиентом.
            </div>
          </div>

          <div className="border-t border-black/6 px-3 py-3">
            <div className="flex items-center gap-2 rounded-[1.25rem] border border-black/8 bg-[#fafafa] px-3 py-2">
              <input
                type="text"
                readOnly
                placeholder="Напишите сообщение..."
                className="min-w-0 flex-1 bg-transparent text-sm text-[#171717] outline-none placeholder:text-[#b0b0b0]"
              />
              <button
                type="button"
                aria-label="Отправить"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-alfa-red text-white transition hover:brightness-105"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-label={isOpen ? 'Свернуть чат' : 'Открыть чат'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#171717] text-white shadow-[0_16px_40px_rgba(17,17,17,0.22)] transition hover:scale-[1.03] hover:bg-[#262626]"
      >
        {isOpen ? <CloseIcon /> : <ChatBotIcon />}
      </button>
    </div>
  )
}

function ChatBotIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 10h8M8 14h5M12 3c4.4 0 8 2.7 8 6v5c0 1-.4 2-1 2.8L19 21l-4.2-2.1c-1.8.7-3.8 1.1-5.8 1.1-4.4 0-8-2.7-8-6s3.6-6 8-6Z"
      />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 14-7-7 14-7-7 7 14Z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v10H4V7Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.5 4.5h2l1.5 4-2 1.5a11 11 0 0 0 4.5 4.5l1.5-2 4 1.5v2a2 2 0 0 1-2 2A13.5 13.5 0 0 1 6.5 8.5a2 2 0 0 1 2-4Z"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l4 4 10-10" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

function ChevronUpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 14 6-6 6 6" />
    </svg>
  )
}

const NAV_ICON_BUTTON_CLASS =
  'inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8 text-[#171717] transition hover:border-alfa-red/35 hover:bg-[#fff5f4] hover:text-alfa-red'

function PageNavActions({
  backTo,
  backLabel = 'Назад',
  favoriteCompanyId,
}: {
  backTo: string
  backLabel?: string
  favoriteCompanyId?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Link to={backTo} aria-label={backLabel} className={NAV_ICON_BUTTON_CLASS}>
          <BackIcon />
        </Link>
        <Link to="/" aria-label="На стартовую страницу" className={NAV_ICON_BUTTON_CLASS}>
          <HomeIcon />
        </Link>
      </div>
      {favoriteCompanyId ? <FavoriteButton companyId={favoriteCompanyId} /> : null}
    </div>
  )
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 6 9 12l6 6" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
      />
    </svg>
  )
}

function FavoriteButton({ companyId }: { companyId: string }) {
  const { isFavorite, toggleFavorite } = useBriefStore()
  const active = isFavorite(companyId)

  return (
    <button
      type="button"
      aria-label={active ? 'Убрать из избранного' : 'Добавить в избранное'}
      aria-pressed={active}
      onClick={() => toggleFavorite(companyId)}
      className={`${NAV_ICON_BUTTON_CLASS} ${
        active ? 'border-alfa-red bg-[#fff5f4] text-alfa-red' : ''
      }`}
    >
      <HeartIcon filled={active} />
    </button>
  )
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.5s-7-4.7-7-10.2C5 7.4 7.2 5 10 5c1.7 0 3.2.9 4 2.2C14.8 5.9 16.3 5 18 5c2.8 0 5 2.4 5 5.3 0 5.5-7 10.2-7 10.2Z"
      />
    </svg>
  )
}

function BrandBadge() {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
      <span className="h-2.5 w-2.5 rounded-full bg-alfa-red" />
      <span className="text-xs uppercase tracking-[0.22em] text-white/65">Alfa style</span>
    </div>
  )
}

function SystemFiltersDropdown({
  selectedSystems,
  onChange,
  size = 'default',
}: {
  selectedSystems: SystemFilter[]
  onChange: (systems: SystemFilter[]) => void
  size?: 'default' | 'large'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const isLarge = size === 'large'

  const toggleSystem = (system: SystemFilter) => {
    onChange(
      selectedSystems.includes(system)
        ? selectedSystems.filter((item) => item !== system)
        : [...selectedSystems, system],
    )
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Фильтры по системам"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`inline-flex items-center gap-2 border px-4 font-medium transition ${
          isLarge ? 'h-16 rounded-[1.5rem] text-base' : 'h-14 rounded-[1.25rem] text-sm'
        } ${
          selectedSystems.length > 0 || isOpen
            ? 'border-alfa-red bg-[#fff5f4] text-alfa-red'
            : 'border-black/10 bg-white text-[#171717] hover:border-black/15'
        }`}
      >
        <FilterIcon />
        <span className="hidden sm:inline">Фильтры</span>
        {selectedSystems.length > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-alfa-red px-1.5 text-xs text-white">
            {selectedSystems.length}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            aria-label="Закрыть фильтры"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(100vw-2rem,320px)] rounded-[1.25rem] border border-black/8 bg-white p-4 shadow-[0_20px_50px_rgba(17,17,17,0.14)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#171717]">Источники данных</p>
              {selectedSystems.length > 0 ? (
                <button
                  type="button"
                  className="text-xs font-medium text-alfa-red"
                  onClick={() => onChange([])}
                >
                  Сбросить
                </button>
              ) : null}
            </div>
            <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
              {SYSTEM_FILTERS.map((system) => {
                const isChecked = selectedSystems.includes(system)

                return (
                  <label
                    key={system}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      isChecked ? 'bg-[#fff5f4] text-[#171717]' : 'text-[#525252] hover:bg-[#fafafa]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-black/20 text-alfa-red focus:ring-alfa-red/30"
                      checked={isChecked}
                      onChange={() => toggleSystem(system)}
                    />
                    <span>{system}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M7 12h10M10 17h4" />
    </svg>
  )
}

function PublicPresencePanel({ company }: { company: CompanyBrief }) {
  const { publicPresence } = company
  const hasPublications = publicPresence.publications.length > 0
  const hasAchievements = publicPresence.achievements.length > 0

  return (
    <div className="rounded-[1.5rem] border border-black/7 bg-[#fafafa] p-5">
      <h3 className="text-lg font-semibold text-[#171717]">
        Соцсети, сайты, проф. статьи и достижения ЮЛ и его ЛПР
      </h3>
      <p className="mt-1 text-xs text-[#757575]">
        Данные из строки Excel (без основного сайта компании — он в поле «Сайт» выше).
      </p>

      <dl className="mt-4 grid gap-3">
        <div className="rounded-xl border border-black/8 bg-white px-4 py-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-[#757575]">Соцсети</dt>
          <dd className="mt-1.5 text-sm leading-6 text-[#171717]">{publicPresence.socialNetworks}</dd>
        </div>
        <div className="rounded-xl border border-black/8 bg-white px-4 py-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-[#757575]">
            Прочие сайты и контакты в сети
          </dt>
          <dd className="mt-1.5 text-sm leading-6 text-[#171717]">{publicPresence.additionalSites}</dd>
        </div>
      </dl>

      <div className="mt-5">
        <h4 className="text-sm font-semibold text-[#171717]">Публикации и проф. материалы</h4>
        {hasPublications ? (
          <div className="mt-3 space-y-3">
            {publicPresence.publications.map((item, index) => (
              <article
                key={`${item.source}-${index}`}
                className="rounded-xl border border-black/8 bg-white px-4 py-3"
              >
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#757575]">
                  {item.source}
                  {item.date !== MISSING_VALUE ? ` · ${item.date}` : ''}
                </p>
                <h5 className="mt-2 text-sm font-semibold text-[#171717]">{item.title}</h5>
                <p className="mt-1.5 text-sm leading-6 text-[#525252]">{item.excerpt}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#757575]">{MISSING_VALUE}</p>
        )}
      </div>

      <div className="mt-5">
        <h4 className="text-sm font-semibold text-[#171717]">Достижения ЮЛ и ЛПР</h4>
        {hasAchievements ? (
          <ul className="mt-3 space-y-2">
            {publicPresence.achievements.map((item, index) => (
              <li
                key={`${item}-${index}`}
                className="rounded-xl bg-white px-4 py-3 text-sm leading-6 text-[#2a2a2a]"
              >
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[#757575]">{MISSING_VALUE}</p>
        )}
      </div>
    </div>
  )
}

function offerCheckValue(company: CompanyBrief, label: string): string {
  const item = company.offerChecks.find((check) => check.label === label)
  return displayFieldValue(item?.value)
}

function displayFieldValue(value: string | undefined): string {
  const trimmed = value?.trim() ?? ''
  return trimmed ? trimmed : MISSING_VALUE
}

const GROUP_PROSPECTS_TITLE = 'Состав группы + связи с проспектами, закреплёнными за КП'
const GROUP_PROSPECTS_COLLAPSE_THRESHOLD = 5

function FullReportBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-black/7 bg-[#fafafa] p-5">
      <h3 className="text-lg font-semibold text-[#171717]">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function GroupProspectsBlock({ value, companyId }: { value: string; companyId: string }) {
  const text = displayFieldValue(value)
  const lines = text.split(/\r?\n/)
  const isCollapsible = lines.length > GROUP_PROSPECTS_COLLAPSE_THRESHOLD
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    setIsExpanded(false)
  }, [companyId])

  const visibleText = isCollapsible && !isExpanded ? lines.slice(0, GROUP_PROSPECTS_COLLAPSE_THRESHOLD).join('\n') : text
  const hiddenCount = lines.length - GROUP_PROSPECTS_COLLAPSE_THRESHOLD

  return (
    <FullReportBlock title={GROUP_PROSPECTS_TITLE}>
      <p className="whitespace-pre-wrap text-sm leading-6 text-[#171717]">{visibleText}</p>
      {isCollapsible ? (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((prev) => !prev)}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#171717] transition hover:border-alfa-red/35 hover:bg-[#fff5f4] hover:text-alfa-red"
        >
          <span>
            {isExpanded ? 'Свернуть' : `Показать ещё (${hiddenCount})`}
          </span>
          <span
            className={`inline-flex transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          >
            <ChevronUpIcon />
          </span>
        </button>
      ) : null}
    </FullReportBlock>
  )
}

function FullReportBlocks({ company }: { company: CompanyBrief }) {
  return (
    <div className="space-y-4">
      <FullReportBlock title="История взаимодействия">
        <p className="whitespace-pre-wrap text-sm leading-6 text-[#171717]">
          {displayFieldValue(company.interactionHistory)}
        </p>
      </FullReportBlock>
      <FullReportBlock title="БО/Баланс">
        <p className="whitespace-pre-wrap text-sm leading-6 text-[#171717]">
          {displayFieldValue(company.boBalance)}
        </p>
      </FullReportBlock>
      <GroupProspectsBlock value={company.groupProspects} companyId={company.id} />
    </div>
  )
}

function parseContactItems(contactRole: string): string[] {
  const trimmed = contactRole.trim()
  if (!trimmed || trimmed === MISSING_VALUE) {
    return []
  }

  return trimmed
    .split(/[;/]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function isEmailContact(value: string): boolean {
  return value.includes('@')
}

function VisitCardSendControl({ contacts }: { contacts: string[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<string[]>(contacts)

  useEffect(() => {
    setSelectedContacts(contacts)
  }, [contacts])

  if (contacts.length === 0) {
    return null
  }

  const allSelected = selectedContacts.length === contacts.length

  const toggleContact = (contact: string) => {
    setSelectedContacts((current) =>
      current.includes(contact)
        ? current.filter((item) => item !== contact)
        : [...current, contact],
    )
  }

  const toggleAll = () => {
    setSelectedContacts(allSelected ? [] : contacts)
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
          isOpen
            ? 'border-alfa-red bg-alfa-red text-white shadow-[0_10px_24px_rgba(239,49,36,0.24)]'
            : 'border-black/10 bg-white text-[#171717] shadow-[0_4px_14px_rgba(17,17,17,0.06)] hover:border-alfa-red/30 hover:text-alfa-red'
        }`}
      >
        <SendIcon />
        <span>Отправить визитку</span>
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            aria-label="Закрыть"
            className="fixed inset-0 z-40 cursor-default bg-black/10 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-[min(100vw-2rem,340px)] overflow-hidden rounded-[1.5rem] border border-black/8 bg-white shadow-[0_24px_60px_rgba(17,17,17,0.16)]">
            <div className="bg-gradient-to-br from-[#fff5f4] via-white to-white px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#171717]">Рассылка визитки</p>
                  <p className="mt-1 text-xs leading-5 text-[#737373]">
                    Выберите контакты для отправки
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-alfa-red ring-1 ring-alfa-red/15">
                  {selectedContacts.length}/{contacts.length}
                </span>
              </div>
            </div>

            <div className="border-t border-black/6 px-3 py-3">
              <button
                type="button"
                onClick={toggleAll}
                className={`mb-2 flex w-full items-center justify-between rounded-[1rem] border px-3.5 py-2.5 text-left text-sm transition ${
                  allSelected
                    ? 'border-alfa-red/25 bg-[#fff5f4] text-[#171717]'
                    : 'border-black/8 bg-[#fafafa] text-[#525252] hover:border-black/12'
                }`}
              >
                <span className="font-medium">Все контакты</span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
                    allSelected ? 'border-alfa-red bg-alfa-red text-white' : 'border-black/15 bg-white'
                  }`}
                >
                  {allSelected ? <CheckIcon /> : null}
                </span>
              </button>

              <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
                {contacts.map((contact) => {
                  const checked = selectedContacts.includes(contact)
                  const isEmail = isEmailContact(contact)

                  return (
                    <button
                      key={contact}
                      type="button"
                      onClick={() => toggleContact(contact)}
                      className={`flex w-full items-center gap-3 rounded-[1rem] border px-3.5 py-3 text-left transition ${
                        checked
                          ? 'border-alfa-red/25 bg-[#fff5f4] shadow-[0_0_0_1px_rgba(239,49,36,0.12)]'
                          : 'border-black/8 bg-white hover:border-black/12 hover:bg-[#fafafa]'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          checked ? 'bg-alfa-red text-white' : 'bg-[#f5f5f5] text-[#737373]'
                        }`}
                      >
                        {isEmail ? <MailIcon /> : <PhoneIcon />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">
                          {isEmail ? 'Email' : 'Телефон'}
                        </span>
                        <span className="mt-0.5 block truncate text-sm leading-6 text-[#171717]">
                          {contact}
                        </span>
                      </span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          checked ? 'border-alfa-red bg-alfa-red text-white' : 'border-black/15 bg-white'
                        }`}
                      >
                        {checked ? <CheckIcon /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-black/6 bg-[#fafafa] px-4 py-3">
              <button
                type="button"
                disabled={selectedContacts.length === 0}
                onClick={() => setIsOpen(false)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[1rem] bg-alfa-red text-sm font-medium text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <SendIcon />
                Отправить
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function ContactsReportField({ contactRole }: { contactRole: string }) {
  const contacts = useMemo(() => parseContactItems(contactRole), [contactRole])
  const displayValue = displayFieldValue(contactRole)

  return (
    <div className="rounded-xl border border-black/8 bg-[#fafafa] px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.16em] text-[#757575]">Контакты ЮЛ и ЛПР</p>
        <VisitCardSendControl contacts={contacts} />
      </div>

      {contacts.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {contacts.map((contact) => {
            const isEmail = isEmailContact(contact)

            return (
              <li
                key={contact}
                className="flex items-center gap-3 rounded-[1rem] border border-black/6 bg-white px-3.5 py-2.5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff5f4] text-alfa-red">
                  {isEmail ? <MailIcon /> : <PhoneIcon />}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">
                    {isEmail ? 'Email' : 'Телефон'}
                  </p>
                  <p className="truncate text-sm leading-6 text-[#171717]">{contact}</p>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-1.5 text-sm leading-6 text-[#171717]">{displayValue}</p>
      )}
    </div>
  )
}

function ReportGrid({ company }: { company: CompanyBrief }) {
  const okvedPart =
    company.okved.trim() && company.okved !== MISSING_VALUE
      ? `${company.okved} — ${company.summary}`
      : company.summary

  const rows = [
    ['Наименование организации / ИНН', `${company.name} / ${company.inn}`],
    ['Юридический адрес', MISSING_VALUE],
    ['Сайт', displayFieldValue(company.website)],
    ['Основные ОКВЭД / записка', okvedPart],
    ['Финансовая отчётность', displayFieldValue(company.financialStatements)],
    ['Выручка', displayFieldValue(company.revenue)],
    ['База эмиссии ТЭ и ИЭ', offerCheckValue(company, 'База эмиссии ТЭ и ИЭ')],
    ['База ФТС. Участник ВЭД', offerCheckValue(company, 'База ФТС. Участник ВЭД')],
    ['ЧИ', MISSING_VALUE],
    ['ЧП', MISSING_VALUE],
    ['Среднесписочная численность', displayFieldValue(company.staffCount)],
    ['Контакты ЮЛ и ЛПР', displayFieldValue(company.contactRole)],
    ['Сводка по достижениям компании', displayFieldValue(company.lastEvent)],
  ] as const

  return (
    <div className="grid gap-3">
      {rows.map(([label, value]) =>
        label === 'Контакты ЮЛ и ЛПР' ? (
          <ContactsReportField key={label} contactRole={company.contactRole} />
        ) : (
          <div key={label} className="rounded-xl border border-black/8 bg-[#fafafa] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[#757575]">{label}</p>
            <p className="mt-1.5 text-sm leading-6 text-[#171717]">{value}</p>
          </div>
        ),
      )}
    </div>
  )
}

function ChecklistPanel({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div className="rounded-[1.5rem] border border-black/7 bg-[#fafafa] p-5">
      <h3 className="text-lg font-semibold text-[#171717]">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.map(([label, value], index) => (
          <div key={`${label}-${index}`} className="rounded-xl border border-black/8 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[#757575]">{label}</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-[#171717]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function getOffers(company: CompanyBrief): Array<[string, string]> {
  if (company.offerChecks.length === 0) {
    return [['Предложения', MISSING_VALUE]]
  }

  return company.offerChecks.map((item) => [item.label, displayFieldValue(item.value)])
}

function getRiskChecks(company: CompanyBrief): Array<[string, string]> {
  if (company.riskChecks.length === 0) {
    return [['Риски', MISSING_VALUE]]
  }

  return company.riskChecks.map((item) => [item.label, displayFieldValue(item.value)])
}

function ShortSummaryPanel({ company }: { company: CompanyBrief }) {
  const clientStatus = company.isAlfaBankClient ? 'Клиент' : 'Не клиент'

  const rows: Array<{ label: string; value: string; highlight?: boolean }> = [
    { label: 'Наименование', value: company.name },
    { label: 'ИНН', value: company.inn },
    { label: 'Отрасль / ОКВЭД', value: `${company.industry} / ${company.okved}` },
    { label: 'Сегмент', value: company.segment },
    {
      label: 'Клиент Альфа-Банка',
      value: clientStatus,
      highlight: company.isAlfaBankClient,
    },
    { label: 'Принадлежность к КП', value: company.kpGroup },
    { label: 'Последняя коммуникация', value: company.lastCommunicationDate },
  ]

  return (
    <dl className="mt-5 space-y-4">
      {rows.map((row) => (
        <div key={row.label} className="border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
          <dt className="text-xs uppercase tracking-[0.18em] text-white/55">{row.label}</dt>
          <dd
            className={`mt-1.5 text-sm leading-6 ${
              row.highlight ? 'font-medium text-alfa-red' : 'text-white/90'
            }`}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function CardSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-36 animate-pulse rounded-[1.75rem] border border-black/5 bg-white"
        />
      ))}
    </div>
  )
}

function filterCompanies(companies: CompanyBrief[], query: string) {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return companies
  }

  const normalizedQuery = trimmedQuery.toLowerCase()
  const digitsOnlyQuery = normalizedQuery.replace(/\D/g, '')

  return companies.filter((company) => {
    const matchesName = company.name.toLowerCase().includes(normalizedQuery)
    const matchesGroup = company.groupName.toLowerCase().includes(normalizedQuery)
    const matchesInn = digitsOnlyQuery.length > 0 && company.inn.includes(digitsOnlyQuery)
    return matchesName || matchesGroup || matchesInn
  })
}

function parseSystemFilters(value: string | null): SystemFilter[] {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is SystemFilter =>
      SYSTEM_FILTERS.includes(item as SystemFilter),
    )
}

export default App
