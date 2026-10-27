// SPDX-License-Identifier: AGPL-3.0-or-later
import {createMascot,onFrame} from './livelings/livelings.js';
import {concepts} from './livelings/characters/whale-concepts.js';
const grid=document.querySelector('#grid'), labels={idle:'在陪着你',thinking:'正在想事情',working:'在忙一下',waiting:'等等哦',done:'做好啦',error:'有点卡住',sleep:'睡着啦'};
let current='all',loop='idle',palette='signature';const items=[];
for(const[d,c]of concepts.entries()){
  const article=document.createElement('article');article.className='concept';article.dataset.id=c.id;
  article.innerHTML=`<header><h2><small>0${d+1} /</small> ${c.name}</h2><a href="./livelings/studio.html?char=./characters/${c.id}.js">动作工作台 ↗</a></header><div class="stage"><div class="mascot"></div><span class="status" aria-live="polite">在陪着你</span></div><p class="description">${c.temper}</p><button class="trick">${c.kind===1?'躲进小尾巴 ↗':'噗噜，吐个泡泡 ↗'}</button>`;
  grid.append(article);const item={...c,article,host:article.querySelector('.mascot'),status:article.querySelector('.status'),mascot:null,last:''};items.push(item);
  article.querySelector('.trick').onclick=()=>item.mascot.play(c.kind===1?'peek-tail':'spout');
}
function mount(){for(const item of items){item.mascot?.destroy();const dark=document.body.classList.contains('dark');const character=dark?{...item.character,palettes:item.character.palettes.map(p=>({...p,mark:'#c0cce3',...(p.body==='#374c78'?{body:'#526fa4',outline:'#8ba3cd'}:{})}))}:item.character;item.mascot=createMascot(item.host,{character,palette,seed:42,fidget:true,shadow:true,zoom:current==='all'?.84:1.15,sound:false});item.mascot.play(loop);}}
function syncButtons(action){document.querySelectorAll('[data-action]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.action===action));}
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{const action=b.dataset.action;if(!['done','error'].includes(action)){loop=action;syncButtons(action);}items.forEach(i=>i.mascot.play(action));});
document.querySelector('#palette').onchange=e=>{palette=e.target.value;mount();};
document.querySelector('#theme').onclick=()=>{document.body.classList.toggle('dark');document.querySelector('#theme').textContent=document.body.classList.contains('dark')?'回到日光':'看看夜色';mount();};
const views=['all',...concepts.map(c=>c.id)];function view(id){current=views.includes(id)?id:'all';grid.classList.toggle('single',current!=='all');items.forEach(i=>i.article.hidden=current!=='all'&&i.id!==current);document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===current));const u=new URL(location.href);u.searchParams.set('variant',current);history.replaceState(null,'',u);mount();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));function cycle(n){view(views[(views.indexOf(current)+n+views.length)%views.length]);}document.querySelector('#prev').onclick=()=>cycle(-1);document.querySelector('#next').onclick=()=>cycle(1);window.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea,[contenteditable=true]'))return;if(e.key==='ArrowLeft'){e.preventDefault();cycle(-1);}if(e.key==='ArrowRight'){e.preventDefault();cycle(1);}});
window.addEventListener('pointermove',e=>{for(const i of items){if(i.article.hidden)continue;const r=i.host.getBoundingClientRect(),near=Math.hypot(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2)<330;i.mascot.lookAtClient(near?e.clientX:null,e.clientY);}},{passive:true});
onFrame({visible:true,tick(){for(const i of items){const a=i.mascot?.actor;if(!a)continue;const key=a.onceId||a.state;const text=key==='peek-tail'?'躲进小尾巴':key==='spout'?'噗噜噗噜':labels[key]||'回应你一下';if(i.last!==text){i.status.textContent=text;i.last=text;}}}});
view(new URLSearchParams(location.search).get('variant')||'all');
