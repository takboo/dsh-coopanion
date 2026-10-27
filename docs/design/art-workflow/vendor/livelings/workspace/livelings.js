const M = Math.PI * 2, v = (t, e = 0, s = 1) => t < e ? e : t > s ? s : t, ui = (t, e, s) => t + (e - t) * s;
function Ze(t) {
  let e = 2166136261;
  for (let s = 0; s < t.length; s++)
    e ^= t.charCodeAt(s), e = Math.imul(e, 16777619);
  return e >>> 0;
}
function Ft(t) {
  let e = t >>> 0;
  return () => {
    e = e + 1831565813 >>> 0;
    let s = e;
    return s = Math.imul(s ^ s >>> 15, s | 1), s ^= s + Math.imul(s ^ s >>> 7, s | 61), ((s ^ s >>> 14) >>> 0) / 4294967296;
  };
}
function re(t, e, s) {
  const i = M / e;
  return Math.sin(t * i + s) * 0.6 + Math.sin(t * i * 2.37 + s * 1.7) * 0.3 + Math.sin(t * i * 4.11 + s * 0.3) * 0.1;
}
class V {
  constructor(e, s = 170, i = 22) {
    this.stiffness = s, this.damping = i, this.value = e, this.target = e;
  }
  stiffness;
  damping;
  value;
  velocity = 0;
  target;
  step(e) {
    this.velocity += ((this.target - this.value) * this.stiffness - this.velocity * this.damping) * e, this.value += this.velocity * e;
  }
  snap(e) {
    this.value = e, this.target = e, this.velocity = 0;
  }
}
function Gt(t, e, s) {
  const i = xt(t), n = xt(e);
  return `#${i.map((o, r) => Math.round(o + (n[r] - o) * v(s))).map((o) => o.toString(16).padStart(2, "0")).join("")}`;
}
function xt(t) {
  let e = t.replace("#", "");
  e.length === 3 && (e = e.split("").map((i) => i + i).join(""));
  const s = parseInt(e, 16);
  return [s >> 16 & 255, s >> 8 & 255, s & 255];
}
function K(t, e) {
  const [s, i, n] = xt(t);
  return `rgba(${s},${i},${n},${v(e)})`;
}
const ft = /* @__PURE__ */ new Map();
let Dt = null;
function le(t, e) {
  return typeof OffscreenCanvas < "u" ? new OffscreenCanvas(t, e) : Object.assign(document.createElement("canvas"), { width: t, height: e });
}
function Ae(t, e, s, i) {
  const n = `${i}|${e}|${s}|${t}`;
  let a = ft.get(n);
  if (a) return a;
  Dt ??= le(4, 4).getContext("2d"), Dt.font = e;
  const o = Dt.measureText(t), r = o.fontBoundingBoxAscent ?? o.actualBoundingBoxAscent, c = o.fontBoundingBoxDescent ?? o.actualBoundingBoxDescent, h = 2, d = Math.ceil(o.width) + h * 2, l = Math.ceil(r + c) + h * 2, f = le(Math.max(1, Math.ceil(d * i)), Math.max(1, Math.ceil(l * i))), u = f.getContext("2d");
  return u.scale(i, i), u.font = e, u.fillStyle = s, u.textBaseline = "alphabetic", u.fillText(t, h, h + r), a = { c: f, w: d, ascent: r + h, descent: c + h, h: l }, ft.size > 600 && ft.delete(ft.keys().next().value), ft.set(n, a), a;
}
function ts(t, e, s, i, n) {
  if (!e) return;
  const a = t.getTransform(), o = Math.round(Math.hypot(a.a, a.b) * 2) / 2 || 1, r = Ae(e, n.font, n.color, o), c = n.maxWidth !== void 0 ? Math.min(r.w, n.maxWidth + 4) : r.w, h = n.align === "center" ? s - c / 2 : n.align === "right" ? s - c : s - 2, d = n.baseline === "middle" ? i - r.h / 2 : i - r.ascent;
  t.drawImage(r.c, h, d, c, r.h);
}
const ce = 128;
function Rt(t, e, s, i, n, a) {
  if (!e || n < 0.5) return;
  const o = Ae(e, `800 ${ce}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`, a, 1), r = n / ce;
  t.drawImage(o.c, s - o.w * r / 2, i - o.h * r / 2, o.w * r, o.h * r);
}
function gt(t) {
  return t.palette.mark ?? t.palette.body;
}
function g(t, e, s) {
  return t >= s && t - e < s;
}
function z(t, e, s, i = 0) {
  if (t < i) return !1;
  const n = Math.floor((t - i) / s), a = Math.floor((t - e - i) / s);
  return n !== a || g(t, e, i);
}
function $(t, e = 8, s, i = 1) {
  const n = t.bodyCenter();
  for (let a = 0; a < e; a++) {
    const o = -Math.PI / 2 + (t.rand() - 0.5) * Math.PI * 1.6 * i, r = 2.2 + t.rand() * 2;
    t.emit({
      kind: "spark",
      x: n.x + Math.cos(o) * 0.9,
      y: n.y + Math.sin(o) * 0.9,
      vx: Math.cos(o) * r,
      vy: Math.sin(o) * r,
      drag: 3.2,
      life: 0.7 + t.rand() * 0.3,
      size: 0.09 + t.rand() * 0.06,
      color: s ?? t.palette.accent,
      rot: t.rand() * M,
      vrot: (t.rand() - 0.5) * 8
    });
  }
}
function es(t, e = 22) {
  const s = ["#ffd43b", "#ff6b6b", "#4dabf7", "#51cf66", "#cc5de8", t.palette.accent], i = t.bodyCenter();
  for (let n = 0; n < e; n++) {
    const a = -Math.PI / 2 + (t.rand() - 0.5) * 2.4, o = 3 + t.rand() * 3;
    t.emit({
      kind: "glyph",
      glyph: "rect",
      x: i.x,
      y: i.y - 0.6,
      vx: Math.cos(a) * o,
      vy: Math.sin(a) * o,
      ay: 7,
      drag: 1.6,
      life: 1.6 + t.rand() * 0.6,
      size: 0.1 + t.rand() * 0.05,
      color: s[n % s.length],
      rot: t.rand() * M,
      vrot: (t.rand() - 0.5) * 14
    });
  }
}
function H(t, e, s = "glyph", i, n = 0.32) {
  const a = t.bodyCenter();
  t.emit({
    kind: s,
    glyph: e,
    x: a.x + 0.75 + t.rand() * 0.2,
    y: a.y - 0.9,
    vx: 0.25 + t.rand() * 0.2,
    vy: -0.9,
    drag: 0.6,
    life: 1.4,
    size: n,
    color: i,
    rot: (t.rand() - 0.5) * 0.4
  });
}
function Ce(t) {
  const e = t.bodyCenter();
  t.emit({ kind: "drop", x: e.x + 0.62, y: e.y - 0.55, vx: 0.4, vy: -0.6, ay: 6, life: 0.9, size: 0.09, color: "#74c0fc" });
}
function Le(t, e = 3) {
  const s = t.bodyCenter();
  for (let i = 0; i < e; i++)
    t.emit({
      kind: "smoke",
      x: s.x + (t.rand() - 0.5) * 0.7,
      y: s.y - 1,
      vx: (t.rand() - 0.5) * 0.4,
      vy: -1.2 - t.rand() * 0.6,
      drag: 0.8,
      life: 1,
      size: 0.12,
      grow: 0.22,
      color: "#adb5bd"
    });
}
function kt(t, e, s) {
  const { g: i, R: n, bx: a, by: o } = t;
  i.save(), i.fillStyle = K(gt(t), 0.85 * s);
  for (let r = 0; r < 3; r++) {
    const c = Math.sin(e * 4.2 - r * 0.8) * n * 0.06, h = n * (0.07 + r * 0.035) * (0.6 + 0.4 * s);
    i.beginPath(), i.arc(a + n * (0.82 + r * 0.24), o - n * (0.95 + r * 0.22) + c, h, 0, M), i.fill();
  }
  i.restore();
}
function Jt(t, e, s, i, n, a) {
  const { g: o, R: r, bx: c, by: h } = t, d = v(e / 0.25), l = r * 0.3 * (d < 1 ? 0.4 + d * 0.75 : 1 + Math.sin(e * 5) * 0.04), f = c + r * 0.8, u = h - r * 0.92 + Math.sin(e * 3) * r * 0.03;
  if (o.save(), o.globalAlpha = s, o.fillStyle = n, o.beginPath(), o.arc(f, u, l, 0, M), o.fill(), o.fillStyle = a, o.strokeStyle = a, o.lineCap = "round", o.lineJoin = "round", o.lineWidth = l * 0.26, i === "!")
    o.beginPath(), o.moveTo(f, u - l * 0.48), o.lineTo(f, u + l * 0.1), o.stroke(), o.beginPath(), o.arc(f, u + l * 0.45, l * 0.14, 0, M), o.fill();
  else if (i === "check") {
    const y = v((e - 0.15) / 0.3);
    o.beginPath(), o.moveTo(f - l * 0.42, u + l * 0.02);
    const p = f - l * 0.1, b = u + l * 0.32;
    if (y < 0.4) o.lineTo(f - l * 0.42 + (p - (f - l * 0.42)) * (y / 0.4), u + l * 0.02 + (b - u - l * 0.02) * (y / 0.4));
    else {
      o.lineTo(p, b);
      const x = (y - 0.4) / 0.6;
      o.lineTo(p + l * 0.5 * x, b - l * 0.72 * x);
    }
    o.stroke();
  } else i === "x" && (o.beginPath(), o.moveTo(f - l * 0.32, u - l * 0.32), o.lineTo(f + l * 0.32, u + l * 0.32), o.moveTo(f + l * 0.32, u - l * 0.32), o.lineTo(f - l * 0.32, u + l * 0.32), o.stroke());
  o.restore();
}
function vt(t, e, s) {
  const { g: i, R: n, bx: a, by: o } = t;
  i.save();
  for (let r = 0; r < 3; r++) {
    const c = ((e / 2.4 + r / 3) % 1 + 1) % 1;
    i.globalAlpha = s * (c < 0.15 ? c / 0.15 : 1 - (c - 0.15) / 0.85);
    const h = n * (0.22 + c * 0.22);
    Rt(i, "z", a + n * (0.7 + c * 0.55 + Math.sin(c * 6) * 0.06) + h * 0.3, o - n * (0.55 + c * 0.95) - h * 0.3, h, gt(t));
  }
  i.restore();
}
function ss(t, e, s) {
  const { g: i, R: n, bx: a, by: o } = t;
  i.save();
  for (let r = 0; r < 2; r++) {
    const c = e * 3.4 + r * Math.PI, h = a + Math.cos(c) * n * 1.42, d = o + Math.sin(c) * n * 0.42 - n * 0.05;
    Math.sin(c) > 0 && (i.globalAlpha = s, i.fillStyle = t.palette.accent, i.beginPath(), i.arc(h, d, n * 0.09, 0, M), i.fill());
  }
  i.restore();
}
function is(t, e, s) {
  const { g: i, R: n, bx: a, by: o } = t;
  i.save(), i.strokeStyle = K(gt(t), 0.16 * s), i.lineWidth = Math.max(1, n * 0.025), i.beginPath(), i.ellipse(a, o - n * 0.05, n * 1.42, n * 0.42, 0, 0, M), i.stroke();
  for (let r = 0; r < 2; r++) {
    const c = e * 3.4 + r * Math.PI;
    Math.sin(c) > 0 || (i.globalAlpha = s * 0.8, i.fillStyle = t.palette.accent, i.beginPath(), i.arc(a + Math.cos(c) * n * 1.42, o + Math.sin(c) * n * 0.42 - n * 0.05, n * 0.075, 0, M), i.fill());
  }
  i.restore();
}
function ns(t, e, s) {
  const { g: i, R: n, bx: a, by: o } = t;
  i.save(), i.strokeStyle = gt(t), i.lineCap = "round", i.lineWidth = Math.max(1.2, n * 0.06);
  for (let r = 0; r < 3; r++) {
    const c = ((e * 0.9 + r / 3) % 1 + 1) % 1;
    i.globalAlpha = s * (1 - c) * 0.8, i.beginPath(), i.arc(a - n * 1, o - n * 0.1, n * (0.25 + c * 0.5), -0.75 + Math.PI, 0.75 + Math.PI), i.stroke();
  }
  i.restore();
}
function os(t, e, s) {
  const { g: i, R: n, bx: a, by: o } = t;
  i.save();
  for (let r = 0; r < 3; r++) {
    const c = Math.max(0, Math.sin(e * 5 - r * 0.9));
    i.globalAlpha = s * (0.35 + 0.65 * c), i.fillStyle = gt(t), i.beginPath(), i.arc(a + n * (1.05 + r * 0.22), o - n * (0.35 + c * 0.08), n * 0.07, 0, M), i.fill();
  }
  i.restore();
}
function as(t, e, s) {
  const { g: i } = t, n = t.actor;
  if (!t.face) return;
  i.save(), i.globalAlpha = s * 0.55, i.fillStyle = t.palette.cheek ?? "#ff8fab";
  const { x: a, y: o, u: r } = t.face;
  for (const c of [-1, 1])
    i.beginPath(), i.ellipse(a + c * (n.eyes.spacing / 2 + 0.12) * r, o + r * 0.28, r * 0.13, r * 0.07, 0, 0, M), i.fill();
  i.restore();
}
const ze = (t, e, s) => Jt(t, e, s, "check", "#51cf66", "#ffffff"), Kt = (t, e, s) => Jt(t, e, s, "x", "#ff6b6b", "#ffffff"), rs = (t, e, s) => Jt(t, e, s, "!", "#ffd43b", "#1a1a1a");
function C(t, e) {
  return { ...ht[t], ...e };
}
const L = (t, e) => ({ en: t, zh: e }), ht = {
  idle: {
    kind: "loop",
    label: L("Idle", "待机")
  },
  thinking: {
    kind: "loop",
    label: L("Thinking", "思考"),
    enter(t) {
      t.express({ h: 0.86, topLid: 0.14, w: 0.95 }), t.lookAt(0.7, -0.9);
    },
    tick(t, e, s) {
      t.lean.target = Math.sin(e * 1.3) * 0.06, z(e, s, 2.6, 1.2) && t.squish(-1.5);
    },
    front: kt
  },
  working: {
    kind: "loop",
    label: L("Working", "工作中"),
    enter(t, e) {
      t.express("focused"), t.lean.target = 0.07, t.lookAt(0.3, 0.6), e || t.hop(0.35);
    },
    tick(t, e, s) {
      z(e, s, 0.42) && t.squish(2.2), t.rootX.target = Math.sin(e * 7) * 0.025, z(e, s, 1.1, 0.5) && $(t, 2, void 0, 0.5);
    },
    back: is,
    front: ss
  },
  waiting: {
    kind: "loop",
    label: L("Waiting", "等待"),
    enter(t) {
      t.express("soft");
    },
    tick(t, e, s) {
      const i = Math.floor(e / 2.2) % 2 === 0 ? -1 : 1;
      t.lookAt(i * 0.8, 0.1), z(e, s, 2.2, 1) && t.squish(2.5);
    },
    front: os
  },
  blocked: {
    kind: "loop",
    label: L("Needs help", "需要帮忙"),
    enter(t) {
      t.express("worried"), t.hop(0.5), t.lookAt(0, 0.2);
    },
    tick(t, e, s) {
      z(e, s, 2.4, 2.4) && (t.hop(0.45), t.shake(0.04, 26, 3)), t.lean.target = Math.sin(e * 2) * 0.05;
    },
    front: rs
  },
  listening: {
    kind: "loop",
    label: L("Listening", "聆听"),
    enter(t) {
      t.express({ w: 1.08, h: 1.08, lift: 0.1 }), t.lean.target = -0.08, t.lookAt(-0.6, -0.1);
    },
    tick(t, e, s) {
      z(e, s, 1.6) && t.squish(-1.2);
    },
    front: ns
  },
  sleep: {
    kind: "loop",
    label: L("Sleeping", "睡觉"),
    enter(t) {
      t.express("closed"), t.morph("wide"), t.hover.target = t.def.physics.floaty ? t.def.physics.hover * 0.45 : 0;
    },
    tick(t, e) {
      t.scale.target = 1 + Math.sin(e * 1.4) * 0.025;
    },
    front: vt
  },
  /* --------------------------------------------------------- one-shots */
  acknowledge: {
    kind: "once",
    duration: 0.9,
    label: L("Got it", "收到"),
    enter(t) {
      t.express("surprised"), t.hop(0.5), t.lookAt(0, 0.15);
    },
    tick(t, e, s) {
      g(e, s, 0.3) && t.express("happy");
    }
  },
  done: {
    kind: "once",
    duration: 2,
    label: L("Done!", "完成"),
    enter(t) {
      t.express("proud"), t.hop(1), t.spinBy(1);
    },
    tick(t, e, s) {
      g(e, s, 0.55) && $(t, 10);
    },
    front: ze
  },
  error: {
    kind: "once",
    duration: 1.8,
    label: L("Error", "出错了"),
    enter(t) {
      t.express("sad"), t.morph("wide", { blink: !1 }), t.shake(0.07, 18, 2.2);
    },
    tick(t, e, s) {
      g(e, s, 0.4) && Ce(t);
    },
    front: Kt
  },
  poked: {
    kind: "once",
    duration: 0.9,
    label: L("Poked", "被戳"),
    enter(t) {
      t.express("surprised");
    },
    tick(t, e, s) {
      g(e, s, 0.35) && t.express("happy");
    }
  },
  happy: {
    kind: "once",
    duration: 1.6,
    label: L("Happy", "开心"),
    enter(t) {
      t.express("happy"), t.hop(0.7);
    },
    tick(t, e, s) {
      g(e, s, 0.6) && t.hop(0.55);
    }
  },
  excited: {
    kind: "once",
    duration: 1.7,
    label: L("Excited", "兴奋"),
    enter(t) {
      t.express("excited"), t.hop(0.5);
    },
    tick(t, e, s) {
      (g(e, s, 0.42) || g(e, s, 0.84)) && t.hop(0.5), g(e, s, 0.9) && $(t, 6), t.lean.target = Math.sin(e * 14) * 0.06;
    }
  },
  proud: {
    kind: "once",
    duration: 1.9,
    label: L("Proud", "骄傲"),
    enter(t) {
      t.express("proud"), t.scale.target = 1.08, t.lean.target = -0.09;
    },
    tick(t, e, s) {
      g(e, s, 0.5) && $(t, 4, "#ffd43b");
    }
  },
  love: {
    kind: "once",
    duration: 2.2,
    label: L("Love", "喜欢"),
    enter(t) {
      t.express("happy");
    },
    tick(t, e, s) {
      g(e, s, 0.15) && t.morph("heart"), z(e, s, 0.45, 0.3) && e < 1.7 && H(t, "♥", "heart", "#ff6b8a", 0.26), g(e, s, 1.75) && t.morph("rest");
    }
  },
  surprised: {
    kind: "once",
    duration: 1.3,
    label: L("Surprised", "吃惊"),
    enter(t) {
      t.express("surprised"), t.hop(0.9), t.scale.velocity += 1.5, H(t, "!", "glyph", void 0, 0.38);
    }
  },
  shy: {
    kind: "once",
    duration: 2.2,
    label: L("Shy", "害羞"),
    enter(t) {
      t.express("shy"), t.lean.target = 0.12, t.rootX.target = -0.12, t.scale.target = 0.93, t.lookAt(-0.6, 0.7);
    },
    front: as
  },
  sad: {
    kind: "once",
    duration: 2.4,
    label: L("Sad", "难过"),
    enter(t) {
      t.express("sad"), t.scale.target = 0.94, t.morph("wide", { blink: !1, squash: 1 }), t.lookAt(0, 0.8);
    },
    tick(t, e, s) {
      if (g(e, s, 0.7)) {
        const i = t.bodyCenter();
        t.emit({ kind: "drop", x: i.x - 0.2, y: i.y - 0.1, vy: 0.2, ay: 5, life: 1.1, size: 0.07, color: "#74c0fc", lands: !0 });
      }
    }
  },
  angry: {
    kind: "once",
    duration: 1.9,
    label: L("Angry", "生气"),
    enter(t) {
      t.express("angry"), t.tintColor = "#e03131", t.tint.target = 0.35, t.shake(0.05, 30, 1.6), t.scale.target = 1.06;
    },
    tick(t, e, s) {
      z(e, s, 0.4, 0.2) && e < 1.4 && Le(t, 2);
    }
  },
  confused: {
    kind: "once",
    duration: 2,
    label: L("Confused", "困惑"),
    enter(t) {
      t.express("dizzy"), H(t, "?", "glyph", void 0, 0.38);
    },
    tick(t, e) {
      t.lean.target = Math.sin(e * 3.2) * 0.14;
    }
  },
  nod: {
    kind: "once",
    duration: 1,
    label: L("Yes", "点头"),
    enter(t) {
      t.express("happy"), t.squish(5);
    },
    tick(t, e, s) {
      g(e, s, 0.4) && t.squish(5);
    }
  },
  no: {
    kind: "once",
    duration: 1.1,
    label: L("No", "摇头"),
    enter(t) {
      t.express({ w: 1.05, h: 0.6, topLid: 0.15 }), t.shake(0.09, 15, 2);
    }
  },
  hello: {
    kind: "once",
    duration: 1.7,
    label: L("Hello", "打招呼"),
    enter(t) {
      t.express("happy"), t.hop(0.6), t.lookAt(0, 0.1);
    },
    tick(t, e) {
      t.lean.target = Math.sin(e * 9) * 0.12 * v(1.4 - e);
    }
  },
  celebrate: {
    kind: "once",
    duration: 2.3,
    label: L("Celebrate", "庆祝"),
    enter(t) {
      t.express("excited"), t.hop(1.15), t.spinBy(-1), es(t);
    },
    tick(t, e, s) {
      g(e, s, 1.1) && t.hop(0.5);
    }
  },
  /* ------------------------------------------------------------ fidgets */
  "look-around": {
    kind: "once",
    duration: 2.6,
    label: L("Look around", "东张西望"),
    tick(t, e) {
      e < 0.9 ? t.lookAt(-1, 0) : e < 1.8 ? t.lookAt(1, -0.2) : t.lookFree();
    }
  },
  yawn: {
    kind: "once",
    duration: 2.2,
    label: L("Yawn", "打哈欠"),
    enter(t) {
      t.express("sleepy");
    },
    tick(t, e, s) {
      g(e, s, 0.35) && (t.morph("tall", { blink: !1 }), t.express("closed")), g(e, s, 1.35) && (t.morph("rest", { blink: !1 }), t.express("sleepy"));
    }
  },
  bounce: {
    kind: "once",
    duration: 1,
    label: L("Hop", "蹦一下"),
    enter(t) {
      t.hop(0.65), t.express("happy");
    }
  },
  wiggle: {
    kind: "once",
    duration: 1.2,
    label: L("Wiggle", "扭一扭"),
    enter(t) {
      t.jiggle(0.8);
    },
    tick(t, e) {
      t.lean.target = Math.sin(e * 11) * 0.09 * v(1.1 - e);
    }
  }
}, yi = ["idle", "thinking", "working", "waiting", "blocked", "listening", "sleep"], bi = ["acknowledge", "done", "error", "poked"], xi = ["happy", "excited", "proud", "love", "surprised", "shy", "sad", "angry", "confused", "nod", "no", "hello", "celebrate"], mi = ["look-around", "yawn", "bounce", "wiggle"];
class ls {
  constructor(e, s, i, n, a = 1) {
    this.ctx = e, this.out = s, this.now = i, this.noiseBuffer = n, this.level = a;
  }
  ctx;
  out;
  now;
  noiseBuffer;
  level;
  tone({ f: e, to: s, dur: i, type: n = "sine", gain: a = 0.2, at: o = 0, attack: r = 5e-3, vibrato: c, filter: h }) {
    const { ctx: d } = this, l = this.now + o, f = d.createOscillator();
    if (f.type = n, f.frequency.setValueAtTime(e, l), s && f.frequency.exponentialRampToValueAtTime(Math.max(20, s), l + i), c) {
      const y = d.createOscillator(), p = d.createGain();
      y.frequency.value = c[0], p.gain.value = c[1], y.connect(p).connect(f.frequency), y.start(l), y.stop(l + i + 0.05);
    }
    let u = f;
    if (h) {
      const y = d.createBiquadFilter();
      y.type = h.type, y.frequency.value = h.f, y.Q.value = h.q ?? 1, f.connect(y), u = y;
    }
    u.connect(this.envelope(l, i, a, r)), f.start(l), f.stop(l + i + 0.05);
  }
  noise({ dur: e, gain: s = 0.2, at: i = 0, attack: n = 3e-3, type: a = "bandpass", f: o = 1200, to: r, q: c = 1 }) {
    const { ctx: h } = this, d = this.now + i, l = h.createBufferSource();
    l.buffer = this.noiseBuffer, l.loop = !0;
    const f = h.createBiquadFilter();
    f.type = a, f.frequency.setValueAtTime(o, d), r && f.frequency.exponentialRampToValueAtTime(Math.max(20, r), d + e), f.Q.value = c, l.connect(f).connect(this.envelope(d, e, s, n)), l.start(d, Math.random() * 0.5), l.stop(d + e + 0.05);
  }
  envelope(e, s, i, n) {
    const a = this.ctx.createGain(), o = Math.max(2e-4, i * this.level);
    return a.gain.setValueAtTime(1e-4, e), a.gain.exponentialRampToValueAtTime(o, e + Math.min(n, s * 0.5)), a.gain.exponentialRampToValueAtTime(1e-4, e + s), a.connect(this.out), a;
  }
}
const O = (t) => 440 * 2 ** ((t - 69) / 12), X = (t, e, s, i = 0.09, n = 0.18, a = 0, o = "sine") => t.tone({ f: e, to: s, dur: i, gain: n, at: a, type: o });
function D(t, e, s = 0.07, i = 0.12, n = 0, a = 0.5) {
  e.forEach((o, r) => {
    t.tone({ f: O(o), dur: a, gain: i, at: n + r * s, type: "sine" }), t.tone({ f: O(o) * 2.01, dur: a * 0.5, gain: i * 0.25, at: n + r * s, type: "sine" });
  });
}
function W(t, e = 900, s = 0, i = 0.2) {
  t.tone({ f: e, to: e * 0.8, dur: 0.06, gain: i, at: s, type: "triangle" }), t.noise({ dur: 0.025, gain: i * 0.6, at: s, type: "bandpass", f: e * 2.6, q: 4 });
}
function mt(t, e = 0, s = 0.2, i = 150) {
  t.tone({ f: i, to: i * 0.45, dur: 0.12, gain: s, at: e }), t.noise({ dur: 0.05, gain: s * 0.3, at: e, type: "lowpass", f: 600 });
}
const J = (t, e = 400, s = 2400, i = 0.35, n = 0.16, a = 0) => t.noise({ dur: i, gain: n, at: a, type: "bandpass", f: e, to: s, q: 0.8, attack: i * 0.4 });
function R(t, e, s, i = 3500, n = 0.07, a = 0, o = 1) {
  let r = o * 9301 + 49297;
  const c = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let h = 0; h < e; h++) t.noise({ dur: 0.018 + c() * 0.02, gain: n * (0.6 + c() * 0.6), at: a + c() * s, type: "bandpass", f: i * (0.8 + c() * 0.5), q: 3 });
}
function dt(t, e = 0, s = 1150, i = 0.12) {
  t.tone({ f: s, to: s * 1.35, dur: 0.07, gain: i, at: e, type: "square", filter: { type: "bandpass", f: s * 1.6, q: 2.5 } }), t.tone({ f: s * 1.3, to: s * 0.95, dur: 0.09, gain: i, at: e + 0.07, type: "square", filter: { type: "bandpass", f: s * 1.6, q: 2.5 } });
}
function ct(t, e = 0, s = 0.16) {
  t.noise({ dur: 0.32, gain: s, at: e, type: "lowpass", f: 2600, to: 500, q: 0.7 });
  for (let i = 0; i < 4; i++) t.tone({ f: 600 + i * 230, to: 1100 + i * 260, dur: 0.05, gain: s * 0.35, at: e + 0.05 + i * 0.045 });
}
const cs = {
  tap(t, { taps: e = 1 }) {
    e >= 5 ? t.tone({ f: 160, to: 120, dur: 0.35, gain: 0.12, type: "sawtooth", filter: { type: "lowpass", f: 600 } }) : e === 3 ? t.tone({ f: 700, to: 300, dur: 0.5, gain: 0.1, vibrato: [9, 60] }) : X(t, 640 + e * 60, 420, 0.08, 0.16);
  },
  land: (t, { strength: e = 0.5 }) => mt(t, 0, Math.min(0.22, 0.06 + e * 0.12)),
  grab: (t) => X(t, 420, 620, 0.07, 0.1),
  release: (t) => J(t, 500, 1600, 0.2, 0.18),
  hello: (t) => {
    X(t, O(76), O(81), 0.09, 0.12), X(t, O(81), O(84), 0.1, 0.1, 0.1);
  },
  done: (t) => D(t, [72, 76, 79, 84], 0.07, 0.11),
  celebrate: (t) => {
    D(t, [72, 76, 79, 84, 88], 0.06, 0.1), R(t, 10, 0.5, 5e3, 0.06, 0.05, 3);
  },
  error: (t) => {
    t.tone({ f: O(64), dur: 0.16, gain: 0.12, type: "triangle" }), t.tone({ f: O(60), dur: 0.3, gain: 0.12, type: "triangle", at: 0.17 });
  },
  surprised: (t) => X(t, 500, 1100, 0.12, 0.12),
  happy: (t) => D(t, [79, 84], 0.08, 0.09),
  love: (t) => t.tone({ f: O(76), to: O(72), dur: 0.5, gain: 0.08, vibrato: [5, 6] }),
  sad: (t) => t.tone({ f: O(67), to: O(60), dur: 0.6, gain: 0.08, type: "triangle" }),
  angry: (t) => t.tone({ f: 140, to: 110, dur: 0.4, gain: 0.12, type: "sawtooth", filter: { type: "lowpass", f: 700 } }),
  yawn: (t) => t.tone({ f: 420, to: 260, dur: 0.8, gain: 0.06, vibrato: [4, 8] }),
  // page effects, played with `def` null
  drop: (t) => {
    X(t, 1100, 320, 0.14, 0.16), ct(t, 0.03, 0.06);
  },
  split: (t) => {
    J(t, 300, 3200, 0.45, 0.14), D(t, [72, 79, 84, 91], 0.045, 0.06, 0.12, 0.4);
  },
  zoom: (t) => J(t, 700, 2400, 0.28, 0.24)
};
class hs {
  ctx = null;
  master = null;
  noise = null;
  recent = /* @__PURE__ */ new Map();
  listening = !1;
  on = !1;
  /** the visitor's choice (a page's sound toggle); wins over anything that enables sound */
  muted = !1;
  /** 0..1 */
  volume = 0.6;
  get enabled() {
    return this.on;
  }
  set enabled(e) {
    this.on = e, e && this.listen();
  }
  /** Play a character's sound by name (an action id, tap, land…), or a shared one with `def` null. */
  play(e, s, i = {}) {
    if (!this.on || this.muted || !this.ctx || this.ctx.state !== "running") return;
    const n = e?.sounds?.[s] ?? cs[s];
    if (!n) return;
    const a = `${e?.id ?? ""}:${s}`, o = this.ctx.currentTime;
    o - (this.recent.get(a) ?? -1) < 0.08 || (this.recent.set(a, o), n(new ls(this.ctx, this.master, o + 0.01, this.noise, i.level ?? 1), i));
  }
  listen() {
    if (this.listening || typeof document > "u") return;
    this.listening = !0;
    const e = () => {
      if (!this.ctx) {
        const s = window.AudioContext ?? window.webkitAudioContext;
        if (!s) return;
        this.ctx = new s();
        const i = this.ctx.createDynamicsCompressor();
        this.master = this.ctx.createGain(), this.master.gain.value = this.volume, this.master.connect(i).connect(this.ctx.destination), this.noise = fs(this.ctx);
      }
      this.ctx.state === "suspended" && this.ctx.resume();
    };
    for (const s of ["pointerdown", "keydown", "touchstart"]) document.addEventListener(s, e, { capture: !0, passive: !0 });
  }
  setVolume(e) {
    this.volume = e, this.master && (this.master.gain.value = e);
  }
}
function fs(t) {
  const e = t.createBuffer(1, t.sampleRate, t.sampleRate), s = e.getChannelData(0);
  for (let i = 0; i < s.length; i++) s[i] = Math.random() * 2 - 1;
  return e;
}
const bt = new hs();
function ds(t, e = {}) {
  let s = -1 / 0;
  const i = (n) => typeof e.play == "function" ? e.play(n) : e.play !== !1 && t.behaviors[n]?.kind === "once";
  return t.on((n) => {
    const a = t.def;
    if (n.type === "tap")
      s = t.time, e.touch !== !1 && bt.play(a, "tap", { taps: n.taps });
    else if (n.type === "grab" || n.type === "release")
      s = t.time, e.touch !== !1 && bt.play(a, n.type);
    else if (n.type === "land")
      t.time - s < 1.6 && bt.play(a, "land", { strength: n.strength });
    else if (n.type === "play") {
      if (t.time - s < 0.25) return;
      i(n.id) && bt.play(a, n.id);
    }
  });
}
const nt = 96;
function Q(t) {
  return Array.from({ length: nt }, (e, s) => {
    const i = -Math.PI / 2 + s / nt * M, n = t(i);
    return { x: Math.cos(i) * n, y: Math.sin(i) * n };
  });
}
function ot(t) {
  if (t.length < 3) return _();
  let e = 0;
  for (let r = 1; r < t.length; r++) t[r].y < t[e].y && (e = r);
  const s = [...t.slice(e), ...t.slice(0, e), t[e]], i = [0];
  for (let r = 1; r < s.length; r++)
    i.push(i[r - 1] + Math.hypot(s[r].x - s[r - 1].x, s[r].y - s[r - 1].y));
  const n = Math.max(i[i.length - 1], 1e-6), a = [];
  let o = 1;
  for (let r = 0; r < nt; r++) {
    const c = n * r / nt;
    for (; o < s.length - 1 && i[o] < c; ) o++;
    const h = Math.max(i[o] - i[o - 1], 1e-6), d = (c - i[o - 1]) / h, l = s[o - 1], f = s[o];
    a.push({ x: l.x + (f.x - l.x) * d, y: l.y + (f.y - l.y) * d });
  }
  return Qt(a) < 0 ? [a[0], ...a.slice(1).reverse()] : a;
}
function Lt(t) {
  const e = t.length, s = t.map((h, d) => Math.hypot(t[(d + 1) % e].x - h.x, t[(d + 1) % e].y - h.y)), i = s.reduce((h, d) => h + d, 0), n = s.map((h) => h / i * nt), a = n.map((h) => Math.max(1, Math.round(h)));
  let o = nt - a.reduce((h, d) => h + d, 0);
  for (; o !== 0; ) {
    let h = -1;
    for (let d = 0; d < e; d++) {
      if (o < 0 && a[d] <= 1) continue;
      const l = o > 0 ? n[d] - a[d] : a[d] - n[d];
      (h < 0 || l > (o > 0 ? n[h] - a[h] : a[h] - n[h])) && (h = d);
    }
    a[h] += Math.sign(o), o -= Math.sign(o);
  }
  let r = [];
  t.forEach((h, d) => {
    const l = t[(d + 1) % e];
    for (let f = 0; f < a[d]; f++) r.push({ x: h.x + (l.x - h.x) * f / a[d], y: h.y + (l.y - h.y) * f / a[d] });
  }), Qt(r) < 0 && (r = [r[0], ...r.slice(1).reverse()]);
  let c = 0;
  for (let h = 1; h < r.length; h++) r[h].y < r[c].y - 1e-9 && (c = h);
  return [...r.slice(c), ...r.slice(0, c)];
}
function Qt(t) {
  let e = 0;
  for (let s = 0; s < t.length; s++) {
    const i = t[s], n = t[(s + 1) % t.length];
    e += i.x * n.y - n.x * i.y;
  }
  return e / 2;
}
function Be(t, e) {
  const s = t.length;
  let i = 0, n = 1 / 0;
  for (let a = 0; a < s; a++) {
    let o = 0;
    for (let r = 0; r < s; r += 3) {
      const c = e[r], h = t[(r + a) % s];
      o += (c.x - h.x) ** 2 + (c.y - h.y) ** 2;
    }
    o < n && (n = o, i = a);
  }
  return i === 0 ? t : Array.from({ length: s }, (a, o) => t[(o + i) % s]);
}
function U(t, e = 1, s = 1, i = 0, n = 0) {
  return t.map((a) => ({ x: a.x * e + i, y: a.y * s + n }));
}
function Ee(t, e = 1) {
  let s = 0;
  for (const n of t) s = Math.max(s, Math.hypot(n.x, n.y));
  const i = s > 0 ? e / s : 1;
  return t.map((n) => ({ x: n.x * i, y: n.y * i }));
}
const _ = (t = 1) => Q(() => t), _t = () => Q((t) => 1 + 0.07 * Math.cos(2 * t + 0.5) + 0.03 * Math.cos(3 * t + 2.1)), zt = (t = 4.2, e = 0.92) => Q((s) => (Math.abs(Math.cos(s)) ** t + Math.abs(Math.sin(s)) ** t) ** (-1 / t) * e), Fe = (t = 0.5) => Q((e) => 0.92 + t * Math.max(0, -Math.sin(e)) ** 6).map((e) => ({ x: e.x * 0.95, y: e.y + 0.12 }));
function De(t = 1, e = 1.25, s = 0) {
  const i = [];
  for (let n = 0; n < 240; n++) {
    const a = n / 240 * M, o = -Math.cos(a), r = Math.sin(a) * Math.sin(a / 2) ** 1.35, c = Math.max(0, -o);
    i.push({ x: r * t + s * c * c, y: o * e * 0.82 + 0.18 });
  }
  return ot(i);
}
const Oe = (t = 0.12) => De(1.05, 1.28, t), We = (t = 1.55) => U(_(), t, 0.42, 0, 0.58), Xe = () => Q((t) => 1 - 0.12 * Math.sin(t)).map((t) => ({ x: t.x * 0.86, y: t.y * 1.05 })), Ve = (t = 5, e = 0.55) => Q((s) => {
  const i = (s + Math.PI / 2) / M * t, n = i - Math.floor(i);
  return e + (1 - e) * Math.abs(Math.cos(n * Math.PI)) ** 3;
});
function $e() {
  const t = [];
  for (let e = 0; e < 240; e++) {
    const s = e / 240 * M, i = 16 * Math.sin(s) ** 3, n = 13 * Math.cos(s) - 5 * Math.cos(2 * s) - 2 * Math.cos(3 * s) - Math.cos(4 * s);
    t.push({ x: i / 16, y: -n / 15 + 0.1 });
  }
  return ot(t);
}
function Ue() {
  const t = [];
  for (let s = 0; s < 48; s++) {
    const i = Math.PI * (0.38 + s / 47 * 1.24);
    t.push({ x: Math.cos(i) - 0.15, y: Math.sin(i) });
  }
  const e = [];
  for (let s = 1; s < 30; s++) {
    const i = Math.PI * (1.56 - s / 30 * 1.12);
    e.push({ x: 0.4 + Math.cos(i) * 0.95, y: Math.sin(i) * 0.95 });
  }
  return ot([...t, ...e]);
}
function Zt(t) {
  return Q((e) => {
    const s = Math.cos(e), i = Math.sin(e);
    let n = 0;
    for (const a of t) {
      const o = s * a.x + i * a.y, r = o * o - (a.x * a.x + a.y * a.y - a.r * a.r);
      r < 0 || (n = Math.max(n, o + Math.sqrt(r)));
    }
    return n;
  });
}
function Ye(t = 11, e = 0.11, s = 1) {
  const i = [{ x: 0, y: 0, r: 0.8 }];
  for (let n = 0; n < t; n++) {
    const a = -Math.PI / 2 + n / t * M, o = 0.27 + e;
    i.push({ x: Math.cos(a) * (1 - o), y: Math.sin(a) * (1 - o) * s, r: o });
  }
  return Ee(Zt(i), 1.02);
}
function je(t, e = '900 120px ui-rounded, "SF Pro Rounded", system-ui, sans-serif') {
  if (typeof document > "u") return _();
  const s = 160, i = document.createElement("canvas");
  i.width = s * 2, i.height = s;
  const n = i.getContext("2d", { willReadFrequently: !0 });
  if (!n) return _();
  n.font = e, n.textAlign = "center", n.textBaseline = "middle", n.fillStyle = "#000", n.fillText(t, s, s / 2 + 6);
  const a = n.getImageData(0, 0, s * 2, s).data, o = s * 2, r = s, h = us((k, S) => k >= 0 && S >= 0 && k < o && S < r && a[(S * o + k) * 4 + 3] > 110, o, r);
  if (!h.length) return _();
  h.sort((k, S) => k[0].x - S[0].x);
  let d = h[0];
  for (const k of h.slice(1)) {
    let S = { a: 0, b: 0, d: 1 / 0 };
    for (let A = 0; A < d.length; A += 2)
      for (let E = 0; E < k.length; E += 2) {
        const B = Math.hypot(d[A].x - k[E].x, d[A].y - k[E].y);
        B < S.d && (S = { a: A, b: E, d: B });
      }
    const T = [...k.slice(S.b), ...k.slice(0, S.b), k[S.b]];
    d = [...d.slice(0, S.a + 1), ...T, ...d.slice(S.a)];
  }
  let l = 1 / 0, f = 1 / 0, u = -1 / 0, y = -1 / 0;
  for (const k of d)
    l = Math.min(l, k.x), u = Math.max(u, k.x), f = Math.min(f, k.y), y = Math.max(y, k.y);
  const p = 2 / Math.max(u - l, y - f) * 0.95, b = (l + u) / 2, x = (f + y) / 2, P = d.map((k) => ({ x: (k.x - b) * p, y: (k.y - x) * p }));
  return ot(ps(P, 2));
}
function ps(t, e) {
  let s = t;
  for (let i = 0; i < e; i++)
    s = s.map((n, a) => {
      const o = s[(a - 1 + s.length) % s.length], r = s[(a + 1) % s.length];
      return { x: (o.x + n.x * 2 + r.x) / 4, y: (o.y + n.y * 2 + r.y) / 4 };
    });
  return s;
}
function us(t, e, s) {
  const i = new Uint8Array(e * s), n = [], a = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1]
  ];
  for (let o = 0; o < s; o++)
    for (let r = 0; r < e; r++) {
      if (!t(r, o) || i[o * e + r]) continue;
      const c = [r, o];
      let h = 0;
      for (; c.length; ) {
        const p = c.pop(), b = c.pop();
        if (b < 0 || p < 0 || b >= e || p >= s) continue;
        const x = p * e + b;
        i[x] || !t(b, p) || (i[x] = 1, h++, c.push(b + 1, p, b - 1, p, b, p + 1, b, p - 1));
      }
      if (h < 30) continue;
      const d = [];
      let l = r, f = o, u = 7;
      const y = e * s;
      for (let p = 0; p < y; p++) {
        d.push({ x: l, y: f });
        let b = !1;
        for (let x = 0; x < 8; x++) {
          const P = (u + 6 + x) % 8, k = l + a[P][0], S = f + a[P][1];
          if (t(k, S)) {
            l = k, f = S, u = P, b = !0;
            break;
          }
        }
        if (!b || l === r && f === o && d.length > 2) break;
      }
      d.length > 8 && n.push(d);
    }
  return n;
}
function Ne(t) {
  let e = 1 / 0, s = 1 / 0, i = -1 / 0, n = -1 / 0;
  for (const r of t)
    e = Math.min(e, r.x), i = Math.max(i, r.x), s = Math.min(s, r.y), n = Math.max(n, r.y);
  let a = { x: (e + i) / 2, y: (s + n) / 2, r: 0, score: -1 / 0 };
  const o = 26;
  for (let r = 0; r <= o; r++)
    for (let c = 0; c <= o; c++) {
      const h = { x: e + (i - e) * r / o, y: s + (n - s) * c / o };
      if (!ys(t, h)) continue;
      const d = bs(t, h), l = d - Math.abs(h.x - (e + i) / 2) * 0.08 - (h.y - s) / Math.max(n - s, 0.01) * 0.06;
      l > a.score && (a = { x: h.x, y: h.y, r: d, score: l });
    }
  return { x: a.x, y: a.y, r: Math.max(a.r, 0.12) };
}
function ys(t, e) {
  let s = !1;
  for (let i = 0, n = t.length - 1; i < t.length; n = i++) {
    const a = t[i], o = t[n];
    a.y > e.y != o.y > e.y && e.x < (o.x - a.x) * (e.y - a.y) / (o.y - a.y) + a.x && (s = !s);
  }
  return s;
}
function bs(t, e) {
  let s = 1 / 0;
  for (let i = 0; i < t.length; i++) {
    const n = t[i], a = t[(i + 1) % t.length], o = a.x - n.x, r = a.y - n.y, c = Math.max(0, Math.min(1, ((e.x - n.x) * o + (e.y - n.y) * r) / Math.max(o * o + r * r, 1e-9)));
    s = Math.min(s, Math.hypot(e.x - (n.x + o * c), e.y - (n.y + r * c)));
  }
  return s;
}
const gi = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  POINTS: nt,
  align: Be,
  circle: _,
  discs: Zt,
  droplet: Fe,
  egg: Xe,
  faceAnchor: Ne,
  flame: Oe,
  fromText: je,
  heart: $e,
  moon: Ue,
  normalize: Ee,
  pebble: _t,
  polar: Q,
  polygon: Lt,
  puddle: We,
  resample: ot,
  scallop: Ye,
  signedArea: Qt,
  squircle: zt,
  star: Ve,
  teardrop: De,
  transform: U
}, Symbol.toStringTag, { value: "Module" })), m = (t, e) => ({ en: t, zh: e });
function at(t) {
  return {
    morphStiffness: 150,
    morphDamping: 14.5,
    softStiffness: 240,
    softDamping: 12,
    softSmoothing: 120,
    gravity: 12,
    hopPower: 3.4,
    bounce: 0,
    squashiness: 1,
    squashStiffness: 240,
    squashDamping: 10,
    floaty: !1,
    hover: 0,
    eyeStiffness: 200,
    wobble: 0,
    breath: 0.025,
    stretch: 0.7,
    flutter: 0,
    ...t
  };
}
function st(t, e, s, i) {
  const n = t.g;
  n.save(), n.translate(e.x, e.y), n.rotate(s), i(n, t.R), n.restore();
}
const pt = (t) => t.palette.outline ?? t.palette.mark ?? "#141414", xs = {
  sprout: {
    id: "sprout",
    label: m("Sprout", "小芽"),
    draw(t, e, s) {
      st(t, e, s, (i, n) => {
        const a = Math.sin(t.time * 2.1) * 0.12;
        i.rotate(a), i.strokeStyle = "#2f9e44", i.lineWidth = n * 0.06, i.lineCap = "round", i.beginPath(), i.moveTo(0, n * 0.04), i.quadraticCurveTo(n * 0.02, -n * 0.14, 0, -n * 0.26), i.stroke(), i.fillStyle = "#51cf66";
        for (const o of [-1, 1])
          i.save(), i.translate(0, -n * 0.24), i.rotate(o * 0.9), i.beginPath(), i.ellipse(o * n * 0.11, 0, n * 0.12, n * 0.06, 0, 0, M), i.fill(), i.restore();
      });
    }
  },
  bow: {
    id: "bow",
    label: m("Bow", "蝴蝶结"),
    draw(t, e, s) {
      st(t, e, s, (i, n) => {
        i.translate(n * 0.28, n * 0.1), i.rotate(0.35), i.fillStyle = t.palette.accent, i.strokeStyle = pt(t), i.lineWidth = Math.max(1, n * 0.03);
        for (const a of [-1, 1])
          i.beginPath(), i.moveTo(0, 0), i.quadraticCurveTo(a * n * 0.2, -n * 0.2, a * n * 0.26, 0), i.quadraticCurveTo(a * n * 0.2, n * 0.2, 0, 0), i.fill(), i.stroke();
        i.beginPath(), i.arc(0, 0, n * 0.06, 0, M), i.fill(), i.stroke();
      });
    }
  },
  beret: {
    id: "beret",
    label: m("Beret", "贝雷帽"),
    draw(t, e, s) {
      st(t, e, s, (i, n) => {
        i.rotate(-0.22), i.fillStyle = "#e03131", i.beginPath(), i.ellipse(0, n * 0.04, n * 0.42, n * 0.15, 0, 0, M), i.fill(), i.beginPath(), i.arc(0, -n * 0.1, n * 0.05, 0, M), i.fill();
      });
    }
  },
  tuft: {
    id: "tuft",
    label: m("Curl", "呆毛"),
    draw(t, e, s) {
      st(t, e, s, (i, n) => {
        i.rotate(Math.sin(t.time * 2.4) * 0.15), i.strokeStyle = t.palette.body, i.lineWidth = n * 0.07, i.lineCap = "round", i.beginPath(), i.moveTo(0, n * 0.04), i.bezierCurveTo(-n * 0.02, -n * 0.14, n * 0.02, -n * 0.26, n * 0.16, -n * 0.2), i.quadraticCurveTo(n * 0.25, -n * 0.11, n * 0.13, -n * 0.09), i.stroke();
      });
    }
  },
  crown: {
    id: "crown",
    label: m("Crown", "小皇冠"),
    draw(t, e, s) {
      st(t, e, s, (i, n) => {
        i.rotate(0.18), i.fillStyle = "#fcc419", i.strokeStyle = pt(t), i.lineWidth = Math.max(1, n * 0.025);
        const a = n * 0.36, o = n * 0.22;
        i.beginPath(), i.moveTo(-a / 2, n * 0.04), i.lineTo(-a / 2, -o), i.lineTo(-a / 4, -o * 0.45), i.lineTo(0, -o * 1.15), i.lineTo(a / 4, -o * 0.45), i.lineTo(a / 2, -o), i.lineTo(a / 2, n * 0.04), i.closePath(), i.fill(), i.stroke();
      });
    }
  },
  flower: {
    id: "flower",
    label: m("Flower", "小花"),
    draw(t, e, s) {
      st(t, e, s, (i, n) => {
        i.translate(-n * 0.26, n * 0.08), i.rotate(t.time * 0.4), i.fillStyle = "#fff", i.strokeStyle = pt(t), i.lineWidth = Math.max(1, n * 0.022);
        for (let a = 0; a < 5; a++) {
          const o = a / 5 * M;
          i.beginPath(), i.arc(Math.cos(o) * n * 0.09, Math.sin(o) * n * 0.09, n * 0.075, 0, M), i.fill(), i.stroke();
        }
        i.fillStyle = "#fcc419", i.beginPath(), i.arc(0, 0, n * 0.065, 0, M), i.fill();
      });
    }
  },
  cap: {
    id: "cap",
    label: m("Party hat", "派对帽"),
    draw(t, e, s) {
      st(t, e, s, (i, n) => {
        i.translate(-n * 0.1, n * 0.06), i.rotate(-0.25);
        const a = n * 0.4, o = n * 0.48;
        i.fillStyle = t.palette.accent, i.strokeStyle = pt(t), i.lineWidth = Math.max(1, n * 0.03), i.lineJoin = "round", i.beginPath(), i.moveTo(-a / 2, 0), i.lineTo(0, -o), i.lineTo(a / 2, 0), i.closePath(), i.fill(), i.stroke(), i.fillStyle = pt(t), i.beginPath(), i.arc(0, -o - n * 0.05, n * 0.06, 0, M), i.fill();
      });
    }
  }
}, rt = (...t) => t.map((e) => xs[e]), et = 0.56, _e = [
  { w: 0.92, x: 0 },
  { w: 0.82, x: 0.07 },
  { w: 0.74, x: -0.05 },
  { w: 0.66, x: 0.06 }
], ms = ["A", "B", "C", "D"], He = 0.42;
function lt(t, e = -1) {
  const s = (r) => {
    const c = _e[r], h = r === e ? He : 0;
    return { l: c.x - c.w + h, r: c.x + c.w + h, top: 0.98 - (r + 1) * et, bot: 0.98 - r * et };
  }, i = Array.from({ length: t }, (r, c) => s(c)), n = [{ x: i[0].l, y: i[0].bot }, { x: i[0].r, y: i[0].bot }];
  i.forEach((r, c) => {
    n.push({ x: r.r, y: r.bot }, { x: r.r, y: r.top }), c + 1 < i.length && n.push({ x: i[c + 1].r, y: r.top });
  });
  const a = i[i.length - 1];
  n.push({ x: a.l, y: a.top });
  for (let r = i.length - 1; r >= 0; r--)
    n.push({ x: i[r].l, y: i[r].top }, { x: i[r].l, y: i[r].bot }), r > 0 && n.push({ x: i[r - 1].l, y: i[r].bot });
  const o = n.filter((r, c) => c === 0 || Math.hypot(r.x - n[c - 1].x, r.y - n[c - 1].y) > 1e-6);
  return Lt(o.slice(0, -1));
}
const gs = () => Lt([
  { x: -1.35, y: 0.98 },
  { x: 1.35, y: 0.98 },
  { x: 1.35, y: 0.42 },
  { x: 0.42, y: 0.42 },
  { x: 0.52, y: -0.06 },
  { x: -0.1, y: -0.32 },
  { x: -0.4, y: 0.16 },
  { x: -0.3, y: 0.42 },
  { x: -1.35, y: 0.42 }
]), he = () => Lt([{ x: -1.4, y: 0.98 }, { x: 1.4, y: 0.98 }, { x: 1.4, y: 0.42 }, { x: -1.4, y: 0.42 }]), Ge = (t, e = 0) => {
  const s = [t.body, t.accent, t.core ?? t.body, t.cheek ?? t.accent];
  return s.map((i, n) => s[(n + e) % s.length]);
};
function qt(t) {
  const e = t.shapeKey, s = e.match(/^gap(\d)_(\d)$/);
  if (s) return { n: Number(s[1]), pulled: Number(s[2]), flat: !1 };
  const i = e.match(/^stack(\d)$/);
  return i ? { n: Number(i[1]), pulled: -1, flat: !1 } : e === "tall" ? { n: 4, pulled: -1, flat: !1 } : e === "pile" || e === "row" || e === "wide" ? { n: 3, pulled: -1, flat: !0 } : { n: 3, pulled: -1, flat: !1 };
}
function ks(t) {
  const { g: e, R: s, palette: i, actor: n } = t, { n: a, pulled: o, flat: r } = qt(n), c = Ge(i, n.cues.shift ?? 0), h = (f, u, y, p, b) => {
    const x = [t.toPx(f, u), t.toPx(y, u), t.toPx(y, p), t.toPx(f, p)];
    e.fillStyle = b, e.beginPath(), x.forEach((P, k) => k ? e.lineTo(P.x, P.y) : e.moveTo(P.x, P.y)), e.closePath(), e.fill();
  }, d = i.outline ?? "#2b2118";
  if (e.strokeStyle = d, e.lineWidth = s * 0.05, r) {
    for (let f = 0; f < 3; f++) h(-1.5 + f * 1, -0.6, -0.5 + f * 1, 1.1, c[f]);
    for (const f of [-0.5, 0.5]) {
      const u = t.toPx(f, 0.4), y = t.toPx(f, 1);
      e.beginPath(), e.moveTo(u.x, u.y), e.lineTo(y.x, y.y), e.stroke();
    }
    return;
  }
  for (let f = 0; f < a; f++)
    if (h(-1.6, 0.98 - (f + 1) * et, 1.6, 0.98 - f * et, c[f]), f > 0) {
      const u = t.toPx(-1.6, 0.98 - f * et), y = t.toPx(1.6, 0.98 - f * et);
      e.beginPath(), e.moveTo(u.x, u.y), e.lineTo(y.x, y.y), e.stroke();
    }
  const l = Math.floor((0.98 - n.faceY.value) / et);
  for (let f = 0; f < a; f++) {
    if (f === l) continue;
    const u = f === o ? He : 0, y = t.toPx(_e[f].x + u + 0.42, 0.98 - (f + 0.5) * et);
    ts(e, ms[f], y.x, y.y, { font: `900 ${Math.round(s * 0.36)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`, color: Gt(c[f], "#ffffff", 0.75), align: "center", baseline: "middle" });
  }
}
function vs(t) {
  const e = t.actor;
  if (e.time > (e.cues.flagUntil ?? -1)) return;
  const { g: s, R: i, outline: n } = t;
  let a = n[0];
  for (const r of n) r.y < a.y && (a = r);
  s.save(), s.strokeStyle = t.palette.outline ?? "#2b2118", s.lineWidth = i * 0.05, s.lineCap = "round", s.beginPath(), s.moveTo(a.x, a.y), s.lineTo(a.x, a.y - i * 0.6), s.stroke(), s.fillStyle = "#ff6b6b", s.beginPath();
  const o = Math.sin(t.time * 8) * i * 0.03;
  s.moveTo(a.x, a.y - i * 0.6), s.lineTo(a.x + i * 0.38, a.y - i * 0.5 + o), s.lineTo(a.x, a.y - i * 0.38), s.closePath(), s.fill(), s.stroke(), s.restore();
}
function N(t, e, s = {}) {
  t.morph(`stack${e}`, { squash: s.squish ?? 2, blink: !1 });
}
function Ot(t) {
  const e = t.bodyCenter(), s = Ge(t.palette, t.cues.shift ?? 0);
  for (let i = 0; i < 8; i++) {
    const n = i % 2 ? 1 : -1;
    t.emit({ kind: "square", x: e.x + n * t.rand() * 0.6, y: e.y - 0.4 - t.rand() * 0.6, vx: n * (1 + t.rand() * 2), vy: -2 - t.rand() * 2, ay: 10, life: 0.9, size: 0.16, color: s[i % 4], rot: t.rand() * M, vrot: (t.rand() - 0.5) * 10, lands: !0 });
  }
}
function fe(t) {
  const e = qt(t).n, s = Math.floor(t.rand() * (e - 1));
  t.morph(`gap${e}_${s}`, { squash: 0, blink: !1 }), t.flash("worried", 1.1), t.cues.pushAt = t.time + 1;
}
const Ms = {
  id: "blocks",
  // wooden blocks knocking together, and the clatter when they fall
  sounds: {
    hello: (t) => {
      W(t, 820, 0, 0.14), W(t, 980, 0.1, 0.14);
    },
    tap: (t) => {
      t.noise({ dur: 0.22, gain: 0.06, type: "bandpass", f: 1800, q: 2 }), W(t, 900, 0.22, 0.2);
    },
    jenga: (t) => {
      t.noise({ dur: 0.3, gain: 0.07, type: "bandpass", f: 1800, q: 2 }), W(t, 900, 0.3, 0.2);
    },
    stack: (t) => {
      W(t, 760, 0.5, 0.18), W(t, 900, 1, 0.18);
    },
    topple: (t) => {
      [0.4, 0.52, 0.62, 0.76, 0.9].forEach((e, s) => W(t, 1050 - s * 110, e, 0.18 - s * 0.02)), mt(t, 0.95, 0.2, 110);
    },
    shuffle: (t) => {
      for (let e = 0; e < 4; e++) W(t, 800 + e % 2 * 220, e * 0.3, 0.1);
    },
    done: (t) => {
      W(t, 900, 0, 0.16), D(t, [79, 84, 88], 0.07, 0.09, 0.45);
    },
    error: (t) => {
      [1.9, 2, 2.12].forEach((e, s) => W(t, 900 - s * 120, e, 0.16)), mt(t, 2.2, 0.18, 110);
    }
  },
  name: m("Stacky", "垒垒"),
  material: m("Toy blocks", "积木"),
  tagline: m("Builds itself up, block by block.", "一块一块，把自己垒起来。"),
  bio: m(
    "Stacky is a tower of alphabet blocks with a face on the top one. Progress is literal: it stacks itself taller while you work. Tap it and it plays Jenga with itself, sliding a block out and wobbling before pushing it back; when something fails, the whole tower comes down and it builds itself up again.",
    "垒垒是一摞字母积木，脸长在最上面那块。进度在它身上是看得见的：你忙一点，它就往上垒高一点。点它一下，它会自己玩叠叠乐，抽出一块晃悠半天再推回去；事情搞砸了，整座塔哗啦倒下，然后它再一块块垒回来。"
  ),
  traits: { en: ["Grows with progress", "Plays Jenga", "Builds itself back up"], zh: ["进度就是高度", "自己玩叠叠乐", "倒了能重来"] },
  physics: at({ morphStiffness: 200, morphDamping: 20, softStiffness: 480, softDamping: 26, softSmoothing: 50, squashiness: 0.35, hopPower: 3.2, gravity: 14, stretch: 0.4, breath: 8e-3 }),
  eyes: { w: 0.16, h: 0.24, corner: 1, spacing: 0.58, lift: 0.02, topLid: 0, bottomLid: 0, tilt: 0, slant: 0, asym: 0 },
  eyeMode: "ink",
  outlineWidth: 0.055,
  straight: !0,
  thicken: !1,
  splash: !1,
  rest: () => lt(3),
  shapes: {
    stack2: () => lt(2),
    stack3: () => lt(3),
    stack4: () => lt(4),
    ...Object.fromEntries([2, 3, 4].flatMap((t) => Array.from({ length: t - 1 }, (e, s) => [`gap${t}_${s}`, () => lt(t, s)]))),
    pile: gs,
    row: he,
    wide: he,
    tall: () => lt(4)
  },
  palettes: [
    { id: "toy", body: "#ff6b6b", accent: "#4dabf7", core: "#ffd43b", cheek: "#51cf66", eye: "#2b2118", outline: "#2b2118", mark: "#2b2118" },
    { id: "pastel", body: "#ffc9c9", accent: "#a5d8ff", core: "#fff3bf", cheek: "#b2f2bb", eye: "#2b2118", outline: "#2b2118", mark: "#2b2118" },
    { id: "wood", body: "#d9a066", accent: "#b07d4f", core: "#ecc796", cheek: "#c58f5c", eye: "#2b1a0e", outline: "#2b1a0e", mark: "#2b1a0e" },
    { id: "mono", body: "#495057", accent: "#adb5bd", core: "#e9ecef", cheek: "#868e96", eye: "#101113", outline: "#101113", mark: "#495057" }
  ],
  accessories: rt("cap", "crown", "sprout"),
  paintBody: ks,
  paintFace: vs,
  update(t) {
    if (t.cues.pushAt && t.time > t.cues.pushAt) {
      t.cues.pushAt = 0;
      const { n: e, flat: s } = qt(t);
      N(t, s ? 3 : e, { squish: 1.5 }), t.flash("happy", 0.6);
    }
    qt(t).pulled >= 0 && (t.lean.target = Math.sin(t.time * 9) * 0.05);
  },
  react: {
    tap(t, e) {
      return e >= 3 ? (t.morph("pile", { squash: 0 }), Ot(t), t.flash("dizzy", 1.2), t.cues.pushAt = t.time + 1.3, !0) : (fe(t), !0);
    }
  },
  actions: {
    thinking: C("thinking", {
      tick(t, e) {
        t.lean.target = Math.sin(e * 1.6) * 0.06;
      },
      front: kt
    }),
    working: C("working", {
      // stacks itself up and down, like a progress bar that breathes
      enter(t) {
        t.express("focused"), N(t, 2);
      },
      tick(t, e, s) {
        if (z(e, s, 1.1, 1.1)) {
          const i = [2, 3, 4, 3], n = i[Math.floor(e / 1.1) % i.length];
          N(t, n), n > 2 && t.squish(4);
        }
      },
      back: void 0,
      front: void 0
    }),
    done: C("done", {
      enter(t) {
        t.express("proud"), N(t, 4), t.cues.flagUntil = t.time + 2, t.hop(0.6);
      },
      tick(t, e, s) {
        g(e, s, 0.45) && $(t, 8, "#ffd43b"), g(e, s, 1.8) && N(t, 3);
      },
      front: void 0
    }),
    error: C("error", {
      duration: 2.6,
      enter(t) {
        t.express("dizzy"), t.morph("pile", { squash: 0 }), Ot(t), t.shake(0.05, 24, 2);
      },
      tick(t, e, s) {
        g(e, s, 1.5) && N(t, 2), g(e, s, 1.9) && (N(t, 3), t.express("worried"));
      }
    }),
    sleep: C("sleep", {
      enter(t) {
        t.express("closed"), t.morph("row");
      },
      front: vt
    }),
    stack: {
      kind: "once",
      duration: 3,
      label: m("Stack up", "往上垒"),
      enter(t) {
        t.express("focused"), N(t, 2);
      },
      tick(t, e, s) {
        g(e, s, 0.5) && N(t, 3), g(e, s, 1) && (N(t, 4), t.cues.flagUntil = t.time + 1.4, t.express("proud"), $(t, 5, "#ffd43b")), g(e, s, 2.4) && N(t, 3);
      }
    },
    jenga: {
      kind: "once",
      duration: 2.2,
      label: m("Jenga", "抽一块"),
      enter(t) {
        fe(t);
      }
    },
    topple: {
      kind: "once",
      duration: 3,
      label: m("Topple", "塌了"),
      enter(t) {
        t.express("surprised"), t.lean.target = 0.35;
      },
      tick(t, e, s) {
        g(e, s, 0.4) && (t.lean.target = 0, t.morph("pile", { squash: 0 }), Ot(t), t.express("dizzy")), g(e, s, 1.6) && N(t, 2), g(e, s, 2.1) && (N(t, 3), t.express("happy"));
      }
    },
    shuffle: {
      kind: "once",
      duration: 2,
      label: m("Shuffle colours", "换个颜色"),
      enter(t) {
        t.express("excited");
      },
      tick(t, e, s) {
        z(e, s, 0.3) && e < 1.3 && (t.cues.shift = ((t.cues.shift ?? 0) + 1) % 4, t.squish(2));
      }
    }
  },
  signature: ["stack", "jenga", "topple", "shuffle"],
  fidgets: ["jenga", "shuffle", "look-around", "bounce"]
}, Mt = () => U(zt(5.5, 0.88), 1, 1, 0, 0.1), ws = {
  1: [[0, 0]],
  2: [[-0.46, 0], [0.46, 0]],
  3: [[-0.52, -0.52], [0, 0], [0.52, 0.52]],
  4: [[-0.46, -0.46], [0.46, -0.46], [-0.46, 0.46], [0.46, 0.46]],
  5: [[-0.52, -0.52], [0.52, -0.52], [0, 0], [-0.52, 0.52], [0.52, 0.52]],
  6: [[-0.46, -0.56], [0.46, -0.56], [-0.46, 0], [0.46, 0], [-0.46, 0.56], [0.46, 0.56]]
}, de = { 1: 0.26, 2: 0.19, 3: 0.15, 4: 0.15, 5: 0.14, 6: 0.13 }, Ss = {
  neutral: 2,
  custom: 2,
  soft: 2,
  shy: 2,
  wink: 2,
  surprised: 1,
  curious: 1,
  sad: 1,
  dizzy: 3,
  worried: 3,
  focused: 4,
  sleepy: 4,
  closed: 4,
  excited: 5,
  angry: 5,
  happy: 6,
  proud: 6
}, Ps = (t) => {
  const e = Math.sin(t * 12.9898) * 43758.5453;
  return e - Math.floor(e);
};
function Ts(t) {
  return t.time < (t.cues.rollUntil ?? -1) ? 1 + Math.floor(Ps(Math.floor(t.time * 14)) * 6) : t.time < (t.cues.showUntil ?? -1) ? t.cues.result : Ss[t.expression] ?? 2;
}
function qs(t) {
  const { g: e, R: s, palette: i, actor: n } = t, a = Ts(n), o = n.eyes, r = n.def.eyes, c = v(o.w / r.w, 0.5, 1.6), h = v(o.h / r.h, 0.4, 1.6), d = v(Math.max(o.topLid, n.lid * 0.92)), l = v(o.bottomLid), f = n.look;
  e.fillStyle = a === 1 || a === 4 ? i.accent : i.eye;
  for (const [u, y] of ws[a]) {
    const p = t.toPx(u * 0.5 + f.x * 0.9, 0.1 + y * 0.5 + f.y * 0.6), b = s * de[a] * c, x = s * de[a] * h;
    e.save(), e.beginPath(), e.rect(p.x - b * 1.2, p.y - x + x * 2 * d - 0.6, b * 2.4, x * 2 * (1 - d) - x * 2 * l * 0.55 + 1.2), e.clip(), e.beginPath(), e.ellipse(p.x, p.y, b, x, 0, 0, M), e.fill(), e.restore();
  }
}
function Is(t) {
  const { g: e, box: s } = t, i = e.createLinearGradient(s.x, 0, s.x + s.w, 0);
  i.addColorStop(0.72, "rgba(0,0,0,0)"), i.addColorStop(1, "rgba(0,0,0,0.09)"), e.fillStyle = i, e.fillRect(s.x - 4, s.y - 4, s.w + 8, s.h + 8);
  const n = e.createLinearGradient(0, s.y, 0, s.y + s.h);
  n.addColorStop(0, "rgba(255,255,255,0.6)"), n.addColorStop(0.18, "rgba(255,255,255,0)"), e.fillStyle = n, e.fillRect(s.x - 4, s.y - 4, s.w + 8, s.h + 8);
}
function it(t, e, s = 1.5) {
  const i = e ?? 1 + Math.floor(t.rand() * 6);
  return t.cues.rollUntil = t.time + 0.85, t.cues.result = i, t.cues.showUntil = t.time + 0.85 + s, t.hop(0.95), t.spinBy(t.rand() < 0.5 ? 1 : -1), t.squish(-3), i;
}
function As(t) {
  const e = t.actor, s = e.cues.rollUntil ?? -1;
  if (e.time < s || e.time > (e.cues.showUntil ?? -1)) return;
  const { g: i, R: n, bx: a, by: o } = t, r = v((e.time - s) / 0.2), c = e.cues.result;
  i.save(), i.globalAlpha = r * v(((e.cues.showUntil ?? 0) - e.time) / 0.3), Rt(i, String(c), a - n * 1.1, o - n * (0.75 + r * 0.15), n * 0.5, c === 6 ? "#fab005" : c === 1 ? "#e03131" : t.palette.mark ?? "#212529"), i.restore();
}
const Cs = {
  id: "dice",
  // a die rattling in a cup, then the clack when it settles
  sounds: {
    hello: (t) => {
      W(t, 1100, 0, 0.14), W(t, 1300, 0.09, 0.12);
    },
    tap: (t) => {
      R(t, 12, 0.75, 2600, 0.11, 0, 5), W(t, 1150, 0.86, 0.22);
    },
    roll: (t) => {
      R(t, 12, 0.75, 2600, 0.11, 0, 6), W(t, 1150, 0.86, 0.22);
    },
    lucky: (t) => {
      R(t, 12, 0.8, 2600, 0.11, 0, 8), W(t, 1150, 0.88, 0.22), D(t, [72, 76, 79, 84], 0.07, 0.1, 0.95);
    },
    snake: (t) => {
      R(t, 12, 0.8, 2600, 0.11, 0, 9), W(t, 1e3, 0.88, 0.22), t.tone({ f: O(67), to: O(63), dur: 0.5, gain: 0.08, at: 0.95, type: "triangle" });
    },
    tumble: (t) => {
      for (let e = 0; e < 5; e++) W(t, 1200 - e * 80, e * 0.45, 0.16);
      W(t, 900, 1.8, 0.22);
    },
    count: (t) => {
      for (let e = 0; e < 6; e++) W(t, 900 + e * 90, 0.2 + e * 0.42, 0.14);
    },
    done: (t) => {
      R(t, 10, 0.7, 2600, 0.1, 0, 2), W(t, 1150, 0.8, 0.2), D(t, [79, 84, 88], 0.07, 0.09, 0.9);
    }
  },
  name: m("Pips", "点点"),
  material: m("Dice", "骰子"),
  tagline: m("Every face is a mood. Tap it to roll.", "每一面都是一种心情，点一下就掷。"),
  bio: m(
    "Pips is a die whose pips are its eyes, so every face is a feeling: two for an ordinary day, one big red eye when it is startled, a dizzy diagonal three, a squinting four when it concentrates, and a full six when it is delighted. Tap it and it rolls. Good news lands on six; bad news on a lonely one.",
    "点点是一颗骰子，它的点数就是它的眼睛，所以每一面都是一种心情：平常是两个点，吓一跳是一个大红点，晕头转向是斜着的三点，专心是眯着的四点，开心到不行就是六点。点它一下就会掷一次。好消息掷出六，坏消息只剩孤零零的一。"
  ),
  traits: { en: ["Face = mood", "Tap to roll", "Lucky six"], zh: ["点数就是表情", "一点就掷", "幸运六"] },
  physics: at({ squashiness: 0.45, bounce: 0.25, hopPower: 3.8, gravity: 14, softStiffness: 380, softDamping: 18, breath: 0.012 }),
  eyes: { w: 0.2, h: 0.2, corner: 1, spacing: 0.6, lift: 0, topLid: 0, bottomLid: 0, tilt: 0, slant: 0, asym: 0 },
  eyeMode: "ink",
  outlineWidth: 0.055,
  rest: Mt,
  shapes: {
    wide: () => U(Mt(), 1.12, 0.84, 0, 0.17),
    tall: () => U(Mt(), 0.9, 1.12, 0, -0.12),
    pancake: () => U(Mt(), 1.2, 0.6, 0, 0.42)
  },
  palettes: [
    { id: "classic", body: "#fffdf8", eye: "#212529", accent: "#e03131", outline: "#212529", mark: "#212529" },
    { id: "casino", body: "#e03131", eye: "#ffffff", accent: "#ffd43b", outline: "#3a0d0d", mark: "#3a0d0d" },
    { id: "night", body: "#343a40", eye: "#ffffff", accent: "#ff6b6b", outline: "#101113", mark: "#343a40" },
    { id: "mint", body: "#d3f9d8", eye: "#1b3a24", accent: "#e8590c", outline: "#1b3a24", mark: "#1b3a24" },
    { id: "honey", body: "#ffe8a3", eye: "#3d2e05", accent: "#e03131", outline: "#3d2e05", mark: "#3d2e05" }
  ],
  accessories: rt("cap", "crown", "bow"),
  paintBody: Is,
  drawFace: qs,
  paintFace: As,
  react: {
    // tapping a die throws it
    tap(t) {
      return it(t), !0;
    }
  },
  actions: {
    thinking: C("thinking", {
      enter(t) {
        t.express("curious"), t.lookAt(0.7, -0.9);
      },
      tick(t, e, s) {
        z(e, s, 2.4, 0.6) && it(t, 3, 1);
      },
      front: kt
    }),
    working: C("working", {
      // a slot machine: faces flicker while it works
      enter(t) {
        t.express("focused");
      },
      tick(t, e, s) {
        t.cues.rollUntil = t.time + 0.2, z(e, s, 0.5) && t.squish(2.2);
      },
      back: void 0,
      front: void 0
    }),
    done: C("done", {
      enter(t) {
        t.express("happy"), it(t, 6, 1.4);
      },
      tick(t, e, s) {
        g(e, s, 0.95) && $(t, 8, "#ffd43b");
      },
      front: void 0
    }),
    error: C("error", {
      enter(t) {
        t.express("sad"), it(t, 1, 1.2);
      },
      tick(t, e, s) {
        g(e, s, 1) && (t.shake(0.05, 22, 2), Ce(t));
      },
      front: void 0
    }),
    roll: {
      kind: "once",
      duration: 2.4,
      label: m("Roll", "掷一下"),
      enter(t) {
        it(t);
      }
    },
    lucky: {
      kind: "once",
      duration: 2.6,
      label: m("Lucky six", "掷出六"),
      enter(t) {
        t.express("excited"), it(t, 6, 1.6);
      },
      tick(t, e, s) {
        g(e, s, 0.9) && (t.express("happy"), t.hop(0.5), $(t, 10, "#ffd43b"));
      }
    },
    snake: {
      kind: "once",
      duration: 2.4,
      label: m("Rolled a one", "掷出一"),
      enter(t) {
        it(t, 1, 1.4);
      },
      tick(t, e, s) {
        g(e, s, 0.9) && (t.express("sad"), t.squish(3));
      }
    },
    tumble: {
      kind: "once",
      duration: 2.6,
      label: m("Tumble", "满地打滚"),
      enter(t) {
        t.express("dizzy"), t.cues.rollUntil = t.time + 1.8;
      },
      tick(t, e, s) {
        t.rootX.target = e < 1.8 ? Math.sin(e * 3.6) * 0.8 : 0, z(e, s, 0.45) && e < 1.8 && (t.spinBy(Math.cos(e * 3.6) > 0 ? 0.5 : -0.5), t.hop(0.4)), g(e, s, 1.8) && (t.cues.result = 3, t.cues.showUntil = t.time + 0.8);
      }
    },
    count: {
      kind: "once",
      duration: 3,
      label: m("Count to six", "数到六"),
      enter(t) {
        t.express("focused");
      },
      tick(t, e, s) {
        for (let i = 1; i <= 6; i++)
          g(e, s, 0.15 + (i - 1) * 0.4) && (t.cues.result = i, t.cues.showUntil = t.time + (i === 6 ? 0.8 : 0.4), t.squish(i === 6 ? -4 : 1.5), i === 6 && (t.hop(0.6), t.express("happy")));
      }
    }
  },
  signature: ["roll", "lucky", "snake", "tumble", "count"],
  fidgets: ["roll", "tumble", "look-around", "wiggle"]
}, wt = () => Ye(11, 0.1);
function Wt(t, e = !1) {
  const s = t.bodyCenter();
  t.emit({
    kind: "rain",
    x: s.x + (t.rand() - 0.5) * 1.4,
    y: s.y + 0.6,
    vy: e ? 6 : 4,
    ay: 4,
    life: 0.9,
    size: 0.08,
    color: "#4dabf7",
    back: !0,
    lands: !0
  });
}
function Ls(t, e, s) {
  if (!(e > 0.45 && e < 0.62 || e > 0.8 && e < 0.9)) return;
  const { g: n, R: a, bx: o, by: r } = t;
  n.save(), n.globalAlpha = s, n.fillStyle = "#ffd43b", n.strokeStyle = "#141414", n.lineWidth = Math.max(1, a * 0.04), n.lineJoin = "round";
  const c = o + a * 0.1, h = r + a * 0.75;
  n.beginPath(), n.moveTo(c, h), n.lineTo(c - a * 0.26, h + a * 0.55), n.lineTo(c - a * 0.04, h + a * 0.52), n.lineTo(c - a * 0.2, h + a * 1.02), n.lineTo(c + a * 0.22, h + a * 0.38), n.lineTo(c + a * 0, h + a * 0.41), n.lineTo(c + a * 0.14, h), n.closePath(), n.fill(), n.stroke(), n.restore();
}
function pe(t, e, s) {
  const { g: i, R: n, cx: a, cy: o } = t, r = a + n * 1.35, c = o - n * 1.55;
  i.save(), i.globalAlpha = s, i.translate(r, c), i.rotate(e * 0.5), i.strokeStyle = "#fab005", i.lineWidth = n * 0.05, i.lineCap = "round";
  for (let h = 0; h < 8; h++)
    i.rotate(M / 8), i.beginPath(), i.moveTo(n * 0.3, 0), i.lineTo(n * 0.42, 0), i.stroke();
  i.fillStyle = "#ffd43b", i.beginPath(), i.arc(0, 0, n * 0.22, 0, M), i.fill(), i.restore();
}
const zs = {
  id: "cloud",
  // a puff of air, rain on a window, a far-off rumble
  sounds: {
    hello: (t) => {
      J(t, 600, 1600, 0.25, 0.1), X(t, O(79), O(84), 0.12, 0.08, 0.05);
    },
    tap: (t) => {
      t.noise({ dur: 0.14, gain: 0.14, type: "lowpass", f: 900, to: 400 }), X(t, 520, 380, 0.07, 0.06);
    },
    rain: (t) => {
      R(t, 42, 2.3, 4200, 0.05, 0.3, 7), t.noise({ dur: 2.4, gain: 0.03, at: 0.3, type: "highpass", f: 5e3, attack: 0.5 });
    },
    thunder: (t) => {
      t.noise({ dur: 0.08, gain: 0.22, at: 0.45, type: "highpass", f: 2500 }), t.noise({ dur: 1.6, gain: 0.38, at: 0.47, type: "lowpass", f: 220, to: 70, q: 0.7, attack: 0.05 }), R(t, 20, 0.9, 4200, 0.05, 0.5, 3);
    },
    poof: (t) => {
      J(t, 300, 2500, 0.4, 0.14, 0.25), X(t, 600, 900, 0.1, 0.08, 1.4);
    },
    drift: (t) => J(t, 700, 300, 1.6, 0.06, 0.2),
    sunbathe: (t) => D(t, [72, 76, 79], 0.12, 0.07, 0.2, 1.1),
    tidy: (t) => {
      for (let e = 0; e < 4; e++) t.noise({ dur: 0.16, gain: 0.06, at: e * 0.3, type: "bandpass", f: 2500, to: 1200, q: 1.5 });
    },
    done: (t) => {
      J(t, 600, 1400, 0.2, 0.06), D(t, [76, 79, 84], 0.08, 0.1, 0.05);
    },
    error: (t) => {
      R(t, 14, 1.2, 4e3, 0.05, 0.2, 2), t.tone({ f: O(67), to: O(62), dur: 0.5, gain: 0.07, type: "triangle" });
    }
  },
  name: m("Puff", "小云"),
  material: m("Cloud", "云"),
  tagline: m("A small cloud that tidies up after you.", "一朵帮你收拾房间的小云。"),
  bio: m(
    "Puff floats a little above everything. It rains when it's sad, rumbles when it's cross, and drifts off when nobody is watching. Give it a job and it gets oddly serious about it.",
    "小云总是比别的东西飘高一点。难过会下雨，生气会打雷，没人看着就慢慢飘走。交给它一件事，它会认真得有点过头。"
  ),
  traits: { en: ["Floats", "Weather = mood", "Drifts off"], zh: ["会飘", "心情写在天气上", "一不留神就飘走"] },
  origin: m("OneTidy", "OneTidy 收纳 App"),
  physics: at({
    floaty: !0,
    hover: 0.32,
    gravity: 0,
    hopPower: 2.6,
    morphStiffness: 95,
    morphDamping: 11,
    softStiffness: 150,
    softDamping: 9,
    softSmoothing: 140,
    squashiness: 0.8,
    eyeStiffness: 170,
    wobble: 6e-3,
    breath: 0.03,
    stretch: 0.5
  }),
  eyes: { w: 0.13, h: 0.21, corner: 1, spacing: 0.42, lift: 0.02, topLid: 0, bottomLid: 0, tilt: 0, slant: 0, asym: 0 },
  eyeMode: "ink",
  outlineWidth: 0.075,
  rest: wt,
  shapes: {
    wide: () => U(wt(), 1.22, 0.76, 0, 0.18),
    tall: () => U(wt(), 0.84, 1.22, 0, -0.18),
    puddle: () => U(wt(), 1.45, 0.5, 0, 0.45)
  },
  palettes: [
    { id: "sky", body: "#ffffff", eye: "#141414", outline: "#141414", accent: "#4dabf7", mark: "#141414" },
    { id: "peach", body: "#ffe3d6", eye: "#141414", outline: "#141414", accent: "#ff922b", mark: "#141414" },
    { id: "mint", body: "#e3fafc", eye: "#141414", outline: "#141414", accent: "#20c997", mark: "#141414" },
    { id: "lavender", body: "#f1ebff", eye: "#141414", outline: "#141414", accent: "#845ef7", mark: "#141414" },
    { id: "sunset", body: "#fff3bf", eye: "#141414", outline: "#141414", accent: "#f76707", mark: "#141414" }
  ],
  accessories: rt("bow", "flower", "sprout", "crown"),
  actions: {
    thinking: C("thinking", {
      enter(t) {
        ht.thinking.enter?.(t, !1), t.hover.target = 0.5;
      },
      tick(t, e, s) {
        if (t.lean.target = Math.sin(e * 1.1) * 0.08, z(e, s, 0.9, 0.4)) {
          const i = t.bodyCenter();
          t.emit({ kind: "puff", x: i.x + 0.8, y: i.y - 0.85, vx: 0.15, vy: -0.45, life: 1.6, size: 0.1, grow: 0.05, color: t.palette.outline ?? "#141414" });
        }
      },
      front: void 0
    }),
    working: C("working", {
      enter(t) {
        t.express("focused"), t.lookAt(0, 1);
      },
      tick(t, e, s) {
        if (t.rootX.target = Math.sin(e * 1.8) * 0.45, t.lean.target = Math.cos(e * 1.8) * 0.12, z(e, s, 0.3)) {
          const i = t.bodyCenter();
          t.emit({ kind: "dust", x: i.x + (t.rand() - 0.5) * 1.2, y: 1, vx: (t.rand() - 0.5) * 1.4, vy: -0.6, drag: 1.5, life: 0.8, size: 0.05, color: "#ced4da" });
        }
      },
      back: void 0,
      front: void 0
    }),
    done: C("done", {
      enter(t) {
        t.express("happy"), t.hover.target = 0.6, t.spinBy(1);
      },
      tick(t, e, s) {
        g(e, s, 0.4) && $(t, 8, "#ffd43b");
      },
      back: pe,
      front: ze
    }),
    error: C("error", {
      enter(t) {
        t.express("sad"), t.tintColor = "#adb5bd", t.tint.target = 0.6, t.hover.target = 0.42;
      },
      tick(t, e, s) {
        z(e, s, 0.08, 0.2) && e < 1.4 && Wt(t);
      },
      front: Kt
    }),
    sleep: {
      ...ht.sleep,
      enter(t) {
        t.express("closed"), t.hover.target = 0.08, t.morph("wide");
      },
      tick(t, e) {
        t.scale.target = 1 + Math.sin(e * 1.4) * 0.025;
      }
    },
    rain: {
      kind: "once",
      duration: 3.2,
      label: m("Rain", "下雨"),
      enter(t) {
        t.express("sad"), t.tintColor = "#adb5bd", t.tint.target = 0.55, t.hover.target = 0.42;
      },
      tick(t, e, s) {
        z(e, s, 0.07, 0.3) && e < 2.6 && Wt(t), g(e, s, 2.6) && t.express("soft");
      }
    },
    thunder: {
      kind: "once",
      duration: 2,
      label: m("Thunder", "打雷"),
      enter(t) {
        t.express("angry"), t.tintColor = "#495057", t.tint.target = 0.75, t.scale.target = 1.08;
      },
      tick(t, e, s) {
        g(e, s, 0.45) && t.shake(0.06, 34, 2.4), z(e, s, 0.05, 0.45) && e < 1.4 && Wt(t, !0);
      },
      front: Ls
    },
    poof: {
      kind: "once",
      duration: 2.6,
      label: m("Poof", "散开"),
      enter(t) {
        t.express("surprised");
      },
      tick(t, e, s) {
        if (g(e, s, 0.3)) {
          t.scale.target = 0.2;
          const i = t.bodyCenter();
          for (let n = 0; n < 9; n++) {
            const a = n / 9 * M + t.rand() * 0.3;
            t.emit({
              kind: "puff",
              x: i.x + Math.cos(a) * 0.5,
              y: i.y + Math.sin(a) * 0.5,
              vx: Math.cos(a) * 2.2,
              vy: Math.sin(a) * 2.2,
              drag: 2.6,
              life: 1.5,
              size: 0.18 + t.rand() * 0.12,
              grow: -0.08,
              color: t.palette.outline ?? "#141414"
            });
          }
        }
        g(e, s, 1.4) && (t.scale.target = 1, t.express("happy"));
      }
    },
    drift: {
      kind: "once",
      duration: 3.6,
      label: m("Drift away", "飘走"),
      enter(t) {
        t.express("soft");
      },
      tick(t, e) {
        const s = v(e / 1.6) - v((e - 2) / 1.4);
        t.rootX.target = s * 0.9, t.lean.target = s * 0.18 * (e < 2 ? 1 : -1), t.lookAt(e < 2 ? 1 : -1, 0), t.hover.target = 0.32 + s * 0.25, e > 2 && t.express("surprised");
      }
    },
    sunbathe: {
      kind: "once",
      duration: 3,
      label: m("Sunbathe", "晒太阳"),
      enter(t) {
        t.express({ w: 1.05, h: 0.75, corner: 1, bottomLid: 0.55 }), t.lookAt(0.8, -0.8);
      },
      tick(t, e, s) {
        if (t.scale.target = 1 - v(e / 2) * 0.16, z(e, s, 0.5, 0.8)) {
          const i = t.bodyCenter();
          t.emit({ kind: "smoke", x: i.x + (t.rand() - 0.5), y: i.y - 0.8, vy: -0.8, life: 1, size: 0.08, grow: 0.12, color: "#ced4da" });
        }
      },
      back: pe
    },
    tidy: {
      kind: "loop",
      label: m("Tidying", "收拾"),
      enter(t) {
        t.express("focused"), t.lookAt(0, 1);
      },
      tick(t, e, s) {
        if (t.rootX.target = Math.sin(e * 1.8) * 0.45, t.lean.target = Math.cos(e * 1.8) * 0.12, z(e, s, 0.3)) {
          const i = t.bodyCenter();
          t.emit({ kind: "dust", x: i.x + (t.rand() - 0.5) * 1.2, y: 1, vx: (t.rand() - 0.5) * 1.4, vy: -0.6, drag: 1.5, life: 0.8, size: 0.05, color: "#ced4da" });
        }
      }
    }
  },
  signature: ["rain", "thunder", "poof", "drift", "sunbathe", "tidy"],
  fidgets: ["drift", "look-around", "wiggle", "yawn", "bounce"]
}, Xt = () => U(
  Zt([
    { x: -0.3, y: -0.42, r: 0.44 },
    { x: 0.02, y: 0.28, r: 0.62 },
    { x: 0.42, y: 0.24, r: 0.52 },
    { x: 0.82, y: -0.06, r: 0.2 }
  ]),
  0.92,
  0.92,
  0,
  0.02
), It = 0.56;
function Bs(t) {
  const { g: e, R: s, cx: i, cy: n, time: a } = t, o = n + s * It, r = i - s * 1.9, c = i + s * 1.9;
  e.save(), e.beginPath(), e.roundRect(i - s * 1.75, o - s * 0.25, s * 3.5, s * (1.1 - It + 0.25), s * 0.3), e.clip(), e.beginPath(), e.moveTo(r, o);
  for (let d = r; d <= c; d += s * 0.1)
    e.lineTo(d, o + Math.sin((d - i) / s * 3.2 + a * 2.6) * s * 0.035);
  e.lineTo(c, n + s * 1.3), e.lineTo(r, n + s * 1.3), e.closePath(), e.fillStyle = K("#74c0fc", 0.42), e.fill(), e.strokeStyle = K("#ffffff", 0.9), e.lineWidth = s * 0.05, e.beginPath();
  for (let d = r; d <= c; d += s * 0.1) {
    const l = o + Math.sin((d - i) / s * 3.2 + a * 2.6) * s * 0.035;
    d === r ? e.moveTo(d, l) : e.lineTo(d, l);
  }
  e.stroke();
  const h = v(t.actor.fxValue("ripple"));
  if (h > 0.02) {
    const d = a * 0.8 % 1;
    e.strokeStyle = K("#ffffff", h * (1 - d)), e.lineWidth = s * 0.03, e.beginPath(), e.ellipse(i + t.actor.rootX.value * s, o + s * 0.02, s * (0.9 + d * 0.9), s * (0.08 + d * 0.08), 0, 0, M), e.stroke();
  }
  e.restore();
}
function Es(t) {
  const { g: e, R: s, palette: i, actor: n } = t, a = i.outline ?? "#3d2e05", o = v(n.fxValue("beak")), r = n.fxValue("flap"), c = t.toPx(-1.02, -0.3), h = t.toPx(-0.62, -0.34), d = Math.hypot(c.x - h.x, c.y - h.y), l = Math.atan2(c.y - h.y, c.x - h.x);
  e.save(), e.translate(h.x, h.y), e.rotate(l), e.fillStyle = i.accent, e.strokeStyle = a, e.lineWidth = s * 0.045, e.lineJoin = "round";
  const f = d * 0.48, u = d * 0.6, y = s * 0.13;
  for (const b of [-1, 1])
    e.save(), e.rotate(b * o * 0.32), e.beginPath(), e.ellipse(f, 0, u, y, 0, b < 0 ? Math.PI : 0, b < 0 ? Math.PI * 2 : Math.PI), e.closePath(), e.fill(), e.restore();
  e.beginPath(), e.save(), e.rotate(-o * 0.32), e.ellipse(f, 0, u, y, 0, Math.PI, Math.PI * 2), e.restore(), e.save(), e.rotate(o * 0.32), e.ellipse(f, 0, u, y, 0, 0, Math.PI), e.restore(), e.stroke(), e.lineWidth = s * 0.03, e.beginPath(), e.moveTo(f - u * 0.5, 0), e.lineTo(f + u * 0.85, 0), e.stroke(), e.restore();
  const p = t.toPx(0.3, 0.12);
  e.save(), e.translate(p.x, p.y), e.rotate(-0.35 - r * 0.9), e.fillStyle = Gt(i.body, "#000000", 0.08), e.strokeStyle = a, e.lineWidth = s * 0.045, e.beginPath(), e.ellipse(s * 0.06, 0, s * 0.34, s * 0.2, 0.2, 0, M), e.fill(), e.stroke(), e.restore();
}
function Vt(t) {
  t.squish(12), t.poke(1.4), t.flash("closed", 0.35), t.fx("beak").snap(1), t.fx("beak").target = 0, H(t, "♪", "note", t.palette.outline ?? "#3d2e05", 0.24);
}
function ut(t, e = 4) {
  const s = t.bodyCenter();
  for (let i = 0; i < e; i++)
    t.emit({ kind: "bubble", x: s.x + (t.rand() - 0.5) * 1.2, y: It + 0.2, vy: -0.8 - t.rand() * 0.6, vx: (t.rand() - 0.5) * 0.4, life: 1, size: 0.05 + t.rand() * 0.05, color: "#ffffff" });
}
function $t(t, e = 8) {
  const s = t.bodyCenter();
  for (let i = 0; i < e; i++) {
    const n = i % 2 ? 1 : -1;
    t.emit({ kind: "drop", x: s.x + n * (0.5 + t.rand() * 0.4), y: It, vx: n * (0.8 + t.rand() * 1.4), vy: -2.4 - t.rand() * 1.4, ay: 9, life: 0.8, size: 0.06, color: "#74c0fc" });
  }
}
const Fs = {
  id: "duck",
  // the squeeze of a rubber duck, bath water
  sounds: {
    hello: (t) => dt(t, 0, 1250, 0.1),
    tap: (t) => dt(t, 0, 1150, 0.13),
    squeak: (t) => dt(t, 0.45, 1100, 0.16),
    quack: (t) => {
      for (const e of [0.1, 0.55])
        t.tone({ f: 560, to: 420, dur: 0.16, gain: 0.28, at: e, type: "sawtooth", filter: { type: "bandpass", f: 1e3, q: 3 } }), t.tone({ f: 1100, to: 850, dur: 0.12, gain: 0.12, at: e, type: "sawtooth", filter: { type: "bandpass", f: 2400, q: 4 } });
    },
    flip: (t) => {
      dt(t, 0.2, 1300, 0.08), ct(t, 1.2, 0.16);
    },
    paddle: (t) => {
      for (let e = 0; e < 4; e++) ct(t, 0.2 + e * 0.6, 0.11);
    },
    dive: (t) => {
      for (let e = 0; e < 6; e++) X(t, 500 + e * 120, 900 + e * 140, 0.06, 0.05, 0.4 + e * 0.08);
      ct(t, 1.3, 0.16);
    },
    done: (t) => {
      dt(t, 0, 1300, 0.1), ct(t, 0.3, 0.12);
    },
    error: (t) => t.tone({ f: 380, to: 300, dur: 0.3, gain: 0.24, type: "sawtooth", filter: { type: "bandpass", f: 800, q: 3 } })
  },
  name: m("Quack", "嘎嘎"),
  material: m("Rubber duck", "橡皮鸭"),
  tagline: m("Squeaks when squeezed. Listens while you debug.", "一捏就吱，你讲 bug 它认真听。"),
  bio: m(
    "Quack is the bath-tub duck programmers explain their bugs to. It bobs in its own little bath, nods along while it listens, and squeaks when you press it. Squeeze it three times and it tips bottom-up, then rights itself; finish something and it flaps and quacks.",
    "嘎嘎就是程序员拿来讲 bug 的那只小黄鸭。它漂在自己的小澡盆里，你说话它就认真点头，你一捏它就吱一声。连捏三下它会翻个底朝天再翻回来；事情办成了，它会拍着翅膀嘎嘎叫。"
  ),
  traits: { en: ["Squeaks", "Good listener", "Always afloat"], zh: ["一捏就吱", "最会倾听", "永远浮着"] },
  physics: at({ floaty: !0, hover: 0.02, hopPower: 2.2, squashiness: 1.3, squashStiffness: 260, squashDamping: 9, softStiffness: 220, softDamping: 9, breath: 0.015 }),
  eyes: { w: 0.15, h: 0.22, corner: 1, spacing: 0.42, lift: 0.08, topLid: 0, bottomLid: 0, tilt: 0, slant: 0, asym: 0 },
  eyeMode: "ink",
  eyeShine: 0.7,
  outlineWidth: 0.055,
  splash: !1,
  face: { x: -0.28, y: -0.4, r: 0.36 },
  rest: Xt,
  shapes: {
    wide: () => U(Xt(), 1.12, 0.86, 0, 0.12),
    tall: () => U(Xt(), 0.9, 1.1, 0, -0.08)
  },
  palettes: [
    { id: "classic", body: "#ffd43b", accent: "#ff922b", outline: "#3d2e05", eye: "#1f1a0e", mark: "#3d2e05" },
    { id: "pink", body: "#ffc9de", accent: "#ff8787", outline: "#3b1d2a", eye: "#2a121d", mark: "#3b1d2a" },
    { id: "mint", body: "#b2f2bb", accent: "#ffa94d", outline: "#163a1f", eye: "#0f2615", mark: "#163a1f" },
    { id: "snow", body: "#f8f9fa", accent: "#ffa94d", outline: "#2b2d42", eye: "#1b1c2b", mark: "#2b2d42" },
    { id: "pirate", body: "#495057", accent: "#ffd43b", outline: "#101113", eye: "#ffffff", mark: "#495057" }
  ],
  accessories: rt("cap", "crown", "beret"),
  effects: {
    beak: { rest: 0, stiffness: 90, damping: 10 },
    flap: { rest: 0, stiffness: 160, damping: 8 },
    ripple: { rest: 0, stiffness: 40, damping: 10 }
  },
  // the bath is drawn after the duck, so it sits in the water
  paintFace(t) {
    Es(t), Bs(t);
  },
  react: {
    tap(t, e) {
      return e === 3 ? (t.cues.flipUntil = t.time + 1.3, t.lean.target = Math.PI, ut(t, 5), !0) : (Vt(t), !0);
    }
  },
  update(t) {
    t.time > (t.cues.flipUntil ?? -1) && t.cues.flipUntil && (t.cues.flipUntil = 0, t.lean.target = 0, t.flash("dizzy", 1));
  },
  actions: {
    listening: C("listening", {
      // rubber-duck debugging: it nods along
      enter(t) {
        t.express({ w: 1.08, h: 1.08, lift: 0.1 }), t.lookAt(-0.6, 0);
      },
      tick(t, e, s) {
        z(e, s, 1.3, 0.4) && (t.squish(4), t.lean.velocity -= 1.2);
      }
    }),
    thinking: C("thinking", {
      tick(t, e) {
        t.lean.target = -0.16 + Math.sin(e * 1.2) * 0.05;
      },
      front: kt
    }),
    working: C("working", {
      // paddles in circles
      enter(t) {
        t.express("focused"), t.fx("ripple").target = 1;
      },
      tick(t, e, s) {
        t.rootX.target = Math.sin(e * 1.6) * 0.5, t.lean.target = Math.cos(e * 1.6) * 0.08, z(e, s, 0.9) && ut(t, 1);
      },
      back: void 0,
      front: void 0
    }),
    done: C("done", {
      enter(t) {
        t.express("happy"), t.hop(1), t.fx("beak").snap(1);
      },
      tick(t, e, s) {
        t.fx("flap").target = e < 1.2 && Math.sin(e * 22) > 0 ? 1 : 0, g(e, s, 0.3) && ($t(t), $(t, 6, "#ffd43b"), H(t, "♪", "note", t.palette.outline ?? "#3d2e05", 0.28));
      },
      front: void 0
    }),
    error: C("error", {
      // bottoms up
      enter(t) {
        t.express("surprised"), t.lean.target = Math.PI, ut(t, 5);
      },
      tick(t, e, s) {
        g(e, s, 1.2) && (t.lean.target = 0, t.express("dizzy"));
      }
    }),
    sleep: C("sleep", {
      enter(t) {
        t.express("closed"), t.lean.target = 0.12;
      },
      front: vt
    }),
    squeak: {
      kind: "once",
      duration: 1.3,
      label: m("Squeak", "吱"),
      enter(t) {
        Vt(t);
      },
      tick(t, e, s) {
        g(e, s, 0.45) && Vt(t);
      }
    },
    quack: {
      kind: "once",
      duration: 1.6,
      label: m("Quack", "嘎嘎"),
      enter(t) {
        t.express("excited");
      },
      tick(t, e, s) {
        t.fx("beak").target = e < 1 && Math.sin(e * 18) > 0 ? 1 : 0, (g(e, s, 0.1) || g(e, s, 0.55)) && H(t, "♪", "note", t.palette.outline ?? "#3d2e05", 0.26);
      }
    },
    flip: {
      kind: "once",
      duration: 2.2,
      label: m("Bottoms up", "翻个底朝天"),
      enter(t) {
        t.express("surprised"), t.lean.target = Math.PI, ut(t, 6);
      },
      tick(t, e, s) {
        g(e, s, 1.2) && (t.lean.target = 0, t.express("dizzy"), $t(t, 4));
      }
    },
    paddle: {
      kind: "once",
      duration: 3,
      label: m("Paddle", "划水"),
      enter(t) {
        t.express("happy"), t.fx("ripple").target = 1;
      },
      tick(t, e) {
        t.rootX.target = e < 2.4 ? Math.sin(e * 2.6) * 0.9 : 0, t.lean.target = e < 2.4 ? Math.cos(e * 2.6) * 0.1 : 0;
      }
    },
    dive: {
      kind: "once",
      duration: 2.6,
      label: m("Dive", "扎猛子"),
      enter(t) {
        t.express("closed"), t.hover.target = -1.3, t.lean.target = -0.5;
      },
      tick(t, e, s) {
        g(e, s, 0.4) && ut(t, 6), g(e, s, 1.3) && (t.hover.target = 0.02, t.lean.target = 0, t.hop(1.2), t.express("excited"), $t(t, 10));
      }
    }
  },
  signature: ["squeak", "quack", "flip", "paddle", "dive"],
  fidgets: ["quack", "paddle", "look-around", "squeak"]
}, Ut = () => {
  const t = [];
  for (let e = 0; e <= 40; e++) {
    const s = Math.PI + e / 40 * Math.PI;
    t.push({ x: Math.cos(s) * 0.82, y: Math.sin(s) * 0.86 - 0.08 });
  }
  t.push({ x: 0.84, y: 0.3 });
  for (let e = 0; e <= 48; e++) {
    const s = 0.86 - e / 48 * 1.72;
    t.push({ x: s, y: 0.82 - Math.abs(Math.sin(e / 48 * Math.PI * 3)) * 0.16 });
  }
  return t.push({ x: -0.84, y: 0.3 }), ot(t);
};
function Ds(t, e, s) {
  const i = s.calm ? 0.4 : 1;
  for (const n of t) {
    const a = v((n.y - 0.25) / 0.6);
    a <= 0 || (n.x += Math.sin(n.y * 6 + e * 5) * 0.04 * a * i, n.y += Math.sin(n.x * 7 - e * 6) * 0.05 * a * i);
  }
}
const Re = 2.2, Os = (t) => t.time < (t.cues.hideUntil ?? -1) || !!t.cues.seen && !t.pointerHere && t.time - t.pointerSince > Re;
function Yt(t) {
  t.fx("opacity").snap(1), t.flash("excited", 1.1), t.scale.velocity += 4, t.hop(0.9), t.squish(-5), H(t, "BOO!", "glyph", t.palette.mark ?? "#2b2d42", 0.3);
}
const Ws = {
  id: "ghost",
  // a breathy wooo, air going the wrong way
  sounds: {
    hello: (t) => t.tone({ f: 380, to: 520, dur: 0.45, gain: 0.08, vibrato: [6, 14] }),
    tap: (t) => t.tone({ f: 620, to: 430, dur: 0.3, gain: 0.08, vibrato: [7, 10] }),
    boo: (t) => {
      J(t, 300, 1800, 0.3, 0.12, 0.4), t.tone({ f: 260, to: 430, dur: 0.6, gain: 0.16, at: 0.45, type: "sawtooth", filter: { type: "lowpass", f: 1100 }, vibrato: [5, 18] });
    },
    vanish: (t) => {
      J(t, 2400, 400, 0.9, 0.1), X(t, 400, 800, 0.14, 0.08, 2.1);
    },
    phase: (t) => {
      J(t, 500, 300, 1, 0.07, 0.3), X(t, 500, 900, 0.1, 0.08, 1.4);
    },
    haunt: (t) => t.tone({ f: 440, to: 540, dur: 1.4, gain: 0.07, at: 0.6, vibrato: [5, 22] }),
    peekaboo: (t) => {
      X(t, 500, 1e3, 0.12, 0.12, 1.2), D(t, [84, 88], 0.08, 0.08, 1.35);
    },
    done: (t) => D(t, [79, 83, 86], 0.09, 0.08, 0, 0.8)
  },
  name: m("Boo", "飘飘"),
  material: m("Ghost", "幽灵"),
  tagline: m("Fades when you leave. Jumps out when you come back.", "你一走它就隐身，你一回来它就吓你。"),
  bio: m(
    "Boo is a little ghost that only half believes in you. Look away for a moment and it fades until only its eyes are left; come back and it jumps out with a BOO. Rush at it and it is the one that vanishes. It drifts through walls, and if you pull on it, it stretches into a wisp of smoke.",
    "飘飘是一只半信半疑的小幽灵。你一走开，它就慢慢隐身，只剩一双眼睛；你一回来，它就「哇」地扑出来吓你。你冲它冲得太快，反倒是它先吓得没影。它能穿墙，拽它一下会被拉成一缕烟。"
  ),
  traits: { en: ["Disappears when you leave", "BOO!", "Walks through walls"], zh: ["你走它就隐身", "突然吓人", "会穿墙"] },
  physics: at({ floaty: !0, hover: 0.34, hopPower: 2.6, softStiffness: 140, softDamping: 6, softSmoothing: 150, stretch: 1.7, squashiness: 1.2, wobble: 6e-3 }),
  eyes: { w: 0.19, h: 0.3, corner: 1, spacing: 0.56, lift: 0.08, topLid: 0, bottomLid: 0, tilt: 0, slant: 0, asym: 0 },
  eyeMode: "ink",
  outlineWidth: 0.05,
  splash: !1,
  rest: Ut,
  shapes: {
    tall: () => Ut().map((t) => ({ x: t.x * 0.78, y: t.y * 1.3 - 0.2 })),
    wide: () => Ut().map((t) => ({ x: t.x * 1.2, y: t.y * 0.76 + 0.18 }))
  },
  palettes: [
    { id: "sheet", body: "#f8f9fa", eye: "#2b2d42", accent: "#b197fc", outline: "#2b2d42", mark: "#2b2d42" },
    { id: "mint", body: "#d3f9d8", eye: "#163a1f", accent: "#69db7c", outline: "#163a1f", mark: "#163a1f" },
    { id: "peach", body: "#ffe3e3", eye: "#4a1d1d", accent: "#ff8787", outline: "#4a1d1d", mark: "#4a1d1d" },
    { id: "lilac", body: "#e5dbff", eye: "#2b1f4a", accent: "#9775fa", outline: "#2b1f4a", mark: "#2b1f4a" },
    { id: "shadow", body: "#3b3f46", eye: "#ffffff", accent: "#ffd43b", outline: "#101113", mark: "#3b3f46" }
  ],
  accessories: rt("bow", "tuft", "cap"),
  effects: { opacity: { rest: 0.94, stiffness: 18, damping: 7 } },
  outlineMod: Ds,
  update(t) {
    !t.onceId && t.loopId !== "sleep" && (t.fx("opacity").target = Os(t) ? 0.06 : 0.94);
  },
  react: {
    arrive(t, e) {
      t.cues.seen && e > Re && t.time > (t.cues.hideUntil ?? -1) && Yt(t), t.cues.seen = 1;
    },
    startle(t, e) {
      return t.cues.hideUntil = t.time + 1.4, t.fx("opacity").target = 0.06, t.flash("surprised", 1.4), t.rootX.velocity -= Math.sign(e || 1) * 2, !0;
    },
    tap(t, e) {
      return e >= 3 ? (t.cues.hideUntil = t.time + 1.2, t.fx("opacity").target = 0.06, t.flash("dizzy", 1.2), !0) : (t.flash("happy", 0.6), t.jiggle(0.8), t.hop(0.5), !0);
    }
  },
  actions: {
    thinking: C("thinking", {
      enter(t) {
        t.express("curious"), t.lookAt(0.7, -0.9), t.hover.target = 0.55;
      },
      tick(t, e) {
        t.lean.target = Math.sin(e * 1.2) * 0.12;
      },
      front: kt
    }),
    working: C("working", {
      // zips around in loops
      enter(t) {
        t.express("focused");
      },
      tick(t, e, s) {
        if (t.rootX.target = Math.sin(e * 2.2) * 0.55, t.hover.target = 0.34 + Math.sin(e * 4.4) * 0.12, t.lean.target = Math.cos(e * 2.2) * 0.2, z(e, s, 0.25)) {
          const i = t.bodyCenter();
          t.emit({ kind: "smoke", x: i.x - Math.cos(e * 2.2) * 0.6, y: i.y + 0.5, vy: 0.2, life: 0.7, size: 0.1, grow: 0.15, color: "#dee2e6", back: !0 });
        }
      },
      back: void 0,
      front: void 0
    }),
    done: C("done", {
      enter(t) {
        Yt(t);
      },
      tick(t, e, s) {
        g(e, s, 0.4) && $(t, 8, t.palette.accent);
      },
      front: void 0
    }),
    error: C("error", {
      enter(t) {
        t.express("sad");
      },
      tick(t, e) {
        t.fx("opacity").target = e < 1.3 && Math.sin(e * 40) > 0.2 ? 0.15 : 0.94;
      }
    }),
    sleep: C("sleep", {
      enter(t) {
        t.express("closed"), t.morph("wide"), t.hover.target = 0.12, t.fx("opacity").target = 0.55;
      },
      front: vt
    }),
    boo: {
      kind: "once",
      duration: 1.8,
      label: m("BOO!", "吓你一跳"),
      enter(t) {
        t.fx("opacity").snap(0.06), t.express("closed");
      },
      tick(t, e, s) {
        g(e, s, 0.45) && Yt(t);
      }
    },
    vanish: {
      kind: "once",
      duration: 3,
      label: m("Vanish", "隐身"),
      enter(t) {
        t.express("shy"), t.fx("opacity").target = 0.06;
      },
      tick(t, e, s) {
        e > 0.6 && e < 2 && t.lookAt(Math.sin(e * 3), 0), g(e, s, 2.1) && (t.fx("opacity").target = 0.94, t.express("happy"), t.lookFree());
      }
    },
    phase: {
      kind: "once",
      duration: 3.2,
      label: m("Through the wall", "穿墙"),
      enter(t) {
        t.express("excited"), t.rootX.target = 1.9;
      },
      tick(t, e, s) {
        g(e, s, 1.4) && (t.rootX.target = 0, t.express("happy"));
      }
    },
    haunt: {
      kind: "once",
      duration: 3,
      label: m("Wooo", "呜~"),
      enter(t) {
        t.express("soft"), H(t, "wooo", "glyph", t.palette.mark ?? "#2b2d42", 0.26);
      },
      tick(t, e, s) {
        t.rootX.target = e < 2.6 ? Math.sin(e * 2.4) * 0.4 : 0, t.hover.target = 0.34 + Math.cos(e * 2.4) * 0.15, t.fx("opacity").target = 0.5 + 0.44 * Math.abs(Math.cos(e * 1.6)), g(e, s, 1.4) && H(t, "wooo", "glyph", t.palette.mark ?? "#2b2d42", 0.22);
      }
    },
    peekaboo: {
      kind: "once",
      duration: 2.6,
      label: m("Peekaboo", "躲猫猫"),
      enter(t) {
        t.express("closed"), t.hover.target = -0.9;
      },
      tick(t, e, s) {
        g(e, s, 1.2) && (t.hover.target = 0.34, t.express("excited")), g(e, s, 1.5) && t.flash("happy", 0.8);
      }
    }
  },
  signature: ["boo", "vanish", "phase", "haunt", "peekaboo"],
  fidgets: ["haunt", "peekaboo", "look-around", "wiggle"]
}, ue = zt(4.4, 0.9);
function ye(t, e, s) {
  const { g: i, R: n, cx: a, cy: o } = t, r = v((e - 0.5) / 0.3);
  if (r <= 0) return;
  const c = 1 - (1 - r) ** 3, h = n * 3.1, d = a - h / 2, l = o + n * 0.86;
  i.save(), i.globalAlpha = s * 0.9, i.strokeStyle = "#ffd43b", i.lineWidth = n * 0.4, i.lineCap = "round", i.beginPath(), i.moveTo(d, l + n * 0.04), i.quadraticCurveTo(d + h * c * 0.5, l + n * 0.08, d + h * c, l - n * 0.05), i.stroke(), i.restore();
}
function be(t, e, s) {
  const { g: i, R: n, cx: a, cy: o } = t;
  i.save(), i.globalAlpha = s, i.strokeStyle = K(t.palette.body, 0.85), i.lineWidth = n * 0.06, i.lineCap = "round", i.beginPath();
  const r = e / 5 % 1.2;
  for (let c = 0; c <= 60 * Math.min(1, r); c++) {
    const h = a - n * 1.3 + c / 60 * n * 2.6, d = o + n * 1.12 + Math.sin(c * 0.9) * n * 0.05;
    c === 0 ? i.moveTo(h, d) : i.lineTo(h, d);
  }
  i.stroke(), i.restore();
}
const Xs = {
  id: "inky",
  // a wet bloop, the thump of a stamp
  sounds: {
    hello: (t) => X(t, 300, 650, 0.12, 0.16),
    tap: (t) => {
      X(t, 560, 230, 0.1, 0.18), t.noise({ dur: 0.03, gain: 0.05, type: "highpass", f: 3e3 });
    },
    stamp: (t) => {
      X(t, 380, 620, 0.12, 0.08, 0.2), mt(t, 0.5, 0.28, 130), t.noise({ dur: 0.04, gain: 0.12, at: 0.5, type: "bandpass", f: 1800, q: 2 });
    },
    splat: (t) => {
      t.noise({ dur: 0.18, gain: 0.2, at: 0.5, type: "bandpass", f: 1200, to: 400, q: 1.2 }), X(t, 420, 120, 0.16, 0.12, 0.5), X(t, 300, 600, 0.12, 0.1, 1.9);
    },
    count: (t) => [0.15, 0.75, 1.35].forEach((e, s) => X(t, O(72 + s * 4), O(74 + s * 4), 0.1, 0.12, e)),
    star: (t) => D(t, [84, 88, 91], 0.06, 0.08, 0.55),
    splash: (t) => {
      R(t, 8, 0.7, 1500, 0.08, 0, 4), ct(t, 0, 0.1);
    },
    write: (t) => {
      for (let e = 0; e < 5; e++) t.noise({ dur: 0.12, gain: 0.13, at: e * 0.35, type: "bandpass", f: 3200, q: 2 });
    },
    done: (t) => {
      mt(t, 0.5, 0.24, 130), D(t, [79, 84], 0.08, 0.1, 0.55);
    }
  },
  name: m("Inky", "小墨"),
  material: m("Ink", "墨"),
  tagline: m("A living drop of ink that stamps your day.", "一滴活的墨，帮你给每一天盖章。"),
  bio: m(
    "Inky was spilled on a habit tracker and decided to stay. It morphs into whatever it needs to be: a stamp, a star, the number of your streak. When it lands too hard, it splashes.",
    "小墨是一滴洒在打卡本上、决定留下来的墨。它想变成什么就变成什么：一枚印章、一颗星、你连续打卡的天数。落地太用力时会溅出墨点。"
  ),
  traits: { en: ["Shape-shifter", "Stamps everything", "Splashes when excited"], zh: ["会变形", "什么都想盖个章", "一激动就溅墨"] },
  origin: m("Inky Habits (墨团习惯)", "墨团习惯 App"),
  physics: at({}),
  eyes: { w: 0.23, h: 0.34, corner: 0.55, spacing: 0.56, lift: 0.08, topLid: 0, bottomLid: 0, tilt: 0, slant: 0, asym: 0 },
  eyeMode: "hole",
  sheen: 1,
  rest: () => _(),
  palettes: [
    { id: "ink", body: "#141414", eye: "#ffffff", accent: "#ffd43b", mark: "#141414" },
    { id: "indigo", body: "#283a8f", eye: "#ffffff", accent: "#ffd43b", mark: "#283a8f" },
    { id: "sepia", body: "#5b3a29", eye: "#ffffff", accent: "#ff922b", mark: "#5b3a29" },
    { id: "plum", body: "#5f3dc4", eye: "#ffffff", accent: "#ffd43b", mark: "#5f3dc4" },
    { id: "teal", body: "#0b7285", eye: "#ffffff", accent: "#ffd43b", mark: "#0b7285" },
    { id: "vermilion", body: "#d6453a", eye: "#ffffff", accent: "#ffd43b", mark: "#d6453a" }
  ],
  accessories: rt("tuft", "cap", "beret", "sprout"),
  actions: {
    // Inky's own takes on the shared states
    thinking: C("thinking", {
      enter(t) {
        ht.thinking.enter?.(t, !1), t.morph("droplet");
      }
    }),
    working: C("working", {
      enter(t) {
        t.express("focused"), t.lean.target = 0.1, t.lookAt(0.5, 0.8);
      },
      tick(t, e, s) {
        t.rootX.target = Math.sin(e * 2.2) * 0.25, z(e, s, 0.35) && t.squish(2);
      },
      back: (t, e, s) => be(t, e, s),
      front: void 0
    }),
    done: C("done", {
      enter(t) {
        t.express("focused"), t.morph(ue), t.hop(0.95);
      },
      tick(t, e, s) {
        g(e, s, 0.5) && (t.squish(9), t.express("proud"), $(t, 6));
      },
      back: ye
    }),
    error: C("error", {
      enter(t) {
        t.express("sad"), t.morph("puddle", { squash: 0 }), t.shake(0.05, 18, 2.5);
      },
      tick(t, e, s) {
        g(e, s, 1.2) && t.morph("rest");
      },
      front: Kt
    }),
    sleep: {
      ...ht.sleep,
      enter(t) {
        t.express("closed"), t.morph("moon");
      }
    },
    stamp: {
      kind: "once",
      duration: 1.9,
      label: m("Stamp", "盖章"),
      enter(t) {
        t.express("focused"), t.morph(ue), t.hop(0.95);
      },
      tick(t, e, s) {
        g(e, s, 0.5) && (t.squish(9), t.express("proud"));
      },
      back: ye
    },
    splat: {
      kind: "once",
      duration: 2.6,
      label: m("Splat", "躺平"),
      enter(t) {
        t.express("surprised"), t.hop(0.8);
      },
      tick(t, e, s) {
        g(e, s, 0.5) && (t.morph("puddle", { blink: !1, squash: 0 }), t.express("sleepy")), g(e, s, 1.9) && (t.morph("rest"), t.hop(0.7), t.express("happy"));
      }
    },
    count: {
      kind: "once",
      duration: 2.4,
      label: m("Count", "数数"),
      enter(t) {
        t.express("excited"), t.hop(0.5);
      },
      tick(t, e, s) {
        g(e, s, 0.15) && t.morph("text:1"), g(e, s, 0.75) && t.morph("text:2"), g(e, s, 1.35) && (t.morph("text:3"), t.hop(0.5));
      }
    },
    star: {
      kind: "once",
      duration: 2,
      label: m("Star", "变星星"),
      enter(t) {
        t.express("excited"), t.morph("star"), t.spinBy(0.5), t.hop(0.8);
      },
      tick(t, e, s) {
        g(e, s, 0.6) && $(t, 8, "#ffd43b");
      }
    },
    splash: {
      kind: "once",
      duration: 1.4,
      label: m("Shake off", "甩墨"),
      enter(t) {
        t.express("closed"), t.shake(0.08, 30, 2.5);
      },
      tick(t, e, s) {
        if (z(e, s, 0.12) && e < 0.7) {
          const i = t.bodyCenter(), n = t.rand() < 0.5 ? -1 : 1;
          t.emit({
            kind: "drop",
            x: i.x + n * 0.9,
            y: i.y - 0.2,
            vx: n * (2 + t.rand() * 1.5),
            vy: -2 - t.rand() * 1.5,
            ay: 9,
            life: 1.3,
            size: 0.06 + t.rand() * 0.04,
            lands: !0,
            color: t.palette.body
          });
        }
        g(e, s, 0.8) && t.express("happy");
      }
    },
    write: {
      kind: "loop",
      label: m("Writing", "写字"),
      enter(t) {
        t.express("focused"), t.lean.target = 0.1, t.lookAt(0.5, 0.8);
      },
      tick(t, e, s) {
        t.rootX.target = Math.sin(e * 2.2) * 0.25, z(e, s, 0.35) && t.squish(2);
      },
      back: (t, e, s) => be(t, e, s)
    }
  },
  signature: ["stamp", "splat", "count", "star", "splash", "write"],
  fidgets: ["look-around", "bounce", "splash", "wiggle", "yawn"]
};
function yt(t) {
  if (t > 0.97) return _();
  const e = 0.25 + 1.75 * t, s = Math.sqrt(Math.max(0, 1 - e * e / 4)), i = e / 2, n = Math.atan2(-s, i), a = Math.atan2(s, i), o = [];
  for (let h = 0; h <= 64; h++) {
    const d = n - h / 64 * (M - (a - n));
    o.push({ x: Math.cos(d), y: Math.sin(d) });
  }
  const r = Math.atan2(-s, i - e), c = Math.atan2(s, i - e);
  for (let h = 1; h < 32; h++) {
    const d = c + h / 32 * (r + M - c);
    o.push({ x: e + Math.cos(d), y: Math.sin(d) });
  }
  return ot(o.map((h) => ({ x: h.x * 0.98 + (1 - t) * 0.25, y: h.y * 0.98 })));
}
const jt = [0.32, 0.5, 0.7, 0.86, 1];
function Vs(t) {
  const { g: e, R: s, palette: i } = t, n = t.toPx(0, 0), a = e.createRadialGradient(n.x, n.y, s * 0.6, n.x, n.y, s * 1.9);
  a.addColorStop(0, K(i.accent, 0.35)), a.addColorStop(1, K(i.accent, 0)), e.fillStyle = a, e.beginPath(), e.arc(n.x, n.y, s * 1.9, 0, M), e.fill();
}
function $s(t) {
  const { g: e, R: s, palette: i } = t;
  e.fillStyle = K(i.core ?? "#e9d58a", 0.6);
  for (const [n, a, o] of [
    [-0.55, -0.45, 0.13],
    [-0.62, 0.42, 0.09],
    [-0.2, 0.68, 0.07],
    [0.3, -0.62, 0.06]
  ]) {
    const r = t.toPx(n, a);
    e.beginPath(), e.arc(r.x, r.y, s * o, 0, M), e.fill();
  }
}
function St(t, e = 5) {
  const s = t.bodyCenter();
  for (let i = 0; i < e; i++) {
    const n = t.rand() * M, a = 1.2 + t.rand() * 0.5;
    t.emit({ kind: "star", x: s.x + Math.cos(n) * a, y: s.y + Math.sin(n) * a * 0.8, vy: -0.1, life: 1 + t.rand() * 0.6, size: 0.06 + t.rand() * 0.06, color: "#ffd43b", vrot: 1.5 });
  }
}
function Pt(t, e) {
  t.morph(`phase${e}`, { blink: !1, squash: 1 });
}
const Us = {
  id: "moon",
  // little bells, brighter as it fills
  sounds: {
    hello: (t) => D(t, [88, 95], 0.06, 0.07, 0, 0.6),
    tap: (t) => D(t, [91], 0, 0.08, 0, 0.6),
    wax: (t) => {
      D(t, [72, 76, 79, 83, 86], 0.32, 0.06, 0.1, 0.8), D(t, [84, 91, 96], 0.05, 0.09, 1.95, 1.2);
    },
    wane: (t) => D(t, [91, 86, 83, 79, 76], 0.3, 0.06, 0.1, 0.8),
    twinkle: (t) => D(t, [91, 96, 100], 0.08, 0.08, 0.8, 0.7),
    eclipse: (t) => {
      t.tone({ f: 110, dur: 1.4, gain: 0.08, at: 0.2, attack: 0.4 }), t.tone({ f: 165, dur: 1.2, gain: 0.04, at: 0.3, attack: 0.4 }), D(t, [84], 0, 0.08, 1.5, 0.9);
    },
    swing: (t) => [76, 79, 76, 72].forEach((e, s) => D(t, [e], 0, 0.06, s * 0.6, 0.6)),
    done: (t) => D(t, [79, 84, 88, 91], 0.07, 0.09)
  },
  name: m("Luna", "月月"),
  material: m("Moonlight", "月光"),
  tagline: m("Fills up as you go, from a sliver to full.", "你越往前，它就越圆。"),
  bio: m(
    "Luna is the moon, and its phase is a progress bar: it waxes from a thin sliver to a full moon while a job runs, shines full when it is done, and goes dark red in an eclipse when something fails. At night it rocks itself to sleep like a cradle.",
    "月月是一轮月亮，月相就是进度条：事情在进行，它就从细细的月牙慢慢变圆；做完了是一轮满月；出了错会变成红红的月食。到了晚上，它像摇篮一样把自己摇睡着。"
  ),
  traits: { en: ["Phases = progress", "Full when done", "Rocks to sleep"], zh: ["月相就是进度", "做完就是满月", "会摇自己入睡"] },
  physics: at({ floaty: !0, hover: 0.28, squashiness: 0.6, hopPower: 2.6, morphStiffness: 110, morphDamping: 13, breath: 0.015 }),
  eyes: { w: 0.15, h: 0.2, corner: 1, spacing: 0.5, lift: 0.02, topLid: 0.25, bottomLid: 0, tilt: 0.1, slant: 0, asym: 0 },
  eyeMode: "ink",
  outlineWidth: 0.05,
  rest: () => yt(0.5),
  shapes: Object.fromEntries([
    ...jt.map((t, e) => [`phase${e}`, () => yt(t)]),
    ["full", () => _()],
    ["wide", () => yt(0.4)],
    ["tall", () => yt(0.36)],
    ["sliver", () => yt(0.18)]
  ]),
  palettes: [
    { id: "silver", body: "#fff3bf", core: "#ead58c", accent: "#ffe066", outline: "#2b2d42", eye: "#2b2d42", mark: "#2b2d42" },
    { id: "harvest", body: "#ffc078", core: "#f59f61", accent: "#ffa94d", outline: "#3d2410", eye: "#3d2410", mark: "#3d2410" },
    { id: "blue", body: "#d0ebff", core: "#a5c9ea", accent: "#a5d8ff", outline: "#16253d", eye: "#16253d", mark: "#16253d" },
    { id: "ghost", body: "#f1f3f5", core: "#d0d4d9", accent: "#e9ecef", outline: "#212529", eye: "#212529", mark: "#212529" }
  ],
  accessories: rt("tuft", "crown", "flower"),
  paintBack: Vs,
  paintBody: $s,
  actions: {
    thinking: C("thinking", {
      tick(t, e) {
        t.lean.target = Math.sin(e * 1.2) * 0.12;
      }
    }),
    working: C("working", {
      // waxing, over and over: a progress bar that fills and starts again
      enter(t) {
        t.express("focused"), Pt(t, 0);
      },
      tick(t, e, s) {
        z(e, s, 0.9, 0.9) && Pt(t, Math.floor(e / 0.9) % jt.length);
      },
      back: void 0,
      front: void 0
    }),
    done: C("done", {
      enter(t) {
        t.express("proud"), t.morph("full", { squash: 2 }), t.hop(0.6);
      },
      tick(t, e, s) {
        g(e, s, 0.4) && St(t, 7);
      },
      front: void 0
    }),
    error: C("error", {
      enter(t) {
        t.express("sad"), t.morph("full", { blink: !1 }), t.tintColor = "#a61e4d", t.tint.target = 0.55, t.shake(0.04, 20, 2);
      }
    }),
    sleep: C("sleep", {
      enter(t) {
        t.express("closed"), t.morph("sliver");
      },
      tick(t, e) {
        t.lean.target = Math.sin(e * 1.3) * 0.22;
      },
      front: vt
    }),
    wax: {
      kind: "once",
      duration: 2.8,
      label: m("Wax", "慢慢变圆"),
      enter(t) {
        t.express("focused"), t.morph("sliver", { squash: 0 });
      },
      tick(t, e, s) {
        jt.forEach((i, n) => g(e, s, 0.35 + n * 0.32) && Pt(t, n)), g(e, s, 1.95) && (t.express("proud"), St(t, 5));
      }
    },
    wane: {
      kind: "once",
      duration: 2.6,
      label: m("Wane", "慢慢变弯"),
      enter(t) {
        t.express("soft"), t.morph("full", { squash: 0 });
      },
      tick(t, e, s) {
        [4, 3, 2, 1, 0].forEach((i, n) => g(e, s, 0.35 + n * 0.3) && Pt(t, i)), g(e, s, 1.9) && t.morph("sliver");
      }
    },
    twinkle: {
      kind: "once",
      duration: 2,
      label: m("Twinkle", "眨星星"),
      enter(t) {
        t.express("happy"), St(t, 6);
      },
      tick(t, e, s) {
        g(e, s, 0.8) && St(t, 4);
      }
    },
    eclipse: {
      kind: "once",
      duration: 2.4,
      label: m("Eclipse", "月食"),
      enter(t) {
        t.express("surprised"), t.morph("full"), t.tintColor = "#a61e4d", t.tint.target = 0.6;
      },
      tick(t, e, s) {
        g(e, s, 1.5) && (t.tint.target = 0, t.express("happy"), $(t, 4, "#ffe066"));
      }
    },
    swing: {
      kind: "once",
      duration: 3,
      label: m("Rock-a-bye", "摇啊摇"),
      enter(t) {
        t.express("closed");
      },
      tick(t, e) {
        t.lean.target = Math.sin(e * 2.4) * 0.3 * v(2.6 - e);
      }
    }
  },
  signature: ["wax", "wane", "twinkle", "eclipse", "swing"],
  fidgets: ["twinkle", "swing", "look-around", "wiggle"]
}, Ys = [zs, Xs, Cs, Ws, Fs, Ms, Us], Ht = Object.fromEntries(Ys.map((t) => [t.id, t])), xe = ["w", "h", "corner", "spacing", "lift", "topLid", "bottomLid", "tilt", "slant", "asym"], Je = {
  w: 0.23,
  h: 0.34,
  corner: 0.55,
  spacing: 0.56,
  lift: 0.08,
  topLid: 0,
  bottomLid: 0,
  tilt: 0,
  slant: 0,
  asym: 0
}, Nt = {
  neutral: {},
  happy: { w: 1.05, h: 0.75, corner: 1, bottomLid: 0.55 },
  excited: { w: 1.05, h: 1.15, corner: 0.7, lift: 0.13 },
  proud: { w: 1.1, h: 0.6, corner: 1, lift: 0.12, bottomLid: 0.6, tilt: -0.15 },
  sleepy: { w: 1.1, h: 0.6, corner: 1, lift: 0.02, topLid: 0.78 },
  closed: { w: 1.15, h: 0.5, corner: 1, topLid: 0.9 },
  curious: { w: 0.9, h: 0.95, asym: 0.35 },
  surprised: { w: 1.1, h: 0.75, corner: 1, spacing: 0.6, lift: 0.13 },
  shy: { w: 0.8, h: 0.65, corner: 0.7, spacing: 0.46, lift: -0.04, bottomLid: 0.35 },
  focused: { w: 1.1, h: 0.42, corner: 0.5, topLid: 0.1 },
  soft: { w: 0.95, h: 0.78, corner: 0.8, topLid: 0.3, tilt: 0.12 },
  sad: { w: 0.95, h: 0.9, corner: 0.8, lift: 0, topLid: 0.32, slant: -0.55 },
  worried: { w: 0.95, h: 1, corner: 0.75, topLid: 0.18, slant: -0.4, lift: 0.1 },
  angry: { w: 1.08, h: 0.85, corner: 0.6, topLid: 0.34, slant: 0.7 },
  dizzy: { w: 1, h: 1, corner: 1, asym: -0.3, tilt: 0.3 },
  wink: { w: 1.05, h: 0.9, asym: 0 }
};
function me(t, e) {
  return {
    w: t.w * (e.w ?? 1),
    h: t.h * (e.h ?? 1),
    corner: e.corner ?? t.corner,
    spacing: e.spacing !== void 0 ? t.spacing * (e.spacing / Je.spacing) : t.spacing,
    lift: e.lift ?? t.lift,
    topLid: e.topLid ?? t.topLid,
    bottomLid: e.bottomLid ?? t.bottomLid,
    tilt: e.tilt ?? t.tilt,
    slant: e.slant ?? t.slant,
    asym: e.asym ?? t.asym
  };
}
const ge = /* @__PURE__ */ new Map(), ke = {
  circle: () => _(),
  pebble: _t,
  squircle: () => zt(),
  droplet: () => Fe(),
  flame: () => Oe(),
  puddle: () => We(),
  egg: Xe,
  star: () => Ve(),
  heart: $e,
  moon: Ue,
  tall: () => U(_(), 0.78, 1.28, 0, -0.28),
  wide: () => U(_(), 1.3, 0.74, 0, 0.26),
  pancake: () => U(_t(), 1.55, 0.5, 0, 0.5),
  tiny: () => U(_(), 0.42, 0.42, 0, 0.58),
  bean: () => Q((t) => 1 + 0.12 * Math.cos(2 * t) - 0.1 * Math.sin(t)).map((t) => ({ x: t.x * 0.9, y: t.y * 1.02 }))
};
function js(t) {
  let e = ge.get(t);
  return e || (t.startsWith("text:") ? e = je(t.slice(5)) : e = (ke[t] ?? ke.circle)(), ge.set(t, e), e);
}
const Ns = 1 / 120, _s = () => typeof performance < "u" ? performance.now() / 1e3 : 0, ve = /* @__PURE__ */ new WeakMap(), Me = /* @__PURE__ */ new WeakMap();
function Hs(t) {
  let e = ve.get(t);
  return e || (e = t.rest(), ve.set(t, e)), e;
}
const we = /* @__PURE__ */ new WeakMap();
function Gs(t) {
  let e = we.get(t);
  return e || (e = Ne(t), we.set(t, e)), e;
}
class Rs {
  def;
  behaviors;
  palette;
  accessory;
  seed;
  time = 0;
  /** set by the host when the user prefers reduced motion */
  calm = !1;
  fidget;
  rng;
  phase;
  rest;
  target;
  targetKey = "rest";
  targetFace;
  base;
  baseV;
  off;
  offV;
  faceX;
  faceY;
  faceR;
  thicken;
  eyes;
  eyeV;
  eyeTarget;
  mood = {};
  height = 0;
  vy = 0;
  airborne = !1;
  squash;
  spin = 0;
  spinV = 0;
  lean = new V(0, 90, 14);
  /** leaning towards a pointer that comes close */
  leanIn = new V(0, 55, 10);
  rootX = new V(0, 70, 13);
  scale = new V(1, 120, 15);
  hover;
  tint = new V(0, 40, 11);
  tintColor = "#000000";
  fluff;
  effects = /* @__PURE__ */ new Map();
  /** moments a character's own drawing keys off (when a glint started) */
  cues = {};
  lookX = new V(0, 70, 15);
  lookY = new V(0, 70, 15);
  pointerLook = null;
  behaviorLook = null;
  shakeAmp = 0;
  shakeFreq = 0;
  shakeDecay = 0;
  shakePhase = 0;
  wobbleBoost = 0;
  blinkNext = 1.6;
  blinkAt = -10;
  grabbed = null;
  petting = !1;
  /** last hard landing, for splashes */
  landing = null;
  listeners = [];
  particles = [];
  overlays = [];
  loopId = "idle";
  loopT = 0;
  onceId = null;
  onceT = 0;
  nextFidget = 5;
  constructor(e, s = {}) {
    this.def = e, this.behaviors = { ...ht, ...e.actions }, this.seed = s.seed ?? "";
    const i = Ze(`${e.id}:${this.seed}`);
    this.rng = Ft(i), this.phase = i % 1e3 / 159, this.fidget = s.fidget ?? !0;
    const n = (c) => c[Math.floor(Ft(i ^ 40503)() * c.length) % c.length];
    this.palette = e.palettes.find((c) => c.id === s.palette) ?? (this.seed ? n(e.palettes) : e.palettes[0]);
    const a = e.accessories ?? [];
    if (s.accessory === null) this.accessory = null;
    else if (s.accessory) this.accessory = a.find((c) => c.id === s.accessory) ?? null;
    else if (this.seed && a.length) {
      const c = Ft(i ^ 20973)();
      this.accessory = c < 0.45 ? null : a[Math.floor(c * 997) % a.length];
    } else this.accessory = null;
    const o = e.physics;
    this.rest = Hs(e), this.target = this.rest, this.targetFace = this.faceOf(this.rest), this.base = this.rest.map((c) => ({ ...c })), this.baseV = this.rest.map(() => ({ x: 0, y: 0 })), this.off = this.rest.map(() => ({ x: 0, y: 0 })), this.offV = this.rest.map(() => ({ x: 0, y: 0 })), this.faceX = new V(this.targetFace.x, o.morphStiffness, o.morphDamping * 1.3), this.faceY = new V(this.targetFace.y, o.morphStiffness, o.morphDamping * 1.3), this.faceR = new V(this.targetFace.r, o.morphStiffness, o.morphDamping * 1.3), this.thicken = new V(0, o.morphStiffness, o.morphDamping * 1.3), this.eyes = { ...e.eyes }, this.eyeTarget = { ...e.eyes }, this.eyeV = Object.fromEntries(xe.map((c) => [c, 0])), this.squash = new V(0, o.squashStiffness, o.squashDamping), this.hover = new V(o.floaty ? o.hover : 0, 30, 9), o.floaty && (this.height = -o.hover), this.fluff = new V(e.fur ?? 0, 110, 9);
    for (const [c, h] of Object.entries(e.effects ?? {}))
      this.effects.set(c, { s: new V(h.rest, h.stiffness ?? 70, h.damping ?? 12), rest: h.rest });
    this.nextFidget = 3 + this.rng() * 4;
    const r = s.state && this.behaviors[s.state] ? s.state : "idle";
    this.loopId = this.behaviors[r].kind === "loop" ? r : "idle", this.addOverlay(this.behaviors[this.loopId]), this.behaviors[this.loopId].enter?.(this, !1), this.behaviors[r].kind === "once" && this.play(r);
  }
  /** Hear what happens to this actor (actions starting, taps, landings): for sounds. */
  on(e) {
    return this.listeners.push(e), () => {
      this.listeners = this.listeners.filter((s) => s !== e);
    };
  }
  announce(e) {
    for (const s of this.listeners) s(e);
  }
  /* ------------------------------------------------------------- control */
  /** Play an action by id. Loops become the new state; one-shots play once and hand back. */
  play(e) {
    const s = this.behaviors[e];
    if (!s) return !1;
    if (s.kind === "loop") {
      if (e === this.loopId && !this.onceId) return !0;
      this.announce({ type: "play", id: e }), this.fadeOverlay(this.behaviors[this.loopId]), this.onceId && this.fadeOverlay(this.behaviors[this.onceId]), this.onceId = null, this.loopId = e, this.loopT = 0, this.resetTargets(), s.enter?.(this, !1), this.addOverlay(s);
    } else
      this.announce({ type: "play", id: e }), this.onceId && this.fadeOverlay(this.behaviors[this.onceId]), this.onceId = e, this.onceT = 0, this.resetTargets(), s.enter?.(this, !1), this.addOverlay(s);
    return !0;
  }
  get state() {
    return this.onceId ?? this.loopId;
  }
  /** A persistent mood layered on the resting face (e.g. "sleepy" all day). */
  setMood(e) {
    this.mood = e === null ? {} : typeof e == "string" ? Nt[e] : e, this.state === "idle" && this.express(this.mood);
  }
  /* ---------------------------------------------- verbs for behaviours */
  rand() {
    return this.rng();
  }
  morph(e, s = {}) {
    const i = typeof e == "string" ? e : "";
    if (i && i === this.targetKey) return;
    const n = typeof e == "string" ? this.shapeNamed(e) : e;
    this.targetKey = i, this.target = Be(n, this.base), this.targetFace = this.faceOf(n), this.squash.velocity -= (s.squash ?? 3) * this.def.physics.squashiness, s.blink !== !1 && this.blink();
  }
  held = null;
  /**
   * Hold a shape for a while, through any state changes (an unread count, a
   * score). Behaviours that morph on their own still win while they run.
   */
  holdShape(e, s) {
    this.held = { key: e, until: this.time + s }, this.morph(e);
  }
  /** Resolve a shape name, preferring this character's own version of it. */
  shapeNamed(e) {
    if (e === "rest") return this.rest;
    const s = this.def.shapes?.[e];
    if (!s) return js(e);
    let i = Me.get(this.def);
    i || (i = /* @__PURE__ */ new Map(), Me.set(this.def, i));
    let n = i.get(e);
    return n || (n = s(), i.set(e, n)), n;
  }
  /** Name of the shape it is turning into ('rest', 'wide', 'text:7'…), or '' for an unnamed one. */
  get shapeKey() {
    return this.targetKey;
  }
  faceOf(e) {
    return e === this.rest && this.def.face ? this.def.face : Gs(e);
  }
  /** Name of the expression showing ('custom' for a one-off), for characters that draw their own face. */
  expression = "neutral";
  express(e) {
    const s = me(this.def.eyes, typeof e == "string" ? Nt[e] : e), i = typeof e == "string" ? e : Object.keys(e).length ? "custom" : "neutral";
    this.flashBack ? (this.flashBack = s, this.flashName = i) : (this.eyeTarget = s, this.expression = i);
  }
  flashBack = null;
  flashName = "neutral";
  flashUntil = 0;
  /** A brief face on top of whatever is going on (a flinch, a giggle); the old face comes back. */
  flash(e, s) {
    this.flashBack || (this.flashBack = this.eyeTarget, this.flashName = this.expression), this.eyeTarget = me(this.def.eyes, typeof e == "string" ? Nt[e] : e), this.expression = typeof e == "string" ? e : "custom", this.flashUntil = this.time + s;
  }
  hop(e = 1) {
    const s = this.def.physics;
    if (s.floaty) {
      this.vy -= s.hopPower * e * 0.8, this.squash.velocity -= 6 * e * s.squashiness;
      return;
    }
    this.airborne && this.height < -0.05 || (this.airborne = !0, this.vy = -s.hopPower * e, this.squash.velocity -= 7 * e * s.squashiness);
  }
  /**
   * Squeeze the whole outline inward (a tap, a landing). Applied to every
   * point with a gentle wave so the dent is smooth: impulses on isolated
   * points excite high-frequency ripples that read as spikes on soft bodies.
   */
  poke(e = 1) {
    const s = this.faceX.value, i = this.faceY.value, n = this.offV.length, a = this.rng() * Math.PI * 2;
    for (let o = 0; o < n; o++) {
      const r = 1.5 * e * (1 + 0.35 * Math.sin(o / n * Math.PI * 4 + a));
      this.offV[o].x -= (this.base[o].x - s) * r, this.offV[o].y -= (this.base[o].y - i) * r;
    }
    this.squash.velocity += 4 * e * this.def.physics.squashiness;
  }
  /** A jiggle: a few smooth random waves around the outline, never spikes. */
  jiggle(e = 1) {
    const s = this.offV.length, i = [2, 3, 5].map((n) => ({ m: n, phase: this.rng() * Math.PI * 2, amp: (0.6 + this.rng() * 0.6) / n }));
    for (let n = 0; n < s; n++) {
      let a = 0;
      for (const { m: h, phase: d, amp: l } of i) a += Math.sin(n / s * Math.PI * 2 * h + d) * l;
      const o = this.base[n].x - this.faceX.value, r = this.base[n].y - this.faceY.value, c = Math.hypot(o, r) || 1;
      this.offV[n].x += o / c * a * 3 * e, this.offV[n].y += r / c * a * 3 * e;
    }
  }
  squish(e) {
    this.squash.velocity += e * this.def.physics.squashiness;
  }
  /** Full turns to spin through (sign = direction). */
  spinBy(e) {
    this.spinV += e * 14;
  }
  shake(e = 0.08, s = 22, i = 3) {
    this.shakeAmp = e, this.shakeFreq = s, this.shakeDecay = i, this.shakePhase = this.time;
  }
  lookAt(e, s) {
    this.behaviorLook = { x: v(e, -1, 1), y: v(s, -1, 1) };
  }
  lookFree() {
    this.behaviorLook = null;
  }
  blink() {
    this.blinkAt = this.time;
  }
  bristle(e = 1) {
    this.fluff.velocity += 13 * e;
  }
  /**
   * One of the character's own effect springs (a gear's teeth, a folded
   * corner), declared in `def.effects`. Like every other target, it goes back
   * to its rest value on each state change.
   */
  fx(e) {
    let s = this.effects.get(e);
    return s || (s = { s: new V(0, 70, 12), rest: 0 }, this.effects.set(e, s)), s.s;
  }
  /** Current value of an effect spring, 0 if the character has none by that name. */
  fxValue(e) {
    return this.effects.get(e)?.s.value ?? 0;
  }
  /** Remember this moment under `name`; `since(name)` reads how long ago it was. */
  cue(e) {
    this.cues[e] = this.time;
  }
  since(e) {
    return this.time - (this.cues[e] ?? -1e9);
  }
  /** Side-to-side rock of a fluttering body in the air. */
  get sway() {
    const e = this.def.physics.flutter;
    return !e || !this.airborne ? 0 : Math.sin(this.time * 7) * e * v(-this.height * 1.5);
  }
  emit(e) {
    this.particles.push({
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      drag: 0,
      grow: 0,
      rot: 0,
      vrot: 0,
      back: !1,
      lands: !1,
      ...e,
      glyph: e.glyph ?? "",
      color: e.color ?? this.palette.body,
      age: 0,
      landed: !1
    }), this.particles.length > 220 && this.particles.splice(0, this.particles.length - 220);
  }
  /** Current body centre (rest centre is 0,0), in body units. */
  bodyCenter() {
    return { x: this.rootX.value + this.shakeOffset(), y: this.height };
  }
  shakeOffset() {
    if (!this.shakeAmp) return 0;
    const e = this.time - this.shakePhase;
    return Math.sin(e * this.shakeFreq) * this.shakeAmp * Math.exp(-e * this.shakeDecay);
  }
  get spinAngle() {
    return this.spin;
  }
  /* ------------------------------------------------------- pointer input */
  /** Pointer position in body units relative to the rest centre, or null when it leaves. */
  ptr = null;
  hoverSince = null;
  lastPurr = -10;
  lastStartle = -10;
  lastTickle = -10;
  flips = [];
  lastDir = 0;
  taps = [];
  /**
   * Where the pointer is, in body units from the rest centre (null when it
   * leaves). Besides moving the eyes, it is how a character notices you: it
   * leans towards a pointer that comes close, flinches when one whips past,
   * enjoys one that rests on it, and giggles when one rubs back and forth.
   */
  /** whether a pointer is over the stage, and since when (sim time) */
  pointerHere = !1;
  pointerSince = 0;
  pointer(e) {
    if (!e) {
      this.pointerLook = null, this.leanIn.target = 0, this.hoverSince = null, this.ptr = null, this.pointerHere && (this.pointerHere = !1, this.pointerSince = this.time);
      return;
    }
    if (!this.pointerHere) {
      const l = this.time - this.pointerSince;
      this.pointerHere = !0, this.pointerSince = this.time, this.def.react?.arrive?.(this, l);
    }
    const s = this.bodyCenter(), i = e.x - s.x, n = e.y - s.y, a = Math.hypot(i, n);
    this.pointerLook = { x: v(i / 1.6, -1, 1), y: v(n / 1.6, -1, 1) };
    const o = v(1 - (a - 1) / 1.8);
    this.leanIn.target = v(i / 2, -1, 1) * 0.12 * o, a < 0.95 ? this.hoverSince ??= this.time : this.hoverSince = null;
    const r = _s();
    if (!this.ptr) {
      this.ptr = { x: e.x, y: e.y, t: r };
      return;
    }
    const c = r - this.ptr.t;
    if (c < 8e-3) return;
    const h = (e.x - this.ptr.x) / c, d = (e.y - this.ptr.y) / c;
    if (this.ptr = { x: e.x, y: e.y, t: r }, !(this.calm || this.grabbed) && (Math.hypot(h, d) > 16 && a > 0.85 && a < 2.4 && this.time - this.lastStartle > 2.2 && this.startle(i), a < 1.15 && Math.abs(h) > 2.5)) {
      const l = Math.sign(h);
      this.lastDir && l !== this.lastDir && (this.flips = [...this.flips.filter((f) => r - f < 1), r]), this.lastDir = l, this.flips.length >= 4 && this.time - this.lastTickle > 1.6 && (this.flips = [], this.giggle());
    }
  }
  /** Something whipped past: flinch away, then look after it. */
  startle(e) {
    this.lastStartle = this.time, !this.def.react?.startle?.(this, e) && (this.flash("surprised", 0.6), this.hop(0.4), this.squish(-3), this.rootX.velocity -= Math.sign(e || 1) * 0.9);
  }
  /** The pointer is resting on it: eyes close happily, it stretches into the hand. */
  purr() {
    this.lastPurr = this.time, !this.def.react?.purr?.(this) && (this.flash("happy", 1.2), this.squish(-2.4), this.rng() < 0.5 && H(this, "♥", "heart", "#ff6b8a", 0.18));
  }
  /** Rubbed back and forth: a fit of giggles. */
  giggle() {
    this.lastTickle = this.time, !this.def.react?.giggle?.(this) && (this.flash("happy", 1.5), this.jiggle(0.9), this.hop(0.3), this.shake(0.035, 32, 2.5), H(this, "♥", "heart", "#ff6b8a", 0.22), $(this, 3, "#ffd43b", 0.6));
  }
  /**
   * A tap on the body. Taps in quick succession escalate: a poke, a giggle,
   * then dizzy (three), then cross (five). Returns how many taps in a row.
   */
  tap() {
    this.taps = [...this.taps.filter((s) => this.time - s < 1.3), this.time];
    const e = this.taps.length;
    return this.announce({ type: "tap", taps: e }), this.def.react?.tap?.(this, e) || (this.poke(1), this.bristle(0.7), e >= 5 ? (this.taps = [], this.flash("angry", 1.8), this.shake(0.06, 30, 1.6), this.hop(0.5), Le(this, 3)) : e === 3 ? (this.flash("dizzy", 1.6), this.spinBy(1), this.hop(0.8), $(this, 5, "#ffd43b")) : e === 4 ? (this.flash("worried", 0.9), this.hop(0.5)) : (this.flash(e === 1 ? "surprised" : "happy", 0.45), this.hop(0.6))), e;
  }
  grab(e) {
    const s = this.bodyCenter();
    let i = 0, n = 1 / 0;
    for (let o = 0; o < this.base.length; o++) {
      const r = Math.hypot(this.base[o].x + this.off[o].x + s.x - e.x, this.base[o].y + this.off[o].y + s.y - e.y);
      r < n && (n = r, i = o);
    }
    const a = { x: this.base[i].x + this.off[i].x + s.x, y: this.base[i].y + this.off[i].y + s.y };
    this.grabbed = { index: i, anchor: a, target: a }, this.announce({ type: "grab" });
  }
  drag(e) {
    if (!this.grabbed) return;
    const s = this.def.physics.stretch;
    let i = e.x - this.grabbed.anchor.x, n = e.y - this.grabbed.anchor.y;
    const a = Math.hypot(i, n);
    a > s && (i = i / a * s, n = n / a * s), this.grabbed.target = { x: this.grabbed.anchor.x + i, y: this.grabbed.anchor.y + n };
  }
  /**
   * Let go after a drag. With a velocity (body units per second) it was
   * flung: off it goes, spinning, and comes back a little dizzy.
   */
  release(e) {
    if (this.grabbed = null, this.announce({ type: "release" }), !e) return;
    const s = Math.hypot(e.x, e.y);
    s < 5 || (this.rootX.velocity += v(e.x * 0.35, -9, 9), this.hop(v(-e.y / 6, 0.4, 1.5)), this.spinBy(Math.sign(e.x || 1) * Math.min(1.5, s / 12)), this.flash("dizzy", 1.4));
  }
  get isGrabbed() {
    return this.grabbed !== null;
  }
  /* ---------------------------------------------------------- simulation */
  /** Advance by real seconds; internally stepped at a fixed rate. */
  advance(e) {
    const s = Math.min(Math.max(e, 0), 0.25), i = Math.ceil(s / Ns - 1e-9);
    for (let n = 0; n < i; n++) this.step(s / i);
  }
  step(e) {
    this.time += e, this.held && this.time >= this.held.until && (this.targetKey === this.held.key && this.morph("rest"), this.held = null), this.runBehaviors(e), this.flashBack && this.time >= this.flashUntil && (this.eyeTarget = this.flashBack, this.expression = this.flashName, this.flashBack = null), this.def.update?.(this, e), this.hoverSince !== null && this.time - this.hoverSince > 0.8 && this.time - this.lastPurr > 1.6 && !this.grabbed && this.purr(), this.integrate(e), this.updateParticles(e);
    for (const s of this.overlays)
      s.t += e, s.alpha.step(e);
    this.overlays = this.overlays.filter((s) => !(s.dying && s.alpha.value < 0.01));
  }
  runBehaviors(e) {
    if (this.onceId) {
      const s = this.behaviors[this.onceId];
      this.onceT += e, s.tick?.(this, this.onceT, e), this.onceT >= (s.duration ?? 1.5) && (this.fadeOverlay(s), this.onceId = null, this.resetTargets(), this.behaviors[this.loopId].enter?.(this, !0));
    } else if (this.loopT += e, this.behaviors[this.loopId].tick?.(this, this.loopT, e), this.loopId === "idle" && this.fidget && !this.calm && this.def.fidgets.length && this.time >= this.nextFidget) {
      const s = this.def.fidgets[Math.floor(this.rng() * this.def.fidgets.length)];
      this.nextFidget = this.time + 5 + this.rng() * 7, this.grabbed || this.play(s);
    }
    this.time >= this.blinkNext && (this.blinkAt = this.time, this.blinkNext = this.time + 1.9 + this.rng() * 2.8, this.rng() < 0.18 && (this.blinkNext = this.time + 0.26));
  }
  resetTargets() {
    this.morph(this.held ? this.held.key : "rest", { squash: 1.5 }), this.express(this.state === "idle" ? this.mood : {}), this.lean.target = 0, this.scale.target = 1, this.tint.target = 0;
    for (const e of this.effects.values()) e.s.target = e.rest;
    this.hover.target = this.def.physics.floaty ? this.def.physics.hover : 0, this.fluff.target = this.def.fur ?? 0, this.rootX.target = 0, this.behaviorLook = null, this.wobbleBoost = 0;
  }
  integrate(e) {
    const s = this.def.physics, i = this.calm ? 0.35 : 1, n = !s.floaty && (this.hover.target > 0 || this.hover.value > 0.02);
    if (s.floaty || n) {
      const p = Math.sin(this.time * 1.6 + this.phase) * 0.05 * i;
      this.hover.step(e);
      const b = -(this.hover.value + p);
      this.vy += ((b - this.height) * 26 - this.vy * 6.5) * e, this.height += this.vy * e, n && (this.airborne = !0);
    } else if (this.airborne && (this.vy += s.gravity * e, this.height += this.vy * e, this.height >= 0)) {
      this.height = 0;
      const p = Math.min(this.vy / s.hopPower, 1.4);
      p > 0.35 && (this.landing = { time: this.time, strength: p }, this.announce({ type: "land", strength: p })), this.squash.velocity += 10 * p * s.squashiness, this.poke(0.6 * p), s.bounce > 0 && this.vy > 1.2 ? this.vy = -this.vy * s.bounce : (this.vy = 0, this.airborne = !1);
    }
    if (this.squash.target = this.airborne || s.floaty ? -v(Math.abs(this.vy) / 30, 0, 0.12) : 0, this.squash.step(e), this.spinV -= this.spinV * 3 * e, this.spin += this.spinV * e, !this.airborne && Math.abs(this.spinV) < 4) {
      const p = Math.round(this.spin / (Math.PI * 2)) * Math.PI * 2;
      this.spin += (p - this.spin) * Math.min(1, e * 8);
    }
    this.lean.step(e), this.leanIn.step(e), this.rootX.step(e), this.scale.step(e), this.tint.step(e);
    for (const p of this.effects.values()) p.s.step(e);
    this.fluff.target = this.petting ? Math.max(1, this.def.fur ?? 0) : this.fluff.target, this.fluff.step(e), this.fluff.value < 0 && (this.fluff.value = 0);
    const a = s.morphStiffness, o = s.morphDamping;
    for (let p = 0; p < this.base.length; p++) {
      const b = this.base[p], x = this.baseV[p], P = this.target[p];
      x.x += ((P.x - b.x) * a - x.x * o) * e, x.y += ((P.y - b.y) * a - x.y * o) * e, b.x += x.x * e, b.y += x.y * e;
    }
    this.faceX.target = this.targetFace.x, this.faceY.target = this.targetFace.y, this.faceR.target = this.targetFace.r, this.thicken.target = v(0.4 - this.targetFace.r, 0, 0.2), this.faceX.step(e), this.faceY.step(e), this.faceR.step(e), this.thicken.step(e);
    const r = this.off.length, c = (s.wobble + this.wobbleBoost) * i, h = this.faceX.value, d = this.faceY.value, l = this.bodyCenter();
    for (let p = 0; p < r; p++) {
      const b = this.off[p], x = this.offV[p];
      let P = 0, k = 0, S = s.softStiffness;
      if (this.grabbed && this.grabbed.index === p)
        P = this.grabbed.target.x - l.x - this.base[p].x, k = this.grabbed.target.y - l.y - this.base[p].y, S = s.softStiffness * 2.5;
      else if (c > 0) {
        const w = this.base[p].x - h, q = this.base[p].y - d, j = Math.hypot(w, q) || 1, F = Math.sin(this.time * 5.2 + p / r * Math.PI * 6 + this.phase) * c;
        P = w / j * F, k = q / j * F;
      }
      const T = this.off[(p - 1 + r) % r], A = this.off[(p + 1) % r], E = (T.x + A.x) / 2 - b.x, B = (T.y + A.y) / 2 - b.y;
      x.x += ((P - b.x) * S + E * s.softSmoothing - x.x * s.softDamping) * e, x.y += ((k - b.y) * S + B * s.softSmoothing - x.y * s.softDamping) * e;
    }
    for (let p = 0; p < r; p++)
      this.off[p].x += this.offV[p].x * e, this.off[p].y += this.offV[p].y * e;
    const f = s.eyeStiffness, u = 2 * Math.sqrt(f) * 0.82;
    for (const p of xe)
      this.eyeV[p] += ((this.eyeTarget[p] - this.eyes[p]) * f - this.eyeV[p] * u) * e, this.eyes[p] += this.eyeV[p] * e;
    const y = this.pointerLook ?? this.behaviorLook;
    y ? (this.lookX.target = y.x * 0.13, this.lookY.target = y.y * 0.09) : (this.lookX.target = re(this.time, 9.3, this.phase) * 0.07 * i, this.lookY.target = re(this.time, 7.1, this.phase + 2) * 0.04 * i), this.lookX.step(e), this.lookY.step(e);
  }
  updateParticles(e) {
    for (const s of this.particles)
      s.age += e, !s.landed && (s.vx += s.ax * e, s.vy += s.ay * e, s.drag && (s.vx *= 1 - Math.min(1, s.drag * e), s.vy *= 1 - Math.min(1, s.drag * e)), s.x += s.vx * e, s.y += s.vy * e, s.rot += s.vrot * e, s.size = Math.max(0, s.size + s.grow * e), s.lands && s.y >= 1 && s.vy > 0 && (s.y = 1, s.landed = !0, s.age = Math.max(s.age, s.life - 0.5)));
    this.particles = this.particles.filter((s) => s.age < s.life);
  }
  /* ------------------------------------------------------- render inputs */
  /** Eye openness after blinks, 0 = closed. */
  get lid() {
    const e = (this.time - this.blinkAt) / 0.18;
    return e < 0 || e > 1 ? 0 : e < 0.45 ? e / 0.45 : 1 - (e - 0.45) / 0.55;
  }
  get look() {
    return { x: this.lookX.value, y: this.lookY.value };
  }
  addOverlay(e) {
    if (!e.back && !e.front) return;
    const s = new V(0, 90, 19);
    s.target = 1, this.overlays.push({ b: e, t: 0, alpha: s, dying: !1 });
  }
  fadeOverlay(e) {
    for (const s of this.overlays)
      s.b === e && !s.dying && (s.dying = !0, s.alpha.target = 0);
  }
  /** Default eyes for this character, for tooling. */
  static get defaultEyes() {
    return { ...Je };
  }
}
function Se(t, e) {
  return typeof OffscreenCanvas < "u" ? new OffscreenCanvas(t, e) : Object.assign(document.createElement("canvas"), { width: t, height: e });
}
function Js(t, e = new Path2D()) {
  if (t.length < 3) return e;
  e.moveTo(t[0].x, t[0].y);
  for (let s = 1; s < t.length; s++) e.lineTo(t[s].x, t[s].y);
  return e.closePath(), e;
}
function Ks(t, e = new Path2D()) {
  const s = t.length;
  if (s < 3) return e;
  e.moveTo(t[0].x, t[0].y);
  for (let i = 0; i < s; i++) {
    const n = t[(i - 1 + s) % s], a = t[i], o = t[(i + 1) % s], r = t[(i + 2) % s];
    e.bezierCurveTo(a.x + (o.x - n.x) / 6, a.y + (o.y - n.y) / 6, o.x - (r.x - a.x) / 6, o.y - (r.y - a.y) / 6, o.x, o.y);
  }
  return e.closePath(), e;
}
function Qs(t) {
  const e = t.def.physics, s = Math.sin(t.time * 2.2) * e.breath * (t.calm ? 0.5 : 1), i = (1 + t.squash.value + s * 0.6) * t.scale.value, n = (1 - t.squash.value - s) * t.scale.value, a = e.floaty ? 0 : 1, o = t.spinAngle, r = t.lean.value + t.sway + t.leanIn.value, c = Math.cos(o), h = Math.sin(o), d = Math.cos(r), l = Math.sin(r), f = t.bodyCenter(), u = (y, p) => {
    let b = y * i, x = (p - a) * n + a;
    const P = b * c - x * h, k = b * h + x * c;
    b = P, x = k;
    const S = x - a, T = b * d - S * l, A = b * l + S * d + a;
    return { x: T + f.x, y: A + f.y };
  };
  return { apply: u, sx: i, sy: n, angle: o + r, center: u(0, 0) };
}
function Zs(t, e, s) {
  e.def.pixel ? ti(t, e, s) : Ke(t, e, s);
}
function Ke(t, e, s) {
  const { cx: i, cy: n, R: a } = s, o = e.def, r = e.palette, c = Qs(e), h = (I, Y) => {
    const Z = c.apply(I, Y);
    return { x: i + Z.x * a, y: n + Z.y * a };
  }, d = e.base.map((I, Y) => ({ x: I.x + e.off[Y].x, y: I.y + e.off[Y].y }));
  o.outlineMod?.(d, e.time, e);
  const l = d.map((I) => h(I.x, I.y)), f = o.straight ? Js(l) : Ks(l), u = e.tint.value > 5e-3 ? Gt(r.body, e.tintColor, e.tint.value) : r.body;
  let y = 1 / 0, p = 1 / 0, b = -1 / 0, x = -1 / 0;
  for (const I of l)
    y = Math.min(y, I.x), b = Math.max(b, I.x), p = Math.min(p, I.y), x = Math.max(x, I.y);
  const P = Math.max(e.faceR.value + e.thicken.value, 0.55), k = c.apply(e.faceX.value, e.faceY.value), S = a * P * Math.sqrt(Math.abs(c.sx * c.sy)), T = { x: i + k.x * a, y: n + k.y * a, u: S }, A = {
    g: t,
    actor: e,
    R: a,
    cx: i,
    cy: n,
    bx: i + c.center.x * a,
    by: n + c.center.y * a,
    palette: { ...r, body: u },
    outline: l,
    bodyPath: f,
    face: T,
    time: e.time,
    toPx: h,
    box: { x: y, y: p, w: b - y, h: x - p }
  };
  for (const I of e.overlays) I.b.back?.(A, I.t, v(I.alpha.value));
  if (s.shadow !== !1) {
    const I = v(-e.height / 1.8), Y = a * (1.6 - I * 0.7) * e.scale.value;
    t.save(), t.fillStyle = "rgba(20,20,20," + (0.09 * (1 - I * 0.6)).toFixed(3) + ")", t.beginPath(), t.ellipse(i + e.rootX.value * a, n + a * 1.04, Y / 2, a * 0.07, 0, 0, M), t.fill(), t.restore();
  }
  o.paintBack?.(A), Ie(t, e.particles, i, n, a, !0);
  const E = c.sx / Math.max(c.sy, 0.01), B = o.eyeMode === "hole" && s.eyes !== !1 && !o.drawFace ? oi(e, T, c.angle, E) : null, w = t, q = A, j = o.effects?.opacity ? v(e.fxValue("opacity")) : 1;
  if (w.save(), w.globalAlpha *= j, B) {
    const I = new Path2D();
    I.rect(y - a * 4, p - a * 4, b - y + a * 8, x - p + a * 8), I.addPath(B), w.save(), w.clip(I, "evenodd");
  }
  const F = e.fluff.value;
  if (F > 0.02 && (w.fillStyle = K(u.startsWith("#") ? u : "#000000", 0.5), w.fill(qe(l, a, e, Math.min(F, 1.6)))), w.fillStyle = u, w.fill(f), F > 0.02 && (w.fillStyle = u, w.fill(qe(l, a, e, Math.min(F, 1.6) * 0.82))), e.thicken.value > 5e-3 && o.thicken !== !1 && (w.strokeStyle = u, w.lineWidth = e.thicken.value * 2 * a, w.lineJoin = "round", w.stroke(f)), w.save(), w.clip(f), o.paintBody?.(q), o.sheen && ri(w, l, a, o.sheen), w.restore(), o.outlineWidth && (w.strokeStyle = r.outline ?? "#141414", w.lineWidth = o.outlineWidth * a, w.lineJoin = "round", w.stroke(f)), B && w.restore(), w.restore(), w.save(), o.effects?.eyesOpacity && (w.globalAlpha *= v(e.fxValue("eyesOpacity"))), s.eyes !== !1 && o.drawFace ? o.drawFace(q) : s.eyes !== !1 && !B && ai(w, e, T, c.angle, E, r.eye, o.eyeShine ?? 0), w.restore(), o.paintFace?.(q), e.accessory) {
    let I = l[0];
    for (const Y of l) Y.y < I.y && (I = Y);
    e.accessory.draw(q, I, c.angle);
  }
  o.splash !== !1 && li(t, e, i, n, a, u), Ie(t, e.particles, i, n, a, !1);
  for (const I of e.overlays) I.b.front?.(A, I.t, v(I.alpha.value));
  return T;
}
const Pe = /* @__PURE__ */ new WeakMap(), G = 4;
function ti(t, e, s) {
  const i = e.def.pixel, { cx: n, cy: a, R: o } = s, r = 2 * o / i.cells, c = Math.ceil(3.2 * o / r), h = Math.ceil(3.4 * o / r), d = Math.ceil(1.4 * o / r), l = c * 2, f = h + d, u = n - c * r, y = a - h * r, p = Math.floor(e.time * i.fps), b = `${l}x${f}:${u.toFixed(1)},${y.toFixed(1)}:${r.toFixed(3)}:${e.palette.id}`;
  let x = Pe.get(e);
  if (!x || x.key !== b || x.frame !== p) {
    const P = x && x.lo.width === l && x.lo.height === f, k = P ? x.hi : Se(l * G, f * G), S = P ? x.lo : Se(l, f), T = k.getContext("2d", { willReadFrequently: !0 });
    T.setTransform(1, 0, 0, 1, 0, 0), T.clearRect(0, 0, k.width, k.height);
    const A = G / r;
    T.setTransform(A, 0, 0, A, -u * A, -y * A);
    const E = Ke(T, e, { cx: n, cy: a, R: o, shadow: !1, eyes: !1 });
    T.setTransform(1, 0, 0, 1, 0, 0);
    const B = e.palette, w = [B.body, B.eye, B.accent, B.core, B.mark, B.cheek, ...i.colors ?? []].filter((F) => !!F && F.startsWith("#")).map(xt), q = ei(T.getImageData(0, 0, k.width, k.height).data, l, f, w);
    si(q, e, E, u, y, r, xt(B.eye));
    const j = e.fxValue("glitch");
    j > 0.05 && ii(q, l, f, w, j, p), S.getContext("2d").putImageData(q, 0, 0), x = { frame: p, key: b, hi: k, lo: S }, Pe.set(e, x);
  }
  if (s.shadow !== !1) {
    const P = v(-e.height / 1.8), k = Math.round(o * (1.5 - P * 0.7) * e.scale.value / r) * r, S = Math.round((n + e.rootX.value * o - k / 2 - u) / r) * r + u;
    t.fillStyle = "rgba(20,20,20," + (0.1 * (1 - P * 0.6)).toFixed(3) + ")", t.fillRect(S + r, a + o * 0.96, k - 2 * r, r);
  }
  e.fxValue("flicker") > 0.5 && p % 2 === 0 || (t.save(), t.imageSmoothingEnabled = !1, t.drawImage(x.lo, u, y, l * r, f * r), t.restore());
}
function ei(t, e, s, i) {
  const n = e * G, a = new ImageData(e, s), o = a.data, r = new Int32Array(i.length), c = /* @__PURE__ */ new Map(), h = (d) => {
    const l = t[d] << 16 | t[d + 1] << 8 | t[d + 2];
    let f = c.get(l);
    if (f !== void 0) return f;
    let u = 1 / 0;
    return f = 0, i.forEach((y, p) => {
      const b = t[d] - y[0], x = t[d + 1] - y[1], P = t[d + 2] - y[2], k = b * b * 0.3 + x * x * 0.59 + P * P * 0.11;
      k < u && (u = k, f = p);
    }), c.set(l, f), f;
  };
  for (let d = 0; d < s; d++)
    for (let l = 0; l < e; l++) {
      r.fill(0);
      let f = 0;
      for (let p = 0; p < G; p++)
        for (let b = 0; b < G; b++) {
          const x = ((d * G + p) * n + l * G + b) * 4;
          t[x + 3] < 120 ? f++ : r[h(x)]++;
        }
      if (f > G * G * 0.62) continue;
      let u = 0;
      for (let p = 1; p < r.length; p++) r[p] > r[u] && (u = p);
      const y = (d * e + l) * 4;
      o[y] = i[u][0], o[y + 1] = i[u][1], o[y + 2] = i[u][2], o[y + 3] = 255;
    }
  return a;
}
function si(t, e, s, i, n, a, o) {
  const { width: r, height: c, data: h } = t, d = e.eyes, l = s.u, f = e.look, u = v(Math.max(d.topLid, e.lid * 0.92)), y = (p, b) => {
    if (p < 0 || b < 0 || p >= r || b >= c) return;
    const x = (b * r + p) * 4;
    h[x + 3] === 255 && (h[x] = o[0], h[x + 1] = o[1], h[x + 2] = o[2]);
  };
  for (const p of [-1, 1]) {
    const b = p > 0 ? 1 + d.asym : 1, x = Math.max(1, Math.round(d.w * l * b / a)), P = Math.max(1, Math.round(d.h * l * b / a)), k = s.x + f.x * l + p * d.spacing * l / 2, S = s.y + (-d.lift + f.y) * l, T = Math.round((k - i) / a - x / 2), A = Math.round((S - n) / a - P / 2);
    if (d.bottomLid > 0.3 && u < 0.6) {
      const w = A + Math.floor(P * 0.35);
      for (let q = T; q < T + x; q++) y(q, w);
      y(T - 1, w + 1), y(T + x, w + 1);
      continue;
    }
    const E = Math.max(1, Math.round(P * (1 - u))), B = A + P - E;
    for (let w = B; w < A + P; w++)
      for (let q = T; q < T + x; q++) {
        const j = p < 0 ? q === T + x - 1 : q === T, F = p < 0 ? q === T : q === T + x - 1;
        w === B && E > 1 && x > 1 && (d.slant > 0.3 && j || d.slant < -0.3 && F) || y(q, w);
      }
  }
}
function ii(t, e, s, i, n, a) {
  const o = t.data, r = (l) => {
    const f = Math.sin(a * 91.7 + l * 12.9898) * 43758.5453;
    return f - Math.floor(f);
  }, c = new Uint8ClampedArray(e * 4);
  for (let l = 0; l < s; l++) {
    if (r(l) > n * 0.45) continue;
    const f = Math.round((r(l + 500) - 0.5) * 8 * n);
    if (f) {
      c.set(o.subarray(l * e * 4, (l + 1) * e * 4));
      for (let u = 0; u < e; u++) {
        const y = ((u - f) % e + e) % e;
        for (let p = 0; p < 4; p++) o[(l * e + u) * 4 + p] = c[y * 4 + p];
      }
    }
  }
  const h = Math.floor(r(999) * s), d = i[2] ?? i[0];
  for (let l = h; l < Math.min(s, h + 2); l++)
    for (let f = 0; f < e; f++) {
      const u = (l * e + f) * 4;
      o[u + 3] && o[u] === i[0][0] && o[u + 1] === i[0][1] && o[u + 2] === i[0][2] && (o[u] = d[0], o[u + 1] = d[1], o[u + 2] = d[2]);
    }
}
function Te(t, e) {
  const s = [];
  for (let i = 0; i < t.length; i++) {
    const n = t[i], a = t[(i + 1) % t.length], o = e(n), r = e(a);
    if (o >= 0 && s.push(n), o >= 0 != r >= 0) {
      const c = o / (o - r);
      s.push({ x: n.x + (a.x - n.x) * c, y: n.y + (a.y - n.y) * c });
    }
  }
  return s;
}
function ni(t, e, s) {
  const i = [], n = Math.min(s, t / 2, e / 2), a = [
    { x: t / 2 - n, y: -e / 2 + n, a: -Math.PI / 2 },
    { x: t / 2 - n, y: e / 2 - n, a: 0 },
    { x: -t / 2 + n, y: e / 2 - n, a: Math.PI / 2 },
    { x: -t / 2 + n, y: -e / 2 + n, a: Math.PI }
  ];
  for (const o of a)
    for (let r = 0; r <= 6; r++) {
      const c = o.a + r / 6 * (Math.PI / 2);
      i.push({ x: o.x + Math.cos(c) * n, y: o.y + Math.sin(c) * n });
    }
  return i;
}
function oi(t, e, s, i) {
  const n = t.eyes, a = e.u, o = t.look, r = v(Math.max(n.topLid, t.lid * 0.92)), c = Math.sqrt(i), h = 1 / Math.sqrt(i), d = Math.cos(s), l = Math.sin(s), f = new Path2D();
  for (const u of [-1, 1]) {
    const y = u > 0 ? 1 + n.asym : 1, p = Math.max(0.01, n.w * a * y), b = Math.max(0.01, n.h * a * y), x = Math.min(p, b) / 2 * v(n.corner), P = -u * n.slant * 0.6, k = b / 2 - b * v(n.bottomLid), S = Math.min(-b / 2 + b * r, k - Math.max(a * 0.045, 1.2));
    let T = ni(p, b, x);
    if (T = Te(T, (q) => q.y - (S + P * q.x)), T = Te(T, (q) => k - q.y), T.length < 3) continue;
    const A = o.x * a + u * n.spacing * a / 2, E = (-n.lift + o.y) * a, B = Math.cos(n.tilt * u), w = Math.sin(n.tilt * u);
    T.forEach((q, j) => {
      const F = (q.x * B - q.y * w + A) * c, I = (q.x * w + q.y * B + E) * h, Y = e.x + F * d - I * l, Z = e.y + F * l + I * d;
      j === 0 ? f.moveTo(Y, Z) : f.lineTo(Y, Z);
    }), f.closePath();
  }
  return f;
}
function ai(t, e, s, i, n, a, o = 0) {
  const r = e.eyes, c = s.u, h = e.look, d = e.lid;
  t.save(), t.translate(s.x, s.y), t.rotate(i), t.scale(Math.sqrt(n), 1 / Math.sqrt(n));
  const l = h.x * c, f = (-r.lift + h.y) * c;
  a ? t.fillStyle = a : (t.globalCompositeOperation = "destination-out", t.fillStyle = "#000");
  for (const u of [-1, 1]) {
    const y = u > 0 ? 1 + r.asym : 1, p = Math.max(0.01, r.w * c * y), b = Math.max(0.01, r.h * c * y), x = v(Math.max(r.topLid, d * 0.92));
    t.save(), t.translate(l + u * r.spacing * c / 2, f), t.rotate(r.tilt * u);
    const P = Math.min(p, b) / 2 * v(r.corner), k = -u * r.slant * 0.6, S = b / 2 - b * v(r.bottomLid), T = Math.min(-b / 2 + b * x, S - Math.max(c * 0.045, 1.2));
    t.beginPath(), t.moveTo(-p, T - k * p), t.lineTo(p, T + k * p), t.lineTo(p, S), t.lineTo(-p, S), t.closePath(), t.clip(), t.beginPath(), t.roundRect(-p / 2, -b / 2, p, b, P), t.fill(), a && o > 0 && (t.fillStyle = `rgba(255,255,255,${o})`, t.beginPath(), t.ellipse(p * 0.16, -b * 0.2, Math.min(p, b) * 0.2, Math.min(p, b) * 0.24, 0, 0, M), t.fill(), t.fillStyle = a), t.restore();
  }
  t.restore();
}
function ri(t, e, s, i) {
  let n = 1 / 0, a = 1 / 0, o = -1 / 0, r = -1 / 0;
  for (const b of e)
    n = Math.min(n, b.x), o = Math.max(o, b.x), a = Math.min(a, b.y), r = Math.max(r, b.y);
  const c = o - n, h = r - a, d = v(1 - h / Math.max(c, 1) * 1.6 + 0.6), l = c * (0.32 + 0.25 * d), f = h * (0.12 + 0.05 * d), u = n + c * (0.3 + 0.1 * d), y = a + h * (0.2 + 0.08 * d);
  t.save(), t.strokeStyle = `rgba(255,255,255,${(i * (0.22 + 0.12 * d)).toFixed(3)})`, t.lineWidth = Math.max(1.2, s * 0.07), t.lineCap = "round", t.beginPath();
  const p = Math.hypot(l * 0.5, f * 2.2);
  t.arc(u + l * 0.5, y + f * 2.2, p, -150 * Math.PI / 180, -112 * Math.PI / 180), t.stroke(), t.restore();
}
function li(t, e, s, i, n, a) {
  const o = e.landing;
  if (!o || e.def.physics.floaty) return;
  const r = e.time - o.time;
  if (r < 0 || r > 0.55) return;
  const c = r < 0.35 ? 1 : 1 - (r - 0.35) / 0.2;
  t.save(), t.globalAlpha = c, t.fillStyle = a;
  const h = s + e.rootX.value * n;
  for (let d = 0; d < 6; d++) {
    const l = d % 2 === 0 ? -1 : 1, f = Math.floor(d / 2) * 0.35 + 0.4, u = Math.min(r, 0.3), y = h + l * n * (0.7 + f * u * 6 * o.strength), p = i + n * 0.95 - u * n * (2.2 - Math.floor(d / 2) * 0.5) + u * u * n * 14, b = n * 0.06 * (1 - u * 1.5) + 0.6;
    t.beginPath(), t.arc(y, p, Math.max(0.5, b), 0, M), t.fill();
  }
  t.restore();
}
function qe(t, e, s, i) {
  const n = new Path2D(), a = t.length, o = v(s.vy / 4, -1, 1), r = v(s.squash.value * 3), c = s.time;
  for (let h = 0; h < 3; h++) {
    const d = h === 0 ? 2 : 1;
    for (let l = 0; l < a; l++) {
      const f = t[(l - 1 + a) % a], u = t[(l + 1) % a], y = t[l];
      for (let p = 0; p < d; p++) {
        const b = (p + h * 0.33) / d, x = y.x + (u.x - y.x) * b, P = y.y + (u.y - y.y) * b;
        let k = u.x - f.x, S = u.y - f.y;
        const T = Math.max(Math.hypot(k, S), 1e-4);
        k /= T, S /= T;
        let A = S, E = -k;
        const B = (l * d + p) * 2 + h, w = Math.sin(B * 12.9898) * 43758.5453, q = w - Math.floor(w), j = [1, 0.72, 0.5][h], F = e * (0.08 + 0.08 * q) * j * (1 - r * 0.6) * i, I = 0.2 * Math.sin(c * 1.9 + B * 0.37) + o * 0.45 * A + (q - 0.5) * 0.7, Y = Math.cos(I), Z = Math.sin(I);
        [A, E] = [A * Y - E * Z, A * Z + E * Y];
        const tt = e * (0.04 + 0.025 * q) * (h === 0 ? 1 : 1.3) * Math.min(1, 0.4 + i * 0.6), te = e * 0.05, ee = x - A * te, se = P - E * te, Bt = x + A * F, Et = P + E * F, ie = ee - k * tt, ne = se - S * tt, oe = ee + k * tt, ae = se + S * tt;
        n.moveTo(ie, ne), n.bezierCurveTo(ie + A * F * 0.6, ne + E * F * 0.6, Bt - k * tt * 0.25, Et - S * tt * 0.25, Bt, Et), n.bezierCurveTo(Bt + k * tt * 0.25, Et + S * tt * 0.25, oe + A * F * 0.6, ae + E * F * 0.6, oe, ae), n.closePath();
      }
    }
  }
  return n;
}
function Ie(t, e, s, i, n, a) {
  for (const o of e) {
    if (o.back !== a) continue;
    const r = o.age / o.life, c = r < 0.12 ? r / 0.12 : r > 0.7 ? 1 - (r - 0.7) / 0.3 : 1, h = s + o.x * n, d = i + o.y * n, l = o.size * n;
    if (!(l <= 0.1)) {
      switch (t.save(), t.globalAlpha = v(c), t.fillStyle = o.color, t.strokeStyle = o.color, t.translate(h, d), t.rotate(o.rot), o.kind) {
        case "drop":
          o.landed ? (t.beginPath(), t.ellipse(0, 0, l * 1.6, l * 0.4, 0, 0, M), t.fill()) : (t.beginPath(), t.moveTo(0, -l * 1.5), t.bezierCurveTo(l * 0.9, -l * 0.2, l, l, 0, l), t.bezierCurveTo(-l, l, -l * 0.9, -l * 0.2, 0, -l * 1.5), t.fill());
          break;
        case "rain":
          if (o.landed) {
            t.globalAlpha = v(c) * 0.6, t.beginPath(), t.ellipse(0, 0, l * 1.4, l * 0.3, 0, 0, M), t.fill();
            break;
          }
          t.lineWidth = l * 0.5, t.lineCap = "round", t.beginPath(), t.moveTo(0, -l * 1.4), t.lineTo(0, l * 0.4), t.stroke();
          break;
        case "spark":
        case "star": {
          t.beginPath();
          for (let f = 0; f < 8; f++) {
            const u = f % 2 === 0 ? l : l * 0.32, y = f / 8 * M;
            t.lineTo(Math.cos(y) * u, Math.sin(y) * u);
          }
          t.closePath(), t.fill();
          break;
        }
        case "smoke":
          t.globalAlpha = v(c) * 0.45, t.beginPath(), t.arc(0, 0, l, 0, M), t.fill();
          break;
        case "puff":
          t.fillStyle = "#ffffff", t.beginPath(), t.arc(0, 0, l, 0, M), t.fill(), t.lineWidth = Math.max(1, n * 0.05), t.strokeStyle = o.color, t.stroke();
          break;
        case "bubble":
          t.lineWidth = Math.max(1, l * 0.18), t.beginPath(), t.arc(0, 0, l, 0, M), t.stroke();
          break;
        case "flake":
          t.lineWidth = Math.max(1, l * 0.22), t.lineCap = "round";
          for (let f = 0; f < 3; f++)
            t.rotate(Math.PI / 3), t.beginPath(), t.moveTo(-l, 0), t.lineTo(l, 0), t.stroke();
          break;
        case "dust":
          t.globalAlpha = v(c) * 0.7, t.beginPath(), t.arc(0, 0, l, 0, M), t.fill();
          break;
        case "square":
          t.rotate(-o.rot), t.fillRect(-l / 2, -l / 2, l, l);
          break;
        case "coin": {
          const f = Math.abs(Math.cos(o.rot)) * l + l * 0.12;
          t.rotate(-o.rot), t.fillStyle = "#ffd43b", t.beginPath(), t.ellipse(0, 0, f, l, 0, 0, M), t.fill(), t.fillStyle = "#e8a10c", t.beginPath(), t.ellipse(0, 0, f * 0.55, l * 0.6, 0, 0, M), t.fill();
          break;
        }
        case "bead": {
          t.rotate(-o.rot);
          const f = t.createLinearGradient(0, -l, 0, l);
          f.addColorStop(0, "#ffffff"), f.addColorStop(0.45, "#c5ccd6"), f.addColorStop(0.52, "#3b414b"), f.addColorStop(1, "#aab2bd"), t.fillStyle = f, t.beginPath(), t.ellipse(0, 0, l * 1.08, l * 0.92, 0, 0, M), t.fill(), t.fillStyle = "rgba(255,255,255,0.9)", t.beginPath(), t.ellipse(-l * 0.38, -l * 0.42, l * 0.24, l * 0.14, -0.5, 0, M), t.fill();
          break;
        }
        case "glyph":
          if (o.glyph === "rect") {
            t.fillRect(-l / 2, -l / 4, l, l / 2);
            break;
          }
        // falls through to text
        case "heart":
        case "note":
        case "z":
          Rt(t, o.glyph || (o.kind === "heart" ? "♥" : o.kind === "note" ? "♪" : "z"), 0, 0, l * 2, o.color);
          break;
      }
      t.restore();
    }
  }
}
const At = /* @__PURE__ */ new Set();
let Tt = 0, Ct = 0;
function Qe(t) {
  const e = Tt ? Math.min((t - Tt) / 1e3, 0.1) : 0;
  Tt = t;
  for (const s of At) s.visible && s.tick(e, t);
  Ct = At.size ? requestAnimationFrame(Qe) : 0, Ct || (Tt = 0);
}
function ci(t) {
  return At.add(t), Ct || (Ct = requestAnimationFrame(Qe)), () => At.delete(t);
}
const hi = () => typeof matchMedia < "u" && matchMedia("(prefers-reduced-motion: reduce)").matches;
class fi {
  actor;
  canvas;
  visible = !0;
  g;
  w = 0;
  h = 0;
  dpr = 1;
  stop;
  ro;
  io;
  opts;
  cleanup = [];
  ownsCanvas;
  constructor(e, s) {
    this.opts = s, this.actor = new Rs(s.character, s), this.actor.calm = hi(), this.canvas = e instanceof HTMLCanvasElement ? e : document.createElement("canvas"), this.ownsCanvas = this.canvas !== e, this.ownsCanvas && (this.canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none", e.appendChild(this.canvas)), this.canvas.setAttribute("role", "img"), this.canvas.setAttribute("aria-label", `${s.character.name.en}, ${s.character.tagline.en}`), this.g = this.canvas.getContext("2d"), this.ro = new ResizeObserver(() => this.resize()), this.ro.observe(this.canvas), this.io = new IntersectionObserver((i) => {
      for (const n of i) this.visible = n.isIntersecting;
    }), this.io.observe(this.canvas), this.resize(), s.interactive !== !1 && this.bindPointer(), s.sound && (bt.enabled = !0, this.cleanup.push(ds(this.actor, { play: s.sound === "touch" ? !1 : void 0 }))), this.stop = ci(this);
  }
  /** Play an action: a loop becomes the state, a one-shot plays once. */
  play(e) {
    return this.actor.play(e);
  }
  get state() {
    return this.actor.state;
  }
  setMood(e) {
    this.actor.setMood(e);
  }
  /** Become any short text (a digit, "!", "OK") for `hold` seconds, even if states change meanwhile. */
  morphText(e, s = 1.6) {
    this.actor.holdShape(`text:${e}`, s), this.actor.hop(0.5);
  }
  /** Make the eyes follow a point in client (page) coordinates, or let them wander with `null`. */
  lookAtClient(e, s) {
    if (e === null || s === void 0) return this.actor.pointer(null);
    this.actor.pointer(this.toBody(e, s));
  }
  get layout() {
    const e = Math.min(this.w / 3.3, this.h / 3.3) * (this.opts.zoom ?? 1);
    return { R: e, cx: this.w / 2, cy: this.h * 0.84 - e };
  }
  tick(e) {
    this.actor.advance(e), this.draw();
  }
  draw() {
    const { g: e } = this;
    e.setTransform(1, 0, 0, 1, 0, 0), e.clearRect(0, 0, this.canvas.width, this.canvas.height), e.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const { R: s, cx: i, cy: n } = this.layout;
    s > 1 && Zs(e, this.actor, { cx: i, cy: n, R: s, shadow: this.opts.shadow });
  }
  destroy() {
    this.stop(), this.ro.disconnect(), this.io.disconnect();
    for (const e of this.cleanup) e();
    this.ownsCanvas && this.canvas.remove();
  }
  resize() {
    const e = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2), this.w = Math.max(1, e.width), this.h = Math.max(1, e.height), this.canvas.width = Math.round(this.w * this.dpr), this.canvas.height = Math.round(this.h * this.dpr), this.draw();
  }
  toBody(e, s) {
    const i = this.canvas.getBoundingClientRect(), { R: n, cx: a, cy: o } = this.layout;
    return { x: (e - i.left - a) / n, y: (s - i.top - o) / n };
  }
  bindPointer() {
    const e = this.canvas, s = this.actor;
    let i = null, n = !1, a = 0, o = [];
    const r = (l) => {
      const f = this.toBody(l.clientX, l.clientY);
      if (s.pointer(f), !i || l.pointerId !== i.id) return;
      if (Math.hypot(l.clientX - i.x, l.clientY - i.y) > 8) {
        window.clearTimeout(a), s.petting && (s.petting = !1), n || (n = !0, s.grab(this.toBody(i.x, i.y)), s.express("surprised"), this.opts.onInteract?.("drag")), s.drag(f);
        const y = performance.now() / 1e3;
        o = [...o.filter((p) => y - p.t < 0.12), { ...f, t: y }];
      }
    }, c = (l) => {
      i = { x: l.clientX, y: l.clientY, t: performance.now(), id: l.pointerId }, n = !1, e.setPointerCapture(l.pointerId), a = window.setTimeout(() => {
        s.petting = !0, s.express("happy"), this.opts.onInteract?.("pet");
      }, 380);
    }, h = (l) => {
      if (!i || l.pointerId !== i.id) return;
      window.clearTimeout(a);
      const f = s.petting;
      if (s.petting = !1, n) {
        s.express(s.state === "idle" ? s.mood : {});
        const u = o[0], y = o[o.length - 1], p = u && y ? y.t - u.t : 0;
        s.release(p > 0.01 ? { x: (y.x - u.x) / p, y: (y.y - u.y) / p } : void 0);
      } else f ? s.express(s.state === "idle" ? s.mood : {}) : (s.tap(), this.opts.onInteract?.("tap"));
      i = null, n = !1, o = [];
    }, d = () => {
      i || s.pointer(null);
    };
    e.addEventListener("pointermove", r), e.addEventListener("pointerdown", c), e.addEventListener("pointerup", h), e.addEventListener("pointercancel", h), e.addEventListener("pointerleave", d), e.style.cursor = "grab", this.cleanup.push(() => {
      e.removeEventListener("pointermove", r), e.removeEventListener("pointerdown", c), e.removeEventListener("pointerup", h), e.removeEventListener("pointercancel", h), e.removeEventListener("pointerleave", d);
    });
  }
}
function di(t, e) {
  return new fi(t, e);
}
function ki(t) {
  return Ht[t.id] = t, document.querySelectorAll(`live-ling[character="${t.id}"]`).forEach((e) => e.refresh()), t;
}
const vi = (t) => t;
class pi extends HTMLElement {
  static observedAttributes = ["character", "state", "seed", "palette", "accessory", "mood", "sound"];
  mascot = null;
  connectedCallback() {
    this.style.display || (this.style.display = "inline-block"), !this.style.width && !this.getAttribute("style")?.includes("width") && (this.style.width = "160px", this.style.height = "160px"), this.mount();
  }
  disconnectedCallback() {
    this.mascot?.destroy(), this.mascot = null;
  }
  attributeChangedCallback(e, s, i) {
    !this.mascot || s === i || (e === "state" && i ? this.mascot.play(i) : e === "mood" ? this.mascot.setMood(i || null) : this.mount());
  }
  play(e) {
    return this.mascot?.play(e) ?? !1;
  }
  /** Re-create the mascot, e.g. after its character was registered. */
  refresh() {
    this.isConnected && this.mount();
  }
  mount() {
    this.mascot?.destroy();
    const e = Ht[this.getAttribute("character") ?? "cloud"] ?? Ht.cloud, s = this.getAttribute("accessory");
    this.mascot = di(this, {
      character: e,
      seed: this.getAttribute("seed") ?? void 0,
      palette: this.getAttribute("palette") ?? void 0,
      accessory: s === "none" ? null : s ?? void 0,
      state: this.getAttribute("state") ?? void 0,
      interactive: this.getAttribute("interactive") !== "false",
      sound: this.hasAttribute("sound") && this.getAttribute("sound") !== "false"
    });
    const i = this.getAttribute("mood");
    i && this.mascot.setMood(i);
  }
}
typeof customElements < "u" && !customElements.get("live-ling") && customElements.define("live-ling", pi);
export {
  xs as ACCESSORIES,
  Rs as Actor,
  Ht as CHARACTERS,
  cs as DEFAULT_SOUNDS,
  xi as EMOTIONS,
  Nt as EXPRESSIONS,
  Ys as FAMILY,
  mi as FIDGETS,
  pi as LivelingElement,
  fi as Mascot,
  Ns as STEP,
  V as Spring,
  ls as Synth,
  M as TAU,
  ht as UNIVERSAL,
  bi as UNIVERSAL_EVENTS,
  yi as UNIVERSAL_STATES,
  g as at,
  Jt as badge,
  X as blip,
  D as chime,
  W as clack,
  v as clamp,
  es as confetti,
  di as createMascot,
  Ft as createRng,
  vi as defineCharacter,
  ze as doneBadge,
  Rt as drawGlyph,
  ts as drawText,
  Kt as errorBadge,
  z as every,
  H as floatGlyph,
  rs as helpBadge,
  m as label,
  ui as lerp,
  ds as listenTo,
  gt as markColor,
  Gt as mixHex,
  js as namedShape,
  O as note,
  ci as onFrame,
  R as patter,
  at as physics,
  rt as pickAccessories,
  ki as registerCharacter,
  Zs as renderActor,
  gi as shapes,
  Ks as smoothPath,
  bt as sounds,
  $ as sparkles,
  ct as splash,
  dt as squeak,
  Le as steam,
  Ce as sweat,
  kt as thoughtDots,
  mt as thud,
  C as variant,
  J as whoosh,
  K as withAlpha,
  vt as zzz
};
