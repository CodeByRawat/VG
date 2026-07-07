'use client';

export default function SegmentCard({
  segment,
  onPromptChange,
  onRewrite,
  onGenerateImage,
  onDownload,
}) {
  const { timestamp, narration, prompt, isRewriting, status, error, image } = segment;
  const isGenerating = status === 'generating';

  return (
    <div className="bg-panel border border-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="inline-block px-2 py-0.5 rounded-md bg-bg border border-border text-accent text-xs font-mono">
          {timestamp}
        </span>
        {status === 'generating' && (
          <span className="text-xs text-muted">Generating…</span>
        )}
        {status === 'error' && <span className="text-xs text-red-400">Failed</span>}
        {status === 'done' && <span className="text-xs text-accent">Done</span>}
      </div>

      <p className="text-xs text-muted line-clamp-3">{narration}</p>

      <div>
        <label className="block text-xs text-muted mb-1">Visual prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(timestamp, e.target.value)}
          rows={3}
          placeholder="Describe the scene to draw..."
          className="w-full px-3 py-2 rounded-md border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent resize-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onRewrite(timestamp)}
          disabled={isRewriting}
          className="text-xs px-3 py-1.5 rounded-md border border-border text-text hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRewriting ? 'Rewriting…' : 'Rewrite this line'}
        </button>

        <button
          type="button"
          onClick={() => onGenerateImage(timestamp)}
          disabled={!prompt || !prompt.trim() || isGenerating}
          className="text-xs px-3 py-1.5 rounded-md bg-accent text-bg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating…' : image ? 'Regenerate image' : 'Generate image'}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {image && (
        <div className="flex flex-col gap-2">
          <img
            src={image}
            alt={`Illustration for ${timestamp}`}
            className="w-full rounded-md border border-border"
          />
          <button
            type="button"
            onClick={() => onDownload(segment)}
            className="text-xs px-3 py-1.5 rounded-md bg-accent text-bg font-semibold self-start"
          >
            Download
          </button>
        </div>
      )}
    </div>
  );
}
