import json
from pathlib import Path

import pandas as pd

EXCEL = r"D:\projects\обезличенные и маскированные данные по компаниям.xlsx"
IDS = [
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
ROWS = {
    "interactionHistory": 2,
    "boBalance": 12,
    "leasingContracts": 13,
    "groupProspects": 14,
}


def norm(value: str) -> str:
    if not value.strip():
        return "Нет информации"
    low = value.strip().lower()
    if low in ("нет информации", "нет инфо"):
        return "Нет информации"
    return value.strip()


df = pd.read_excel(EXCEL, sheet_name=0, header=None)
lines: list[str] = []

for i, inn in enumerate(IDS):
    col = i + 2
    lines.append(f"// {inn}")
    for key, row in ROWS.items():
        raw = "" if pd.isna(df.iat[row, col]) else str(df.iat[row, col])
        value = norm(raw)
        lines.append(f"    {key}: {json.dumps(value, ensure_ascii=False)},")
    lines.append("")

out = Path(__file__).with_name("_full_report_blocks.txt")
out.write_text("\n".join(lines), encoding="utf-8")
print(out)
