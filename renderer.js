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
 hero(name,i,x,y){const set=Art.hero[name],f=Array.isArray(set)?set[((i%set.length)+set.length)%set.length]:set;this.c.drawImage(f,Math.round(x-24),Math.round(y-46));}
 fill(color,a=1){if(a>0)this.alpha(a,()=>this.rect(0,0,this.W,200,color));}
 blob(x,y,r,color){const c=this.c;c.fillStyle=color;x=Math.round(x);y=Math.round(y);r=Math.max(1,Math.round(r));for(let j=-r;j<=r;j++){const w=Math.round(Math.sqrt(r*r-j*j));c.fillRect(x-w,y+j,w*2+1,1);}}
 group(a,draw){if(a<=0)return;const fx=this.fx||(this.fx=document.createElement('canvas'));if(fx.width!==this.W||fx.height!==200){fx.width=this.W;fx.height=200;}const fc=fx.getContext('2d'),main=this.c;fc.setTransform(1,0,0,1,0,0);fc.clearRect(0,0,fx.width,200);this.c=fc;try{draw();}finally{this.c=main;}this.alpha(a,()=>main.drawImage(fx,0,0));}

 /* ---------- Shared pieces ---------- */
 // A tsunami (or lava) wall, drawn column by column, with a curling lip and spray at the front.
 wall(front,groundY,crestY,kind,t){
  const c=this.c,k=WALLS[kind],face=16,lip=kind==='wave'?12:6;front=Math.round(front);
  for(let x=Math.min(front,this.W+lip);x>=0;x--){
   const u=front-x;let top=u<face?crestY+(groundY-crestY)*(1-u/face)**2:crestY+Math.sin(x*.21+t*3.2)*1.6+Math.min((groundY-crestY)*.45,(u-face)*.4);top=Math.round(top);
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
  const t=g.time,lava=g.phase===5,scroll=g.scroll/PX;
  if(lava)this.forest(g,scroll);else this.avenue(g,scroll);
  if(!lava){const bx=X(300+Math.max(0,300-g.distance)*260/12);if(bx<this.W+30){this.foot(Art.rack,bx,GROUND+2);this.foot(Art.boardUp,bx-1,GROUND-6);}}
  else{const rx=X(300+Math.max(0,g.config.goal-g.distance)*260/12);if(rx<this.W+10)this.river(rx,t);}
  for(const o of g.objects)this.foot({log:Art.log,cooler:Art.cooler,rock:Art.rock,trunk:Art.trunk}[o.type],X(o.x),GROUND+2);
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
  if(g.stumble>0)for(let i=0;i<6;i++){const u=(t*2+i*.17)%1;this.rect(92-u*14,GROUND-u*6,2,1,lava?'#8a6a4a':'#c9b48e');}
  this.wall(X(g.waveFront),GROUND+4,lava?62:52,lava?'lava':'wave',t);
  if(lava)this.embers(g,X(g.waveFront));
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
  if(g.state==='caught'){this.spin(Art.hero.stumbleA,px,py-10,Math.sin(g.caughtTime*12)*.4);this.center(Art.shark[2],sx,this.sharkY);this.fill('#a81e2a',Math.min(.35,g.caughtTime*.4));}
  else{if(!this.blink(g))this.hero('swim',Math.floor(g.runCycle*(g.jumpTime>0?8:4)),px,py);this.center(Art.shark[Math.floor(t*5)%2],sx,this.sharkY+Math.sin(t*3)*2);}
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

 /* ---------- Phase 6: volcano and forest ---------- */
 forest(g,scroll){
  const W=this.W,t=g.time;
  this.img(this.skyLayer('volcano',['#170a12','#341020','#5e1824','#9a2a24','#d24a26','#e8743a']),0,0);
  const vx=Math.round(W*.66-scroll*.02);
  this.foot(this.layer('volcano-cone',170,120,(s,w,h)=>{s.poly([[0,h],[62,14],[100,10],[170,h]],'#3b2128');s.poly([[100,10],[170,h],[120,h],[92,40]],'#2a171d');s.dither(40,20,90,100,'#52292f',.35);s.poly([[62,14],[100,10],[96,16],[66,18]],'#ff8a2a');for(const [x0,len] of [[74,60],[88,90],[96,46]])for(let k=0;k<len;k++)s.plot(x0+Math.round(Math.sin(k*.15)*3+k*.15),18+k,k%3?'#ff6a2a':'#ffb03a');}),vx,152);
  const crater=vx-4;
  for(let i=0;i<22;i++){const u=(t*.8+i*.045)%1,a=(i*2.4)%3-1.5,x=crater+a*u*28,y=40-u*60+u*u*90;this.rect(x,y,2,2,u<.5?'#ffd36a':'#ff6a2a');}
  for(let i=0;i<10;i++){const u=(t*.15+i*.1)%1;this.alpha(.55*(1-u),()=>this.blob(crater+Math.sin(i*3)*8+u*30,30-u*40,5+u*12,'#2a1820'));}
  this.strip(this.farPines(),scroll*.15,100);
  this.strip(this.layer('forest-mid',264,72,(s,w,h)=>{const r=seededRandom(44);for(let x=8;x<w-8;x+=22+Math.floor(r()*12)){const pine=r()<.6;if(pine){const th=36+Math.floor(r()*14);for(let k=0;k<4;k++){const y=h-th+k*8,ww=3+k*3;s.poly([[x,y-5],[x+ww+1,y+5],[x-ww-1,y+5]],'#1d3326');}s.rect(x-1,h-6,2,6,'#3a2418');}else{s.rect(x-1,h-14,3,14,'#3a2418');s.disc(x,h-20,8,'#22402c');s.disc(x-5,h-16,5,'#22402c');s.disc(x+5,h-16,5,'#1d3326');}}s.dither(0,0,w,h,'#3a1a1c',.12);}),scroll*.45,90);
  this.rect(0,160,W,4,'#3f5a2a');for(let x=-(Math.round(scroll)%7);x<W;x+=7)this.rect(x,158,1,2,'#56783a');
  this.strip(this.layer('dirt',128,36,(s,w,h)=>{s.vgrad(0,0,w,h,['#4e3426','#3a271d','#2a1c16']);const r=seededRandom(19);for(let k=0;k<26;k++)s.ellipse(r()*w,4+r()*(h-6),1+r()*2,1,'#5e463a');}),scroll,164);
  for(let i=0;i<16;i++){const x=((i*47-t*10-scroll*.6)%W+W)%W,y=(i*29+t*25)%200;this.rect(x,y,1,1,i%3?'#b8aaa8':'#ff9a4a');}
 }
 farPines(){return this.layer('pines-far',200,60,(s,w,h)=>{const r=seededRandom(12);for(let x=0;x<w;x+=9){const th=18+Math.floor(r()*30);s.poly([[x,h],[x+5,h-th],[x+10,h]],'#2a1520');}});}
 embers(g,front){for(let i=0;i<10;i++){const u=(g.time*1.2+i*.1)%1;this.rect(front-10-i*5+Math.sin(i+g.time*3)*3,GROUND-30-u*50,1,1,u<.5?'#ffd36a':'#ff6a2a');}}
 river(x,t){this.rect(x,159,this.W-x+10,41,'#2a6f8a');this.rect(x,159,this.W-x+10,2,'#9fd8d2');for(let k=0;k<6;k++)for(let xx=x+((t*20+k*9)%18);xx<this.W;xx+=18)this.rect(xx,165+k*6,6,1,'#5aa3b2');this.rect(x-3,158,4,42,'#5a3a28');}

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
   if(t<1.9){this.waterBase(g,g.scroll/PX);const k=ease(t/1.1),px=X(g.playerX),py=X(396+g.surfY*155);this.foot(Art.board,px,py+3);this.hero('surfDown',0,px,py);this.wall(X(148)+k*(W+30),150,40-k*60,'wave',g.time);}
   if(t>1.1&&t<2.2)this.fill('#f2fbf7',Math.min(1,(t-1.1)/.3)*(1-ease((t-1.9)/.3)));
   if(t>=1.9){this.underwater(g,g.scroll/PX);const s=ease((t-1.9)/1.5);this.spin(Art.hero.stumbleA,W*.4,30+s*70,t*5);for(let i=0;i<12;i++){const u=(t*1.3+i*.08)%1;this.rect(W*.4+Math.sin(i*2)*10,30+s*70-u*40,2,2,'#cdf6f4');}this.fill('#ffffff',1-ease((t-1.9)/.4));}
  }else if(from===2){
   if(t<1.55){this.underwater(g,g.scroll/PX);const s=ease(t/1.5);this.spin(Art.hero.swim0,W*.45,140-s*150,-1.2);for(let i=0;i<10;i++){const u=(t*1.5+i*.1)%1;this.rect(W*.45+Math.sin(i*2)*8,140-s*150+u*30,2,2,'#cdf6f4');}}
   else{this.tower(g,0);this.rect(0,150,W,50,'#2a7f9c');for(let x=0;x<W;x+=3)this.rect(x,150+Math.round(Math.sin(x*.25+g.time*4)),3,1,'#cdf2ec');const c=ease((t-1.9)/1.3),x=Math.round(W/2-37);
    if(t<1.9){this.hero('swim0',0,x,158);this.rect(x-14,151,28,10,'#2a7f9c');}else this.hero('climb',Math.floor((t-1.9)*8),x,158-c*40);
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
   }else{
    // Cut to the mountain where the helicopter goes down: it is a sleeping volcano.
    const mx=Math.round(W*.5),wreck=[mx-60,128],man=[mx-38,101];
    this.img(this.skyLayer('volcano',['#170a12','#341020','#5e1824','#9a2a24','#d24a26','#e8743a']),0,0);this.strip(this.farPines(),0,100);this.rect(0,158,W,42,'#24121a');
    this.foot(this.layer('mountain',220,140,(s,w,h)=>{s.poly([[0,h],[90,10],[130,8],[220,h]],'#4a4544');s.poly([[130,8],[220,h],[160,h],[118,30]],'#353131');s.dither(20,20,190,120,'#5c5653',.3);s.poly([[90,10],[130,8],[124,15],[95,15]],'#5a3a32');const r=seededRandom(6);for(let k=0;k<26;k++){const x=r()*w,y=h-r()*40,top=Math.round(140-Math.min(x,w-x)/90*130);if(y>top+6)s.poly([[x,y-6],[x+3,y],[x-3,y]],'#24402c');}}),mx,200);
    if(t>3.9){const glow=ease((t-3.9)/.8);this.alpha(glow,()=>{this.rect(mx-18,67,36,3,'#ff8a2a');this.rect(mx-12,66,24,1,'#ffd36a');});this.group(glow*.8,()=>{for(let i=0;i<8;i++){const u=(g.time*.5+i*.12)%1;this.blob(mx-6+Math.sin(i*2)*6+u*12,62-u*40,3+u*8,'#3a2830');}});}
    if(t<3.4){const f=ease((t-1.6)/1.8),hx=W*.12+(wreck[0]-W*.12)*f,hy=-10+(wreck[1]+10)*f*f;this.group(.75,()=>{for(let i=0;i<10;i++){const u=(g.time*1.6+i*.1)%1;this.blob(hx-u*16,hy-u*26,2+u*5,'#2a2228');}});this.spin(Art.heli[1],hx,hy,t*9);}
    else{this.spin(Art.heli[1],wreck[0],wreck[1],2.4);this.group(.5,()=>{for(let i=0;i<6;i++){const u=(g.time*.7+i*.17)%1;this.blob(wreck[0]+u*8,wreck[1]-6-u*30,2+u*5,'#3a3236');}});this.hero(t>3.9?'shock':'land',0,man[0],man[1]);
     if(t<4)this.group(1-(t-3.4)/.6,()=>{for(let i=0;i<14;i++){const p=(t-3.4)/.6;this.blob(wreck[0]+(i-7)*p*5,wreck[1]-Math.sin(p*3)*(4+i%4*3),2,'#8a7a70');}});}
   }
   if(t>1.6&&t<2.4)this.fill('#fff6e0',1-ease((t-1.6)/.8));
  }else{
   this.forest(g,g.scroll/PX);const rx=Math.round(W*.55);this.river(rx,g.time);
   const front=X(g.waveFront)+ease(t/2)*(rx-X(g.waveFront)-6),cool=ease((t-2)/1.4);
   if(t<1.4){const j=ease((t-.6)/.8),x=100+ease(t/1.4)*(rx+18-100),y=GROUND-Math.sin(j*Math.PI)*36+j*14;this.hero(t<.6?'run':j<.5?'jumpUp':'fall',Math.floor(t*14),x,y);}
   else{this.hero('swim1',0,rx+24,176+Math.sin(g.time*3));this.rect(rx+4,170,40,30,'#2a6f8a');this.rect(rx+4,170,40,1,'#9fd8d2');}
   if(t>1.4&&t<2)this.splash(rx+24,160,(t-1.4)/.6);
   this.wall(front,GROUND+4,62+cool*20,cool>.5?'stone':'lava',g.time*(1-cool));
   if(t>2)this.group(.7*(1-ease((t-3.2)/.8)),()=>{for(let i=0;i<14;i++){const u=(g.time*.8+i*.07)%1;this.blob(front-30+i*4+Math.sin(i+g.time)*3,140-u*60,2+u*6,'#e6ebe8');}});
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
  else{const kind=PHASES[g.phase].kind;if(kind==='run')this.runPhase(g);else if(kind==='surf')this.surfPhase(g);else if(kind==='swim')this.swimPhase(g);else if(kind==='climb')this.climbPhase(g);else this.heliPhase(g);}
  if(g.openingFade>0)this.fill('#0a1e2b',g.openingFade/.35);
  c.setTransform(1,0,0,1,0,0);
 }
 // Warm every cached layer before the first playable frame.
 prepare(Game){const g=new Game(()=>.5);for(const time of [3,6,9]){g.beginOpening();g.openingTime=time;this.draw(g);}for(let k=0;k<6;k++){g.start(k);this.draw(g);g.state='transition';g.transitionFrom=k;for(const time of [.5,2,3.5])g.transitionTime=time,this.draw(g);}}
}
