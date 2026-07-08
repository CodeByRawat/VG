'use client';

import Timeline from '@/components/Timeline';

export default function VideoPanel({
  hasAnyImage,
  onImagesUpload,
  audioFile,
  onAudioChange,
  audioDuration,
  frames,
  durations,
  defaultDurations,
  totalVideoDuration,
  onDurationChange,
  onResetDuration,
  onDurationPairChange,
  onResetAllDurations,
  onGenerate,
  isGenerating,
  progress,
  videoUrl,
  videoExtension,
  error,
}) {
  const diff = audioDuration != null ? totalVideoDuration - audioDuration : null;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-xs text-muted mb-1">
          Upload images (no need to generate again — matched by their downloaded filename,
          e.g. "0-07.png" or "0-00-0-17.png")
        </label>
        <input
          type="file"
          accept="image/png,image/*"
          multiple
          onChange={(e) => {
            onImagesUpload(e.target.files);
            e.target.value = '';
          }}
          className="block w-full text-sm text-text file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-border file:bg-bg file:text-text file:text-sm file:cursor-pointer hover:file:border-accent"
        />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Voice-over audio (optional)</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => onAudioChange(e.target.files?.[0] || null)}
          className="block w-full text-sm text-text file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-border file:bg-bg file:text-text file:text-sm file:cursor-pointer hover:file:border-accent"
        />
        {audioFile && <p className="text-xs text-muted mt-1">{audioFile.name}</p>}
      </div>

      {frames && frames.length > 0 && (
        <div className="border-t border-border pt-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs text-muted">
              Slide timing — drag a handle on the timeline, or edit a number below
            </label>
            <span className="text-xs text-muted flex items-center gap-2">
              Total: {totalVideoDuration.toFixed(1)}s
              {diff !== null && (
                <>
                  {' · Audio: '}
                  {audioDuration.toFixed(1)}s{' '}
                  {Math.abs(diff) < 0.15 ? (
                    <span className="text-accent">(matched)</span>
                  ) : diff > 0 ? (
                    <span className="text-red-400">({diff.toFixed(1)}s longer than audio)</span>
                  ) : (
                    <span className="text-red-400">({Math.abs(diff).toFixed(1)}s shorter than audio)</span>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={onResetAllDurations}
                className="text-muted hover:text-accent underline decoration-dotted"
              >
                Reset all
              </button>
            </span>
          </div>

          <Timeline frames={frames} durations={durations} onDurationPairChange={onDurationPairChange} />

          <div className="max-h-72 overflow-y-auto flex flex-col gap-2 pr-1">
            {frames.map((f, i) => {
              const isOverridden = typeof f.durationOverride === 'number' && f.durationOverride > 0;
              const effective = durations[i];
              return (
                <div
                  key={f.timestamp}
                  className="flex items-center gap-3 bg-bg border border-border rounded-md p-2"
                >
                  <img
                    src={f.image}
                    alt={f.timestamp}
                    className="w-14 h-8 object-cover rounded border border-border flex-shrink-0"
                  />
                  <span className="text-xs font-mono text-accent w-20 flex-shrink-0">
                    {f.timestamp}
                  </span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    defaultValue={effective}
                    key={`${f.timestamp}-${effective}`}
                    onChange={(e) => onDurationChange(f.timestamp, e.target.value)}
                    className="w-20 px-2 py-1 rounded-md border border-border text-sm text-text bg-bg focus:outline-none focus:border-accent"
                  />
                  <span className="text-xs text-muted">sec</span>
                  {isOverridden && (
                    <button
                      type="button"
                      onClick={() => onResetDuration(f.timestamp)}
                      className="text-xs text-muted hover:text-accent ml-auto"
                    >
                      Reset (auto: {defaultDurations[i]}s)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onGenerate}
        disabled={!hasAnyImage || isGenerating}
        className="self-start px-4 py-2 rounded-md bg-accent text-bg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? 'Rendering video...' : 'Combine images into video'}
      </button>

      {isGenerating && (
        <p className="text-xs text-muted">
          {progress.total > 0
            ? `Drawing frame ${progress.current} of ${progress.total}, then holding for audio to finish…`
            : 'Preparing…'}
        </p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {videoUrl && (
        <div className="flex flex-col gap-2">
          <video src={videoUrl} controls className="w-full rounded-md border border-border" />
          <a
            href={videoUrl}
            download={`script-video.${videoExtension}`}
            className="self-start text-xs px-3 py-1.5 rounded-md bg-accent text-bg font-semibold"
          >
            Download video
          </a>
        </div>
      )}
    </div>
  );
}
