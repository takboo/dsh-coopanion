import type { CharacterAction, CharacterManifest } from './character-pack.ts';

export interface AnimationState { mood: string; moving: boolean; dragging: boolean; facing: 1 | -1; reducedMotion: boolean; }
export interface Keyframe { at: number; value: number; easing: 'linear' | 'smooth'; }

/** Samples absolute keyframes; a clip's final pose is held when it does not loop. */
export function sampleKeys(keys: readonly Keyframe[], progress: number): number {
  if (progress <= keys[0].at) return keys[0].value;
  for (let n = 1; n < keys.length; n++) {
    const right = keys[n], left = keys[n - 1];
    if (progress <= right.at) {
      let k = (progress - left.at) / (right.at - left.at);
      if (right.easing === 'smooth') k = k * k * (3 - 2 * k);
      return left.value + (right.value - left.value) * k;
    }
  }
  return keys[keys.length - 1].value;
}

export function clipProgress(elapsedMs: number, durationMs: number, loop: boolean): number {
  return loop ? (elapsedMs % durationMs) / durationMs : Math.min(1, elapsedMs / durationMs);
}

/** One deterministic clock per character; unsupported actions fall back to idle. */
export class AnimationClock {
  action: CharacterAction = 'idle';
  elapsedMs = 0;
  private pokeMs = 0;
  constructor(readonly manifest: CharacterManifest) {}
  poke(): void { this.pokeMs = 700; }
  step(dt: number, state: AnimationState): { action: CharacterAction; elapsedMs: number; progress: number; frame: number; bob: number; scale: number; tilt: number } {
    const delta = Math.max(0, Math.min(dt, .05)) * 1000;
    this.pokeMs = Math.max(0, this.pokeMs - delta);
    let desired: CharacterAction = state.dragging ? 'dragged' : state.mood === 'sleeping' ? 'sleeping' : this.pokeMs > 0 ? 'poke' : state.moving ? 'walk' : ['thinking', 'working', 'waiting', 'happy', 'error'].includes(state.mood) ? state.mood as CharacterAction : 'idle';
    const renderer = this.manifest.renderer;
    if (renderer.type !== 'image' && !renderer.animations[desired]) desired = 'idle';
    if (desired !== this.action) { this.action = desired; this.elapsedMs = 0; }
    else this.elapsedMs += delta;
    const clip = renderer.type === 'image' ? undefined : renderer.animations[this.action];
    const duration = clip && 'frames' in clip ? clip.frames.length / clip.fps * 1000 : clip?.durationMs ?? 3000;
    const elapsed = state.reducedMotion ? 0 : this.elapsedMs;
    const progress = clipProgress(elapsed, duration, clip?.loop ?? true);
    const frame = clip && 'frames' in clip ? clip.frames[Math.min(clip.frames.length - 1, Math.floor(progress * clip.frames.length))] : 0;
    const phase = elapsed / 1000;
    const bob = state.reducedMotion ? 0 : state.dragging ? -4 : state.moving ? -Math.abs(Math.sin(phase * 8)) * this.manifest.motion.walkBounce : state.mood === 'happy' ? -Math.abs(Math.sin(phase * 5)) * this.manifest.motion.happyBounce : -Math.sin(phase * 2) * this.manifest.motion.bob;
    return { action: this.action, elapsedMs: elapsed, progress, frame, bob, scale: state.reducedMotion ? 1 : 1 + Math.sin(phase * 2) * this.manifest.motion.breathe, tilt: !state.reducedMotion && state.dragging ? 6 : 0 };
  }
}
