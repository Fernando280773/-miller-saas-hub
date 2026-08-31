// Web Audio API Synthesizer for Instant UI Audio Notifications
// Zero-dependency, works offline and in live production without external asset loading

export function playNotificationChime(type: 'lead' | 'invoice' | 'success' = 'lead') {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (type === 'lead') {
      // Ascending two-tone chime for inbound lead (D5 -> A5)
      playTone(ctx, 587.33, now, 0.18, 0.15, 'sine');
      playTone(ctx, 880.00, now + 0.12, 0.35, 0.2, 'sine');
    } else if (type === 'invoice') {
      // Harmonious triple-chime for invoice receipt (C5 -> E5 -> G5)
      playTone(ctx, 523.25, now, 0.15, 0.12, 'triangle');
      playTone(ctx, 659.25, now + 0.10, 0.15, 0.15, 'triangle');
      playTone(ctx, 783.99, now + 0.20, 0.40, 0.2, 'sine');
    } else {
      // Crisp success chime
      playTone(ctx, 659.25, now, 0.12, 0.15, 'sine');
      playTone(ctx, 1046.50, now + 0.10, 0.30, 0.18, 'sine');
    }
  } catch (err) {
    // Audio autoplay policy or hardware restriction fallback
    console.debug('Audio chime playback muted:', err);
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  maxGain: number,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  // Soft attack & exponential decay to avoid click artifacts
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(maxGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}
