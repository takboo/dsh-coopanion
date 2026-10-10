import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const warpCursor = `
import ctypes, sys
x11 = ctypes.CDLL('libX11.so.6')
x11.XOpenDisplay.argtypes = [ctypes.c_char_p]
x11.XOpenDisplay.restype = ctypes.c_void_p
x11.XWarpPointer.argtypes = [ctypes.c_void_p, ctypes.c_ulong, ctypes.c_ulong, ctypes.c_int, ctypes.c_int, ctypes.c_uint, ctypes.c_uint, ctypes.c_int, ctypes.c_int]
x11.XSync.argtypes = [ctypes.c_void_p, ctypes.c_int]
x11.XCloseDisplay.argtypes = [ctypes.c_void_p]
display = x11.XOpenDisplay(None)
if not display:
    raise RuntimeError('Cannot open the native test display')
x11.XWarpPointer(display, 0, 0, 0, 0, 0, 0, int(sys.argv[1]), int(sys.argv[2]))
x11.XSync(display, 0)
x11.XCloseDisplay(display)
`;

/** Exercise real click-through hit testing, including the OS cursor on X11. */
export async function petClick(page, options = {}, twice = false) {
  const pet = page.locator('#pet');
  await pet.waitFor({ state: 'visible' });
  if (process.platform === 'linux' && process.env.DISPLAY) {
    // CDP moves a virtual pointer. Enabling native input also generates X11
    // movement at the physical cursor; keep both at the same point as a user.
    const point = await pet.evaluate(el => {
      const b = el.getBoundingClientRect();
      return { x: Math.round(screenX + b.x + b.width / 2), y: Math.round(screenY + b.y + b.height / 2) };
    });
    await run('python3', ['-c', warpCursor, String(point.x), String(point.y)]);
  }
  await pet.hover();
  await page.waitForSelector('#pet[data-native-hit=true]');
  await pet[twice ? 'dblclick' : 'click'](options);
}
