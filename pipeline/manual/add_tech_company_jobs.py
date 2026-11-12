"""One-off manual registry addition: jobs found across a large technology company.

The automated pipeline (expand -> resolve -> enrich) was not run for these. Each
node was written by hand from public sources that were opened and read on
2026-11-11, and is stamped with its own provenance (`claude-fable-5-2`,
`v2-manual-1`) and `needs_review: true` so a human moderator can find and check
them. Role descriptions come mainly from O*NET OnLine, the US Department of
Labor's occupation database, so they describe the occupation as profiled in the
United States; Indian degree durations come from the UGC specification of
degrees. Nothing here states pay, demand or hiring figures.

Run from the repository root:

    python3 pipeline/manual/add_tech_company_jobs.py
    python3 pipeline/export_frontend.py
    python3 pipeline/lint.py --release

Re-running is safe: nodes and edges are upserted by id.
"""
import json
import re
import sys
from pathlib import Path

PIPELINE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE))

from lib import Edge, Node  # noqa: E402

NODES_PATH = PIPELINE / "registry" / "nodes.jsonl"
EDGES_PATH = PIPELINE / "registry" / "edges.jsonl"

TODAY = "2026-11-11"
MODEL = "claude-fable-5-2"
PROMPT = "v2-manual-1"

ONET = "https://www.onetonline.org/link/summary/"
UGC = "https://www.ugc.gov.in/e-book/UGC_Regulation/files/basic-html/page1095.html"
SRE_BOOK = "https://sre.google/sre-book/introduction/"
ASQ_CRE = "https://www.asq.org/cert/reliability-engineer"
DPDP = "https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf"

JOB_ZONE = {
    4: "O*NET places this occupation in Job Zone Four (considerable preparation needed): most of these occupations require a four-year bachelor's degree, but some do not.",
    3: "O*NET places this occupation in Job Zone Three (medium preparation needed): most occupations in this zone require training in vocational schools, related on-the-job experience, or an associate's degree.",
    5: "O*NET places this occupation in Job Zone Five (extensive preparation needed): most of these occupations require graduate school.",
    2: "O*NET places this occupation in Job Zone 1-2 (very little to some preparation needed): it usually requires a high school diploma or GED, though some occupations may not.",
}
US_NOTE = "O*NET is the US Department of Labor's occupation database, so this describes the job as it is profiled in the United States; titles and duties in Indian companies can differ."
UGC_ENGINEERING = "In India, the UGC specification of degrees lists B.Tech and B.E. as four-year bachelor's degrees entered after 10+2."

# Existing registry ids used as route endpoints.
BTECH = "degree:b-tech"
CSE = "degree:b-tech-in-computer-science-and-engineering"
MECH = "degree:b-tech-in-mechanical-engineering"
ELEC = "degree:b-tech-in-electrical-engineering"
ECE = "degree:b-tech-in-electronics-and-communication-engineering"
CIVIL = "degree:b-tech-in-civil-engineering"
MTECH_CS = "degree:m-tech-in-computer-science"
MTECH_ECE = "degree:m-tech-in-electronics-and-communication-engineering"
PHD_CS = "degree:ph-d-in-computer-science"
BCA = "degree:bca"
MCA = "degree:mca-master-of-computer-applications"
MBA = "degree:mba"
EMBA = "degree:executive-mba"
PGDM = "diploma:pgdm-post-graduate-diploma-in-management"
BBA = "degree:bba"
BCOM = "degree:b-com"
BCOM_HONS = "degree:b-com-hons"
BSC = "degree:b-sc"
BA = "degree:ba"
MSC_ECON = "degree:m-sc-in-economics"
LLB = "degree:llb"
BA_LLB = "degree:b-a-ll-b-hons"
POLY = "diploma:polytechnic"
ITI = "training:iti"
CCA = "certification:certificate-in-computer-applications"
STORES = "certification:certificate-in-stores-and-inventory-management"


def slugify(text: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "-", text.lower())
    return re.sub(r"(^-|-$)+", "", text)


def J(slug: str) -> str:
    return f"job_role:{slug}"


# (from, to, edge_type, is_common_route)
P, L = "progression", "lateral"

