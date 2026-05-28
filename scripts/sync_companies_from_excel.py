from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd


EXCEL_PATH = r"D:\projects\обезличенные и маскированные данные по компаниям.xlsx"
OUT_PATH = Path(r"D:\projects\neuro-sema\src\mocks\companies.ts")

PLACEHOLDER = "—"
DEFAULT_SYSTEMS = "['SFA', 'Pega', 'ClaimCRM']"

ID_BY_INN = {
    "5256059450": "td-bona-fide",
    "5256136472": "ooo-pobeda",
    "772970525805": "ip-batalov",
    "5261020018": "vashe-hozyaistvo",
    "3325010423": "spk-gavrilovskoe",
    "5257056163": "gku-no-guad",
    "5260473551": "agroteh-nn",
    "5259000159": "npo-ds",
    "5262008630": "gidromash",
}

ROW_TO_FIELD = {
    1: "contactRole",
    2: "lastCommunicationDate",
    3: "websiteSource",
    4: "summary",
    5: "riskBankruptcy",
    6: "offerUtk",
    7: "offerSbb",
    8: "customsVed",
    9: "teIeEmission",
    10: "auctions22344",
    11: "staffCount",
    12: "financialStatements",
    13: "leasingContracts",
    14: "groupStructure",
    15: "notableDates",
    16: "aiDrafting",
    17: "digitalCard",
    18: "aiSearch",
    19: "sanctions",
}


def clean(value: object) -> str:
    if pd.isna(value):
        return PLACEHOLDER
    text = str(value).replace("\r", "\n")
    text = re.sub(r"\n{2,}", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = text.strip()
    return text if text else PLACEHOLDER


def parse_header(header: str) -> tuple[str, str]:
    if "/" in header:
        inn_part, name_part = header.split("/", 1)
        inn = inn_part.strip().split()[0]
        name = name_part.strip()
        return inn, name or inn
    inn = header.strip().split()[0]
    return inn, inn


def pick_website(source: str) -> str:
    if source == PLACEHOLDER:
        return PLACEHOLDER
    m = re.search(r"https?://[^\s;]+", source, flags=re.IGNORECASE)
    if m:
        return m.group(0)
    m = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", source)
    if m:
        return m.group(0)
    m = re.search(r"\b(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}\b", source)
    if m:
        return m.group(0)
    return PLACEHOLDER


def arr(items: list[str]) -> str:
    norm = [item for item in items if item and item != PLACEHOLDER]
    if not norm:
        norm = [PLACEHOLDER]
    return json.dumps(norm, ensure_ascii=False, indent=6)


def q(company_id: str, summary: str) -> str:
    text = (
        "Какие задачи бизнеса сейчас в приоритете?"
        if summary == PLACEHOLDER
        else "Какие задачи сейчас ключевые с учетом текущего профиля деятельности?"
    )
    note = "Вопрос сформирован на основе данных из исходной таблицы."
    return (
        "{\n"
        f"        id: '{company_id}-q1',\n"
        "        tone: 'discovery',\n"
        f"        text: {json.dumps(text, ensure_ascii=False)},\n"
        f"        note: {json.dumps(note, ensure_ascii=False)},\n"
        "      }"
    )


def main() -> None:
    df = pd.read_excel(EXCEL_PATH, sheet_name=0, header=None)

    blocks: list[str] = []
    for col in range(2, 11):
        header = clean(df.iat[0, col])
        inn, name = parse_header(header)
        company_id = ID_BY_INN.get(inn, f"company-{inn}")

        raw = {ROW_TO_FIELD[r]: clean(df.iat[r, col]) for r in ROW_TO_FIELD}
        website = pick_website(raw["websiteSource"])

        risks = [raw["riskBankruptcy"], raw["sanctions"]]
        opportunities = [
            raw["offerUtk"],
            raw["offerSbb"],
            raw["customsVed"],
            raw["teIeEmission"],
            raw["auctions22344"],
            raw["leasingContracts"],
        ]
        goals = [
            raw["groupStructure"],
            raw["staffCount"],
            raw["financialStatements"],
            raw["aiDrafting"],
            raw["digitalCard"],
            raw["aiSearch"],
        ]
        objection = [
            f"Источник сайта/публикаций: {raw['websiteSource']}",
            f"Памятные даты и события: {raw['notableDates']}",
        ]

        block = (
            "  {\n"
            f"    id: '{company_id}',\n"
            f"    inn: '{inn}',\n"
            f"    groupName: {json.dumps(name, ensure_ascii=False)},\n"
            f"    name: {json.dumps(name, ensure_ascii=False)},\n"
            f"    website: {json.dumps(website, ensure_ascii=False)},\n"
            f"    industry: {json.dumps(raw['summary'], ensure_ascii=False)},\n"
            "    okved: PLACEHOLDER,\n"
            "    segment: 'SMB',\n"
            "    isAlfaBankClient: false,\n"
            "    kpGroup: PLACEHOLDER,\n"
            f"    lastCommunicationDate: {json.dumps(raw['lastCommunicationDate'], ensure_ascii=False)},\n"
            f"    systems: DEFAULT_SYSTEMS,\n"
            f"    contactRole: {json.dumps(raw['contactRole'], ensure_ascii=False)},\n"
            f"    lastEvent: {json.dumps(raw['notableDates'], ensure_ascii=False)},\n"
            f"    summary: {json.dumps(raw['summary'], ensure_ascii=False)},\n"
            f"    goals: {arr(goals)},\n"
            f"    risks: {arr(risks)},\n"
            f"    opportunities: {arr(opportunities)},\n"
            "    questions: [\n"
            f"      {q(company_id, raw['summary'])}\n"
            "    ],\n"
            f"    objectionHandling: {arr(objection)},\n"
            "  }"
        )
        blocks.append(block)

    output = (
        "import type { CompanyBrief, SystemFilter } from '../types'\n\n"
        f"const DEFAULT_SYSTEMS: SystemFilter[] = {DEFAULT_SYSTEMS}\n"
        f"const PLACEHOLDER = {json.dumps(PLACEHOLDER, ensure_ascii=False)}\n\n"
        "export const companies: CompanyBrief[] = [\n"
        + ",\n".join(blocks)
        + "\n]\n"
    )

    OUT_PATH.write_text(output, encoding="utf-8")


if __name__ == "__main__":
    main()
