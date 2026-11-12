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
  /** -1 = left of the root, 1 = right, 0 = the root itself. */
  side: -1 | 0 | 1;
  /** Centre of the card. */
  x: number;
  y: number;
  width: number;
  height: number;
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
  root: { width: 200, height: 84 },
  branch: { width: 216, height: 62 },
  leaf: { width: 204, height: 54 },
  gapX: 64,
  gapY: 12,
};

function sizeAt(depth: number) {
  if (depth === 0) return MIND_SIZES.root;
  return depth === 1 ? MIND_SIZES.branch : MIND_SIZES.leaf;
}

/**
 * Tidy two-sided (or one-sided, for narrow screens) mind-map layout. Only
 * branches whose path key is in `expanded` show their children; the root is
 * always open.
 */
export function layoutMindMap(
  byId: Map<string, MindNode>,
  rootId: string,
  expanded: ReadonlySet<string>,
  sides: 1 | 2 = 2,
): MindLayout {
  const nodes: LaidNode[] = [];
  const links: LaidLink[] = [];
  const root = byId.get(rootId);
  const rootSize = sizeAt(0);
  const bounds = {
    minX: -rootSize.width / 2,
    maxX: rootSize.width / 2,
    minY: -rootSize.height / 2,
    maxY: rootSize.height / 2,
  };
  if (!root) return { nodes, links, bounds };

  const visibleChildren = (ids: string[]): MindLink[] => {
    const node = byId.get(ids[ids.length - 1]);
    if (!node) return [];
    return node.children.filter((link) => !ids.includes(link.to) && byId.has(link.to));
  };
  const isOpen = (ids: string[]) => ids.length === 1 || expanded.has(pathKey(ids));

  const heights = new Map<string, number>();
  const measure = (ids: string[]): number => {
    const own = sizeAt(ids.length - 1).height + MIND_SIZES.gapY;
    let total = 0;
    if (isOpen(ids)) {
      for (const link of visibleChildren(ids)) total += measure([...ids, link.to]);
    }
    const height = Math.max(own, total);
    heights.set(pathKey(ids), height);
    return height;
  };

  const xAt = (depth: number, side: -1 | 1) => {
    let x = rootSize.width / 2;
    for (let level = 1; level <= depth; level += 1) {
      x += MIND_SIZES.gapX + sizeAt(level).width / (level === depth ? 2 : 1);
    }
    return side * x;
  };

  const place = (ids: string[], side: -1 | 1, top: number, edge: MindLink, parent: LaidNode) => {
    const key = pathKey(ids);
    const depth = ids.length - 1;
    const size = sizeAt(depth);
    const block = heights.get(key)!;
    const kids = visibleChildren(ids);
    const open = isOpen(ids) && kids.length > 0;
    const laid: LaidNode = {
      key,
      id: ids[depth],
      parentKey: parent.key,
      depth,
      side,
      x: xAt(depth, side),
      y: top + block / 2,
      width: size.width,
      height: size.height,
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
      x1: parent.x + (side * parent.width) / 2,
      y1: parent.y,
      x2: laid.x - (side * laid.width) / 2,
      y2: laid.y,
    });
    bounds.minX = Math.min(bounds.minX, laid.x - size.width / 2);
    bounds.maxX = Math.max(bounds.maxX, laid.x + size.width / 2);
    bounds.minY = Math.min(bounds.minY, laid.y - size.height / 2);
    bounds.maxY = Math.max(bounds.maxY, laid.y + size.height / 2);
    if (!open) return;
    const kidsHeight = kids.reduce(
      (sum, link) => sum + heights.get(pathKey([...ids, link.to]))!,
      0,
    );
    let cursor = top + (block - kidsHeight) / 2;
    for (const link of kids) {
      const childIds = [...ids, link.to];
      place(childIds, side, cursor, link, laid);
      cursor += heights.get(pathKey(childIds))!;
    }
  };

  const rootKids = visibleChildren([rootId]);
  const laidRoot: LaidNode = {
    key: rootId,
    id: rootId,
    parentKey: null,
    depth: 0,
    side: 0,
    x: 0,
    y: 0,
    width: rootSize.width,
    height: rootSize.height,
    childCount: rootKids.length,
    expanded: true,
  };
  nodes.push(laidRoot);

  const split = sides === 2 ? Math.ceil(rootKids.length / 2) : rootKids.length;
  const groups: [(-1 | 1), MindLink[]][] = [
    [1, rootKids.slice(0, split)],
    [-1, rootKids.slice(split)],
  ];
  for (const [side, group] of groups) {
    const total = group.reduce((sum, link) => sum + measure([rootId, link.to]), 0);
    let cursor = -total / 2;
    for (const link of group) {
      const ids = [rootId, link.to];
      place(ids, side, cursor, link, laidRoot);
      cursor += heights.get(pathKey(ids))!;
    }
  }

  return { nodes, links, bounds };
}