JOBS = [
    # ---- Legal ---------------------------------------------------------------
    dict(
        title="Paralegal",
        aliases=["Legal Analyst", "Legal Assistant"],
        description="Supports a company's lawyers by researching the law, checking facts and preparing and organising legal documents.",
        onet="23-2011.00", onet_title="Paralegals and Legal Assistants", zone=3,
        what="Paralegals and legal assistants help lawyers by investigating facts, preparing legal documents and researching legal precedent.",
        titles="Legal Analyst, Legal Assistant, Law Associate, Litigation Paralegal and Paralegal",
        tasks=[
            "Prepare and review legal documents such as contracts, correspondence and affidavits.",
            "Research statutes, decisions and other legal sources and summarise what they say.",
            "Investigate the facts of a matter using public records and other sources.",
            "Organise and maintain case and contract files so lawyers can find what they need.",
        ],
        routes=[(LLB, P, True), (BA_LLB, P, True), (BA, P, False)],
        onward=[(J("corporate-counsel"), P, False), (J("compliance-executive"), L, True)],
    ),
    dict(
        title="Data Protection Officer",
        aliases=["DPO", "Privacy Officer"],
        description="The named person in a company who represents it on personal-data matters and is the point of contact when people raise privacy grievances.",
        custom="dpo",
        routes=[(J("compliance-executive"), P, True), (J("corporate-counsel"), P, False)],
        onward=[(J("general-counsel"), L, False)],
    ),
    # ---- Supply chain --------------------------------------------------------
    dict(
        title="Supply Chain Analyst",
        aliases=["Logistics Analyst", "Material Supply Planner"],
        description="Studies how products and parts move from suppliers to customers and recommends changes that make delivery faster, cheaper or more reliable.",
        onet="13-1081.02", onet_title="Logistics Analysts", zone=4,
        what="Logistics analysts analyse product delivery or supply chain processes to identify or recommend changes, and may manage route activity such as invoicing and shipment tracing.",
        titles="Supply Chain Analyst, Logistics Analyst, Material Supply Planner and Transportation Analyst",
        tasks=[
            "Track the flow of products from origin to final delivery.",
            "Keep logistics databases accurate and up to date.",
            "Interpret data on availability, reliability and other supply chain measures.",
            "Recommend improvements to existing or planned logistics processes.",
        ],
        routes=[(BBA, P, True), (BCOM, P, True), (BTECH, P, True), (MBA, P, True)],
        onward=[(J("supply-chain-manager"), P, True), (J("logistics-manager"), P, True),
                (J("procurement-specialist"), L, True), (J("business-analyst"), L, True)],
    ),
    dict(
        title="Procurement Specialist",
        aliases=["Buyer", "Purchasing Agent"],
        description="Buys the parts, equipment, materials and services a company needs, comparing suppliers and negotiating price and terms.",
        onet="13-1023.00", onet_title="Purchasing Agents, Except Wholesale, Retail, and Farm Products", zone=4,
        what="Purchasing agents buy the machinery, equipment, tools, parts, supplies or services an establishment needs to operate, including raw or semi-finished materials for manufacturing, and may negotiate contracts.",
        titles="Buyer, Procurement Specialist, Purchasing Agent and Contract Administrator",
        tasks=[
            "Prepare purchase orders, invite bids and review requests for goods and services.",
            "Analyse price proposals and other data to work out a reasonable price.",
            "Write and review product specifications, keeping a working technical knowledge of what is being bought.",
            "Follow the laws and regulations that apply to purchasing.",
        ],
        routes=[(BBA, P, True), (BCOM, P, True), (BTECH, P, True), (STORES, P, False)],
        onward=[(J("procurement-manager"), P, True), (J("supply-chain-analyst"), L, True)],
    ),
    dict(
        title="Procurement Manager",
        aliases=["Purchasing Manager", "Commodity Manager"],
        description="Leads a company's buying team, sets purchasing policy and decides which suppliers the company relies on.",
        onet="11-3061.00", onet_title="Purchasing Managers", zone=4,
        what="Purchasing managers plan, direct or coordinate the work of buyers, purchasing officers and related workers; the occupation includes procurement managers.",
        titles="Procurement Manager, Purchasing Manager, Commodity Manager and Materials Manager",
        tasks=[
            "Develop and apply purchasing and contract-management policies and procedures.",
            "Find vendors and interview them about product availability and terms of sale.",
            "Review, evaluate and approve specifications for issuing and awarding bids.",
            "Check purchase-order claims and contracts against company policy.",
        ],
        routes=[(MBA, P, True), (PGDM, P, True)],
        onward=[(J("supply-chain-manager"), P, True), (EMBA, L, True)],
    ),
    dict(
        title="Logistics Manager",
        aliases=["Distribution Manager", "Logistics Operations Manager"],
        description="Runs the warehousing, transport and distribution that get a company's products to where they are needed.",
        onet="11-3071.00", onet_title="Transportation, Storage, and Distribution Managers", zone=None,
        what="Transportation, storage and distribution managers plan, direct or coordinate transportation, storage or distribution activities; the occupation includes logistics managers.",
        titles="Logistics Operations Manager, Distribution Manager, Distribution Center Manager and Supply Chain Logistics Manager",
        tasks=[
            "Supervise the people who receive, store, test and ship products or materials.",
            "Plan and run warehouse safety and security programmes.",
            "Work with other departments to connect logistics with business systems or processes, such as customer sales.",
            "Analyse the company's logistics to find the most cost-effective way to move goods.",
        ],
        routes=[(MBA, P, True), (PGDM, P, True)],
        onward=[(J("supply-chain-manager"), P, True), (EMBA, L, True)],
    ),
    dict(
        title="Supply Chain Manager",
        aliases=["Supply Chain Director", "Material Requirements Planning Manager"],
        description="Directs the whole chain of purchasing, production planning, warehousing and distribution so products reach customers on time and at the right cost.",
        onet="11-3071.04", onet_title="Supply Chain Managers", zone=4,
        what="Supply chain managers direct or coordinate production, purchasing, warehousing, distribution or financial forecasting, look for ways to streamline activities, and direct the movement, storage or processing of inventory.",
        titles="Supply Chain Manager, Supply Chain Director, Global Supply Chain Director and Material Requirements Planning Manager",
        tasks=[
            "Manage purchasing, material requirements planning and inventory control.",
            "Define the measures used to compare and evaluate supply chain performance.",
            "Put new or improved supply chain processes in place.",
            "Coordinate supply chain management with other functions such as sales and marketing.",
        ],
        routes=[(MBA, P, False)],
        onward=[(EMBA, L, True)],
    ),
    # ---- Hardware design -----------------------------------------------------
    dict(
        title="Hardware Design Engineer",
        aliases=["Computer Hardware Engineer", "Hardware Engineer"],
        description="Designs, builds and tests the physical parts of computers and devices, such as processors, circuit boards and peripherals.",
        onet="17-2061.00", onet_title="Computer Hardware Engineers", zone=4,
        what="Computer hardware engineers research, design, develop or test computer or computer-related equipment, and may supervise its manufacturing and installation.",
        titles="Hardware Design Engineer, Hardware Engineer, Physical Design Engineer and Design Engineer",
        tasks=[
            "Design and develop computer hardware and supporting peripherals, including central processing units.",
            "Build, test and modify product prototypes using working or simulated models.",
            "Write functional specifications that document the hardware development process.",
            "Test and verify that hardware meets its specifications and requirements.",
        ],
        engineering=True,
        routes=[(ECE, P, True), (ELEC, P, True), (MTECH_ECE, P, True)],
        onward=[(J("senior-engineer"), P, True), (J("chip-design-engineer"), L, True), (MTECH_ECE, L, True)],
    ),
    dict(
        title="Chip Design Engineer",
        aliases=["Integrated Circuit Design Engineer", "IC Design Engineer", "VLSI Design Engineer"],
        description="Designs the electronic circuits and integrated circuits (chips) that go inside phones, computers and other devices.",
        onet="17-2072.00", onet_title="Electronics Engineers, Except Computer", zone=4,
        what="Electronics engineers research, design, develop or test electronic components and systems, and design electronic circuits and components for fields such as telecommunications.",
        titles="Integrated Circuit Design Engineer (IC Design Engineer), Electronics Design Engineer, Radio Frequency Engineer and Product Engineer",
        tasks=[
            "Design electronic components, products or systems for commercial, industrial or scientific use.",
            "Use computer-assisted engineering and design software to do electronics engineering work.",
            "Evaluate project work for effectiveness, technical adequacy and compatibility.",
            "Discuss existing or planned electronics projects with engineers, customers and vendors.",
        ],
        engineering=True,
        routes=[(ECE, P, True), (MTECH_ECE, P, True)],
        onward=[(J("senior-engineer"), P, True), (J("hardware-design-engineer"), L, True)],
    ),
    # ---- Reliability ---------------------------------------------------------
    dict(
        title="Site Reliability Engineer",
        aliases=["SRE"],
        description="A software engineer who keeps large online services fast and available, by writing software that does the operations work instead of doing it by hand.",
        custom="sre",
        routes=[(CSE, P, True), (J("software-developer"), L, True), (J("systems-administrator"), P, False)],
        onward=[(J("senior-software-engineer"), P, True), (J("software-developer"), L, True)],
    ),
    dict(
        title="Reliability Engineer",
        aliases=["Certified Reliability Engineer", "Product Reliability Engineer"],
        description="Works out how and when a product or system could fail, and changes the design, testing or process so it lasts and stays safe.",
        custom="reliability",
        routes=[(MECH, P, True), (ELEC, P, True), (ECE, P, True),
                (J("graduate-engineer-trainee"), P, True), (J("quality-engineer"), L, True)],
        onward=[(J("senior-engineer"), P, True), (J("quality-manager"), P, False)],
    ),
    dict(
        title="Systems Administrator",
        aliases=["Network Administrator", "Network Engineer"],
        description="Sets up and looks after a company's servers, networks and operating systems, and fixes them when something goes wrong.",
        onet="15-1244.00", onet_title="Network and Computer Systems Administrators", zone=3,
        what="Network and computer systems administrators install, configure and maintain an organisation's local and wide area networks, operating systems and servers; they monitor system health, control user access and keep software up to date.",
        titles="Network Administrator, Network Engineer, Network Analyst and LAN Administrator",
        tasks=[
            "Plan and put in place network security measures that protect data, software and hardware.",
            "Take data backups and carry out disaster recovery.",
            "Diagnose and fix hardware, software and other network and system problems.",
            "Talk to network users about solutions to system problems.",
        ],
        routes=[(BCA, P, True), (CSE, P, False), (BSC, P, False), (CCA, P, False), (POLY, P, False),
                (J("it-support-specialist"), P, True)],
        onward=[(J("solutions-architect"), P, False), (J("information-security-analyst"), L, True)],
    ),
    # ---- Manufacturing -------------------------------------------------------
    dict(
        title="Manufacturing Engineer",
        aliases=["Process Engineer", "Process Improvement Engineer"],
        description="Designs and improves the way a product is made in the factory, so it can be built at quality, in volume and at lower cost.",
        onet="17-2112.03", onet_title="Manufacturing Engineers", zone=4,
        what="Manufacturing engineers design, integrate or improve manufacturing systems or related processes, and may work with industrial designers to make product designs easier and cheaper to produce.",
        titles="Manufacturing Engineer, Process Engineer, Process Improvement Engineer and Plant Engineer",
        tasks=[
            "Troubleshoot product problems that involve designs, materials or processes.",
            "Investigate and resolve operational problems such as bottlenecks.",
            "Find and make changes that improve manufacturing processes or products, or reduce cost.",
            "Apply continuous-improvement methods such as lean manufacturing.",
        ],
        engineering=True,
        routes=[(MECH, P, True), (BTECH, P, True), (POLY, P, False), (J("graduate-engineer-trainee"), P, True)],
        onward=[(J("production-manager"), P, True), (J("senior-engineer"), P, True),
                (J("industrial-engineer"), L, True), (J("quality-engineer"), L, True)],
    ),
    dict(
        title="Industrial Engineer",
        aliases=["Continuous Improvement Engineer", "Operations Engineer"],
        description="Designs the overall system of people, machines, materials and information that turns parts into finished products efficiently.",
        onet="17-2112.00", onet_title="Industrial Engineers", zone=4,
        what="Industrial engineers design, develop, test and evaluate integrated systems for managing industrial production processes, including quality control, inventory, logistics and material flow, and cost analysis.",
        titles="Industrial Engineer, Continuous Improvement Engineer, Operations Engineer and Process Engineer",
        tasks=[
            "Estimate production costs and the effect of product design changes on spending.",
            "Plan the sequence of operations used to make and assemble parts or products.",
            "Analyse statistical data and specifications to set quality and reliability objectives.",
            "Work with management and users to develop production and design standards.",
        ],
        engineering=True,
        routes=[(MECH, P, True), (BTECH, P, True)],
        onward=[(J("production-manager"), P, False), (J("supply-chain-analyst"), L, True)],
    ),
    dict(
        title="Validation Engineer",
        aliases=["Product Quality Engineer", "Supplier Quality Engineer", "Validation Specialist"],
        description="Plans and runs the tests that prove a product, machine or process really meets its quality and safety requirements before it ships.",
        onet="17-2112.02", onet_title="Validation Engineers", zone=4,
        what="Validation engineers design or plan protocols for equipment or processes so that products meet internal and external purity, safety and quality requirements.",
        titles="Validation Specialist, Product Quality Engineer, Supplier Quality Engineer and Quality Assurance Engineer",
        tasks=[
            "Study product characteristics and customer requirements to set validation objectives and standards.",
            "Write validation plans, process flow diagrams, test cases and standard operating procedures.",
            "Run validation or qualification tests on new or existing processes, equipment or software.",
            "Analyse test data to decide whether the criteria were met, or to find root causes.",
        ],
        engineering=True,
        routes=[(MECH, P, True), (ECE, P, True), (BTECH, P, False)],
        onward=[(J("quality-manager"), P, True), (J("quality-engineer"), L, True),
                (J("reliability-engineer"), L, True)],
    ),
    dict(
        title="Production Manager",
        aliases=["Manufacturing Manager", "Plant Manager"],
        description="Runs a factory or production line day to day, making sure products are made on schedule, to quality and within cost.",
        onet="11-3051.00", onet_title="Industrial Production Managers", zone=None,
        what="Industrial production managers plan, direct or coordinate the work and resources needed to manufacture products within cost, quality and quantity specifications.",
        titles="Manufacturing Manager, Plant Manager, General Production Manager and Production Control Manager",
        tasks=[
            "Set and monitor product standards, directing testing during processing.",
            "Review production schedules and orders to make decisions about inventory requirements.",
            "Work with technical and administrative staff to resolve production problems.",
            "Develop production tracking and quality control systems.",
        ],
        routes=[(J("production-engineer"), P, True), (MBA, P, False)],
        onward=[(EMBA, L, True)],
    ),
    dict(
        title="Quality Manager",
        aliases=["Quality Assurance Manager", "Quality Control Manager"],
        description="Leads a company's quality programme, deciding the standards products must meet and stopping production when they are not met.",
        onet="11-3051.01", onet_title="Quality Control Systems Managers", zone=4,
        what="Quality control systems managers plan, direct or coordinate quality assurance programmes, and set quality control policies for laboratory and production work.",
        titles="Quality Assurance Manager (QA Manager), Quality Control Manager (QC Manager), Quality Director and Quality and Process Improvement Manager",
        tasks=[
            "Stop production if serious product defects are present.",
            "Review and update standard operating procedures and quality manuals.",
            "Monitor how well the quality control systems are working.",
            "Analyse quality test results and explain them to production staff.",
        ],
        routes=[(J("quality-engineer"), P, True)],
        onward=[(EMBA, L, True)],
    ),
    dict(
        title="Semiconductor Process Technician",
        aliases=["Semiconductor Processing Technician", "Process Technician", "Manufacturing Technician"],
        description="Operates and looks after the equipment that turns silicon wafers into chips inside a semiconductor factory.",
        onet="51-9141.00", onet_title="Semiconductor Processing Technicians", zone=2,
        what="Semiconductor processing technicians carry out steps in the manufacture of electronic semiconductors, such as cleaning and polishing wafers and loading them into furnaces, chemical baths and circuit-forming equipment.",
        titles="Process Technician, Manufacturing Technician, Semiconductor Laboratory Technician and Diffusion Operator",
        tasks=[
            "Inspect materials and components for surface defects and measure circuitry with electronic test equipment.",
            "Study work orders and processing charts to find the specifications and sequence of operations.",
            "Clean semiconductor wafers using chemical baths or automatic wafer cleaners.",
            "Keep processing, production and inspection records.",
        ],
        routes=[(POLY, P, True), (ITI, P, True), (BSC, P, False)],
        onward=[(J("industrial-technician"), L, True)],
    ),
    dict(
        title="Health and Safety Engineer",
        aliases=["Safety Engineer", "Product Safety Engineer", "EHS Engineer"],
        description="Makes workplaces and products safer by finding hazards, investigating accidents and designing ways to prevent them.",
        onet="17-2111.00", onet_title="Health and Safety Engineers, Except Mining Safety Engineers and Inspectors", zone=None,
        what="Health and safety engineers promote worksite or product safety by applying knowledge of industrial processes, mechanics and chemistry; the occupation includes industrial product safety engineers.",
        titles="Safety Engineer, Product Safety Engineer, Industrial Safety Engineer and Health and Safety Specialist",
        tasks=[
            "Investigate industrial accidents, injuries or occupational diseases to find causes and preventive measures.",
            "Evaluate product designs for safety.",
            "Run or coordinate worker training on safety laws, regulations and hazard monitoring.",
            "Recommend procedures to detect, prevent and remove physical, chemical or other product hazards.",
        ],
        engineering=True,
        routes=[(MECH, P, True), (BTECH, P, True), (CIVIL, P, False)],
        onward=[(J("production-manager"), P, False)],
    ),
    # ---- Software, data and infrastructure ------------------------------------
    dict(
        title="Data Engineer",
        aliases=["Data Warehousing Specialist", "Data Warehouse Analyst"],
        description="Builds and maintains the pipelines and data warehouses that collect a company's data and make it usable for analysts and data scientists.",
        onet="15-1243.01", onet_title="Data Warehousing Specialists", zone=4,
        what="This guide uses O*NET's Data Warehousing Specialists profile, the closest O*NET occupation: they design, model or implement corporate data warehousing, program and configure warehouses of database information, and support the people who use them.",
        titles="Data Warehouse Analyst and Data Warehouse Solution Architect",
        tasks=[
            "Develop the processes that source, load, transform and extract data.",
            "Map data between source systems, data warehouses and data marts.",
            "Design and build warehouse database structures.",
            "Verify the structure, accuracy and quality of warehouse data.",
        ],
        engineering=True,
        routes=[(CSE, P, True), (MCA, P, True), (BCA, P, False), (J("software-developer"), L, True)],
        onward=[(J("senior-software-engineer"), P, True), (J("solutions-architect"), P, False),
                (J("data-scientist"), L, True)],
    ),
    dict(
        title="Business Intelligence Analyst",
        aliases=["BI Analyst", "Data Analyst", "Market Intelligence Analyst"],
        description="Turns a company's data into reports and dashboards that show managers what is happening and where the trends are.",
        onet="15-2051.01", onet_title="Business Intelligence Analysts", zone=4,
        what="Business intelligence analysts produce financial and market intelligence by querying data repositories and generating periodic reports, and devise methods for finding patterns and trends in the available information.",
        titles="Business Intelligence Analyst (BI Analyst), Business Analyst, Competitive Intelligence Analyst and Market Intelligence Analyst",
        tasks=[
            "Produce standard or custom reports that summarise business, financial or economic data.",
            "Maintain and update business intelligence tools, databases and dashboards.",
            "Identify and analyse industry or geographic trends that matter for business strategy.",
            "Write the specifications for reports, dashboards and other outputs.",
        ],
        routes=[(BCA, P, True), (BSC, P, True), (MBA, P, True), (BBA, P, False), (BCOM, P, False), (CSE, P, False)],
        onward=[(J("data-scientist"), L, True), (J("business-analyst"), L, True), (J("data-engineer"), L, False)],
    ),
    dict(
        title="Computer Research Scientist",
        aliases=["Computer Scientist", "Research Scientist (Computing)"],
        description="Does original research in computer science, inventing new methods and technologies rather than building one particular product.",
        onet="15-1221.00", onet_title="Computer and Information Research Scientists", zone=5,
        what="Computer and information research scientists conduct research into fundamental computer and information science as theorists, designers or inventors, and develop solutions to problems in computer hardware and software.",
        titles="Computer Scientist, Research Scientist, Computer Specialist and Scientific Programmer Analyst",
        tasks=[
            "Analyse problems and develop solutions that involve computer hardware and software.",
            "Apply theoretical expertise and innovation to create or apply new technology.",
            "Carry out logical analyses of business, scientific, engineering and other technical problems.",
            "Meet managers, vendors and others to get cooperation and resolve problems.",
        ],
        routes=[(PHD_CS, P, True), (MTECH_CS, P, True)],
        onward=[(J("research-scientist-in-private-sector-r-d"), L, True), (J("data-scientist"), L, True)],
    ),
    dict(
        title="Software QA Engineer",
        aliases=["Software Test Engineer", "Quality Assurance Analyst", "Automation Tester"],
        description="Tests software to find problems before users do, and writes the test plans and automated checks that keep a product working.",
        onet="15-1253.00", onet_title="Software Quality Assurance Analysts and Testers", zone=4,
        what="Software quality assurance analysts and testers develop and run software tests to find problems and their causes, document defects in a bug tracking system and report them to developers.",
        titles="Quality Assurance Engineer (QA Engineer), Software Quality Engineer, Automation Tester and Software Test Engineer",
        tasks=[
            "Design test plans, scenarios, scripts and procedures.",
            "Identify, analyse and document problems with how a program works or what it shows.",
            "Record software defects in a bug tracking system and report them to developers.",
            "Give developers feedback on software usability and functionality.",
        ],
        engineering=True,
        routes=[(CSE, P, True), (BCA, P, True), (MCA, P, True)],
        onward=[(J("senior-software-engineer"), P, False), (J("software-developer"), L, True)],
    ),
    dict(
        title="Information Security Analyst",
        aliases=["Security Analyst", "Information Security Specialist"],
        description="Watches over a company's networks and data, finds weaknesses and responds when there is a security breach.",
        onet="15-1212.00", onet_title="Information Security Analysts", zone=4,
        what="Information security analysts plan, implement, upgrade or monitor security measures that protect computer networks and information, assess systems for security risks, and may respond to security breaches and viruses.",
        titles="Security Analyst, Information Security Specialist, Information Security Officer and Network Security Analyst",
        tasks=[
            "Develop plans that safeguard computer files against accidental or unauthorised modification or destruction.",
            "Carry out risk assessments and test data processing systems.",
            "Encrypt data transmissions and set up firewalls to protect confidential information.",
            "Review violations of security procedures and discuss them with the people involved.",
        ],
        engineering=True,
        routes=[(CSE, P, True), (BCA, P, True), (MCA, P, False)],
        onward=[(J("security-engineer"), P, True), (J("data-protection-officer"), P, False)],
    ),
    dict(
        title="Security Engineer",
        aliases=["Information Security Engineer", "Infrastructure Security Engineer"],
        description="Builds and maintains the security systems that protect a company's networks and data, and tests them by trying to break in.",
        onet="15-1299.05", onet_title="Information Security Engineers", zone=4,
        what="Information security engineers develop and oversee information security procedures and policies, build and maintain security technology such as firewalls, and monitor and respond to breaches and intrusions.",
        titles="Security Engineer, Information Security System Engineer, Infrastructure Security Engineer and Information Security Auditor",
        tasks=[
            "Find weaknesses in security systems using penetration tests.",
            "Scan networks with vulnerability assessment tools.",
            "Coordinate monitoring of networks and systems for breaches or intrusions.",
            "Develop response and recovery strategies for security breaches.",
        ],
        engineering=True,
        routes=[(CSE, P, True), (MTECH_CS, P, True), (J("software-developer"), L, True)],
        onward=[(J("solutions-architect"), P, False), (J("senior-software-engineer"), P, False)],
    ),
    dict(
        title="Solutions Architect",
        aliases=["Systems Architect", "IT Architect", "Infrastructure Engineer"],
        description="Designs how the pieces of a large computer system fit together, choosing the components and making sure they work as one.",
        onet="15-1299.08", onet_title="Computer Systems Engineers/Architects", zone=3,
        what="Computer systems engineers and architects design and develop solutions to complex applications problems, system administration issues or network concerns, and perform systems management and integration.",
        titles="Solutions Architect, Systems Architect, IT Architect and Infrastructure Engineer",
        tasks=[
            "Talk to staff or clients to understand what a system must do.",
            "Investigate whether system components suit their purpose and recommend which to use.",
            "Direct the analysis, development and operation of complete computer systems.",
            "Monitor system operation to detect potential problems.",
        ],
        routes=[(J("senior-software-engineer"), P, True), (J("technical-lead"), L, True)],
        onward=[(J("principal-engineer"), P, False)],
    ),
    # ---- Programme, content and market ----------------------------------------
    dict(
        title="IT Program Manager",
        aliases=["Technical Program Manager", "IT Project Manager", "Scrum Master"],
        description="Plans and steers technology projects, keeping engineers, deadlines, budgets and business goals lined up.",
        onet="15-1299.09", onet_title="Information Technology Project Managers", zone=4,
        what="Information technology project managers plan, initiate and manage IT projects, lead and guide technical staff, act as the link between the business and technical sides, and monitor progress against deadlines, standards and cost targets.",
        titles="IT Program Manager, IT Project Manager, Cybersecurity Project Manager and Scrum Master",
        tasks=[
            "Manage project execution so that it stays within budget, schedule and scope.",
            "Track project milestones and deliverables.",
            "Work with project staff to identify and resolve problems.",
            "Initiate, review or approve changes to project plans.",
        ],
        routes=[(J("senior-software-engineer"), P, False), (MBA, P, False),
                (J("engineering-project-manager"), L, True)],
        onward=[(J("engineering-manager"), P, False)],
    ),
    dict(
        title="Technical Writer",
        aliases=["Engineering Writer", "Technical Report Writer"],
        description="Writes the manuals, guides and instructions that explain how a product works and how to use or maintain it.",
        onet="27-3042.00", onet_title="Technical Writers", zone=4,
        what="Technical writers write technical materials such as equipment manuals, appendices, or operating and maintenance instructions, and may help with layout.",
        titles="Engineering Writer, Global Technical Writer, Principal Technical Writer and Technical Report Writer",
        tasks=[
            "Organise material and write to set standards of order and clarity.",
            "Edit, standardise or revise material prepared by other writers or staff.",
            "Follow developments in a field to see when published material needs revising.",
            "Choose the photographs, drawings, diagrams and charts that illustrate the material.",
        ],
        routes=[(BA, P, True), (BSC, P, False), (BTECH, P, False), (J("content-writer"), L, True)],
        onward=[(J("senior-content-writer"), P, False), (J("instructional-designer"), L, True)],
    ),
    dict(
        title="Market Research Analyst",
        aliases=["Market Analyst", "Marketing Specialist"],
        description="Studies customers, competitors and markets to tell a company what people want and how a product is likely to sell.",
        onet="13-1161.00", onet_title="Market Research Analysts and Marketing Specialists", zone=4,
        what="Market research analysts research conditions in local, regional, national or online markets, and gather information to estimate the potential sales of a product or service or to plan a marketing campaign.",
        titles="Market Research Analyst, Market Analyst, Market Research Specialist and Business Development Specialist",
        tasks=[
            "Collect and analyse data on customer demographics, preferences, needs and buying habits.",
            "Gather data on competitors and analyse their prices, sales and marketing methods.",
            "Design and evaluate ways of collecting data, such as surveys and opinion polls.",
            "Prepare reports that show findings in charts and plain written text.",
        ],
        routes=[(BBA, P, True), (MBA, P, True), (BA, P, False), (MSC_ECON, P, False)],
        onward=[(J("marketing-manager"), P, True), (J("business-analyst"), L, True)],
    ),
    # ---- People, finance, sales and support -----------------------------------
    dict(
        title="Human Resources Specialist",
        aliases=["Corporate Recruiter", "Technical Recruiter", "HR Generalist"],
        description="Finds, interviews and hires people for a company, and helps employees with HR policies and paperwork.",
        onet="13-1071.00", onet_title="Human Resources Specialists", zone=4,
        what="Human resources specialists recruit, screen, interview or place individuals within an organisation.",
        titles="Corporate Recruiter, HR Generalist, HR Coordinator and Human Resources Specialist",
        tasks=[
            "Hire employees and process the paperwork that goes with hiring.",
            "Tell job applicants about duties, pay, benefits and schedules.",
            "Explain human resources policies, procedures, laws and regulations.",
            "Handle employee relations issues such as work complaints.",
        ],
        routes=[(BBA, P, True), (MBA, P, True), (BA, P, False), (BCOM, P, False)],
        onward=[(J("human-resources-manager"), P, True)],
    ),
    dict(
        title="Human Resources Manager",
        aliases=["HR Manager", "Employee Relations Manager"],
        description="Leads a company's HR team and advises managers on hiring, employee relations and people policies.",
        onet="11-3121.00", onet_title="Human Resources Managers", zone=4,
        what="Human resources managers plan, direct or coordinate the human resources activities and staff of an organisation.",
        titles="HR Manager, Employee Relations Manager, HR Operations Manager and HR Director",
        tasks=[
            "Act as the link between management and employees by handling questions and interpreting and administering contracts.",
            "Plan, direct and coordinate the work of HR staff.",
            "Advise managers on organisational policy matters.",
            "Represent the organisation at personnel-related hearings and investigations.",
        ],
        routes=[(MBA, P, True), (PGDM, P, True)],
        onward=[(EMBA, L, True)],
    ),
    dict(
        title="Financial Analyst",
        aliases=["Planning Analyst", "Finance Analyst"],
        description="Analyses a company's numbers, such as costs, revenue and investments, to help managers plan and decide where money should go.",
        onet="13-2051.00", onet_title="Financial and Investment Analysts", zone=4,
        what="Financial and investment analysts conduct quantitative analyses of information involving investment programmes or financial data.",
        titles="Financial Analyst, Planning Analyst, Investment Analyst and Equity Research Analyst",
        tasks=[
            "Analyse the financial or operational performance of companies to identify or recommend remedies.",
            "Advise on aspects of capitalisation, such as amounts, sources and timing.",
            "Work on projects with other professionals such as lawyers and accountants.",
            "Assess companies as investments.",
        ],
        routes=[(BCOM, P, True), (BCOM_HONS, P, True), (MBA, P, True), (BBA, P, False)],
        onward=[(J("investment-analyst"), L, True), (J("equity-research-analyst"), L, True)],
    ),
    dict(
        title="Sales Engineer",
        aliases=["Technical Sales Engineer", "Sales Applications Engineer", "Solutions Engineer"],
        description="An engineer on the sales team who explains a technical product to customers and shows how it would solve their problem.",
        onet="41-9031.00", onet_title="Sales Engineers", zone=4,
        what="Sales engineers sell business goods or services whose selling requires a technical background.",
        titles="Sales Engineer, Technical Sales Engineer, Sales Applications Engineer and Technical Marketing Engineer",
        tasks=[
            "Develop, present or respond to proposals for a customer's specific requirements.",
            "Work with sales teams to understand what the customer needs.",
            "Visit prospective buyers to show the product.",
            "Keep up with industry news, products, services and competitors.",
        ],
        engineering=True,
        routes=[(BTECH, P, True), (ECE, P, False), (CSE, P, False), (MBA, P, False)],
        onward=[(J("sales-manager"), P, True), (J("product-manager"), L, True)],
    ),
    dict(
        title="IT Support Specialist",
        aliases=["Technical Support Engineer", "Help Desk Analyst", "Desktop Support Technician"],
        description="Helps employees or customers when their computers and software do not work, by answering questions and fixing the problem.",
        onet="15-1232.00", onet_title="Computer User Support Specialists", zone=3,
        what="Computer user support specialists provide technical assistance to computer users, answering questions and resolving computer problems.",
        titles="IT Support Specialist, Help Desk Analyst, Desktop Support Technician and Computer Support Specialist",
        tasks=[
            "Answer users' questions about how software or hardware works.",
            "Read manuals, talk to users and run diagnostics to investigate and resolve problems.",
            "Set up equipment for employees, including cables, operating systems and software.",
            "Install and make minor repairs to hardware, software and peripherals.",
        ],
        routes=[(BCA, P, True), (CCA, P, True), (POLY, P, False), (BSC, P, False)],
        onward=[(J("systems-administrator"), P, True)],
    ),
]



