import type { V2Graph } from "./graph-core";
import type { V2EdgeType, V2NodeType } from "./types";
import { exploreHref, nodeHref } from "./urls";

/**
 * Mind-map model: the canonical graph unfolded from the root as a tree the
 * visitor opens one branch at a time. A canonical node can therefore appear
 * under several parents; each appearance is keyed by its path from the root
 * (`pathKey`), while `id` stays the stable canonical ID.
 */

export interface MindLink {
  to: string;
  edgeType: V2EdgeType;
  common: boolean;
}

export interface MindNode {
  id: string;
  title: string;
  aliases: string[];
  type: V2NodeType;
  description: string;
  href: string;
  exploreHref: string;
  isTerminal: boolean;
  incoming: number;
  /** Parent on a shortest route from the root; null for the root and for
   *  nodes the root cannot reach. */
  via: string | null;
  reachable: boolean;
  children: MindLink[];
}

export interface MindMapModel {
  rootId: string;
  nodes: MindNode[];
  nodeCount: number;
  edgeCount: number;
}

const EDGE_ORDER: Record<V2EdgeType, number> = {
  progression: 0,
  exam_gate: 1,
  lateral: 2,
};

export function buildMindMap(graph: V2Graph): MindMapModel {
  const title = (id: string) => graph.getNode(id)?.title ?? id;
  const childrenOf = (id: string): MindLink[] =>
    graph
      .outgoing(id)
      .filter((edge) => graph.getNode(edge.to_id))
      .map((edge) => ({
        to: edge.to_id,
        edgeType: edge.edge_type,
        common: edge.is_common_route,
      }))
      .sort(
        (a, b) =>
          Number(b.common) - Number(a.common) ||
          EDGE_ORDER[a.edgeType] - EDGE_ORDER[b.edgeType] ||
          title(a.to).localeCompare(title(b.to)),
      );

  // Breadth-first from the root over the sorted children, so `via` follows
  // the most common shortest route.
  const via = new Map<string, string | null>([[graph.rootId, null]]);
  const queue = [graph.rootId];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    for (const link of childrenOf(current)) {
      if (!via.has(link.to)) {
        via.set(link.to, current);
        queue.push(link.to);
      }
    }
  }

  return {
    rootId: graph.rootId,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      title: node.title,
      aliases: node.aliases,
      type: node.type,
      description: node.description,
      href: nodeHref(node.id),
      exploreHref: exploreHref(node.id),
      isTerminal: node.is_terminal,
      incoming: graph.incoming(node.id).length,
      via: via.get(node.id) ?? null,
      reachable: via.has(node.id),
      children: childrenOf(node.id),
    })),
  };
}

export const PATH_SEPARATOR = "|";

export function pathKey(ids: string[]): string {
  return ids.join(PATH_SEPARATOR);
}

export function pathIds(key: string): string[] {
  return key.split(PATH_SEPARATOR);
}

/** Root-to-node ids along the `via` chain; empty when the root cannot reach it. */
export function routeTo(byId: Map<string, MindNode>, id: string): string[] {
  const route: string[] = [];
  let current: string | null = id;
  while (current) {
    const node = byId.get(current);
    if (!node || !node.reachable || route.includes(current)) return [];
    route.unshift(current);
    current = node.via;
  }
  return route;
}

export interface LaidNode {
  key: string;
  id: string;
  parentKey: string | null;
  depth: number;
  /** Centre of the bubble. */
  x: number;
  y: number;
  /** Diameter of the bubble. */
  size: number;
  /** Direction this node points away from its parent, in radians. */
  angle: number;
  /** Children this node can open (ancestors on its own path are skipped). */
  childCount: number;
  expanded: boolean;
}

