"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  layoutMindMap,
  MIND_SIZES,
  PATH_SEPARATOR,
  pathIds,
  pathKey,
  routeTo,
  type LaidNode,
  type MindMapModel,
  type MindNode,
} from "@/lib/v2/mind-map";
import type { V2NodeType } from "@/lib/v2/types";
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

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const LANG_KEY = "career-tree-mindmap-lang";
const LANG_EVENT = "career-tree-mindmap-lang";
const NARROW_QUERY = "(max-width: 760px)";
/** Below this width the map opens to the right only, clear of the header. */
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
  const sides: 1 | 2 = compact ? 1 : 2;
  const t = STRINGS[lang];

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [gliding, setGliding] = useState(true);
  const [query, setQuery] = useState("");

  const homeView = useMemo<View>(
    () =>
      narrow
        ? { cx: MIND_SIZES.root.width / 2 + MIND_SIZES.gapX, cy: 0, k: 0.78 }
        : // Two-sided: nudge the map right so the left branches clear the header.
          compact
          ? { cx: 0, cy: 0, k: 0.85 }
          : { cx: -130, cy: 0, k: 1 },
    [narrow, compact],
  );
  const current = view ?? homeView;

  const layout = useMemo(
    () => layoutMindMap(byId, rootId, expanded, sides),
    [byId, rootId, expanded, sides],
  );

  const num = useCallback(
    (value: number) => value.toLocaleString(lang === "mr" ? "mr-IN-u-nu-deva" : "en-IN"),
    [lang],
  );
  const titleOf = useCallback(
    (id: string) => (lang === "mr" && MARATHI_TITLES[id]) || byId.get(id)?.title || id,
    [byId, lang],
  );

  const focusOn = useCallback(
    (key: string, nextExpanded: ReadonlySet<string>) => {
      const next = layoutMindMap(byId, rootId, nextExpanded, sides);
      const node = next.nodes.find((item) => item.key === key);
      if (!node) return;
      let cx = node.x;
      if (node.depth === 0) {
        cx = homeView.cx;
      } else if (node.expanded) {
        const toChildren = node.width / 2 + MIND_SIZES.gapX + MIND_SIZES.leaf.width / 2;
        cx += node.side * toChildren * (narrow ? 0.72 : 0.5);
      }
      setGliding(true);
      setView((previous) => {
        const base = previous ?? homeView;
        return { cx, cy: node.y, k: base.k < 0.6 ? 0.85 : base.k };
      });
    },
    [byId, rootId, sides, homeView, narrow],
  );

  /** Select a card; `toggle` lets a second tap on the selected card fold it. */
  const open = useCallback(
    (key: string, toggle: boolean) => {
      const ids = pathIds(key);
      const node = byId.get(ids[ids.length - 1]);
      if (!node) return;
      const hasChildren = node.children.some((link) => !ids.includes(link.to));
      const inside = `${key}${PATH_SEPARATOR}`;
      const folding = toggle && selected === key && expanded.has(key);
      const next = new Set<string>();
      for (const item of expanded) {
        const onThisBranch = key.startsWith(`${item}${PATH_SEPARATOR}`) || item === key || item.startsWith(inside);
        if (keepOpen || onThisBranch) next.add(item);
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
    [byId, expanded, focusOn, keepOpen, selected],
  );

  const reset = useCallback(() => {
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
  const selectedLaid = selected ? layout.nodes.find((node) => node.key === selected) : undefined;
  const onPath = useCallback(
    (key: string) =>
      selected !== null && (key === selected || selected.startsWith(`${key}${PATH_SEPARATOR}`)),
    [selected],
  );

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
    <div className="mm" lang={lang === "mr" ? "mr" : "en"} data-lang={lang} data-sides={sides}>
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
          className={`mm-world${gliding ? " mm-gliding" : ""}`}
          style={{
            transform: `scale(${current.k}) translate(${-current.cx}px, ${-current.cy}px)`,
          }}
        >
          <svg className="mm-links" aria-hidden="true" width="1" height="1">
            {layout.links.map((link) => {
              const mid = (link.x1 + link.x2) / 2;
              return (
                <path
                  key={link.key}
                  className={`mm-link mm-link-${link.edgeType}${link.common ? " mm-link-common" : ""}${onPath(link.toKey) ? " mm-link-active" : ""}`}
                  d={`M ${link.x1} ${link.y1} C ${mid} ${link.y1}, ${mid} ${link.y2}, ${link.x2} ${link.y2}`}
                />
              );
            })}
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
                  node.side === -1 ? "mm-left" : "mm-right",
                  isSelected ? "mm-selected" : "",
                  !isSelected && onPath(node.key) ? "mm-on-path" : "",
                ].join(" ")}
                style={{
                  width: node.width,
                  height: node.height,
                  transform: `translate(${node.x - node.width / 2}px, ${node.y - node.height / 2}px)`,
                }}
                aria-expanded={node.childCount > 0 ? node.expanded : undefined}
                aria-current={isSelected ? "true" : undefined}
                title={data.title}
                onClick={() => cardClick(node)}
              >
                <span className="mm-node-body">
                  {node.depth > 0 && (
                    <span className="mm-node-type">{TYPE_LABELS[lang][data.type]}</span>
                  )}
                  <span className="mm-node-title">
                    {node.depth === 0 ? <mark>{titleOf(node.id)}</mark> : titleOf(node.id)}
                  </span>
                </span>
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
        <div className="mm-chips">
          <span className="mm-chip">
            {num(model.nodeCount)} {t.stops}
          </span>
          <span className="mm-chip">
            {num(model.edgeCount)} {t.links}
          </span>
        </div>
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
        <p className="mm-hint">{t.hint}</p>
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
          className={`mm-tool mm-tool-wide${keepOpen ? " mm-tool-on" : ""}`}
          aria-pressed={keepOpen}
          onClick={() => setKeepOpen((value) => !value)}
        >
          {t.keepOpen}
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
          <span className={`mm-tag mm-group-${TYPE_GROUP[selectedNode.type]}`}>
            {TYPE_LABELS[lang][selectedNode.type]}
          </span>
          <h2 className="mm-detail-title">{titleOf(selectedNode.id)}</h2>
          <p className="mm-detail-text" lang="en">
            {selectedNode.description}
          </p>
          <div className="mm-chips">
            <span className="mm-chip">
              {selectedNode.children.length === 0
                ? t.endOfRoute
                : `${num(selectedLaid?.childCount ?? selectedNode.children.length)} ${t.nextSteps}`}
            </span>
            {selectedNode.incoming > 1 && (
              <span className="mm-chip mm-chip-quiet">
                {num(selectedNode.incoming)} {t.waysIn}
              </span>
            )}
          </div>
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
                  <span className="mm-step-title">{titleOf(id)}</span>
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
