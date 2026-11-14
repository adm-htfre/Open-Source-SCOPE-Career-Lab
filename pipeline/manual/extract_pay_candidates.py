"""Pull every pay figure already cited in the job and government-service guides.

Writes pipeline/manual/pay_candidates.json: for each node, the sentences that
state a pay level or a rupee amount, with the source URLs of the fact or
section they sit in. A person (or Claude, reviewing) then picks the figure for
each node in pay_choices.json; nothing here is invented, only located.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FACTS = ROOT / "career-tree" / "data" / "v2" / "facts"
OUT = Path(__file__).with_name("pay_candidates.json")

PAYISH = re.compile(r"(Pay\s*(Matrix\s*)?Level|Level[\s-]*\d|₹|Rs\.?\s?\d|pay scale|stipend|salary|CTC|per month|per annum|lakh)", re.I)


def main() -> None:
    out = {}
    for path in sorted(FACTS.glob("*.json")):
        kind, slug = path.stem.split("--", 1)
        if kind not in ("job_role", "government_service"):
            continue
        facts = json.loads(path.read_text(encoding="utf-8"))
        items = [("quick_fact", q["label"], q["value"], q["source_urls"]) for q in facts["quick_facts"]]
        items += [
            ("section:" + s["key"], s["heading"], " ".join(s["paragraphs"] + s["bullets"]), s["source_urls"])
            for s in facts["sections"]
        ]
        hits = []
        for where, label, text, urls in items:
            for sentence in re.split(r"(?<=[.;])\s+(?=[A-Z₹(])", text):
                if PAYISH.search(sentence) and re.search(r"\d", sentence):
                    hits.append({"where": where, "label": label, "text": sentence.strip(), "sources": urls})
        out[f"{kind}:{slug}"] = hits
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{sum(1 for v in out.values() if v)} of {len(out)} nodes have pay sentences")


if __name__ == "__main__":
    main()
