import re
from pathlib import Path

import pandas as pd

EXCEL = r"D:\projects\обезличенные и маскированные данные по компаниям.xlsx"
COMPANIES = Path(r"D:\projects\neuro-sema\src\mocks\companies.ts")
df = pd.read_excel(EXCEL, sheet_name=0, header=None)
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
text = COMPANIES.read_text(encoding="utf-8")


def norm(v: str) -> str:
    if not v.strip():
        return "Нет информации"
    low = v.strip().lower()
    if low in ("нет информации", "нет инфо"):
        return "Нет информации"
    return v.strip()


ok_all = True
for i, inn in enumerate(ids):
    col = i + 2
    excel = norm("" if pd.isna(df.iat[13, col]) else str(df.iat[13, col]))
    chunk = re.search(rf"inn: '{inn}',[\s\S]*?riskChecks:", text)
    if not chunk:
        print(f"{inn}: chunk not found")
        ok_all = False
        continue
    c = chunk.group(0)
    offer_m = re.search(
        r'label: "Наличие лизинговых договоров", value: "((?:\\.|[^"\\])*)"',
        c,
    )
    full_m = re.search(r'leasingContracts: "((?:\\.|[^"\\])*)"', c)
    offer = offer_m.group(1).replace("\\n", "\n") if offer_m else "MISSING"
    full = full_m.group(1).replace("\\n", "\n") if full_m else "MISSING"
    match_excel = offer == excel
    match_each_other = offer == full
    if not (match_excel and match_each_other):
        ok_all = False
        print(f"FAIL {inn}")
        print(f"  excel: {excel!r}")
        print(f"  offer: {offer!r}")
        print(f"  full:  {full!r}")
    else:
        print(f"OK {inn}: {offer!r}")

print("ALL OK" if ok_all else "HAS MISMATCHES")