export interface LaidLink {
  key: string;
  fromKey: string;
  toKey: string;
  edgeType: V2EdgeType;
  common: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MindLayout {
  nodes: LaidNode[];
  links: LaidLink[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export const MIND_SIZES = {
  root: 148,
  branch: 96,
  leaf: 82,
  /** Room one bubble and its label need along an arc. */
  spacing: 134,
  /** Distance between the two staggered rows of a crowded fan. */
  stagger: 122,
  /** Smallest distance from an opened bubble to its children. */
  fanRadius: 205,
  /** How far an opened bubble moves outward so its fan clears its siblings. */
  reach: 250,
  /** Radii of the first ring: wide for landscape screens, tall for phones. */
  ring: { wide: { rx: 340, ry: 240 }, tall: { rx: 186, ry: 292 } },
};

export type MindShape = keyof typeof MIND_SIZES.ring;

function sizeAt(depth: number) {
  if (depth === 0) return MIND_SIZES.root;
  return depth === 1 ? MIND_SIZES.branch : MIND_SIZES.leaf;
}

/**
 * Radial mind-map layout: the root sits in the centre with its children all
 * around it. An opened branch moves outward and fans its own children out
 * ahead of it, away from where it came from. Only branches whose path key is
 * in `expanded` show their children; the root is always open.
 */
export function layoutMindMap(
  byId: Map<string, MindNode>,
  rootId: string,
  expanded: ReadonlySet<string>,
  shape: MindShape = "wide",
): MindLayout {
  const nodes: LaidNode[] = [];
  const links: LaidLink[] = [];
  const half = MIND_SIZES.root / 2;
  const bounds = { minX: -half, maxX: half, minY: -half, maxY: half };
  const root = byId.get(rootId);
  if (!root) return { nodes, links, bounds };

  const visibleChildren = (ids: string[]): MindLink[] => {
    const node = byId.get(ids[ids.length - 1]);
    if (!node) return [];
    return node.children.filter((link) => !ids.includes(link.to) && byId.has(link.to));
  };

  const add = (
    ids: string[],
    parent: LaidNode,
    edge: MindLink,
    x: number,
    y: number,
    angle: number,
  ) => {
    const key = pathKey(ids);
    const depth = ids.length - 1;
    const kids = visibleChildren(ids);
    const open = expanded.has(key) && kids.length > 0;
    const reach = open ? MIND_SIZES.reach : 0;
    const laid: LaidNode = {
      key,
      id: ids[depth],
      parentKey: parent.key,
      depth,
      x: x + Math.cos(angle) * reach,
      y: y + Math.sin(angle) * reach,
      size: sizeAt(depth),
      angle,
      childCount: kids.length,
      expanded: open,
    };
    nodes.push(laid);
    links.push({
      key: `${parent.key}${PATH_SEPARATOR}>${laid.id}`,
      fromKey: parent.key,
      toKey: key,
      edgeType: edge.edgeType,
      common: edge.common,
      x1: parent.x,
      y1: parent.y,
      x2: laid.x,
      y2: laid.y,
    });
    const pad = laid.size / 2;
    bounds.minX = Math.min(bounds.minX, laid.x - pad);
    bounds.maxX = Math.max(bounds.maxX, laid.x + pad);
    bounds.minY = Math.min(bounds.minY, laid.y - pad);
    bounds.maxY = Math.max(bounds.maxY, laid.y + pad);
    if (open) fan(ids, laid, kids);
  };

  /** Children of an opened bubble, on an arc ahead of it. */
  const fan = (ids: string[], parent: LaidNode, kids: MindLink[]) => {
    const count = kids.length;
    const singleStep = MIND_SIZES.spacing / MIND_SIZES.fanRadius;
    const staggered = (count - 1) * singleStep > Math.PI;
    const step = count < 2 ? 0 : staggered ? Math.PI / (count - 1) : singleStep;
    const radius = staggered
      ? Math.max(MIND_SIZES.fanRadius, MIND_SIZES.spacing / (2 * step))
      : MIND_SIZES.fanRadius;
    kids.forEach((link, index) => {
      const angle = parent.angle + (index - (count - 1) / 2) * step;
      const distance = radius + (staggered && index % 2 === 1 ? MIND_SIZES.stagger : 0);
      add(
        [...ids, link.to],
        parent,
        link,
        parent.x + Math.cos(angle) * distance,
        parent.y + Math.sin(angle) * distance,
        angle,
      );
    });
  };

  const rootKids = visibleChildren([rootId]);
  const laidRoot: LaidNode = {
    key: rootId,
    id: rootId,
    parentKey: null,
    depth: 0,
    x: 0,
    y: 0,
    size: MIND_SIZES.root,
    angle: 0,
    childCount: rootKids.length,
    expanded: true,
  };
  nodes.push(laidRoot);

  const ring = ellipsePoints(MIND_SIZES.ring[shape], rootKids.length);
  rootKids.forEach((link, index) => {
    const { x, y } = ring[index];
    add([rootId, link.to], laidRoot, link, x, y, Math.atan2(y, x));
  });

  return { nodes, links, bounds };
}

/**
 * `count` points spaced evenly along an ellipse by arc length (equal angles
 * would crowd them at the narrow ends), starting at the top, clockwise.
 */
function ellipsePoints({ rx, ry }: { rx: number; ry: number }, count: number) {
  const steps = 720;
  const at = (step: number) => {
    const turn = -Math.PI / 2 + (step / steps) * 2 * Math.PI;
    return { x: Math.cos(turn) * rx, y: Math.sin(turn) * ry };
  };
  const lengths = [0];
  for (let step = 1; step <= steps; step += 1) {
    const a = at(step - 1);
    const b = at(step);
    lengths.push(lengths[step - 1] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const points: { x: number; y: number }[] = [];
  let step = 0;
  for (let index = 0; index < count; index += 1) {
    const target = (lengths[steps] * index) / count;
    while (step < steps && lengths[step] < target) step += 1;
    points.push(at(step));
  }
  return points;
}

/** A short label for a bubble: the title without its trailing "(…)" gloss. */
export function shortTitle(title: string): string {
  const trimmed = title.replace(/\s*\([^()]*\)\s*$/, "").trim();
  return trimmed.length >= 3 ? trimmed : title;
}
