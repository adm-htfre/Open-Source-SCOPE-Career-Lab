import { describe, expect, it } from "vitest";
import { V2Graph } from "../graph-core";
import { buildMindMap, layoutMindMap, pathKey, routeTo, type MindNode } from "../mind-map";
import type { V2Edge, V2EdgeType, V2GraphSnapshot, V2Node, V2NodeType } from "../types";

const prov = { model: "fixture", prompt_version: "v2", generated_at: "2026-07-19", source_urls: [] };

function node(id: string, type: V2NodeType, title: string): V2Node {
  return {
    id,
    type,
    slug: id.split(":")[1],
    title,
    aliases: [],
    description: `${title} description`,
    is_terminal: false,
    needs_review: false,
    prov,
  };
}

function edge(from: string, to: string, type: V2EdgeType = "progression", common = true): V2Edge {
  return { id: `${from}->${to}`, from_id: from, to_id: to, edge_type: type, is_common_route: common, prov };
}

const ROOT = "school_stage:class-10";
const snapshot: V2GraphSnapshot = {
  schema_version: 1,
  root_id: ROOT,
  source_digest: "fixture",
  generated_at: "2026-07-19T00:00:00Z",
  nodes: [
    node(ROOT, "school_stage", "Class 10"),
    node("stream:science", "stream", "Science"),
    node("stream:commerce", "stream", "Commerce"),
    node("exam:entrance", "exam", "Entrance"),
    node("degree:bca", "degree", "BCA"),
    node("job_role:developer", "job_role", "Developer"),
    node("exam:orphan", "exam", "Orphan"),
  ],
  edges: [
    edge(ROOT, "stream:science"),
    edge(ROOT, "stream:commerce"),
    edge(ROOT, "exam:entrance", "exam_gate", false),
    edge("stream:science", "degree:bca"),
    edge("stream:commerce", "degree:bca"),
    edge("degree:bca", "job_role:developer"),
    // A lateral edge back up the route must not loop the unfolded tree.
    edge("job_role:developer", "degree:bca", "lateral", false),
  ],
};

const model = buildMindMap(new V2Graph(snapshot));
const byId = new Map<string, MindNode>(model.nodes.map((item) => [item.id, item]));

describe("buildMindMap", () => {
  it("orders children with common progressions first", () => {
    expect(byId.get(ROOT)!.children.map((link) => link.to)).toEqual([
      "stream:commerce",
      "stream:science",
      "exam:entrance",
    ]);
  });

  it("finds a shortest route from the root and flags unreachable nodes", () => {
    expect(routeTo(byId, "job_role:developer")).toEqual([
      ROOT,
      "stream:commerce",
      "degree:bca",
      "job_role:developer",
    ]);
    expect(byId.get("exam:orphan")!.reachable).toBe(false);
    expect(routeTo(byId, "exam:orphan")).toEqual([]);
  });
});

describe("layoutMindMap", () => {
  it("shows only the first ring until a branch is opened", () => {
    const layout = layoutMindMap(byId, ROOT, new Set());
    expect(layout.nodes.map((item) => item.id).sort()).toEqual(
      [ROOT, "exam:entrance", "stream:commerce", "stream:science"].sort(),
    );
    expect(layout.links).toHaveLength(3);
  });

  it("splits the first ring across both sides, or keeps it on one", () => {
    const both = layoutMindMap(byId, ROOT, new Set(), 2).nodes.filter((item) => item.depth === 1);
    expect(both.map((item) => item.side).sort()).toEqual([-1, 1, 1]);
    const one = layoutMindMap(byId, ROOT, new Set(), 1).nodes.filter((item) => item.depth === 1);
    expect(one.every((item) => item.side === 1 && item.x > 0)).toBe(true);
  });

  it("keeps one canonical node as separate cards under each parent", () => {
    const expanded = new Set([pathKey([ROOT, "stream:science"]), pathKey([ROOT, "stream:commerce"])]);
    const cards = layoutMindMap(byId, ROOT, expanded).nodes.filter((item) => item.id === "degree:bca");
    expect(cards).toHaveLength(2);
    expect(new Set(cards.map((item) => item.key)).size).toBe(2);
  });

  it("never repeats an ancestor further down its own path", () => {
    const science = [ROOT, "stream:science"];
    const bca = [...science, "degree:bca"];
    const developer = [...bca, "job_role:developer"];
    const expanded = new Set([pathKey(science), pathKey(bca), pathKey(developer)]);
    const layout = layoutMindMap(byId, ROOT, expanded);
    const leaf = layout.nodes.find((item) => item.key === pathKey(developer))!;
    expect(leaf.childCount).toBe(0);
    expect(layout.nodes.filter((item) => item.id === "degree:bca")).toHaveLength(1);
  });

  it("does not overlap sibling cards", () => {
    const expanded = new Set([pathKey([ROOT, "stream:commerce"])]);
    const layout = layoutMindMap(byId, ROOT, expanded, 1);
    const ring = layout.nodes.filter((item) => item.depth === 1).sort((a, b) => a.y - b.y);
    for (let index = 1; index < ring.length; index += 1) {
      expect(ring[index].y - ring[index - 1].y).toBeGreaterThanOrEqual(ring[index].height);
    }
  });
});
