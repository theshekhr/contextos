"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildGraph,
  type GraphLink,
  type GraphNode,
} from "@/lib/graph-builder";
import type { MemoryBlock, KnowledgeData } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  ChatGPT: "#10A37F",
  Claude: "#E8865A",
  Gemini: "#4285F4",
  Grok: "#888888",
  DeepSeek: "#4B9EFF",
  Perplexity: "#2DD4BF",
  Purpose: "#A78BFA",
  Tech: "#60A5FA",
  Decision: "#F59E0B",
  Completed: "#3ECF8E",
  Pending: "#888888",
  Blocker: "#F56565",
  Idea: "#E879A0",
  Architecture: "#888888",
};

function getColor(category?: string) {
  return CATEGORY_COLORS[category ?? ""] ?? "#707070";
}

export default function GraphView({
  memories,
  knowledge,
}: {
  memories: MemoryBlock[];
  knowledge: KnowledgeData | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const animationRef = useRef<number>(0);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const [transform, setTransform] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });

  const transformRef = useRef(transform);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const [dragging, setDragging] = useState<{
    node: GraphNode | null;
    panning: boolean;
  }>({
    node: null,
    panning: false,
  });

  const draggingRef = useRef(dragging);

  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);

  const selectedNodeRef = useRef(selectedNode);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  const lastMouse = useRef({
    x: 0,
    y: 0,
  });

  // Build graph whenever data changes
  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const { width, height } = container.getBoundingClientRect();

    const { nodes, links } = buildGraph(
      memories,
      knowledge,
      width,
      height
    );

    nodesRef.current = nodes;
    linksRef.current = links;
  }, [memories, knowledge]);

  const getNodeAt = useCallback(
    (screenX: number, screenY: number): GraphNode | null => {
      const canvas = canvasRef.current;

      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();

      const t = transformRef.current;

      const x = (screenX - rect.left - t.x) / t.scale;
      const y = (screenY - rect.top - t.y) / t.scale;
            for (const node of nodesRef.current) {
        const dx = node.x - x;
        const dy = node.y - y;

        if (Math.sqrt(dx * dx + dy * dy) <= node.size + 4) {
          return node;
        }
      }

      return null;
    },
    []
  );

  // -----------------------------
  // Canvas render loop
  // -----------------------------
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      const container = containerRef.current;

      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();

      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;

      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }

    resize();

    window.addEventListener("resize", resize);

    function tick() {
      const canvas = canvasRef.current;
      const container = containerRef.current;

      if (!canvas || !container) {
        animationRef.current = requestAnimationFrame(tick);
        return;
      }

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        animationRef.current = requestAnimationFrame(tick);
        return;
      }

      const rect = container.getBoundingClientRect();

      const nodes = nodesRef.current;
      const links = linksRef.current;

      const transform = transformRef.current;
      const dragging = draggingRef.current;
      const selectedNode = selectedNodeRef.current;

      const nodeMap = new Map<string, GraphNode>();

      for (const node of nodes) {
        nodeMap.set(node.id, node);
      }

      // -----------------------------
      // Force simulation
      // -----------------------------

      const repulsion = 1800;
      const damping = 0.85;
      const centerPull = 0.002;
      const springLength = 90;
      const springStrength = 0.02;

      const cx = rect.width / 2;
      const cy = rect.height / 2;

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];

        if (dragging.node?.id === a.id) continue;

        let fx = (cx - a.x) * centerPull;
        let fy = (cy - a.y) * centerPull;

        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;

          const b = nodes[j];

          const dx = a.x - b.x;
          const dy = a.y - b.y;

          const distSq = Math.max(dx * dx + dy * dy, 1);

          const force = repulsion / distSq;

          const dist = Math.sqrt(distSq);

          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }

        a.vx = (a.vx + fx) * damping;
        a.vy = (a.vy + fy) * damping;
      }

      for (const link of links) {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);

        if (!source || !target) continue;
                const dx = target.x - source.x;
        const dy = target.y - source.y;

        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

        const force = (dist - springLength) * springStrength;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (dragging.node?.id !== source.id) {
          source.vx += fx;
          source.vy += fy;
        }

        if (dragging.node?.id !== target.id) {
          target.vx -= fx;
          target.vy -= fy;
        }
      }

      for (const node of nodes) {
        if (dragging.node?.id === node.id) continue;

        node.x += node.vx * 0.05;
        node.y += node.vy * 0.05;
      }

      // -----------------------------
      // Render
      // -----------------------------

      ctx.setTransform(
        window.devicePixelRatio,
        0,
        0,
        window.devicePixelRatio,
        0,
        0
      );

      ctx.clearRect(0, 0, rect.width, rect.height);

      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);

      const connectedIds = selectedNode
        ? new Set(
            links
              .filter(
                (l) =>
                  l.source === selectedNode.id ||
                  l.target === selectedNode.id
              )
              .flatMap((l) => [l.source, l.target])
          )
        : null;

      // Draw links

      ctx.lineWidth = 1;

      for (const link of links) {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);

        if (!source || !target) continue;

        const highlight =
          !connectedIds ||
          connectedIds.has(link.source) ||
          connectedIds.has(link.target);

        ctx.strokeStyle = highlight
          ? "rgba(255,255,255,0.18)"
          : "rgba(255,255,255,0.04)";

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }

      // Draw nodes

      for (const node of nodes) {
        const dimmed =
          connectedIds &&
          !connectedIds.has(node.id) &&
          node.id !== selectedNode?.id;

        ctx.globalAlpha = dimmed ? 0.25 : 1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);

        ctx.fillStyle = getColor(node.category);
        ctx.fill();

        if (selectedNode?.id === node.id) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
        }

        if (
          node.type === "memory" ||
          node.id === selectedNode?.id
        ) {
          ctx.globalAlpha = dimmed ? 0.3 : 0.85;

          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "center";

          ctx.font =
            node.type === "memory"
              ? "600 11px Inter, sans-serif"
              : "10px Inter, sans-serif";

          const label =
            node.label.length > 28
              ? node.label.slice(0, 28) + "..."
              : node.label;

          ctx.fillText(
            label,
            node.x,
            node.y + node.size + 13
          );
        }

        ctx.globalAlpha = 1;
      }

      animationRef.current = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);
    // -----------------------------
  // Interaction handlers
  // -----------------------------

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const node = getNodeAt(e.clientX, e.clientY);

    lastMouse.current = {
      x: e.clientX,
      y: e.clientY,
    };

    if (node) {
      setDragging({
        node,
        panning: false,
      });

      setSelectedNode(node);
    } else {
      setDragging({
        node: null,
        panning: true,
      });
    }

    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;

    lastMouse.current = {
      x: e.clientX,
      y: e.clientY,
    };

    if (draggingRef.current.node) {
      draggingRef.current.node.x += dx / transformRef.current.scale;
      draggingRef.current.node.y += dy / transformRef.current.scale;

      draggingRef.current.node.vx = 0;
      draggingRef.current.node.vy = 0;

      return;
    }

    if (draggingRef.current.panning) {
      setTransform((t) => ({
        ...t,
        x: t.x + dx,
        y: t.y + dy,
      }));
    }
  }

  function handlePointerUp() {
    setDragging({
      node: null,
      panning: false,
    });
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();

    const scaleFactor = e.deltaY > 0 ? 0.92 : 1.08;

    setTransform((t) => ({
      ...t,
      scale: Math.min(
        Math.max(t.scale * scaleFactor, 0.3),
        3
      ),
    }));
  }

  // -----------------------------
  // UI
  // -----------------------------

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[var(--bg)]"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        className="h-full w-full cursor-grab active:cursor-grabbing"
      />

      {memories.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-[13px] text-[var(--text3)]">
            Save a memory to see your project graph come to life.
          </p>
        </div>
      )}

      {selectedNode && (
        <div className="absolute right-4 top-4 w-72 rounded-[10px] border border-[var(--border2)] bg-[var(--bg2)] p-4 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: getColor(selectedNode.category),
                }}
              />

              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text3)]">
                {selectedNode.type === "memory"
                  ? "Memory"
                  : selectedNode.category}
              </span>
            </div>

            <button
              onClick={() => setSelectedNode(null)}
              className="text-[var(--text3)] hover:text-[var(--text2)]"
            >
              ✕
            </button>
          </div>

          <p className="mt-2 text-[13px] leading-snug text-[var(--text)]">
            {selectedNode.label}
          </p>
        </div>
      )}

      <div className="absolute bottom-4 left-4 rounded-md border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-[11px] text-[var(--text3)]">
        Scroll to zoom · Drag nodes · Click nodes for details
      </div>
    </div>
  );
}