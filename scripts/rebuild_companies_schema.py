"""Rebuild companies.ts to current CompanyBrief schema from legacy file + Excel."""
from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
COMPANIES = ROOT / "src" / "mocks" / "companies.ts"
EXCEL = r"D:\projects\обезличенные и маскированные данные по компаниям.xlsx"
PLACEHOLDER = "Нет информации"

INN_COL = {
    "5256059450": 2,
    "5256136472": 3,
    "772970525805": 4,
    "5261020018": 5,
    "3325010423": 6,
    "5257056163": 7,
    "5260473551": 8,
    "5259000159": 9,
    "5262008630": 10,
}

POBEDA_PUBLICATIONS = [
    {
        "source": "Пермский край. Государственная власть и местное самоуправление",
        "title": "Всем Гав в этом чате: новая коллаборация Почты и «Союзмультфильма» к чаю",
        "excerpt": "Почта России и киностудия «Союзмультфильм» выпустили совместную серию кондитерской продукции с мультгероями «Котенок Гав» на упаковке. Угощения изготавливают компании «ОЗБИ» и «Победа».",
        "date": "19.05.2026",
    },
    {
        "source": "Сеть городских медиа",
        "title": "Экономить стало проще: в Ростовской области открылся новый дискаунтер",
        "excerpt": "Сеть дискаунтеров ПОБЕДА продолжает расширять географию: новый магазин по адресу Волгодонск, Маршала Кошевого, 25а. Это 47-я торговая точка в Ростовской области и 2-я для жителей Волгодонска.",
        "date": "20.05.2026",
    },
    {
        "source": "РИА Воронеж",
        "title": "Экономить стало проще: в городе Богучар открылся новый дискаунтер ПОБЕДА",
        "excerpt": "Торжественное открытие пройдет 23 мая.",
        "date": "22.05.2026",
    },
    {
        "source": "Движение.ру",
        "title": "Девелопер заявил о массовом демпинге цены на первичном рынке недвижимости Краснодара",
        "excerpt": "На сверке комдиров клуба «Движение» коммерческий директор ГК «Победа» Ирина Дробышева высказала мнение о готовности повышать комиссию риелторам до 12% и продавать жильё дешевле цены, заявленной банкам.",
        "date": "20.05.2026",
    },
    {
        "source": "Краснодарские известия",
        "title": "Экономить стало проще: в Ростовской области открылся новый дискаунтер ПОБЕДА",
        "excerpt": "Новый магазин: г. Волгодонск, ул. Маршала Кошевого, 25 А. 47-я торговая точка в Ростовской области. Новые продсклады продолжают открываться в различных регионах.",
        "date": "20.05.2026",
    },
]
POBEDA_ACHIEVEMENTS = [
    "Коллаборация Почты России и «Союзмультфильма» (продукция «Котенок Гав», производство «ОЗБИ» и «Победа»).",
    "Расширение сети дискаунтеров ПОБЕДА (47-я торговая точка в Ростовской области).",
]


def norm(v: str) -> str:
    t = v.strip()
    if not t or t == "—":
        return PLACEHOLDER
    if t.lower() in ("нет информации", "нет инфо"):
        return PLACEHOLDER
    return t


def excel_cell(df: pd.DataFrame, col: int, row: int) -> str:
    if pd.isna(df.iat[row, col]):
        return PLACEHOLDER
    return norm(str(df.iat[row, col]))


