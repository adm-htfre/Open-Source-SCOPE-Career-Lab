import type { V2Graph } from "./graph-core";
import type { MindNode } from "./mind-map";
import type { V2NodeType } from "./types";

/**
 * Pay and "how hard is it to get in" for jobs and government services.
 *
 * Pay and exam figures come from data/v2/job-outlook.json, built by
 * pipeline/manual/build_job_outlook.py from figures the guides already cite
 * (plus official exam-result notices). The difficulty rating is not an
 * official figure: it is worked out here, by the stated rules in
 * `rateEffort`, from the usual route to a job on this map.
 */

export type PayPeriod = "month" | "year";

export interface PayStage {
  who: string;
  min: number;
  max: number;
  per: PayPeriod;
}

export interface PayRecord {
  kind: "level" | "rule" | "notice" | "employer" | "ncs" | "aggregator";
  kindLabel: string;
  asOf: string;
  quote: string;
  sources: string[];
  stages: PayStage[];
  level?: string;
  growth?: { text: string; sources: string[] };
}

export interface OddsRecord {
  kind: "selection" | "pass";
  year: string;
  text: string;
  sources: string[];
  applied?: number;
  selected?: number;
  appeared?: number;
  passed?: number | null;
  rate?: number;
}

export interface OutlookFile {
  generatedAt: string;
  pay: Record<string, PayRecord>;
  odds: Record<string, OddsRecord>;
}

export interface EffortRating {
  /** 1 (easier to get in) to 5 (very hard). */
  score: number;
  /** College-level courses on the usual route (diplomas, degrees, ITI…): 0, 1 or 2+. */
  courses: number;
  /** 0 none, 1 an entrance or qualifying exam, 2 a very competitive selection. */
  exam: 0 | 1 | 2;
  experience: boolean;
}

export interface NodeOutlook {
  pay?: PayRecord;
  /** The usual next step up, when it has a pay figure and this job has no growth figure of its own. */
  next?: { id: string; title: string; pay: PayRecord };
  /** Exams on the way in that have published selection or pass figures. */
  odds: { examId: string; examTitle: string; odds: OddsRecord }[];
  effort: EffortRating;
}

const STUDY_TYPES = new Set<V2NodeType>(["degree", "diploma", "certification", "training"]);
const WORK_TYPES = new Set<V2NodeType>(["job_role", "government_service", "entrepreneurship"]);
export const OUTLOOK_TYPES = new Set<V2NodeType>(["job_role", "government_service"]);

/** Fewer than 1 in 200 applicants selected counts as a very competitive selection. */
export const VERY_COMPETITIVE = 0.005;

export function selectionRate(odds: OddsRecord): number | null {
  if (odds.kind === "selection" && odds.applied && odds.selected) return odds.selected / odds.applied;
  if (odds.kind === "pass") {
    if (odds.rate != null) return odds.rate;
    if (odds.appeared && odds.passed) return odds.passed / odds.appeared;
  }
  return null;
}

/**
 * The rating rules, shown to readers next to the rating:
 *   start at 1
 *   + 1 for one college-level course on the usual route, + 2 for two or more
 *   + 1 for an entrance or qualifying exam on the way in, + 2 instead when
 *     the exam's own published figures select fewer than 1 in 200 applicants
 *   + 1 when the usual route goes through another job first (experience)
 *   capped at 5.
 */
export function rateEffort(
  route: MindNode[],
  examsIn: string[],
  odds: Record<string, OddsRecord>,
): EffortRating {
  const before = route.slice(0, -1);
  const courses = before.filter((node) => STUDY_TYPES.has(node.type)).length;
  const exams = [...new Set([...before.filter((node) => node.type === "exam").map((node) => node.id), ...examsIn])];
  let exam: 0 | 1 | 2 = exams.length ? 1 : 0;
  for (const id of exams) {
    const record = odds[id];
    const rate = record?.kind === "selection" ? selectionRate(record) : null;
    if (rate !== null && rate < VERY_COMPETITIVE) exam = 2;
  }
  const experience = before.some((node, index) => index > 0 && WORK_TYPES.has(node.type));
  const score = Math.min(5, 1 + Math.min(courses, 2) + exam + (experience ? 1 : 0));
  return { score, courses, exam, experience };
}

/** Outlook for every job and government service reachable on the map. */
export function buildOutlook(
  graph: V2Graph,
  nodes: MindNode[],
  file: OutlookFile,
): Record<string, NodeOutlook> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const routeOf = (id: string): MindNode[] => {
    const route: MindNode[] = [];
    let current: string | null = id;
    while (current) {
      const node = byId.get(current);
      if (!node || route.includes(node)) return [];
      route.unshift(node);
      current = node.via;
    }
    return route;
  };
  const out: Record<string, NodeOutlook> = {};
  for (const node of nodes) {
    if (!OUTLOOK_TYPES.has(node.type) || !node.reachable) continue;
    const route = routeOf(node.id);
    // Exams that usually gate this job, or a course on the way to it (an
    // MBBS seat is reached through NEET even where the map also links the
    // stream straight to the degree).
    const examsIn = [
      ...new Set(
        route.slice(1).flatMap((step) =>
          graph
            .incoming(step.id)
            .filter(
              (edge) =>
                edge.edge_type === "exam_gate" &&
                edge.is_common_route &&
                graph.getNode(edge.from_id)?.type === "exam",
            )
            .map((edge) => edge.from_id),
        ),
      ),
    ];
    const onRoute = route.filter((step) => step.type === "exam").map((step) => step.id);
    const odds = [...new Set([...onRoute, ...examsIn])]
      .filter((id) => file.odds[id])
      .map((id) => ({ examId: id, examTitle: byId.get(id)?.title ?? id, odds: file.odds[id] }));
    const pay = file.pay[node.id];
    let next: NodeOutlook["next"];
    if (!pay?.growth && (!pay || pay.stages.length < 2)) {
      // Only when the map has a single usual step up; with several, picking
      // one would suggest an order the data doesn't give.
      const steps = node.children.filter(
        (link) => link.edgeType === "progression" && link.common && OUTLOOK_TYPES.has(byId.get(link.to)?.type as V2NodeType),
      );
      const step = steps.length === 1 ? steps[0] : undefined;
      if (step && file.pay[step.to]) next = { id: step.to, title: byId.get(step.to)!.title, pay: file.pay[step.to] };
    }
    out[node.id] = {
      pay,
      next,
      odds,
      effort: rateEffort(route, examsIn, file.odds),
    };
  }
  return out;
}
