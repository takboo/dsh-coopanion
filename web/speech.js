// Adapted from Coopanion web/pet-app.js (AGPL-3.0-or-later), 2026-10-09.
// Unicode-safe plain text, punctuation pauses, and the original character/sound pulses.
const PAUSE = /[,，。!?！？…、.;；:：]/;
const SILENT = /[\s,，。!?！？…、.;；:：「」“”()（）]/;
export function createSpeech({ text, node, onCharacter, immediate = false }) {
  const chars = Array.from(text);
  let shown = immediate ? chars.length : 0, acc = 0;
  node.textContent = chars.slice(0, shown).join('');
  return {
    get done() { return shown >= chars.length; },
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