def js(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def js_array_strings(items: list[str]) -> str:
    return json.dumps(items, ensure_ascii=False, indent=6)


def labeled_fields(pairs: list[tuple[str, str]]) -> str:
    lines = ["["]
    for label, value in pairs:
        lines.append(f"  {{ label: {js(label)}, value: {js(value)} }},")
    lines.append("]")
    return "\n".join(lines)


def build_offers(col: int, df: pd.DataFrame) -> list[tuple[str, str]]:
    d = {k: excel_cell(df, col, r) for k, r in {
        "sbb": 7, "utk": 6, "fts": 8, "te": 9, "223": 10, "lease": 13
    }.items()}
    r223 = d["223"]
    ebg = "Заливка на ежемесячной основе" in r223 and "ЭБГ" in r223
    return [
        ("Наличие оферты СББ", d["sbb"]),
        ("Наличие оферты УТК", d["utk"]),
        ("Факторинг", PLACEHOLDER),
        ("Льготные программы финансирования", PLACEHOLDER),
        ("ЭБГ", r223 if ebg else PLACEHOLDER),
        ("Участник аукционов по 223 и 44 ФЗ", PLACEHOLDER if ebg else d["223"]),
        ("База эмиссии ТЭ и ИЭ", d["te"]),
        ("База ФТС. Участник ВЭД", d["fts"]),
        ("Наличие лизинговых договоров", d["lease"]),
    ]


def build_risks(col: int, df: pd.DataFrame) -> list[tuple[str, str]]:
    return [
        ("БКИ", PLACEHOLDER),
        ("РНО", PLACEHOLDER),
        ("115 ФЗ Блокировки", PLACEHOLDER),
        ("Жалобы клиента на банк", PLACEHOLDER),
        ("Санкционные и отраслевые ограничения", excel_cell(df, col, 19)),
        ("Банкротство", excel_cell(df, col, 5)),
    ]


def parse_ts_string_field(block: str, field: str) -> str:
    marker = f"{field}: "
    start = block.index(marker) + len(marker)
    if block.startswith("PLACEHOLDER", start):
        return PLACEHOLDER
    quote = block[start]
    if quote not in ('"', "'"):
        raise ValueError(f"Cannot parse {field}")
    i = start + 1
    while i < len(block):
        if block[i] == "\\":
            i += 2
            continue
        if block[i] == quote:
            break
        i += 1
    raw = block[start : i + 1]
    if quote == "'":
        inner = raw[1:-1].replace("\\", "\\\\").replace('"', '\\"')
        raw = f'"{inner}"'
    return json.loads(raw)


def parse_ts_array(block: str, field: str) -> list[str]:
    m = re.search(rf"{field}: (\[[\s\S]*?\]),\n    (?:risks|opportunities|questions)", block)
    if not m:
        return []
    raw = m.group(1).replace("PLACEHOLDER", json.dumps(PLACEHOLDER))
    return json.loads(raw)


def emit_publication(pub: dict) -> str:
    return (
        "        {\n"
        f"          source: {js(pub['source'])},\n"
        f"          title: {js(pub['title'])},\n"
        f"          excerpt: {js(pub['excerpt'])},\n"
        f"          date: {js(pub['date'])},\n"
        "        }"
    )


def main() -> None:
    legacy = COMPANIES.read_text(encoding="utf-8")
    body = legacy.split("export const companies: CompanyBrief[] = [", 1)[1].rsplit("\n]", 1)[0]
    chunks = re.split(r"\n  \},\n  \{", body.strip())
    df = pd.read_excel(EXCEL, sheet_name=0, header=None)

    blocks: list[str] = []
    for i, chunk in enumerate(chunks):
        if i > 0:
            chunk = "  {" + chunk
        if i < len(chunks) - 1:
            chunk = chunk + "\n  }"

        inn = re.search(r"inn: '(\d+)'", chunk).group(1)
        col = INN_COL[inn]
        company_id = re.search(r"id: '([^']+)'", chunk).group(1)

        last_event = parse_ts_string_field(chunk, "lastEvent")
        if last_event == "—":
            last_event = PLACEHOLDER

        goals_match = re.search(r"goals: (\[[\s\S]*?\]),\n    risks:", chunk)
        goals_raw = (goals_match.group(1) if goals_match else "[]").replace(
            "PLACEHOLDER", json.dumps(PLACEHOLDER)
        )

        if inn == "5256136472":
            pub_block = (
                "    publicPresence: {\n"
                "      socialNetworks: PLACEHOLDER,\n"
                "      additionalSites: PLACEHOLDER,\n"
                "      publications: [\n"
                + ",\n".join(emit_publication(p) for p in POBEDA_PUBLICATIONS)
                + ",\n      ],\n"
                f"      achievements: {js_array_strings(POBEDA_ACHIEVEMENTS)},\n"
                "    } satisfies PublicPresence,\n"
            )
        else:
            pub_block = (
                "    publicPresence: {\n"
                "      socialNetworks: PLACEHOLDER,\n"
                "      additionalSites: PLACEHOLDER,\n"
                "      publications: [],\n"
                "      achievements: [],\n"
                "    } satisfies PublicPresence,\n"
            )

        fin = parse_ts_string_field(chunk, "financialStatements")
        fin_expr = "PLACEHOLDER" if fin == PLACEHOLDER else js(fin)

        block = (
            "  {\n"
            f"    id: {js(company_id)},\n"
            f"    inn: '{inn}',\n"
            f"    groupName: {js(parse_ts_string_field(chunk, 'groupName'))},\n"
            f"    name: {js(parse_ts_string_field(chunk, 'name'))},\n"
            f"    website: {js(parse_ts_string_field(chunk, 'website'))},\n"
            f"{pub_block}"
            f"    industry: {js(parse_ts_string_field(chunk, 'industry'))},\n"
            f"    okved: PLACEHOLDER,\n"
            f"    segment: {js(parse_ts_string_field(chunk, 'segment'))},\n"
            f"    revenue: {js(parse_ts_string_field(chunk, 'revenue'))},\n"
            f"    financialStatements: {fin_expr},\n"
            f"    staffCount: {js(parse_ts_string_field(chunk, 'staffCount'))},\n"
            f"    isAlfaBankClient: false,\n"
            f"    kpGroup: {js(parse_ts_string_field(chunk, 'kpGroup'))},\n"
            f"    lastCommunicationDate: {js(parse_ts_string_field(chunk, 'lastCommunicationDate'))},\n"
            "    systems: DEFAULT_SYSTEMS,\n"
            f"    contactRole: {js(parse_ts_string_field(chunk, 'contactRole'))},\n"
            f"    lastEvent: {js(last_event)},\n"
            f"    summary: {js(parse_ts_string_field(chunk, 'summary'))},\n"
            f"    interactionHistory: {js(excel_cell(df, col, 2))},\n"
            f"    boBalance: {js(excel_cell(df, col, 12))},\n"
            f"    leasingContracts: {js(excel_cell(df, col, 13))},\n"
            f"    groupProspects: {js(excel_cell(df, col, 14))},\n"
            f"    goals: {goals_raw},\n"
            f"    offerChecks: {labeled_fields(build_offers(col, df))},\n"
            f"    riskChecks: {labeled_fields(build_risks(col, df))},\n"
            "    questions: [\n"
            f"      {{\n"
            f"        id: '{company_id}-q1',\n"
            "        tone: 'discovery',\n"
            '        text: "Какие задачи сейчас ключевые с учетом текущего профиля деятельности?",\n'
            '        note: "Вопрос сформирован на основе данных из исходной таблицы.",\n'
            "      }\n"
            "    ],\n"
            f"    objectionHandling: [{js(PLACEHOLDER)}],\n"
            "  }"
        )
        blocks.append(block)

    output = (
        "import type { CompanyBrief, PublicPresence, SystemFilter } from '../types'\n\n"
        "const DEFAULT_SYSTEMS: SystemFilter[] = ['SFA', 'Pega', 'ClaimCRM']\n"
        f"const PLACEHOLDER = {js(PLACEHOLDER)}\n\n"
        "export const companies: CompanyBrief[] = [\n"
        + ",\n".join(blocks)
        + ",\n]\n"
    )
    COMPANIES.write_text(output, encoding="utf-8")
    print(f"Rebuilt {len(blocks)} companies -> {COMPANIES}")


if __name__ == "__main__":
    main()
