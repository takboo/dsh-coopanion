// Historical structural observer/replay; current scene: completion-study.html, current runtime: examples/little-deep.
// SPDX-License-Identifier: AGPL-3.0-or-later
// Surface work has three readable intentions; short facts do not change anatomy.
import {workActivities} from './work-performance.js';

function surface(a) {
  a.morph('rest',{squash:0,blink:false});
  a.fx('hidden').target=0;a.fx('eyesOpacity').target=1;
  a.scale.target=1;a.hover.target=.13;
}
const amplitude=a=>a.calm?.28:1;

export const mainlineActivities={
  ...workActivities,
  considering:{kind:'loop',enter(a){
    surface(a);a.express({w:.95,h:.76,topLid:.18});a.lookAt(.2,-.55);
  },tick(a){const amp=amplitude(a);
    a.rootX.target=0;a.lean.target=(.075+Math.sin(a.time*.85)*.008)*amp;
    a.fx('tail').target=Math.sin(a.time*1.2)*.045*amp;
    a.fx('fin').target=.65*amp;
  }},
  doing:{kind:'loop',enter(a){
    surface(a);a.express({w:1,h:.63,topLid:.22});a.lookAt(-.55,.55);
  },tick(a){const amp=amplitude(a),stroke=Math.sin(a.time*3.8);
    a.rootX.target=(-.07+Math.sin(a.time*1.2)*.018)*amp;
    a.lean.target=(-.12+Math.sin(a.time*1.9)*.012)*amp;
    a.fx('tail').target=stroke*.12*amp;a.fx('fin').target=stroke*.40*amp;
  }},
  replying:{kind:'loop',enter(a){
    surface(a);a.express({w:1,h:1.08,topLid:0});a.lookAt(-.75,-.10);
  },tick(a){const amp=amplitude(a);
    a.rootX.target=-.025*amp;a.hover.target=.17;
    a.lean.target=(.045+Math.sin(a.time*1.05)*.008)*amp;
    a.fx('tail').target=Math.sin(a.time*1.4)*.035*amp;
    a.fx('fin').target=(.32+Math.sin(a.time*1.4)*.035)*amp;
  }},
};
