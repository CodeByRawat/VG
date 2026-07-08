'use client';

import { useCallback, useRef, useState } from 'react';

const MIN_SEGMENT_SECONDS = 0.3;
const MIN_BLOCK_PX = 32;

// A horizontal filmstrip: each slide is a proportionally-sized block
// showing its thumbnail. Dragging the handle between two adjacent
// blocks lengthens one and shortens the other by the same amount, so
// the overall timeline length (and therefore audio sync) never drifts
// from a drag — only numeric edits change the total.
export default function Timeline({ frames, durations, onDurationPairChange }) {
  const containerRef = useRef(null);
  const dragState = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);

  const total = durations.reduce((a, b) => a + b, 0) || 1;

  const handlePointerDown = useCallback(
    (index) => (e) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const widthPx = container.getBoundingClientRect().width;
      dragState.current = {
        index,
        startX: e.clientX,
        pixelsPerSecond: widthPx / total,
        startA: durations[index],
        startB: durations[index + 1],
      };
      setDraggingIndex(index);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [durations, total]
  );

  const handlePointerMove = useCallback(
    (e) => {
      const drag = dragState.current;
      if (!drag) return;
      const deltaSec = (e.clientX - drag.startX) / drag.pixelsPerSecond;
      const pairTotal = drag.startA + drag.startB;
      let newA = drag.startA + deltaSec;
      newA = Math.max(MIN_SEGMENT_SECONDS, Math.min(pairTotal - MIN_SEGMENT_SECONDS, newA));
      const newB = pairTotal - newA;
      onDurationPairChange(drag.index, Math.round(newA * 10) / 10, Math.round(newB * 10) / 10);
    },
    [onDurationPairChange]
  );

  const handlePointerUp = useCallback(() => {
    dragState.current = null;
    setDraggingIndex(null);
  }, []);

  return (
    <div className="w-full overflow-x-auto rounded-md border border-border">
      <div
        ref={containerRef}
        className="relative h-16 flex select-none"
        style={{ minWidth: `${frames.length * MIN_BLOCK_PX}px` }}
      >
        {frames.map((f, i) => (
          <div
            key={f.timestamp}
            className="relative h-full border-r border-bg last:border-r-0 flex-shrink-0 bg-cover bg-center"
            style={{
              width: `${(durations[i] / total) * 100}%`,
              backgroundImage: `url(${f.image})`,
            }}
          >
            <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-[10px] text-accent font-mono px-1 py-0.5 truncate">
              {f.timestamp} · {durations[i].toFixed(1)}s
            </span>

            {i < frames.length - 1 && (
              <div
                onPointerDown={handlePointerDown(i)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="absolute top-0 -right-1.5 w-3 h-full cursor-col-resize z-10 flex items-center justify-center touch-none"
              >
                <div
                  className={`w-1 h-full rounded ${
                    draggingIndex === i ? 'bg-accent' : 'bg-white/40 hover:bg-accent'
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
