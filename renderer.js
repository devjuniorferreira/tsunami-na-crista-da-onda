/* Pixel-art renderer. The world (600 units tall) is drawn at one pixel per 3 units on a small canvas,
   then scaled up by CSS without smoothing: crisp pixels and very little work per frame. */
const PX=3,GROUND=167;
const X=v=>Math.round(v/PX);
const ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
const WALLS={
 wave:['#effcf6','#9fe3d6','#56b6bd','#2d84a0','#1d5779','#7fd0cf','#f6fffb'],
 lava:['#fff3b0','#ffc94d','#f47a2a','#c8401e','#7c2214','#ffd36a','#3a1712'],
 stone:['#a39d96','#8a8580','#6f6a66','#5c5753','#45413e','#7d7873','#b5afa8']
};
class PixelRenderer {
 constructor(canvas){this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});this.layers=new Map();this.width=1100;this.W=367;this.sharkY=100;Art.build();this.resize();}
 resize(){
  const box=(this.canvas.parentElement||this.canvas).getBoundingClientRect(),bw=box.width||1100,bh=box.height||600;
  this.scale=Math.min(bh/600,bw/660);this.width=bw/this.scale;this.offsetY=(bh-600*this.scale)/2;
  const w=Math.ceil(this.width/PX);if(this.canvas.width!==w||this.canvas.height!==200){this.canvas.width=w;this.canvas.height=200;}
  this.W=w;Object.assign(this.canvas.style,{width:bw+'px',height:600*this.scale+'px',marginTop:this.offsetY+'px'});this.c.imageSmoothingEnabled=false;
 }
 layer(key,w,h,draw){const k=key+':'+w+'x'+h;let c=this.layers.get(k);if(!c){const s=new Surface(w,h);draw(s,w,h);c=s.canvas();this.layers.set(k,c);}return c;}
 rect(x,y,w,h,color){const c=this.c;c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
 img(c,x,y){this.c.drawImage(c,Math.round(x),Math.round(y));}
 foot(c,x,y){this.c.drawImage(c,Math.round(x-c.width/2),Math.round(y-c.height));}
 center(c,x,y){this.c.drawImage(c,Math.round(x-c.width/2),Math.round(y-c.height/2));}
 strip(c,offset,y){const w=c.width,o=((Math.round(offset)%w)+w)%w;for(let x=-o;x<this.W;x+=w)this.c.drawImage(c,x,Math.round(y));}
 alpha(a,draw){const c=this.c,before=c.globalAlpha;c.globalAlpha=Math.max(0,Math.min(1,a));draw();c.globalAlpha=before;}
 spin(img,x,y,angle){const c=this.c;c.save();c.translate(Math.round(x),Math.round(y));c.rotate(angle);c.drawImage(img,-Math.round(img.width/2),-Math.round(img.height/2));c.restore();}
 hero(name,i,x,y){const set=Art.hero[name],f=Array.isArray(set)?set[((i%set.length)+set.length)%set.length]:set;this.c.drawImage(f,Math.round(x-f.width/2),Math.round(y-46));}
 fill(color,a=1){if(a>0)this.alpha(a,()=>this.rect(0,0,this.W,200,color));}
 blob(x,y,r,color){const c=this.c;c.fillStyle=color;x=Math.round(x);y=Math.round(y);r=Math.max(1,Math.round(r));for(let j=-r;j<=r;j++){const w=Math.round(Math.sqrt(r*r-j*j));c.fillRect(x-w,y+j,w*2+1,1);}}
 // Draws into an offscreen layer and blends it in; one canvas per nesting level, so groups can contain groups.
 group(a,draw){if(a<=0)return;const depth=this.depth||0,fxs=this.fxs||(this.fxs=[]),fx=fxs[depth]||(fxs[depth]=document.createElement('canvas'));if(fx.width!==this.W||fx.height!==200){fx.width=this.W;fx.height=200;}const fc=fx.getContext('2d'),main=this.c;fc.setTransform(1,0,0,1,0,0);fc.imageSmoothingEnabled=false;fc.clearRect(0,0,fx.width,200);this.c=fc;this.depth=depth+1;try{draw();}finally{this.c=main;this.depth=depth;}this.alpha(a,()=>main.drawImage(fx,0,0));}

 /* ---------- Shared pieces ---------- */
 // A tsunami (or lava) wall, drawn column by column, with a curling lip and spray at the front.
 // tilt raises the surface behind the front, so a flow can pour down a slope.
 wall(front,groundY,crestY,kind,t,tilt=0){
  const c=this.c,k=WALLS[kind],face=16,lip=kind==='wave'?12:6;front=Math.round(front);
  for(let x=Math.min(front,this.W+lip);x>=0;x--){
   const u=front-x;let top=u<face?crestY+(groundY-crestY)*(1-u/face)**2:crestY+Math.sin(x*.21+t*3.2)*1.6+Math.min((groundY-crestY)*.45,(u-face)*.4);top=Math.round(top-Math.max(0,u)*tilt);
   c.fillStyle=u<2?k[0]:u<6?k[1]:u<14?k[2]:u<40?k[3]:k[4];c.fillRect(x,top,1,200-top);
   if(u>3){const s1=(u*5+Math.floor(t*40))%46;c.fillStyle=k[5];c.fillRect(x,top+4+s1,1,3);if(u>12&&x%3===0)c.fillRect(x,top+4+(s1+23)%46,1,2);}
   c.fillStyle=k[6];c.fillRect(x,top,1,u<face?1:2);
   if(kind==='lava'&&u>8&&(x*13+Math.floor(t*6))%17===0){c.fillStyle=k[0];c.fillRect(x,top+2,1,2);}
  }
  for(let i=-5;i<lip;i++){const x=front+i,v=(i+5)/(lip+5),top=Math.round(crestY-2+v*v*12),bottom=Math.round(crestY+4+v*(kind==='wave'?10:3));c.fillStyle=i>lip-4?k[6]:k[1];c.fillRect(x,top,1,Math.max(1,bottom-top));}
  c.fillStyle=k[6];
  for(let i=0;i<14;i++){const x=front-((i*7+t*30)%42),y=crestY-2-((i*13+t*40)%10);c.fillRect(Math.round(x),Math.round(y),1,1);}
  for(let i=0;i<10;i++){const x=front+(i*5+t*50)%14-2,y=groundY-((i*7+t*55)%16);c.fillRect(Math.round(x),Math.round(y),i%3?1:2,1);}
 }
 meteorTrail(x,y,dx,dy,length,t,size=1){
  const c=this.c,cols=['#fff6c8','#ffd75a','#ff9a3c','#e8582a','#a83a2a','#5a2a2a'],len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;
  for(let i=Math.round(length);i>0;i--){const f=i/length,w=Math.max(1,Math.round((1-f)*5*size)),jit=Math.sin(i*1.7+t*30)*f*2;c.fillStyle=cols[Math.min(5,Math.floor(f*6))];c.fillRect(Math.round(x-ux*i-w/2+uy*jit),Math.round(y-uy*i-w/2-ux*jit),w,w);}
 }
 shade(g){if(g.config.chase&&g.trips===2&&g.state==='playing')this.alpha(.2+Math.sin(g.time*6)*.07,()=>{this.rect(0,0,10,200,'#ff4a2a');this.rect(10,0,10,200,'#ff4a2a80');});}
 blink(g){return g.invincible>0&&g.state==='playing'&&Math.floor(g.time*14)%2===0;}
 splash(x,y,p,count=14){for(let i=0;i<count;i++){const d=i<count/2?-1:1;this.rect(x+d*(3+p*(7+i%7*3)),y-Math.sin(p*Math.PI)*(5+i%5*3),2,2,'#dcf7df');}}

 /* ---------- Cached layers ---------- */
 skyLayer(name,colors,extra){return this.layer('sky-'+name,this.W,200,(s,w)=>{s.vgrad(0,0,w,200,colors);if(extra)extra(s,w);});}
 smokePlume(s,x,base,top,color,core){const steps=Math.ceil((base-top)/4);for(let i=0;i<=steps;i++){const k=i/steps,y=base-k*(base-top),r=3+k*15,cx=x+Math.sin(k*4)*5+k*12;s.ditherDisc(cx,y,r,color,.85-k*.45);s.ditherDisc(cx-r*.25,y-r*.25,r*.55,core,.65-k*.4);}}
 skylineStrip(name,base,colors,lights,seed){return this.layer('skyline-'+name,256,base,(s,w,h)=>{const r=seededRandom(seed);for(let x=0;x<w;){const bw=10+Math.floor(r()*16),bh=14+Math.floor(r()*(h-20)),c=colors[Math.floor(r()*colors.length)];s.rect(x,h-bh,bw-1,bh,c);if(r()<.4)s.rect(x+Math.floor(bw/2),h-bh-5,1,5,c);for(let j=h-bh+3;j<h-3;j+=4)for(let i=x+2;i<x+bw-3;i+=3)if(r()<lights)s.plot(i,j,r()<.7?'#f7c46a':'#ffe9a8');x+=bw;}});}
 cloudStrip(name,colors,seed){return this.layer('clouds-'+name,300,50,(s,w)=>{const r=seededRandom(seed);for(let k=0;k<4;k++){const cx=20+k*75+r()*20,cy=14+r()*24;for(let i=0;i<4;i++)s.ellipse(cx+i*9-12,cy-(i%2)*3,9+r()*5,4+r()*2,colors[0]);s.dither(cx-24,cy-7,50,4,colors[1],.5);}});}
 towersLayer(){return this.layer('towers',this.W,120,(s,w,h)=>{const r=seededRandom(77);for(let x=0;x<w;){const bw=16+Math.floor(r()*22),bh=40+Math.floor(r()*70);s.rect(x,h-bh,bw-2,bh,r()<.5?'#3a2c4c':'#33284a');for(let j=h-bh+4;j<h;j+=6)for(let i=x+2;i<x+bw-4;i+=4)if(r()<.2)s.plot(i,j,'#f7c46a');x+=bw+4;}});}

 /* ---------- Phase 1: the avenue ---------- */
 avenue(g,scroll){
  const W=this.W;
  this.img(this.skyLayer('avenue',['#1f2547','#3a2f5c','#6e3a5e','#b8505a','#e98a5a','#f8c47e','#f8c47e','#f8c47e'],(s,w)=>{
   s.ditherDisc(w*.78,63,17,'#ffd28a',.3);s.ditherDisc(w*.78,63,13,'#ffd9a0',.45);s.disc(w*.78,63,9,'#ffe2a8');s.disc(w*.78,63,6,'#fff3cf');
   s.vgrad(0,112,w,16,['#2f6f86','#3f8ea0','#5aa9b0']);for(let k=0;k<30;k++)s.rect((k*37)%w,114+(k*5)%12,4+k%3*2,1,'#8fd0cf');
   s.rect(0,127,w,10,'#d8b98a');s.dither(0,129,w,8,'#c4a376',.3);s.rect(0,127,w,1,'#f1e6c8');
  }),0,0);
  this.strip(this.cloudStrip('dusk',['#6a3f63','#9a5568'],3),scroll*.03,8);
  this.strip(this.skylineStrip('avenue',64,['#3a3456','#463d63','#2f2b4a'],.25,11),scroll*.12,56);
  for(let k=0;k<10;k++){const x=((k*53-scroll*.3)%W+W)%W;this.rect(x,114+(k*7)%12,3,1,'#d6f3ee');}
  const near=scroll*.55;
  this.strip(this.layer('avenue-near',330,72,(s)=>{
   const b=(x,seed)=>{const r=seededRandom(seed),h=44+Math.floor(r()*14),cols=[['#e0a77e','#b97a5c'],['#b8cfc5','#86a8a1'],['#b4c4d3','#8597a8'],['#e2b9a0','#b88f7c']][seed%4];
    s.rect(x,72-h,44,h,cols[0]);s.rect(x+38,72-h,6,h,cols[1]);s.rect(x-2,72-h-3,48,3,'#efdbb7');
    for(let y=72-h+6;y<72-22;y+=12)for(let xx=x+5;xx<x+36;xx+=10){s.rect(xx-1,y-1,8,10,'#decfb1');s.rect(xx,y,6,8,'#3e5a78');s.plot(xx+1,y+1,'#9ac0d6');s.rect(xx-1,y+8,8,1,'#5d6d78');}
    s.rect(x+3,72-20,38,4,['#d06f58','#3f8f8a','#e0a24a','#6a7fc4'][seed%4]);for(let i=0;i<38;i+=4)s.rect(x+3+i,72-20,2,4,'#f0e2c0');
    s.rect(x+4,72-16,36,16,'#2f4656');for(let xx=x+6;xx<x+38;xx+=8)s.rect(xx,72-14,6,13,'#6a9aa6');s.rect(x+17,72-14,8,14,'#3b2a24');};
   b(110,1);b(220,2);
   for(const lx of [92,175,265]){s.rect(lx,20,2,52,'#334d5c');s.rect(lx-4,18,8,2,'#334d5c');s.rect(lx-3,20,6,1,'#ffe5a7');}
  }),near,75);
  for(let id=Math.floor((near-60)/330);id*330-near<W+60;id++)this.foot(Art.palm,id*330-near+55,149);
  // Railing, promenade and road scroll with the runner.
  this.rect(0,136,W,1,'#6e7f7c');this.rect(0,141,W,1,'#6e7f7c');for(let x=-(Math.round(scroll)%23);x<W;x+=23)this.rect(x,136,2,11,'#536a6b');
  this.rect(0,147,W,7,'#b9a68c');for(let x=-(Math.round(scroll)%12);x<W;x+=12)this.rect(x,147,1,7,'#a39078');
  this.rect(0,154,W,2,'#e3cfa8');this.rect(0,156,W,1,'#9c8a6c');
  this.strip(this.layer('road',128,43,(s,w,h)=>{s.vgrad(0,0,w,h,['#4a5961','#3a4850','#2d3a42']);const r=seededRandom(5);for(let k=0;k<70;k++)s.plot(Math.floor(r()*w),Math.floor(r()*h),r()<.5?'#56656d':'#28333a');}),scroll,157);
  for(let x=-(Math.round(scroll)%40);x<W;x+=40)this.rect(x,182,16,2,'#e8cf8f');
 }
 runPhase(g){
  const t=g.time,scroll=g.scroll/PX;this.avenue(g,scroll);
  const bx=X(300+Math.max(0,300-g.distance)*260/12);if(bx<this.W+30){this.foot(Art.rack,bx,GROUND+2);this.foot(Art.boardUp,bx-1,GROUND-6);}
  for(const o of g.objects)this.foot({log:Art.log,cooler:Art.cooler}[o.type],X(o.x),GROUND+2);
  this.alpha(.35,()=>this.rect(90+Math.min(4,g.y/30),GROUND,20-Math.min(10,g.y/15),2,'#10141c'));
  const y=GROUND-g.y/PX;
  if(g.state==='caught')this.spin(Art.hero.stumbleA,100-g.caughtTime*10,y-20+g.caughtTime*14,g.caughtTime*3);
  else if(!this.blink(g)){
   if(g.stumble>0)this.hero(Math.floor(t*10)%2?'stumbleA':'stumbleB',0,100,y);
   else if(g.y>0)this.hero(g.vy>0?'jumpUp':'fall',0,100,y);
   else if(g.land>0)this.hero('land',0,100,y);
   else if(g.speed<20)this.hero('idle',0,100,y);
   else this.hero('run',Math.floor(g.runCycle*8),100,y);
  }
  if(g.stumble>0)for(let i=0;i<6;i++){const u=(t*2+i*.17)%1;this.rect(92-u*14,GROUND-u*6,2,1,'#c9b48e');}
  this.wall(X(g.waveFront),GROUND+4,52,'wave',t);
  this.shade(g);
 }

 /* ---------- Phase 2: surfing the flooded city ---------- */
 waterBase(g,scroll){
  const W=this.W;
  this.img(this.skyLayer('storm',['#141a33','#2a2a4f','#523458','#8a4558','#c66a5a','#c66a5a'],(s,w)=>{s.ditherDisc(w*.8,40,13,'#f0a07a',.3);s.disc(w*.8,40,7,'#f0b48a');}),0,0);
  this.strip(this.cloudStrip('storm',['#2c2440','#4a3550'],9),scroll*.05,6);
  this.strip(this.skylineStrip('flooded',64,['#2a2742','#332e4f','#252238'],.12,23),scroll*.12,70);
  this.img(this.layer('flood',W,73,(s,w,h)=>s.vgrad(0,0,w,h,['#3f8ea0','#2a6f8a','#1d4f6e','#163a57'])),0,127);
  for(let k=0;k<12;k++){const y=129+k*6,step=18+k%3*4,o=((scroll*(1+k*.08)+k*7)%step+step)%step;for(let x=-o;x<W;x+=step)this.rect(x+Math.sin(g.time*2+k+x*.1)*1.5,y,5+k%3*2,1,k%3?'#5aa3b2':'#9fd8d2');}
 }
 surfPhase(g){
  const t=g.time,scroll=g.scroll/PX;this.waterBase(g,scroll);
  this.wall(X(148),142,40,'wave',t);
  for(const o of g.objects){const y=X(396+o.y*155)+5+Math.round(Math.sin(t*2+(o.seed||0))),img=o.type==='car'?Art.cars[o.variant||0]:Art.debris,x=X(o.x);this.foot(img,x,y);this.alpha(.55,()=>this.rect(x-img.width/2,y-3,img.width,3,'#2a6f8a'));this.rect(x-img.width/2-2,y-3,img.width+4,1,'#cfeee6');}
  const lift=g.jumpTime>0?Math.sin(g.jumpTime/.9*Math.PI)*105:0,px=X(g.playerX),water=X(396+g.surfY*155),py=X(396+g.surfY*155-lift);
  for(let i=0;i<10;i++){const u=(t*1.7+i*.1)%1;this.rect(px-16-u*22,water+1-u*4+u*u*6,2-Math.round(u),1,'#e4f6de');}
  if(g.state==='caught'){this.spin(Art.hero.stumbleA,px,py-14+g.caughtTime*10,g.caughtTime*4);this.alpha(.75,()=>this.rect(0,160-g.caughtTime*18,this.W,60,'#268ca7'));}
  else if(!this.blink(g)){this.foot(Art.board,px,py+3);this.hero(g.jumpTime>0?'surfJump':g.surfVelocity<-.25?'surfUp':g.surfVelocity>.25?'surfDown':'surf',0,px,py);}
 }

 /* ---------- Phase 3: under the sea, chased by a shark ---------- */
 underwater(g,scroll){
  const W=this.W,t=g.time;
  this.img(this.skyLayer('deep',['#58b8c8','#2f8eae','#1f6890','#164a72','#0f3156','#0b2442','#0a1d38']),0,0);
  this.alpha(.08,()=>{const c=this.c;c.fillStyle='#e8fff8';for(let k=0;k<6;k++){const x=k*W/6+Math.sin(t*.4+k)*6;c.beginPath();c.moveTo(x,0);c.lineTo(x+12,0);c.lineTo(x-28,150);c.lineTo(x-44,150);c.fill();}});
  for(let x=0;x<W;x+=4)this.rect(x,Math.round(2+Math.sin(x*.2+t*3)*1.5),4,1,'#bdf2ee');
  this.strip(this.layer('ruins',260,96,(s,w,h)=>{const r=seededRandom(31);for(let x=0;x<w;){const bw=18+Math.floor(r()*20),bh=30+Math.floor(r()*60);s.rect(x,h-bh,bw-3,bh,'#123a5c');for(let j=h-bh+4;j<h-4;j+=7)for(let i=x+3;i<x+bw-6;i+=5)s.rect(i,j,2,3,'#0d2d49');if(r()<.5)s.poly([[x,h-bh],[x+bw-3,h-bh+6],[x+bw-3,h-bh]],'#0f3352');x+=bw+Math.floor(r()*10);}}),scroll*.2,92);
  this.strip(this.layer('seabed',200,22,(s,w,h)=>{s.vgrad(0,4,w,h-4,['#c2a46e','#a88a58','#8a703f']);for(let x=0;x<w;x++)s.rect(x,3+Math.round(Math.sin(x*.15)*2),1,3,'#d6bb84');const r=seededRandom(8);for(let k=0;k<10;k++){const x=r()*w;s.ellipse(x,8+r()*8,3+r()*4,2+r()*2,'#6c6a72');}for(let k=0;k<6;k++)s.plot(r()*w,10+r()*10,'#f2d8c0');}),scroll*.8,180);
  for(let id=Math.floor((scroll*.8-20)/37);id*37-scroll*.8<W+20;id++){const x=id*37-scroll*.8+(((id*13)%17)+17)%17,h=10+((((id*7)%4)+4)%4)*5;for(let j=0;j<h;j++)this.rect(x+Math.sin(t*1.8+j*.35+id)*(j*.18),186-j*1.6,2,2,j%2?'#2f7a4a':'#3f9a5a');}
  for(let i=0;i<7;i++){const x=(W+40)-((t*18+i*53)%(W+80)),y=60+((i*37)%70)+Math.sin(t*2+i)*3;this.rect(x,y,3,2,'#e0b64a');this.rect(x+3,y,1,2,'#c69a3a');}
 }
 swimPhase(g){
  const t=g.time,scroll=g.scroll/PX;this.underwater(g,scroll);
  for(const o of g.objects){const x=X(o.x);if(o.type==='jelly')this.center(Art.jelly[Math.floor(t*4+o.seed*3)%2],x,X(110+(o.y+Math.sin(t*2+o.seed*7)*.06)*420));else this.center(Art.wreck[o.variant||0],x,X(110+o.y*420));}
  const px=X(g.playerX),py=X(110+g.surfY*420)+8;
  for(let i=0;i<8;i++){const u=(t*.9+i*.125)%1;this.rect(px+8+Math.sin(i*3+t*3)*2,py-14-u*40,1+(i%2),1+(i%2),'#cdf6f4');}
  if(g.jumpTime>0)for(let i=0;i<10;i++)this.rect(px-18-i*3,py-10+Math.sin(i+t*20)*2,2,1,'#e8fffb');
  this.sharkY+=(py-12-this.sharkY)*.06;
  const sx=g.state==='caught'?Math.min(px-28,X(g.waveFront)-30+g.caughtTime*40):X(g.waveFront)-30;
  if(g.state==='caught'){this.spin(Art.hero.diveTumble,px,py-10,Math.sin(g.caughtTime*12)*.4);this.center(Art.shark[2],sx,this.sharkY);this.fill('#a81e2a',Math.min(.35,g.caughtTime*.4));}
  else{if(!this.blink(g))this.hero('dive',Math.floor(g.runCycle*(g.jumpTime>0?8:4)),px,py);this.center(Art.shark[Math.floor(t*5)%2],sx,this.sharkY+Math.sin(t*3)*2);}
  this.shade(g);
 }

 /* ---------- Phase 4: climbing the building ---------- */
 tower(g,scroll,roofY=-999){
  const W=this.W,cx=Math.round(W/2),x0=cx-70;
  this.img(this.skyLayer('dusk2',['#231b3a','#4a2a4f','#8a3e4f','#c9644e','#e89a5a']),0,0);
  this.img(this.towersLayer(),0,90+Math.min(130,scroll*.08));
  const top=Math.max(0,Math.round(roofY));this.rect(x0,top,140,200-top,'#7d8494');this.rect(x0,top,4,200-top,'#9aa1b0');this.rect(x0+134,top,6,200-top,'#5d6372');
  const off=Math.round(scroll)%50;
  for(let y=-50+off;y<200;y+=50){if(y<roofY)continue;this.rect(x0-3,y,146,3,'#a3a9b6');this.rect(x0-3,y+3,146,1,'#4f5563');
   for(const wx of [cx-55,cx-18,cx+18,cx+55]){if(y+12<roofY)continue;const lit=((wx+Math.floor((scroll-off)/50)*7+y)%5+5)%5===0;this.rect(wx-6,y+12,12,20,'#5d6372');this.rect(wx-5,y+13,10,18,lit?'#f2c46a':'#3e5a78');if(!lit){this.rect(wx-4,y+14,2,6,'#7fa3c2');this.rect(wx-2,y+14,1,3,'#7fa3c2');}this.rect(wx-6,y+31,12,2,'#a3a9b6');}}
  for(const lc of [cx-37,cx,cx+37]){this.rect(lc-6,top,1,200-top,'#3b3d4f');this.rect(lc+5,top,1,200-top,'#3b3d4f');for(let y=-6+Math.round(scroll)%6;y<200;y+=6)if(y>roofY)this.rect(lc-5,y,10,1,'#55596a');}
  if(roofY>-40){this.rect(x0-4,roofY-6,148,6,'#9aa1b0');this.rect(x0-4,roofY,148,2,'#4f5563');}
 }
 climbPhase(g){
  const t=g.time,scroll=g.scroll/PX,cx=Math.round(this.W/2),roof=143-(g.config.goal*150-g.scroll)/PX;this.tower(g,scroll,roof);
  for(const o of g.objects){const x=cx+(o.lane-1)*37;if(o.warn>0){if(Math.floor(t*10)%2){this.rect(x-2,5,5,9,'#1a1c2c');this.rect(x-1,6,3,5,'#ffd23a');this.rect(x-2,14,5,4,'#1a1c2c');this.rect(x-1,15,3,2,'#ffd23a');}continue;}this.foot(Art[o.type],x,X(o.y)+6);}
  const px=cx+(g.laneX-1)*37;
  if(!this.blink(g)||g.state==='caught')this.hero('climb',Math.floor(g.runCycle*4),px,143);
  const water=Math.round(196-(g.waveFront-110)*.25);this.alpha(.85,()=>this.rect(0,water,this.W,200-water,'#2a7f9c'));
  for(let x=0;x<this.W;x+=3)this.rect(x,water+Math.round(Math.sin(x*.25+t*4)),3,1,'#cdf2ec');
  for(let i=0;i<4;i++)this.foot(i%2?Art.debris:Art.log,((i*97+t*12)%(this.W+40))-20,water+5);
  this.shade(g);
 }

 /* ---------- Phase 5: helicopter between meteors ---------- */
 inferno(g,scroll){
  const W=this.W,t=g.time;
  this.img(this.skyLayer('inferno',['#120c1c','#2c1430','#5a1c34','#962c32','#d0502e','#f08a3a'],(s,w)=>{[.07,.3,.5,.72,.92].forEach((f,k)=>this.smokePlume(s,f*w,200,30+((k*37)%50),'#2a1626','#3a1e30'));}),0,0);
  for(let i=0;i<4;i++){const u=(t*.35+i*.27)%1,x=W*(1.1-u*1.3)+i*40,y=-10+u*120;this.meteorTrail(x,y,-60,40,14,t,.5);this.rect(x-1,y-1,3,3,'#ffe6a0');}
  this.strip(this.cloudStrip('ember',['#3a2030','#7a3a3a'],17),scroll*.4,30);
  this.strip(this.layer('burning',240,50,(s,w,h)=>{const r=seededRandom(4);for(let x=0;x<w;){const bw=8+Math.floor(r()*14),bh=10+Math.floor(r()*36);s.rect(x,h-bh,bw-1,bh,'#1c1020');if(r()<.6)s.rect(x+2,h-bh-2,bw-5,3,'#ff7a2a');x+=bw;}}),scroll*.1,150);
  for(let k=0;k<14;k++){const x=((k*41-scroll*.1)%W+W)%W,y=150+((k*13)%30);this.rect(x,y-Math.abs(Math.sin(t*9+k))*3,2,3,k%2?'#ffb03a':'#ff6a2a');}
 }
 rotor(x,y,t,fast=30){const blade=Math.floor(t*fast)%2?22:8;this.rect(x-blade,y-13,blade*2,1,'#20202a');this.alpha(.3,()=>this.rect(x-24,y-14,48,1,'#20202a'));}
 heliPhase(g){
  const t=g.time,scroll=g.scroll/PX;this.inferno(g,scroll);
  for(const o of g.objects){const img=Art.meteor[o.size<.95?0:o.size<1.15?1:2],x=X(o.x),y=X(90+o.y*420);this.meteorTrail(x,y,-(g.speed-(o.vx||0)),o.vy*420,10+img.width,t,o.size);this.spin(img,x,y,t*2+o.seed);}
  const px=X(g.playerX),py=X(90+g.surfY*420);
  if(g.health<3)this.group(.65,()=>{for(let i=0;i<8;i++){const u=(t*1.4+i*.125)%1;this.blob(px-20-u*40,py-2-u*10+Math.sin(i+t*4)*2,1+u*4,g.health<2?'#2a2228':'#5a5058');}});
  if(g.state==='caught'){this.spin(Art.heli[1],px-g.caughtTime*12,py+g.caughtTime*g.caughtTime*30,g.caughtTime*5);return;}
  if(this.blink(g))return;
  this.center(Art.heli[g.surfVelocity<-.2?0:g.surfVelocity>.2?2:1],px,py);this.rotor(px,py,t);
 }

 /* ---------- Phase 6: downhill by bike, chased by lava ---------- */
 // The trail is a steady slope with rolling bumps, pinned at the rider (x=100) so the camera follows him.
 slope(){return Math.min(.17,46/Math.max(1,this.W-100));}
 bump(wx){return Math.sin(wx*.034)*4+Math.sin(wx*.081+1)*1.6;}
 groundY(x,scroll){return 150+(x-100)*this.slope()+this.bump(x+scroll)-this.bump(100+scroll);}
 volcanoCone(){return this.layer('volcano-cone',170,120,(s,w,h)=>{s.poly([[0,h],[62,14],[100,10],[170,h]],'#3b2128');s.poly([[100,10],[170,h],[120,h],[92,40]],'#2a171d');s.dither(40,20,90,100,'#52292f',.35);s.poly([[62,14],[100,10],[96,16],[66,18]],'#ff8a2a');for(const [x0,len] of [[74,60],[88,90],[96,46]])for(let k=0;k<len;k++)s.plot(x0+Math.round(Math.sin(k*.15)*3+k*.15),18+k,k%3?'#ff6a2a':'#ffb03a');});}
 eruption(cx,cy,t,a=1){
  for(let i=0;i<22;i++){const u=(t*.8+i*.045)%1,s=(i*2.4)%3-1.5;this.alpha(a,()=>this.rect(cx+s*u*28,cy-u*60+u*u*90,2,2,u<.5?'#ffd36a':'#ff6a2a'));}
  for(let i=0;i<10;i++){const u=(t*.15+i*.1)%1;this.alpha(.55*(1-u)*a,()=>this.blob(cx+Math.sin(i*3)*8+u*30,cy-10-u*40,5+u*12,'#2a1820'));}
 }
 farPines(){return this.layer('pines-far',200,60,(s,w,h)=>{const r=seededRandom(12);for(let x=0;x<w;x+=9){const th=18+Math.floor(r()*30);s.poly([[x,h],[x+5,h-th],[x+10,h]],'#2a1520');}});}
 downhill(scroll,t,lift,riverX=null){
  const W=this.W,c=this.c,slope=this.slope(),gy=x=>this.groundY(x,scroll);
  this.img(this.skyLayer('volcano',['#170a12','#341020','#5e1824','#9a2a24','#d24a26','#e8743a']),0,0);
  // The volcano stays behind, up the mountain: the background rises as the rider descends.
  const vx=Math.round(W*.2-scroll*.015),vy=Math.round(150-lift);this.foot(this.volcanoCone(),vx,vy);this.eruption(vx-4,vy-108,t);
  this.strip(this.farPines(),scroll*.12,Math.round(112-lift*.4));this.rect(0,Math.round(171-lift*.4),W,40,'#2a1520');
  for(let id=Math.floor((scroll*.8-30)/34);id*34-scroll*.8<W+30;id++){const x=id*34-scroll*.8+(((id*11)%13)+13)%13,v=((id%3)+3)%3;this.foot(Art.pine[v],x,150+(x-100)*slope-7-v*2);}
  for(let x=0;x<W;x++){
   if(riverX!==null&&x>=riverX)break;const top=Math.round(gy(x)),wx=Math.floor(x+scroll);
   c.fillStyle='#3a271d';c.fillRect(x,top,1,200-top);c.fillStyle='#2a1c16';c.fillRect(x,top+18,1,200-top);
   c.fillStyle='#56783a';c.fillRect(x,top,1,1);c.fillStyle='#3f5a2a';c.fillRect(x,top+1,1,2);
   if(((wx*13)%17+17)%17===0){c.fillStyle='#5e463a';c.fillRect(x,top+6+((wx*7)%9+9)%9,2,1);}
  }
  if(riverX!==null&&riverX<W+10){const lvl=Math.round(gy(riverX))+4;this.rect(riverX,lvl,W-riverX+10,200-lvl,'#2a6f8a');this.rect(riverX,lvl,W-riverX+10,2,'#9fd8d2');for(let k=0;k<6;k++)for(let xx=riverX+((t*20+k*9)%18);xx<W;xx+=18)this.rect(xx,lvl+6+k*6,6,1,'#5aa3b2');this.foot(Art.rock,riverX-4,lvl+1);}
  for(let i=0;i<16;i++){const x=((i*47-t*10-scroll*.6)%W+W)%W,y=(i*29+t*25)%200;this.rect(x,y,1,1,i%3?'#b8aaa8':'#ff9a4a');}
 }
 // Rider sprites are rotated around the wheels' contact point.
 riderAt(img,x,y,angle){this.spin(img,x+Math.sin(angle)*26,y-Math.cos(angle)*26,angle);}
 lavaFlow(front,scroll,t){
  const gy=this.groundY(front,scroll);this.wall(front,gy+4,gy-44,'lava',t,this.slope());
  for(let i=0;i<10;i++){const u=(t*1.2+i*.1)%1;this.rect(front-10-i*5+Math.sin(i+t*3)*3,gy-36-u*46,1,1,u<.5?'#ffd36a':'#ff6a2a');}
 }
 bikePhase(g){
  const t=g.time,scroll=g.scroll/PX,gy=x=>this.groundY(x,scroll),riverX=X(300+(g.config.goal-g.distance)*260/12);
  this.downhill(scroll,t,g.distance*.05,riverX<this.W+10?riverX:null);
  for(const o of g.objects){const x=X(o.x),y=Math.round(gy(x));
   if(o.type==='crack'){for(let i=-8;i<=8;i++){const top=Math.round(gy(x+i)),d=Math.abs(i)<6?9:5;this.rect(x+i,top,1,d,'#1c0c0c');this.rect(x+i,top+d-3,1,3,(i+Math.floor(t*8))%4?'#f47a2a':'#ffd36a');}for(let i=0;i<4;i++){const u=(t*1.5+i*.25)%1;this.alpha(1-u,()=>this.rect(x-4+i*3,y-u*10,1,1,'#ffb03a'));}}
   else if(o.type==='branch')this.foot(Art.branch,x+5,y+2);
   else this.foot(o.type==='rock'?Art.rock:Art.trunk,x,y+2);}
  const ground=gy(100),cy=ground-g.y/PX,lean=Math.atan((gy(101)-gy(99))/2),angle=g.y>0?lean*.4-Math.max(-.25,Math.min(.25,g.vy/2400)):lean;
  this.alpha(.35,()=>this.rect(88+Math.min(4,g.y/30),Math.round(ground)-1,26-Math.min(12,g.y/15),2,'#10141c'));
  if(g.state==='caught')this.riderAt(Art.rider.pedal[0],100-g.caughtTime*10,cy+g.caughtTime*12,-g.caughtTime*3);
  else if(!this.blink(g)){
   const img=g.duckTime>0?Art.rider.duck:g.y>0?Art.rider.stand:Art.rider.pedal[Math.floor(g.runCycle*4)%4];
   this.riderAt(img,100,cy,angle+(g.stumble>0?Math.sin(t*22)*.22:0));
  }
  if(g.stumble>0)for(let i=0;i<6;i++){const u=(t*2+i*.17)%1;this.rect(86-u*14,ground-u*6,2,1,'#8a6a4a');}
  this.lavaFlow(X(g.waveFront),scroll,t);
  this.shade(g);
 }

 /* ---------- The summit: crash landing beside a chapel ---------- */
 summit(g,t){
  const W=this.W,plateau=112,heli=[Math.round(W*.5),104],chapelX=Math.round(W*.76),door=chapelX-4,edge=Math.round(W*.9),crater=[Math.round(W*.31),25];
  this.img(this.skyLayer('volcano',['#170a12','#341020','#5e1824','#9a2a24','#d24a26','#e8743a']),0,0);
  this.strip(this.farPines(),0,150);this.rect(0,209-50,W,50,'#2a1520');
  this.img(this.layer('summit',W,200,(s,w,h)=>{
   s.poly([[0,h],[0,118],[w*.14,68],[w*.26,27],[w*.36,25],[w*.42,plateau],[w*.9,plateau],[w,plateau+44],[w,h]],'#54443f');
   s.poly([[w*.36,25],[w*.42,plateau],[w*.34,plateau+6],[w*.31,40]],'#3e3231');
   s.dither(0,plateau+20,w,60,'#3e3231',.45);s.dither(0,plateau+50,w,60,'#2e2426',.6);
   s.rect(w*.5,plateau+1,w*.4,2,'#6a5a4c');
   s.poly([[w*.26,27],[w*.36,25],[w*.35,31],[w*.27,31]],'#2a1a1c');s.rect(w*.42,plateau,w*.48,3,'#5e5a52');s.rect(w*.42,plateau,w*.48,1,'#7a7468');
   const r=seededRandom(9);for(let k=0;k<30;k++){const x=r()*w,y=plateau+12+r()*80;s.poly([[x,y-5],[x+3,y],[x-3,y]],'#2b3a2a');}for(let k=0;k<40;k++){const x=r()*w*.42,y=40+r()*150;if(y>118-x/(w*.14)*50)s.rect(x,y,2,1,'#6e5a52');}
  }),0,0);
  this.foot(Art.chapel,chapelX,plateau+1);
  // From the rumble on, the crater wakes up and lava starts down toward the plateau.
  const wake=ease((t-4.9)/.8);
  if(wake>0){this.alpha(wake,()=>{this.rect(crater[0]-12,crater[1]+2,26,3,'#ff8a2a');this.rect(crater[0]-8,crater[1]+1,18,1,'#ffd36a');});this.eruption(crater[0],crater[1]+4,g.time,wake);
   const flow=ease((t-5.1)/2);for(let k=0;k<flow*60;k++){const f=k/60,x=crater[0]+16+f*(W*.42-crater[0]-16),y=crater[1]+4+f*(plateau-crater[1]-4);this.rect(x-1,y,3,2,k%3?'#f47a2a':'#ffd36a');}}
  if(t<3.2){const f=ease((t-1.6)/1.6),hx=W*.95+(heli[0]-W*.95)*f,hy=-15+(heli[1]+15)*f*f;this.group(.75,()=>{for(let i=0;i<10;i++){const u=(g.time*1.6+i*.1)%1;this.blob(hx+u*16,hy-u*26,2+u*5,'#2a2228');}});this.spin(Art.heli[1],hx,hy,-t*9);}
  else{this.spin(Art.heli[1],heli[0],heli[1],.3);this.group(.5,()=>{for(let i=0;i<6;i++){const u=(g.time*.7+i*.17)%1;this.blob(heli[0]+u*8,heli[1]-6-u*30,2+u*5,'#3a3236');}});
   if(t<3.8)this.group(1-(t-3.2)/.6,()=>{for(let i=0;i<14;i++){const p=(t-3.2)/.6;this.blob(heli[0]+(i-7)*p*5,heli[1]+6-Math.sin(p*3)*(4+i%4*3),2,'#8a7a70');}});}
  const out=W*.56;
  if(t>=3.4&&t<3.8)this.hero('land',0,out,plateau);
  else if(t>=3.8&&t<4.5)this.hero('run',Math.floor(t*14),out+ease((t-3.8)/.7)*(door-out),plateau);
  if(t>=4.5&&t<5.8)this.rect(door-4,plateau-14,8,14,'#120a08');
  if(t>=5.7){const a=ease((t-5.7)/.5),b=ease((t-6.2)/.5),x=door+a*(edge-door)+b*(W*.18),y=plateau+b*W*.18*(44/(W*.1)),ang=b>0?Math.atan(44/(W*.1))*Math.min(1,b*3):0;
   this.riderAt(Art.rider.pedal[Math.floor(t*12)%4],x,y,ang);}
 }

 /* ---------- Shared helpers for the later phases ---------- */
 line(x0,y0,x1,y1,color,w=1){const n=Math.max(1,Math.round(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let i=0;i<=n;i++)this.rect(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n,w,w,color);}
 // A throwaway game at the start of a phase, so a cutscene can cross-fade into exactly what the phase shows first.
 preview(phase,time){const p=this.previews||(this.previews={});const g=p[phase]||(p[phase]=new ApocalipseGame(()=>.5));if(g.phase!==phase||g.previewed!==true){g.start(phase);g.previewed=true;g.intro=0;}g.time=time;return g;}
 snow(t,count=40,drift=1){for(let i=0;i<count;i++){const x=((i*53+t*12*drift+Math.sin(t+i)*6)%(this.W+10)+this.W+10)%(this.W+10)-5,y=(i*37+t*(18+i%5*5))%205-5;this.rect(x,y,i%4?1:2,i%4?1:2,'#eef6fb');}}

 /* ---------- Phase 7: sandboarding the dunes, a sandstorm behind ---------- */
 desertBack(scroll){
  this.img(this.skyLayer('desert',['#3a6a9a','#6a9ac0','#a9c4c8','#e8d4a0','#f6c87a','#f8b868'],(s,w)=>{s.ditherDisc(w*.76,38,19,'#fff4c8',.35);s.disc(w*.76,38,11,'#fff8dc');}),0,0);
  this.strip(this.layer('mesas',300,46,(s,w,h)=>{const r=seededRandom(21);for(let x=0;x<w;){const bw=30+Math.floor(r()*50),bh=12+Math.floor(r()*30);s.poly([[x,h],[x+6,h-bh],[x+bw-6,h-bh],[x+bw,h]],'#c98a62');s.rect(x+6,h-bh,bw-12,2,'#dca27a');s.dither(x,h-bh+4,bw,bh,'#b5744e',.35);x+=bw+Math.floor(r()*40);}}),scroll*.03,64);
  this.strip(this.layer('dunes-far',260,40,(s,w,h)=>{for(let x=0;x<w;x++){const top=Math.round(18+Math.sin(x/w*Math.PI*4)*7+Math.sin(x/w*Math.PI*10)*3);s.rect(x,top,1,h-top,'#e6b47a');s.plot(x,top,'#f4d29e');}}),scroll*.08,96);
 }
 duneScene(scroll,camY,t,gap){
  const W=this.W,c=this.c,sy=h=>140-(h-camY)/PX;this.desertBack(scroll/PX);
  for(let x=0;x<W;x++){const wx=scroll+x*PX-300,top=Math.round(sy(duneHeight(wx))),m=duneSlope(wx);
   c.fillStyle=m>.12?'#d89c56':'#e8b062';c.fillRect(x,top,1,200-top);c.fillStyle='#f8d896';c.fillRect(x,top,1,m>.12?1:2);
   c.fillStyle='#c88a48';c.fillRect(x,top+24,1,200);const k=Math.floor(wx/9);if(k%5===0){c.fillStyle='#d49a56';c.fillRect(x,top+8+(k*7)%12,2,1);}}
  // Cacti and bones along the dunes.
  for(let id=Math.floor((scroll-400)/700);id*700-scroll<W*PX;id++){const wx=id*700+((id*263)%300+300)%300,x=(wx-scroll+300)/PX;if(x<-20||x>W+20)continue;this.foot(id%3===2?Art.bones:Art.cactus[((id%2)+2)%2],x,sy(duneHeight(wx))+3);}
  if(gap!==null)this.storm((300-gap)/PX,t,Math.max(0,Math.min(1,(420-gap)/420)));
 }
 storm(front,t,close){
  const c=this.c;front=Math.round(front);
  for(let x=Math.min(front,this.W);x>=0;x--){const u=front-x,top=Math.round(10+Math.sin(x*.09+t*2)*8+Math.sin(x*.23-t*3)*4);c.fillStyle=u<4?'#d8ac72':u<14?'#c0905a':u<40?'#a87848':'#8a5e3a';c.fillRect(x,top,1,200-top);}
  for(let i=0;i<14;i++){const y=(i*29+t*20)%190,x=front+Math.sin(t*3+i)*6;this.blob(x,y,5+(i%4)*2,i%2?'#c69860':'#b4824e');}
  for(let i=0;i<40;i++){const u=(t*1.6+i*.025)%1,y=(i*47)%200;this.rect(front-30+u*(60+close*120),y+Math.sin(i+t*4)*3,2,1,'#e8c890');}
  this.fill('#c8945a',close*.32);
 }
 dunePhase(g){
  const camY=g.wy*.6,t=g.time;this.duneScene(g.scroll,camY,t,g.state==='caught'?Math.min(g.gap,-g.caughtTime*80):g.gap);
  const y=140-(g.wy-camY)/PX,angle=g.grounded?-Math.atan(duneSlope(g.scroll)):-Math.atan2(g.vy,g.vx)*.7;
  if(g.state==='caught'){this.spin(Art.hero.stumbleA,100+g.caughtTime*30,y-20-g.caughtTime*20,g.caughtTime*6);this.fill('#a87848',Math.min(.85,g.caughtTime*.6));return;}
  if(g.grounded)for(let i=0;i<8;i++){const u=(t*2+i*.125)%1;this.rect(92-u*20,y-u*8+u*u*10,2,1,'#f8dca0');}
  this.riderAt(g.grounded?(g.holding?Art.sand.crouch:Art.sand.ride):Art.sand.air,100,y,angle+(g.stumble>0?Math.sin(t*25)*.2:0));
  this.shade(g);
 }

 /* ---------- Phase 8: swinging through the jungle, a stampede behind ---------- */
 jungle(scroll,t){
  const W=this.W;
  this.img(this.skyLayer('jungle',['#9fd8b0','#6fb88a','#3f8a5e','#2a6a48','#1d4f38']),0,0);
  this.strip(this.layer('jungle-far',220,150,(s,w,h)=>{const r=seededRandom(61);for(let x=0;x<w;x+=14+Math.floor(r()*10)){s.rect(x,30,4+Math.floor(r()*4),h-30,'#2a5a40');s.disc(x+2,30+r()*30,12+r()*8,'#2f6a48');}s.dither(0,0,w,h,'#3f7a54',.2);}),scroll*.2,30);
  this.alpha(.1,()=>{const c=this.c;c.fillStyle='#f4fff0';for(let k=0;k<5;k++){const x=((k*W/4-scroll*.3)%(W+60)+W+60)%(W+60)-30;c.beginPath();c.moveTo(x,0);c.lineTo(x+14,0);c.lineTo(x-24,190);c.lineTo(x-40,190);c.fill();}});
  this.strip(this.layer('jungle-mid',260,170,(s,w,h)=>{const r=seededRandom(62);for(let x=10;x<w;x+=50+Math.floor(r()*30)){const bw=7+Math.floor(r()*5);s.rect(x,0,bw,h,'#3a2a1c');s.rect(x+1,0,2,h,'#55402c');for(let j=20;j<h-20;j+=26)s.line(x+bw,j,x+bw+6,j-4,1,'#2f7a4a');}}),scroll*.55,20);
  this.rect(0,183,W,17,'#2a3a1e');this.rect(0,183,W,1,'#4a6a2e');
  this.strip(this.layer('ferns',160,24,(s,w,h)=>{const r=seededRandom(63);for(let k=0;k<14;k++){const x=r()*w;for(let j=0;j<6;j++){const a=-Math.PI/2+(j-2.5)*.45;s.line(x,h-1,x+Math.cos(a)*10,h-1+Math.sin(a)*12,1,j%2?'#3f9a5a':'#2f7a4a');}}}),scroll,165);
  this.strip(this.layer('canopy',200,34,(s,w,h)=>{const r=seededRandom(64);s.rect(0,0,w,12,'#1d4f38');for(let k=0;k<22;k++)s.disc(r()*w,8+r()*14,5+r()*6,k%3?'#2a6a48':'#245a3e');s.dither(0,0,w,h,'#3f8a5e',.25);}),scroll*.9,0);
  for(let i=0;i<2;i++){const u=((t*.08+i*.5)%1),x=W+20-u*(W+60),y=50+i*30+Math.sin(t*3+i)*6;this.center(Art.parrot[Math.floor(t*8+i)%2],x,y);}
 }
 herd(front,t){
  this.group(.8,()=>{for(let i=0;i<10;i++)this.blob(front-8-i*9+Math.sin(t*3+i)*4,170-(i%3)*12,12+(i%4)*3,'#8a7458');});
  for(let i=0;i<6;i++){const x=front-14-i*16+Math.sin(t*5+i)*3,y=185-(i%2)*6;this.foot(Art.buffalo[Math.floor(t*10+i)%2],x,y);}
 }
 vinePhase(g){
  const t=g.time,scroll=g.scroll/PX,SX=x=>(x-g.scroll)/PX,SY=y=>(560-y)/PX;this.jungle(scroll,t);
  const hx=SX(g.wx),hy=SY(g.wy);
  for(const v of g.vines){const x=SX(v.x);if(x<-30||x>this.W+30)continue;const y=SY(v.y);this.rect(x-4,y-3,9,4,'#3a2a1c');
   if(v===g.anchor&&g.mode==='swing'){this.line(x,y,hx,hy,'#4f8a3c');}
   else{const ex=x+Math.sin(t*1.3+v.x)*5,ey=y+62;this.line(x,y,ex,ey,'#4f8a3c');for(let k=1;k<5;k++)this.rect(x+(ex-x)*k/5-1,y+(ey-y)*k/5,3,2,'#3f9a5a');}}
  this.herd(X(g.waveFront),t);
  if(g.state==='caught'){this.spin(Art.hero.stumbleA,hx,183-10-g.caughtTime*8,g.caughtTime*5);this.fill('#5a4630',Math.min(.4,g.caughtTime*.4));return;}
  if(!this.blink(g)){
   if(g.mode==='swing'){const f=g.omega>.6?1:g.omega<-.6?3:0;this.spin(Art.hero.hang[f],hx+21*Math.sin(g.theta),hy+21*Math.cos(g.theta),-g.theta);}
   else if(g.mode==='fly')this.hero(g.vy>0?'jumpUp':'fall',0,hx,hy+42);
   else this.hero(g.stumble>0?'stumbleB':'run',Math.floor(g.runCycle*8),hx,183);
  }
  this.shade(g);
 }

 /* ---------- Phase 9: skating the frozen lake, the ice cracking behind ---------- */
 iceBase(scroll,t){
  const W=this.W;
  this.img(this.skyLayer('winter',['#151c2c','#232e44','#3a4a62','#5e6e86','#8a9ab0','#aab8c8']),0,0);
  this.strip(this.snowMountains(),scroll*.05,62);
  this.strip(this.layer('snow-pines',200,40,(s,w,h)=>{const r=seededRandom(72);for(let x=0;x<w;x+=8+Math.floor(r()*6)){const th=18+Math.floor(r()*20);s.poly([[x,h],[x+5,h-th],[x+10,h]],'#2a3a44');s.poly([[x+5,h-th],[x+7,h-th+6],[x+3,h-th+6]],'#e8f0f6');}s.rect(0,h-4,w,4,'#dce8f0');}),scroll*.15,90);
  this.img(this.layer('ice',W,73,(s,w,h)=>{s.vgrad(0,0,w,h,['#dcecf4','#bcdbe8','#9cc8dc','#88b8d0']);}),0,127);
  this.strip(this.layer('ice-lines',220,73,(s,w,h)=>{const r=seededRandom(73);for(let k=0;k<18;k++){let x=r()*w,y=r()*h;for(let j=0;j<6;j++){const nx=x+4+r()*8,ny=y+(r()-.5)*5;s.line(x,y,nx,ny,1,'#f4fbff');x=nx;y=ny;}}}),scroll,127);
  for(let k=0;k<8;k++){const y=132+k*8,step=40+k*6,o=((scroll*(1+k*.1))%step+step)%step;for(let x=-o;x<W;x+=step)this.rect(x,y,10+k%3*4,1,'#ffffff');}
  this.snow(t,30,.6);
 }
 snowMountains(){return this.layer('snow-mountains',300,60,(s,w,h)=>{const r=seededRandom(71);for(let x=-20;x<w;){const bw=50+Math.floor(r()*60),bh=25+Math.floor(r()*30);s.poly([[x,h],[x+bw/2,h-bh],[x+bw,h]],'#6a7a92');s.poly([[x+bw/2,h-bh],[x+bw/2+8,h-bh+10],[x+bw/2-6,h-bh+12]],'#e8f0f6');x+=bw*.7;}});}
 iceCrack(front,t){
  front=Math.round(front);
  for(let y=126;y<200;y+=2){const e=front+Math.round(Math.sin(y*.7+t*2)*3+((y*13)%7));this.rect(0,y,Math.max(0,e),2,'#173a54');this.rect(e-1,y,2,2,'#f4fbff');}
  for(let i=0;i<6;i++){const x=front-20-i*22+Math.sin(t+i)*3,y=140+(i*17)%50;this.rect(x,y,12,4,'#cfe6f0');this.rect(x,y+4,12,1,'#7aa8c0');}
  for(let i=0;i<5;i++){let x=front,y=135+i*13;for(let j=0;j<4;j++){const nx=x+5+((i+j)%3)*3,ny=y+((j%2)?3:-3);this.line(x,y,nx,ny,'#5a8aa8');x=nx;y=ny;}}
 }
 skatePhase(g){
  const t=g.time,scroll=g.scroll/PX;this.iceBase(scroll,t);
  for(const o of g.objects){const x=X(o.x),y=X(396+o.y*155)+5;if(o.type==='hole')this.foot(Art.hole,x,y+3);else if(o.type==='penguin')this.foot(Art.penguin[Math.floor(t*6+o.seed)%2],x,y);else this.foot(Art.bear[Math.floor(t*8)%2],x,y);}
  const px=X(g.playerX),py=X(396+g.surfY*155);
  this.iceCrack(X(g.waveFront)-6,t);
  if(g.state==='caught'){this.spin(Art.hero.skateFall,px,py-14+g.caughtTime*12,g.caughtTime*3);this.alpha(.85,()=>this.rect(0,170-g.caughtTime*20,this.W,60,'#173a54'));return;}
  for(let i=0;i<8;i++){const u=(t*2+i*.125)%1;this.rect(px-10-u*18,py-1-u*3,2,1,'#ffffff');}
  if(!this.blink(g))this.hero('skate',Math.floor(g.runCycle*1.5),px,py);
  this.shade(g);
 }

 /* ---------- Phase 10: space, the asteroid field and the giant meteor ---------- */
 spaceBack(scroll,t,earth=true){
  const W=this.W;
  this.img(this.layer('space',W,200,(s,w,h)=>{s.vgrad(0,0,w,h,['#04040c','#080a1c','#0c1028']);const r=seededRandom(81);for(let k=0;k<w*.6;k++)s.plot(r()*w,r()*h,r()<.8?'#5a6080':'#c8d0f0');}),0,0);
  this.strip(this.layer('stars-near',300,200,(s,w,h)=>{const r=seededRandom(82);for(let k=0;k<70;k++){const x=r()*w,y=r()*h;s.plot(x,y,'#ffffff');if(k%6===0){s.plot(x+1,y,'#8890b0');s.plot(x-1,y,'#8890b0');s.plot(x,y+1,'#8890b0');s.plot(x,y-1,'#8890b0');}}},),scroll*.15,0);
  if(earth)this.img(this.earthLayer(),-40,130);
 }
 earthLayer(){return this.layer('earth',240,140,(s,w,h)=>{const cx=120,cy=140,R=128;s.disc(cx,cy,R+3,'#6ab0e8');s.disc(cx,cy,R,'#1d5f9a');const r=seededRandom(83);for(let k=0;k<16;k++){const a=-Math.PI*(.15+r()*.7),d=r()*R*.85;s.ellipse(cx+Math.cos(a)*d,cy+Math.sin(a)*d,8+r()*16,5+r()*9,k%3?'#4f8a3c':'#a8905a');}for(let k=0;k<12;k++){const a=-Math.PI*(.1+r()*.8),d=r()*R*.92,x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d,l=8+r()*14;s.ellipse(x,y,l,2,'#e8f0fa');s.ellipse(x+l*.4,y-2,l*.5,1.5,'#f4f8ff');}});}
 bossLayer(){return this.layer('boss',170,170,(s)=>{const c=85,R=77,r=seededRandom(84);s.disc(c,c,R,'#5b4640');for(let k=0;k<14;k++){const a=r()*6.28,d=r()*R*.8;s.disc(c+Math.cos(a)*d,c+Math.sin(a)*d,4+r()*9,'#4a3833');s.disc(c+Math.cos(a)*d-1,c+Math.sin(a)*d-1,2+r()*4,'#6e5650');}s.ditherDisc(c-20,c-20,R*.7,'#7d6156',.35);for(let k=0;k<5;k++){let a=r()*6.28,d=R*.3;for(let j=0;j<10;j++){const x=c+Math.cos(a)*d,y=c+Math.sin(a)*d;s.plot(x,y,j%2?'#ff9a3c':'#ffcf7a');a+=(r()-.5)*.4;d+=5;if(d>R-2)break;}}});}
 spacePhase(g){
  const t=g.time;this.spaceBack(g.scroll/PX,t);
  if(g.boss)this.bossWithBeacons(X(g.boss.x),X(300),g.beacons,t);
  for(const o of g.objects){const x=X(o.x),y=X(90+o.y*420);if(o.type==='chunk'){this.meteorTrail(x,y,-(g.speed-o.vx),o.vy*420,8,t,o.size);this.spin(Art.meteor[0],x,y,t*3+o.seed);}else this.spin(Art.asteroid[o.size<.9?0:o.size<1.1?1:2],x,y,t*(o.seed%2?1:-1)+o.seed);}
  const px=X(g.playerX),py=X(90+g.surfY*420);
  // Guidance: a ring on the next thruster point and a yellow arrow pointing to it.
  const next=g.boss&&g.state==='playing'&&g.beacons.find(b=>!b.done);
  if(next){const r=X(SPACE_BOSS_R+8),bx=X(g.boss.x)+Math.cos(next.a)*r,by=X(300)+Math.sin(next.a)*r;
   for(const p of [(t*1.2)%1,(t*1.2+.5)%1]){const rr=8+p*16;this.alpha((1-p)*.9,()=>{for(let k=0;k<40;k++){const a=k/40*Math.PI*2;this.rect(bx+Math.cos(a)*rr-1,by+Math.sin(a)*rr-1,2,2,'#ffd23a');}});}
   const cx=px,cy=py-20,dx=bx-cx,dy=by-cy,d=Math.hypot(dx,dy);
   if(d>60){const ux=dx/d,uy=dy/d,tip=34+Math.sin(t*7)*3,ax=cx+ux*tip,ay=cy+uy*tip;
    for(let k=0;k<14;k++)this.rect(ax-ux*k-1,ay-uy*k-1,3,3,'#ffd23a');
    for(let k=0;k<7;k++)for(let j=-k;j<=k;j++)this.rect(ax-ux*k-uy*j*.9-1,ay-uy*k+ux*j*.9-1,2,2,k===0?'#fff3b0':'#ffd23a');}}
  if(g.state==='caught'){this.spin(Art.hero.astroSpin,px-g.caughtTime*10,py,g.caughtTime*4);return;}
  for(let i=0;i<6;i++){const u=(t*4+i*.17)%1;this.rect(px-9-u*10-g.playerVX*.02*u,py-2+Math.sin(i*2)*2,2,2,u<.4?'#fff3b0':'#ff9a3c');}
  if(!this.blink(g))this.spin(Art.hero.astro,px,py-20,Math.max(-.3,Math.min(.3,g.playerVX/700))+Math.sin(t*1.5)*.06);
 }
 bossWithBeacons(cx,cy,beacons,t,thrust=0){
  this.center(this.bossLayer(),cx,cy);this.group(.25+Math.sin(t*3)*.05,()=>this.blob(cx,cy,80,'#ff6a2a'));this.center(this.bossLayer(),cx,cy);
  for(const b of beacons){const r=X(SPACE_BOSS_R+8),x=cx+Math.cos(b.a)*r,y=cy+Math.sin(b.a)*r;
   if(b.done||thrust){for(let i=0;i<8;i++){const u=(t*3+i*.125)%1,d=6+u*(14+thrust*20);this.rect(x+Math.cos(b.a)*d-1,y+Math.sin(b.a)*d-1,2+Math.round((1-u)*2),2,u<.4?'#bff4ff':'#5ac8f0');}}
   else if(Math.floor(t*4)%2)this.alpha(.6,()=>this.blob(x,y,8,'#ff4a3a'));
   this.center(Art.beacon[b.done||thrust?1:0],x,y);}
 }

 /* ---------- Cutscenes of the second half ---------- */
 // River → waterfall → desert: the current drops him into a dry canyon, where he finds a sandboard.
 cutWaterfall(g,t){
  const W=this.W,ex=Math.round(W*.66);
  if(t<4.9){
   this.desertBack(t*30);this.rect(0,150,W,50,'#c98a5a');this.rect(0,196,W,4,'#e8b062');
   this.rect(0,118,ex,82,'#8a5a3a');this.c.globalAlpha=1;for(let y=122;y<200;y+=6)this.rect(0,y,ex,1,'#7a4c30');
   this.rect(0,111,ex,8,'#2a6f8a');for(let k=0;k<3;k++)for(let x=((t*40+k*11)%22);x<ex;x+=22)this.rect(x,112+k*2,6,1,'#9fd8d2');
   for(let y=111;y<200;y+=1){const w=10+Math.round((y-111)*.06);this.rect(ex,y,w,1,(y+Math.floor(t*60))%7<2?'#e8fbff':'#9fd8d2');}
   this.group(.6,()=>{for(let i=0;i<6;i++){const u=(t*1.4+i*.17)%1;this.blob(ex+6+(i-3)*5,198-u*14,4+u*6,'#eef8fa');}});
   if(t<4.3)this.hero('swim',Math.floor(t*6),W*.15+ease((t-3.4)/.9)*(ex-6-W*.15),121);
   else{const f=t-4.3;this.spin(Art.hero.stumbleA,ex+8+f*24,112+f*f*300,f*8);}
   return;
  }
  this.desertBack(0);
  const cliff=Math.round(W*.14),pool=Math.round(W*.27),hut=Math.round(W*.64);
  this.rect(0,150,W,50,'#e8b062');this.rect(0,150,W,2,'#f8d896');this.c.globalAlpha=1;
  this.rect(0,40,cliff,160,'#9a5a3a');for(let y=46;y<200;y+=8)this.rect(0,y,cliff,1,'#83492e');
  for(let y=40;y<160;y++)this.rect(cliff,y,4,1,(y+Math.floor(t*60))%6<2?'#e8fbff':'#9fd8d2');
  this.blob(pool,160,1,'#2a6f8a');this.c.fillStyle='#2a6f8a';for(let j=-4;j<=4;j++){const w=Math.round(30*Math.sqrt(1-(j/4.5)**2));this.c.fillRect(pool-w,160+j,w*2,1);}this.rect(pool-30,156,60,1,'#9fd8d2');
  this.foot(Art.hut,hut,152);if(t<7)this.foot(Art.sandboardUp,hut+30,153);
  for(const [x,v] of [[W*.88,0],[W*.47,1]])this.foot(Art.cactus[v],x,152);
  if(t<5.6){this.hero('swim1',0,pool,166+Math.sin(t*4));this.rect(pool-24,163,48,6,'#2a6f8a');}
  else if(t<6.2)this.hero('land',0,pool+30,152);
  else if(t<7)this.hero('run',Math.floor(t*12),pool+30+ease((t-6.2)/.8)*(hut+22-pool-30),152);
  else if(t<7.6){this.hero('grab',0,hut+22,152);this.foot(Art.sandboardUp,hut+28,140);}
  else{this.hero('shock',0,hut+22,152);this.foot(Art.sandboardUp,hut+30,150);}
  if(t>4.9&&t<5.5)this.splash(pool,156,(t-4.9)/.6,16);
  if(t>7.6)this.storm(-40+ease((t-7.6)/1)*(W*.3),g.time,ease((t-7.6)/1)*.5);
  if(t<5.2)this.fill('#ffffff',1-ease((t-4.9)/.3));
  if(t>8.4){const p=this.preview(6,g.time);p.scroll=330-(9.4-t)*330;p.wy=duneHeight(p.scroll);this.group(ease((t-8.4)/.6),()=>this.dunePhase(p));}
 }
 // Dunes → oasis → jungle: the storm finally swallows him and drops him at the edge of a forest.
 cutOasis(g,t){
  const W=this.W;
  if(t<2.9){const sc=g.scroll+t*380,d=Object.assign(Object.create(g),{scroll:sc,wy:duneHeight(sc),grounded:true,gap:Math.max(0,g.gap*(1-t/1.6)),state:'playing',holding:false,stumble:0});this.dunePhase(d);
   for(const k of [0,1,2])this.foot(Art.palm,W*.78+k*22-t*30,150+k*3);}
  else this.jungleEdge(g,t);
  if(t>1.6&&t<3.3){const a=ease((t-1.6)/.25)*(1-ease((t-2.9)/.4));this.fill('#c8945a',a);
   if(t<2.9){for(let i=0;i<40;i++){const u=(t*2+i*.025)%1;this.rect(u*W*1.2-20,(i*47)%200,8,1,'#e8c890');}this.spin(Art.hero.stumbleA,W*.2+(t-1.6)*W*.5,90+Math.sin(t*6)*20,t*9);}}
 }
 jungleEdge(g,t){
  const W=this.W,vx=Math.round(W*.52);this.jungle(0,g.time);
  this.line(vx,8,vx+Math.sin(g.time*1.2)*3,78,'#4f8a3c');this.rect(vx-5,6,11,4,'#3a2a1c');
  this.herd(-60+ease((t-3.3)/2.7)*(W*.2+60),g.time);
  if(t<3.8)this.hero('land',0,W*.33,183);
  else if(t<5.6)this.hero('shock',0,W*.33,183);
  else if(t<6.1){const j=ease((t-5.6)/.5),x=W*.33+(vx-W*.33)*j;this.hero('jumpUp',0,x,183-(183-120)*j);}
  else this.spin(Art.hero.hang[1],vx+1,99,0);
  if(t>6.1){const p=this.preview(7,g.time);this.group(ease((t-6.1)/.5),()=>this.vinePhase(p));}
 }
 // Jungle → winter: dust from the meteor hides the sun and the clearing freezes over.
 cutWinter(g,t){
  const W=this.W,river=Math.round(W*.62),tent=Math.round(W*.2),dark=ease((t-1.2)/1.6),winter=ease((t-3)/1.6),frozen=ease((t-4.2)/1);
  this.jungle(g.scroll/PX,g.time);
  this.rect(river,181,W-river,19,frozen>.5?'#cfe6f0':'#2a6f8a');this.rect(river,181,W-river,1,'#f4fbff');
  this.c.fillStyle='#d8743a';this.c.beginPath();this.c.moveTo(tent-14,183);this.c.lineTo(tent,165);this.c.lineTo(tent+14,183);this.c.fill();this.rect(tent-3,173,6,10,'#5a2a1a');
  this.fill('#141a2a',dark*.45);
  if(winter>0){this.fill('#dfe9f2',winter*.32);this.alpha(winter,()=>this.rect(0,180,river,4,'#eef6fb'));this.alpha(winter*.7,()=>this.strip(this.layer('canopy-snow',200,34,(s,w,h)=>{const r=seededRandom(64);for(let k=0;k<22;k++){const x=r()*w,y=8+r()*14,rr=5+r()*6;r();s.ellipse(x,y-rr+2,rr*.8,2,'#eef6fb');}}),g.scroll/PX*.9,0));this.snow(g.time,Math.round(70*winter));}
  if(t<1.2){const j=ease(t/1.2),x=100+j*(W*.38-100);this.hero(j<.5?'jumpUp':'fall',0,x,140-Math.sin(j*Math.PI)*30+j*43);}
  else if(t<3.6)this.hero('shock',0,W*.38,183);
  else if(t<4.0)this.hero('run',Math.floor(t*12),W*.38-ease((t-3.6)/.4)*(W*.38-tent),183);
  else if(t<4.8){}
  else if(t<5.6)this.hero('coatRun',Math.floor(t*12),tent+ease((t-4.8)/.8)*(river+10-tent),183);
  else this.hero('skate',Math.floor(t*3),river+10+(t-5.6)*W*.25,181);
  if(t>6.3){const p=this.preview(8,g.time);this.group(ease((t-6.3)/.5),()=>this.skatePhase(p));}
 }
 // Ice → research base → rocket launch into space.
 cutLaunch(g,t){
  const W=this.W,base=Math.round(W*.36),pad=Math.round(W*.74),rise=Math.max(0,t-5.6),ry=161-(rise/1.6)**2*260,space=ease((t-5.9)/1.5);
  if(t<7.2){
   // The camera follows the rocket up: the ground drops away and the stars come out.
   const off=Math.round(Math.max(0,rise-.5)**2*120),rocketY=Math.round(161-ease(rise/.9)*70);
   if(rise>0)this.spaceBack(0,g.time,false);
   this.group(1-space,()=>{this.img(this.skyLayer('winter',['#151c2c','#232e44','#3a4a62','#5e6e86','#8a9ab0','#aab8c8']),0,off);this.strip(this.snowMountains(),0,62+off);});
   this.rect(0,160+off,W,60,'#dce8f0');this.rect(0,160+off,W*.2,60,'#a8cfe0');this.rect(0,160+off,W,1,'#ffffff');
   this.foot(Art.base,base,162+off);if(Math.floor(g.time*3)%2&&t>1.4&&t<2.6)this.rect(base+30,148,3,3,'#7cf27a');
   this.foot(Art.gantry,pad+16,162+off);this.rect(pad-20,160+off,40,3,'#5d6372');
   if(t>4.4)this.group(.8*(1-space),()=>{for(let i=0;i<10;i++){const u=(g.time*.8+i*.1)%1,s=ease((t-4.4)/1.2);this.blob(pad+(i-5)*6*s+Math.sin(i)*4,158+off-u*12*s,4+s*8,'#e8ecf0');}});
   if(t<0.8)this.hero('skate',Math.floor(t*3),-10+ease(t/.8)*(W*.2+10),160);
   else if(t<1.4)this.hero('coatRun',Math.floor(t*12),W*.2+ease((t-.8)/.6)*(base-8-W*.2),160);
   else if(t>=2.6&&t<3.4)this.center(Art.hero.astro,base-8+ease((t-2.6)/.8)*(pad-base+8),141);
   if(t>5.6)for(let i=0;i<16;i++){const u=(g.time*3+i*.07)%1;this.rect(pad-1+Math.sin(i*3)*5*u,rocketY-12+u*26,3,3,u<.3?'#fff3b0':u<.6?'#ffb03a':'#e8582a');}
   this.foot(Art.rocket,pad,rocketY);
   this.snow(g.time,Math.round(40*(1-space)));
  }else{
   this.spaceBack(g.time*10,g.time);const rx=W*.6+Math.sin(g.time)*2,ry2=95;
   this.foot(Art.rocket,rx,ry2+42);
   if(t>7.6){const f=ease((t-7.6)/.8);this.center(Art.hero.astro,rx-6-f*(rx-6-X(220)),ry2-6+f*(X(300)-ry2));}
   if(t>8){const p=this.preview(9,g.time);this.group(ease((t-8)/.4),()=>this.spacePhase(p));}
  }
 }
 // The end: thrusters push the meteor away, it grazes the Earth, and he is back at the beach.
 cutFinale(g,t){
  const W=this.W;
  if(t<2){
   this.spaceBack(g.scroll/PX,g.time);const k=ease((t-.3)/1.7),bx=X(g.boss?g.boss.x:g.viewWidth-130)+k*W*.7,by=X(300)-k*90;
   this.bossWithBeacons(bx,by,g.beacons.length?g.beacons:[2.55,Math.PI,3.73].map(a=>({a,done:true})),g.time,1);
   this.spin(Art.hero.astro,X(g.playerX)-t*8,X(90+g.surfY*420)-20,t*.4);
  }else if(t<6.6){
   this.spaceBack(0,g.time,false);this.img(this.earthLayer(),Math.round(W/2-120),96);
   const u=ease((t-2)/2.2),mx=-20+u*(W+40),my=72-Math.sin(u*Math.PI)*16-u*30;
   if(t<4.4){this.meteorTrail(mx,my,1,-.4,40,g.time,1.4);this.spin(Art.meteor[2],mx,my,g.time*2);}
   if(t>4.2&&t<5)this.fill('#fff6e0',(1-ease((t-4.2)/.8))*.8);
   if(t>4.4){const r=ease((t-4.4)/1.6);this.foot(Art.rocket,W*.62-r*30,40+r*60);}
   if(t>5.6)this.fill('#ffffff',ease((t-5.6)/1));
  }else{
   this.opening({openingTime:1.6,time:g.time});this.fill('#ff9a5a',.16);
   if(t<7.6)this.fill('#ffffff',1-ease((t-6.6)/1));
   if(t>11.2)this.fill('#0a1e2b',ease((t-11.2)/.8));
  }
 }

 /* ---------- Opening: the meteor falls into the sea ---------- */
 opening(g){
  const W=this.W,t=g.openingTime,IMPACT=5,after=t-IMPACT,sx=W*.97,sy=12,ix=Math.round(W*.15),iy=86;
  const fall=Math.max(0,Math.min(1,(t-3)/(IMPACT-3))),e=fall**1.7,hx=sx+(ix-sx)*e,hy=sy+(iy-sy)*e;
  this.img(this.skyLayer('morning',['#5fa8c8','#7cb9d2','#a9d2dc','#d7e6dc','#f6e2b8','#f6e2b8','#f6e2b8','#f6e2b8','#f6e2b8']),0,0);
  if(t>2.4)this.alpha(ease((t-2.6)/2.2)*(1-ease((t-7)/2.5))*.6,()=>this.img(this.skyLayer('burn',['#3b2846','#7a3a52','#d0613f','#ffb36b','#ffb36b','#ffb36b','#ffb36b']),0,0));
  this.blob(W*.78,38,9,'#ffe7b5');
  if(t>2.4&&t<3.3){const a=Math.sin(ease((t-2.4)/.9)*Math.PI),r=Math.round(1+a*5);this.alpha(a,()=>{this.rect(sx-r,sy,r*2+1,1,'#fff6d0');this.rect(sx,sy-r,1,r*2+1,'#fff6d0');this.rect(sx-1,sy-1,3,3,'#ffffff');});}
  this.img(this.layer('sea-open',W,68,(s,w,h)=>s.vgrad(0,0,w,h,['#2f7f99','#3f97a8','#6cc0bf'])),0,84);
  for(let k=0;k<10;k++){const y=88+k*5;for(let x=((t*6+k*13)%26)-26;x<W;x+=26)this.rect(x+Math.sin(t*2+k)*2,y,6+k%3*2,1,'#a7e0d6');}
  if(fall>0&&t<IMPACT){this.alpha(.3+fall*.4,()=>this.rect(hx-6-fall*10,85,12+fall*20,1,'#ffd38a'));this.group(.4,()=>{this.blob(hx,hy,8+fall*12,'#ff9b4f');this.blob(hx,hy,4+fall*7,'#ffd08a');});this.meteorTrail(hx,hy,ix-sx,iy-sy,30+fall*70,t,1.2);this.rect(hx-3,hy-3,6,6,'#fff6da');this.rect(hx-2,hy-2,4,4,'#ffc069');}
  if(after>0){
   for(let k=0;k<3;k++){const a=after-k*.35;if(a>0&&a<2.6){const r=Math.round(8+a*110);this.alpha((1-a/2.6)*.8,()=>{for(let i=-r;i<=r;i+=2){const yy=Math.round(Math.sqrt(Math.max(0,1-(i/r)**2))*r*.09);this.rect(ix+i,iy+yy,1,1,'#f2fbf0');this.rect(ix+i,iy-yy,1,1,'#f2fbf0');}});}}
   const up=ease(after/.45),down=ease((after-.7)/1.6),h=Math.round(80*up*(1-down));
   if(h>1){this.rect(ix-5-h*.04,iy-h,10+h*.08,h,'#d9f3ee');this.rect(ix-3,iy-h,3,h,'#ffffff');this.rect(ix-8-h*.05,iy-h-4,16+h*.1,6,'#effcf6');}
   for(let i=0;i<24;i++){const s=after*(.8+i%5*.12),ang=-Math.PI/2+(i/23-.5)*2.3,px=ix+Math.cos(ang)*(44+i%7*9)*s,py=iy+Math.sin(ang)*(95+i%4*15)*s+100*s*s;if(py<iy+2&&s<2.4)this.rect(px,py,2,2,'#e8faf3');}
   if(after>.2){const a=after-.2,k=ease(a/3);this.group((1-ease((a-1.5)/3))*.7,()=>{for(let i=0;i<7;i++){this.blob(ix+(i-3)*15*k+a*3,iy-20-k*40-i%3*8,6+k*16,'#d9dedb');this.blob(ix+(i-3)*15*k+a*3-2,iy-22-k*40-i%3*8,4+k*11,'#f2f4f2');}});}
  }
  const recede=ease((after-.6)/1.4)*(1-ease((t-7.8)/1.2)),lift=Math.round(13*recede);
  if(t>6){const grow=ease((t-6.1)/3.4);this.alpha(ease((t-6)/.6),()=>this.wall(ix+grow*W*.3,150,140-grow*95,'wave',g.time));}
  if(recede>0){this.rect(0,140-lift,W,lift+2,'#b8986a');this.rect(0,140-lift,W,1,'#e7f6e6');for(const fx of [W*.43,W*.62]){const fy=137-lift*.6-Math.abs(Math.sin(t*9+fx))*2;this.alpha(ease((recede-.4)/.3),()=>{this.rect(fx,fy,6,2,'#c4d6d6');this.rect(fx+6,fy-1,2,4,'#9fb7ba');this.rect(fx+1,fy,1,1,'#203644');});}}
  this.img(this.layer('beach',W,60,(s,w,h)=>{s.vgrad(0,0,w,h,['#f0d7a2','#e3c38b','#d4ae74']);const r=seededRandom(2);for(let k=0;k<80;k++)s.plot(r()*w,4+r()*(h-4),r()<.5?'#c9a46a':'#f7e4bb');}),0,142);
  for(let x=0;x<W;x+=3)this.rect(x,141+Math.round(Math.sin(x*.3+t*2)),3,2,'#f8edc9');
  this.foot(Art.palm,W-28,176);this.rect(66,171,52,3,'#cc785c');this.rect(66,171,52,1,'#e8957a');
  const stand=ease((t-6.7)/.9),run=ease((t-8.1)/1.6);
  this.foot(Art.chair,86,173);
  if(t>=8.1)this.hero('run',Math.floor((t-8.1)*14),100+run*W*.6,172);
  else if(t>=6.7)this.hero(stand<.5?'land':'shock',0,98,172);
  else this.hero(t>2.7?'sitLook':'sit',0,94,172);
  const drop=ease((t-5.25)/.9);this.spin(Art.paper,98+drop*14,150+drop*20,-.1+drop*1.3);
  if(t>2.7&&t<3.7)this.mark(96,124,'?');
  if(t>5.1&&t<6.6)this.mark(96,124,'!');
  if(after>.2&&after<5){const a=after-.2;for(let i=0;i<4;i++){const bx=W*.32+i*13+a*57,by=68-i%2*6-a*11,f=Math.floor(t*10+i)%2;this.rect(bx-3,by-f,3,1,'#344a55');this.rect(bx,by,1,1,'#344a55');this.rect(bx+1,by-f,3,1,'#344a55');}}
  this.rect(0,0,W,8,'#0b1626');this.rect(0,192,W,8,'#0b1626');
  if(after>0&&after<1)this.fill('#fff8e6',(1-ease(after/.9))*.9);
  if(t>10)this.fill('#0a1e2b',ease((t-10)/.5));
 }
 mark(x,y,ch){this.rect(x-2,y-1,5,10,'#1a1c2c');if(ch==='!'){this.rect(x-1,y,3,5,'#ffe08a');this.rect(x-1,y+6,3,2,'#ffe08a');}else{this.rect(x-1,y,3,1,'#ffe08a');this.rect(x+1,y+1,1,2,'#ffe08a');this.rect(x,y+3,1,2,'#ffe08a');this.rect(x,y+6,1,2,'#ffe08a');}}

 /* ---------- Cutscenes between phases ---------- */
 transition(g){
  const t=g.transitionTime,W=this.W,from=g.transitionFrom;
  if(from===0){
   this.avenue(g,g.scroll/PX);const water=Math.round(200-ease((t-.6)/1.6)*58);
   this.foot(Art.rack,124,GROUND+2);
   if(t<.7){this.hero('grab',0,100,GROUND);this.foot(Art.boardUp,123-ease(t/.65)*14,GROUND-6-ease(t/.65)*10);}
   this.wall(X(g.waveFront)+ease((t-.2)/2)*60,GROUND+4,52,'wave',g.time);
   this.alpha(.92,()=>this.rect(0,water,W,200-water,'#2a7f9c'));for(let x=0;x<W;x+=3)this.rect(x,water+Math.round(Math.sin(x*.3+g.time*5)),3,1,'#cdf2ec');
   if(t>=.7){const l=ease((t-.7)/1.5),y=GROUND-Math.sin(l*Math.PI)*40-(GROUND-water+2)*l;this.foot(Art.board,100,y+3);this.hero(l<.5?'jumpUp':l<1?'fall':'surf',0,100,y);}
   if(t>2.2)this.splash(100,water,Math.min(1,(t-2.2)/.6));
  }else if(from===1){
   // A dive kit floats by just before the wave breaks: the surfer grabs it and suits up.
   const sc=(g.scroll+t*350)/PX;
   if(t<3.1){this.waterBase(g,sc);const px=X(g.playerX),py=X(396+g.surfY*155),got=t>=.9;
    if(!got){const k=ease(t/.9),kx=W+20+(px+8-W-20)*k,ky=py+Math.round(Math.sin(t*6));this.foot(Art.diveKit,kx,ky+2);this.rect(kx-16,ky+1,32,1,'#cfeee6');}
    else if(t<1.5)for(let i=0;i<8;i++){const a=i*.8+t*4,r=8+(t-.9)*30;this.alpha(1-(t-.9)/.6,()=>this.rect(px+Math.cos(a)*r,py-18+Math.sin(a)*r*.7,2,2,'#fff3b0'));}
    for(let i=0;i<10;i++){const u=(t*1.7+i*.1)%1;this.rect(px-16-u*22,py+1-u*4+u*u*6,2-Math.round(u),1,'#e4f6de');}
    this.foot(Art.board,px,py+3);this.hero(got?'surfGear':'surfDown',0,px,py);
    const k=ease((t-1.2)/1.1);this.wall(X(148)+k*(W+30),150,40-k*60,'wave',g.time);}
   if(t>2.3&&t<3.4)this.fill('#f2fbf7',Math.min(1,(t-2.3)/.3)*(1-ease((t-3.1)/.3)));
   if(t>=3.1){this.underwater(g,sc);const s=ease((t-3.1)/1.5);this.spin(Art.hero.diveTumble,W*.4,30+s*70,t*5*(1-s*.8));for(let i=0;i<12;i++){const u=(t*1.3+i*.08)%1;this.rect(W*.4+Math.sin(i*2)*10,30+s*70-u*40,2,2,'#cdf6f4');}this.fill('#ffffff',1-ease((t-3.1)/.4));}
  }else if(from===2){
   if(t<1.55){this.underwater(g,g.scroll/PX);const s=ease(t/1.5);this.spin(Art.hero.dive[0],W*.45,140-s*150,-1.2);for(let i=0;i<10;i++){const u=(t*1.5+i*.1)%1;this.rect(W*.45+Math.sin(i*2)*8,140-s*150+u*30,2,2,'#cdf6f4');}}
   else{this.tower(g,0);this.rect(0,150,W,50,'#2a7f9c');for(let x=0;x<W;x+=3)this.rect(x,150+Math.round(Math.sin(x*.25+g.time*4)),3,1,'#cdf2ec');const c=ease((t-1.9)/1.3),x=Math.round(W/2-37);
    if(t<1.9){this.hero('dive',0,x,158);this.rect(x-14,151,28,10,'#2a7f9c');}else this.hero('climb',Math.floor((t-1.9)*8),x,158-c*40);
    if(t<2.2)this.splash(x,150,Math.min(1,(t-1.55)/.6),12);
    this.fill('#ffffff',1-ease((t-1.55)/.3));}
  }else if(from===3){
   this.img(this.skyLayer('dusk2',['#231b3a','#4a2a4f','#8a3e4f','#c9644e','#e89a5a']),0,0);this.img(this.towersLayer(),0,140);
   this.rect(0,150,W,50,'#5d6372');this.rect(0,150,W,3,'#9aa1b0');for(let x=0;x<W;x+=16)this.rect(x,156,1,44,'#545a68');this.foot(Art.helipad,W*.65,158);
   this.foot(Art.ac,W*.1,151);this.foot(Art.ac,W*.1+18,151);this.rect(W*.88,96,2,54,'#3b3d4f');this.rect(W*.88-4,104,10,1,'#3b3d4f');if(Math.floor(g.time*2)%2)this.rect(W*.88,94,2,2,'#ff4a3a');
   const lift=ease((t-2)/1.4),hx=W*.65+lift*W*.3,hy=140-lift*120;
   if(t<.5)this.hero('climb',Math.floor(t*8),W*.25,150+(.5-t)*30);else if(t<1.35)this.hero('run',Math.floor(t*14),W*.25+ease((t-.5)/.85)*(W*.38),150);
   this.center(Art.heli[t>2?2:1],hx,hy);this.rotor(hx,hy,g.time,8+t*8);
  }else if(from===4){
   if(t<1.6){
    this.inferno(g,g.scroll/PX);const k=ease((t-.2)/1.4),mx=W+30-k*(W+30-W*.38),my=-30+k*110,sz=1+k*3;
    this.center(Art.heli[1],W*.35,80);this.rotor(W*.35,80,g.time);this.fill('#ff7a3a',k*.35);
    this.meteorTrail(mx,my,-(W*.6),110,40*sz,g.time,sz);this.c.save();this.c.translate(Math.round(mx),Math.round(my));this.c.scale(sz,sz);this.c.drawImage(Art.meteor[2],-11,-11);this.c.restore();
   }else if(t<6.7)this.summit(g,t);
   // The camera follows the bike down: the same trail the next phase starts on, lava pouring in behind.
   if(t>6.3){const k=ease((t-6.3)/.4),scroll=(t-7.6)*300/PX;this.group(k,()=>{this.downhill(scroll,g.time,0);this.riderAt(Art.rider.pedal[Math.floor(t*12)%4],100,this.groundY(100,scroll),Math.atan((this.groundY(101,scroll)-this.groundY(99,scroll))/2));this.lavaFlow(-30+ease((t-6.7)/.9)*(X(110)+30),scroll,g.time);});}
   if(t>1.6&&t<2.4)this.fill('#fff6e0',1-ease((t-1.6)/.8));
  }else if(from===6)this.cutOasis(g,t);else if(from===7)this.cutWinter(g,t);else if(from===8)this.cutLaunch(g,t);else if(from===9)this.cutFinale(g,t);
  else if(t>=3.4)this.cutWaterfall(g,t);
  else{
   // The bike flies off the bank into the river; the lava reaches the water and cools into stone.
   const scroll=g.scroll/PX,gy=x=>this.groundY(x,scroll),rx=100,lvl=Math.round(gy(rx))+4;this.downhill(scroll,g.time,g.distance*.05,rx);
   const front=X(g.waveFront)+ease(t/2)*(rx-X(g.waveFront)-6),cool=ease((t-2)/1.4);
   if(t<1.3){const j=ease(t/1.3),x=rx+j*W*.3,y=gy(rx)-Math.sin(j*Math.PI)*38+j*(lvl+10-gy(rx));this.riderAt(j<.5?Art.rider.stand:Art.rider.pedal[0],x,y,j*.9-.3);}
   else{const x=rx+W*.3;this.hero('swim1',0,x,lvl+16+Math.sin(g.time*3));this.rect(x-20,lvl+10,40,30,'#2a6f8a');this.rect(x-20,lvl+10,40,1,'#9fd8d2');for(let i=0;i<5;i++){const u=(g.time*1.2+i*.2)%1;this.rect(x-12+i*3,lvl+20-u*12,1,1,'#cdf6f4');}}
   if(t>1.3&&t<1.9)this.splash(rx+W*.3,lvl,(t-1.3)/.6);
   const gf=this.groundY(front,scroll);this.wall(front,gf+4,gf-44+cool*14,cool>.5?'stone':'lava',g.time*(1-cool),this.slope());
   if(t>2)this.group(.7*(1-ease((t-3.2)/.8)),()=>{for(let i=0;i<14;i++){const u=(g.time*.8+i*.07)%1;this.blob(front-30+i*4+Math.sin(i+g.time)*3,gf-30-u*60,2+u*6,'#e6ebe8');}});
  }
 }

 draw(g){
  const c=this.c;c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;
  if(g.shake>0)c.translate(Math.round(Math.sin(g.time*91)*g.shake*2),Math.round(Math.cos(g.time*73)*g.shake));
  const state=g.state==='paused'?g.resumeState:g.state;
  // Behind the pause and defeat screens, keep showing the moment the player was caught.
  if(state!==g.state||state==='lost')g=Object.assign(Object.create(g),{state:state==='lost'?'caught':state});
  if(state==='opening')this.opening(g);
  else if(state==='transition')this.transition(g);
  else{const kind=PHASES[g.phase].kind;if(kind==='run')this.runPhase(g);else if(kind==='bike')this.bikePhase(g);else if(kind==='dune')this.dunePhase(g);else if(kind==='vine')this.vinePhase(g);else if(kind==='skate')this.skatePhase(g);else if(kind==='space')this.spacePhase(g);else if(kind==='surf')this.surfPhase(g);else if(kind==='swim')this.swimPhase(g);else if(kind==='climb')this.climbPhase(g);else this.heliPhase(g);}
  if(g.openingFade>0)this.fill('#0a1e2b',g.openingFade/.35);
  c.setTransform(1,0,0,1,0,0);
 }
 // Warm every cached layer before the first playable frame.
 prepare(Game){const g=new Game(()=>.5);for(const time of [3,6,9]){g.beginOpening();g.openingTime=time;this.draw(g);}for(let k=0;k<PHASES.length;k++){g.start(k);this.draw(g);g.state='transition';g.transitionFrom=k;for(const time of [.5,2,3.5,5,7,9,11])g.transitionTime=time,this.draw(g);}}
}