def fact(label: str, value: str, *urls: str) -> dict:
    return {"label": label, "value": value, "source_urls": list(urls)}


def section(key: str, heading: str, paragraphs: list[str], bullets: list[str], *urls: str) -> dict:
    return {"key": key, "heading": heading, "paragraphs": paragraphs, "bullets": bullets,
            "source_urls": list(urls)}


def route_bullets(job: dict, titles: dict[str, str]) -> list[str]:
    # Every link into this job: its own routes plus other new jobs that lead to it.
    node_id = J(slugify(job["title"]))
    incoming = [(src, is_common) for src, _, is_common in job["routes"]]
    for other_job in JOBS:
        for dst, _, is_common in other_job["onward"]:
            if dst == node_id:
                incoming.append((J(slugify(other_job["title"])), is_common))
    seen: set[str] = set()
    incoming = [item for item in incoming if not (item[0] in seen or seen.add(item[0]))]
    common = [titles[src] for src, is_common in incoming if is_common]
    other = [titles[src] for src, is_common in incoming if not is_common]
    bullets = []
    if common:
        bullets.append("Common routes into this job on the Career Tree map: " + "; ".join(common) + ".")
    if other:
        bullets.append("Less common routes on the map: " + "; ".join(other) + ".")
    return bullets


def onet_facts(job: dict, titles: dict[str, str]) -> dict:
    url = ONET + job["onet"]
    name = job["onet_title"]
    lower = " ".join(word if word.isupper() else word.lower() for word in job["title"].split())
    quick = [
        fact("What the job is", job["what"], url),
        fact("Other names for it",
             f"Job titles O*NET reports for this occupation ({name}) include {job['titles']}.", url),
    ]
    entry_paragraphs = []
    entry_urls = [url]
    if job.get("zone"):
        quick.append(fact("Typical preparation", JOB_ZONE[job["zone"]], url))
        entry_paragraphs.append(JOB_ZONE[job["zone"]])
    if job.get("engineering"):
        entry_paragraphs.append(UGC_ENGINEERING)
        entry_urls.append(UGC)
        if not job.get("zone"):
            quick.append(fact("Engineering degree in India", UGC_ENGINEERING, UGC))
    if not entry_paragraphs:
        entry_paragraphs.append(
            f"O*NET profiles this job under {name}. The routes below are the ones the Career Tree map links to it."
        )
    entry_paragraphs.append(US_NOTE)
    sections = [
        section(
            "responsibilities",
            f"What an {lower} does" if lower[0].lower() in "aeiou" else f"What a {lower} does",
            [job["what"], f"The tasks below are taken from the O*NET profile for {name}. {US_NOTE}"],
            job["tasks"],
            url,
        ),
        section("entry_routes", "How people get into this job", entry_paragraphs,
                route_bullets(job, titles), *entry_urls),
    ]
    links = [{"label": f"O*NET OnLine: {name}", "url": url, "kind": "occupation_profile"}]
    return {"quick_facts": quick, "sections": sections, "useful_links": links}


