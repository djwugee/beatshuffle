"use client";

import { useEffect, useRef, useMemo } from "react";

interface WaveformVisualizerProps {
  audioData: Float32Array | null;
  beatmap?: number[];
  sampleRate?: number;
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  height?: number;
  showBeats?: boolean;
}

export function WaveformVisualizer({
  audioData,
  beatmap = [],
  sampleRate = 44100,
  currentTime = 0,
  duration = 0,
  isPlaying = false,
  height = 120,
  showBeats = true,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute waveform data for visualization
  const waveformData = useMemo(() => {
    if (!audioData || audioData.length === 0) return null;

    const targetBars = 200;
    const samplesPerBar = Math.floor(audioData.length / targetBars);
    const bars: number[] = [];

    for (let i = 0; i < targetBars; i++) {
      const start = i * samplesPerBar;
      const end = Math.min(start + samplesPerBar, audioData.length);
      let sum = 0;

      for (let j = start; j < end; j++) {
        sum += Math.abs(audioData[j]);
      }

      bars.push(sum / (end - start));
    }

    // Normalize
    const max = Math.max(...bars, 0.001);
    return bars.map((v) => v / max);
  }, [audioData]);

  // Compute beat positions as percentages
  const beatPositions = useMemo(() => {
    if (!beatmap.length || !audioData) return [];
    const totalSamples = audioData.length;
    return beatmap.map((pos) => (pos / totalSamples) * 100);
  }, [beatmap, audioData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const canvasHeight = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, canvasHeight);

    // Draw background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    bgGradient.addColorStop(0, "rgba(24, 24, 27, 0.8)");
    bgGradient.addColorStop(0.5, "rgba(39, 39, 42, 0.6)");
    bgGradient.addColorStop(1, "rgba(24, 24, 27, 0.8)");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, canvasHeight);

    // Draw center line
    ctx.strokeStyle = "rgba(113, 113, 122, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight / 2);
    ctx.lineTo(width, canvasHeight / 2);
    ctx.stroke();

    // Draw beat markers
    if (showBeats && beatPositions.length > 0) {
      ctx.strokeStyle = "rgba(250, 204, 21, 0.2)";
      ctx.lineWidth = 1;

      for (const pos of beatPositions) {
        const x = (pos / 100) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }
    }

    // Calculate progress position
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Draw waveform bars
    const barWidth = width / waveformData.length;
    const barGap = 1;

    for (let i = 0; i < waveformData.length; i++) {
      const x = i * barWidth;
      const barHeight = waveformData[i] * (canvasHeight - 20);
      const y = (canvasHeight - barHeight) / 2;

      const isPlayed = (i / waveformData.length) * 100 <= progressPercent;

      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);

      if (isPlayed) {
        gradient.addColorStop(0, "rgba(167, 139, 250, 0.9)");
        gradient.addColorStop(0.5, "rgba(139, 92, 246, 1)");
        gradient.addColorStop(1, "rgba(167, 139, 250, 0.9)");
      } else {
        gradient.addColorStop(0, "rgba(113, 113, 122, 0.5)");
        gradient.addColorStop(0.5, "rgba(161, 161, 170, 0.7)");
        gradient.addColorStop(1, "rgba(113, 113, 122, 0.5)");
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth - barGap, barHeight);
    }

    // Draw playhead
    if (duration > 0) {
      const playheadX = (progressPercent / 100) * width;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, canvasHeight);
      ctx.stroke();

      // Playhead glow
      ctx.strokeStyle = "rgba(139, 92, 246, 0.5)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, canvasHeight);
      ctx.stroke();
    }
  }, [
    waveformData,
    beatPositions,
    currentTime,
    duration,
    showBeats,
    isPlaying,
  ]);

  if (!audioData) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-border bg-card"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">
          No audio loaded. Upload a file to see the waveform.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-border">
      <canvas
        ref={canvasRef}
        className="w-full cursor-pointer"
        style={{ height }}
      />
      {showBeats && beatmap.length > 0 && (
        <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-background/80 text-xs text-muted-foreground">
          {beatmap.length} beats detected
        </div>
      )}
    </div>
  );
}
