'use strict';
/* =====================================================================
   game.js — 쿼터뷰(아이소메트릭) 액션 어드벤처 엔진
   좌표: x,y = 타일 단위(오른쪽 아래/왼쪽 아래 방향), z = 높이 단위(1단 = 8픽셀)
   ===================================================================== */
(()=>{
const TAU=Math.PI*2,$=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a=1,b)=>b===undefined?Math.random()*a:a+Math.random()*(b-a);
const mkc=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,w|0);c.height=Math.max(1,h|0);return c;};
const S=GFX.build();
const main=$('c'),mx=main.getContext('2d');
let lo=mkc(8,8),lx=lo.getContext('2d'),lm=mkc(8,8),lmx=lm.getContext('2d'),gm=mkc(8,8),gmx=gm.getContext('2d');
let W=400,H=240,SC=3,PW=1,PH=1;
function resize(){
  const dpr=Math.min(window.devicePixelRatio||1,3);PW=main.width=Math.max(2,innerWidth*dpr|0);PH=main.height=Math.max(2,innerHeight*dpr|0);
  SC=Math.max(1,Math.round(Math.sqrt(PW*PH/(430*262))));W=Math.ceil(PW/SC);H=Math.ceil(PH/SC);
  for(const c of[lo,lm,gm]){c.width=W;c.height=H;}lx.imageSmoothingEnabled=false;vig=null;
}
let vig=null;
addEventListener('resize',resize);
const isTouch=('ontouchstart' in window)||matchMedia('(pointer:coarse)').matches;
if(isTouch)document.body.classList.add('touch');

/* ---------------- 입력 ---------------- */
const keys={},pressed={},joy={on:false,id:-1,sx:0,sy:0,x:0,y:0};
const KM={ArrowLeft:'L',KeyA:'L',ArrowRight:'R',KeyD:'R',ArrowUp:'U',KeyW:'U',ArrowDown:'D',KeyS:'D',Space:'A',KeyZ:'A',KeyK:'A',KeyX:'B',KeyJ:'B',Enter:'B',Escape:'M',KeyP:'M',KeyM:'S'};
addEventListener('keydown',e=>{const k=KM[e.code];SND.init();if(!k)return;e.preventDefault();if(!e.repeat&&!keys[k])pressed[k]=1;keys[k]=1;});
addEventListener('keyup',e=>{const k=KM[e.code];if(k)keys[k]=0;});
document.querySelectorAll('.tb').forEach(b=>{const k=b.dataset.k;
  b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();SND.init();b.classList.add('on');if(!keys[k])pressed[k]=1;keys[k]=1;});
  const up=e=>{e.preventDefault();b.classList.remove('on');keys[k]=0;};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up);});
main.addEventListener('pointerdown',e=>{e.preventDefault();SND.init();
  if(state==='dialog'&&dlg&&dlg.q[dlg.i].c&&dlg.n>=dlg.q[dlg.i].t.length)dlg.sel=e.clientX<innerWidth/2?0:1;
  if(state==='title'&&hasSave)menuSel=e.clientY>innerHeight*.71?1:0;
  if(state!=='play'||!isTouch||e.clientX>innerWidth*.6){pressed.B=1;pressed.T=1;return;}
  if(!joy.on){joy.on=true;joy.id=e.pointerId;joy.sx=e.clientX;joy.sy=e.clientY;joy.x=joy.y=0;}});
addEventListener('pointermove',e=>{if(!joy.on||e.pointerId!==joy.id)return;let dx=e.clientX-joy.sx,dy=e.clientY-joy.sy;const d=Math.hypot(dx,dy),M=48;
  if(d>M){joy.sx+=dx*(1-M/d);joy.sy+=dy*(1-M/d);dx*=M/d;dy*=M/d;}const n=Math.hypot(dx,dy);if(n>8){joy.x=dx/n;joy.y=dy/n;}else joy.x=joy.y=0;});
const jend=e=>{if(e.pointerId===joy.id){joy.on=false;joy.x=joy.y=0;}};addEventListener('pointerup',jend);addEventListener('pointercancel',jend);
addEventListener('contextmenu',e=>e.preventDefault());

/* ---------------- 상태 ---------------- */
const VOID=-99,G=46,JV=18,SPD=3.5;
let state='title',R=null,hero=null,ents=[],parts=[],cam={x:0,y:0},gt=0,shake=0,fade=1,fadeTo=1,fadeCb=null,banner=0,hitstop=0,toastT=0,toastS='';
let dlg=null,itemGet=null,menuSel=0,hintT=0;
const DEF={room:'village',x:9,y:14,hp:6,maxhp:6,gold:0,keys:0,herb:1,sword:1,flags:{},time:0,emb:0};
let SV=JSON.parse(JSON.stringify(DEF)),hasSave=false;
try{const s=JSON.parse(localStorage.getItem('sunstone_save')||'null');if(s&&s.room&&ROOMS[s.room]){SV=Object.assign(JSON.parse(JSON.stringify(DEF)),s);hasSave=true;}}catch(e){}
const persist=()=>{try{localStorage.setItem('sunstone_save',JSON.stringify(SV));hasSave=true;}catch(e){}};
const flag=k=>!!SV.flags[k],setFlag=k=>{SV.flags[k]=1;};

/* ---------------- 방 ---------------- */
const THEME={
  grass:{t:'g',wall:'g',bg:'sea',amb:[255,255,255],out:1},
  coast:{t:'d',wall:'d',bg:'sea',amb:[255,246,236],out:1},
  ruin:{t:'s',wall:'B',bg:'dark',amb:[92,98,150]},
  cave:{t:'r',wall:'C',bg:'dark',amb:[70,96,150]},
  temple:{t:'t',wall:'T',bg:'dark',amb:[150,112,92]}
};
const hch=c=>c===' '||c==='~'||c===undefined?VOID:c<='9'?+c:c.charCodeAt(0)-87;
function loadRoom(id,sx,sy,keepHp){
  const d=ROOMS[id],th=THEME[d.th];const rows=d.h.trim().split('\n').map(r=>r.trim()),trow=d.t?d.t.trim().split('\n').map(r=>r.trim()):null;
  const h=rows.length,w=Math.max(...rows.map(r=>r.length));
  R={id,d,th,w,h,hm:new Int16Array(w*h),tm:[],cells:new Array(w*h),clear:false,sw:{},hint:d.hint};
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=hch(rows[y][x]);R.hm[y*w+x]=v;let t=trow&&trow[y]&&trow[y][x]&&trow[y][x]!=='.'?trow[y][x]:(d.wall&&v>=d.wall?th.wall:th.t);R.tm[y*w+x]=t;}
  ents=[];parts=[];
  for(const o of d.o||[])spawn(o[0],o[1],o[2],o[3]||{});
  hero=mkHero(sx+.5,sy+.5);ents.push(hero);
  R.clear=!ents.some(e=>e.enemy);if(flag(id+':clear'))R.clear=true;
  SV.room=id;SV.x=sx;SV.y=sy;if(!keepHp&&state!=='title')persist();
  const c=iso(hero.x,hero.y,hero.z);cam.x=c[0];cam.y=c[1];clampCam();
  banner=3;hintT=R.hint&&!flag('hint:'+id)?1.2:0;
  SND.play(d.mus);amb=[];
}
const cellH=(cx,cy)=>(cx<0||cy<0||cx>=R.w||cy>=R.h)?99:R.hm[cy*R.w+cx];
const tileAt=(cx,cy)=>(cx<0||cy<0||cx>=R.w||cy>=R.h)?'':R.tm[cy*R.w+cx];
const vh=(cx,cy)=>{const v=cellH(cx,cy);return v===99||v===VOID?0:v;};
function cellImg(cx,cy,f){const i=cy*R.w+cx;let c=R.cells[i];if(!c)c=R.cells[i]={};if(c[f])return c[f];
  const h=R.hm[i],t=R.tm[i],fr=GFX.TILE[t]&&GFX.TILE[t][2]?f:0;if(c[fr]){c[f]=c[fr];return c[f];}
  const nb={bx:cx>0?vh(cx-1,cy)-h:0,bx2:cx>1?vh(cx-2,cy)-h:0,by:cy>0?vh(cx,cy-1)-h:0};
  return c[f]=c[fr]=GFX.cell(t,cx,cy,h,Math.max(0,h-vh(cx,cy+1)),Math.max(0,h-vh(cx+1,cy)),nb,fr);}
const iso=(x,y,z)=>[(x-y)*16,(x+y)*8-z*8];
function clampCam(){const x0=-R.h*16,x1=R.w*16,y0=-80,y1=(R.w+R.h)*8;
  cam.x=(x1-x0<W)?(x0+x1)/2:clamp(cam.x,x0+W/2-24,x1-W/2+24);cam.y=(y1-y0<H)?(y0+y1)/2:clamp(cam.y,y0+H/2-10,y1-H/2+24);}

