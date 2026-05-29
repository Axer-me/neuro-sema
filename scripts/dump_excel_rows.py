from pathlib import Path

import pandas as pd

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
lines: list[str] = []
for r in range(df.shape[0]):
    label = "" if pd.isna(df.iat[r, 0]) else str(df.iat[r, 0]).strip()
    if not label:
        continue
    lines.append(f"\n=== row {r}: {label} ===")
    for i, inn in enumerate(ids):
        c = i + 2
        val = "" if pd.isna(df.iat[r, c]) else str(df.iat[r, c]).strip()
        lines.append(f"{inn}: {val[:200]}{'...' if len(val) > 200 else ''}")

out = Path(__file__).with_name("_excel_dump.txt")
out.write_text("\n".join(lines), encoding="utf-8")
print(out)
