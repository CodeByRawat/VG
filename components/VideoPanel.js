'use client';

export default function VideoPanel({
  hasAnyImage,
  onImagesUpload,
  audioFile,
  onAudioChange,
  onGenerate,
  isGenerating,
  progress,
  videoUrl,
  videoExtension,
  error,
}) {
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
