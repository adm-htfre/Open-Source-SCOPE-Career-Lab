"""Build career-tree/data/v2/job-outlook.json: pay and selection odds for the mind map.

Pay figures are not researched afresh here. Each one is a figure that a node's
own guide already states and cites (see pay_candidates.json, made by
extract_pay_candidates.py); PAY below records which sentence was used and how
to read it. Rules applied while choosing (2026-11-13):

* Government posts on the central 7th Pay Commission matrix are given by pay
  level; the entry pay comes from the official matrix (CCS (Revised Pay)
  Rules, 2016), which is cited alongside the guide's own source.
* Other figures are kept only if they come from a government rule or notice,
  a public employer's notice, an employer's own published terms, the
  government's National Career Service (NCS) indicative ranges, or a named
  salary-survey site, and only if dated 2019 or later. Single job adverts on
  job boards (including NCS job listings) and undated figures are left out.
* Nothing is averaged, converted or estimated: ranges are shown as stated,
  per month or per year as the source says.

Selection odds (ODDS) come from official result notices and press releases
that were opened on 2026-11-13.

Run from the repository root:  python3 pipeline/manual/build_job_outlook.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CANDIDATES = Path(__file__).with_name("pay_candidates.json")
GRAPH = ROOT / "career-tree" / "data" / "v2" / "graph.core.json"
OUT = ROOT / "career-tree" / "data" / "v2" / "job-outlook.json"

RULES_2016 = "https://doe.gov.in/files/cenetral-pay_document/7thCPC_revisedpayrules25072016.pdf"
CPC_HIGHLIGHTS = "https://doe.gov.in/files/cenetral-pay_document/7thCPC_Highlight.pdf"

# Entry (first-cell) basic pay per level, CCS (Revised Pay) Rules, 2016, Schedule, Part A.
MATRIX = {
    "1": 18000, "2": 19900, "3": 21700, "4": 25500, "5": 29200, "6": 35400,
    "7": 44900, "8": 47600, "9": 53100, "10": 56100, "11": 67700, "12": 78800,
    "13": 118500, "13A": 131100, "14": 144200, "15": 182200, "16": 205400,
    "17": 225000, "18": 250000,
}

LEVEL_GROWTH = {
    "text": "Pay rises by a 3% increment each year, and a promotion moves you up to a higher pay level.",
    "sources": [CPC_HIGHLIGHTS, RULES_2016],
}

M, Y = "month", "year"


def L(level, hit, as_of):
    """Central 7th Pay Commission post at `level`, as stated in guide sentence `hit`."""
    return {"level": level, "hit": hit, "asOf": as_of}


def S(stages, hit, as_of, kind, growth=None):
    """Figures exactly as the guide sentence `hit` states them."""
    return {"stages": stages, "hit": hit, "asOf": as_of, "kind": kind, "growth": growth}


G = "government_service:"
J = "job_role:"

PAY = {
    # ---- Central government, 7th Pay Commission matrix ----------------------
    G + "accounts-clerk-cum-typist-in-indian-railways": L("2", 0, "2025"),
    G + "administrative-assistant-b-drdo": L("4", 0, "2024"),
    G + "assistant-commandant-in-central-industrial-security-force": L("10", 1, "2026"),
    G + "assistant-commandant-in-central-reserve-police-force": L("10", 1, "2026"),
    G + "assistant-commandant-in-indo-tibetan-border-police": L("10", 0, "2018"),
    G + "assistant-commandant-in-sashastra-seema-bal": L("10", 0, "2026"),
    G + "assistant-drugs-controller": L("11", 1, "2024"),
    G + "assistant-engineer-central-government": L("7", 0, "2026"),
    G + "assistant-executive-engineer-in-border-roads-engineering-service": L("10", 0, "2025"),
    G + "assistant-executive-engineer-in-central-water-engineering-service": L("10", 0, "2024"),
    G + "assistant-executive-engineer-in-indian-defence-service-of-engineers": L("10", 0, "2026"),
    G + "assistant-loco-pilot-indian-railways": L("2", 0, "2026"),
    G + "assistant-section-officer-in-central-secretariat-service-css": L("7", 1, "2026"),
    G + "assistant-sub-inspector-in-capfs": L("5", 1, "2022"),
    G + "auditor-in-comptroller-and-auditor-general-cag": L("5", 5, "2026"),
    G + "chief-commercial-cum-ticket-supervisor-in-indian-railways": L("6", 0, "2024"),
    G + "commercial-cum-ticket-clerk-in-indian-railways": L("3", 3, "2024"),
    G + "constable-general-duty-in-capfs": L("3", 0, "2026"),
    G + "data-entry-operator-deo": L("4", 1, "2025"),
    G + "data-entry-operator-grade-b": L("5", 0, "2024"),
    G + "dental-hygienist-in-indian-railways": L("6", 0, "2024"),
    G + "dialysis-technician-in-indian-railways": L("6", 0, "2025"),
    G + "ecg-technician-in-indian-railways": L("4", 0, "2025"),
    G + "engineer-officer-in-indian-naval-armament-service": L("10", 0, "2024"),
    G + "goods-train-manager-in-indian-railways": L("5", 1, "2024"),
    G + "government-physiotherapist": L("6", 1, "2024"),
    G + "government-radiographer": L("5", 1, "2024"),
    G + "health-and-malaria-inspector-grade-iii-in-indian-railways": L("6", 0, "2024"),
    G + "indian-administrative-service-ias-officer": L("10", 1, "2016"),
    G + "indian-foreign-service-ifs-officer": L("10", 0, "2020"),
    G + "indian-police-service-ips-officer": L("10", 1, "2016"),
    G + "indian-revenue-service-irs-officer": L("10", 2, "2026"),
    G + "inspector-of-income-tax-in-cbdt": L("7", 0, "2026"),
    G + "judge-advocate-general-jag-entry-scheme": L("10", 1, "2026"),
    G + "junior-account-assistant-cum-typist-in-indian-railways": L("5", 0, "2024"),
    G + "junior-clerk-cum-typist-in-indian-railways": L("2", 0, "2024"),
    G + "junior-engineer-central-government": L("6", 0, "2024"),
    G + "junior-engineer-indian-railways": L("6", 0, "2024"),
    G + "junior-statistical-officer-jso": L("6", 1, "2025"),
    G + "laboratory-assistant-grade-ii-in-indian-railways": L("3", 0, "2024"),
    G + "lieutenant-in-the-indian-army-judge-advocate-general-branch": L("10", 0, "2026"),
    G + "loco-pilot-goods-in-indian-railways": L("6", 3, "2026"),
    G + "lower-divisional-clerk-junior-secretariat-assistant-ldc-jsa": L("2", 0, "2025"),
    G + "multi-tasking-staff-central-government": L("1", 0, "2025"),
    G + "nursing-officer-government": L("7", 1, "2025"),
    G + "nursing-supervisor": L("8", 0, "2026"),
    G + "officer-in-indian-radio-regulatory-service": L("10", 0, "2024"),
    G + "officer-in-indian-telecommunication-service": L("10", 0, "2025"),
    G + "pharmacist-in-indian-railways": L("5", 0, "2024"),
    G + "postal-assistant-sorting-assistant-pa-sa": L("4", 1, "2025"),
    G + "primary-teacher-in-a-central-government-school": L("6", 0, "2022"),
    G + "scientist-engineer-sc-at-isro": L("10", 1, "2025"),
    G + "section-officer-in-central-government": L("8", 3, "2025"),
    G + "security-assistant-b-drdo": L("4", 1, "2016"),
    G + "senior-clerk-cum-typist-in-indian-railways": L("5", 0, "2024"),
    G + "senior-commercial-cum-ticket-clerk-in-indian-railways": L("5", 9, "2019"),
    G + "senior-secretariat-assistant": L("4", 1, "2026"),
    G + "senior-section-engineer-in-indian-railways": L("7", 7, "2021"),
    G + "senior-stenographer-in-government": L("6", 1, "2024"),
    G + "senior-technical-assistant-drdo": L("6", 0, "2026"),
    G + "senior-technician-indian-railways": L("6", 1, "2016"),
    G + "station-master-in-indian-railways": L("6", 0, "2024"),
    G + "stenographer-government": L("4", 0, "2019"),
    G + "store-assistant-b-drdo": L("4", 0, "2026"),
    G + "store-assistant-drdo": L("2", 3, "2022"),
    G + "sub-inspector-in-central-bureau-of-investigation-cbi": L("7", 2, "2025"),
    G + "tax-assistant-in-cbdt": L("4", 0, "2026"),
    G + "technical-officer-a-drdo": L("7", 0, "2024"),
    G + "technician-b-drdo": L("4", 1, "2024"),
    G + "technician-drdo": L("2", 0, "2026"),
    G + "technician-indian-railways": L("2", 1, "2025"),
    G + "trains-clerk-in-indian-railways": L("2", 0, "2025"),
    G + "upper-division-clerk-udc": L("4", 1, "2026"),
    G + "upper-primary-teacher-in-a-central-government-school": L("7", 0, "2025"),
    J + "medical-officer": L("10", 1, "2026"),
    J + "pharmacist": L("5", 1, "2025"),
    J + "public-health-nurse": L("8", 0, "2019"),
    J + "radiographer": L("5", 1, "2026"),
    J + "scientist-in-a-government-research-organisation-csir-drdo-etc": L("10", 3, "2026"),
    J + "senior-operation-theatre-technician": L("5", 2, "2026"),
    J + "senior-physiotherapist": L("10", 3, "2025"),
    J + "staff-nurse": L("7", 0, "2025"),
    J + "operation-theatre-supervisor": L("6", 1, "2023"),
    J + "operation-theatre-technician": L("4", 0, "2025"),
    J + "senior-radiographer": L("6", 1, "2022"),
    J + "junior-resident-doctor": L("10", 1, "2026"),
    # ---- State governments and other public pay scales (as stated) ----------
    G + "assistant-commissioner-in-state-labour-department": S([("Telangana, 2024", 54220, 133630, M)], 0, "2024", "rule"),
    G + "assistant-town-planner": S([("Kerala, 2024", 55200, 115300, M)], 2, "2024", "rule"),
    G + "ayurvedic-medical-officer": S([("Himachal Pradesh job trainee", 29500, 29500, M)], 0, "2026", "notice"),
    G + "civil-judge-junior-division-in-state-judicial-service": S([("Haryana", 77840, 77840, M)], 0, "2026", "rule"),
    G + "community-health-officer": S([("Uttar Pradesh, during training", 10000, 10000, M), ("after posting, incl. incentive", 20500, 35500, M)], 0, "2026", "notice"),
    G + "deputy-superintendent-of-police-in-state-police-service": S([("Tamil Nadu", 56100, 205700, M)], 0, "2022", "rule"),
    G + "fisheries-development-officer": S([("Jammu & Kashmir", 47600, 151100, M)], 0, "2021", "rule"),
    G + "fisheries-extension-officer": S([("Kerala", 50200, 105300, M)], 0, "2026", "rule"),
    G + "government-dental-surgeon": S([("Delhi Health Service", 56100, 177500, M)], 1, "2025", "rule"),
    G + "homoeopathic-medical-officer": S([("Odisha", 44900, 142400, M)], 0, "2023", "rule"),
    G + "judicial-magistrate-first-class-in-state-judicial-service": S([("Madhya Pradesh", 77840, 136520, M)], 2, "2023", "rule"),
    G + "junior-engineer-state-government": S([("Puducherry", 35400, 112400, M)], 1, "2025", "rule"),
    G + "legal-manager-in-a-psu": S([("BEL Assistant Manager (Legal)", 50000, 160000, M), ("Deputy Manager (Legal)", 60000, 180000, M)], 0, "2026", "notice",
                                     growth="The BEL notice states a 3% annual increment on these scales."),
    G + "legal-officer-in-a-psu": S([("POWERGRID, in training (CTC)", 1100000, 1100000, Y), ("after training (CTC)", 2250000, 2250000, Y)], 2, "2025", "notice"),
    G + "senior-legal-officer-in-a-psu": S([("GAIL / IndianOil", 60000, 180000, M)], 1, "2025", "notice"),
    G + "veterinary-officer-in-state-animal-husbandry-department": S([("Delhi", 56100, 177500, M)], 1, "2024", "rule"),
    G + "vocational-instructor-government-iti": S([("Ladakh", 25500, 81100, M)], 1, "2025", "rule"),
    G + "workshop-superintendent-government-iti": S([("Ladakh", 67700, 208700, M)], 2, "2025", "rule"),
    J + "architectural-assistant": S([("Arunachal Pradesh govt post", 35400, 112400, M)], 0, "2021", "rule"),
    J + "assistant-professor": S([("UGC Academic Level 10 (Delhi SCERT)", 57700, 182400, M)], 0, "2024", "rule"),
    J + "nursing-supervisor": S([("Ladakh govt post", 35900, 113200, M)], 2, "2025", "rule"),
    J + "nursing-tutor": S([("Kerala govt", 50200, 105300, M)], 2, "2024", "rule"),
    J + "urban-planner": S([("Ladakh Assistant Town Planner", 50700, 160600, M)], 0, "2024", "rule"),
    # ---- Public employers' notices ------------------------------------------
    J + "central-sterile-supply-department-technician": S([("Tata Memorial Centre", 18500, 18500, M)], 0, "2024", "notice"),
    J + "clinical-research-associate": S([("Tata Memorial Centre", 48000, 52000, M)], 1, "2026", "notice"),
    J + "community-development-officer": S([("Himachal Pradesh project, up to", 45599, 45599, M)], 1, "2026", "notice"),
    J + "database-administrator": S([("Ministry of Defence young professional", 60000, 60000, M)], 1, "2023", "notice"),
    J + "dental-surgeon": S([("Kerala NRHM", 41000, 41000, M)], 0, "2024", "notice"),
    J + "diploma-engineer-trainee-psu": S([("POWERGRID, basic pay in training", 24000, 24000, M), ("as Junior Engineer (CTC)", 1190000, 1190000, Y)], 3, "2024", "notice"),
    J + "junior-engineer-psu": S([("POWERGRID Junior Engineer (CTC)", 1190000, 1190000, Y)], 0, "2024", "notice"),
    J + "epidemiologist": S([("NCDC, up to 3 years' experience", 90000, 90000, M), ("3–10 years", 120000, 120000, M), ("10+ years", 150000, 150000, M)], 1, "2026", "notice"),
    J + "motion-graphics-designer": S([("C-DIT contract", 34190, 37800, M)], 0, "2025", "notice"),
    J + "policy-analyst": S([("NITI Aayog Young Professional", 70000, 70000, M), ("Consultant Grade 1", 80000, 145000, M), ("Consultant Grade 2", 145000, 265000, M)], 2, "2026", "notice"),
    J + "public-health-programme-manager": S([("National AYUSH Mission, Kerala", 40000, 40000, M)], 0, "2025", "notice"),
    J + "research-assistant": S([("ICMR / ICSSR projects", 31000, 37000, M)], 1, "2026", "notice"),
    J + "senior-lab-technician": S([("ICMR project post", 25000, 25000, M)], 1, "2025", "notice"),
    J + "systems-analyst": S([("NIELIT engagement", 26625, 33600, M)], 1, "2020", "notice"),
    # ---- Employers' own published terms ---------------------------------------
    J + "agniveer-indian-air-force": S([("Year 1", 30000, 30000, M), ("Year 4", 40000, 40000, M)], 3, "2026", "rule"),
    J + "agniveer-indian-army": S([("Year 1", 30000, 30000, M), ("Year 4", 40000, 40000, M)], 2, "2022", "rule"),
    J + "agniveer-indian-navy": S([("Year 1", 30000, 30000, M), ("Year 4", 40000, 40000, M)], 0, "2025", "rule"),
    J + "cost-accounting-trainee": S([("Year 1 stipend, by city", 15000, 20000, M), ("Year 2", 18000, 22000, M)], 0, "2025", "rule"),
    J + "graduate-engineer-trainee": S([("STEAG, during training", 25000, 25000, M), ("after training", 500000, 500000, Y)], 1, "2025", "employer"),
    # ---- National Career Service indicative ranges (government portal) --------
    J + "accountant": S([("New entrants", 8000, 12000, M), ("Experienced", 20000, 35000, M)], 0, "2023", "ncs"),
    J + "accounts-executive": S([("0–4 years' experience", 15000, 29000, M)], 1, "2023", "ncs"),
    J + "after-sales-service-manager": S([("New entrants (Area Service Manager)", 15000, 25000, M), ("Experienced", 25000, 60000, M)], 0, "2023", "ncs"),
    J + "service-operations-manager": S([("New entrants (Area Service Manager)", 15000, 25000, M), ("Experienced", 25000, 60000, M)], 2, "2023", "ncs"),
    J + "biomedical-engineer": S([("3–5 years' experience", 25000, 29000, M)], 0, "2023", "ncs"),
    J + "fashion-designer": S([("Experienced (Assistant Fashion Designer)", 20000, 27000, M)], 0, "2023", "ncs"),
    J + "front-office-executive": S([("Experienced (Receptionist, Hotel)", 12500, 25000, M)], 2, "2023", "ncs"),
    J + "lab-technician": S([("Experienced", 16000, 18000, M)], 1, "2023", "ncs"),
    J + "maintenance-supervisor": S([("Experienced", 50000, 65000, M)], 0, "2024", "ncs"),
    J + "marketing-manager": S([("Experienced (automotive)", 25000, 41000, M)], 0, "2023", "ncs"),
    J + "quality-control-analyst": S([("New entrants (QC Chemist)", 8500, 55000, M)], 2, "2023", "ncs"),
    J + "senior-industrial-technician": S([("Experienced (Maintenance Technician)", 12000, 18000, M)], 6, "2023", "ncs"),
    J + "travel-consultant": S([("Experienced (Travel Agent)", 14500, 32000, M)], 2, "2023", "ncs"),
    # ---- Salary-survey sites, as cited in the guides --------------------------
    J + "business-development-executive": S([("Indeed India average", 20306, 20306, M)], 0, "2026", "aggregator"),
    J + "data-scientist": S([("AmbitionBox, 1–8 years' experience", 400000, 2950000, Y)], 2, "2025", "aggregator"),
    J + "digital-marketing-manager": S([("Indeed India average base pay", 320210, 320210, Y)], 3, "2026", "aggregator"),
    J + "engineering-manager": S([("Indeed India average", 1136653, 1136653, Y)], 0, "2025", "aggregator"),
    J + "senior-engineer": S([("Indeed India average base pay", 1169014, 1169014, Y)], 1, "2026", "aggregator"),
    J + "seo-content-writer": S([("Jooble India average", 354505, 354505, Y)], 1, "2026", "aggregator"),
    J + "seo-manager": S([("AmbitionBox range", 300000, 1800000, Y)], 2, "2025", "aggregator"),
}

# Not in any guide; read from the notification itself on 2026-11-13.
EXTRA_PAY = {
    G + "probationary-officer-public-sector-bank": {
        "stages": [("Basic pay, IBPS PO/MT scale", 48480, 85920, M)],
        "asOf": "2026",
        "kind": "rule",
        "quote": "Basic: ₹ 48480-2000/7-62480-2340/2-67160-2680/7-85920 (IBPS CRP PO/MT-XVI notification).",
        "sources": ["https://www.ibps.in/wp-content/uploads/Detailed-Notification_CRP-PO-XVI_Final_V1_30.06.2026.pdf"],
        "growth": "The scale rises in fixed yearly steps from ₹48,480 to ₹85,920 basic pay; banks add allowances under their own rules.",
    },
}

KIND_LABEL = {
    "level": "Central government pay rules",
    "rule": "Government or official pay rules",
    "notice": "Public employer's notice",
    "employer": "Employer's published terms",
    "ncs": "National Career Service (govt) indicative range",
    "aggregator": "Salary-survey website estimate",
}

# ---- Selection odds --------------------------------------------------------
PIB_CSE = "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2123422&reg=48&lang=2"
PIB_RAIL_2020 = "https://www.pib.gov.in/PressReleasePage.aspx?PRID=1632290&reg=48&lang=2"
PIB_RAIL_2018 = "https://www.pib.gov.in/PressReleasePage.aspx?PRID=1530058&reg=3&lang=2"
ODDS = {
    "exam:upsc-cse": {
        "kind": "selection", "year": "2024", "applied": 992599, "selected": 1009,
        "text": "9,92,599 people applied for the 2024 Civil Services Examination; 1,009 were recommended for appointment.",
        "sources": [PIB_CSE],
    },
    "exam:rrb-ntpc": {
        "kind": "selection", "year": "2019 notice", "applied": 12630885, "selected": 35208,
        "text": "1,26,30,885 online applications were received for 35,208 NTPC vacancies (CEN 01/2019).",
        "sources": [PIB_RAIL_2020],
    },
    "exam:rrb-alp": {
        "kind": "selection", "year": "2018 notice", "applied": 4745176, "selected": 56378,
        "text": "47,45,176 online applications were received for 64,371 Assistant Loco Pilot and Technician vacancies; 56,378 candidates were empanelled.",
        "sources": [PIB_RAIL_2020],
    },
    "exam:rrb-group-d-level-1-exam": {
        "kind": "selection", "year": "2018 notice", "applied": 19000000, "selected": 62907,
        "text": "About 1.90 crore applications were received for 62,907 Level-1 (Group D) vacancies (CEN 02/2018).",
        "sources": [PIB_RAIL_2018],
    },
    "exam:ca-intermediate": {
        "kind": "pass", "year": "May 2026", "appeared": 33304, "passed": 2820,
        "text": "In May 2026, 2,820 of 33,304 candidates who sat both groups of CA Intermediate passed (8.47%).",
        "sources": ["https://www.icai.org/post/prc-ca-result-may2026-intermediate"],
    },
    "exam:ca-final": {
        "kind": "pass", "year": "May 2026", "appeared": 23776, "passed": 3345,
        "text": "In May 2026, 3,345 of 23,776 candidates who sat both groups of CA Final passed (14.07%).",
        "sources": ["https://www.icai.org/post/prc-caresult-may2026"],
    },
    "exam:ctet": {
        "kind": "pass", "year": "Feb 2026", "appeared": 2324625, "passed": 597061,
        "text": "In February 2026, 5,97,061 of 23,24,625 candidates who appeared qualified CTET (25.68%).",
        "sources": ["https://cdnbbsr.s3waas.gov.in/s3443dec3062d0286986e21dc0631734c9/uploads/2026/03/202603311458590440.pdf"],
    },
    "exam:cfa-program": {
        "kind": "pass", "year": "Aug 2026", "appeared": 28145, "passed": None, "rate": 0.43,
        "text": "43% of the 28,145 candidates who sat CFA Level I in August 2026 passed.",
        "sources": ["https://www.cfainstitute.org/sites/default/files/docs/programs/cfa-program/candidate-resources/cfa-exam-results-pass-rate-infographic.pdf"],
    },
    "exam:gate": {
        "kind": "pass", "year": "2026, CS paper", "appeared": 211020, "passed": 40661,
        "text": "In GATE 2026, 40,661 of 2,11,020 candidates who sat the Computer Science paper qualified (about 19%). Other papers differ.",
        "sources": ["https://gate2026.iitg.ac.in/doc/report/GATE%202026%20Statistical%20And%20Performance%20Report%20Web%20Version.pdf"],
    },
}


def rupees(value: int) -> str:
    """Indian digit grouping: 1234567 -> 12,34,567."""
    text = str(value)
    if len(text) <= 3:
        return text
    head, tail = text[:-3], text[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return ",".join(groups) + "," + tail


def amounts_in(text: str) -> set[int]:
    """Every rupee amount a sentence states, with lakh figures expanded."""
    found = {round(float(n.replace(",", ""))) for n in re.findall(r"\d[\d,]*(?:\.\d+)?", text)}
    for numbers in re.findall(r"((?:\d+(?:\.\d+)?\s*(?:–|-|to)\s*)?\d+(?:\.\d+)?)\s*lakh", text):
        found.update(round(float(n) * 100000) for n in re.findall(r"\d+(?:\.\d+)?", numbers))
    return found


def main() -> None:
    candidates = json.loads(CANDIDATES.read_text(encoding="utf-8"))
    nodes = {node["id"] for node in json.loads(GRAPH.read_text(encoding="utf-8"))["nodes"]}
    pay = {}
    for node_id, choice in PAY.items():
        assert node_id in nodes, node_id
        hit = candidates[node_id][choice["hit"]]
        record = {"asOf": choice["asOf"], "quote": hit["text"], "sources": hit["sources"]}
        if "level" in choice:
            level = choice["level"]
            assert level in hit["text"], (node_id, level, hit["text"])
            record.update(
                kind="level",
                level=level,
                stages=[{"who": f"Starting basic pay, Pay Level {level}", "min": MATRIX[level], "max": MATRIX[level], "per": "month"}],
                growth=LEVEL_GROWTH,
            )
            record["sources"] = list(dict.fromkeys(hit["sources"] + [RULES_2016]))
        else:
            stated = amounts_in(hit["text"])
            for _, low, high, _ in choice["stages"]:
                for amount in (low, high):
                    assert amount in stated, (node_id, amount, hit["text"])
            record.update(
                kind=choice["kind"],
                stages=[{"who": who, "min": low, "max": high, "per": per} for who, low, high, per in choice["stages"]],
            )
            if choice["growth"]:
                record["growth"] = {"text": choice["growth"], "sources": hit["sources"]}
        record["kindLabel"] = KIND_LABEL[record["kind"]]
        pay[node_id] = record
    for node_id, extra in EXTRA_PAY.items():
        assert node_id in nodes, node_id
        pay[node_id] = {
            "asOf": extra["asOf"],
            "quote": extra["quote"],
            "sources": extra["sources"],
            "kind": extra["kind"],
            "kindLabel": KIND_LABEL[extra["kind"]],
            "stages": [{"who": who, "min": low, "max": high, "per": per} for who, low, high, per in extra["stages"]],
            "growth": {"text": extra["growth"], "sources": extra["sources"]},
        }
    for exam_id in ODDS:
        assert exam_id in nodes, exam_id
    OUT.write_text(
        json.dumps({"generatedAt": "2026-11-13", "pay": pay, "odds": ODDS}, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    print(f"pay for {len(pay)} nodes, odds for {len(ODDS)} exams -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