/* ---------------- 개체 ---------------- */
const DIRV=[[1,0],[0,1],[-1,0],[0,-1]];
function mkHero(x,y){return{k:'hero',x,y,z:Math.max(0,cellH(x|0,y|0)),vx:0,vy:0,vz:0,r:.3,hgt:3.2,dir:0,ground:true,anim:0,atk:0,inv:0,push:0,safe:{x,y},kx:0,ky:0,sq:0,coy:0};}
const ENEMY={
  slimeG:{hp:2,dmg:1,r:.34,spr:'slimeG',ai:'hop',gold:2},slimeB:{hp:4,dmg:1,r:.34,spr:'slimeB',ai:'hop',gold:4},slimeR:{hp:7,dmg:2,r:.34,spr:'slimeR',ai:'hop',gold:7},
  bat:{hp:1,dmg:1,r:.3,spr:'bat',ai:'fly',gold:2},mush:{hp:4,dmg:2,r:.34,spr:'mush',ai:'walk',gold:5,spd:1.5},skel:{hp:8,dmg:2,r:.32,spr:'skel',ai:'walk',gold:9,spd:2},
  wisp:{hp:3,dmg:2,r:.3,spr:'wisp',ai:'fly',gold:6,light:'red'}
};
function spawn(k,x,y,p){
  const id=p.id?R.id+':'+p.id:null,e={k,x:x+.5,y:y+.5,z:p.z!==undefined?p.z:Math.max(0,cellH(x,y)),vx:0,vy:0,vz:0,r:.3,hgt:3,hw:.5,hd:.5,hh:0,solid:false,t:rnd(9),p,id};
  if(ENEMY[k]){if(p.id&&flag(id))return;Object.assign(e,{enemy:1,E:ENEMY[k],hp:ENEMY[k].hp,r:ENEMY[k].r,hgt:2.4,st:rnd(.5,1.5),kx:0,ky:0,flash:0,ground:true,ox:e.x,oy:e.y});if(ENEMY[k].ai==='fly'){e.fz=2.5;e.z+=2.5;}}
  else if(k==='boss'){if(flag(R.id+':boss'))return;const B={stump:{hp:14,spr:'boss1',r:.9,sh:3},crab:{hp:22,spr:'boss2',r:1,sh:3},sun:{hp:36,spr:'boss3',r:.9,sh:3}}[p.b];
    Object.assign(e,{enemy:1,boss:p.b,B,hp:B.hp,mhp:B.hp,r:B.r,hgt:5,st:2,kx:0,ky:0,flash:0,ground:true,mode:'idle',n:0,E:{dmg:2,gold:0}});}
  else if(k==='crate')Object.assign(e,{solid:1,hw:.47,hd:.47,hh:2,ox:e.x,oy:e.y});
  else if(k==='gate'){e.solid=1;e.hw=e.hd=.5;e.hh=4;e.open=flag(id)?1:0;e.sink=e.open?4:0;if(e.open)e.solid=0;}
  else if(k==='chest'){e.solid=1;e.hw=e.hd=.42;e.hh=1.5;e.open=flag(id);e.act=1;if(p.hide&&!flag(R.id+':clear')&&!e.open){e.hidden=1;e.solid=0;}}
  else if(k==='npc'||k==='sign'||k==='statue'){e.solid=1;e.hw=e.hd=k==='statue'?.4:.3;e.hh=k==='sign'?2.5:3.5;e.act=1;if(p.until&&flag(p.until))return;if(p.after&&!flag(p.after))return;}
  else if(k==='torch'){e.solid=1;e.hw=e.hd=.25;e.hh=4;}
  else if(k==='pot'||k==='bush'){e.solid=1;e.hw=e.hd=.32;e.hh=1.8;e.brk=1;}
  else if(k==='rock'){e.solid=1;e.hw=e.hd=.4;e.hh=2;}
  else if(k==='tree'||k==='palm'){e.solid=1;e.hw=e.hd=.3;e.hh=9;e.sway=1;}
  else if(k==='hut'){e.solid=1;e.x=x+1;e.y=y+1;e.hw=e.hd=1;e.hh=9;}
  else if(k==='plat'){e.solid=1;e.w=p.w||1;e.d=p.d||1;e.x=x+e.w/2;e.y=y+e.d/2;e.hw=e.w/2;e.hd=e.d/2;e.hh=1;e.z=(p.z!==undefined?p.z:Math.max(0,cellH(x,y)+1))-1;e.x0=e.x;e.y0=e.y;e.z0=e.z;e.ph=p.ph||0;}
  else if(k==='turret'){e.solid=1;e.hw=e.hd=.4;e.hh=3.5;e.st=p.ph||1;}
  else if(k==='coin'||k==='heartp'){if(p.id&&flag(id))return;e.pick=1;e.vz=0;}
  else if(k==='sw'){e.on=flag(id);}
  else if(k==='exit'){}
  ents.push(e);return e;
}
function terrainZ(x,y,r){return Math.max(cellH(Math.floor(x-r),Math.floor(y-r)),cellH(Math.floor(x+r),Math.floor(y-r)),cellH(Math.floor(x-r),Math.floor(y+r)),cellH(Math.floor(x+r),Math.floor(y+r)));}
function blocked(e,x,y){
  const st=e.ground?1.05:.05,r=e.r;
  for(const[ox,oy]of[[-r,-r],[r,-r],[-r,r],[r,r]]){const h=cellH(Math.floor(x+ox),Math.floor(y+oy));if(h>e.z+st&&!(e.fly&&h<90))return true;}
  for(const s of ents){if(!s.solid||s===e)continue;if(Math.abs(x-s.x)<r+s.hw&&Math.abs(y-s.y)<r+s.hd){const top=s.z+s.hh;if(e.z<top-st&&e.z+e.hgt>s.z)return s;}}
  return null;
}
function groundZ(e){let g=terrainZ(e.x,e.y,e.r);if(g===99)g=0;e.on=null;
  for(const s of ents){if(!s.solid||s===e)continue;if(Math.abs(e.x-s.x)<e.r+s.hw&&Math.abs(e.y-s.y)<e.r+s.hd){const top=s.z+s.hh;if(top<=e.z+1.05&&top>g){g=top;e.on=s;}}}
  return g;}
function move(e,dx,dy){let hit=null;if(dx){const b=blocked(e,e.x+dx,e.y);if(!b)e.x+=dx;else hit=b;}if(dy){const b=blocked(e,e.x,e.y+dy);if(!b)e.y+=dy;else hit=hit||b;}return hit;}
function fall(e,dt){e.vz-=G*dt;e.z+=e.vz*dt;const g=groundZ(e);if(e.z<=g){const v=e.vz;e.z=g;e.vz=0;const was=e.ground;e.ground=true;return was?0:-v;}e.ground=false;return 0;}

/* 입자 */
function part(x,y,z,vx,vy,vz,life,col,size=1,grav=20,glow=0){if(parts.length<400)parts.push({x,y,z,vx,vy,vz,l:life,m:life,c:col,s:size,g:grav,glow});}
function burst(x,y,z,n,cols,sp=3,glow=0){for(let i=0;i<n;i++){const a=rnd(TAU),v=rnd(.3,1)*sp;part(x,y,z,Math.cos(a)*v,Math.sin(a)*v,rnd(4,10),rnd(.3,.7),cols[i%cols.length],rnd()<.4?2:1,22,glow);}}
function fx(spr,x,y,z,dur=.24){ents.push({k:'fx',spr,x,y,z,t:0,dur,fxo:1});}
function toast(s,t=2.6){toastS=s;toastT=t;}

/* ---------------- 대화 · 아이템 ---------------- */
function say(lines,cb){if(typeof lines==='string')lines=[lines];dlg={q:lines.map(l=>typeof l==='string'?{t:l}:l),i:0,n:0,cb,sel:0};state='dialog';for(const k in keys)keys[k]=0;}
const ITEM={
  gold:{n:'골드',s:'coin'},key:{n:'유적 열쇠',s:'key'},herb:{n:'생명초',s:'herb'},heart:{n:'생명의 결정',s:'cont'},sword2:{n:'물결의 검',s:'sword',f:1},sword3:{n:'태양의 검',s:'sword',f:2},
  emb1:{n:'숲의 문장',s:'emb1'},emb2:{n:'물결의 문장',s:'emb2'},sun:{n:'태양석',s:'sun'}
};
function give(item,n=1){
  const I=ITEM[item];let msg=I.n+'을(를) 손에 넣었다!';
  if(item==='gold'){SV.gold+=n;msg=n+' 골드를 손에 넣었다!';}
  else if(item==='key')SV.keys+=n;else if(item==='herb'){SV.herb+=n;msg='생명초를 손에 넣었다!\n쓰러졌을 때 자동으로 되살려 준다.';}
  else if(item==='heart'){SV.maxhp+=2;SV.hp=SV.maxhp;msg='생명의 결정을 손에 넣었다!\n최대 체력이 늘어났다.';}
  else if(item==='sword2'){SV.sword=2;msg='물결의 검을 손에 넣었다!\n공격력이 올랐다.';}
  else if(item==='sword3'){SV.sword=3;msg='태양의 검을 손에 넣었다!\n공격력이 크게 올랐다.';}
  else if(item==='emb1'){SV.emb|=1;setFlag('emb1');}else if(item==='emb2'){SV.emb|=2;setFlag('emb2');}
  else if(item==='sun'){setFlag('sun');}
  itemGet={I,t:0,msg,item};state='item';hero.vx=hero.vy=0;SND.jingle('item');persist();
}

/* ---------------- 주인공 ---------------- */
function hurtHero(d,fx0,fy0){
  if(hero.inv>0||state!=='play')return;SV.hp-=d;hero.inv=1.2;shake=5;hitstop=.06;SND.sfx('hurt');
  const dx=hero.x-fx0,dy=hero.y-fy0,l=Math.hypot(dx,dy)||1;hero.kx=dx/l*6;hero.ky=dy/l*6;if(hero.ground)hero.vz=7;hero.ground=false;
  burst(hero.x,hero.y,hero.z+2,8,['#ff4a5a','#fff'],3);
  if(SV.hp<=0){if(SV.herb>0){SV.herb--;SV.hp=Math.min(SV.maxhp,6);SND.sfx('herb');toast('생명초가 코코를 되살렸다!');burst(hero.x,hero.y,hero.z+2,24,['#7dff8a','#fff','#ffe14d'],4,1);hero.inv=2.5;}
    else{SV.hp=0;state='dead';dlgT=0;SND.stop();SND.jingle('over');}}
}
let dlgT=0;
function respawnSafe(d){SV.hp-=d;hero.x=hero.safe.x;hero.y=hero.safe.y;hero.z=Math.max(0,cellH(hero.x|0,hero.y|0))+.01;hero.vz=0;hero.kx=hero.ky=0;hero.inv=1.5;
  if(SV.hp<=0){if(SV.herb>0){SV.herb--;SV.hp=Math.min(SV.maxhp,6);SND.sfx('herb');toast('생명초가 코코를 되살렸다!');}else{SV.hp=0;state='dead';dlgT=0;SND.stop();SND.jingle('over');}}}
function interactTarget(){let best=null,bd=1.25;const f=DIRV[hero.dir];
  for(const e of ents){if(!e.act||e.hidden)continue;if(e.k==='chest'&&e.open)continue;const dx=e.x-hero.x,dy=e.y-hero.y,d=Math.hypot(dx,dy);if(d<bd&&Math.abs(e.z-hero.z)<3&&(dx*f[0]+dy*f[1])/d>.2){bd=d;best=e;}}
  if(!best)for(const e of ents){if(e.k==='gate'&&(e.p.k==='lock'||e.p.k==='emb')&&!e.open){const dx=e.x-hero.x,dy=e.y-hero.y,d=Math.hypot(dx,dy);if(d<1.3&&(dx*f[0]+dy*f[1])/d>.2)best=e;}}
  return best;}
