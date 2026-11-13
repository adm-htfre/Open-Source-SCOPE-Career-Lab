import { describe, expect, it } from "vitest";
import { V2Graph } from "../graph-core";
import {
  buildMindMap,
  layoutMindMap,
  layoutWholeMap,
  pathKey,
  routeTo,
  shortTitle,
  WHOLE_MAP_SIZES,
  type MindNode,
} from "../mind-map";
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

  it("prefers the usual route over a shorter uncommon one", () => {
    const shortcut = buildMindMap(
      new V2Graph({
        ...snapshot,
        edges: [...snapshot.edges, edge("exam:entrance", "job_role:developer", "exam_gate", false)],
      }),
    );
    const index = new Map<string, MindNode>(shortcut.nodes.map((item) => [item.id, item]));
    expect(routeTo(index, "job_role:developer")).toEqual([
      ROOT,
      "stream:commerce",
      "degree:bca",
      "job_role:developer",
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

  it("puts the first ring all around the root", () => {
    const ring = layoutMindMap(byId, ROOT, new Set()).nodes.filter((item) => item.depth === 1);
    expect(ring.some((item) => item.x < -1)).toBe(true);
    expect(ring.some((item) => item.x > 1)).toBe(true);
    expect(ring.some((item) => item.y < -1)).toBe(true);
    expect(ring.some((item) => item.y > 1)).toBe(true);
  });

  it("moves an opened branch outward and fans its children beyond it", () => {
    const key = pathKey([ROOT, "stream:commerce"]);
    const closed = layoutMindMap(byId, ROOT, new Set()).nodes.find((item) => item.key === key)!;
    const layout = layoutMindMap(byId, ROOT, new Set([key]));
    const open = layout.nodes.find((item) => item.key === key)!;
    const child = layout.nodes.find((item) => item.parentKey === key)!;
    expect(Math.hypot(open.x, open.y)).toBeGreaterThan(Math.hypot(closed.x, closed.y));
    expect(Math.hypot(child.x, child.y)).toBeGreaterThan(Math.hypot(open.x, open.y));
  });

  it("keeps one canonical node as separate bubbles under each parent", () => {
    const expanded = new Set([pathKey([ROOT, "stream:science"]), pathKey([ROOT, "stream:commerce"])]);
    const bubbles = layoutMindMap(byId, ROOT, expanded).nodes.filter((item) => item.id === "degree:bca");
    expect(bubbles).toHaveLength(2);
    expect(new Set(bubbles.map((item) => item.key)).size).toBe(2);
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

  it("does not overlap bubbles in the first ring, wide or tall", () => {
    for (const shape of ["wide", "tall"] as const) {
      const ring = layoutMindMap(byId, ROOT, new Set(), shape).nodes.filter((item) => item.depth === 1);
      for (const a of ring) {
        for (const b of ring) {
          if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.size);
        }
      }
    }
  });
});

describe("shortTitle", () => {
  it("drops a trailing gloss but keeps short names whole", () => {
    expect(shortTitle("B.Tech (Bachelor of Technology)")).toBe("B.Tech");
    expect(shortTitle("Science Stream — PCM (Physics, Chemistry, Maths)")).toBe("Science Stream — PCM");
    expect(shortTitle("JEE Main")).toBe("JEE Main");
  });
});

describe("layoutWholeMap", () => {
  const whole = layoutWholeMap(byId, ROOT);

  it("shows every reachable stop exactly once", () => {
    const reachable = model.nodes.filter((item) => item.reachable).map((item) => item.id).sort();
    expect(whole.nodes.map((item) => item.id).sort()).toEqual(reachable);
    expect(whole.links).toHaveLength(reachable.length - 1);
  });

  it("keys each stop by its usual route", () => {
    const developer = whole.nodes.find((item) => item.id === "job_role:developer")!;
    expect(developer.key).toBe(pathKey(routeTo(byId, "job_role:developer")));
  });

  it("keeps bubbles on the same ring apart", () => {
    for (const a of whole.nodes) {
      for (const b of whole.nodes) {
        if (a !== b && a.depth === b.depth) {
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(WHOLE_MAP_SIZES.spacing - 0.01);
        }
      }
    }
  });
});