def custom_facts(job: dict, titles: dict[str, str]) -> dict:
    kind = job["custom"]
    routes = route_bullets(job, titles)
    if kind == "dpo":
        return {
            "quick_facts": [
                fact("Where the role comes from",
                     "India's Digital Personal Data Protection Act, 2023 defines a Data Protection Officer as an individual appointed by a Significant Data Fiduciary under section 10 of the Act.",
                     DPDP),
                fact("Who must appoint one",
                     "Under section 10(2)(a) of the Act, a Significant Data Fiduciary shall appoint a Data Protection Officer.",
                     DPDP),
                fact("Based in India, answers to the board",
                     "The Act says the Data Protection Officer shall be based in India and be an individual responsible to the Board of Directors or similar governing body of the Significant Data Fiduciary.",
                     DPDP),
            ],
            "sections": [
                section(
                    "responsibilities", "What a data protection officer does",
                    ["The Digital Personal Data Protection Act, 2023 gives the Data Protection Officer of a Significant Data Fiduciary two named duties: to represent the Significant Data Fiduciary under the provisions of the Act, and to be the point of contact for its grievance redressal mechanism.",
                     "This guide covers only what the Act itself says about the role. Companies usually give the officer wider privacy work, which varies from company to company and is not described here."],
                    ["Represent the company (the Significant Data Fiduciary) under the Act.",
                     "Be the point of contact for the company's grievance redressal mechanism."],
                    DPDP,
                ),
                section(
                    "workplace", "Where the role sits",
                    ["The Act requires the Data Protection Officer to be based in India and to be responsible to the Board of Directors or a similar governing body of the Significant Data Fiduciary."],
                    routes,
                    DPDP,
                ),
            ],
            "useful_links": [{"label": "Digital Personal Data Protection Act, 2023 (MeitY)", "url": DPDP, "kind": "legislation"}],
        }
    if kind == "sre":
        return {
            "quick_facts": [
                fact("What the job is",
                     "Google, in its Site Reliability Engineering book, describes SRE as what happens when you ask a software engineer to design an operations team: its SRE teams hire software engineers to run products and to build systems that do work otherwise done, often manually, by system administrators.",
                     SRE_BOOK),
                fact("What an SRE team looks after",
                     "Google says an SRE team is responsible for the availability, latency, performance, efficiency, change management, monitoring, emergency response and capacity planning of its services.",
                     SRE_BOOK),
                fact("Half the time is engineering",
                     "Google places a 50% cap on the aggregate operations work (tickets, on-call and manual tasks) for all its SREs; the remaining time is meant for development.",
                     SRE_BOOK),
            ],
            "sections": [
                section(
                    "responsibilities", "What a site reliability engineer does",
                    ["Site reliability engineering began at Google. Its SRE book describes the job as running large services with a software engineer's approach: instead of doing operations work by hand, SREs write software and build systems that do it.",
                     "The description below is Google's own account of its SRE teams. Other companies use the same title for similar work, and the details differ between them."],
                    ["Keep services available and fast: availability, latency, performance and efficiency.",
                     "Manage change, since Google reports that roughly 70% of outages are due to changes in a live system.",
                     "Monitor services and respond to emergencies, including being on call.",
                     "Plan capacity so the service can keep up with demand."],
                    SRE_BOOK,
                ),
                section(
                    "entry_routes", "How people get into this job",
                    ["Google describes its SRE teams as 50–60% Google software engineers, with the rest being candidates very close to its software engineering qualifications who bring other skills, such as UNIX system internals and networking.",
                     UGC_ENGINEERING],
                    routes,
                    SRE_BOOK, UGC,
                ),
            ],
            "useful_links": [{"label": "Google SRE book: Introduction", "url": SRE_BOOK, "kind": "reference"}],
        }
    if kind == "reliability":
        onet = ONET + "17-2112.02"
        return {
            "quick_facts": [
                fact("What the job is",
                     "ASQ (the American Society for Quality) describes a Certified Reliability Engineer as a professional who specialises in improving the reliability, maintainability and safety of products, systems and processes.",
                     ASQ_CRE),
                fact("Related job titles",
                     "O*NET lists Reliability Engineer among the job titles reported for its Validation Engineers occupation, alongside Quality Engineer and Supplier Quality Engineer.",
                     onet),
                fact("Professional certification",
                     "ASQ's Certified Reliability Engineer certification asks for eight years of on-the-job experience in its Body of Knowledge areas, three of them in a decision-making position; a bachelor's degree waives four of those years and a master's or doctorate waives five.",
                     ASQ_CRE),
            ],
            "sections": [
                section(
                    "responsibilities", "What a reliability engineer does",
                    ["ASQ describes reliability engineers as focused on identifying potential failures, optimising performance, and ensuring compliance with quality and reliability standards.",
                     "ASQ is a US-based professional body; the description is of the profession in general rather than of any one company."],
                    ["Identify how a product, system or process could fail.",
                     "Improve reliability, maintainability and safety.",
                     "Optimise performance.",
                     "Check compliance with quality and reliability standards."],
                    ASQ_CRE,
                ),
                section(
                    "entry_routes", "How people get into this job",
                    [UGC_ENGINEERING,
                     "For engineers already working in the field, ASQ offers the Certified Reliability Engineer exam. The computer-delivered version is a one-part, 165-question, open-book exam (150 questions scored) with 4 hours and 18 minutes of exam time."],
                    routes,
                    UGC, ASQ_CRE,
                ),
            ],
            "useful_links": [
                {"label": "ASQ Certified Reliability Engineer (CRE)", "url": ASQ_CRE, "kind": "certification"},
                {"label": "O*NET OnLine: Validation Engineers", "url": onet, "kind": "occupation_profile"},
            ],
        }
    raise ValueError(kind)