function interact(e){
  if(e.k==='chest'){e.open=true;setFlag(e.id);SND.sfx('gate');burst(e.x,e.y,e.z+2,14,['#ffe14d','#fff'],3,1);setTimeout(()=>give(e.p.item,e.p.n||1),380);state='wait';setTimeout(()=>{if(state==='wait')state='play';},400);}
  else if(e.k==='gate'&&e.p.k==='emb'){if(SV.emb===3){e.open=1;setFlag(e.id);SND.sfx('gate');toast('두 문장이 빛나며 봉인이 풀렸다!');}else{SND.sfx('no');say([{w:'봉인의 문',t:'두 개의 문장을 가진 자만이 지나갈 수 있다.'}]);}}
  else if(e.k==='gate'){if(SV.keys>0){SV.keys--;e.open=1;setFlag(e.id);SND.sfx('key');SND.sfx('gate');toast('열쇠로 문을 열었다!');}else{SND.sfx('no');toast('잠겨 있다. 열쇠가 필요하다.');}}
  else if(e.k==='statue'){SV.hp=SV.maxhp;persist();SND.sfx('save');burst(e.x,e.y,e.z+5,26,['#ffe14d','#fff','#ffb020'],4,1);say([{w:'태양 석상',t:'따스한 빛이 몸을 감싼다…\n체력이 모두 회복되고, 여정이 기록되었다.'}]);}
  else if(e.p.say){const d=typeof e.p.say==='function'?e.p.say(API,e):e.p.say;if(d)say(d);}
}
function updHero(dt){
  const h=hero;h.inv-=dt;
  let ix=(keys.R?1:0)-(keys.L?1:0)+joy.x,iy=(keys.D?1:0)-(keys.U?1:0)+joy.y;const il=Math.hypot(ix,iy);
  let wx=0,wy=0;if(il>.2){wx=ix+iy;wy=iy-ix;const l=Math.hypot(wx,wy);wx/=l;wy/=l;if(il<1){wx*=il;wy*=il;}}
  const moving=il>.2&&h.atk<=0;
  if(moving){if(Math.abs(wx)>Math.abs(wy)+.15)h.dir=wx>0?0:2;else if(Math.abs(wy)>Math.abs(wx)+.15)h.dir=wy>0?1:3;else if(DIRV[h.dir][0]*wx+DIRV[h.dir][1]*wy<.3)h.dir=Math.abs(wx)>Math.abs(wy)?(wx>0?0:2):(wy>0?1:3);}
  const k=Math.min(1,dt*(h.ground?16:7));h.vx=lerp(h.vx,moving?wx*SPD:0,k);h.vy=lerp(h.vy,moving?wy*SPD:0,k);
  h.kx*=Math.max(0,1-dt*6);h.ky*=Math.max(0,1-dt*6);
  const px=h.x,py=h.y,hit=move(h,(h.vx+h.kx)*dt,(h.vy+h.ky)*dt);
  // 상자 밀기
  if(hit&&hit.k==='crate'&&h.ground&&moving&&!hit.slide){h.push+=dt;if(h.push>.3){h.push=0;const dx=hit.x-h.x,dy=hit.y-h.y,ax=Math.abs(dx)>Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)];
      const tx=Math.floor(hit.x)+ax[0],ty=Math.floor(hit.y)+ax[1],th=cellH(tx,ty);
      if(th<=hit.z+.01&&!ents.some(s=>s!==hit&&s.solid&&Math.abs(s.x-(tx+.5))<.9&&Math.abs(s.y-(ty+.5))<.9&&s.z+s.hh>hit.z)){hit.slide=[tx+.5,ty+.5];SND.sfx('push');}else SND.sfx('no',.4);}}
  else h.push=0;
  if(h.ground)h.coy=.1;else h.coy-=dt;
  if(pressed.A&&h.coy>0&&h.atk<=0){h.vz=JV;h.ground=false;h.coy=0;h.sq=-.25;SND.sfx('jump');for(let i=0;i<4;i++)part(h.x,h.y,h.z,rnd(-1,1),rnd(-1,1),rnd(1,3),.3,'#e8e0d0',1,6);}
  if(!keys.A&&h.vz>6)h.vz=6;
  const onBefore=h.on;const imp=fall(h,dt);
  if(imp>9){h.sq=.3;SND.sfx('land');for(let i=0;i<6;i++)part(h.x,h.y,h.z,rnd(-2,2),rnd(-2,2),rnd(1,3),.35,'#e8e0d0',1,6);}
  h.sq*=Math.max(0,1-dt*9);
  if(moving&&h.ground){h.anim+=dt*11;if(Math.random()<dt*5)part(h.x,h.y,h.z,rnd(-.4,.4),rnd(-.4,.4),rnd(1,2),.3,'#d8d0c0',1,5);}
  // 공격/조사
  if(h.atk>0)h.atk-=dt;
  if(pressed.B&&h.atk<=0){const t=interactTarget();if(t&&h.ground)interact(t);else{h.atk=.3;SND.sfx('swing');const f=DIRV[h.dir];fx(S.slash[h.dir],h.x+f[0]*.35,h.y+f[1]*.35,h.z+.2,.2);
      const cx=h.x+f[0]*.75,cy=h.y+f[1]*.75;
      for(const e of ents){if(e.gone)continue;const d=Math.hypot(e.x-cx,e.y-cy);if(d>.85+(e.r||.3)||Math.abs(e.z-h.z)>3.2)continue;
        if(e.enemy)hitEnemy(e,SV.sword,f);else if(e.brk){e.gone=true;SND.sfx('pot');burst(e.x,e.y,e.z+1,10,e.k==='pot'?['#c8823a','#8a5a20']:['#5fd04a','#2f8a2a'],3);dropLoot(e.x,e.y,e.z,.5,1);}}}}
  // 위험 지형
  const cx=Math.floor(h.x),cy=Math.floor(h.y),t=tileAt(cx,cy),ch=cellH(cx,cy);
  if(h.ground&&!h.on&&h.z<=ch+.05){
    if(t==='w'||t==='l'){SND.sfx(t==='w'?'splash':'fire');fx(S.splash,h.x,h.y,h.z);if(t==='l')burst(h.x,h.y,h.z,14,['#ffb020','#ff5a1a'],3,1);toast(t==='w'?'물에 빠졌다!':'앗 뜨거워!');respawnSafe(t==='w'?1:2);}
    else if((t==='x'||t==='X')&&h.inv<=0)hurtHero(1,h.x-DIRV[h.dir][0],h.y-DIRV[h.dir][1]);
    else if(t!=='x'&&t!=='X'&&t!=='e'&&terrainZ(h.x,h.y,.2)===ch&&cellH(Math.floor(h.x-.3),cy)>-90&&cellH(Math.floor(h.x+.3),cy)>-90&&cellH(cx,Math.floor(h.y-.3))>-90&&cellH(cx,Math.floor(h.y+.3))>-90){h.safe.x=h.x;h.safe.y=h.y;}
  }
  if(h.z<-8){SND.sfx('fall');toast('떨어졌다!');respawnSafe(1);}
  // 출구
  if(h.ground&&Math.hypot(h.kx,h.ky)<1)for(const e of ents){if(e.k==='exit'&&Math.floor(e.x)===cx&&Math.floor(e.y)===cy&&Math.abs(h.z-e.z)<1.5){goRoom(e.p.to,e.p.x,e.p.y);break;}}
}
function goRoom(id,x,y){if(state!=='play')return;state='fade';fadeTo=0;fadeCb=()=>{loadRoom(id,x,y);fadeTo=1;state='play';};}

/* ---------------- 적 ---------------- */
function dropLoot(x,y,z,chance,gold){if(Math.random()<.14&&SV.hp<SV.maxhp){const e=spawn('heartp',Math.floor(x),Math.floor(y),{});e.x=x;e.y=y;e.z=z+1;e.vz=9;}
  else if(Math.random()<chance)for(let i=0;i<Math.min(4,Math.ceil(gold/3));i++){const e=spawn('coin',Math.floor(x),Math.floor(y),{v:Math.ceil(gold/Math.min(4,Math.ceil(gold/3)))});e.x=x+rnd(-.2,.2);e.y=y+rnd(-.2,.2);e.z=z+1;e.vz=rnd(8,12);e.vx=rnd(-1.5,1.5);e.vy=rnd(-1.5,1.5);}}
