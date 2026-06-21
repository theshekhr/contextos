"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function ResizablePanel({
  children,
  defaultWidth = 288,
  minWidth = 220,
  maxWidth = 480,
}: {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}) {
  const [width, setWidth] = useState(defaultWidth);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(defaultWidth);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startX.current = e.clientX;
      startWidth.current = width;
      setDragging(true);
    },
    [width]
  );

  useEffect(() => {
    if (!dragging) return;

    function handleMouseMove(e: MouseEvent) {
      // Dragging left increases width since the handle is on the left edge
      const delta = startX.current - e.clientX;
      const next = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
      setWidth(next);
    }

    function handleMouseUp() {
      setDragging(false);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, minWidth, maxWidth]);

  return (
    <div className="relative flex h-full" style={{ width }}>
      <div
        onMouseDown={handleMouseDown}
        className={`absolute left-0 top-0 z-10 h-full w-1 -translate-x-1/2 cursor-col-resize ${
          dragging ? "bg-[var(--accent)]" : "hover:bg-[var(--accent)]/40"
        }`}
      />
      <div className="h-full w-full overflow-hidden">{children}</div>
    </div>
  );
}