// Adapted from Coopanion web/pet-app.js (AGPL-3.0-or-later), 2026-10-09.
// Unicode-safe plain text, punctuation pauses, and the original character/sound pulses.
const PAUSE = /[,，。!?！？…、.;；:：]/;
const SILENT = /[\s,，。!?！？…、.;；:：「」“”()（）]/;
export function createSpeech({ text, node, onCharacter, immediate = false }) {
  let chars = Array.from(text);
  let shown = immediate ? chars.length : 0, acc = 0;
  node.textContent = chars.slice(0, shown).join('');
  return {
    get done() { return shown >= chars.length; },
    // Preserve the visible prefix and punctuation clock as provider deltas arrive.
    update(next) {
      if (!next.startsWith(text)) return false;
      text = next; chars = Array.from(text);
      if (immediate) { shown = chars.length; node.textContent = text; }
      return true;
    },
    finish() { shown = chars.length; node.textContent = text; },
    step(dt) {
      acc += dt * 20;
      while (acc >= 1 && shown < chars.length) {
        const ch = chars[shown++]; acc -= PAUSE.test(ch) ? 5 : 1;
        if (!SILENT.test(ch)) onCharacter(ch);
      }
      node.textContent = chars.slice(0, shown).join('');
    },
  };
}