function hitEnemy(e,d,f){
  if(e.flash>0||e.gone)return;if(e.boss&&e.mode==='stun')d*=2;e.hp-=d;e.flash=.22;hitstop=.05;shake=Math.max(shake,2);SND.sfx('hit');fx(S.spark,e.x,e.y,e.z+1.5,.18);
  if(!e.boss){e.kx=f[0]*7;e.ky=f[1]*7;}
  if(e.hp<=0){e.gone=true;SND.sfx(e.boss?'boom':'die');burst(e.x,e.y,e.z+1,e.boss?60:14,e.boss?['#ffe14d','#fff','#ff9d3b','#ff5a1a']:['#fff','#d8d8f0','#a8a8d0'],e.boss?7:3,e.boss?1:0);fx(S.puff,e.x,e.y,e.z+.5,.3);
    if(e.boss){shake=14;setFlag(R.id+':boss');SND.stop();SND.jingle('clear',()=>SND.play(R.d.mus2||'dungeon'));for(const o of ents)if(o.enemy&&!o.boss)o.gone=true;for(const o of ents)if(o.k==='proj')o.gone=true;}
    else dropLoot(e.x,e.y,e.z,.75,e.E.gold);if(e.id)setFlag(e.id);}
}
function shoot(x,y,z,dx,dy,spd,spr,dmg=1,life=4){ents.push({k:'proj',x,y,z,vx:dx*spd,vy:dy*spd,spr,dmg,l:life,r:.2,hgt:1,t:0});}
function shock(x,y,z){ents.push({k:'shock',x,y,z,t:0,rad:0});SND.sfx('quake');shake=8;}
function updEnemy(e,dt){
  if(e.flash>0)e.flash-=dt;e.t+=dt;const dx=hero.x-e.x,dy=hero.y-e.y,d=Math.hypot(dx,dy)||1,E=e.E;
  if(e.boss)return updBoss(e,dt,dx,dy,d);
  e.kx*=Math.max(0,1-dt*6);e.ky*=Math.max(0,1-dt*6);
  if(E.ai==='hop'){e.st-=dt;
    if(e.ground){e.vx=e.vy=0;if(e.st<=0&&d<7){e.st=rnd(.9,1.6);e.vz=11;e.ground=false;e.vx=dx/d*2.4;e.vy=dy/d*2.4;}}
    move(e,(e.vx+e.kx)*dt,(e.vy+e.ky)*dt);fall(e,dt);}
  else if(E.ai==='walk'){if(d<8&&d>.5){e.vx=dx/d*E.spd;e.vy=dy/d*E.spd;e.face=dx-dy>0?1:-1;}else e.vx=e.vy=0;
    const nx=e.x+(e.vx+e.kx)*dt,ny=e.y+(e.vy+e.ky)*dt; // 낭떠러지로는 걸어가지 않는다
    if(terrainZ(nx,e.y,.1)>=e.z-1.1)move(e,(e.vx+e.kx)*dt,0);if(terrainZ(e.x,ny,.1)>=e.z-1.1)move(e,0,(e.vy+e.ky)*dt);fall(e,dt);}
  else{ // 날기
    const tz=(d<6?hero.z+1.4:vh(Math.floor(e.x),Math.floor(e.y))+e.fz)+Math.sin(e.t*3)*.5;e.z+=(tz-e.z)*Math.min(1,dt*2.2);
    const a=Math.atan2(dy,dx)+Math.sin(e.t*1.7)*.9,sp=d<7?2.1:0;e.x=clamp(e.x+(Math.cos(a)*sp+e.kx)*dt,.5,R.w-.5);e.y=clamp(e.y+(Math.sin(a)*sp+e.ky)*dt,.5,R.h-.5);e.face=dx-dy>0?1:-1;}
  if(e.z<-8)e.gone=true;
  if(d<e.r+hero.r+.05&&Math.abs(e.z-hero.z)<2.2)hurtHero(E.dmg,e.x,e.y);
}
function updBoss(e,dt,dx,dy,d){
  const rage=e.hp<e.mhp*.5,b=e.boss;e.st-=dt;e.face=dx-dy>0?1:-1;
  if(b==='stump'){ // 뛰어올라 내려찍으면 충격파 — 점프로 피한다
    if(e.mode==='idle'&&e.ground&&e.st<=0){e.mode='jump';e.vz=17;e.ground=false;const l=Math.min(d,3.2);e.vx=dx/d*l/.75;e.vy=dy/d*l/.75;e.n++;SND.sfx('roar',.3);}
    if(e.mode==='jump'){move(e,e.vx*dt,e.vy*dt);const imp=fall(e,dt);if(e.ground){e.mode='idle';e.st=rage?.9:1.5;e.vx=e.vy=0;shock(e.x,e.y,e.z);
        if(e.n%3===0)for(let i=0;i<(rage?3:2);i++){const s=spawn(rage?'slimeB':'slimeG',clamp(Math.floor(e.x+rnd(-2,2)),2,R.w-3),clamp(Math.floor(e.y+rnd(-2,2)),2,R.h-3),{});s.z+=4;s.ground=false;}}}
    else fall(e,dt);
  }else if(b==='crab'){ // 옆걸음 → 거품 → 집게 내려찍기 후 잠깐 기절(약점)
    if(e.mode==='idle'&&e.st<=0){e.n++;if(e.n%3===0){e.mode='slam';e.st=.8;SND.sfx('roar',.3);}else if(e.n%3===1){e.mode='walk';e.st=1.3;const ax=Math.abs(dx)>Math.abs(dy);e.vx=ax?0:Math.sign(dx||1)*(rage?4.4:3.2);e.vy=ax?Math.sign(dy||1)*(rage?4.4:3.2):0;}
      else{e.mode='idle';e.st=1.1;const n=rage?7:5;for(let i=0;i<n;i++){const a=Math.atan2(dy,dx)+(i-(n-1)/2)*.32;shoot(e.x,e.y,e.z+1,Math.cos(a),Math.sin(a),3.2,S.bubble,1,5);}SND.sfx('splash',.2);}}
    else if(e.mode==='walk'){move(e,e.vx*dt,e.vy*dt);if(e.st<=0){e.mode='idle';e.st=.5;}}
    else if(e.mode==='slam'&&e.st<=0){shock(e.x,e.y,e.z);e.mode='stun';e.st=rage?1.4:2;}
    else if(e.mode==='stun'&&e.st<=0){e.mode='idle';e.st=.4;}
    fall(e,dt);
  }else{ // 태양의 거상
    if(e.mode==='idle'&&e.st<=0){e.n++;const m=e.n%4;
      if(m===1){e.mode='jump';e.vz=19;e.ground=false;const l=Math.min(d,4);e.vx=dx/d*l/.82;e.vy=dy/d*l/.82;SND.sfx('roar',.3);}
      else if(m===2){const n=rage?12:8,o=rnd(TAU);for(let i=0;i<n;i++){const a=o+i/n*TAU;shoot(e.x,e.y,e.z+1,Math.cos(a),Math.sin(a),3.4,S.fire,2,5);}SND.sfx('fire');e.st=1.2;}
      else if(m===3){for(let i=-1;i<=1;i++){const a=Math.atan2(dy,dx)+i*.25;shoot(e.x,e.y,e.z+1,Math.cos(a),Math.sin(a),5,S.fire,2,4);}SND.sfx('fire');e.st=rage?.7:1.1;}
      else{if(rage&&ents.filter(o=>o.k==='wisp').length<3){const s=spawn('wisp',Math.floor(e.x),Math.floor(e.y),{});s.z+=2;}e.mode='stun';e.st=1.6;}}
    else if(e.mode==='jump'){move(e,e.vx*dt,e.vy*dt);fall(e,dt);if(e.ground){e.mode='idle';e.st=rage?.6:1;e.vx=e.vy=0;shock(e.x,e.y,e.z);}}
    else if(e.mode==='stun'&&e.st<=0){e.mode='idle';e.st=.3;}
    if(e.mode!=='jump')fall(e,dt);
  }
  if(d<e.r+hero.r&&Math.abs(e.z-hero.z)<4)hurtHero(2,e.x,e.y);
}

