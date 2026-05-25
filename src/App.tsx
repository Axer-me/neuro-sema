import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { getCompanies, getCompanyById } from './services/dataProvider'
import { useBriefStore } from './store/useBriefStore'
import type { CompanyBrief, SearchMode } from './types'

const SEARCH_MODE_OPTIONS: Array<{ value: SearchMode; label: string }> = [
  { value: 'inn', label: 'ИНН' },
  { value: 'name', label: 'Наименование' },
  { value: 'group', label: 'Группа' },
]

function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1f1f1f]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <TopNavigation pathname={location.pathname} />
        <main className="flex-1 py-8">
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

function StartPage() {
  const navigate = useNavigate()
  const { resetSelectedCompanyId } = useBriefStore()
  const [mode, setMode] = useState<SearchMode>('inn')
  const [query, setQuery] = useState('')

  useEffect(() => {
    resetSelectedCompanyId()
  }, [resetSelectedCompanyId])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return
    }

    navigate(`/search?mode=${mode}&q=${encodeURIComponent(trimmedQuery)}`)
  }

  return (
    <section className="rounded-[2.25rem] border border-black/5 bg-white shadow-[0_24px_60px_rgba(17,17,17,0.08)]">
      <div className="mx-auto max-w-4xl px-6 py-16 text-center sm:px-10 lg:px-14 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-alfa-red/80">
          ИИ-помощник для клиентского менеджера
        </p>
        <h1 className="mt-5 text-5xl font-semibold tracking-tight text-[#171717] sm:text-6xl">
          Нейро-Сёма
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#666666] sm:text-lg">
          Краткая сводка по клиенту для подготовки к звонку: быстрый поиск, контекст по
          компании, риски, возможности и структура разговора.
        </p>

        <form className="mx-auto mt-12 max-w-5xl" onSubmit={handleSubmit}>
          <SearchModeTabs mode={mode} onChange={setMode} />

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              className="h-16 flex-1 rounded-[1.5rem] border border-black/10 bg-white px-5 text-base text-[#171717] outline-none transition placeholder:text-[#b0b0b0] focus:border-alfa-red focus:shadow-[0_0_0_4px_rgba(239,49,36,0.08)]"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={getSearchPlaceholder(mode)}
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="h-16 rounded-[1.5rem] bg-alfa-red px-9 text-base font-medium text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Найти
            </button>
          </div>
        </form>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-[#7a7a7a]">
          <span className="rounded-full border border-black/8 bg-[#fafafa] px-4 py-2">
            Демо-режим
          </span>
          <span className="rounded-full border border-black/8 bg-[#fafafa] px-4 py-2">
            Локальные данные
          </span>
          <span className="rounded-full border border-black/8 bg-[#fafafa] px-4 py-2">
            Без внешних интеграций
          </span>
        </div>
      </div>
    </section>
  )
}

function SearchResultsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [companies, setCompanies] = useState<CompanyBrief[]>([])
  const [loading, setLoading] = useState(true)
  const { selectedCompanyId, setSelectedCompanyId, resetSelectedCompanyId } = useBriefStore()

  const mode = getSearchMode(searchParams.get('mode'))
  const query = searchParams.get('q')?.trim() ?? ''

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

  const filteredCompanies = useMemo(
    () => filterCompanies(companies, query, mode),
    [companies, query, mode],
  )

  useEffect(() => {
    if (loading) {
      return
    }

    if (filteredCompanies.length === 0) {
      resetSelectedCompanyId()
      return
    }

    if (!selectedCompanyId || !filteredCompanies.some((company) => company.id === selectedCompanyId)) {
      setSelectedCompanyId(filteredCompanies[0].id)
    }
  }, [filteredCompanies, loading, resetSelectedCompanyId, selectedCompanyId, setSelectedCompanyId])

  const selectedCompany =
    filteredCompanies.find((company) => company.id === selectedCompanyId) ?? filteredCompanies[0]

  const openCompanyBrief = (companyId: string) => {
    const params = new URLSearchParams()
    if (query) {
      params.set('q', query)
    }
    params.set('mode', mode)
    navigate(`/company/${companyId}?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_24px_60px_rgba(17,17,17,0.08)] lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Link className="text-sm font-medium text-alfa-red" to="/">
              ← Вернуться к стартовой странице
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-alfa-red/80">
              Результаты поиска
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#171717]">
              {query ? `Подборка по запросу «${query}»` : 'Демо-компании для подготовки'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#5f5f5f] sm:text-base">
              {query
                ? `Показываем карточки по типу поиска «${getSearchModeLabel(mode)}». Выберите клиента, проверьте краткий summary и затем переходите к полному brief.`
                : 'Выберите клиента, чтобы посмотреть краткий summary, а затем открыть подробный brief для звонка.'}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-black/6 bg-[#fafafa] px-5 py-4 text-sm text-[#444444]">
            <div>
              Тип поиска: <span className="font-medium text-[#171717]">{getSearchModeLabel(mode)}</span>
            </div>
            <div className="mt-1">
              Найдено компаний:{' '}
              <span className="font-medium text-[#171717]">{filteredCompanies.length}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[1.75rem] border border-black/6 bg-[#fafafa] p-4 sm:p-5">
          <SearchBar
            mode={mode}
            initialQuery={query}
            submitLabel="Обновить поиск"
            onSubmit={(nextMode, nextQuery) =>
              navigate(`/search?mode=${nextMode}&q=${encodeURIComponent(nextQuery)}`)
            }
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_24px_60px_rgba(17,17,17,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-[#171717]">Компании</h3>
              <p className="mt-2 text-sm text-[#5f5f5f]">
                Выберите карточку, чтобы посмотреть контекст перед звонком.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {loading ? (
              <CardSkeleton />
            ) : filteredCompanies.length > 0 ? (
              filteredCompanies.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => setSelectedCompanyId(company.id)}
                  className={`rounded-[1.75rem] border p-5 text-left transition ${
                    selectedCompany?.id === company.id
                      ? 'border-alfa-red bg-[#fff5f4] shadow-[0_16px_40px_rgba(239,49,36,0.12)]'
                      : 'border-black/8 bg-[#fcfcfc] hover:border-alfa-red/35 hover:bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#737373]">
                    <span>{company.industry}</span>
                    <span className="text-alfa-red">•</span>
                    <span>{company.segment}</span>
                    <span className="text-alfa-red">•</span>
                    <span>{company.contactRole}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-[#171717]">{company.name}</h3>
                  <div className="mt-3 grid gap-2 text-sm text-[#5f5f5f] sm:grid-cols-2">
                    <span>ИНН: {company.inn}</span>
                    <span>Группа: {company.groupName}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#525252]">{company.summary}</p>
                  <p className="mt-4 text-sm text-[#737373]">
                    Актуальный триггер: <span className="text-[#171717]">{company.lastEvent}</span>
                  </p>
                </button>
              ))
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-black/10 bg-[#fafafa] p-8 text-center">
                <h3 className="text-lg font-semibold text-[#171717]">Ничего не найдено</h3>
                <p className="mt-3 text-sm leading-6 text-[#5f5f5f]">
                  Измени запрос или вернись на стартовую страницу, чтобы попробовать другой тип
                  поиска.
                </p>
                <Link
                  className="mt-5 inline-flex rounded-2xl bg-alfa-red px-4 py-3 text-sm font-medium text-white"
                  to="/"
                >
                  Новый поиск
                </Link>
              </div>
            )}
          </div>
        </section>

        <aside className="rounded-[2rem] border border-black/5 bg-[#171717] p-6 text-white shadow-[0_24px_60px_rgba(17,17,17,0.14)]">
          {selectedCompany ? (
            <>
              <p className="text-xs uppercase tracking-[0.24em] text-alfa-red/85">Краткий summary</p>
              <h2 className="mt-3 text-2xl font-semibold">{selectedCompany.name}</h2>
              <p className="mt-2 text-sm text-white/65">ИНН {selectedCompany.inn}</p>
              <p className="mt-3 text-sm leading-6 text-white/72">{selectedCompany.summary}</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InfoList title="Цели звонка" items={selectedCompany.goals} dark />
                <InfoList title="Риски" items={selectedCompany.risks} dark />
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-medium text-white">Что важно показать на встрече</p>
                <ul className="mt-3 space-y-2 text-sm text-white/72">
                  {selectedCompany.opportunities.map((opportunity) => (
                    <li key={opportunity} className="flex gap-2">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-alfa-red" />
                      <span>{opportunity}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                className="mt-6 inline-flex items-center justify-center rounded-2xl bg-alfa-red px-4 py-3 text-sm font-medium text-white transition hover:brightness-105"
                onClick={() => openCompanyBrief(selectedCompany.id)}
              >
                Открыть полный brief
              </button>
            </>
          ) : (
            <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-white/15 bg-white/5 p-6 text-center">
              <BrandBadge />
              <h2 className="mt-6 text-xl font-semibold text-white">Выберите компанию</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
                После выбора справа появится краткий summary. Затем можно перейти к полному brief
                для звонка.
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
  const [searchParams] = useSearchParams()
  const [company, setCompany] = useState<CompanyBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const mode = getSearchMode(searchParams.get('mode'))
  const query = searchParams.get('q')?.trim() ?? ''
  const backParams = new URLSearchParams()

  backParams.set('mode', mode)
  if (query) {
    backParams.set('q', query)
  }

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
        <Link className="mt-6 inline-flex text-sm font-medium text-alfa-red" to="/">
          Вернуться к списку компаний
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-black/5 bg-white shadow-[0_24px_60px_rgba(17,17,17,0.08)]">
        <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-end lg:justify-between lg:p-8">
          <div>
            <Link className="text-sm font-medium text-alfa-red" to={`/search?${backParams.toString()}`}>
              ← Назад к результатам поиска
            </Link>
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

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="space-y-6">
          <InfoPanel title="Цели звонка" items={company.goals} />
          <InfoPanel title="Риски" items={company.risks} />
          <InfoPanel title="Возможности" items={company.opportunities} />
        </section>

        <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_24px_60px_rgba(17,17,17,0.08)]">
          <h3 className="text-xl font-semibold text-[#171717]">Рекомендуемые вопросы</h3>
          <p className="mt-2 text-sm text-[#525252]">
            Структура разговора от первого контакта до уверенного следующего шага.
          </p>

          <div className="mt-6 space-y-4">
            {company.questions.map((question) => (
              <div
                key={question.id}
                className="rounded-[1.5rem] border border-black/7 bg-[#fafafa] p-4"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-alfa-red/85">
                  {question.tone}
                </div>
                <p className="mt-2 text-base font-medium text-[#171717]">{question.text}</p>
                <p className="mt-2 text-sm text-[#737373]">{question.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-alfa-red/15 bg-[#fff5f4] p-5">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#171717]">
              Подсказки по возражениям
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-[#404040]">
              {company.objectionHandling.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-alfa-red" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}

function TopNavigation({ pathname }: { pathname: string }) {
  return (
    <header className="rounded-[1.75rem] border border-black/5 bg-white px-5 py-4 shadow-[0_18px_40px_rgba(17,17,17,0.05)] sm:px-7">
      <div className="flex items-center justify-between gap-4">
        <Link className="text-xl font-semibold tracking-tight text-[#171717]" to="/">
          Нейро-Сёма
        </Link>

        <nav className="flex items-center gap-5 text-sm text-[#6d6d6d]">
          <Link className={pathname === '/' ? 'text-[#171717]' : 'hover:text-[#171717]'} to="/">
            Поиск
          </Link>
          <Link
            className={pathname === '/search' ? 'text-[#171717]' : 'hover:text-[#171717]'}
            to="/search"
          >
            Клиенты
          </Link>
        </nav>
      </div>
    </header>
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

function SearchBar({
  mode,
  initialQuery,
  submitLabel,
  onSubmit,
}: {
  mode: SearchMode
  initialQuery: string
  submitLabel: string
  onSubmit: (mode: SearchMode, query: string) => void
}) {
  const [localMode, setLocalMode] = useState<SearchMode>(mode)
  const [localQuery, setLocalQuery] = useState(initialQuery)

  useEffect(() => {
    setLocalMode(mode)
  }, [mode])

  useEffect(() => {
    setLocalQuery(initialQuery)
  }, [initialQuery])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedQuery = localQuery.trim()
    if (!trimmedQuery) {
      return
    }

    onSubmit(localMode, trimmedQuery)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <SearchModeTabs mode={localMode} onChange={setLocalMode} />
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          className="h-14 flex-1 rounded-[1.25rem] border border-black/10 bg-white px-4 text-sm text-[#171717] outline-none transition placeholder:text-[#b0b0b0] focus:border-alfa-red focus:shadow-[0_0_0_4px_rgba(239,49,36,0.08)]"
          value={localQuery}
          onChange={(event) => setLocalQuery(event.target.value)}
          placeholder={getSearchPlaceholder(localMode)}
        />
        <button
          type="submit"
          disabled={!localQuery.trim()}
          className="h-14 rounded-[1.25rem] bg-alfa-red px-6 text-sm font-medium text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_24px_60px_rgba(17,17,17,0.08)]">
      <h3 className="text-lg font-semibold text-[#171717]">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm text-[#525252]">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-alfa-red" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function InfoList({
  title,
  items,
  dark = false,
}: {
  title: string
  items: string[]
  dark?: boolean
}) {
  return (
    <div
      className={`rounded-[1.5rem] border p-4 ${
        dark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-[#fafafa]'
      }`}
    >
      <p className={`text-sm font-medium ${dark ? 'text-white' : 'text-[#171717]'}`}>{title}</p>
      <ul className={`mt-3 space-y-2 text-sm ${dark ? 'text-white/72' : 'text-[#525252]'}`}>
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-alfa-red" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
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
      return companies.filter((company) => company.inn.includes(digitsOnlyQuery))
    }
  }
}

export default App
