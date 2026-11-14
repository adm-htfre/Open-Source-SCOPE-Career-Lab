# Open Source SCOPE - Career Lab

An interactive career mind map for SCOPE school (Yerala Project Society, Jalihal) careers guidance, in the same paper-and-highlighter style as the [Geography Lab](https://github.com/adm-htfre/Open-Source-SCOPE-Geography-Lab) and [Science Lab](https://github.com/adm-htfre/Open-Source-SCOPE-Science-Lab). It starts at Class 10 and shows every route from there to courses, exams, jobs and government services in India. It is built on [Career Tree](https://github.com/mhardik003/career-tree) by mhardik003 (MIT licence), with a mind-map view and pay data added for SCOPE.

Unlike the other labs this is a Next.js web app, not a single file, so it needs Node.js to run (see **Run it** below). Open `/mindmap` once it is running.

## What it does

- **Mind map** (`/mindmap`): Class 10 in the centre and its branches all around as a radial map. Each stop is an illustrated bubble (picture = field, colour = school / study / exam / work). Tap a bubble to open its branch and a detail card showing what comes next, follow the numbered path along the bottom rail, or jump to any stop from search.
- **Usual routes**: the map follows the usual way to reach each stop (uncommon links count as longer), so a branch shows the path most students actually take.
- **Expand all**: shows all 680 reachable stops at once as a radial tree. Seen whole, bubbles become coloured dots; zoom in and every name comes back. Tap a stop to go to it, and Collapse returns to the one-branch view with that stop still open.
- **Pay and difficulty** panel on every job and government service: starting pay, how pay grows, and a 1–5 "how hard to get in" guide, plus official selection odds for nine exams (UPSC CSE, RRB NTPC / ALP / Group D, CA Intermediate / Final, CTET, CFA Level I, GATE CS).
- **34 tech-company jobs** added by hand (legal, supply chain, hardware and chip design, reliability, manufacturing, data and security, programme management, HR, finance, sales engineering, IT support).
- English / मराठी switch, light and dark, built for classroom boards and phones.
- Everything from Career Tree is still here: a cited guide for every stop (`/careers/...`), the explorer (`/explore/...`) and the global map (`/map`).

## Data sources

| What | Source |
|---|---|
| Courses, exams, jobs and routes | Career Tree's graph: 711 stops and 1,676 links, each with a guide where every fact cites at least one public source. |
| Tech-company jobs | O*NET OnLine, Google's SRE book, ASQ, the Digital Personal Data Protection Act 2023 and the UGC degree specification, written by `pipeline/manual/add_tech_company_jobs.py`. Each is flagged `needs_review` until a person has checked it. |
| Pay | Figures the guides already cite, checked by `pipeline/manual/build_job_outlook.py` (every amount must appear in the cited sentence). Only government rules and notices, public employers' notices, employers' published terms, National Career Service ranges and named salary surveys dated 2019 or later are used. Central government posts use 7th Pay Commission levels and entry pay from the CCS (Revised Pay) Rules, 2016; IBPS PO pay is from the 2026 notification. |
| Exam odds | The official notices and results for the nine exams listed above. |

149 of 368 jobs and services have a pay figure; the rest say so rather than guess. The 1–5 difficulty rating comes from the stated rules (courses and exams on the usual route, how competitive selection is, experience needed) and is labelled as a guide. Labels are in English and Marathi; the career data itself is in English. **Teachers: please check the pay figures and Marathi labels before using them with students.**

## Run it

You need Node.js 20 or newer. No API keys are needed: all the data is in the repository.

```
cd career-tree
npm install
npm run dev        # then open http://localhost:3000/mindmap
```

`npm test` runs the tests. The original Career Tree README, with the full setup, data pipeline and contribution forms, is in [`docs/CAREER-TREE-README.md`](docs/CAREER-TREE-README.md).

## Repository layout

- `career-tree/`: the Next.js web app
  - `app/mindmap/`: the SCOPE mind map (view, pay panel, styles, English / मराठी strings)
  - `lib/v2/`: mind-map layout and pay data code, with tests in `lib/v2/__tests__/`
  - `data/v2/`: the career graph, guides (`facts/`) and pay data (`job-outlook.json`)
- `pipeline/`: Career Tree's data pipeline; `pipeline/manual/` holds the SCOPE scripts that add the tech-company jobs and build the pay data
- `docs/`: the original Career Tree README and operations guide

## Licence

MIT, from Career Tree by mhardik003 (see `LICENSE`).