/* ---------------- 갱신 ---------------- */
function update(dt){
  gt+=dt;if(toastT>0)toastT-=dt;if(banner>0)banner-=dt;if(shake>0)shake=Math.max(0,shake-dt*30);
  fade+=clamp(fadeTo-fade,-dt*3.2,dt*3.2);if(fade===fadeTo&&fadeCb){const c=fadeCb;fadeCb=null;c();}
  if(pressed.S){SND.mute();toast(SND.muted?'소리 끔':'소리 켬',1);}
  if(state==='title'){updTitle(dt);return;}
  if(state==='dialog'){updDialog(dt);ambient(dt);return;}
  if(state==='item'){itemGet.t+=dt;if(itemGet.t>1.3&&(pressed.B||pressed.A)){const it=itemGet;itemGet=null;state='play';if(it.item==='sun')ending();}ambient(dt);return;}
  if(state==='dead'){dlgT+=dt;if(dlgT>1.6&&(pressed.B||pressed.A)){SV.hp=SV.maxhp;fade=0;loadRoom(SV.room,SV.x,SV.y);state='play';}return;}
  if(state==='end'){dlgT+=dt;ambient(dt);if(dlgT>6&&(pressed.B||pressed.A)){state='title';titleInit();}return;}
  if(state==='pause'){if(pressed.M||pressed.B||pressed.A){state='play';SND.sfx('sel');}return;}
  if(state!=='play'){updParts(dt);return;}
  if(pressed.M){state='pause';SND.sfx('sel');return;}
  SV.time+=dt;
  if(hitstop>0){hitstop-=dt;return;}
  if(hintT>0){hintT-=dt;if(hintT<=0&&state==='play'){setFlag('hint:'+R.id);say([{w:'루미',t:R.hint}]);return;}}
  updHero(dt);if(state!=='play'&&state!=='fade')return;
  let enemies=0;
  for(const e of ents){
    if(e.gone||e===hero)continue;
    if(e.enemy){enemies++;updEnemy(e,dt);}
    else if(e.k==='crate'){if(e.slide){const dx=e.slide[0]-e.x,dy=e.slide[1]-e.y,d=Math.hypot(dx,dy),st=4.5*dt;if(d<=st){e.x=e.slide[0];e.y=e.slide[1];e.slide=null;}else{e.x+=dx/d*st;e.y+=dy/d*st;}}
      else{const cx=Math.floor(e.x),cy=Math.floor(e.y);let g=cellH(cx,cy);if(tileAt(cx,cy)==='w'||tileAt(cx,cy)==='l')g-=1;
        for(const s of ents)if(s!==e&&s.solid&&s.k==='crate'&&Math.abs(s.x-e.x)<.9&&Math.abs(s.y-e.y)<.9&&s.z+s.hh<=e.z+.1)g=Math.max(g,s.z+s.hh);
        if(e.z>g){e.vz-=G*dt;e.z+=e.vz*dt;if(e.z<=g){e.z=g;e.vz=0;SND.sfx(tileAt(cx,cy)==='w'?'splash':'land');if(tileAt(cx,cy)==='w')fx(S.splash,e.x,e.y,e.z+1);}}
        if(e.z<-8){e.gone=true;}}}
    else if(e.k==='gate'){const k=e.p.k;if(k==='lock'||k==='emb'){}else if(k==='sw'||!k)e.open=R.sw[e.p.tg]?1:(flag(e.id)?1:0);else if(k==='clear'){if(R.clear&&!e.open){e.open=1;SND.sfx('gate');}}
      const tgt=e.open?4:0;if(e.sink!==tgt){const was=e.sink;e.sink=clamp(e.sink+(tgt>e.sink?1:-1)*dt*7,0,4);if(was===0||(was===4&&!e.open))SND.sfx('gate',.2);}
      const blockedUp=!e.open&&e.sink>0&&Math.abs(hero.x-e.x)<.8&&Math.abs(hero.y-e.y)<.8;e.solid=e.sink<3.2||(!e.open&&!blockedUp)?1:0;if(e.sink>=3.2&&e.open)e.solid=0;e.hh=4-e.sink;}
    else if(e.k==='sw'){let on=false;const chk=o=>Math.abs(o.x-e.x)<.5&&Math.abs(o.y-e.y)<.5&&Math.abs(o.z-e.z)<.6;
      if(hero.ground&&chk(hero))on=true;for(const o of ents)if(o.k==='crate'&&!o.gone&&chk(o))on=true;
      if(e.p.once){if(on&&!e.on){e.on=true;setFlag(e.id);SND.sfx('sw');if(e.p.msg)toast(e.p.msg);}on=e.on;}else{if(on!==!!e.on)SND.sfx('sw');e.on=on;}
      if(e.p.timer){if(on)e.tm=e.p.timer;else if(e.tm>0){e.tm-=dt;on=true;}}
      R.sw[e.p.tg]=R.sw[e.p.tg+'_']?true:on;if(on)R.sw[e.p.tg+'_n']=gt;}
    else if(e.k==='plat'){const p=e.p,T=p.T||4,ph=((gt+e.ph)%T)/T,q=ph<.5?ph*2:2-ph*2,s=clamp((q-.15)/.7,0,1),m=s*s*(3-2*s);
      const nx=e.x0+(p.dx||0)*m,ny=e.y0+(p.dy||0)*m,nz=e.z0+(p.dz||0)*m,ddx=nx-e.x,ddy=ny-e.y,ddz=nz-e.z;
      if(p.sw&&!R.sw[p.sw]){continue;}
      if(hero.on===e){hero.x+=ddx;hero.y+=ddy;hero.z+=ddz;}e.x=nx;e.y=ny;e.z=nz;}
    else if(e.k==='turret'){e.st-=dt;if(e.st<=0){e.st=e.p.T||2.4;const f=DIRV[e.p.dir||0];shoot(e.x+f[0]*.6,e.y+f[1]*.6,e.z+1.2,f[0],f[1],4.2,S.fire,2,6);SND.sfx('fire',.1);}}
    else if(e.k==='proj'){e.t+=dt;e.l-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;const ch=cellH(Math.floor(e.x),Math.floor(e.y));
      if(e.l<=0||ch>e.z+.3||ents.some(s=>s.solid&&s.k!=='turret'&&Math.abs(s.x-e.x)<s.hw+.1&&Math.abs(s.y-e.y)<s.hd+.1&&e.z<s.z+s.hh&&e.z>s.z-1)){e.gone=true;fx(S.puff,e.x,e.y,e.z,.2);}
      else if(Math.hypot(hero.x-e.x,hero.y-e.y)<.45&&hero.z<e.z+1&&hero.z+hero.hgt>e.z-.5){hurtHero(e.dmg,e.x-e.vx,e.y-e.vy);e.gone=true;}
      if(Math.random()<dt*20)part(e.x,e.y,e.z+.4,0,0,1,.3,e.spr===S.fire?'#ffb020':'#9ad8ff',1,0,1);}
    else if(e.k==='shock'){e.t+=dt;e.rad=e.t*5.5;if(e.t>.75)e.gone=true;else if(hero.ground&&Math.abs(hero.z-e.z)<1.2&&Math.abs(Math.hypot(hero.x-e.x,hero.y-e.y)-e.rad)<.4)hurtHero(1,e.x,e.y);}
    else if(e.pick){e.t+=dt;if(e.vz||e.z>cellH(Math.floor(e.x),Math.floor(e.y))){e.vz-=G*dt;e.z+=e.vz*dt;if(e.vx){e.x=clamp(e.x+e.vx*dt,.3,R.w-.3);e.y=clamp(e.y+e.vy*dt,.3,R.h-.3);}
        const g=Math.max(0,vh(Math.floor(e.x),Math.floor(e.y)));if(e.z<=g){e.z=g;e.vz=Math.abs(e.vz)>4?-e.vz*.4:0;e.vx=e.vy=0;}}
      if(e.t>.35&&Math.hypot(hero.x-e.x,hero.y-e.y)<.6&&Math.abs(hero.z-e.z)<2.5){e.gone=true;if(e.id)setFlag(e.id);
        if(e.k==='coin'){SV.gold+=e.p.v||1;SND.sfx('coin');}else{SV.hp=Math.min(SV.maxhp,SV.hp+2);SND.sfx('heart');}burst(e.x,e.y,e.z+1,5,['#ffe14d','#fff'],2,1);}
      if(e.t>14&&!e.id)e.gone=true;}
    else if(e.k==='fx'){e.t+=dt;if(e.t>=e.dur)e.gone=true;}
    else if(e.k==='chest'&&e.hidden&&R.clear){e.hidden=0;e.solid=1;burst(e.x,e.y,e.z+1,20,['#ffe14d','#fff'],4,1);SND.sfx('key');}
  }
  if(!R.clear&&enemies===0){R.clear=true;setFlag(R.id+':clear');}
  ents=ents.filter(e=>!e.gone);
  updParts(dt);ambient(dt);
  const c=iso(hero.x,hero.y,hero.z*.6+1.5);cam.x+=(c[0]-cam.x)*Math.min(1,dt*6);cam.y+=(c[1]-cam.y)*Math.min(1,dt*6);clampCam();
}
function updParts(dt){for(const p of parts){p.l-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=p.g*dt;}parts=parts.filter(p=>p.l>0);}
let amb=[];
function ambient(dt){ // 분위기 입자: 야외는 나비·꽃가루, 실내는 먼지·불씨
  const n=R.th.out?16:22;while(amb.length<n)amb.push({x:rnd(R.w),y:rnd(R.h),z:rnd(2,9),p:rnd(TAU),s:rnd(.4,1),k:Math.random()});
  for(const a of amb){a.p+=dt;if(R.th.out){a.x+=Math.sin(a.p*1.3+a.k*9)*dt*.9+dt*.25;a.y+=Math.cos(a.p*.9)*dt*.7;a.z+=Math.sin(a.p*2.2)*dt*1.2;}
    else{a.z+=(R.d.th==='temple'?1.6:-.35)*dt*a.s;a.x+=Math.sin(a.p)*dt*.3;}
    if(a.x>R.w+1)a.x=-1;if(a.z<0)a.z=10;if(a.z>12)a.z=0;}
}

/* ---------------- 렌더링 ---------------- */
function radial(r,g,b){const c=mkc(128,128),x=c.getContext('2d'),q=x.createRadialGradient(64,64,0,64,64,64);q.addColorStop(0,`rgba(${r},${g},${b},1)`);q.addColorStop(.35,`rgba(${r},${g},${b},.6)`);q.addColorStop(.7,`rgba(${r},${g},${b},.18)`);q.addColorStop(1,`rgba(${r},${g},${b},0)`);x.fillStyle=q;x.fillRect(0,0,128,128);return c;}
const LT={warm:radial(255,196,120),gold:radial(255,226,150),blue:radial(130,200,255),red:radial(255,120,60),white:radial(255,255,255),green:radial(150,255,170),violet:radial(190,140,255)};
const CLOUD=(()=>{const c=mkc(256,256),x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,256,256);const r=GFX.hsh;
  for(let i=0;i<9;i++){const px=r(i,1)*256,py=r(i,2)*256,rad=40+r(i,3)*50;for(const ox of[-256,0,256])for(const oy of[-256,0,256]){const q=x.createRadialGradient(px+ox,py+oy,0,px+ox,py+oy,rad);q.addColorStop(0,'rgba(120,150,190,.5)');q.addColorStop(1,'rgba(120,150,190,0)');x.fillStyle=q;x.fillRect(px+ox-rad,py+oy-rad,rad*2,rad*2);}}return c;})();
const SEA=(()=>{const c=mkc(128,64),x=c.getContext('2d');for(let i=0;i<40;i++){const px=GFX.hsh(i,5)*128|0,py=GFX.hsh(i,6)*64|0,w=3+GFX.hsh(i,7)*9|0;x.fillStyle=i%3?'rgba(120,200,255,.5)':'rgba(230,250,255,.8)';x.fillRect(px,py,w,1);x.fillRect(px-128,py,w,1);}return c;})();
function light(x,y,z,r,type,a=1){const p=iso(x,y,z),X=p[0]-cam.x+W/2,Y=p[1]-cam.y+H/2;if(X<-r||X>W+r||Y<-r||Y>H+r)return;lmx.globalAlpha=a;lmx.drawImage(LT[type],X-r,Y-r,r*2,r*2);}
function glow(x,y,z,r,type,a=1){const p=iso(x,y,z),X=p[0]-cam.x+W/2,Y=p[1]-cam.y+H/2;if(X<-r||X>W+r||Y<-r||Y>H+r)return;gmx.globalAlpha=a;gmx.drawImage(LT[type],X-r,Y-r,r*2,r*2);}
function drawSpr(s,x,y,z,flip,sx=1,sy=1){const p=iso(x,y,z);let X=Math.round(p[0]-cam.x+W/2+shx),Y=Math.round(p[1]-cam.y+H/2+shy);
  if(sx===1&&sy===1&&!flip){lx.drawImage(s.c,X-s.ax,Y-s.ay);return;}
  lx.save();lx.translate(X,Y);lx.scale(flip?-sx:sx,sy);lx.drawImage(s.c,-s.ax,-s.ay);lx.restore();}
