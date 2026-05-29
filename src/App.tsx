import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { getCompanies, getCompanyById } from './services/dataProvider'
import { useBriefStore } from './store/useBriefStore'
import type { CompanyBrief, SearchMode, SystemFilter } from './types'
import { SYSTEM_FILTERS } from './types'

const SEARCH_MODE_OPTIONS: Array<{ value: SearchMode; label: string }> = [
  { value: 'inn', label: 'ИНН' },
  { value: 'name', label: 'Наименование' },
  { value: 'group', label: 'Группа' },
]

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
  mode: SearchMode,
  query: string,
  systems: SystemFilter[],
  page = 1,
) {
  const params = new URLSearchParams()
  params.set('mode', mode)
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

  const urlMode = getSearchMode(searchParams.get('mode'))
  const submittedQuery = searchParams.get('q')?.trim() ?? ''
  const systemsParam = searchParams.get('systems') ?? ''
  const urlSystems = useMemo(() => parseSystemFilters(systemsParam), [systemsParam])
  const showResults = submittedQuery.length > 0

  const [mode, setMode] = useState<SearchMode>(urlMode)
  const [query, setQuery] = useState(submittedQuery)
  const [selectedSystems, setSelectedSystems] = useState<SystemFilter[]>(urlSystems)
  const [isResultsCollapsed, setIsResultsCollapsed] = useState(false)

  useEffect(() => {
    resetSelectedCompanyId()
  }, [resetSelectedCompanyId])

  useEffect(() => {
    setMode(urlMode)
    setQuery(searchParams.get('q') ?? '')
    setSelectedSystems(parseSystemFilters(systemsParam))
  }, [searchParams, urlMode, systemsParam])

  useEffect(() => {
    if (!showResults) {
      setIsResultsCollapsed(false)
      return
    }

    setIsResultsCollapsed(false)
  }, [showResults, submittedQuery, urlMode, systemsParam])

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
  }, [showResults, isResultsCollapsed, submittedQuery, urlMode, systemsParam])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return
    }

    navigate(`/?${buildSearchParams(mode, trimmedQuery, selectedSystems).toString()}`)
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
            <h1
              className={`font-semibold tracking-tight text-[#171717] ${
                showResults ? 'mt-3 text-4xl sm:text-5xl' : 'mt-5 text-5xl sm:text-6xl'
              }`}
            >
              Нейро-Сёма
            </h1>
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
            <SearchModeTabs mode={mode} onChange={setMode} />

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <SystemFiltersDropdown
                selectedSystems={selectedSystems}
                onChange={setSelectedSystems}
                size="large"
              />
              <input
                className="h-16 min-w-0 flex-1 rounded-[1.5rem] border border-black/10 bg-white px-5 text-base text-[#171717] outline-none transition placeholder:text-[#b0b0b0] focus:border-alfa-red focus:shadow-[0_0_0_4px_rgba(239,49,36,0.08)]"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={getSearchPlaceholder(mode)}
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
                    key={`${submittedQuery}-${urlMode}-${systemsParam}`}
                    ref={resultsRef}
                    className="max-w-5xl border-t border-black/6 pt-10 [animation-fill-mode:forwards] animate-search-reveal"
                  >
                    <SearchResultsPanel
                      mode={urlMode}
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
  mode,
  query,
  selectedSystems,
}: {
  mode: SearchMode
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
    const byQuery = filterCompanies(companies, query, mode)

    if (selectedSystems.length === 0) {
      return byQuery
    }

    return byQuery.filter((company) =>
      selectedSystems.some((system) => company.systems.includes(system)),
    )
  }, [companies, query, mode, selectedSystems])

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
    const params = buildSearchParams(mode, query, selectedSystems, currentPage)
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
            Тип поиска: <span className="font-medium text-[#171717]">{getSearchModeLabel(mode)}</span>
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
  const mode = getSearchMode(searchParams.get('mode'))
  const query = searchParams.get('q')?.trim() ?? ''
  const selectedSystems = parseSystemFilters(searchParams.get('systems'))
  const section = parseReportSection(searchParams.get('section'))
  const stateBackPage =
    typeof (location.state as { backPage?: unknown } | null)?.backPage === 'number'
      ? ((location.state as { backPage?: number }).backPage ?? 1)
      : undefined
  const backPage = stateBackPage ?? parseSearchPage(searchParams.get('page'))
  const backParams = buildSearchParams(mode, query, selectedSystems, backPage)
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
                Запрос: <span className="text-white/75">{getSearchModeLabel(mode)} / {query}</span>
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
    </header>
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
              Спросите о клиенте перед звонком — подскажу контекст, риски и вопросы для разговора.
            </div>
            <div className="ml-auto max-w-[88%] rounded-[1.1rem] rounded-br-md bg-alfa-red px-3.5 py-2.5 text-right text-sm leading-6 text-white">
              Найди компанию по ИНН или названию — я подготовлю brief.
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

function SearchModeTabs({
  mode,
  onChange,
}: {
  mode: SearchMode
  onChange: (mode: SearchMode) => void
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {SEARCH_MODE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-xl border px-5 py-3 text-sm font-medium transition ${
            mode === option.value
              ? 'border-alfa-red bg-alfa-red text-white shadow-[0_12px_28px_rgba(239,49,36,0.22)]'
              : 'border-black/8 bg-white text-[#171717] hover:border-black/15'
          }`}
        >
          {option.label}
        </button>
      ))}
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
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-black/8 bg-[#fafafa] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-[#757575]">{label}</p>
          <p className="mt-1.5 text-sm leading-6 text-[#171717]">{value}</p>
        </div>
      ))}
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

function getSearchMode(value: string | null): SearchMode {
  if (value === 'name' || value === 'group') {
    return value
  }

  return 'inn'
}

function getSearchModeLabel(mode: SearchMode) {
  switch (mode) {
    case 'name':
      return 'Наименование'
    case 'group':
      return 'Группа'
    default:
      return 'ИНН'
  }
}

function getSearchPlaceholder(mode: SearchMode) {
  switch (mode) {
    case 'name':
      return 'Введите наименование компании'
    case 'group':
      return 'Введите название группы'
    default:
      return 'Введите ИНН клиента или организации'
  }
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

function filterCompanies(companies: CompanyBrief[], query: string, mode: SearchMode) {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return companies
  }

  const normalizedQuery = trimmedQuery.toLowerCase()

  switch (mode) {
    case 'name':
      return companies.filter((company) => company.name.toLowerCase().includes(normalizedQuery))
    case 'group':
      return companies.filter((company) =>
        company.groupName.toLowerCase().includes(normalizedQuery),
      )
    default: {
      const digitsOnlyQuery = normalizedQuery.replace(/\D/g, '')
      if (!digitsOnlyQuery) {
        return companies.filter(
          (company) =>
            company.name.toLowerCase().includes(normalizedQuery) ||
            company.groupName.toLowerCase().includes(normalizedQuery),
        )
      }
      return companies.filter((company) => company.inn.includes(digitsOnlyQuery))
    }
  }
}

export default App
