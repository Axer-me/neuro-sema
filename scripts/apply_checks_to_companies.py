import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
companies_path = root / "src" / "mocks" / "companies.ts"
generated_path = Path(__file__).with_name("_generated_checks.txt")

text = companies_path.read_text(encoding="utf-8")
gen = generated_path.read_text(encoding="utf-8")

blocks: dict[str, str] = {}
current_inn: str | None = None
buf: list[str] = []
for line in gen.splitlines():
    if line.startswith("// "):
        if current_inn and buf:
            blocks[current_inn] = "\n".join(buf)
        current_inn = line[3:].strip()
        buf = []
    elif line.strip():
        buf.append("    " + line)
if current_inn and buf:
    blocks[current_inn] = "\n".join(buf)

pattern = re.compile(
    r"(inn: '(?P<inn>\d+)',\n(?:.*?\n)*?)"
    r"    offerChecks: \[\n.*?\n    \],\n"
    r"    riskChecks: \[\n.*?\n    \],",
    re.DOTALL,
)

def repl(match: re.Match[str]) -> str:
    inn = match.group("inn")
    if inn not in blocks:
        raise KeyError(f"No generated block for INN {inn}")
    prefix = match.group(1)
    return prefix + blocks[inn]

new_text, count = pattern.subn(repl, text)
if count != 9:
    raise RuntimeError(f"Expected 9 replacements, got {count}")

companies_path.write_text(new_text, encoding="utf-8")
print(f"Updated {count} companies in {companies_path}")