function drawBox(s,e,w,d){const p=iso(e.x,e.y,e.z+e.hh);lx.drawImage(s.c,Math.round(p[0]-cam.x+W/2+shx-s.w/2),Math.round(p[1]-cam.y+H/2+shy-(w+d)*4-(s.w>(w+d)*16?1:0)));}
function shadowAt(e,size){const g=e.gz===undefined?e.z:e.gz;if(g<-50)return;const p=iso(e.x,e.y,g),s=S.sh[size];lx.globalAlpha=clamp(.55-(e.z-g)*.035,.2,.55);lx.drawImage(s.c,Math.round(p[0]-cam.x+W/2+shx-s.ax),Math.round(p[1]-cam.y+H/2+shy-s.ay));lx.globalAlpha=1;}
let shx=0,shy=0;
function drawEnt(e){
  const k=e.k,fr=(gt*6|0);
  if(k==='hero'){if(state==='dead'&&dlgT>.5)return;e.gz=groundZ(e);shadowAt(e,1);if(e.inv>0&&(gt*18|0)%2&&state==='play')return;
    const set=S.hero[state==='item'?0:e.dir];let s;if(state==='item')s=S.hero[0].item[0];else if(e.atk>0)s=set.atk[e.atk>.2?0:1];else if(!e.ground)s=set.jump[0];else if(Math.hypot(e.vx,e.vy)>.6)s=set.walk[(e.anim|0)%6];else s=set.idle[(gt*2|0)%2];
    drawSpr(s,e.x,e.y,e.z,false,1+e.sq*.6,1-e.sq);
    if(!R.th.out)light(e.x,e.y,e.z+2,78,'gold',.9);return;}
  if(k==='fx'){const s=e.spr[Math.min(e.spr.length-1,(e.t/e.dur*e.spr.length)|0)];drawSpr(s,e.x,e.y,e.z);if(e.spr===S.spark||e.spr===S.slash[0]||e.spr===S.slash[1]||e.spr===S.slash[2]||e.spr===S.slash[3])glow(e.x,e.y,e.z+1.5,26,'white',.5);return;}
  if(e.enemy){e.gz=e.E&&e.E.ai==='fly'?vh(Math.floor(e.x),Math.floor(e.y)):groundZ(e);const set=S[e.boss?e.B.spr:e.E.spr];shadowAt(e,e.boss?3:1);
    let f=0;if(e.boss)f=(e.mode==='jump'||e.mode==='slam')?1:(gt*2|0)%2;else if(e.E.ai==='hop')f=e.ground?(e.st<.25?1:0):2;else f=fr%2;
    const s=(e.flash>0&&(gt*30|0)%2?set.W:set)[f];drawSpr(s,e.x,e.y,e.z,e.face<0,1,e.boss&&e.mode==='stun'?.92:1);
    if(e.E&&e.E.light){light(e.x,e.y,e.z+1,50,'red',.8);glow(e.x,e.y,e.z+1,30,'red',.6);}
    if(e.boss&&e.mode==='stun'&&(gt*8|0)%2)drawSpr(S.spark[1],e.x,e.y,e.z+e.hgt+2);return;}
  if(k==='crate'){drawBox(S.crate[0],e,1,1);return;}
  if(k==='gate'){if(e.sink>=3.95)return;const s=(e.p.k==='lock'||e.p.k==='emb'?S.lock:e.p.k==='clear'?S.gateC:S.gate)[0],p=iso(e.x,e.y,e.z+4-e.sink),X=Math.round(p[0]-cam.x+W/2+shx-16),Y=Math.round(p[1]-cam.y+H/2+shy-9),hgt=Math.round(18+(4-e.sink)*8);
    lx.drawImage(s.c,0,0,s.w,hgt,X-1,Y,s.w,hgt);return;}
  if(k==='chest'){if(e.hidden)return;drawSpr(S.chest[e.open?1:0],e.x,e.y,e.z+1.5);if(!e.open){glow(e.x,e.y,e.z+1.5,22,'gold',.25+Math.sin(gt*3)*.1);}return;}
  if(k==='npc'){e.gz=e.z;shadowAt(e,1);drawSpr(S[e.p.s][(gt*1.6+e.t|0)%2],e.x,e.y,e.z,e.p.flip);return;}
  if(k==='plat'){drawBox(GFX.plat(S,e.w,e.d),e,e.w,e.d);return;}
  if(k==='sw'){drawSpr(S.switch[e.on?1:0],e.x,e.y,e.z);return;}
  if(k==='hut'){drawSpr(S.hut[0],e.x,e.y,e.z+5);return;}
  if(k==='torch'){drawSpr(S.torch[(gt*9|0)%2],e.x,e.y,e.z);const fl=.85+Math.sin(gt*17+e.t)*.08+Math.sin(gt*7.3)*.06;light(e.x,e.y,e.z+4,95*fl,'warm',1);glow(e.x,e.y,e.z+4.2,30*fl,'warm',.75);
    if(Math.random()<.08)part(e.x,e.y,e.z+4.5,rnd(-.3,.3),rnd(-.3,.3),rnd(2,4),.6,'#ffb020',1,-3,1);return;}
  if(k==='statue'){drawSpr(S.statue[(gt*3|0)%2],e.x,e.y,e.z);light(e.x,e.y,e.z+4,70,'gold',.9);glow(e.x,e.y,e.z+4,34,'gold',.5+Math.sin(gt*2)*.15);return;}
  if(k==='turret'){drawSpr(S.turret[0],e.x,e.y,e.z,(e.p.dir||0)===1||(e.p.dir||0)===2);if(e.st<.4)glow(e.x,e.y,e.z+2,24,'red',.8);return;}
  if(k==='proj'){e.gz=vh(Math.floor(e.x),Math.floor(e.y));shadowAt(e,0);const s=e.spr[(gt*12|0)%e.spr.length];drawSpr(s,e.x,e.y,e.z);const t=e.spr===S.fire?'red':'blue';light(e.x,e.y,e.z,46,t,.8);glow(e.x,e.y,e.z+.5,20,t,.7);return;}
  if(k==='shock'){const n=28;for(let i=0;i<n;i++){const a=i/n*TAU,p=iso(e.x+Math.cos(a)*e.rad,e.y+Math.sin(a)*e.rad,e.z+.3);lx.fillStyle=i%2?'#fff':'#ffe9a0';lx.fillRect(Math.round(p[0]-cam.x+W/2),Math.round(p[1]-cam.y+H/2)-2,2,3);}glow(e.x,e.y,e.z,e.rad*36,'gold',.25*(1-e.t/.75));return;}
  if(k==='coin'){e.gz=vh(Math.floor(e.x),Math.floor(e.y));shadowAt(e,0);drawSpr(S.coin[(gt*10+e.t*3|0)%4],e.x,e.y,e.z+.4+Math.abs(Math.sin(gt*4+e.t))*.5);glow(e.x,e.y,e.z+1,12,'gold',.4);return;}
  if(k==='heartp'){e.gz=vh(Math.floor(e.x),Math.floor(e.y));shadowAt(e,0);drawSpr(S.heart[0],e.x,e.y,e.z+.6+Math.sin(gt*4)*.3);glow(e.x,e.y,e.z+1,14,'red',.4);return;}
  if(k==='exit')return;
  const set=S[k];if(!set)return;
  if(e.sway){const s=set[0],p=iso(e.x,e.y,e.z),X=Math.round(p[0]-cam.x+W/2+shx-s.ax),Y=Math.round(p[1]-cam.y+H/2+shy-s.ay),B=6,bh=Math.ceil((s.h-14)/B);shadowAt(e,2);
    for(let i=0;i<B;i++){const q=1-i/B,o=Math.round(Math.sin(gt*1.4+e.t+i*.4)*2.2*q*q);lx.drawImage(s.c,0,i*bh,s.w,bh,X+o,Y+i*bh,s.w,bh);}lx.drawImage(s.c,0,B*bh,s.w,s.h-B*bh,X,Y+B*bh,s.w,s.h-B*bh);return;}
  drawSpr(set[0],e.x,e.y,e.z);
}
function render(){
  shx=shake?Math.round(rnd(-shake,shake)*.5):0;shy=shake?Math.round(rnd(-shake,shake)*.5):0;
  const out=R.th.out,ox=Math.round(W/2-cam.x+shx),oy=Math.round(H/2-cam.y+shy);
  // 배경
  if(out){const q=lx.createLinearGradient(0,0,0,H);q.addColorStop(0,'#2a86d8');q.addColorStop(1,'#124a9c');lx.fillStyle=q;lx.fillRect(0,0,W,H);
    for(let l=0;l<2;l++){const sx=((-cam.x*(.5+l*.3)+gt*(6+l*5))%128+128)%128,sy=((-cam.y*(.5+l*.3)+Math.sin(gt*.6+l)*3)%64+64)%64;lx.globalAlpha=l?.8:.45;for(let x=-sx;x<W;x+=128)for(let y=-sy;y<H;y+=64)lx.drawImage(SEA,x|0,y|0);}lx.globalAlpha=1;}
  else{lx.fillStyle=R.d.th==='temple'?'#140806':R.d.th==='cave'?'#04081a':'#07060f';lx.fillRect(0,0,W,H);}
  // 조명 지도 · 발광 지도 초기화
  lmx.globalCompositeOperation='source-over';lmx.globalAlpha=1;const A=R.th.amb;lmx.fillStyle=`rgb(${A[0]},${A[1]},${A[2]})`;lmx.fillRect(0,0,W,H);
  if(out){lmx.globalCompositeOperation='multiply';const cxo=((-cam.x*.9+gt*9)%256+256)%256,cyo=((-cam.y*.9+gt*3)%256+256)%256;for(let x=-cxo;x<W;x+=256)for(let y=-cyo;y<H;y+=256)lmx.drawImage(CLOUD,x,y);}
  lmx.globalCompositeOperation='lighter';
  gmx.globalCompositeOperation='source-over';gmx.globalAlpha=1;gmx.fillStyle='#000';gmx.fillRect(0,0,W,H);gmx.globalCompositeOperation='lighter';
  // 깊이 순서: 대각선 줄마다 지형 → 그 줄의 개체
  const ND=R.w+R.h-1,bk=[];for(let i=0;i<ND;i++)bk.push(null);
  for(const e of ents){if(e.gone)continue;const hw=e.solid?Math.min(e.hw,.49):Math.min(e.r||.3,.45);let key=clamp(Math.floor(e.x+hw-.01)+Math.floor(e.y+(e.solid?Math.min(e.hd,.49):hw)-.01),0,ND-1);
    if(e.k==='hut'||e.k==='plat')key=clamp(Math.floor(e.x+e.hw-.01)+Math.floor(e.y+e.hd-.01),0,ND-1);
    e._s=e.x+e.y+(e.k==='fx'?.3:0);if(e.on){const o=e.on,ok=clamp(Math.floor(o.x+o.hw-.01)+Math.floor(o.y+o.hd-.01),0,ND-1);if(ok>=key){key=ok;e._s+=20;}}
    if(e.k==='sw'||e.k==='shock')e._s-=5;(bk[key]||(bk[key]=[])).push(e);}
  const fw=(gt*3|0)%3,fe=(gt*4|0)%2;
  for(let d=0;d<ND;d++){
    const xa=Math.max(0,d-R.h+1),xb=Math.min(R.w-1,d);
    for(let x=xa;x<=xb;x++){const y=d-x,h=R.hm[y*R.w+x];if(h===VOID)continue;const X=(x-y)*16+ox-16,Y=d*8-h*8+oy-8;if(X<-34||X>W+2||Y>H+2)continue;
      const t=R.tm[y*R.w+x],an=GFX.TILE[t]&&GFX.TILE[t][2],img=cellImg(x,y,an===3?fw:an===2?fe:0);if(Y+img.height<0)continue;lx.drawImage(img,X,Y);
      if(t==='l'){light(x+.5,y+.5,h,56,'red',.22);glow(x+.5,y+.5,h,30,'red',.1);}else if(t==='e')glow(x+.5,y+.5,h,26,'gold',.35+Math.sin(gt*4)*.12);else if(t==='w'&&!out)glow(x+.5,y+.5,h,30,'blue',.12);}
    const b=bk[d];if(b){b.sort((p,q)=>p._s-q._s||p.z-q.z);for(const e of b)drawEnt(e);}
  }
  // 입자
  for(const p of parts){const q=iso(p.x,p.y,p.z),X=Math.round(q[0]+ox),Y=Math.round(q[1]+oy);lx.globalAlpha=Math.min(1,p.l/p.m*2);lx.fillStyle=p.c;lx.fillRect(X,Y,p.s,p.s);if(p.glow){gmx.globalAlpha=.5*Math.min(1,p.l/p.m*2);gmx.drawImage(LT.gold,X-5,Y-5,10,10);}}
  lx.globalAlpha=1;
  for(const a of amb){const q=iso(a.x,a.y,a.z),X=Math.round(q[0]+ox),Y=Math.round(q[1]+oy);if(X<0||X>W||Y<0||Y>H)continue;
    if(out){if(a.k<.3){lx.fillStyle=a.k<.15?'#fff':'#ffe14d';const f=(gt*8+a.p|0)%2;lx.fillRect(X-1-f,Y,1+f,1);lx.fillRect(X+1,Y,1+f,1);lx.fillStyle='#402';lx.fillRect(X,Y,1,1);}else{lx.globalAlpha=.6;lx.fillStyle='#fffbe0';lx.fillRect(X,Y,1,1);lx.globalAlpha=1;}}
    else{const tw=.3+.3*Math.sin(a.p*2);gmx.globalAlpha=tw;gmx.drawImage(R.d.th==='temple'?LT.red:R.d.th==='cave'?LT.blue:LT.gold,X-4,Y-4,8,8);lx.globalAlpha=tw+.2;lx.fillStyle=R.d.th==='temple'?'#ffb040':'#e8f0ff';lx.fillRect(X,Y,1,1);lx.globalAlpha=1;}}
  // 루미(길잡이 등불)
  if(hero&&state!=='title'){const f=DIRV[hero.dir],lxp=hero.x-f[0]*.5+Math.sin(gt*1.3)*.15,lyp=hero.y-f[1]*.5+Math.cos(gt*1.1)*.15,lz=hero.z+4.6+Math.sin(gt*2.4)*.4;if(!lumi.x){lumi.x=lxp;lumi.y=lyp;lumi.z=lz;}
    lumi.x+=(lxp-lumi.x)*.08;lumi.y+=(lyp-lumi.y)*.08;lumi.z+=(lz-lumi.z)*.1;const q=iso(lumi.x,lumi.y,lumi.z),s=S.lumi[(gt*3|0)%2];lx.drawImage(s.c,Math.round(q[0]+ox-s.ax),Math.round(q[1]+oy-s.ay));
    light(lumi.x,lumi.y,lumi.z,60,'gold',.7);glow(lumi.x,lumi.y,lumi.z+.6,20,'gold',.75);if(Math.random()<.12)part(lumi.x,lumi.y,lumi.z,rnd(-.3,.3),rnd(-.3,.3),-1,.5,'#ffe9a0',1,3,1);}
  if(state==='item'&&itemGet){const s=S[itemGet.I.s][itemGet.I.f||0],q=iso(hero.x,hero.y,hero.z+5.4+Math.min(1,itemGet.t*3)*1.2);lx.drawImage(s.c,Math.round(q[0]+ox-s.w/2),Math.round(q[1]+oy-s.h));glow(hero.x,hero.y,hero.z+7,50,'gold',.8);light(hero.x,hero.y,hero.z+6,90,'gold',1);
    for(let i=0;i<8;i++){const a=gt*1.5+i*TAU/8,p=iso(hero.x,hero.y,hero.z+7);lx.fillStyle='#fff6c0';lx.fillRect(Math.round(p[0]+ox+Math.cos(a)*16),Math.round(p[1]+oy-6+Math.sin(a)*10),1,1);}}
  compose();
}
const lumi={x:0,y:0,z:0};
function compose(){
  mx.setTransform(1,0,0,1,0,0);mx.globalAlpha=1;mx.globalCompositeOperation='source-over';mx.imageSmoothingEnabled=false;mx.drawImage(lo,0,0,W*SC,H*SC);
  mx.imageSmoothingEnabled=true;mx.globalCompositeOperation='multiply';mx.drawImage(lm,0,0,W*SC,H*SC);
  mx.globalCompositeOperation='lighter';mx.drawImage(gm,0,0,W*SC,H*SC);mx.globalCompositeOperation='source-over';
  if(!vig){vig=mkc(PW/4,PH/4);const x=vig.getContext('2d'),q=x.createRadialGradient(vig.width/2,vig.height/2,Math.min(vig.width,vig.height)*.35,vig.width/2,vig.height/2,Math.hypot(vig.width,vig.height)*.56);
    q.addColorStop(0,'rgba(10,6,30,0)');q.addColorStop(1,'rgba(10,6,30,.55)');x.fillStyle=q;x.fillRect(0,0,vig.width,vig.height);}
  mx.drawImage(vig,0,0,PW,PH);
  if(state!=='title')hud();
  if(state==='title')drawTitle();
  if(dlg)drawDialog();
  if(state==='item'&&itemGet)panel(itemGet.msg,null,itemGet.t>1.3);
  if(state==='pause')drawPause();
  if(state==='dead'){mx.fillStyle=`rgba(20,0,10,${Math.min(.75,dlgT*.6)})`;mx.fillRect(0,0,PW,PH);txt('코코는 쓰러졌다…',PW/2,PH*.42,26,'#ff8aa0','center');if(dlgT>1.6&&(gt*2|0)%2)txt(isTouch?'화면을 눌러 다시 일어선다':'X 를 눌러 다시 일어선다',PW/2,PH*.55,14,'#fff','center');}
  if(state==='end')drawEnd();
  if(fade<1){mx.fillStyle=`rgba(4,3,12,${1-Math.round(fade*8)/8})`;mx.fillRect(0,0,PW,PH);}
}
/* ---------------- 화면 글자 · HUD ---------------- */
const FONT="'Jua','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";
const U=()=>Math.max(1,SC*.34)*(Math.min(PW,PH*1.4)/ (SC*300)); // 글자 크기 배율
function txt(s,x,y,size,col='#fff',al='left',stroke='#170c2e'){const px=size*U()*2.1;mx.font=`${px|0}px ${FONT}`;mx.textAlign=al;mx.textBaseline='middle';mx.lineJoin='round';mx.lineWidth=px*.24;mx.strokeStyle=stroke;mx.strokeText(s,x,y);mx.fillStyle=col;mx.fillText(s,x,y);}
function icon(s,x,y,k=1){mx.imageSmoothingEnabled=false;mx.drawImage(s.c,x,y,s.w*SC*k,s.h*SC*k);}
function hud(){
  const m=6*SC;let x=m,y=m+(isTouch?0:0);
  for(let i=0;i<SV.maxhp/2;i++){const v=clamp(SV.hp-i*2,0,2);icon(S.hp[v],x+i*12*SC,y);}
  y+=13*SC;icon(S.coin[0],x,y-SC);txt(''+SV.gold,x+12*SC,y+5*SC,9,'#ffe14d');
  let xx=x+40*SC;if(SV.keys){icon(S.key[0],xx,y-3*SC,.8);txt('×'+SV.keys,xx+11*SC,y+5*SC,9);xx+=30*SC;}
  icon(S.herb[0],xx,y-3*SC,.8);txt('×'+SV.herb,xx+12*SC,y+5*SC,9,'#9dff9a');
  if(SV.emb&1)icon(S.emb1[0],PW-m-(isTouch?70:18)*SC,m,.9);if(SV.emb&2)icon(S.emb2[0],PW-m-(isTouch?88:36)*SC,m,.9);
  const bs=ents.find(e=>e.boss);if(bs){const w=Math.min(PW*.6,260*SC),bx=(PW-w)/2,by=PH-(isTouch?150:26)*U()*2-10*SC;mx.fillStyle='rgba(10,6,30,.75)';mx.fillRect(bx-2,by-2,w+4,5*SC+4);
    const q=mx.createLinearGradient(bx,0,bx+w,0);q.addColorStop(0,'#ff3b6e');q.addColorStop(1,'#ffb020');mx.fillStyle=q;mx.fillRect(bx,by,w*clamp(bs.hp/bs.mhp,0,1),5*SC);txt({stump:'고목의 수호자',crab:'동굴의 큰집게',sun:'태양의 거상'}[bs.boss],PW/2,by-9*SC,10,'#ffd0e0','center');}
  if(banner>0){const a=Math.min(1,banner,(3-banner)*3);mx.globalAlpha=clamp(a,0,1);txt(R.d.name,PW/2,PH*.2,20,'#fff6d0','center','#3a1466');mx.globalAlpha=1;}
  if(toastT>0){mx.globalAlpha=Math.min(1,toastT*3);const w=mx.measureText(toastS).width;txt(toastS,PW/2,PH*.3,13,'#fff','center');mx.globalAlpha=1;}
  if(joy.on&&state==='play'){const d=PW/innerWidth;mx.lineWidth=2*d;mx.strokeStyle='rgba(255,255,255,.45)';mx.fillStyle='rgba(255,255,255,.08)';mx.beginPath();mx.arc(joy.sx*d,joy.sy*d,48*d,0,TAU);mx.fill();mx.stroke();mx.fillStyle='rgba(255,255,255,.5)';mx.beginPath();mx.arc((joy.sx+joy.x*38)*d,(joy.sy+joy.y*38)*d,20*d,0,TAU);mx.fill();}
}
function rr(x,y,w,h,r){mx.beginPath();mx.moveTo(x+r,y);mx.arcTo(x+w,y,x+w,y+h,r);mx.arcTo(x+w,y+h,x,y+h,r);mx.arcTo(x,y+h,x,y,r);mx.arcTo(x,y,x+w,y,r);mx.closePath();}
function panel(text,who,more,choice,sel){
  const u=U()*2.1,w=Math.min(PW-16*SC,560*u),h=86*u,x=(PW-w)/2,y=PH-h-(isTouch&&PH>PW?Math.min(PH*.3,150*PW/innerWidth):14*u);
  const q=mx.createLinearGradient(0,y,0,y+h);q.addColorStop(0,'rgba(34,26,84,.94)');q.addColorStop(1,'rgba(12,8,40,.96)');rr(x,y,w,h,10*u);mx.fillStyle=q;mx.fill();mx.lineWidth=2.2*u;mx.strokeStyle='#ffd87a';mx.stroke();
  rr(x+3*u,y+3*u,w-6*u,h-6*u,8*u);mx.lineWidth=1*u;mx.strokeStyle='rgba(255,216,122,.35)';mx.stroke();
  if(who){const tw=(who.length*15+22)*u;rr(x+14*u,y-13*u,tw,24*u,8*u);mx.fillStyle='#ffd87a';mx.fill();mx.font=`${15*u|0}px ${FONT}`;mx.textAlign='center';mx.textBaseline='middle';mx.fillStyle='#2a1450';mx.fillText(who,x+14*u+tw/2,y-1*u);}
  mx.font=`${16*u|0}px ${FONT}`;mx.textAlign='left';mx.textBaseline='middle';mx.fillStyle='#fff';const ls=text.split('\n');ls.forEach((l,i)=>mx.fillText(l,x+20*u,y+24*u+i*22*u));
  if(choice){choice.forEach((c,i)=>{const cx=x+w-(choice.length-i)*92*u,cy=y+h-20*u;mx.fillStyle=i===sel?'#ffe14d':'#b8b0e0';mx.fillText((i===sel?'▶ ':'  ')+c,cx,cy);});}
  else if(more&&(gt*2.5|0)%2){mx.fillStyle='#ffd87a';mx.fillText('▼',x+w-26*u,y+h-16*u);}
}
function updDialog(dt){const q=dlg.q[dlg.i],full=q.t.length;
  if(dlg.n<full){dlg.n+=dt*38;if((dlg.n|0)%3===0)SND.sfx('blip',.05);if(pressed.B||pressed.A)dlg.n=full;return;}
  if(q.c){if(pressed.L||pressed.U){dlg.sel=Math.max(0,dlg.sel-1);SND.sfx('blip');}if(pressed.R||pressed.D){dlg.sel=Math.min(q.c.length-1,dlg.sel+1);SND.sfx('blip');}
    if(pressed.T&&isTouch){/* 터치: 좌우 절반으로 선택 */}
    if(pressed.B||pressed.A){SND.sfx('sel');const f=q.f,s=dlg.sel;dlg=null;state='play';if(f)f(s);}return;}
  if(pressed.B||pressed.A){SND.sfx('blip');dlg.i++;dlg.n=0;if(dlg.i>=dlg.q.length){const cb=dlg.cb;dlg=null;state='play';if(cb)cb();}}
}
function drawDialog(){const q=dlg.q[dlg.i];panel(q.t.slice(0,dlg.n|0),q.w,dlg.n>=q.t.length&&!q.c,dlg.n>=q.t.length?q.c:null,dlg.sel);}
function drawPause(){mx.fillStyle='rgba(8,5,30,.7)';mx.fillRect(0,0,PW,PH);txt('잠시 멈춤',PW/2,PH*.22,24,'#ffe14d','center');
  const L=[['검',['코코의 검','물결의 검','태양의 검'][SV.sword-1]],['골드',SV.gold],['생명초',SV.herb+'개'],['열쇠',SV.keys+'개'],['문장',((SV.emb&1)?'숲 ':'')+((SV.emb&2)?'물결':'')||'없음'],['모험 시간',(SV.time/60|0)+'분']];
  L.forEach((l,i)=>{txt(l[0],PW/2-70*U()*2,PH*.34+i*24*U()*2,13,'#b8b0e0','left');txt(''+l[1],PW/2+70*U()*2,PH*.34+i*24*U()*2,13,'#fff','right');});
  txt(isTouch?'화면을 누르면 계속':'ESC / X 로 계속 · M 소리 켜고 끄기',PW/2,PH*.82,12,'#fff','center');}
