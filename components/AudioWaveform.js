'use client';

import { useEffect, useRef, useState } from 'react';

const PEAK_SAMPLES = 800;

// Decodes the uploaded audio file via the Web Audio API and draws a
// min/max peak waveform onto a canvas — purely a visual aid for lining
// slides up with the audio, not used for the actual video render.
export default function AudioWaveform({ audioFile, className }) {
  const canvasRef = useRef(null);
  const [peaks, setPeaks] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setPeaks(null);
    if (!audioFile) return undefined;

    async function decode() {
      try {
        const arrayBuffer = await audioFile.arrayBuffer();
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContextClass();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (cancelled) return;

        const channelData = audioBuffer.getChannelData(0);
        const blockSize = Math.max(1, Math.floor(channelData.length / PEAK_SAMPLES));
        const result = [];
        for (let i = 0; i < PEAK_SAMPLES; i++) {
          const start = i * blockSize;
          let min = 0;
          let max = 0;
          for (let j = 0; j < blockSize; j++) {
            const v = channelData[start + j] || 0;
            if (v < min) min = v;
            if (v > max) max = v;
          }
          result.push([min, max]);
        }
        if (!cancelled) setPeaks(result);
        ctx.close();
      } catch {
        if (!cancelled) setPeaks([]);
      }
    }
    decode();
    return () => {
      cancelled = true;
    };
  }, [audioFile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (!peaks || peaks.length === 0) return;

    ctx.strokeStyle = '#CCFF00';
    ctx.lineWidth = 1;
    const mid = height / 2;
    const colWidth = width / peaks.length;
    peaks.forEach(([min, max], i) => {
      const x = i * colWidth;
      ctx.beginPath();
      ctx.moveTo(x, mid + min * mid);
      ctx.lineTo(x, mid + max * mid);
      ctx.stroke();
    });
  }, [peaks]);

  return <canvas ref={canvasRef} className={className} />;
}
