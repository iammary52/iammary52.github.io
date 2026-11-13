'use strict';
/* =====================================================================
   audio.js — FM 음원(메가드라이브 YM2612 느낌) + 악보(MML) 연주기
   악보 문법: c d e f g a b (음), + 또는 # (반음 올림), - (반음 내림),
   숫자=길이(4=4분음표), . =점음표, r=쉼표, o4=옥타브, > < =옥타브 올림/내림, l8=기본 길이
   ===================================================================== */
const SND=(()=>{
let AC=null,master,musG,sfxG,dly,nbuf,muted=false,musVol=.55;
const INS={
  brass:{ratio:1,idx:3.4,idxS:1.5,idxD:.22,a:.025,d:.12,s:.8,r:.07,vib:5.2,vibD:.004},
  flute:{ratio:1,idx:1.1,idxS:.55,idxD:.1,a:.045,d:.08,s:.9,r:.1,vib:5.6,vibD:.006,send:.35},
  bell:{ratio:3.5,idx:2.4,idxS:.15,idxD:.3,a:.003,d:.55,s:0,r:.2,send:.4},
  epiano:{ratio:2,idx:1.6,idxS:.2,idxD:.25,a:.004,d:.5,s:0,r:.15,send:.25},
  bass:{ratio:1,idx:2.8,idxS:.7,idxD:.12,a:.006,d:.2,s:.55,r:.04},
  strings:{ratio:1,idx:1.3,idxS:1.1,idxD:.4,a:.14,d:.2,s:.85,r:.25,vib:4.8,vibD:.004,send:.3},
  organ:{ratio:2,idx:1.2,idxS:1.2,idxD:.1,a:.01,d:.05,s:.9,r:.05},
  psg:{sq:1,a:.004,d:.12,s:.35,r:.04},
  psg2:{sq:1,a:.004,d:.3,s:.6,r:.06}
};
function init(){
  if(AC){if(AC.state==='suspended')AC.resume();return;}
  try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
  master=AC.createGain();master.gain.value=muted?0:.8;
  const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=9500;const comp=AC.createDynamicsCompressor();master.connect(lp);lp.connect(comp);comp.connect(AC.destination);
  musG=AC.createGain();musG.gain.value=musVol;musG.connect(master);sfxG=AC.createGain();sfxG.gain.value=.6;sfxG.connect(master);
  dly=AC.createDelay(1);dly.delayTime.value=.26;const fb=AC.createGain();fb.gain.value=.32;dly.connect(fb);fb.connect(dly);const wet=AC.createGain();wet.gain.value=.5;dly.connect(wet);wet.connect(musG);
  nbuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=nbuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
}
const mf=m=>440*Math.pow(2,(m-69)/12);
function voice(t,f,dur,vol,I,dest){
  const g=AC.createGain(),end=t+dur,a=Math.min(I.a,dur*.5);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+a);
  const dEnd=Math.min(t+a+I.d,Math.max(end,t+a+.01));
  if(I.s<1)g.gain.exponentialRampToValueAtTime(Math.max(vol*I.s,.0002)*(I.s?1:1),I.s?dEnd:t+a+I.d);
  if(I.s>0){g.gain.setValueAtTime(vol*(I.s<1?I.s:1),Math.max(end,dEnd));g.gain.linearRampToValueAtTime(0,Math.max(end,dEnd)+I.r);}
  const stop=(I.s>0?Math.max(end,dEnd)+I.r:t+a+I.d)+.05;
  const car=AC.createOscillator();
  if(I.sq){car.type='square';car.frequency.value=f;}
  else{car.frequency.value=f;const mod=AC.createOscillator(),mg=AC.createGain();mod.frequency.value=f*I.ratio;
    const k=f*I.ratio;mg.gain.setValueAtTime(I.idx*k,t);mg.gain.exponentialRampToValueAtTime(Math.max(I.idxS*k,.5),t+I.idxD);
    mod.connect(mg);mg.connect(car.frequency);mod.start(t);mod.stop(stop);}
  if(I.vib&&dur>.22){const l=AC.createOscillator(),lg=AC.createGain();l.frequency.value=I.vib;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(f*I.vibD,t+.25);l.connect(lg);lg.connect(car.frequency);l.start(t);l.stop(stop);}
  car.connect(g);g.connect(dest);if(I.send&&dest===musG){const s=AC.createGain();s.gain.value=I.send;g.connect(s);s.connect(dly);}
  car.start(t);car.stop(stop);
}
function noise(t,dur,vol,dest,type,freq){const s=AC.createBufferSource(),g=AC.createGain();s.buffer=nbuf;s.loop=true;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0005,t+dur);
  if(type){const f=AC.createBiquadFilter();f.type=type;f.frequency.value=freq;s.connect(f);f.connect(g);}else s.connect(g);g.connect(dest);s.start(t,Math.random());s.stop(t+dur+.02);}