/* ---------------- 타이틀 · 엔딩 ---------------- */
function titleInit(){state='title';menuSel=hasSave?0:1;R=null;const save=SV;loadRoom('village',9,14,true);SV=save;hero.x=-50;SND.play('title');fade=0;fadeTo=1;cam.x=0;cam.y=60;}
function updTitle(dt){ambient(dt);cam.x=Math.sin(gt*.12)*90;cam.y=110+Math.cos(gt*.1)*40;
  if(pressed.U||pressed.L||pressed.D||pressed.R){menuSel=hasSave?1-menuSel:1;SND.sfx('blip');}
  if(pressed.B||pressed.A){SND.sfx('sel');const cont=hasSave&&menuSel===0;state='fade';fadeTo=0;fadeCb=()=>{if(!cont){SV=JSON.parse(JSON.stringify(DEF));}state='play';loadRoom(SV.room,SV.x,SV.y);fadeTo=1;
      if(!cont)say([{w:'루미',t:'코코, 드디어 솔라 섬에 도착했어!\n전설의 보물 「태양석」이 이 섬 어딘가에 잠들어 있대.'},{w:'루미',t:isTouch?'왼쪽 화면을 끌면 이동, 점프 버튼으로 뛰고,\n검 버튼으로 베거나 말을 걸 수 있어.':'방향키로 이동, SPACE 로 점프,\nX 로 검을 휘두르거나 말을 걸 수 있어.'},{w:'루미',t:'우선 마을 촌장님을 찾아가 보자!'}]);};}
}
function drawTitle(){const u=U()*2.1,cy=PH*.3;mx.fillStyle='rgba(6,4,30,.28)';mx.fillRect(0,0,PW,PH);
  const lg=S.logo[0],k=Math.max(1,Math.round(SC*.9));mx.imageSmoothingEnabled=false;mx.globalAlpha=.95;mx.drawImage(lg.c,PW/2-lg.w*k/2,cy-lg.h*k*.78,lg.w*k,lg.h*k);mx.globalAlpha=1;
  mx.font=`700 ${44*u|0}px 'Cinzel',${FONT}`;mx.textAlign='center';mx.textBaseline='middle';mx.lineJoin='round';const ty=cy+34*u;
  mx.lineWidth=9*u;mx.strokeStyle='#2a1050';mx.strokeText('SUNSTONE ISLE',PW/2,ty);const q=mx.createLinearGradient(0,ty-22*u,0,ty+22*u);q.addColorStop(0,'#fffbe0');q.addColorStop(.5,'#ffd23a');q.addColorStop(1,'#ff8a2a');mx.fillStyle=q;mx.fillText('SUNSTONE ISLE',PW/2,ty);
  txt('태 양 석 의  섬',PW/2,ty+38*u,15,'#fff6d0','center','#3a1466');
  const items=hasSave?['이어하기','처음부터']:['','모험 시작'];items.forEach((s,i)=>{if(!s)return;const on=i===menuSel;txt((on?'▶ ':'')+s,PW/2,PH*.66+i*30*u,on?18:15,on?'#ffe14d':'#c8c0f0','center');});
  txt(isTouch?'화면을 눌러 시작 · 위아래로 메뉴 선택':'방향키로 선택 · X 또는 ENTER 로 시작 · M 소리',PW/2,PH*.9,10,'#d8d0ff','center');}
