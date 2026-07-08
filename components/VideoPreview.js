'use client';

import { formatDuration } from '@/lib/video';

export default function VideoPreview({ frame, currentTime, totalDuration, isPlaying, onPlayPause }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="w-full aspect-video bg-black rounded-md border border-border overflow-hidden flex items-center justify-center">
        {frame ? (
          <img
            src={frame.image}
            alt={frame.timestamp}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-xs text-muted">No slides yet</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPlayPause}
          disabled={!frame}
          className="px-3 py-1.5 rounded-md bg-accent text-bg font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <span className="text-xs font-mono text-text">
          {formatDuration(currentTime)} / {formatDuration(totalDuration)}
        </span>
        {frame && <span className="text-xs font-mono text-accent">{frame.timestamp}</span>}
      </div>
    </div>
  );
}