def main() -> int:
    # Existing lines are kept byte-for-byte; only new records are serialised here.
    nodes, edges, raw = {}, {}, {}
    for path, records in ((NODES_PATH, nodes), (EDGES_PATH, edges)):
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                record = json.loads(line)
                records[record["id"]] = record
                raw[record["id"]] = line

    new_ids = {J(slugify(job["title"])) for job in JOBS}
    titles = {node_id: record["title"] for node_id, record in nodes.items()}
    for job in JOBS:
        titles[J(slugify(job["title"]))] = job["title"]

    prov = {"model": MODEL, "prompt_version": PROMPT, "generated_at": TODAY, "source_urls": []}
    added_nodes = added_edges = 0
    for job in JOBS:
        node_id = J(slugify(job["title"]))
        if node_id in nodes and nodes[node_id]["prov"].get("prompt_version") != PROMPT:
            raise SystemExit(f"{node_id} already exists in the registry; refusing to overwrite it")
        body = custom_facts(job, titles) if job.get("custom") else onet_facts(job, titles)
        record = {
            "id": node_id,
            "type": "job_role",
            "title": job["title"],
            "aliases": job["aliases"],
            "description": job["description"],
            "is_terminal": False,
            "needs_review": True,
            "facts": {
                "schema_version": 1,
                "last_reviewed": TODAY,
                **body,
                "prov": {"model": MODEL, "prompt_version": PROMPT, "generated_at": TODAY},
            },
            "prov": prov,
        }
        Node.model_validate(record)
        added_nodes += node_id not in nodes
        nodes[node_id] = Node.model_validate(record).model_dump(mode="json", exclude_none=True)
        raw.pop(node_id, None)

        links = [(src, node_id, kind, common) for src, kind, common in job["routes"]]
        links += [(node_id, dst, kind, common) for dst, kind, common in job["onward"]]
        for from_id, to_id, kind, common in links:
            for endpoint in (from_id, to_id):
                if endpoint not in nodes and endpoint not in new_ids:
                    raise SystemExit(f"{node_id}: unknown endpoint {endpoint}")
            edge_id = f"{from_id}->{to_id}"
            if edge_id in edges and edges[edge_id]["prov"].get("prompt_version") != PROMPT:
                continue  # never touch an edge the pipeline already owns
            record = {"id": edge_id, "from_id": from_id, "to_id": to_id, "edge_type": kind,
                      "is_common_route": common, "prov": prov}
            Edge.model_validate(record)
            added_edges += edge_id not in edges
            edges[edge_id] = Edge.model_validate(record).model_dump(mode="json", exclude_none=True)
            raw.pop(edge_id, None)

    # The existing Product Designer node already covers physical-product
    # (industrial) design, so it gains the alias instead of a duplicate node.
    designer = nodes["job_role:product-designer"]
    if "Industrial Designer" not in designer["aliases"]:
        designer["aliases"].append("Industrial Designer")
        raw.pop(designer["id"], None)

    def dump(records: dict) -> str:
        return "".join(
            (raw[key] if key in raw else json.dumps(records[key], ensure_ascii=False)) + "\n"
            for key in sorted(records)
        )

    NODES_PATH.write_text(dump(nodes), encoding="utf-8")
    EDGES_PATH.write_text(dump(edges), encoding="utf-8")
    print(f"added {added_nodes} nodes and {added_edges} edges "
          f"({len(nodes)} nodes, {len(edges)} edges in the registry)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