function tone(type,f0,f1,t,dur,vol,dest){const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0005,t+dur);o.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+.02);}
function drum(t,n,vol){ // c=킥 d=스네어 e=탐 f=닫힌 하이햇 g=열린 하이햇 a=크래시
  if(n===0){tone('sine',150,42,t,.16,vol*1.1,musG);}
  else if(n===2){noise(t,.13,vol*.55,musG,'bandpass',1700);tone('triangle',210,120,t,.08,vol*.4,musG);}
  else if(n===4){tone('sine',190,90,t,.2,vol*.8,musG);}
  else if(n===5){noise(t,.035,vol*.22,musG,'highpass',7500);}
  else if(n===7){noise(t,.16,vol*.2,musG,'highpass',6500);}
  else if(n===9){noise(t,.7,vol*.32,musG,'highpass',4500);}
}
/* MML → [{t,d,n}] (박자 단위) */
const SEMI={c:0,d:2,e:4,f:5,g:7,a:9,b:11};
function parse(m){
  const ev=[];let o=4,L=8,t=0,i=0;const num=()=>{let s='';while(i<m.length&&/\d/.test(m[i]))s+=m[i++];return s?+s:0;};
  const len=()=>{let n=num()||L,b=4/n;if(m[i]==='.'){b*=1.5;i++;}return b;};
  while(i<m.length){const ch=m[i++];
    if(ch==='o')o=num();else if(ch==='>')o++;else if(ch==='<')o--;else if(ch==='l')L=num();
    else if(ch==='r')t+=len();
    else if(SEMI[ch]!==undefined){let s=SEMI[ch];if(m[i]==='+'||m[i]==='#'){s++;i++;}else if(m[i]==='-'){s--;i++;}const b=len();ev.push({t,d:b,n:12*(o+1)+s});t+=b;}
  }
  return{ev,len:t};
}
/* ---------------- 곡 ---------------- */
const rep=(s,n)=>Array(n).fill(s).join(' ');
const SONGS={
 title:{bpm:100,ch:[
  {i:'brass',v:.2,m:`o4 g4>c4e4.d8 c4<b4a2 f4a4>c4.<b8 a4g2. g4>c4e4.f8 g4e4d2 f4.e8d4<b4 >c2.r4
     e4e8d8c4<a4 >d4d8c8<b4g4 >c4c8<b8a4f4 g4a4b4>d4 e4e8f8g4e4 a4a8g8f4d4 g4.f8e4d4 c2.r4`},
  {i:'strings',v:.1,m:`o4 e1e1f1d1e1e2d2f2d2e1 e1d1c1d1e1f2f2d1e1`},
  {i:'epiano',v:.11,m:`l8 o4cege>c<geg o3a>cecaece o3fa>c<a>fc<a>c o3gb>d<b>gd<b>d o4cege>c<geg o4cegeo3gb>d<b o3dfafo3gb>d<b o4cege>c<geg
     o3a>cecaece o3gb>d<b>gd<b>d o3fa>c<a>fc<a>c o3gb>d<b>gd<b>d o4cege>c<geg o3fa>c<ao3dfaf o3gb>d<b>gd<b>d o4cege>c<geg`},
  {i:'bass',v:.26,m:`l4 o2cg>c<g o2a>eae o2f>cfc o2g>dgd o2cg>c<g o2cgo2g>d o2dao2g>d o2cg>c<g
     o2a>eae o2g>dgd o2f>cfc o2g>dgd o2cg>c<g o2f>co2da o2g>do2g>d o2cg>cr`},
  {i:'drum',v:.5,m:rep('l8 c f d f c c d f',16)}]},
 town:{bpm:112,ch:[
  {i:'flute',v:.2,m:`o5 d4g8f+8e4d4 e8d8<b4g2 >c4e8d8c4<a4 b8a8f+4d2 >d4g8a8b4g4 e8g8>c4<b4a4 a8g8f+8e8d4f+4 g2.r4
     o5 b4.a8g4e4 g4.f+8e4c4 d4.e8d4<b4 a2.>d4 b4.a8g4e4 >c4.<b8a4g4 f+4a4>d4.c8 <b2.r4`},
  {i:'psg',v:.045,m:`l8 o4 gb>d<bgb>d<b egbgegbg cegecege df+af+df+af+ gb>d<bgb>d<b cegecege a>cec<df+af+ gb>d<bgb>d<b
     o4 egbgegbg cegecege gb>d<bgb>d<b df+af+df+af+ egbgegbg cegecege df+af+df+af+ gb>d<bgb>d<b`},
  {i:'bass',v:.24,m:`l4 o2g>dgd o2eb>e<b o2cg>c<g o2da>d<a o2g>dgd o2cg>c<g o2a>eo2da o2g>dgd
     o2eb>e<b o2cg>c<g o2g>dgd o2da>d<a o2eb>e<b o2cg>c<g o2da>d<a o2g>dgr`},
  {i:'drum',v:.34,m:rep('l8 c f f f d f f f',16)}]},
 field:{bpm:138,ch:[
  {i:'brass',v:.19,m:`o4 a8>c+8e4e8f+8e4 d8c+8<b4b8>c+8d4 e8d8c+4<a4>c+4 <b2.r4 a8>c+8e4e8f+8a4 g+8f+8e4e8d8c+4 d8e8f+4e4<b4 a2.r4
     o5 f+4f+8e8f+4a4 f+4d8e8f+2 e4e8d8e4g+4 a4e8c+8<a2 >f+4f+8e8f+4a4 b4a8f+8d2 e4.f+8g+4b4 b2g+4e4`},
  {i:'psg',v:.04,m:`l8 o4 c+eaec+eae df+bf+df+bf+ c+eaec+eae eg+bg+eg+bg+ c+eaec+eae eg+bg+eg+bg+ df+af+eg+bg+ c+eaec+eae
     c+f+af+c+f+af+ df+af+df+af+ eg+bg+eg+bg+ c+eaec+eae c+f+af+c+f+af+ df+af+df+af+ eg+bg+eg+bg+ eg+bg+eg+bg+`},
  {i:'strings',v:.07,m:`o4 e1 f+1 e1 e1 e1 e1 f+2g+2 e1 f+1 f+1 g+1 e1 f+1 f+1 g+1 b1`},
  {i:'bass',v:.26,m:`l8 o2aa>a<aaa>a<a o2bb>b<bbb>b<b o2aa>a<aaa>a<a o2ee>e<eee>e<e o2aa>a<aaa>a<a o2ee>e<eee>e<e o2dd>d<do2ee>e<e o2aa>a<aaa>a<a
     o2f+f+>f+<f+f+f+>f+<f+ o2dd>d<ddd>d<d o2ee>e<eee>e<e o2aa>a<aaa>a<a o2f+f+>f+<f+f+f+>f+<f+ o2dd>d<ddd>d<d o2ee>e<eee>e<e o2ee>e<eeeg+b`},
  {i:'drum',v:.5,m:rep('l8 c f d f c c d f',15)+' l8 c f d f c d d16 d16 d16 d16'}]},
 dungeon:{bpm:96,ch:[
  {i:'flute',v:.17,m:`o4 a2>d2 f2.e4 d2<b-2 a1 >d2f2 g2.f4 e2c+2 e2.r4
     o5 d4e4f4a4 g4f4e4d4 f4d4<b-4>d4 c+2<a2 >d4e4f4a4 b-4a4g4f4 e4f4e4c+4 e2.r4`},
  {i:'bell',v:.085,m:rep(`l16 o4 ${rep('da>d<afa>d<a',4)} ${rep('db->d<b-fb->d<b-',2)} ${rep('c+a>c+<aea>c+<a',2)} ${rep('da>d<afa>d<a',2)} ${rep('db->d<b-gb->d<b-',2)} ${rep('c+a>c+<aea>c+<a',4)}`,2)},
  {i:'strings',v:.08,m:rep('o3 f1f1f1e1f1g1e1e1',2)},
  {i:'bass',v:.26,m:rep('o2 d2.d4 d2.d4 o1b-2.b-4 a2.a4 o2d2.d4 o1g2.g4 a2.a4 a2a4>e4',2)},
  {i:'drum',v:.3,m:rep('l8 c4 f f r4 f f',16)}]},
 cave:{bpm:104,ch:[
  {i:'bell',v:.15,m:`o4 e4b4g4.f+8 e4g4>c2 d4a4f+4.e8 d4f+4b2 o5 e4b4>e4.d8 c4<g4e2 o5 c4e4a4.g8 f+4d+4<b2
     o5 g8f+8e4b4g4 e8g8>c4<g4e4 f+8e8d4a4f+4 d8f+8b4f+4d4 g8f+8e4b4>e4 <c8e8g4>c4<g4 a8g8e4c4e4 d+4f+4b2`},
  {i:'epiano',v:.085,m:rep(`l8 o3eb>e<b>g<b>e<b o3cg>c<g>e<g>c<g o3da>d<a>f+<a>d<a o2b>f+bf+>d<f+bf+ o3eb>e<b>g<b>e<b o3cg>c<g>e<g>c<g o2a>eae>c<eae o2b>f+bf+>d+<f+bf+`,2)},
  {i:'strings',v:.07,m:rep('o4 g1 g1 f+1 f+1 g1 g1 e1 f+1',2)},
  {i:'bass',v:.24,m:rep('o2 e2e4.e8 c2c4.c8 d2d4.d8 o1b2b4.b8 o2e2e4.e8 c2c4.c8 o1a2a4.a8 b2b4.b8',2)},
  {i:'drum',v:.26,m:rep('l8 c f f f f f f f',16)}]},
 temple:{bpm:126,ch:[
  {i:'brass',v:.19,m:`o4 c4e-8g8>c4<b-4 a-4>c8<a-8e-2 b-4>d8f8b-4a-4 g4d8<b8g2 o5 c4e-8g8>c4<b-4 a-4g8f8e-2 f4a-8>c8<f4e-4 d2<b4g4
     o5 e-4.d8c4<a-4 >f4.e-8d4<b-4 >g4.f8e-4c4 g2e-4c4 a-4.g8f4e-4 b-4.a-8g4f4 d4g8b8>d4<b4 g1`},
  {i:'psg',v:.04,m:`l8 o4 ce-ge-ce-ge- ce-a-e-ce-a-e- dfb-fdfb-f dgbgdgbg ce-ge-ce-ge- ce-a-e-ce-a-e- cfa-fcfa-f dgbgdgbg
     ce-a-e-ce-a-e- dfb-fdfb-f ce-ge-ce-ge- ce-ge-ce-ge- ce-a-e-ce-a-e- dfb-fdfb-f dgbgdgbg dgbgdgbg`},
  {i:'strings',v:.07,m:`o4 e-1 e-1 f1 d1 e-1 e-1 f1 d1 e-1 f1 g1 g1 e-1 f1 d1 d1`},
  {i:'bass',v:.27,m:`l8 o2ccgc>c<cgc o1a-a->e-<a->a-<a->e-<a- o1b-b->f<b->b-<b->f<b- o1gg>d<g>g<g>d<g o2ccgc>c<cgc o1a-a->e-<a->a-<a->e-<a- o1ff>c<f>f<f>c<f o1gg>d<g>g<g>d<g
     o1a-a->e-<a->a-<a->e-<a- o1b-b->f<b->b-<b->f<b- o2ccgc>c<cgc o2ccgc>c<cgc o1a-a->e-<a->a-<a->e-<a- o1b-b->f<b->b-<b->f<b- o1gg>d<g>g<g>d<g o1gg>d<g>g<g>d<g`},
  {i:'drum',v:.48,m:rep('l8 c f d f c c d f',15)+' l8 c f d f c d e e'}]},
 boss:{bpm:152,ch:[
  {i:'brass',v:.19,m:`o4 e8e16e16g8e8b8a8g8f+8 e8e16e16g8e8>d8c8<b8a8 g8g16g16>c8<g8e8g8>c8e8 d8d16d16<a8f+8a8>d8f+8a8
     o5 e8e16e16g8e8b8a8g8f+8 e8e16e16g8e8>d8c8<b8a8 g8e8c8e8g8>c8<b8a8 <b8>d+8f+8b8f+8d+8<b8>d+8`},
  {i:'psg',v:.04,m:`l16 o4 ${rep('egbg',8)} ${rep('ceg>c<',4)} ${rep('df+a>d<',4)} ${rep('egbg',8)} ${rep('ceg>c<',4)} o3 ${rep('b>d+f+d+<',4)}`},
  {i:'organ',v:.06,m:`o4 b1 b1 >c1 d1 <b1 b1 >c1 <b1`},
  {i:'bass',v:.28,m:`l8 o2ee>e<ee>e<ee o2ee>e<ee>e<ee o2cc>c<cc>c<cc o2dd>d<dd>d<dd o2ee>e<ee>e<ee o2ee>e<ee>e<ee o2cc>c<cc>c<cc o1bb>b<bb>b<bb`},
  {i:'drum',v:.52,m:'l8 a f d f c c d f '+rep('l8 c f d f c c d f',3)+' l8 a f d f c c d f '+rep('l8 c f d f c c d f',2)+' l8 c f d f c d d16 d16 e16 e16'}]},
 ending:{bpm:84,ch:[
  {i:'flute',v:.2,m:`o4 g4>c4e4.d8 c4<b4a2 f4a4>c4.<b8 a4g2. g4>c4e4.f8 g4e4d2 f4.e8d4<b4 >c2.r4
     e4e8d8c4<a4 >d4d8c8<b4g4 >c4c8<b8a4f4 g4a4b4>d4 e4e8f8g4e4 a4a8g8f4d4 g4.f8e4d4 c2.r4`},
  {i:'strings',v:.12,m:`o4 e1e1f1d1e1e2d2f2d2e1 e1d1c1d1e1f2f2d1e1`},
  {i:'epiano',v:.11,m:`l8 o4cege>c<geg o3a>cecaece o3fa>c<a>fc<a>c o3gb>d<b>gd<b>d o4cege>c<geg o4cegeo3gb>d<b o3dfafo3gb>d<b o4cege>c<geg
     o3a>cecaece o3gb>d<b>gd<b>d o3fa>c<a>fc<a>c o3gb>d<b>gd<b>d o4cege>c<geg o3fa>c<ao3dfaf o3gb>d<b>gd<b>d o4cege>c<geg`},
  {i:'bass',v:.22,m:`o2c1 o1a1 f1 g1 o2c1 c2o1g2 o2d2o1g2 o2c1 o1a1 g1 f1 g1 o2c1 o1f2o2d2 o1g1 o2c1`}]},
 /* 짧은 징글(반복 없음) */
 item:{bpm:150,once:1,ch:[{i:'brass',v:.22,m:'o4 g16>c16e16g16>c8.<g16>c2'},{i:'epiano',v:.14,m:'o4 e16g16>c16e16g8.e16g2'},{i:'bass',v:.26,m:'o2 c4 g8. g16 >c2'}]},
 clear:{bpm:132,once:1,ch:[{i:'brass',v:.22,m:'o4 g8>c8e8g4e8g8>c8 <a4>c8<a8>d4.d8 e1'},{i:'epiano',v:.13,m:'o4 e8g8>c8e4c8e8g8 f4a8f8b4.b8 >c1'},
   {i:'bass',v:.27,m:'o2 c4c4c4c4 f4f4g4g4 >c2.r4'},{i:'drum',v:.5,m:'l8 c f d f c f d d c f d f c d d d a2. r4'}]},
 over:{bpm:80,once:1,ch:[{i:'strings',v:.2,m:'o4 e4d4c4<b4 a1'},{i:'bass',v:.26,m:'o2 a2 e2 o1a1'}]},
 open:{bpm:160,once:1,ch:[{i:'bell',v:.2,m:'l16 o5 c e g >c e8'}]}
};
for(const k in SONGS){const s=SONGS[k];s.len=0;for(const c of s.ch){const p=parse(c.m);c.ev=p.ev;c.len=p.len;s.len=Math.max(s.len,p.len);}}
/* ---------------- 연주기 ---------------- */
let cur=null,curName='',jing=null,resumeName='';
function start(name){const s=SONGS[name];if(!s)return null;return{s,name,t0:AC?AC.currentTime+.06:0,pos:s.ch.map(()=>0),loop:s.ch.map(()=>0)};}
function play(name){if(curName===name&&cur)return;curName=name;if(!AC){cur=null;return;}cur=name?start(name):null;}
function stop(){cur=null;curName='';}
function jingle(name,cb){if(!AC){if(cb)cb();return;}resumeName=curName;cur=null;jing=start(name);jing.cb=cb;}
function sched(P,now){const s=P.s,spb=60/s.bpm;let alive=false;
  s.ch.forEach((c,ci)=>{for(;;){const e=c.ev[P.pos[ci]];if(!e){if(s.once)return;P.pos[ci]=0;P.loop[ci]++;continue;}
      const t=P.t0+(P.loop[ci]*s.len+e.t)*spb;if(t>now+.22){alive=true;return;}alive=true;
      if(t>=now-.05){if(c.i==='drum')drum(t,e.n%12,c.v);else voice(t,mf(e.n),e.d*spb*.92,c.v,INS[c.i],musG);}
      P.pos[ci]++;}});
  return s.once?(now<P.t0+s.len*spb+.3):true;}
