// Declarative chrome stays in the trusted page. Packs cannot supply HTML, CSS or text handlers.
const colors={surface:'--surface',ink:'--text',muted:'--muted',border:'--skin-ink',accent:'--accent',accent2:'--accent2',tint:'--tint'};
const owned=[...Object.values(colors),'--line','--shadow','--panel-radius','--panel-stroke'];
export function resetCharacterUi(root){for(const name of owned)root.style.removeProperty(name);delete root.dataset.characterUi;}
export function applyCharacterUi(root,ui){
  if(ui?.version!==1)return;
  root.dataset.characterUi='1';
  for(const [key,name] of Object.entries(colors))if(typeof ui[key]==='string'&&/^#[0-9a-f]{6}$/i.test(ui[key]))root.style.setProperty(name,ui[key]);
  if(/^#[0-9a-f]{6}$/i.test(ui.border??''))root.style.setProperty('--line',ui.border);
  if(Number.isFinite(ui.radius))root.style.setProperty('--panel-radius',Math.max(8,Math.min(28,ui.radius))+'px');
  if(Number.isFinite(ui.stroke))root.style.setProperty('--panel-stroke',Math.max(1,Math.min(3,ui.stroke))+'px');
  if(ui.shadow==='none')root.style.setProperty('--shadow','transparent');
  else if(ui.shadow==='soft')root.style.setProperty('--shadow','#243b7020');
}
