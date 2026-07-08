const MIN_SEGMENT_SECONDS = 0.5;
const DEFAULT_LAST_SEGMENT_SECONDS = 4;

function timestampToSeconds(ts) {
  const parts = ts.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

// Exported so segments merged/uploaded out of order (e.g. via file
// upload) can be sorted back into chronological order.
export function segmentStartSeconds(timestamp) {
  const dashIdx = timestamp.indexOf('-');
  const start = dashIdx === -1 ? timestamp : timestamp.slice(0, dashIdx);
  return timestampToSeconds(start);
}

// Ranges ("0:00-0:17") use their own span. Single timestamps run until the
// next segment starts; the final segment falls back to a fixed duration
// since there's no "next" timestamp to measure against.
export function computeSegmentDurations(segments) {
  return segments.map((seg, i) => {
    const dashIdx = seg.timestamp.indexOf('-');
    if (dashIdx !== -1) {
      const start = timestampToSeconds(seg.timestamp.slice(0, dashIdx));
      const end = timestampToSeconds(seg.timestamp.slice(dashIdx + 1));
      return Math.max(end - start, MIN_SEGMENT_SECONDS);
    }
    const start = timestampToSeconds(seg.timestamp);
    const next = segments[i + 1];
    if (next) {
      return Math.max(segmentStartSeconds(next.timestamp) - start, MIN_SEGMENT_SECONDS);
    }
    return DEFAULT_LAST_SEGMENT_SECONDS;
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load a generated image for the video.'));
    img.src = src;
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

function pickSupportedMimeType() {
  for (const type of MIME_CANDIDATES) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

const QUALITY_BITRATE = {
  low: 2_500_000,
  medium: 5_000_000,
  high: 8_000_000,
};

export function mimeTypeToExtension(mimeType) {
  const match = /video\/(\w+)/.exec(mimeType);
  return match ? match[1] : 'webm';
}

// "0:07.3" style timecode for the preview readout and timeline ruler.
export function formatDuration(totalSeconds) {
  const s = Math.max(0, totalSeconds || 0);
  const mins = Math.floor(s / 60);
  const secs = (s % 60).toFixed(1).padStart(4, '0');
  return `${mins}:${secs}`;
}

// Renders the generated (already 16:9-padded) images onto a canvas in
// sequence, each held for its segment's duration, capturing the canvas
// plus an optional uploaded audio track via MediaRecorder. Recording runs
// in real time (audio can't be sped up without changing pitch), so this
// takes roughly as long as the resulting video's duration.
//
// `durations` (seconds per frame) is optional — pass the caller's
// user-edited timings to override the timestamp-derived defaults; if
// omitted or mismatched in length, falls back to computeSegmentDurations.
export async function generateVideo({ segments, audioFile, quality = 'medium', durations, onProgress }) {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    throw new Error('This browser does not support recording video.');
  }

  const frames = segments.filter((s) => s.image);
  if (frames.length === 0) {
    throw new Error('No generated images to build a video from.');
  }

  const finalDurations =
    Array.isArray(durations) && durations.length === frames.length
      ? durations.map((d) => Math.max(Number(d) || MIN_SEGMENT_SECONDS, MIN_SEGMENT_SECONDS))
      : computeSegmentDurations(frames);
  const images = await Promise.all(frames.map((f) => loadImage(f.image)));

  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  const canvasStream = canvas.captureStream(30);
  const tracks = [...canvasStream.getVideoTracks()];

  let audioEl = null;
  let audioObjectUrl = null;
  if (audioFile) {
    audioObjectUrl = URL.createObjectURL(audioFile);
    audioEl = new Audio(audioObjectUrl);
    await new Promise((resolve, reject) => {
      audioEl.addEventListener('loadedmetadata', resolve, { once: true });
      audioEl.addEventListener(
        'error',
        () => reject(new Error('Could not read the uploaded audio file.')),
        { once: true }
      );
    });
    if (typeof audioEl.captureStream !== 'function') {
      URL.revokeObjectURL(audioObjectUrl);
      throw new Error('This browser cannot capture audio for video export. Try Chrome or Edge.');
    }
    const audioStream = audioEl.captureStream();
    tracks.push(...audioStream.getAudioTracks());
  }

  const combinedStream = new MediaStream(tracks);
  const mimeType = pickSupportedMimeType();
  const recorderOptions = { videoBitsPerSecond: QUALITY_BITRATE[quality] || QUALITY_BITRATE.medium };
  if (mimeType) recorderOptions.mimeType = mimeType;

  const recorder = new MediaRecorder(combinedStream, recorderOptions);
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise((resolve) => {
    recorder.onstop = resolve;
  });

  recorder.start();
  if (audioEl) {
    await audioEl.play().catch(() => {});
  }

  let elapsed = 0;
  for (let i = 0; i < images.length; i++) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(images[i], 0, 0, canvas.width, canvas.height);
    onProgress?.({ current: i + 1, total: images.length });
    await sleep(finalDurations[i] * 1000);
    elapsed += finalDurations[i];
  }

  if (audioEl && audioEl.duration > elapsed) {
    await sleep((audioEl.duration - elapsed) * 1000);
  }

  recorder.stop();
  if (audioEl) {
    audioEl.pause();
    URL.revokeObjectURL(audioObjectUrl);
  }
  await stopped;

  return { blob: new Blob(chunks, { type: mimeType || 'video/webm' }), mimeType: mimeType || 'video/webm' };
}