function ending(){state='end';dlgT=0;SND.play('ending');SV.flags.cleared=1;persist();}
function drawEnd(){mx.fillStyle=`rgba(255,246,220,${Math.min(.3,dlgT*.1)})`;mx.fillRect(0,0,PW,PH);mx.fillStyle=`rgba(10,6,40,${Math.min(.6,dlgT*.2)})`;mx.fillRect(0,0,PW,PH);
  const u=U()*2.1,L=['코코는 마침내 태양석을 손에 넣었다.','섬을 감싸던 어둠이 걷히고,','솔라 섬에는 다시 따스한 빛이 내렸다.','','— 모험 시간 '+(SV.time/60|0)+'분 · '+SV.gold+' 골드 —','','함께해 줘서 고마워!'];
  L.forEach((l,i)=>{const a=clamp(dlgT-1-i*.7,0,1);mx.globalAlpha=a;txt(l,PW/2,PH*.26+i*26*u,i===6?18:15,i===4?'#ffe14d':'#fff','center');});mx.globalAlpha=1;
  if(dlgT>6&&(gt*2|0)%2)txt('버튼을 누르면 타이틀로',PW/2,PH*.88,12,'#fff','center');}

/* ---------------- 대사에서 쓰는 도우미 ---------------- */
const API={flag,setFlag,get sv(){return SV;},give,say,toast,persist,sfx:n=>SND.sfx(n),remove:e=>{e.gone=true;}};

/* ---------------- 루프 ---------------- */
let last=0;
function frame(t){requestAnimationFrame(frame);const dt=Math.min(.033,(t-last)/1000);last=t;if(dt<=0)return;update(dt);if(R)render();for(const k in pressed)delete pressed[k];}
resize();titleInit();
window.__g={joy,get s(){return{state,R,hero,ents,SV,cam,W,H,SC};},update,render,keys,pressed,go:(id,x,y)=>{state='play';dlg=null;loadRoom(id,x,y);fade=fadeTo=1;},say,give,setFlag,
  step:(n,dt=1/60)=>{for(let i=0;i<n;i++){update(dt);for(const k in pressed)delete pressed[k];}}};
requestAnimationFrame(frame);
})();
