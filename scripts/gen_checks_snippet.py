from pathlib import Path

import pandas as pd


def norm(v: str) -> str:
    if not v.strip():
        return "Нет информации"
    low = v.strip().lower()
    if low in ("нет информации", "нет инфо"):
        return "Нет информации"
    return v.strip()


p = r"D:\projects\обезличенные и маскированные данные по компаниям.xlsx"
df = pd.read_excel(p, sheet_name=0, header=None)
ids = [
    "5256059450",
    "5256136472",
    "772970525805",
    "5261020018",
    "3325010423",
    "5257056163",
    "5260473551",
    "5259000159",
    "5262008630",
]
row_map = {
    "sbb": 7,
    "utk": 6,
    "fts": 8,
    "te": 9,
    "223": 10,
    "lease": 13,
    "bankruptcy": 5,
    "sanctions": 19,
}

lines: list[str] = []
for i, inn in enumerate(ids):
    c = i + 2
    d = {
        k: "" if pd.isna(df.iat[r, c]) else str(df.iat[r, c]).strip()
        for k, r in row_map.items()
    }
    r223 = d["223"]
    ebg_only = "Заливка на ежемесячной основе" in r223 and "ЭБГ" in r223
    offers = [
        ("Наличие оферты СББ", norm(d["sbb"])),
        ("Наличие оферты УТК", norm(d["utk"])),
        ("Факторинг", "Нет информации"),
        ("Льготные программы финансирования", "Нет информации"),
        ("ЭБГ", norm(r223) if ebg_only else "Нет информации"),
        ("Участник аукционов по 223 и 44 ФЗ", "Нет информации" if ebg_only else norm(r223)),
        ("База эмиссии ТЭ и ИЭ", norm(d["te"])),
        ("База ФТС. Участник ВЭД", norm(d["fts"])),
        ("Наличие лизинговых договоров", norm(d["lease"])),
    ]
    risks = [
        ("БКИ", "Нет информации"),
        ("РНО", "Нет информации"),
        ("115 ФЗ Блокировки", "Нет информации"),
        ("Жалобы клиента на банк", "Нет информации"),
        ("Санкционные и отраслевые ограничения", norm(d["sanctions"])),
        ("Банкротство", norm(d["bankruptcy"])),
    ]
    lines.append(f"// {inn}")
    lines.append("offerChecks: [")
    for label, value in offers:
        esc = value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
        lines.append(f'  {{ label: "{label}", value: "{esc}" }},')
    lines.append("],")
    lines.append("riskChecks: [")
    for label, value in risks:
        esc = value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
        lines.append(f'  {{ label: "{label}", value: "{esc}" }},')
    lines.append("],")
    lines.append("")

out = Path(__file__).with_name("_generated_checks.txt")
out.write_text("\n".join(lines), encoding="utf-8")
print("written", out)
