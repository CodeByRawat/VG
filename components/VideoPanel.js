'use client';

import { useEffect, useRef, useState } from 'react';
import Timeline from '@/components/Timeline';
import VideoPreview from '@/components/VideoPreview';

function frameIndexAtTime(time, durations) {
  let acc = 0;
  for (let i = 0; i < durations.length; i++) {
    acc += durations[i];
    if (time < acc || i === durations.length - 1) return i;
  }
  return 0;
}

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

  const audioElRef = useRef(null);
  const seekTargetRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Keep the hidden <audio> element's source in sync with the uploaded file.
  useEffect(() => {
    if (!audioFile) return undefined;
    const url = URL.createObjectURL(audioFile);
    if (audioElRef.current) audioElRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [audioFile]);

  // Stop playback if the frame list shrinks/changes underneath us.
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime((t) => Math.min(t, totalVideoDuration));
  }, [frames.length, totalVideoDuration]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    let rafId;
    let last = performance.now();
    let localTime = currentTime;

    function loop(now) {
      const dt = (now - last) / 1000;
      last = now;

      if (seekTargetRef.current !== null) {
        localTime = seekTargetRef.current;
        seekTargetRef.current = null;
      } else if (audioFile && audioElRef.current) {
        localTime = audioElRef.current.currentTime;
      } else {
        localTime += dt;
      }

      if (localTime >= totalVideoDuration) {
        setCurrentTime(totalVideoDuration);
        setIsPlaying(false);
        audioElRef.current?.pause();
        return;
      }
      setCurrentTime(localTime);
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  function handleSeek(time) {
    const clamped = Math.min(Math.max(time, 0), totalVideoDuration);
    setCurrentTime(clamped);
    seekTargetRef.current = clamped;
    if (audioElRef.current) audioElRef.current.currentTime = clamped;
  }

  function handlePlayPause() {
    if (isPlaying) {
      audioElRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    if (audioFile && audioElRef.current) {
      audioElRef.current.currentTime = currentTime >= totalVideoDuration ? 0 : currentTime;
      audioElRef.current.play().catch(() => {});
    }
    if (currentTime >= totalVideoDuration) setCurrentTime(0);
    setIsPlaying(true);
  }

  const currentFrame = frames.length > 0 ? frames[frameIndexAtTime(currentTime, durations)] : null;

  return (
    <div className="flex flex-col gap-4">
      <audio ref={audioElRef} className="hidden" />

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
          <VideoPreview
            frame={currentFrame}
            currentTime={currentTime}
            totalDuration={totalVideoDuration}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs text-muted">
              Slide timing — drag a handle to resize slides, click/drag the ruler to scrub
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

          <Timeline
            frames={frames}
            durations={durations}
            onDurationPairChange={onDurationPairChange}
            audioFile={audioFile}
            currentTime={currentTime}
            onSeek={handleSeek}
          />

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
