import { AnimationClock, sampleKeys, type AnimationState } from './animation.ts';
import { validateCharacter, assetPaths, imageInfo, readCharacterPack, type CharacterView } from './character-pack.ts';
export { readCharacterPack, validateCharacter, PACK_LIMIT } from './character-pack.ts';

export function packView(pack: ReturnType<typeof readCharacterPack>): CharacterView {
  const assets: Record<string, string> = {};
  for (const [path, bytes] of Object.entries(pack.assets)) {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    assets[path] = `data:${imageInfo(bytes).mime};base64,${btoa(binary)}`;
  }
  return { manifest: pack.manifest, assets };
}

/** Owns image resources and the character timeline; it never owns host chat or permissions. */
export class CharacterAnimator {
  private images = new Map<string, HTMLImageElement>();
  readonly clock: AnimationClock;
  constructor(readonly canvas: HTMLCanvasElement, readonly character: CharacterView) {
    character.manifest = validateCharacter(character.manifest);
    this.clock = new AnimationClock(character.manifest);
  }
  async load(): Promise<void> {
    await Promise.all(assetPaths(this.character.manifest).map(async path => {
      const url = this.character.assets[path];
      if (!url || (!url.startsWith('data:image/png;base64,') && !url.startsWith('data:image/webp;base64,') && !this.character.builtin)) throw new Error('角色素材必须来自角色包');
      const image = new Image(); image.src = url; await image.decode();
      if (!image.naturalWidth || image.naturalWidth > 4096 || image.naturalHeight > 4096) throw new Error('角色图片无法加载或尺寸过大');
      this.images.set(path, image);
    }));
  }
  step(dt: number, state: AnimationState): void {
    const { manifest } = this.character, sample = this.clock.step(dt, state);
    const ratio = Math.min(devicePixelRatio || 1, 2), width = this.canvas.clientWidth, height = this.canvas.clientHeight;
    if (!width || !height) return;
    if (this.canvas.width !== Math.round(width * ratio) || this.canvas.height !== Math.round(height * ratio)) { this.canvas.width = Math.round(width * ratio); this.canvas.height = Math.round(height * ratio); }
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('当前设备无法绘制角色');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(this.canvas.width / manifest.canvas.width, this.canvas.height / manifest.canvas.height);
    ctx.translate(manifest.canvas.width / 2, manifest.canvas.height * .8 + sample.bob);
    ctx.rotate(sample.tilt * Math.PI / 180); ctx.scale(state.facing, sample.scale); ctx.translate(-manifest.canvas.width / 2, -manifest.canvas.height * .8);
    const renderer = manifest.renderer;
    if (renderer.type === 'image') ctx.drawImage(this.images.get(renderer.image)!, 0, 0, manifest.canvas.width, manifest.canvas.height);
    else if (renderer.type === 'spritesheet') {
      const sx = sample.frame % renderer.columns * renderer.frameWidth, sy = Math.floor(sample.frame / renderer.columns) * renderer.frameHeight;
      ctx.drawImage(this.images.get(renderer.image)!, sx, sy, renderer.frameWidth, renderer.frameHeight, 0, 0, manifest.canvas.width, manifest.canvas.height);
    } else {
      const poses = new Map(renderer.layers.map(layer => [layer.id, { ...layer }]));
      for (const track of renderer.animations[sample.action]!.tracks) poses.get(track.layer)![track.property] = sampleKeys(track.keys, sample.progress);
      const transform = (id: string) => {
        const pose = poses.get(id)!;
        if (pose.parent) transform(pose.parent);
        const px = pose.width * pose.pivotX, py = pose.height * pose.pivotY;
        ctx.translate(pose.x + px, pose.y + py); ctx.rotate(pose.rotation * Math.PI / 180); ctx.scale(pose.scaleX, pose.scaleY); ctx.translate(-px, -py);
        ctx.globalAlpha *= pose.opacity;
      };
      for (const layer of renderer.layers) {
        ctx.save(); transform(layer.id); ctx.drawImage(this.images.get(layer.image)!, 0, 0, layer.width, layer.height); ctx.restore();
      }
    }
    this.canvas.dataset.action = sample.action; this.canvas.dataset.frame = String(sample.frame);
  }
  dispose(): void { this.images.clear(); }
}
