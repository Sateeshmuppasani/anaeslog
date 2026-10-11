'use strict';
const O={types:["GA","Regional","Spinal","Epidural","CSE","Sedation","GA + Regional","MAC/Local"],sexes:["M","F","Other"],
mallampati:["I","II","III","IV","Not assessed"],
comorbidities:["Hypertension","Diabetes","IHD","Heart failure","Asthma","COPD","OSA","CKD","Liver disease","Obesity","Stroke/TIA","Thyroid","Pregnancy","Anaemia","Coagulopathy"],
investigations:["CBC","Coagulation","Renal/LFT","Electrolytes","Glucose/HbA1c","ECG","Echo","Chest X-ray","Blood group & crossmatch","Pregnancy test"],
consent:["Identity & procedure confirmed","Anaesthesia consent signed","Risks discussed","Regional/blood consent if needed","Site marked","Questions answered"],
airway:["None","Face mask","LMA / SGA","ETT oral","ETT nasal","RAE tube","DLT","Tracheostomy","Video laryngoscope","Fibreoptic"],
lines:["PIV","2nd PIV","Arterial line","CVC","Urinary catheter","NG tube","Large bore"],
quick:["Induction","Intubation","Incision","Hypotension","Hypertension","Bradycardia","Tachycardia","Desaturation","Difficult airway","Laryngospasm","Bronchospasm","Blood loss","Transfusion","Arrhythmia","Anaphylaxis","Cardiac arrest","Extubation","End of surgery"],
analgesia:["IV opioid","PCA","Multimodal oral","Epidural infusion","Spinal morphine","Peripheral nerve block","Wound infiltration","TAP block","ESP block","None"],
complications:["Nausea/vomiting","Respiratory depression","Urinary retention","Pruritus","Hypotension","Post-dural puncture headache","Block failure","Delirium","Shivering","Sore throat"]};
const CRIT=["Desaturation","Difficult airway","Anaphylaxis","Cardiac arrest","Laryngospasm","Bronchospasm"];
const STATCRIT=["Desaturation","Difficult airway","Anaphylaxis","Cardiac arrest"];
const KEY='anaeslog.cases.v1',PIN='anaeslog.pinhash';
const uid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
const pad=n=>String(n).padStart(2,'0');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(function(){const V='anaeslog.storage.v',CUR='2';if(localStorage.getItem(V)!==CUR){try{const all=JSON.parse(localStorage.getItem(KEY))||[];const keep=all.filter(c=>!(c.sample||c.demo||c.isSample||/^(SAMPLE|DEMO|EXAMPLE)/i.test(c.caseID||'')));localStorage.setItem(KEY,JSON.stringify(keep))}catch(e){}localStorage.setItem(V,CUR)}})();
let cases=load(),tab='cases',editId=null,section=0,q='',filt='All';
function load(){try{return JSON.parse(localStorage.getItem(KEY))||[]}catch(e){return[]}}
function save(){localStorage.setItem(KEY,JSON.stringify(cases))}
function newCase(){const d=new Date();return{id:uid(),caseID:`C-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`,date:d.toISOString(),
age:40,sex:"M",weightKg:70,asa:1,emergency:false,mallampati:"Not assessed",comorbidities:[],allergies:"",fastingSolidsHrs:6,fastingClearsHrs:2,medications:"",investigations:[],consentChecks:[],preopNotes:"",
procedure:"",specialty:"",anaesthesiaType:"GA",airwayDevice:"None",lines:[],drugs:"",events:[],bloodLossMl:0,intraopNotes:"",
analgesiaTechniques:[],analgesiaDrugs:"",painRecovery:0,pain24h:0,ponv:false,complications:[],postopNotes:""}}
const cur=()=>cases.find(c=>c.id===editId);
const localDT=iso=>{const d=new Date(iso);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`};
const hm=iso=>{const d=new Date(iso);return pad(d.getHours())+':'+pad(d.getMinutes())};
const fmt=iso=>new Date(iso).toLocaleString([], {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
// field builders
const txt=(k,ph,area)=>`<div class="row">${area?`<textarea data-k="${k}" placeholder="${esc(ph)}" rows="2">${esc(cur()[k])}</textarea>`:`<input type="text" data-k="${k}" placeholder="${esc(ph)}" value="${esc(cur()[k])}">`}</div>`;
const sel=(k,l,opts)=>`<div class="row"><span class="l">${l}</span><select data-k="${k}">${opts.map(o=>`<option${cur()[k]==o?' selected':''}>${esc(o)}</option>`).join('')}</select></div>`;
const tog=(k,l)=>`<div class="row"><label for="t_${k}">${l}</label><input id="t_${k}" class="sw" type="checkbox" data-k="${k}" data-t="bool"${cur()[k]?' checked':''}></div>`;
const step=(k,l,min,max,st,unit='')=>{const v=cur()[k];return `<div class="row"><span class="l">${l}: <b>${st<1?Number(v).toFixed(1):v}</b>${unit}</span><div class="step"><button data-step="${k}" data-d="${-st}" data-min="${min}" data-max="${max}">−</button><button data-step="${k}" data-d="${st}" data-min="${min}" data-max="${max}">+</button></div></div>`};
const multi=(k,l,opts)=>{const s=cur()[k];return `<details data-dk="${k}"${openD.has(k)?' open':''}><summary>${l} (${s.length})</summary>${opts.map(o=>`<div class="opt" data-ms="${k}" data-v="${esc(o)}"><span>${esc(o)}</span>${s.includes(o)?'<span class="chk" style="flex:none">✓</span>':''}</div>`).join('')}</details>`};
const S=(t,b)=>`<div class="sec"><h3>${t}</h3><div class="card">${b}</div></div>`;
const openD=new Set();
function preop(){const c=cur();return S('Case (no patient identifiers)',txt('caseID','Case ID')+`<div class="row"><span class="l">Date</span><input type="datetime-local" data-k="date" data-t="date" value="${localDT(c.date)}"></div>`
+step('age','Age',0,110,1,' y')+sel('sex','Sex',O.sexes)+`<div class="row"><span class="l">Weight (kg)</span><input type="number" inputmode="decimal" data-k="weightKg" data-t="num" value="${c.weightKg}"></div>`
+`<div class="row"><span class="l">ASA</span><div class="seg" style="flex:2">${[1,2,3,4,5,6].map(n=>`<button data-asa="${n}" class="${c.asa==n?'on':''}">${n}</button>`).join('')}</div></div>`+tog('emergency','Emergency (E)'))
+S('Assessment',sel('mallampati','Mallampati',O.mallampati)+multi('comorbidities','Comorbidities',O.comorbidities)+txt('allergies','Allergies (NKDA if none)')+txt('medications','Current medications',1)+multi('investigations','Investigations reviewed',O.investigations))
+S('Fasting',step('fastingSolidsHrs','Solids',0,48,.5,' h')+step('fastingClearsHrs','Clear fluids',0,48,.5,' h')+((c.fastingSolidsHrs<6||c.fastingClearsHrs<1)?'<div class="row warn">⚠︎ Below usual fasting guideline</div>':''))
+S('Consent & checklist',O.consent.map(o=>`<div class="row"><label>${esc(o)}</label><input class="sw" type="checkbox" data-cc="${esc(o)}"${c.consentChecks.includes(o)?' checked':''}></div>`).join('')+txt('preopNotes','Pre-op notes / plan',1))}
function intraop(){const c=cur();return S('Procedure',txt('procedure','Procedure')+txt('specialty','Specialty')+sel('anaesthesiaType','Anaesthesia',O.types)+sel('airwayDevice','Airway device',O.airway)+multi('lines','Lines',O.lines)
+txt('drugs','Drugs (e.g. propofol 150 mg, fentanyl 100 mcg)',1)+step('bloodLossMl','Blood loss',0,20000,50,' ml'))
+S('Quick-add event (timestamped now)',`<div class="grid">${O.quick.map(n=>`<button class="ev${CRIT.includes(n)?' crit':''}" data-ev="${esc(n)}">${esc(n)}</button>`).join('')}</div><div class="row"><input type="text" id="cust" placeholder="Custom event"><button class="btn" id="custAdd">Add</button></div>`)
+S(`Events log (${c.events.length})`,c.events.length?c.events.map((e,i)=>`<div class="row" style="flex-wrap:wrap"><b style="flex:1;${CRIT.includes(e.name)?'color:var(--red)':''}">${esc(e.name)}</b><input type="time" data-evt="${i}" value="${hm(e.time)}"><button class="btn del" data-evdel="${i}">✕</button><input type="text" data-evn="${i}" placeholder="Note" value="${esc(e.note)}" class="sub" style="flex-basis:100%"></div>`).join(''):'<div class="row sub">No events yet</div>')
+S('Notes',txt('intraopNotes','Intra-op notes',1))}
function postop(){return S('Analgesia',multi('analgesiaTechniques','Techniques',O.analgesia)+txt('analgesiaDrugs','Drugs & doses',1))+S('Pain scores (NRS 0-10)',step('painRecovery','Recovery',0,10,1)+step('pain24h','24 h',0,10,1))
+S('Outcomes',tog('ponv','PONV')+multi('complications','Complications',O.complications)+txt('postopNotes','Post-op notes',1))
+`<div class="sec"><div class="card"><div class="row del" id="delCase" style="justify-content:center;cursor:pointer">Delete case</div></div></div>`}
function listView(){const ql=q.toLowerCase();const list=cases.filter(c=>(filt==='All'||c.anaesthesiaType===filt)&&(!ql||[c.caseID,c.procedure,c.specialty,c.anaesthesiaType].join(' ').toLowerCase().includes(ql))).sort((a,b)=>b.date.localeCompare(a.date));
return `<header><img class="logo" src="logo-wordmark.png" alt="GBY"><h1>AnaesLog</h1><select id="filt" class="btn" style="color:var(--tint)">${['All',...O.types].map(t=>`<option${t===filt?' selected':''}>${t}</option>`).join('')}</select><button class="btn" id="add" style="font-size:28px">+</button></header>
<div class="search"><span class="sub">🔍</span><input type="text" id="q" placeholder="Search case ID, procedure…" value="${esc(q)}"></div>
${list.length?`<div class="sec"><div class="card">${list.map(c=>`<a class="case" data-open="${c.id}"><b><span>${esc(c.procedure||'Untitled procedure')}</span><span class="pill">${esc(c.anaesthesiaType)}</span></b><div class="sub">${esc(c.caseID)} · ${c.age}y ${esc(c.sex)} · ASA ${c.asa}${c.emergency?'E':''} · ${fmt(c.date)}</div></a>`).join('')}</div></div>`:`<div class="empty">${cases.length?'No matching cases':'No cases yet.<br>Tap + to log your first case.'}</div>`}`}
function counts(f){const m={};cases.forEach(c=>{const k=f(c);m[k]=(m[k]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])}
function chart(t,d){const mx=Math.max(1,...d.map(x=>x[1]));return S(t,d.length?`<div style="padding:8px 0">${d.map(([l,n])=>`<div class="bar"><span class="lab">${esc(l)}</span><span class="b" style="width:${n/mx*50}%"></span><span class="sub">${n}</span></div>`).join('')}</div>`:'<div class="row sub">No data</div>')}
function statsView(){const n=cases.length,r=x=>n?Math.round(x/n*100)+'%':'–';
return `<header><img class="logo" src="logo-wordmark.png" alt="GBY"><h1>Statistics</h1></header>`+S('Overview',`<div class="row"><span class="l">Total cases</span><b>${n}</b></div><div class="row"><span class="l">Emergency</span><b>${cases.filter(c=>c.emergency).length}</b></div><div class="row"><span class="l">PONV rate</span><b>${r(cases.filter(c=>c.ponv).length)}</b></div><div class="row"><span class="l">Cases with critical events</span><b>${cases.filter(c=>c.events.some(e=>STATCRIT.includes(e.name))).length}</b></div>`)
+chart('By anaesthesia type',counts(c=>c.anaesthesiaType))+chart('By ASA',counts(c=>'ASA '+c.asa).sort((a,b)=>a[0].localeCompare(b[0])))+chart('Top procedures',counts(c=>c.procedure||'Unspecified').slice(0,10))+chart('Airway devices',counts(c=>c.airwayDevice))}
function settingsView(){const has=!!localStorage.getItem(PIN);return `<header><img class="logo" src="logo-wordmark.png" alt="GBY"><h1>Settings</h1></header>`
+S('Security',`<div class="row"><label for="pinT">Require passcode</label><input id="pinT" class="sw" type="checkbox"${has?' checked':''}></div><div class="row sub">Locks when the app is closed or sent to the background. If you forget it, the data cannot be unlocked — keep a backup.</div>`)
+S('Export',`<div class="row" style="cursor:pointer;color:var(--tint)" id="csv">Export CSV (${cases.length} cases)</div><div class="row" style="cursor:pointer;color:var(--tint)" id="bk">Export JSON backup</div><div class="row" style="cursor:pointer;color:var(--tint)" id="imp">Import JSON backup…</div><input type="file" id="impF" accept=".json,application/json" hidden>`)
+S('Privacy','<div class="row sub">All data stays on this device (in Safari storage for this app). Do not enter names, MRN, CPR or other identifiers. Use a case ID only. Export a JSON backup regularly — deleting the app from the Home Screen or clearing Safari data erases it.</div>')
+'<div class="sec sub" style="text-align:center">AnaesLog web v1</div>'}
function render(){const a=document.getElementById('app');const y=scrollY;
if(editId&&cur()){a.innerHTML=`<header class="inline"><button class="btn" id="back">‹ Cases</button><h1>${esc(cur().caseID)}</h1><span style="width:70px"></span></header><div style="padding:0 16px"><div class="seg">${['Pre-op','Intra-op','Post-op'].map((s,i)=>`<button data-sec="${i}" class="${section==i?'on':''}">${s}</button>`).join('')}</div></div>`+[preop,intraop,postop][section]();}
else{editId=null;a.innerHTML=tab==='cases'?listView():tab==='stats'?statsView():settingsView();}
document.getElementById('nav').innerHTML=[['cases','📋','Cases'],['stats','📊','Stats'],['settings','⚙︎','Settings']].map(([k,i,l])=>`<button data-tab="${k}" class="${tab==k?'on':''}"><i>${i}</i>${l}</button>`).join('');
return y}
function rerender(){const y=scrollY;render();scrollTo(0,y)}
function addEvent(name){const c=cur();c.events.push({id:uid(),time:new Date().toISOString(),name,note:''});c.events.sort((a,b)=>a.time.localeCompare(b.time));save();rerender();if(navigator.vibrate)navigator.vibrate(20)}
document.addEventListener('click',e=>{const t=e.target.closest('[data-tab],[data-open],[data-sec],[data-asa],[data-step],[data-ms],[data-ev],[data-evdel],#add,#back,#custAdd,#delCase,#csv,#bk,#imp');if(!t)return;const d=t.dataset;
if(d.tab){tab=d.tab;editId=null;render();scrollTo(0,0)}
else if(d.open){editId=d.open;section=0;openD.clear();render();scrollTo(0,0)}
else if(t.id==='add'){const c=newCase();cases.push(c);save();editId=c.id;section=0;render();scrollTo(0,0)}
else if(t.id==='back'){editId=null;tab='cases';render()}
else if(d.sec){section=+d.sec;render();scrollTo(0,0)}
else if(d.asa){cur().asa=+d.asa;save();rerender()}
else if(d.step){const c=cur(),k=d.step;c[k]=Math.min(+d.max,Math.max(+d.min,Math.round((+c[k]+ +d.d)*10)/10));save();rerender()}
else if(d.ms){const a=cur()[d.ms],i=a.indexOf(d.v);i<0?a.push(d.v):a.splice(i,1);save();rerender()}
else if(d.ev){addEvent(d.ev)}
else if(t.id==='custAdd'){const v=document.getElementById('cust').value.trim();if(v)addEvent(v)}
else if(d.evdel){if(confirm('Delete this event?')){cur().events.splice(+d.evdel,1);save();rerender()}}
else if(t.id==='delCase'){if(confirm('Delete this case permanently?')){cases=cases.filter(c=>c.id!==editId);save();editId=null;render()}}
else if(t.id==='csv')shareFile(`AnaesLog-${today()}.csv`,toCSV(),'text/csv')
else if(t.id==='bk')shareFile(`AnaesLog-backup-${today()}.json`,JSON.stringify({app:'AnaesLog',version:1,exported:new Date().toISOString(),cases},null,1),'application/json')
else if(t.id==='imp')document.getElementById('impF').click()});
document.addEventListener('toggle',e=>{const k=e.target.dataset&&e.target.dataset.dk;if(k)e.target.open?openD.add(k):openD.delete(k)},true);
document.addEventListener('input',e=>{const t=e.target,d=t.dataset;
if(t.id==='q'){q=t.value;const p=t.selectionStart;render();const n=document.getElementById('q');n.focus();n.setSelectionRange(p,p);return}
if(!editId)return;const c=cur();
if(d.k&&!d.t&&t.type!=='checkbox'&&t.tagName!=='SELECT'){c[d.k]=t.value;save();if(d.k==='caseID')document.querySelector('header h1').textContent=t.value}
else if(d.evn!==undefined){c.events[+d.evn].note=t.value;save()}});
document.addEventListener('change',e=>{const t=e.target,d=t.dataset;
if(t.id==='filt'){filt=t.value;render();return}
if(t.id==='pinT'){togglePin(t);return}
if(t.id==='impF'){importFile(t.files[0]);t.value='';return}
if(!editId)return;const c=cur();
if(d.cc){const a=c.consentChecks,i=a.indexOf(d.cc);t.checked?(i<0&&a.push(d.cc)):(i>=0&&a.splice(i,1));save()}
else if(d.t==='bool'){c[d.k]=t.checked;save()}
else if(d.t==='num'){const v=parseFloat(t.value);c[d.k]=isNaN(v)?0:v;save()}
else if(d.t==='date'){if(t.value){c.date=new Date(t.value).toISOString();save()}}
else if(t.tagName==='SELECT'&&d.k){c[d.k]=t.value;save()}
else if(d.evt!==undefined&&t.value){const ev=c.events[+d.evt],dt=new Date(ev.time),[h,m]=t.value.split(':');dt.setHours(+h,+m,0,0);ev.time=dt.toISOString();c.events.sort((a,b)=>a.time.localeCompare(b.time));save();rerender()}});
const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
function csvEsc(s){s=String(s??'');return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function toCSV(){const H=["CaseID","Date","Age","Sex","WeightKg","ASA","Emergency","Mallampati","Comorbidities","Allergies","FastSolidsH","FastClearsH","Medications","Investigations","Consent","Procedure","Specialty","Anaesthesia","Airway","Lines","Drugs","BloodLossMl","Events","AnalgesiaTechniques","AnalgesiaDrugs","PainRecovery","Pain24h","PONV","Complications","PreopNotes","IntraopNotes","PostopNotes"];
const j=a=>a.join('; ');const rows=[...cases].sort((a,b)=>a.date.localeCompare(b.date)).map(c=>[c.caseID,c.date,c.age,c.sex,c.weightKg,c.asa,c.emergency?'Y':'N',c.mallampati,j(c.comorbidities),c.allergies,c.fastingSolidsHrs,c.fastingClearsHrs,c.medications,j(c.investigations),j(c.consentChecks),c.procedure,c.specialty,c.anaesthesiaType,c.airwayDevice,j(c.lines),c.drugs,c.bloodLossMl,c.events.map(e=>hm(e.time)+' '+e.name+(e.note?` (${e.note})`:'')).join('; '),j(c.analgesiaTechniques),c.analgesiaDrugs,c.painRecovery,c.pain24h,c.ponv?'Y':'N',j(c.complications),c.preopNotes,c.intraopNotes,c.postopNotes].map(csvEsc).join(','));
return '\ufeff'+[H.join(','),...rows].join('\r\n')}
async function shareFile(name,text,type){const blob=new Blob([text],{type});const file=new File([blob],name,{type});
if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:name});return}catch(e){if(e.name==='AbortError')return}}
const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000)}
function importFile(f){if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result),list=Array.isArray(d)?d:d.cases;if(!Array.isArray(list))throw 0;
const base=newCase();let add=0,upd=0;list.forEach(x=>{const c=Object.assign({},base,x);c.id=c.id||uid();const i=cases.findIndex(y=>y.id===c.id);i>=0?(cases[i]=c,upd++):(cases.push(c),add++)});save();alert(`Imported: ${add} new, ${upd} updated.`);render()}catch(e){alert('Not a valid AnaesLog backup file.')}};r.readAsText(f)}
async function hash(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('anaeslog:'+s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function togglePin(t){if(t.checked){const p=prompt('Set a 4–8 digit passcode');if(!p||!/^\d{4,8}$/.test(p)){alert('Passcode must be 4–8 digits.');t.checked=false;return}
if(prompt('Re-enter passcode')!==p){alert('Passcodes did not match.');t.checked=false;return}localStorage.setItem(PIN,await hash(p))}
else{const p=prompt('Enter current passcode to turn off');if(p!==null&&await hash(p)===localStorage.getItem(PIN))localStorage.removeItem(PIN);else{alert('Incorrect passcode.');t.checked=true}}}
function lock(){if(!localStorage.getItem(PIN))return;const L=document.getElementById('lock');if(!L.hidden)return;L.hidden=false;
L.innerHTML='<img src="logo-wordmark.png" width="220" style="border-radius:18px;background:#0a6c6b;padding:8px 14px"><div style="font-size:22px">AnaesLog is locked</div><input type="password" inputmode="numeric" id="pinIn" autocomplete="off"><div class="sub" id="pinMsg">Enter passcode</div><button class="big" style="width:200px" id="unl">Unlock</button>';
const go=async()=>{const i=document.getElementById('pinIn');if(await hash(i.value)===localStorage.getItem(PIN)){L.hidden=true;L.innerHTML=''}else{document.getElementById('pinMsg').textContent='Incorrect passcode';i.value=''}};
document.getElementById('unl').onclick=go;document.getElementById('pinIn').onkeydown=e=>{if(e.key==='Enter')go()};setTimeout(()=>document.getElementById('pinIn')?.focus(),100)}
document.addEventListener('visibilitychange',()=>{if(document.hidden)lock()});
render();lock();
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
