'use client';

import { useState } from 'react';
import PasswordGate from '@/components/PasswordGate';
import StepPanel from '@/components/StepPanel';
import SegmentCard from '@/components/SegmentCard';
import ProgressBar from '@/components/ProgressBar';
import VideoPanel from '@/components/VideoPanel';
import { parseScript, timestampToFilename, filenameToTimestamp } from '@/lib/parseScript';
import { STYLE_PREFIX } from '@/lib/constants';
import { padImageTo16x9, dataUrlToBase64 } from '@/lib/composite';
import { generateVideo, mimeTypeToExtension, segmentStartSeconds } from '@/lib/video';
import { parseCsv } from '@/lib/csv';

const QUALITIES = ['low', 'medium', 'high'];

const CSV_TIMESTAMP_KEYS = ['timestamp'];
const CSV_NARRATION_KEYS = ['narration_text', 'narration', 'text', 'script'];
const CSV_PROMPT_KEYS = ['image_prompt', 'prompt', 'visual_prompt', 'scene', 'scene_description'];

function pickCsvField(row, keys) {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return '';
}

export default function AppShell({ passwordRequired, initialAuthed }) {
  const [authed, setAuthed] = useState(initialAuthed);

  const [scriptText, setScriptText] = useState('');
  const [segments, setSegments] = useState([]);
  const [quality, setQuality] = useState('medium');

  const [isWritingPrompts, setIsWritingPrompts] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [globalError, setGlobalError] = useState(null);

  const [audioFile, setAudioFile] = useState(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState({ current: 0, total: 0 });
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoExtension, setVideoExtension] = useState('webm');
  const [videoError, setVideoError] = useState(null);

  if (passwordRequired && !authed) {
    return <PasswordGate onSuccess={() => setAuthed(true)} />;
  }

  function handleParse() {
    setGlobalError(null);
    const parsed = parseScript(scriptText);
    if (parsed.length === 0) {
      setGlobalError('No timestamps found in the script.');
      return;
    }
    setSegments(
      parsed.map((seg) => ({
        ...seg,
        prompt: '',
        image: null,
        status: 'idle',
        error: null,
        isRewriting: false,
      }))
    );
  }

  async function handleImportCsv(file) {
    if (!file) return;
    setGlobalError(null);

    let text;
    try {
      text = await file.text();
    } catch {
      setGlobalError('Failed to read that file.');
      return;
    }

    const rows = parseCsv(text);
    if (rows.length === 0) {
      setGlobalError('That CSV had no data rows.');
      return;
    }

    const imported = [];
    const skippedRows = [];
    rows.forEach((row, idx) => {
      const timestamp = pickCsvField(row, CSV_TIMESTAMP_KEYS);
      if (!timestamp) {
        skippedRows.push(idx + 2); // +1 for header row, +1 for 1-indexing
        return;
      }
      imported.push({
        timestamp,
        narration: pickCsvField(row, CSV_NARRATION_KEYS),
        prompt: pickCsvField(row, CSV_PROMPT_KEYS),
        image: null,
        status: 'idle',
        error: null,
        isRewriting: false,
      });
    });

    if (imported.length === 0) {
      setGlobalError('No rows had a "timestamp" column value — check the CSV headers.');
      return;
    }

    imported.sort((a, b) => segmentStartSeconds(a.timestamp) - segmentStartSeconds(b.timestamp));
    setSegments(imported);

    if (skippedRows.length > 0) {
      setGlobalError(
        `Imported ${imported.length} segment(s). Skipped row(s) missing a timestamp: ${skippedRows.join(', ')}`
      );
    }
  }

  async function handleAutoWritePrompts() {
    if (segments.length === 0) return;
    setGlobalError(null);
    setIsWritingPrompts(true);
    try {
      const res = await fetch('/api/write-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: segments.map((s) => ({ timestamp: s.timestamp, narration: s.narration })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || 'Failed to write prompts.');
        return;
      }
      setSegments((prev) =>
        prev.map((seg) => {
          const found = data.prompts.find((p) => p.timestamp === seg.timestamp);
          return found ? { ...seg, prompt: found.prompt } : seg;
        })
      );
    } catch (err) {
      setGlobalError('Network error while writing prompts.');
    } finally {
      setIsWritingPrompts(false);
    }
  }

  function handlePromptChange(timestamp, value) {
    setSegments((prev) =>
      prev.map((seg) => (seg.timestamp === timestamp ? { ...seg, prompt: value } : seg))
    );
  }

  async function handleRewriteOne(timestamp) {
    const target = segments.find((s) => s.timestamp === timestamp);
    if (!target) return;

    setSegments((prev) =>
      prev.map((seg) => (seg.timestamp === timestamp ? { ...seg, isRewriting: true } : seg))
    );

    try {
      const otherPrompts = segments
        .filter((s) => s.timestamp !== timestamp && s.prompt)
        .map((s) => ({ timestamp: s.timestamp, prompt: s.prompt }));

      const res = await fetch('/api/write-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rewrite: { timestamp, narration: target.narration, otherPrompts },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || 'Failed to rewrite prompt.');
        return;
      }
      setSegments((prev) =>
        prev.map((seg) =>
          seg.timestamp === timestamp ? { ...seg, prompt: data.prompt } : seg
        )
      );
    } catch (err) {
      setGlobalError('Network error while rewriting prompt.');
    } finally {
      setSegments((prev) =>
        prev.map((seg) => (seg.timestamp === timestamp ? { ...seg, isRewriting: false } : seg))
      );
    }
  }

  async function generateImageForSegment(seg) {
    setSegments((prev) =>
      prev.map((s) => (s.timestamp === seg.timestamp ? { ...s, status: 'generating', error: null } : s))
    );

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: STYLE_PREFIX + seg.prompt,
          quality,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSegments((prev) =>
          prev.map((s) =>
            s.timestamp === seg.timestamp
              ? { ...s, status: 'error', error: data.error || 'Generation failed' }
              : s
          )
        );
        return;
      }
      const padded = await padImageTo16x9(data.image);
      setSegments((prev) =>
        prev.map((s) => (s.timestamp === seg.timestamp ? { ...s, status: 'done', image: padded } : s))
      );
    } catch (err) {
      setSegments((prev) =>
        prev.map((s) =>
          s.timestamp === seg.timestamp
            ? { ...s, status: 'error', error: err.message || 'Network error' }
            : s
        )
      );
    }
  }

  async function handleGenerateAll() {
    if (segments.length === 0) return;
    setGlobalError(null);
    setIsGeneratingAll(true);
    setProgress({ current: 0, total: segments.length });

    for (let i = 0; i < segments.length; i++) {
      await generateImageForSegment(segments[i]);
      setProgress({ current: i + 1, total: segments.length });
    }

    setIsGeneratingAll(false);
  }

  async function handleGenerateOne(timestamp) {
    const seg = segments.find((s) => s.timestamp === timestamp);
    if (!seg || !seg.prompt || !seg.prompt.trim()) return;
    setGlobalError(null);
    await generateImageForSegment(seg);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  async function handleUploadImages(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setGlobalError(null);

    const filesByName = new Map(files.map((f) => [f.name.toLowerCase(), f]));
    const matches = [];
    for (const seg of segments) {
      const expectedName = `${timestampToFilename(seg.timestamp)}.png`.toLowerCase();
      const file = filesByName.get(expectedName);
      if (file) matches.push({ timestamp: seg.timestamp, file });
    }

    const matchedNames = new Set(matches.map((m) => m.file.name.toLowerCase()));
    const unmatched = files.filter((f) => !matchedNames.has(f.name.toLowerCase())).map((f) => f.name);

    if (matches.length === 0) {
      setGlobalError(
        'None of the uploaded files matched a segment\'s expected filename (e.g. "0-07.png"). Make sure the script is parsed first and the original filenames are unchanged.'
      );
      return;
    }

    const loaded = await Promise.all(
      matches.map(async (m) => ({ timestamp: m.timestamp, dataUrl: await readFileAsDataUrl(m.file) }))
    );

    setSegments((prev) =>
      prev.map((seg) => {
        const found = loaded.find((l) => l.timestamp === seg.timestamp);
        return found ? { ...seg, image: found.dataUrl, status: 'done', error: null } : seg;
      })
    );

    if (unmatched.length > 0) {
      setGlobalError(
        `Loaded ${matches.length} image(s). These files didn't match any segment: ${unmatched.join(', ')}`
      );
    }
  }

  // Standalone path for the video step: reconstructs each segment's
  // timestamp directly from its filename, so images can be dropped in
  // without ever pasting or parsing a script.
  async function handleUploadImagesForVideo(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setGlobalError(null);

    const parsedFiles = files.map((file) => ({
      file,
      timestamp: filenameToTimestamp(file.name.replace(/\.[^/.]+$/, '')),
    }));
    const recognized = parsedFiles.filter((p) => p.timestamp);
    const unrecognized = parsedFiles.filter((p) => !p.timestamp).map((p) => p.file.name);

    if (recognized.length === 0) {
      setGlobalError(
        'None of the uploaded filenames looked like a timestamp (expected something like "0-07.png" or "0-00-0-17.png").'
      );
      return;
    }

    const loaded = await Promise.all(
      recognized.map(async (p) => ({ timestamp: p.timestamp, dataUrl: await readFileAsDataUrl(p.file) }))
    );

    setSegments((prev) => {
      const next = [...prev];
      loaded.forEach(({ timestamp, dataUrl }) => {
        const existingIndex = next.findIndex((s) => s.timestamp === timestamp);
        if (existingIndex !== -1) {
          next[existingIndex] = { ...next[existingIndex], image: dataUrl, status: 'done', error: null };
        } else {
          next.push({
            timestamp,
            narration: '',
            prompt: '',
            image: dataUrl,
            status: 'done',
            error: null,
            isRewriting: false,
          });
        }
      });
      next.sort((a, b) => segmentStartSeconds(a.timestamp) - segmentStartSeconds(b.timestamp));
      return next;
    });

    if (unrecognized.length > 0) {
      setGlobalError(
        `Loaded ${loaded.length} image(s). These filenames weren't recognized as timestamps: ${unrecognized.join(', ')}`
      );
    }
  }

  function handleDownloadOne(segment) {
    const link = document.createElement('a');
    link.href = segment.image;
    link.download = `${timestampToFilename(segment.timestamp)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleDownloadZip() {
    const withImages = segments.filter((s) => s.image);
    if (withImages.length === 0) return;

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    withImages.forEach((seg) => {
      zip.file(`${timestampToFilename(seg.timestamp)}.png`, dataUrlToBase64(seg.image), {
        base64: true,
      });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'script-images.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleGenerateVideo() {
    setVideoError(null);
    setIsGeneratingVideo(true);
    setVideoProgress({ current: 0, total: 0 });
    try {
      const { blob, mimeType } = await generateVideo({
        segments,
        audioFile,
        quality,
        onProgress: (p) => setVideoProgress(p),
      });
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(URL.createObjectURL(blob));
      setVideoExtension(mimeTypeToExtension(mimeType));
    } catch (err) {
      setVideoError(err.message || 'Failed to generate video.');
    } finally {
      setIsGeneratingVideo(false);
    }
  }

  const hasSegments = segments.length > 0;
  const allPromptsWritten = hasSegments && segments.every((s) => s.prompt && s.prompt.trim());
  const hasAnyImage = segments.some((s) => s.image);

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">
          Script Image <span className="text-accent">Generator</span>
        </h1>
        <p className="text-muted text-sm mt-1">
          Turn a timestamped YouTube script into MS-Paint-style illustrations.
        </p>
      </header>

      {globalError && (
        <div className="bg-panel border border-red-400/40 text-red-400 text-sm rounded-lg p-3">
          {globalError}
        </div>
      )}

      <StepPanel number={1} title="Paste script">
        <textarea
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          rows={10}
          placeholder="(0:00 - 0:17) It was a normal Tuesday morning...&#10;(0:18) Then everything changed."
          className="w-full px-3 py-2 rounded-md border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={handleParse}
          disabled={!scriptText.trim()}
          className="mt-3 px-4 py-2 rounded-md bg-accent text-bg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Parse script
        </button>

        <div className="mt-4 pt-4 border-t border-border">
          <label className="block text-xs text-muted mb-1">
            Or import a CSV with "timestamp", "narration_text", and "image_prompt" columns
            (e.g. generated by Claude) — this fills in both this step and Step 2 for you.
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportCsv(file);
              e.target.value = '';
            }}
            className="block w-full text-sm text-text file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-border file:bg-bg file:text-text file:text-sm file:cursor-pointer hover:file:border-accent"
          />
        </div>
      </StepPanel>

      <StepPanel number={2} title="Write prompts">
        <button
          type="button"
          onClick={handleAutoWritePrompts}
          disabled={!hasSegments || isWritingPrompts}
          className="px-4 py-2 rounded-md bg-accent text-bg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isWritingPrompts ? 'Writing prompts...' : 'Auto-write visual prompts with GPT'}
        </button>

        {hasSegments && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {segments.map((seg) => (
              <SegmentCard
                key={seg.timestamp}
                segment={seg}
                onPromptChange={handlePromptChange}
                onRewrite={handleRewriteOne}
                onGenerateImage={handleGenerateOne}
                onDownload={handleDownloadOne}
              />
            ))}
          </div>
        )}
      </StepPanel>

      <StepPanel number={3} title="Generate images">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted">
            Quality
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="ml-2 px-2 py-1.5 rounded-md border border-border text-sm text-text bg-bg focus:outline-none focus:border-accent"
            >
              {QUALITIES.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleGenerateAll}
            disabled={!allPromptsWritten || isGeneratingAll}
            className="px-4 py-2 rounded-md bg-accent text-bg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingAll ? 'Generating...' : 'Generate all images'}
          </button>
        </div>

        {hasSegments && !allPromptsWritten && (
          <p className="text-xs text-muted mt-2">
            Finish writing a visual prompt for every segment before generating images.
          </p>
        )}

        {isGeneratingAll && (
          <div className="mt-4">
            <ProgressBar current={progress.current} total={progress.total} />
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <label className="block text-xs text-muted mb-1">
            Already have these images from a previous run? Upload them instead of generating
            again (matched to segments by their downloaded filename, e.g. "0-07.png"):
          </label>
          <input
            type="file"
            accept="image/png,image/*"
            multiple
            disabled={!hasSegments}
            onChange={(e) => {
              handleUploadImages(e.target.files);
              e.target.value = '';
            }}
            className="block w-full text-sm text-text file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-border file:bg-bg file:text-text file:text-sm file:cursor-pointer hover:file:border-accent disabled:opacity-50"
          />
        </div>
      </StepPanel>

      <StepPanel number={4} title="Results">
        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={!hasAnyImage}
          className="mb-4 px-4 py-2 rounded-md border border-border text-sm text-text hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Download all as ZIP
        </button>

        {hasSegments ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments
              .filter((s) => s.image || s.status === 'generating' || s.status === 'error')
              .map((seg) => (
                <div
                  key={seg.timestamp}
                  className="bg-bg border border-border rounded-lg p-3 flex flex-col gap-2"
                >
                  <span className="text-xs font-mono text-accent">{seg.timestamp}</span>
                  {seg.image ? (
                    <>
                      <img
                        src={seg.image}
                        alt={`Illustration for ${seg.timestamp}`}
                        className="w-full rounded-md border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => handleDownloadOne(seg)}
                        className="text-xs px-3 py-1.5 rounded-md bg-accent text-bg font-semibold self-start"
                      >
                        Download
                      </button>
                    </>
                  ) : seg.status === 'generating' ? (
                    <p className="text-xs text-muted">Generating…</p>
                  ) : (
                    <p className="text-xs text-red-400">{seg.error}</p>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No images yet.</p>
        )}
      </StepPanel>

      <StepPanel number={5} title="Create video">
        <VideoPanel
          hasAnyImage={hasAnyImage}
          onImagesUpload={handleUploadImagesForVideo}
          audioFile={audioFile}
          onAudioChange={setAudioFile}
          onGenerate={handleGenerateVideo}
          isGenerating={isGeneratingVideo}
          progress={videoProgress}
          videoUrl={videoUrl}
          videoExtension={videoExtension}
          error={videoError}
        />
      </StepPanel>
    </main>
  );
}
