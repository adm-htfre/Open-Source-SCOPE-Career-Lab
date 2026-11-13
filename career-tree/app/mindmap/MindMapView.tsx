"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  layoutMindMap,
  layoutWholeMap,
  MIND_SIZES,
  PATH_SEPARATOR,
  pathIds,
  pathKey,
  routeTo,
  shortTitle,
  type LaidNode,
  type MindShape,
  type MindMapModel,
  type MindNode,
} from "@/lib/v2/mind-map";
import type { V2NodeType } from "@/lib/v2/types";
import { NodeIcon } from "./icons";
import { MARATHI_TITLES, STRINGS, TYPE_LABELS, type Lang } from "./strings";

type View = { cx: number; cy: number; k: number };
type TypeGroup = "start" | "exam" | "study" | "work";

const TYPE_GROUP: Record<V2NodeType, TypeGroup> = {
  school_stage: "start",
  stream: "start",
  exam: "exam",
  degree: "study",
  diploma: "study",
  certification: "study",
  training: "study",
  job_role: "work",
  government_service: "work",
  entrepreneurship: "work",
};
const GROUPS: TypeGroup[] = ["start", "study", "exam", "work"];

const MIN_ZOOM = 0.04;
/** Below this zoom, labels are too small to read and are hidden. */
const FAR_ZOOM = 0.38;
const MAX_ZOOM = 2;
const LANG_KEY = "career-tree-mindmap-lang";
const LANG_EVENT = "career-tree-mindmap-lang";
const NARROW_QUERY = "(max-width: 760px)";
/** Below this width the map starts a little smaller, clear of the header. */
const COMPACT_QUERY = "(max-width: 1279px)";

const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

function subscribeLang(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LANG_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LANG_EVENT, onChange);
  };
}
function readLang(): Lang {
  try {
    return window.localStorage.getItem(LANG_KEY) === "mr" ? "mr" : "en";
  } catch {
    return "en";
  }
}
function writeLang(lang: Lang) {
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Private windows can refuse storage; the toggle still works for this visit.
  }
  window.dispatchEvent(new Event(LANG_EVENT));
}

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  };
}
const subscribeNarrow = subscribeMedia(NARROW_QUERY);
const subscribeCompact = subscribeMedia(COMPACT_QUERY);

