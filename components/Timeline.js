'use client';

import { useCallback, useRef, useState } from 'react';
import AudioWaveform from '@/components/AudioWaveform';
import { formatDuration } from '@/lib/video';

const MIN_SEGMENT_SECONDS = 0.3;
const MIN_BLOCK_PX = 32;
const NICE_TICK_INTERVALS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900];

function pickTickInterval(total) {
  const target = total / 8;
  return NICE_TICK_INTERVALS.find((n) => n >= target) || NICE_TICK_INTERVALS[NICE_TICK_INTERVALS.length - 1];
}

// A scrubbable NLE-style timeline: a time ruler, a filmstrip of
// proportionally-sized slide thumbnails (with drag handles between
// adjacent slides to resize them), an optional audio waveform track
// underneath, and a draggable playhead — all sharing one horizontal
// time-to-pixel mapping so everything stays aligned, including while
// scrolling a long (many-slide) timeline.
export default function Timeline({
  frames,
  durations,
  onDurationPairChange,
  audioFile,
  currentTime,
  onSeek,
}) {
  const containerRef = useRef(null);
  const dragState = useRef(null);
  const scrubbing = useRef(false);
  const [draggingIndex, setDraggingIndex] = useState(null);

  const total = durations.reduce((a, b) => a + b, 0) || 1;
  const tickInterval = pickTickInterval(total);
  const ticks = [];
  for (let t = 0; t <= total; t += tickInterval) ticks.push(t);

  const seekFromClientX = useCallback(
    (clientX) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      onSeek(ratio * total);
    },
    [onSeek, total]
  );

  const handleContainerPointerDown = useCallback(
    (e) => {
      scrubbing.current = true;
      seekFromClientX(e.clientX);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [seekFromClientX]
  );
  const handleContainerPointerMove = useCallback(
    (e) => {
      if (!scrubbing.current) return;
      seekFromClientX(e.clientX);
    },
    [seekFromClientX]
  );
  const handleContainerPointerUp = useCallback(() => {
    scrubbing.current = false;
  }, []);

  const handleHandlePointerDown = useCallback(
    (index) => (e) => {
      e.preventDefault();
      e.stopPropagation();
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

  const handleHandlePointerMove = useCallback(
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

  const handleHandlePointerUp = useCallback(() => {
    dragState.current = null;
    setDraggingIndex(null);
  }, []);

  return (
    <div className="w-full overflow-x-auto rounded-md border border-border">
      <div
        ref={containerRef}
        className="relative select-none cursor-pointer"
        style={{ minWidth: `${frames.length * MIN_BLOCK_PX}px` }}
        onPointerDown={handleContainerPointerDown}
        onPointerMove={handleContainerPointerMove}
        onPointerUp={handleContainerPointerUp}
        onPointerCancel={handleContainerPointerUp}
      >
        {/* Ruler */}
        <div className="relative h-5 border-b border-border bg-panel">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute top-0.5 text-[9px] text-muted font-mono"
              style={{ left: `${(t / total) * 100}%` }}
            >
              {formatDuration(t)}
            </span>
          ))}
        </div>

        {/* Filmstrip */}
        <div className="relative h-16 flex">
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
                  onPointerDown={handleHandlePointerDown(i)}
                  onPointerMove={handleHandlePointerMove}
                  onPointerUp={handleHandlePointerUp}
                  onPointerCancel={handleHandlePointerUp}
                  className="absolute top-0 -right-1.5 w-3 h-full cursor-col-resize z-20 flex items-center justify-center touch-none"
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

        {/* Waveform */}
        {audioFile && (
          <div className="relative h-12 border-t border-border bg-bg">
            <AudioWaveform audioFile={audioFile} className="w-full h-full block" />
          </div>
        )}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none"
          style={{ left: `${(Math.min(currentTime, total) / total) * 100}%` }}
        >
          <div className="absolute -top-0.5 -left-[5px] w-[11px] h-2.5 bg-red-500" />
        </div>
      </div>
    </div>
  );
}
