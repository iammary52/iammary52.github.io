'use strict';
/* =====================================================================
   gfx.js — 메가드라이브풍 도트 그래픽 생성기
   색은 채널당 3비트(0~7)만 사용합니다. '251' = R2 G5 B1.
   모든 타일과 캐릭터를 코드로 한 점씩 찍어 만듭니다.
   ===================================================================== */
const GFX=(()=>{
const LV=[0,36,73,109,146,182,219,255], CC={};
const rgb=c=>CC[c]||(CC[c]=[LV[+c[0]],LV[+c[1]],LV[+c[2]]]);
const BAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const dth=(x,y,t)=>((BAY[((y&3)<<2)|(x&3)]+.5)/16)<t;
function hsh(x,y){let n=Math.imul(x|0,374761393)^Math.imul(y|0,668265263);n=Math.imul(n^n>>>13,1274126177);return((n^n>>>16)>>>0)/4294967296;}
function vn(x,y){const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  const a=hsh(xi,yi),b=hsh(xi+1,yi),c=hsh(xi,yi+1),d=hsh(xi+1,yi+1);return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;}
const OL='101';
class Pix{
  constructor(w,h){this.w=w;this.h=h;this.d=new Uint8ClampedArray(w*h*4);}
  set(x,y,c){x=Math.floor(x);y=Math.floor(y);if(!c||x<0||y<0||x>=this.w||y>=this.h)return;const i=(y*this.w+x)*4,v=rgb(c);this.d[i]=v[0];this.d[i+1]=v[1];this.d[i+2]=v[2];this.d[i+3]=255;}
  clr(x,y){if(x<0||y<0||x>=this.w||y>=this.h)return;this.d[(y*this.w+x)*4+3]=0;}
  has(x,y){return x>=0&&y>=0&&x<this.w&&y<this.h&&this.d[(y*this.w+x)*4+3]>0;}
  rect(x,y,w,h,c){for(let j=0;j<h;j++)for(let i=0;i<w;i++)this.set(x+i,y+j,c);}
  // 타원. cols가 배열이면 [밝음,중간,어둠]으로 왼쪽 위에서 빛을 받는 음영
  ell(cx,cy,rx,ry,cols){const x0=Math.floor(cx-rx),x1=Math.ceil(cx+rx),y0=Math.floor(cy-ry),y1=Math.ceil(cy+ry);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const dx=(x+.5-cx)/rx,dy=(y+.5-cy)/ry;if(dx*dx+dy*dy>1)continue;
      if(typeof cols==='string'){this.set(x,y,cols);continue;}const t=dx*.6+dy*.8;this.set(x,y,t<-.42?cols[0]:t>.45?cols[2]:cols[1]);}}
  line(x0,y0,x1,y1,c){x0|=0;y0|=0;x1|=0;y1|=0;const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx+dy;
    for(;;){this.set(x0,y0,c);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx;}if(e2<=dx){e+=dx;y0+=sy;}}}
  poly(pts,c){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(let i=0;i<pts.length;i+=2){x0=Math.min(x0,pts[i]);x1=Math.max(x1,pts[i]);y0=Math.min(y0,pts[i+1]);y1=Math.max(y1,pts[i+1]);}
    for(let y=Math.floor(y0);y<=Math.ceil(y1);y++)for(let x=Math.floor(x0);x<=Math.ceil(x1);x++){const px=x+.5,py=y+.5;let ins=false;
      for(let i=0,j=pts.length-2;i<pts.length;j=i,i+=2){const xi=pts[i],yi=pts[i+1],xj=pts[j],yj=pts[j+1];if((yi>py)!==(yj>py)&&px<(xj-xi)*(py-yi)/(yj-yi)+xi)ins=!ins;}
      if(ins)this.set(x,y,typeof c==='function'?c(x,y):c);}}
  setm(x,y,c,m,cool){if(x<0||y<0||x>=this.w||y>=this.h)return;const i=(y*this.w+x)*4,v=rgb(c);this.d[i]=v[0]*m*(cool?.94:1.02);this.d[i+1]=v[1]*m;this.d[i+2]=v[2]*m*(cool?1.1:.97);this.d[i+3]=255;}
  // 외곽선: 이웃 색을 어둡게 한 색으로(부드러운 도트 느낌) + 왼쪽 위에서 빛을 받는 입체 음영
  outline(c){const w=this.w,h=this.h,d=this.d,m=[],om=new Uint8Array(w*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(this.has(x,y))continue;let n=-1;if(this.has(x,y-1))n=(y-1)*w+x;else if(this.has(x-1,y))n=y*w+x-1;else if(this.has(x+1,y))n=y*w+x+1;else if(this.has(x,y+1))n=(y+1)*w+x;if(n>=0)m.push(x,y,n);}
    const T=(x,y)=>x<0||y<0||x>=w||y>=h||!d[(y*w+x)*4+3];
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(!d[i+3])continue;let L=0;if(T(x,y-1))L+=.6;if(T(x-1,y))L+=.5;if(T(x,y+1))L-=.6;if(T(x+1,y))L-=.5;
      if(L>0){d[i]=Math.min(255,d[i]*(1+.17*L)+6*L);d[i+1]=Math.min(255,d[i+1]*(1+.15*L)+4*L);d[i+2]=Math.min(255,d[i+2]*(1+.1*L));}
      else if(L<0){d[i]*=1+.2*L;d[i+1]*=1+.17*L;d[i+2]*=1+.1*L;}}
    for(let k=0;k<m.length;k+=3){const i=(m[k+1]*w+m[k])*4,j=m[k+2]*4;if(c){const v=rgb(c);d[i]=v[0];d[i+1]=v[1];d[i+2]=v[2];}else{d[i]=d[j]*.26+8;d[i+1]=d[j+1]*.2+4;d[i+2]=d[j+2]*.3+22;}d[i+3]=255;}
    return this;}
  blit(s,dx,dy){for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){const i=(y*s.w+x)*4;if(!s.d[i+3])continue;const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=this.w||Y>=this.h)continue;const j=(Y*this.w+X)*4;
      this.d[j]=s.d[i];this.d[j+1]=s.d[i+1];this.d[j+2]=s.d[i+2];this.d[j+3]=255;}}
  mirror(){const p=new Pix(this.w,this.h);for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++){const i=(y*this.w+x)*4,j=(y*this.w+(this.w-1-x))*4;for(let k=0;k<4;k++)p.d[j+k]=this.d[i+k];}return p;}
  canvas(){const c=document.createElement('canvas');c.width=this.w;c.height=this.h;const x=c.getContext('2d'),im=x.createImageData(this.w,this.h);im.data.set(this.d);x.putImageData(im,0,0);return c;}
}
const spr=(p,ax,ay)=>({c:p.canvas(),w:p.w,h:p.h,ax,ay});
function whiteOf(s){const c=document.createElement('canvas');c.width=s.w;c.height=s.h;const x=c.getContext('2d');x.drawImage(s.c,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#fff';x.fillRect(0,0,s.w,s.h);return{c,w:s.w,h:s.h,ax:s.ax,ay:s.ay};}

/* ---------------- 바닥(윗면) 무늬: (세계 픽셀 U,V, 프레임, 칸 좌표) → 색 ---------------- */
const TOP={
  grass(U,V){const n=vn(U/9+3,V/9+7),m=hsh(U,V);if(m>.972)return'031';if(m<.012)return'473';
    if(n<.36)return dth(U,V,(.36-n)*5)?'141':'251';if(n>.66)return dth(U,V,(n-.66)*5)?'362':'251';return'251';},
  flower(U,V){const fx=Math.floor(U/5),fy=Math.floor(V/5),h=hsh(fx+91,fy+17);if(h>.55){const lx=U-fx*5,ly=V-fy*5,cx=1+Math.floor(hsh(fx,fy)*2),cy=1+Math.floor(hsh(fy,fx)*2);
      if(lx===cx&&ly===cy)return'760';if(Math.abs(lx-cx)+Math.abs(ly-cy)===1)return h>.85?'722':h>.7?'777':'746';}return TOP.grass(U,V);},
  path(U,V){const n=vn(U/6+11,V/6+5),m=hsh(U+7,V+3);if(m>.965)return'775';if(m<.03)return'432';return n<.38?(dth(U,V,(.38-n)*4)?'542':'653'):n>.7?(dth(U,V,(n-.7)*4)?'764':'653'):'653';},
  sand(U,V){const r=Math.sin((U+V)*.55+vn(U/8,V/8)*5);if(hsh(U,V)>.975)return'653';return r>.82?'653':r<-.6?(dth(U,V,.5)?'775':'764'):'764';},
  stone(U,V,f,cx,cy){const su=U&15,sv=V&15;if(su===0||sv===0)return'223';const ck=(cx+cy)&1,n=vn(U/5,V/5);
    if(su===1||sv===1)return ck?'667':'556';if(hsh(U+cx*7,V+cy*3)>.975)return ck?'445':'334';return ck?(n>.72?'445':'556'):(n>.72?'334':'445');},
  moss(U,V,f,cx,cy){const n=vn(U/6+40,V/6+9);if(n>.56)return dth(U,V,(n-.56)*6)?'142':TOP.stone(U,V,f,cx,cy);return TOP.stone(U,V,f,cx,cy);},
  cave(U,V){const n=vn(U/7+2,V/7+31),m=hsh(U+1,V+9);if(m>.97)return'211';if(m<.02)return'654';return n<.4?(dth(U,V,(.4-n)*4)?'322':'433'):n>.68?(dth(U,V,(n-.68)*5)?'544':'433'):'433';},
  temple(U,V,f,cx,cy){const su=U&15,sv=V&15;if(su===0||sv===0)return'420';const ck=(cx+cy)&1;if(su===1||sv===1)return ck?'775':'764';
    if(ck&&su>5&&su<11&&sv>5&&sv<11){const d=Math.abs(su-8)+Math.abs(sv-8);if(d===2)return'631';if(d<2)return'760';}
    return ck?(hsh(U,V)>.95?'653':'764'):(hsh(U,V)>.95?'542':'653');},
  wood(U,V){const pv=V&3;if(pv===0)return'310';const pl=V>>2;if(((U+pl*5)&15)===0)return'310';const n=hsh(U>>2,pl);return hsh(U,V)>.93?'421':n>.6?'642':'531';},
  carpet(U,V){const su=U&15,sv=V&15;if(su<1||sv<1)return'400';if(su===2||sv===2||su===14||sv===14)return'750';const d=Math.abs(su-8)+Math.abs(sv-8);if(d===4)return'750';return dth(U,V,.25)?'511':'611';},
  water(U,V,f){const w=Math.sin((U*.9+V*.5)*.5+f*2.1)+Math.sin((V-U*.4)*.45-f*2.1);const m=hsh(U+f*13,V);if(w>1.45)return m>.5?'677':'367';if(w>1.0)return'257';if(w<-1.2)return'025';return dth(U,V,.3)?'136':'146';},
  lava(U,V,f){const n=vn(U/5+f*.7,V/5-f*.4)+vn(U/11-f*.3,V/11)*.6;if(n>1.12)return'771';if(n>.95)return'751';if(n>.72)return dth(U,V,.5)?'730':'740';if(n<.42)return dth(U,V,.5)?'300':'410';return'720';},
  ice(U,V){const r=((U*2+V)&15);if(r===0)return'777';if(hsh(U,V)>.97)return'777';return vn(U/8,V/8)>.6?'567':'677';},
  wall(U,V){const su=U&15,sv=V&15;if(su===0||sv===0)return'112';return(su===1||sv===1)?'334':hsh(U,V)>.94?'223':'223';},
  wallT(U,V){const su=U&15,sv=V&15;if(su===0||sv===0)return'310';return(su===1||sv===1)?'653':'542';},
  wallC(U,V){const n=vn(U/5,V/5);return n>.62?'322':'211';},
  exit(U,V,f){const su=U&15,sv=V&15;if(su===0||sv===0||su===15||sv===15)return'750';const d=(su+sv+f*4)&7;return d<2?'760':d<4?'541':'321';},
  dark(){return'101';}
};
/* ---------------- 옆면 무늬: (가로 세계픽셀, 절대높이 픽셀, 위에서부터 깊이, 오른쪽면?, 윗면 종류) ---------------- */
const SIDE={
  earth(X,Z,dz,R,top){if((top==='grass'||top==='flower')&&dz<2+((hsh(X,7)>.5)?1:0)+((hsh(X>>1,3)>.7)?1:0))return dz===0?(R?'141':'251'):(R?'031':'141');
    const s=((Z+Math.floor(vn(X/9,Z/30)*5))%7+7)%7,m=hsh(X,Z);if(m>.972)return R?'542':'764';if(m<.02)return R?'200':'310';
    if(s===0)return R?'210':'320';return R?(dth(X,Z,.35)?'310':'421'):(dth(X,Z,.3)?'421':'531');},
  sandc(X,Z,dz,R){const s=((Z+Math.floor(vn(X/8,Z/20)*4))%6+6)%6,m=hsh(X,Z);if(dz===0)return R?'653':'775';if(m>.97)return R?'653':'775';if(s===0)return R?'321':'432';return R?(dth(X,Z,.3)?'432':'542'):(dth(X,Z,.3)?'542':'653');},
  brick(X,Z,dz,R){const row=Math.floor(Z/8),zz=((Z%8)+8)%8,xx=((X+((row&1)?8:0))%16+16)%16;if(zz===0||xx===0)return R?'112':'223';
    if(zz===7)return R?'445':'556';const m=hsh(X,Z);if(vn(X/7+5,Z/7)>.74)return R?'032':'142';if(m>.95)return R?'223':'334';return R?'334':'445';},
  cave(X,Z,dz,R){const n=vn(X/6+17,Z/5+3),m=hsh(X,Z),c=vn(X/3,Z/9);if(dz===0)return R?'433':'544';if(Math.abs(c-.5)<.035)return R?'100':'211';if(m>.97)return R?'433':'544';
    return R?(n>.55?'322':'211'):(n>.55?'433':'322');},
  temple(X,Z,dz,R){const row=Math.floor(Z/8),zz=((Z%8)+8)%8,xx=((X+((row&1)?8:0))%16+16)%16,band=((row%4)+4)%4===0;if(zz===0||xx===0)return R?'310':'420';
    if(band){const k=((X+zz)&7);if(zz>1&&zz<7&&(k===0||k===1))return R?'500':'711';return R?'531':'750';}
    if(zz===7)return R?'653':'775';return hsh(X,Z)>.95?(R?'431':'542'):(R?'542':'653');},
  wood(X,Z,dz,R){const xx=((X%5)+5)%5;if(xx===0)return R?'200':'310';if(dz===0)return R?'531':'642';return hsh(X,Z>>2)>.8?(R?'310':'421'):(R?'421':'531');},
  ice(X,Z,dz,R){if(dz===0)return'777';const r=((X+Z*2)%11+11)%11;return r===0?(R?'567':'777'):R?'346':'467';},
  dark(){return'000';}
};
/* 타일 종류 → 윗면/옆면 */
const TILE={
  g:['grass','earth'],f:['flower','earth'],p:['path','earth'],d:['sand','sandc'],s:['stone','brick'],m:['moss','brick'],
  r:['cave','cave'],t:['temple','temple'],k:['wood','wood'],c:['carpet','brick'],w:['water','earth',3],l:['lava','cave',3],i:['ice','ice'],
  B:['wall','brick'],T:['wallT','temple'],C:['wallC','cave'],e:['exit','brick',2],x:['stone','brick'],X:['temple','temple'],h:['wood','wood']
};
/* 상자 모양(윗면+왼쪽면+오른쪽면)을 그리는 범용 루틴. 지형 한 칸도, 나무 상자도 이걸로 그림 */
function box(w,d,hL,hR,topF,sideF,opt={}){
  const HR=opt.hr||0,W=(w+d)*16,H=(w+d)*8+Math.max(hL,hR)*8+HR,p=new Pix(W,H),ox=d*16,cx=opt.cx||0,cy=opt.cy||0,f=opt.f||0,zt=opt.zt||0,tn=opt.top||'';
  for(let py=HR;py<H;py++)for(let px=0;px<W;px++){
    const X=px-ox+.5,Y=py-HR+.5,u=(X/16+Y/8)/2,v=(Y/8-X/16)/2;
    if(u>=0&&v>=0&&u<w&&v<d){const U=(cx+u)*16,V=(cy+v)*16,c=topF(U|0,V|0,f,cx+Math.floor(u),cy+Math.floor(v));
      let m=1+(vn(U/3.1,V/3.1)-.5)*.1+(vn(U/41+5,V/41+9)-.5)*.16;if(opt.flat)m=1;if(opt.shade)m*=opt.shade(u,v);p.setm(px,py,c,m,false);continue;}
    if(X<(w-d)*16){const uu=X/16+d,dz=Y-(uu+d)*8,H=hL*8;if(uu>=0&&uu<w&&dz>=0&&dz<H){const WX=Math.floor((cx+uu)*16),ZA=zt*8-Math.floor(dz)-1;
        p.setm(px,py,sideF(WX,ZA,Math.floor(dz),false,tn,H),(1-.26*Math.min(1,dz/Math.max(H,40)))*(dz>H-3&&!opt.noao?.86:1)*(1+(vn(WX/4,ZA/4)-.5)*.09),false);}}
    else{const vv=w-X/16,dz=Y-(w+vv)*8,H=hR*8;if(vv>=0&&vv<d&&dz>=0&&dz<H){const WX=Math.floor((cy+vv)*16)+1000,ZA=zt*8-Math.floor(dz)-1;
        p.setm(px,py,sideF(WX,ZA,Math.floor(dz),true,tn,H),.9*(1-.3*Math.min(1,dz/Math.max(H,40)))*(dz>H-3&&!opt.noao?.86:1)*(1+(vn(WX/4,ZA/4)-.5)*.09),true);}}
  }
  return p;
}
const DARK={'251':'141','141':'031','362':'251','653':'542','542':'432','764':'653','556':'445','445':'334','334':'223','667':'556','433':'322','322':'211','544':'433','775':'653','531':'421','642':'531','611':'400','511':'400','677':'567','567':'456'};
const LITE={'251':'362','141':'251','653':'764','542':'653','445':'556','334':'445','556':'667','433':'544','322':'433','764':'775','531':'642','421':'531','223':'334','611':'722','567':'677'};
const dk=c=>DARK[c]||c, lt=c=>LITE[c]||c;
/* 지형 한 칸: 뒤쪽 이웃이 높으면 접촉 그림자, 앞쪽이 낭떠러지면 모서리 하이라이트 */
function cell(code,cx,cy,h,hL,hR,nb,f){
  const T=TILE[code]||TILE.g,topF=TOP[T[0]],sideF=SIDE[T[1]];
  const p=box(1,1,hL,hR,topF,sideF,{hr:8,cx,cy,f,zt:h,top:T[0],
    flat:T[0]==='water'||T[0]==='lava'||T[0]==='exit',
    shade:(u,v)=>{if(T[0]==='lava'||T[0]==='exit')return 1;let s=0;const sh=(D,k,t)=>{if(D<=0)return;const reach=D*.3-(k-1);if(t<reach)s=Math.max(s,Math.min(1,(reach-t)/.3)*.34);if(k===1&&t<.14)s=Math.max(s,.2+.2*(1-t/.14));};
      sh(nb.bx,1,u);sh(nb.bx2,2,u);sh(nb.by,1,v*1.6);
      let m=1-s;if((hL>0&&v>.93)||(hR>0&&u>.93))m*=1.14;return m;}});
  if(code==='x'||code==='X'){ // 가시
    for(const[sx,sy]of[[10,10],[20,10],[15,7],[15,13],[6,13],[25,13],[10,16],[20,16]]){const X=sx,Y=sy+2;p.set(X,Y+3,'223');p.set(X+1,Y+3,'223');p.set(X,Y+2,'556');p.set(X+1,Y+2,'445');p.set(X,Y+1,'667');p.set(X+1,Y+1,'556');p.set(X,Y,'777');p.set(X,Y-1,'777');}}
  return p.canvas();
}

/* ---------------- 캐릭터 ---------------- */
const HERO={skin:['764','653','542'],hair:['777','667','445'],top:['257','136','024'],boot:['642','531','310'],band:['722','611','400']};
/* 사람 모양 생성기. o.b=뒷모습, ph=걷기 단계(0~3), pose: idle/walk/jump/atk0/atk1/item */
function person(o){
  const W=36,H=38,p=new Pix(W,H),cx=17,by=34,b=!!o.b,pose=o.pose||'idle',ph=o.ph||0,sk=o.skin||HERO.skin,hr=o.hair||HERO.hair,tp=o.top||HERO.top,bt=o.boot||HERO.boot;
  let bob=0,l1=0,l2=0,u1=0,u2=0,a1=0,a2=0;
  if(pose==='walk'){const s=Math.sin(ph/6*Math.PI*2);l1=Math.round(s*2.6);l2=-l1;u1=s>.4?1:0;u2=s<-.4?1:0;bob=Math.abs(s)>.6?-1:0;a1=-Math.round(s*2);a2=-a1;}
  if(pose==='idle'&&ph===1)bob=1;
  if(pose==='jump'){u1=2;u2=1;l1=-1;l2=1;a1=-3;a2=-3;bob=-1;}
  if(pose==='item'){a1=-7;a2=-7;}
  const short=o.kid?3:0,ty=by-15+short+bob,hy=ty-7+(o.kid?1:0);
  // 뒤쪽 팔
  const arm=(x,dy,front)=>{const y=ty+2+Math.max(dy,-6);if(dy<=-6){p.rect(x,ty-4,2,6,tp[1]);p.rect(x,ty-6,2,2,sk[1]);return;}
    p.rect(x,y,2,3,front?tp[1]:tp[2]);p.rect(x,y+3,2,2,front?sk[1]:sk[2]);p.set(x,y+5,sk[1]);p.set(x+1,y+5,sk[2]);};
  if(!o.robe)arm(b?cx-6:cx+4,a2,false);
  // 다리
  if(o.robe){p.rect(cx-5,by-3,10,3,tp[2]);p.rect(cx-3,by-1,3,2,bt[1]);p.rect(cx+1,by-1,3,2,bt[2]);}
  else{const leg=(x,d,u,far)=>{const X=x+d,Y=by-5-u+short*0;p.rect(X,Y,3,2,far?sk[2]:sk[1]);p.rect(X,Y+2,3,3,far?bt[2]:bt[1]);p.set(X+(b?-1:3),Y+4,far?bt[2]:bt[1]);p.set(X,Y+2,far?bt[1]:bt[0]);};
    leg(cx+1,l2,u2,true);leg(cx-4,l1,u1,false);}
  // 몸통
  const th=o.robe?12:9;
  for(let y=0;y<th-short;y++){const w=y>th-4?6:5,Y=ty+y;for(let x=-w;x<w;x++){const c=x<-w+2?tp[0]:x>w-3?tp[2]:tp[1];p.set(cx+x,Y,c);}}
  if(o.belt!==false){p.rect(cx-5,ty+5-short,10,1,o.belt||'420');p.set(cx+(b?-1:1),ty+5-short,'760');}
  if(o.trim)for(let x=-6;x<6;x++)p.set(cx+x,ty+th-short-1,o.trim);
  if(o.chest&&!b){p.set(cx+1,ty+2,o.chest);p.set(cx+2,ty+2,o.chest);p.set(cx+1,ty+3,o.chest);}
  if(o.pack){p.ell(cx-6,ty+3,4,5,['642','531','310']);}
  if(b&&o.sword!==false&&!o.npc){p.line(cx-5,ty+1,cx+3,ty+8,'420');p.line(cx-4,ty+1,cx+4,ty+8,'631');p.set(cx+4,ty+9,'760');p.rect(cx+5,ty-3,2,3,'760');p.set(cx+6,ty-4,'556');}
  // 머리
  const hx=cx+(b?0:1);
  p.ell(hx,hy,6,5.5,sk);
  if(o.style==='bald'){p.ell(hx-.5,hy-2,5.5,3.2,sk);if(b)p.ell(hx,hy,6,5.5,sk);}
  else if(o.style==='helmet'){p.ell(hx-.5,hy-1.5,6.5,4.6,['667','445','334']);p.rect(hx-6,hy+1,12,1,'223');p.rect(hx-1,hy-8,2,3,'711');if(b)p.ell(hx,hy+1,6,4.5,['556','445','334']);}
  else if(o.style==='turban'){p.ell(hx-.5,hy-2.5,7,4.2,o.hat||['777','667','556']);p.set(hx,hy-3,'711');p.set(hx+1,hy-3,'711');if(b)p.ell(hx,hy+1,6,4.5,hr);}
  else if(o.style==='long'){p.ell(hx-1,hy-1.5,6.8,5,hr);p.rect(hx-7,hy,3,9,hr[1]);p.rect(hx-7,hy+2,1,7,hr[2]);if(b){p.ell(hx,hy+1,6.5,5.5,hr);p.rect(hx-6,hy+3,12,6,hr[1]);p.rect(hx+3,hy+3,3,6,hr[2]);}}
  else if(o.style==='cap'){p.ell(hx-.5,hy-2,6.5,4,o.hat||['722','611','400']);p.rect(b?hx-9:hx+3,hy-1,6,2,(o.hat||['722','611','400'])[2]);if(b)p.ell(hx,hy+1,6,4.5,hr);}
  else{ // 삐죽머리(주인공)
    p.ell(hx-1,hy-3.2,6.8,3.7,hr);
    for(const[sx,sy]of[[-6,-7],[-3,-8],[0,-9],[3,-8],[5,-6],[-7,-4]]){p.set(hx+sx,hy+sy,hr[0]);p.set(hx+sx,hy+sy+1,hr[1]);}
    p.rect(hx-7,hy-2,2,6,hr[1]);p.rect(hx-7,hy+2,1,3,hr[2]);p.set(hx-5,hy,hr[1]);
    if(b){p.ell(hx,hy+.5,6.6,5.6,hr);for(let i=-5;i<6;i+=2){p.set(hx+i,hy+5,hr[2]);p.set(hx+i,hy+3,hr[2]);}p.rect(hx+4,hy,2,4,sk[1]);}
  }
  if(o.band){const bd=o.band;p.rect(hx-6,hy-2,13,2,bd[1]);p.rect(hx-5,hy-2,11,1,bd[0]);
    const fl=(o.fl||0);p.rect(hx-9,hy-1,3,2,bd[1]);p.rect(hx-10,hy+1+fl,2,3,bd[1]);p.rect(hx-11+fl,hy+3+fl,2,3,bd[2]);p.set(hx-8,hy-2,bd[0]);}
  if(!b){ // 얼굴
    const ey=hy+1;p.set(hx-1,ey,OL);p.set(hx-1,ey+1,OL);p.set(hx+3,ey,OL);p.set(hx+3,ey+1,OL);p.set(hx-2,ey+1,'777');p.set(hx+2,ey+1,'777');
    if(o.skull){p.rect(hx-2,ey,2,2,OL);p.rect(hx+2,ey,2,2,OL);p.rect(hx-1,ey+3,4,1,OL);}
    else{p.set(hx+1,ey+3,sk[2]);p.set(hx-3,ey+2,'744');p.set(hx+4,ey+2,'744');}
    if(o.beard){p.ell(hx+.5,hy+5,4.5,4,o.beard);p.set(hx-1,ey,OL);p.set(hx+3,ey,OL);}
    if(o.stache){p.rect(hx-1,ey+2,5,1,o.stache);}
    p.set(hx-6,hy+1,sk[2]);
  }
  // 앞쪽 팔 / 무기
  if(!o.robe){
    if(pose==='atk0'){p.rect(b?cx-7:cx+5,ty-1,2,4,tp[1]);p.rect(b?cx-7:cx+5,ty-3,2,2,sk[1]);const sx=b?cx-7:cx+6;p.line(sx,ty-4,sx+(b?-4:4),ty-12,'777');p.line(sx+1,ty-4,sx+(b?-3:5),ty-12,'556');p.rect(sx-1,ty-4,3,1,'760');}
    else if(pose==='atk1'){const d=b?-1:1,sy=b?ty+1:ty+4;p.rect(cx+d*5,ty+2,2,2,tp[1]);p.rect(cx+d*7-(b?1:0),sy-1,3,2,sk[1]);
      const sx=cx+d*9,ex=cx+d*17,ey=b?ty-5:ty+9;p.line(sx,sy,ex,ey,'777');p.line(sx,sy+1,ex,ey+1,'556');p.line(sx+d,sy-1,ex,ey-1,'777');p.rect(sx-d,sy-1,1,3,'760');}
    else arm(b?cx+4:cx-6,a1,true);
  }
  if(o.staff){p.rect(cx+7,ty-9,2,by-ty+9,'531');p.rect(cx+8,ty-9,1,by-ty+9,'310');p.ell(cx+8,ty-10,2.4,2.4,['777','257','136']);}
  if(o.spear){p.rect(cx+8,ty-12,1,by-ty+12,'642');p.poly([cx+6.5,ty-11,cx+8.5,ty-17,cx+10.5,ty-11],'667');}
  p.outline();
  return spr(p,cx,by+1);
}
function heroSet(){
  const S=[[],[],[],[]],base={band:HERO.band};
  const mk=(b,pose,ph,fl)=>person(Object.assign({b,pose,ph,fl},base));
  const mir=s=>{const c=document.createElement('canvas');c.width=s.w;c.height=s.h;const x=c.getContext('2d');x.translate(s.w,0);x.scale(-1,1);x.drawImage(s.c,0,0);return{c,w:s.w,h:s.h,ax:s.w-s.ax,ay:s.ay};};
  for(const b of[0,1]){
    const set={idle:[mk(b,'idle',0,0),mk(b,'idle',1,1)],walk:[0,1,2,3,4,5].map(i=>mk(b,'walk',i,i%3?1:0)),jump:[mk(b,'jump',0,1)],atk:[mk(b,'atk0',0,0),mk(b,'atk1',0,1)],item:[mk(0,'item',0,0)]};
    const m={};for(const k in set)m[k]=set[k].map(mir);
    if(!b){S[0]=set;S[1]=m;}else{S[3]=set;S[2]=m;} // 0=남동(앞·오른쪽) 1=남서 2=북서 3=북동
  }
  return S;
}
const mirS=s=>{const c=document.createElement('canvas');c.width=s.w;c.height=s.h;const x=c.getContext('2d');x.translate(s.w,0);x.scale(-1,1);x.drawImage(s.c,0,0);return{c,w:s.w,h:s.h,ax:s.w-s.ax,ay:s.ay};};

function slime(cols,f){const p=new Pix(22,18),sq=[0,1.5,-1.5][f],rx=7.5+sq,ry=6-sq*.8,cy=15-ry;p.ell(11,cy,rx,ry,cols);p.rect(Math.round(11-rx)+1,15,Math.round(rx*2)-2,1,cols[2]);
  p.ell(8,cy-ry*.45,2.2,1.4,'777');const ey=Math.round(cy)-1;p.rect(8,ey,2,3,'777');p.rect(13,ey,2,3,'777');p.set(9,ey+1,OL);p.set(9,ey+2,OL);p.set(14,ey+1,OL);p.set(14,ey+2,OL);p.rect(10,ey+4,3,1,cols[2]);p.outline();return spr(p,11,17);}
function bat(f){const p=new Pix(26,18),wy=f?-4:3;p.poly([10,8,2,8+wy,1,12+wy*.6,5,10+wy*.3,8,12],'315');p.poly([16,8,24,8+wy,25,12+wy*.6,21,10+wy*.3,18,12],'315');
  p.line(10,8,2,8+wy,'537');p.line(16,8,24,8+wy,'537');p.ell(13,10,4,4,['537','426','214']);p.poly([10,7,10,3,12,6],'426');p.poly([16,7,16,3,14,6],'426');p.set(11,9,'730');p.set(15,9,'730');p.set(12,12,'777');p.set(14,12,'777');p.outline();return spr(p,13,16);}
function mush(f){const p=new Pix(24,26),bob=f?1:0;p.rect(8+(f?1:0),21,3,3,'420');p.rect(13-(f?1:0),21,3,3,'310');p.ell(12,17+bob,5,5,['775','764','653']);
  p.ell(12,9+bob,10,7,['733','611','400']);p.rect(3,11+bob,18,2,'400');p.ell(8,6+bob,2.2,1.8,'777');p.ell(15,5+bob,1.8,1.5,'777');p.ell(18,9+bob,1.5,1.5,'777');p.ell(4.5,9+bob,1.3,1.3,'777');
  p.rect(9,16+bob,2,2,OL);p.rect(14,16+bob,2,2,OL);p.set(9,16+bob,'777');p.set(14,16+bob,'777');p.rect(11,19+bob,3,1,'542');p.outline();return spr(p,12,25);}
function wisp(f){const p=new Pix(18,22);p.poly([9,1+f*2,13,8,15,14,12,19,6,19,3,14,5,8],'730');p.poly([9,5+f,12,10,13,15,10,18,8,18,5,15,6,10],'751');p.ell(9,14,3,3.5,'771');
  p.set(7,13,OL);p.set(11,13,OL);p.set(7,14,OL);p.set(11,14,OL);p.set(3+f*2,5,'751');p.set(14-f,3,'730');p.outline('300');return spr(p,9,21);}
function turret(){const p=new Pix(22,30);p.rect(3,22,16,6,'334');p.rect(3,22,16,1,'556');p.rect(11,23,8,5,'223');p.ell(11,13,8.5,10.5,['667','445','223']);
  p.rect(6,9,4,3,'711');p.rect(13,9,4,3,'711');p.set(7,10,'771');p.set(14,10,'771');p.ell(11.5,17.5,3.5,3,'101');p.rect(9,16,5,1,'730');p.rect(5,5,12,1,'556');p.rect(8,3,6,2,'445');p.outline();return spr(p,11,28);}
function skel(f){return person({skin:['777','667','445'],style:'bald',skull:1,top:['445','334','223'],boot:['556','445','223'],belt:'223',pose:'walk',ph:f*3,npc:1});}
function fireball(f){const p=new Pix(12,12);p.ell(6,6,4.5-f*.6,4.5-f*.6,'730');p.ell(6,6,3,3,'751');p.ell(6,6,1.5,1.5,'777');p.set(1+f,2,'730');p.set(10-f,9,'751');p.outline('300');return spr(p,6,9);}
function bubble(){const p=new Pix(12,12);p.ell(6,6,4.5,4.5,'257');p.ell(6,6,3.3,3.3,'136');p.set(4,4,'777');p.set(5,4,'777');p.set(4,5,'777');p.outline('014');return spr(p,6,9);}
function boss1(f){const p=new Pix(48,50),sq=f?2:0;const y0=14+sq;
  for(let y=y0;y<44;y++)for(let x=7;x<41;x++){const e=Math.abs(x-23.5)/17;if(e>1)continue;const bark=((x+((y>>3)&1)*3)%6===0)||hsh(x>>1,y>>2)>.86;p.set(x,y,x<14?(bark?'531':'642'):x>33?(bark?'200':'310'):(bark?'310':'531'));}
  p.ell(24,44,17,4,['531','421','310']);p.ell(24,y0,17,5.5,['764','653','542']);p.ell(24,y0,11,3.4,'542');p.ell(24,y0,6,1.8,'653');
  for(const[lx,ly]of[[8,y0-6],[18,y0-9],[31,y0-8],[39,y0-4]]){p.ell(lx,ly,5,3,['362','251','141']);p.line(lx,ly+2,lx+(lx<24?3:-3),y0-1,'141');}
  p.poly([12,24+sq,20,27+sq,20,31+sq,12,29+sq],'760');p.poly([35,24+sq,27,27+sq,27,31+sq,35,29+sq],'760');p.rect(16,27+sq,3,3,'711');p.rect(28,27+sq,3,3,'711');
  p.poly([15,35,32,35,29,40,18,40],'101');for(let x=17;x<31;x+=3){p.set(x,35,'775');p.set(x,36,'775');}
  p.poly([3,40,9,34,11,44],'421');p.poly([44,40,38,34,36,44],'310');p.outline();return spr(p,24,47);}
function boss2(f){const p=new Pix(64,44),cl=f?-5:0;
  for(let i=0;i<3;i++){p.line(16-i*2,30+i*2,6-i*2,38+i,'611');p.line(16-i*2,31+i*2,6-i*2,39+i,'400');p.line(47+i*2,30+i*2,57+i*2,38+i,'611');p.line(47+i*2,31+i*2,57+i*2,39+i,'400');}
  p.ell(32,27,19,11,['744','722','400']);p.ell(32,23,15,6,['755','733','611']);for(const[sx,sy]of[[24,20],[32,18],[40,20],[28,25],[37,25]])p.ell(sx,sy,1.6,1.2,'755');
  p.rect(26,10,2,9,'611');p.rect(36,10,2,9,'611');p.ell(27,9,3,3,'777');p.ell(37,9,3,3,'777');p.rect(27,9,2,2,OL);p.rect(37,9,2,2,OL);
  p.poly([24,33,40,33,36,37,28,37],'300');
  p.ell(9,22+cl,9,7,['755','722','400']);p.poly([3,16+cl,10,8+cl,10,17+cl],'733');p.poly([14,15+cl,17,7+cl,11,16+cl],'611');
  p.ell(55,22+cl,9,7,['744','611','400']);p.poly([61,16+cl,54,8+cl,54,17+cl],'722');p.poly([50,15+cl,47,7+cl,53,16+cl],'611');
  p.outline();return spr(p,32,41);}
function boss3(f){const p=new Pix(56,66),st=f?2:0;
  p.rect(15,50,9,12-st,'531');p.rect(32,50,9,12,'420');p.rect(13,60-st,13,4,'764');p.rect(30,60,13,4,'653');
  p.ell(28,36,16,17,['775','764','531']);p.ell(28,38,10,10,['764','653','420']);p.ell(28,37,5,5,['777','760','730']);p.ell(28,37,2.4,2.4,'777');
  for(let a=0;a<8;a++){const an=a*Math.PI/4+f*.39;p.line(28+Math.cos(an)*6,37+Math.sin(an)*6,28+Math.cos(an)*8.5,37+Math.sin(an)*8.5,'760');}
  p.ell(8,36+st,7,9,['775','764','531']);p.ell(48,36-st,7,9,['764','653','420']);p.ell(8,48+st,6,6,['777','764','531']);p.ell(48,48-st,6,6,['775','653','420']);
  p.ell(28,13,8,8,['775','764','531']);p.rect(22,12,12,3,'101');p.rect(23,13,3,1,'711');p.rect(30,13,3,1,'711');p.set(24,13,'771');p.set(31,13,'771');
  p.poly([28,-2,31,6,25,6],'760');p.poly([20,3,24,8,20,9],'760');p.poly([36,3,32,8,36,9],'760');p.rect(24,18,8,2,'420');
  p.outline();return spr(p,28,64);}
/* 길잡이 등불 정령 */
function lumi(f){const p=new Pix(14,16);p.ell(7,8,4.5,4.5,['777','771','750']);p.set(5,7,OL);p.set(9,7,OL);p.set(5,8,OL);p.set(9,8,OL);p.poly([7,0+f,9,4,5,4],'771');p.set(2-0,5+f,'771');p.set(12,11-f,'771');p.set(7,13+f,'750');p.outline('420');return spr(p,7,14);}

/* ---------------- 소품 ---------------- */
function tree(){const p=new Pix(48,62);p.rect(21,38,6,20,'531');p.rect(21,38,2,20,'642');p.rect(26,38,1,20,'310');p.poly([18,58,21,52,27,52,31,58],'421');
  for(const[x,y,r]of[[24,20,15],[13,27,10],[35,27,10],[18,13,9],[31,12,9],[24,32,11]])p.ell(x,y,r,r*.85,['362','251','141']);
  for(let i=0;i<46;i++){const x=6+hsh(i,1)*36,y=6+hsh(i,2)*32;if(p.has(x|0,y|0)){p.set(x,y,hsh(i,3)>.5?'473':'031');}}
  for(const[x,y]of[[14,22],[30,30],[22,10],[36,20]]){p.set(x,y,'722');p.set(x+1,y,'711');}
  p.outline();return spr(p,24,58);}
function palm(){const p=new Pix(52,60);for(let i=0;i<30;i++){const x=24+Math.round(Math.sin(i/30*1.2)*5),y=56-i;p.rect(x,y,4,1,(i%4===0)?'310':'642');p.set(x,y,'653');p.set(x+3,y,'420');}
  const cx=30,cy=24;for(const[ex,ey,sag]of[[6,20,8],[2,32,6],[16,10,3],[40,8,3],[50,20,8],[48,34,7],[28,6,1]]){for(let t=0;t<=1;t+=.04){const x=cx+(ex-cx)*t,y=cy+(ey-cy)*t-Math.sin(t*Math.PI)*sag;p.rect(x,y,2,2+Math.round((1-t)*2),t>.6?'141':'251');p.set(x,y,'362');}}
  p.ell(29,26,2.5,2.5,'531');p.ell(33,25,2.2,2.2,'420');p.outline();return spr(p,26,58);}
function bush(){const p=new Pix(26,20);for(const[x,y,r]of[[13,9,7],[7,12,5],[19,12,5],[13,13,6]])p.ell(x,y,r,r*.8,['362','251','141']);for(const[x,y]of[[9,8],[16,7],[13,12],[19,13],[6,13]]){p.set(x,y,'473');}p.set(11,10,'722');p.set(17,11,'722');p.outline();return spr(p,13,18);}
function rock(){const p=new Pix(26,22);p.poly([3,17,5,8,12,3,20,5,24,13,21,19,7,20],(x,y)=>(x+y<20?'667':x>16||y>15?'334':'445'));p.line(12,4,14,10,'334');p.line(14,10,20,12,'334');p.set(7,9,'777');p.set(8,8,'777');p.outline();return spr(p,13,20);}
function pot(){const p=new Pix(18,22);p.ell(9,13,6.5,7,['764','642','420']);p.rect(5,3,8,3,'531');p.rect(4,2,10,2,'653');p.rect(5,2,3,1,'775');p.rect(4,11,10,1,'750');p.set(5,9,'775');p.set(6,8,'775');p.outline();return spr(p,9,20);}
function sign(){const p=new Pix(22,26);p.rect(10,10,3,14,'531');p.rect(10,10,1,14,'642');p.rect(2,2,18,10,'653');p.rect(2,2,18,1,'775');p.rect(2,11,18,1,'421');for(const y of[4,6,8])p.rect(5,y,12,1,'421');p.outline();return spr(p,11,25);}
function torch(f){const p=new Pix(16,38);p.rect(4,16,8,20,'445');p.rect(4,16,2,20,'556');p.rect(10,16,2,20,'223');p.rect(2,33,12,3,'334');p.rect(2,14,12,3,'556');p.rect(2,16,12,1,'223');
  p.poly([8,2+f*2,12,9,11,14,5,14,4,9],'730');p.poly([8,6+f,10,10,9,14,7,14,6,10],'751');p.set(8,11,'777');p.set(8,12,'771');p.set(3+f*8,5,'751');p.outline();return spr(p,8,36);}
function statue(f){const p=new Pix(30,44);p.poly([3,42,6,34,24,34,27,42],'445');p.rect(6,34,18,1,'667');p.rect(9,22,12,12,'556');p.rect(9,22,3,12,'667');p.rect(18,22,3,12,'334');
  for(let a=0;a<8;a++){const an=a*Math.PI/4+f*.39;p.line(15+Math.cos(an)*8,12+Math.sin(an)*8,15+Math.cos(an)*12,12+Math.sin(an)*12,f?'771':'760');}
  p.ell(15,12,8,8,['777','771','750']);p.set(12,11,OL);p.set(18,11,OL);p.set(12,12,OL);p.set(18,12,OL);p.rect(13,15,5,1,'730');p.outline();return spr(p,15,42);}
function chest(open){const p=box(1,1,1.5,1.5,(U,V)=>{const su=U&15,sv=V&15;return open?((su<2||sv<2||su>13||sv>13)?'531':'101'):((su===7||su===8)?'760':(su<1||sv<1)?'310':'642');},
    (X,Z,dz,R)=>{const xx=((X%16)+16)%16;if(xx===7||xx===8)return R?'750':'771';if(dz===0||dz===11)return R?'310':'421';if(dz===5)return R?'420':'760';return R?'421':'531';});
  const q=new Pix(32,40);q.blit(p,0,12);
  if(open){q.poly([4,13,16,7,28,13,28,3,16,-3,4,3],'531');q.poly([16,7,28,13,28,3,16,-3],'421');q.rect(15,-2,2,10,'760');for(let x=5;x<28;x+=5)q.set(x,8+Math.abs(16-x)/-2,'771');}
  else{q.rect(15,23,3,4,'771');q.set(16,25,OL);}
  q.outline();return spr(q,16,20);}
const crateP=()=>{const p=box(1,1,2,2,(U,V)=>{const su=U&15,sv=V&15;if(su<2||sv<2||su>13||sv>13)return'421';return(Math.abs(su-sv)<2||Math.abs(su+sv-15)<2)?'421':hsh(U,V)>.9?'531':'642';},
    (X,Z,dz,R)=>{const xx=((X%16)+16)%16;if(xx<2||xx>13||dz<2||dz>13)return R?'310':'421';return(Math.abs(xx-dz)<2||Math.abs(xx+dz-15)<2)?(R?'310':'421'):(R?'421':'531');});p.outline();return p;};
function gateP(kind){const p=box(1,1,4,4,(U,V)=>{const su=U&15,sv=V&15;if(su<1||sv<1)return'223';if(su>4&&su<11&&sv>4&&sv<11)return kind==='lock'?'760':kind==='clear'?'611':'257';return'556';},
    (X,Z,dz,R)=>{const xx=((X%16)+16)%16;if(xx===0||dz%16===0)return R?'112':'223';if(dz>8&&dz<24&&xx>4&&xx<12){const cx2=Math.abs(xx-8),cy2=Math.abs(dz-16);
        if(kind==='lock')return(cx2<2&&cy2<4)||(cx2<3&&dz<16&&cy2<6&&cy2>1)?'101':(R?'750':'771');if(kind==='clear')return cx2+cy2<7?(R?'400':'711'):(R?'334':'445');return cx2+cy2<6?(R?'136':'257'):(R?'334':'445');}
      return R?'334':'445';});p.outline();return p;}
function platP(w,d){const p=box(w,d,1,1,(U,V)=>{const su=U%(w*16),sv=V%(d*16);if(su<2||sv<2||su>w*16-3||sv>d*16-3)return'750';return((U>>2)+(V>>2))&1?'556':'445';},(X,Z,dz,R)=>dz===0?(R?'531':'760'):(R?'223':'334'));p.outline();return p;}
function switchS(on){const p=new Pix(32,18);p.ell(16,10,10,5,['667','445','223']);p.ell(16,on?10:8,7,3.5,on?['611','400','300']:['755','722','400']);if(!on)p.ell(14,7,2,1,'777');p.outline();return spr(p,16,10);}
function hut(){const b=box(2,2,5,5,TOP.wood,(X,Z,dz,R)=>{const xx=((X%32)+32)%32;if(!R&&xx>9&&xx<22&&dz>12)return(xx===10||xx===21||dz===13)?'310':'101';if(R&&xx>10&&xx<22&&dz>8&&dz<22)return(xx===11||xx===21||dz===9||dz===21||xx===16||dz===15)?'310':'257';return SIDE.wood(X,Z,dz,R);});
  const p=new Pix(80,96);p.blit(b,8,24);
  const th=(x,y)=>((x+y*2)%5===0)?'531':(hsh(x,y>>1)>.7?'764':'653'),th2=(x,y)=>((x-y*2+99)%5===0)?'310':(hsh(x,y>>1)>.7?'542':'531');
  p.poly([40,2,2,44,40,62],th);p.poly([40,2,78,44,40,62],th2);p.line(40,2,40,62,'775');p.outline();return spr(p,40,24+32);}
function coin(f){const p=new Pix(10,12),w=[4,3,1,3][f];p.ell(5,6,w,4.5,['771','760','530']);if(w>2){p.rect(5,4,1,5,'530');}p.set(5-Math.max(0,w-2),4,'777');p.outline();return spr(p,5,11);}
function heartS(){const p=new Pix(12,12);p.ell(4,4.5,2.6,2.6,'722');p.ell(8,4.5,2.6,2.6,'722');p.poly([1.5,5.5,10.5,5.5,6,10.5],'611');p.set(3,3,'777');p.outline();return spr(p,6,11);}
function keyS(){const p=new Pix(12,16);p.ell(6,4.5,3.5,3.5,'760');p.ell(6,4.5,1.4,1.4,'420');p.rect(5,8,2,6,'760');p.rect(7,10,2,1,'760');p.rect(7,12,2,1,'760');p.set(5,2,'777');p.outline();return spr(p,6,15);}
function herbS(){const p=new Pix(14,16);p.rect(6,7,2,7,'141');p.ell(4,6,3,2.2,['362','251','141']);p.ell(10,6,3,2.2,['362','251','141']);p.ell(7,3,2.4,2.6,['755','722','611']);p.set(6,2,'777');p.outline();return spr(p,7,15);}
function gemS(cols){const p=new Pix(14,16);p.poly([7,1,12,6,7,14,2,6],(x,y)=>x<6?cols[0]:x>8?cols[2]:cols[1]);p.line(2,6,12,6,cols[0]);p.set(5,4,'777');p.outline();return spr(p,7,15);}
function swordS(lv){const p=new Pix(16,18),c=[['777','556'],['677','257'],['771','730']][lv-1];p.line(11,2,5,10,c[0]);p.line(12,3,6,11,c[1]);p.line(10,2,4,10,c[0]);p.line(3,9,8,13,'760');p.line(4,12,2,15,'531');p.set(2,16,'760');p.outline();return spr(p,8,16);}
function sunS(){const p=new Pix(20,20);for(let a=0;a<8;a++){const an=a*Math.PI/4;p.line(10+Math.cos(an)*5,10+Math.sin(an)*5,10+Math.cos(an)*8.5,10+Math.sin(an)*8.5,'760');}p.ell(10,10,5,5,['777','771','750']);p.set(8,9,'730');p.set(12,9,'730');p.outline('420');return spr(p,10,18);}
function emblemS(cols){const p=new Pix(16,18);p.poly([8,1,14,4,14,10,8,16,2,10,2,4],(x,y)=>x<7?cols[0]:cols[1]);p.ell(8,8,2.5,2.5,'777');p.outline();return spr(p,8,17);}
/* 효과 */
function slash(dir,f){const p=new Pix(44,40),c=[22,22];const a0=[-.5,1.2,2.7,-2.3][dir],sw=1.9,prog=[.45,.8,1][f];
  for(let a=0;a<=sw*prog;a+=.03){const an=a0+a,tail=a/(sw*prog);for(let r=12;r<=17;r++){const x=c[0]+Math.cos(an)*r,y=c[1]+Math.sin(an)*r*.62;if(tail<.25&&r>14)continue;
      p.set(x,y,r>15?'777':tail>.6?'677':(dth(x|0,y|0,.5)?'367':'257'));}}
  return spr(p,22,26);}
function puff(f){const p=new Pix(20,14),r=2+f*1.6;for(const[x,y]of[[6,8],[13,7],[10,10-f]])p.ell(x+(x<10?-f:f),y,r*.8,r*.6,f>1?'556':'667');return spr(p,10,12);}
function spark(f){const p=new Pix(18,18),r=2+f*3;p.line(9-r,9,9+r,9,'771');p.line(9,9-r,9,9+r,'771');p.line(9-r*.6,9-r*.6,9+r*.6,9+r*.6,'777');p.line(9-r*.6,9+r*.6,9+r*.6,9-r*.6,'777');if(f<2)p.ell(9,9,2,2,'777');return spr(p,9,9);}
function splash(f){const p=new Pix(26,16);const r=4+f*3;for(let a=0;a<6.28;a+=.5){const x=13+Math.cos(a)*r,y=10+Math.sin(a)*r*.45-(f<2?f*2:1);p.set(x,y,'677');p.set(x,y+1,'257');}if(f<2)p.rect(12,4-f*2,2,6,'677');return spr(p,13,12);}
function shadow(r){const p=new Pix(r*2+2,r+2);for(let y=0;y<r+2;y++)for(let x=0;x<r*2+2;x++){const dx=(x+.5-r-1)/r,dy=(y+.5-r/2-1)/(r/2);const d=dx*dx+dy*dy;if(d<1&&(d<.5||((x+y)&1)))p.set(x,y,'101');}return spr(p,r+1,r/2+1);}
function heartIcon(k){const p=new Pix(11,10);const c=k===2?['755','722','400']:k===1?['755','722','400']:['223','112','112'];
  p.ell(3.5,3.5,2.6,2.6,k?c[1]:'112');p.ell(7.5,3.5,2.6,2.6,k===2?c[1]:'112');p.poly([1,4.5,10,4.5,5.5,9.5],(x)=>k===2?c[1]:k===1?(x<5.5?c[1]:'112'):'112');
  if(k===1){for(let y=0;y<10;y++)for(let x=6;x<11;x++)if(p.has(x,y))p.set(x,y,'112');}
  if(k)p.set(2,2,'777');p.outline(k?'300':'334');return spr(p,0,0);}
function sunLogo(){const p=new Pix(72,72);for(let a=0;a<16;a++){const an=a*Math.PI/8,l=a&1?27:33;p.poly([36+Math.cos(an-.11)*18,36+Math.sin(an-.11)*18,36+Math.cos(an)*l,36+Math.sin(an)*l,36+Math.cos(an+.11)*18,36+Math.sin(an+.11)*18],a&1?'750':'760');}
  p.ell(36,36,19,19,['777','771','750']);p.ell(36,36,14,14,['771','760','730']);p.ell(36,36,8,8,['777','771','760']);
  p.rect(30,32,3,4,'420');p.rect(39,32,3,4,'420');p.poly([30,40,42,40,36,44],'730');p.outline('310');return spr(p,36,36);}

/* ---------------- 전체 묶음 ---------------- */
function build(){
  const S={};
  S.hero=heroSet();
  S.slash=[0,1,2,3].map(d=>[0,1,2].map(f=>slash(d,f)));
  S.slimeG=[0,1,2].map(f=>slime(['473','251','031'],f));S.slimeB=[0,1,2].map(f=>slime(['477','147','025'],f));S.slimeR=[0,1,2].map(f=>slime(['755','722','400'],f));
  S.bat=[bat(0),bat(1)];S.mush=[mush(0),mush(1)];S.wisp=[wisp(0),wisp(1)];S.turret=[turret()];S.skel=[skel(0),skel(1)];
  S.fire=[fireball(0),fireball(1)];S.bubble=[bubble()];
  S.boss1=[boss1(0),boss1(1)];S.boss2=[boss2(0),boss2(1)];S.boss3=[boss3(0),boss3(1)];
  S.lumi=[lumi(0),lumi(1)];
  const N=(o)=>[person(Object.assign({npc:1,ph:0},o)),person(Object.assign({npc:1,ph:1},o))];
  S.elder=N({robe:1,style:'bald',top:['537','426','214'],beard:['777','667','556'],staff:1,trim:'760',belt:false});
  S.merchant=N({style:'turban',top:['751','640','420'],pack:1,stache:'310',boot:['531','421','310']});
  S.kid=N({kid:1,style:'cap',hat:['257','136','024'],hair:['642','531','310'],top:['772','750','530'],boot:['531','421','310']});
  S.guard=N({style:'helmet',top:['667','445','223'],spear:1,chest:'711',boot:['445','334','223'],belt:'223'});
  S.woman=N({robe:1,style:'long',hair:['742','631','410'],top:['746','624','402'],trim:'777',belt:'777'});
  S.sailor=N({style:'cap',hat:['777','667','445'],hair:['310','200','100'],top:['777','667','446'],chest:'136',boot:['136','024','013']});
  S.tree=[tree()];S.palm=[palm()];S.bush=[bush()];S.rock=[rock()];S.pot=[pot()];S.sign=[sign()];S.torch=[torch(0),torch(1)];S.statue=[statue(0),statue(1)];
  S.chest=[chest(0),chest(1)];S.hut=[hut()];
  S.crate=[spr(crateP(),16,16)];S.gate=[spr(gateP('sw'),16,16)];S.gateC=[spr(gateP('clear'),16,16)];S.lock=[spr(gateP('lock'),16,16)];
  S.switch=[switchS(0),switchS(1)];
  S.coin=[0,1,2,3].map(coin);S.heart=[heartS()];S.key=[keyS()];S.herb=[herbS()];S.gem=[gemS(['477','257','025'])];
  S.sword=[swordS(1),swordS(2),swordS(3)];S.sun=[sunS()];S.emb1=[emblemS(['473','141'])];S.emb2=[emblemS(['477','136'])];S.cont=[gemS(['755','722','400'])];
  S.puff=[0,1,2].map(puff);S.spark=[0,1,2].map(spark);S.splash=[0,1,2].map(splash);
  S.sh=[shadow(5),shadow(8),shadow(13),shadow(20)];
  S.hp=[heartIcon(0),heartIcon(1),heartIcon(2)];S.logo=[sunLogo()];
  S.plat={};
  for(const k in S){if(Array.isArray(S[k])&&S[k][0]&&S[k][0].c)S[k].W=S[k].map(whiteOf);}
  for(let d=0;d<4;d++)for(const k in S.hero[d])S.hero[d][k].W=S.hero[d][k].map(whiteOf);
  return S;
}
function plat(S,w,d){const k=w+'x'+d;return S.plat[k]||(S.plat[k]=spr(platP(w,d),d*16,0));}
return{build,cell,box,plat,Pix,TILE,rgb,hsh,vn,dth,mirS,whiteOf,spr};
})();
