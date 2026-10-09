import { expect, it, vi } from 'vitest';
import { PetControls } from '../src/controls.ts';
import type { DesktopOptions, PetBridge } from '../src/bridge.ts';

const options: DesktopOptions = { size: 150, roam: true, notifications: true, bubbleDurationMs: 12000 };
function fixture() {
  let lifecycle: (state: { running: boolean; visible: boolean; error?: string }) => void = () => {};
  const bridge: PetBridge = {
    start: vi.fn(async () => {}), dispose: vi.fn(async () => {}), update: vi.fn(), notify: vi.fn(),
    onAction: vi.fn(), removeAction: vi.fn(), control: vi.fn(), configure: vi.fn(),
    onLifecycle: listener => { lifecycle = listener; }, removeLifecycle: vi.fn(),
  };
  return { bridge, controls: new PetControls(bridge, () => options), lifecycle: (value: Parameters<typeof lifecycle>[0]) => lifecycle(value) };
}
it('serializes concurrent starts, recovers after native close, and shows a hidden pet without spawning another', async () => {
  const { controls, bridge, lifecycle } = fixture();
  await Promise.all([controls.command('start'), controls.command('start')]);
  expect(bridge.start).toHaveBeenCalledOnce();
  await controls.command('hide'); expect(controls.status()).toEqual({ phase: 'running', visible: false });
  await controls.command('show'); expect(bridge.start).toHaveBeenCalledOnce();
  lifecycle({ running: false, visible: false }); expect(controls.status().phase).toBe('stopped');
  await controls.command('start'); expect(bridge.start).toHaveBeenCalledTimes(2);
  await controls.command('restart'); expect(bridge.dispose).toHaveBeenCalledOnce(); expect(bridge.start).toHaveBeenCalledTimes(3);
  await controls.dispose(); await expect(controls.command('start')).rejects.toThrow('停用');
});
it('keeps launch failures retryable and can launch the character manager from a stopped process', async () => {
  const { controls, bridge } = fixture();
  vi.mocked(bridge.start).mockRejectedValueOnce(new Error('runtime missing'));
  expect(await controls.command('start')).toEqual({ phase: 'error', visible: false, error: 'runtime missing' });
  expect((await controls.command('characters')).phase).toBe('running');
  expect(bridge.control).toHaveBeenLastCalledWith('characters');
  controls.configure(); expect(bridge.configure).toHaveBeenCalledWith(options);
  await controls.dispose();
});
