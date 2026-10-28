// SPDX-License-Identifier: AGPL-3.0-or-later
// B is now the default; A and C remain as comparison references.
import character from './character.js';
const referenceEyes={w:.29,h:.41,corner:1,spacing:.65,lift:.025,topLid:0,bottomLid:0,tilt:0,slant:0,asym:0};

// Side-eye artwork adapted from DeepSeek Harness FishLogo.tsx (MIT).
// Copyright (c) 2026 DeepSeek; complete notice in reference/harness/LICENSE.
const eyeMark = 'M15.1415 9.79893C14.949 9.87793 14.7565 9.94544 14.5715 9.95294C14.2845 9.96794 13.9715 9.85143 13.8015 9.70893C13.5375 9.48742 13.3485 9.36342 13.2695 8.97691C13.2355 8.8119 13.2545 8.55639 13.2845 8.40989C13.3525 8.09438 13.277 7.89187 13.0545 7.70787C12.8735 7.55786 12.643 7.51636 12.39 7.51636C12.2955 7.51636 12.209 7.47486 12.1445 7.44136C12.039 7.38886 11.9519 7.25735 12.035 7.09585C12.0615 7.04335 12.19 6.91584 12.22 6.89334C12.5635 6.69784 12.9595 6.76184 13.326 6.90834C13.6655 7.04735 13.9225 7.30236 14.292 7.66287C14.6695 8.09838 14.7375 8.21838 14.9525 8.54539C15.1225 8.8009 15.277 9.06341 15.3831 9.36392C15.4471 9.55142 15.3641 9.70493 15.1415 9.79893Z';
let sideEyePath;
function drawSideEye(r) {
  sideEyePath ??= new Path2D(eyeMark);
  const a=r.actor,g=r.g;
  const e=a.eyes;
  const openness=Math.max(.09,e.h/referenceEyes.h
    *(1-Math.max(a.lid,e.topLid,e.bottomLid*.85)));
  const unit=r.face.u/.63*.11;
  g.save();
  g.translate(r.face.x+a.look.x*r.face.u,r.face.y+(a.look.y-e.lift+referenceEyes.lift)*r.face.u);
  g.rotate(a.spinAngle+a.lean.value+a.leanIn.value+a.sway-e.slant*.22);
  g.scale(unit*e.w/referenceEyes.w,unit*openness);g.translate(-13.7,-8.4);
  g.fillStyle=r.palette.eye;g.fill(sideEyePath);
  g.beginPath();g.arc(12.439,8.26,.297,0,Math.PI*2);g.fill();
  g.restore();
}

export const eyeStudies = [
  {id:'current',letter:'A',name:'原版双眼',description:'原先的正面双眼，作为对照保留。',definition:{
    ...character,eyes:{...referenceEyes},face:{x:.04,y:-.26,r:.63},
  }},
  {id:'perspective',letter:'B',name:'大小眼（已选）',description:'当前小湛：近侧稍大、远侧稍小。',definition:character},
  {id:'side',letter:'C',name:'弯斑方案（未采用）',description:'保留这次对照，不作为当前眼型。',definition:{
    ...character,eyes:{...referenceEyes},face:{x:.10,y:-.27,r:.63},drawFace:drawSideEye,
  }},
];
