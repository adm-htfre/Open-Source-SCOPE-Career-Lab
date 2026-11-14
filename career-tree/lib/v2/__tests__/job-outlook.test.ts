import { describe, expect, it } from "vitest";
import { V2Graph } from "../graph-core";
import { buildOutlook, rateEffort, selectionRate, type OddsRecord, type OutlookFile } from "../job-outlook";
import { buildMindMap, type MindNode } from "../mind-map";
import type { V2Edge, V2EdgeType, V2GraphSnapshot, V2Node, V2NodeType } from "../types";

const prov = { model: "fixture", prompt_version: "v2", generated_at: "2026-07-19", source_urls: [] };
const node = (id: string, type: V2NodeType): V2Node => ({
  id, type, slug: id.split(":")[1], title: id, aliases: [], description: "", is_terminal: false, needs_review: false, prov,
});
const edge = (from: string, to: string, type: V2EdgeType = "progression", common = true): V2Edge => ({
  id: `${from}->${to}`, from_id: from, to_id: to, edge_type: type, is_common_route: common, prov,
});

const ROOT = "school_stage:class-10";
const snapshot: V2GraphSnapshot = {
  schema_version: 1, root_id: ROOT, source_digest: "f", generated_at: "2026-07-19T00:00:00Z",
  nodes: [
    node(ROOT, "school_stage"),
    node("stream:arts", "stream"),
    node("degree:ba", "degree"),
    node("exam:civil", "exam"),
    node("government_service:officer", "government_service"),
    node("exam:clerk", "exam"),
    node("government_service:clerk", "government_service"),
    node("job_role:writer", "job_role"),
    node("job_role:senior-writer", "job_role"),
  ],
  edges: [
    edge(ROOT, "stream:arts"),
    edge("stream:arts", "degree:ba"),
    edge("degree:ba", "exam:civil", "exam_gate"),
    edge("exam:civil", "government_service:officer", "exam_gate"),
    edge(ROOT, "exam:clerk", "exam_gate"),
    edge("exam:clerk", "government_service:clerk", "exam_gate"),
    edge("degree:ba", "job_role:writer"),
    edge("job_role:writer", "job_role:senior-writer"),
  ],
};
const graph = new V2Graph(snapshot);
const model = buildMindMap(graph);
const byId = new Map<string, MindNode>(model.nodes.map((item) => [item.id, item]));
const route = (...ids: string[]) => ids.map((id) => byId.get(id)!);

const civil: OddsRecord = { kind: "selection", year: "2024", text: "", sources: [], applied: 992599, selected: 1009 };
const pay = (amount: number) => ({
  kind: "notice" as const, kindLabel: "", asOf: "2026", quote: "", sources: [],
  stages: [{ who: "x", min: amount, max: amount, per: "month" as const }],
});

describe("selectionRate", () => {
  it("divides selections by applicants, or passes by candidates", () => {
    expect(selectionRate(civil)).toBeCloseTo(0.001017, 5);
    expect(selectionRate({ kind: "pass", year: "", text: "", sources: [], appeared: 200, passed: 50 })).toBe(0.25);
    expect(selectionRate({ kind: "pass", year: "", text: "", sources: [], rate: 0.43 })).toBe(0.43);
  });
});

describe("rateEffort", () => {
  it("adds a point per course, two for a very competitive exam", () => {
    const rating = rateEffort(
      route(ROOT, "stream:arts", "degree:ba", "exam:civil", "government_service:officer"),
      [],
      { "exam:civil": civil },
    );
    expect(rating).toMatchObject({ courses: 1, exam: 2, experience: false, score: 4 });
  });

  it("counts an exam without published figures as one point", () => {
    expect(rateEffort(route(ROOT, "exam:clerk", "government_service:clerk"), [], {}).score).toBe(2);
  });

  it("adds a point when the route passes through another job first", () => {
    const rating = rateEffort(route(ROOT, "stream:arts", "degree:ba", "job_role:writer", "job_role:senior-writer"), [], {});
    expect(rating).toMatchObject({ courses: 1, exam: 0, experience: true, score: 3 });
  });

  it("never goes above five", () => {
    const many = route(ROOT, "stream:arts", "degree:ba", "degree:ba", "job_role:writer", "exam:civil", "government_service:officer");
    expect(rateEffort(many, [], { "exam:civil": civil }).score).toBe(5);
  });
});

describe("buildOutlook", () => {
  const file: OutlookFile = {
    generatedAt: "2026-11-13",
    pay: { "job_role:senior-writer": pay(40000) },
    odds: { "exam:civil": civil },
  };
  const outlook = buildOutlook(graph, model.nodes, file);

  it("covers jobs and government services only", () => {
    expect(Object.keys(outlook).sort()).toEqual([
      "government_service:clerk",
      "government_service:officer",
      "job_role:senior-writer",
      "job_role:writer",
    ]);
  });

  it("points to the usual next step's pay when a job has none of its own", () => {
    expect(outlook["job_role:writer"].next?.id).toBe("job_role:senior-writer");
    expect(outlook["job_role:senior-writer"].pay?.stages[0].min).toBe(40000);
  });

  it("counts an exam that gates a course on the way", () => {
    const gated = new V2Graph({
      ...snapshot,
      nodes: [...snapshot.nodes, node("exam:entrance", "exam")],
      edges: [...snapshot.edges, edge("stream:arts", "exam:entrance", "exam_gate"), edge("exam:entrance", "degree:ba", "exam_gate")],
    });
    const result = buildOutlook(gated, buildMindMap(gated).nodes, file);
    expect(result["job_role:writer"].effort.exam).toBe(1);
    expect(outlook["job_role:writer"].effort.exam).toBe(0);
  });

  it("lists exams on the way in that have published figures", () => {
    expect(outlook["government_service:officer"].odds.map((item) => item.examId)).toEqual(["exam:civil"]);
    expect(outlook["government_service:clerk"].odds).toEqual([]);
  });
});