export default function MindMapView({ model }: { model: MindMapModel }) {
  const byId = useMemo(
    () => new Map<string, MindNode>(model.nodes.map((node) => [node.id, node])),
    [model.nodes],
  );
  const rootId = model.rootId;

  const storedLang = useSyncExternalStore<Lang>(subscribeLang, readLang, () => "en");
  // Storage can be unavailable; the in-memory choice then carries the visit.
  const [sessionLang, setSessionLang] = useState<Lang | null>(null);
  const lang = sessionLang ?? storedLang;
  const narrow = useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
  const compact = useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false,
  );
  const shape: MindShape = narrow ? "tall" : "wide";
  const t = STRINGS[lang];

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [gliding, setGliding] = useState(true);
  const [query, setQuery] = useState("");
  // "Show all": every stop at once, each on its usual route.
  const [showAll, setShowAll] = useState(false);

  // Nudge the map right and down a little so it clears the header card.
  const homeView = useMemo<View>(
    () =>
      narrow
        ? { cx: 0, cy: 0, k: 0.74 }
        : compact
          ? { cx: -165, cy: -15, k: 0.78 }
          : { cx: -60, cy: 0, k: 1 },
    [narrow, compact],
  );
  const current = view ?? homeView;

  const wholeMap = useMemo(() => layoutWholeMap(byId, rootId), [byId, rootId]);
  const layoutFor = useCallback(
    (nextExpanded: ReadonlySet<string>, all: boolean) =>
      all ? wholeMap : layoutMindMap(byId, rootId, nextExpanded, shape),
    [byId, rootId, shape, wholeMap],
  );
  const layout = useMemo(() => layoutFor(expanded, showAll), [layoutFor, expanded, showAll]);

  const num = useCallback(
    (value: number) => value.toLocaleString(lang === "mr" ? "mr-IN-u-nu-deva" : "en-IN"),
    [lang],
  );
  const titleOf = useCallback(
    (id: string) => (lang === "mr" && MARATHI_TITLES[id]) || byId.get(id)?.title || id,
    [byId, lang],
  );

  const focusOn = useCallback(
    (key: string, nextExpanded: ReadonlySet<string>, all = false) => {
      const next = layoutFor(nextExpanded, all);
      const node = next.nodes.find((item) => item.key === key);
      if (!node) return;
      let cx = node.x;
      let cy = node.y;
      if (node.depth === 0) {
        cx = homeView.cx;
        cy = homeView.cy;
      } else if (node.expanded && !all) {
        // Look ahead of an opened bubble, towards its children.
        cx += Math.cos(node.angle) * MIND_SIZES.fanRadius * 0.55;
        cy += Math.sin(node.angle) * MIND_SIZES.fanRadius * 0.55;
      }
      setGliding(true);
      setView((previous) => {
        const base = previous ?? homeView;
        return { cx, cy, k: base.k < 0.6 ? 0.85 : base.k };
      });
    },
    [layoutFor, homeView],
  );

  /** Open a branch in the one-branch view, selecting `key`. */
  const openBranch = useCallback(
    (key: string, toggle: boolean, base: ReadonlySet<string>, wasSelected: string | null) => {
      const ids = pathIds(key);
      const node = byId.get(ids[ids.length - 1]);
      if (!node) return;
      const hasChildren = node.children.some((link) => !ids.includes(link.to));
      const inside = `${key}${PATH_SEPARATOR}`;
      const folding = toggle && wasSelected === key && base.has(key);
      const next = new Set<string>();
      for (const item of base) {
        const onThisBranch = key.startsWith(`${item}${PATH_SEPARATOR}`) || item === key || item.startsWith(inside);
        // One branch at a time: opening a bubble folds the others.
        if (onThisBranch) next.add(item);
      }
      for (let length = 2; length < ids.length; length += 1) {
        next.add(pathKey(ids.slice(0, length)));
      }
      if (folding) {
        for (const item of [...next]) {
          if (item === key || item.startsWith(inside)) next.delete(item);
        }
      } else if (hasChildren && ids.length > 1) {
        next.add(key);
      }
      setExpanded(next);
      setSelected(key);
      focusOn(key, next);
    },
    [byId, focusOn],
  );

  /** Select a card; `toggle` lets a second tap on the selected card fold it. */
  const open = useCallback(
    (key: string, toggle: boolean) => {
      if (!showAll) {
        openBranch(key, toggle, expanded, selected);
        return;
      }
      // Every stop is already showing, once, on its usual route: go to it.
      const ids = pathIds(key);
      const route = routeTo(byId, ids[ids.length - 1]);
      if (route.length === 0) return;
      const routeKey = pathKey(route);
      setSelected(routeKey);
      focusOn(routeKey, expanded, true);
    },
    [byId, expanded, focusOn, openBranch, selected, showAll],
  );

  const toggleShowAll = useCallback(() => {
    setGliding(true);
    if (showAll) {
      setShowAll(false);
      if (selected) {
        openBranch(selected, false, new Set(), null);
      } else {
        setExpanded(new Set());
        setView(null);
      }
      return;
    }
    setShowAll(true);
    if (selected) {
      const ids = pathIds(selected);
      const route = routeTo(byId, ids[ids.length - 1]);
      setSelected(route.length ? pathKey(route) : null);
    }
    // Fit the whole map in the space the cards leave free.
    const box = viewportRef.current?.getBoundingClientRect();
    const width = Math.max((box?.width ?? 1200) - (narrow ? 20 : 120), 200);
    const height = Math.max((box?.height ?? 800) - (narrow ? 160 : 80), 200);
    const { minX, maxX, minY, maxY } = wholeMap.bounds;
    const k = clampZoom(Math.min(width / (maxX - minX), height / (maxY - minY)));
    setView({ cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, k });
  }, [byId, narrow, openBranch, selected, showAll, wholeMap]);

  const reset = useCallback(() => {
    setShowAll(false);
    setExpanded(new Set());
    setSelected(null);
    setGliding(true);
    setView(null);
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      setGliding(true);
      setView((previous) => {
        const base = previous ?? homeView;
        return { ...base, k: clampZoom(base.k * factor) };
      });
    },
    [homeView],
  );

  // ---- pan, pinch and wheel -------------------------------------------------
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const currentStepRef = useRef<HTMLButtonElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const pinch = useRef<{ distance: number; k: number } | null>(null);
  const suppressClick = useRef(false);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    suppressClick.current = false;
    if (pointers.current.size === 1) {
      drag.current = { x: event.clientX, y: event.clientY, moved: false };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: current.k };
      suppressClick.current = true;
      setGliding(false);
    }
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const k = clampZoom((pinch.current.k * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.distance);
      setView((previous) => ({ ...(previous ?? homeView), k }));
      return;
    }
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (!state.moved) {
      if (Math.hypot(dx, dy) < 6) return;
      state.moved = true;
      suppressClick.current = true;
      setGliding(false);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    state.x = event.clientX;
    state.y = event.clientY;
    setView((previous) => {
      const base = previous ?? homeView;
      return { ...base, cx: base.cx - dx / base.k, cy: base.cy - dy / base.k };
    });
  };
  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
  };

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      // The world's CSS left/top is the map origin inside the viewport.
      const rect = element.getBoundingClientRect();
      const origin = worldRef.current ? getComputedStyle(worldRef.current) : null;
      const sx = event.clientX - rect.left - (origin ? parseFloat(origin.left) : rect.width / 2);
      const sy = event.clientY - rect.top - (origin ? parseFloat(origin.top) : rect.height * 0.46);
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0016));
      setGliding(false);
      setView((previous) => {
        const base = previous ?? homeView;
        const k = clampZoom(base.k * factor);
        const wx = base.cx + sx / base.k;
        const wy = base.cy + sy / base.k;
        return { cx: wx - sx / k, cy: wy - sy / k, k };
      });
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [homeView]);

  // Keep the current step of the rail in view as the path grows.
  useEffect(() => {
    currentStepRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selected]);

  // ---- derived ---------------------------------------------------------------
  const selectedIds = useMemo(() => (selected ? pathIds(selected) : [rootId]), [selected, rootId]);
  const selectedNode = selected ? byId.get(selectedIds[selectedIds.length - 1]) : undefined;
  const onPath = useCallback(
    (key: string) =>
      selected !== null && (key === selected || selected.startsWith(`${key}${PATH_SEPARATOR}`)),
    [selected],
  );

  const nextLinks = selectedNode
    ? selectedNode.children.filter((link) => !selectedIds.includes(link.to) && byId.has(link.to))
    : [];

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    const scored: { node: MindNode; score: number }[] = [];
    for (const node of model.nodes) {
      const names = [node.title, MARATHI_TITLES[node.id] ?? "", ...node.aliases].map((name) =>
        name.toLowerCase(),
      );
      if (names.some((name) => name.startsWith(needle))) scored.push({ node, score: 0 });
      else if (names.some((name) => name.includes(needle))) scored.push({ node, score: 1 });
    }
    return scored
      .sort((a, b) => a.score - b.score || a.node.title.length - b.node.title.length)
      .slice(0, 8)
      .map((item) => item.node);
  }, [model.nodes, query]);

  const pickResult = (node: MindNode) => {
    const route = routeTo(byId, node.id);
    if (route.length === 0) return;
    setQuery("");
    open(pathKey(route), false);
  };

  const stepBack = () => {
    if (selectedIds.length > 1) open(pathKey(selectedIds.slice(0, -1)), false);
  };
  const firstChild = (() => {
    const node = byId.get(selectedIds[selectedIds.length - 1]);
    return node?.children.find((link) => !selectedIds.includes(link.to))?.to;
  })();
  const stepForward = () => {
    if (firstChild) open(pathKey([...selectedIds, firstChild]), false);
  };

  const cardClick = (node: LaidNode) => {
    if (suppressClick.current) return;
    open(node.key, true);
  };

  return (
    <div
      className={`mm${showAll ? " mm-all" : ""}`}
      lang={lang === "mr" ? "mr" : "en"}
      data-lang={lang}
      data-detail={selectedNode ? "open" : undefined}
    >
      <div
        ref={viewportRef}
        className="mm-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <div
          ref={worldRef}
          className={`mm-world${gliding ? " mm-gliding" : ""}${current.k < FAR_ZOOM ? " mm-far" : ""}`}
          style={
            {
              transform: `scale(${current.k}) translate(${-current.cx}px, ${-current.cy}px)`,
              "--inv-zoom": 1 / current.k,
            } as CSSProperties
          }
        >
          <svg className="mm-links" aria-hidden="true" width="1" height="1">
            {layout.links.map((link) => (
              <line
                key={link.key}
                className={`mm-link mm-link-${link.edgeType}${link.common ? " mm-link-common" : ""}${onPath(link.toKey) ? " mm-link-active" : ""}`}
                x1={link.x1}
                y1={link.y1}
                x2={link.x2}
                y2={link.y2}
              />
            ))}
          </svg>
          {layout.nodes.map((node) => {
            const data = byId.get(node.id)!;
            const isSelected = selected === node.key;
            return (
              <button
                key={node.key}
                type="button"
                className={[
                  "mm-node",
                  `mm-depth-${Math.min(node.depth, 2)}`,
                  `mm-group-${TYPE_GROUP[data.type]}`,
                  isSelected ? "mm-selected" : "",
                  !isSelected && onPath(node.key) ? "mm-on-path" : "",
                ].join(" ")}
                style={{
                  width: node.size,
                  height: node.size,
                  transform: `translate(${node.x - node.size / 2}px, ${node.y - node.size / 2}px)`,
                }}
                aria-expanded={node.childCount > 0 ? node.expanded : undefined}
                aria-current={isSelected ? "true" : undefined}
                aria-label={`${TYPE_LABELS[lang][data.type]}: ${titleOf(node.id)}`}
                title={data.title}
                onClick={() => cardClick(node)}
              >
                <span className="mm-bubble">
                  <NodeIcon node={data} strokeWidth={1.6} />
                  {node.depth === 0 && (
                    <span className="mm-root-title">{shortTitle(titleOf(node.id))}</span>
                  )}
                </span>
                {node.depth > 0 && (
                  <span className="mm-node-title">{shortTitle(titleOf(node.id))}</span>
                )}
                {node.depth > 0 && node.childCount > 0 && (
                  <span className="mm-node-count" aria-hidden="true">
                    {node.expanded ? "−" : `+${num(node.childCount)}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <header className="mm-header">
        <div className="mm-header-top">
          <Link href="/" className="mm-eyebrow">
            ← {t.eyebrow}
          </Link>
          <div className="mm-lang" role="group" aria-label={t.language}>
            {(["en", "mr"] as const).map((code) => (
              <button
                key={code}
                type="button"
                className={lang === code ? "mm-lang-on" : ""}
                aria-pressed={lang === code}
                lang={code}
                onClick={() => {
                  setSessionLang(code);
                  writeLang(code);
                }}
              >
                {code === "en" ? "EN" : "मराठी"}
              </button>
            ))}
          </div>
        </div>
        <h1 className="mm-h1">
          {t.headlineBefore}
          <mark>{t.headlineMark}</mark>
          {t.headlineAfter}
        </h1>
        <div className="mm-search">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
          />
          {query.trim().length >= 2 && (
            <ul className="mm-results">
              {results.length === 0 && <li className="mm-results-empty">{t.noResults}</li>}
              {results.map((node) => (
                <li key={node.id}>
                  {node.reachable ? (
                    <button type="button" onClick={() => pickResult(node)}>
                      <span className={`mm-dot mm-group-${TYPE_GROUP[node.type]}`} />
                      <span className="mm-results-title">{titleOf(node.id)}</span>
                      <span className="mm-results-type">{TYPE_LABELS[lang][node.type]}</span>
                    </button>
                  ) : (
                    <Link href={node.href}>
                      <span className={`mm-dot mm-group-${TYPE_GROUP[node.type]}`} />
                      <span className="mm-results-title">{node.title}</span>
                      <span className="mm-results-type">{t.guideOnly}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mm-hint">
          {showAll ? `${t.allHintBefore}${num(wholeMap.nodes.length)}${t.allHintAfter}` : t.hint}
        </p>
      </header>

      <div className="mm-legend" aria-label={t.legend}>
        {GROUPS.map((group) => (
          <span key={group} className="mm-legend-item">
            <span className={`mm-dot mm-group-${group}`} />
            {t.groups[group]}
          </span>
        ))}
        <span className="mm-legend-item">
          <svg width="26" height="6" aria-hidden="true">
            <line x1="1" y1="3" x2="25" y2="3" className="mm-link mm-link-exam_gate" />
          </svg>
          {t.examGate}
        </span>
        <span className="mm-legend-item">
          <svg width="26" height="6" aria-hidden="true">
            <line x1="1" y1="3" x2="25" y2="3" className="mm-link mm-link-lateral" />
          </svg>
          {t.lateral}
        </span>
      </div>

      <div className="mm-tools">
        <button
          type="button"
          className={`mm-tool mm-tool-wide${showAll ? " mm-tool-on" : ""}`}
          aria-pressed={showAll}
          onClick={toggleShowAll}
        >
          {showAll ? t.collapseAll : t.expandAll}
        </button>
        <button type="button" className="mm-tool" onClick={() => zoomBy(1.25)} aria-label={t.zoomIn}>
          +
        </button>
        <button type="button" className="mm-tool" onClick={() => zoomBy(0.8)} aria-label={t.zoomOut}>
          −
        </button>
        <button type="button" className="mm-tool mm-tool-wide" onClick={reset}>
          {t.reset}
        </button>
      </div>

      {selectedNode && (
        <aside className="mm-detail" aria-live="polite">
          <button
            type="button"
            className="mm-detail-close"
            onClick={() => setSelected(null)}
            aria-label={t.close}
          >
            ×
          </button>
          <div className="mm-detail-head">
            <span className={`mm-ring mm-group-${TYPE_GROUP[selectedNode.type]}`}>
              <NodeIcon node={selectedNode} strokeWidth={1.5} />
            </span>
            <div>
              <span className={`mm-tag mm-group-${TYPE_GROUP[selectedNode.type]}`}>
                {TYPE_LABELS[lang][selectedNode.type]}
              </span>
              <h2 className="mm-detail-title">{titleOf(selectedNode.id)}</h2>
            </div>
          </div>
          <p className="mm-detail-text" lang="en">
            {selectedNode.description}
          </p>
          <div className="mm-chips">
            <span className="mm-chip">
              {nextLinks.length === 0 ? t.endOfRoute : `${num(nextLinks.length)} ${t.nextSteps}`}
            </span>
            {selectedNode.incoming > 1 && (
              <span className="mm-chip mm-chip-quiet">
                {num(selectedNode.incoming)} {t.waysIn}
              </span>
            )}
          </div>
          {nextLinks.length > 0 && (
            <ul className="mm-next" aria-label={t.nextSteps}>
              {nextLinks.map((link) => {
                const child = byId.get(link.to)!;
                return (
                  <li key={link.to}>
                    <button
                      type="button"
                      className={`mm-next-item mm-group-${TYPE_GROUP[child.type]}`}
                      onClick={() => open(pathKey([...selectedIds, link.to]), false)}
                    >
                      <span className="mm-next-icon">
                        <NodeIcon node={child} strokeWidth={1.7} />
                      </span>
                      {shortTitle(titleOf(link.to))}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {lang === "mr" && <p className="mm-detail-note">{t.englishNote}</p>}
          <div className="mm-detail-actions">
            <Link href={selectedNode.href} className="mm-button mm-button-solid">
              {t.readGuide} →
            </Link>
            <Link href={selectedNode.exploreHref} className="mm-button">
              {t.openExplorer}
            </Link>
          </div>
        </aside>
      )}

      <nav className="mm-rail" aria-label={t.railBrand}>
        <span className="mm-rail-brand">{t.railBrand}</span>
        <ol className="mm-rail-steps">
          {selectedIds.map((id, index) => {
            const isCurrent = index === selectedIds.length - 1;
            return (
              <li key={`${index}-${id}`}>
                <button
                  ref={isCurrent ? currentStepRef : undefined}
                  type="button"
                  className={`mm-step${isCurrent ? " mm-step-current" : ""}`}
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => open(pathKey(selectedIds.slice(0, index + 1)), false)}
                >
                  <span className="mm-step-number">{num(index + 1)}</span>
                  <span className="mm-step-title">{shortTitle(titleOf(id))}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mm-rail-arrows">
          <button
            type="button"
            className="mm-tool"
            onClick={stepBack}
            disabled={selectedIds.length < 2}
            aria-label={t.back}
          >
            ←
          </button>
          <button
            type="button"
            className="mm-tool"
            onClick={stepForward}
            disabled={!firstChild}
            aria-label={t.forward}
          >
            →
          </button>
        </div>
      </nav>
    </div>
  );
}