setInterval(()=>{if(!AC||AC.state!=='running')return;const now=AC.currentTime;
  if(jing){if(!sched(jing,now)){const cb=jing.cb;jing=null;if(resumeName&&curName===resumeName)cur=start(resumeName);if(cb)cb();}return;}
  if(!cur&&curName)cur=start(curName);
  if(cur)sched(cur,now);},45);
/* ---------------- 효과음 ---------------- */
const SF={
  jump(t){tone('square',220,520,t,.12,.12,sfxG);},
  land(t){tone('sine',120,60,t,.07,.25,sfxG);},
  swing(t){noise(t,.1,.18,sfxG,'bandpass',2600);tone('triangle',900,300,t,.08,.06,sfxG);},
  hit(t){tone('square',300,90,t,.09,.2,sfxG);noise(t,.06,.2,sfxG,'highpass',1500);},
  die(t){tone('square',500,60,t,.25,.18,sfxG);noise(t,.2,.2,sfxG,'lowpass',1200);},
  hurt(t){tone('sawtooth',320,70,t,.3,.22,sfxG);},
  coin(t){tone('square',1319,1319,t,.05,.12,sfxG);tone('square',1760,1760,t+.05,.14,.12,sfxG);},
  heart(t){tone('triangle',660,990,t,.12,.2,sfxG);tone('triangle',990,1320,t+.1,.14,.2,sfxG);},
  sw(t){tone('square',180,120,t,.06,.2,sfxG);tone('square',700,700,t+.06,.08,.1,sfxG);},
  gate(t){for(let i=0;i<6;i++)noise(t+i*.07,.09,.22,sfxG,'lowpass',260+i*30);tone('sine',70,40,t,.5,.4,sfxG);},
  push(t){noise(t,.16,.2,sfxG,'lowpass',500);},
  splash(t){noise(t,.3,.3,sfxG,'bandpass',1100);tone('sine',500,120,t,.2,.12,sfxG);},
  fall(t){tone('square',700,110,t,.5,.13,sfxG);},
  blip(t){tone('square',880,880,t,.025,.06,sfxG);},
  sel(t){tone('square',660,990,t,.07,.12,sfxG);},
  save(t){[523,659,784,1047].forEach((f,i)=>tone('triangle',f,f,t+i*.09,.3,.18,sfxG));},
  key(t){tone('square',988,988,t,.06,.12,sfxG);tone('square',1319,1319,t+.06,.06,.12,sfxG);tone('square',1568,1568,t+.12,.16,.12,sfxG);},
  fire(t){noise(t,.2,.16,sfxG,'bandpass',900);tone('sawtooth',300,120,t,.18,.08,sfxG);},
  quake(t){tone('sine',90,30,t,.5,.6,sfxG);noise(t,.4,.3,sfxG,'lowpass',400);},
  roar(t){tone('sawtooth',160,50,t,.7,.3,sfxG);noise(t,.6,.2,sfxG,'lowpass',700);},
  boom(t){tone('sine',160,30,t,.6,.6,sfxG);noise(t,.5,.4,sfxG,'lowpass',900);},
  herb(t){[392,523,659,784,1047].forEach((f,i)=>tone('triangle',f,f,t+i*.06,.2,.2,sfxG));},
  no(t){tone('square',160,140,t,.12,.14,sfxG);},
  pot(t){noise(t,.14,.3,sfxG,'highpass',2200);tone('square',900,300,t,.06,.08,sfxG);}
};
const last={};
function sfx(n,gap=.03){if(!AC||AC.state!=='running')return;const t=AC.currentTime;if(last[n]&&t-last[n]<gap)return;last[n]=t;SF[n](t);}
function mute(v){muted=v===undefined?!muted:v;if(master)master.gain.value=muted?0:.8;return muted;}
return{init,play,stop,jingle,sfx,mute,SONGS,parse,get muted(){return muted;},get ready(){return !!AC;}};
})();
