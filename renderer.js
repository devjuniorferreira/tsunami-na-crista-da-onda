/* Illustrated, layered 2D renderer. All artwork is drawn locally, without downloads. */
class TsunamiRenderer {
 constructor(canvas){this.canvas=canvas;this.c=canvas.getContext('2d');this.width=1100;this.time=0;this.sprites=new Map();this.resize();}
 resize(){const box=this.canvas.getBoundingClientRect();this.pixelWidth=box.width;this.pixelHeight=box.height;this.dpr=Math.min(devicePixelRatio||1,1.5);this.canvas.width=Math.round(box.width*this.dpr);this.canvas.height=Math.round(box.height*this.dpr);this.scale=Math.min(box.height/600,box.width/660);this.width=box.width/this.scale;this.offsetY=(box.height-600*this.scale)/2;}
 rect(x,y,w,h,color,r=0){const c=this.c;c.fillStyle=color;c.beginPath();if(r&&c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);c.fill();}
 ellipse(x,y,rx,ry,color){const c=this.c;c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
 path(points,color,stroke=0){const c=this.c;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));if(stroke){c.strokeStyle=color;c.lineWidth=stroke;c.stroke()}else{c.closePath();c.fillStyle=color;c.fill()}}
 gradient(x,y,x2,y2,stops){const g=this.c.createLinearGradient(x,y,x2,y2);stops.forEach(([p,c])=>g.addColorStop(p,c));return g;}
 text(t,x,y,size,color,align='left'){const c=this.c;c.fillStyle=color;c.font=`800 ${size}px Arial`;c.textAlign=align;c.fillText(t,x,y);}
 tiles(scroll,spacing,speed,margin,draw){
 const offset=scroll*speed,first=Math.floor((offset-margin)/spacing),last=Math.ceil((offset+this.width+margin)/spacing);
 for(let id=first;id<=last;id++)draw(id*spacing-offset,((id%1200)+1200)%1200);
 }
 building(x,base,w,h,seed,near=false){
 const key=`${w}:${h}:${seed%12}:${near}`;let sprite=this.sprites.get(key);
 if(!sprite){sprite=document.createElement('canvas');sprite.width=(w+12)*2;sprite.height=(h+36)*2;const original=this.c;try{this.c=sprite.getContext('2d');this.c.scale(2,2);this.buildingArt(6,h+30,w,h,seed,near);}finally{this.c=original;}this.sprites.set(key,sprite);}
 this.c.drawImage(sprite,x-6,base-h-30,w+12,h+36);
 }
 buildingArt(x,base,w,h,seed,near=false){
 const c=this.c,top=base-h,palette=near?['#bd8974','#d5b69a','#738d95','#aa8e83']:['#647f8b','#718b93','#8ca3a6','#a4aaa1'];
 this.rect(x,top,w,h,palette[seed%4]);this.rect(x+w-13,top,13,h,'#21384920');this.rect(x-3,top-6,w+6,7,near?'#e4c7a1':'#9dafad');
 for(let j=top+17;j<base-16;j+=near?38:27)for(let i=x+12;i<x+w-17;i+=near?30:22){this.rect(i,j,near?14:9,near?21:14,near?'#355663':'#c2c6b270',1);if(near){this.rect(i+2,j+2,4,17,'#8cb4bc');this.rect(i-3,j+22,20,3,'#e1c6a4');}}
 if(near){this.rect(x+8,base-44,w-16,44,'#395663');for(let i=x+12;i<x+w-12;i+=19)this.rect(i,base-39,13,34,'#60808b');this.rect(x+3,base-60,w-6,17,seed%2?'#396f71':'#cb705d');this.text(seed%2?'CAFÉ DA ORLA':'SURF & SOL',x+w/2,base-48,9,'#f8ead0','center');for(let i=0;i<w-4;i+=18)this.rect(x+3+i,base-42,9,7,'#edc6a4');}
 if(seed%3===0){this.rect(x+w*.6,top-22,3,20,'#526a77');this.path([[x+w*.6-14,top-18],[x+w*.6+16,top-18]],'#526a77',2);}
 }
 palm(x,y,size){const c=this.c;c.save();c.translate(x,y);c.scale(size,size);c.lineCap='round';c.strokeStyle='#806b57';c.lineWidth=12;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(14,-85,4,-151);c.stroke();for(let i=0;i<10;i++)this.path([[i*.6,-i*14], [i*.6+7,-i*14-3]],'#b99972',2);for(let i=0;i<7;i++){const a=i/6*Math.PI,dx=Math.cos(a)*72,dy=Math.sin(a)*-28;c.fillStyle=i%2?'#32655e':'#42776a';c.beginPath();c.moveTo(4,-150);c.quadraticCurveTo(dx*.55,-190+dy,dx,-141+dy*.25);c.quadraticCurveTo(dx*.65,-159+dy,4,-150);c.fill();}this.ellipse(4,-148,8,9,'#6e5a40');c.restore();}
 background(g){const c=this.c,W=this.width,t=this.time;
 this.rect(0,0,W,600,this.gradient(0,0,0,480,[[0,'#263f58'],[.35,'#73858d'],[.72,'#e6b894'],[1,'#f2d4a9']]));
 const glow=c.createRadialGradient(W*.77,166,2,W*.77,166,195);glow.addColorStop(0,'#ffe8b677');glow.addColorStop(1,'#ffe8b600');this.rect(W*.77-195,-30,390,390,glow);this.ellipse(W*.77,172,35,35,'#ffddb1');
 for(let i=0;i<7;i++){const x=((i*259-g.scroll*.035)%(W+400)+W+400)%(W+400)-170;this.ellipse(x,62+i%3*37,130,18,'#223d5140');this.ellipse(x+66,58+i%3*37,100,25,'#344a5c33');}
 for(let i=0;i<4;i++){const x=W*.52+i*22+Math.sin(t*.4)*8;this.path([[x,190+i%2*12],[x+5,187+i%2*12],[x+10,190+i%2*12]],'#556d77',1.5)}
 this.path([[0,304],[110,259],[196,278],[320,237],[455,280],[650,249],[800,292],[W,267],[W,363],[0,363]],'#73888c');
 this.tiles(g.scroll,105,.12,130,(x,id)=>this.building(x,342,78,65+(id*37)%94,id));
 this.rect(0,342,W,69,this.gradient(0,342,0,415,[[0,'#517d8c'],[1,'#75a9ab']]));
 for(let i=0;i<25;i++){const x=((i*67-g.scroll*.25)%(W+100)+W+100)%(W+100);this.path([[x,352+i%6*8],[x+20+i%3*12,352+i%6*8]],'#d4ddd13b',1.5)}
 this.rect(0,403,W,38,'#d3b792');this.path([[0,408],[W,408]],'#f0dcc0',3);
 this.tiles(g.scroll,330,.55,210,(x,id)=>{if(id%3===1)this.building(x,432,127,174,id,true);else this.palm(x+95,430,.85);});
 // Seafront pavement and railings, behind the road where the chase takes place.
 this.rect(0,438,W,26,'#b6a48d');for(let x=-g.scroll%70;x<W;x+=70){this.path([[x,410],[x,439]],'#536a6b',3);this.path([[x,450],[x+45,450]],'#d8c9ac',1)}this.path([[0,415],[W,415]],'#788a82',3);
 this.rect(0,461,W,8,'#e5cfa9');this.rect(0,469,W,131,this.gradient(0,469,0,600,[[0,'#475962'],[1,'#293f4c']]));this.rect(0,469,W,4,'#223c48');
 for(let x=-g.scroll%155;x<W;x+=155){this.rect(x,550,83,4,'#e5c59299',1);this.rect(x+9,557,83,1,'#182e3a55');}
 for(let i=0;i<65;i++){const x=((i*89-g.scroll)%(W+150)+W+150)%(W+150);this.rect(x,478+(i*37)%119,2+i%7,1,'#dfd6bb14');}
 this.tiles(g.scroll,380,.85,60,(x)=>{this.rect(x,424,34,5,'#735f51',2);this.rect(x+4,429,3,11,'#384e56');this.rect(x+27,429,3,11,'#384e56');});
 }
 board(x,y,angle=0){const c=this.c;c.save();c.translate(x,y);c.rotate(angle);this.ellipse(0,3,51,8,'#143c5066');this.ellipse(0,0,55,9,'#fff0be');this.path([[-44,-1],[42,-1]],'#ee7f57',4);this.path([[-31,3],[30,3]],'#328f8c',2);c.restore();}
 shoe(foot,angle,back){const c=this.c;c.save();c.translate(...foot);c.rotate(angle);this.rect(-7,-7,22,9,back?'#bac6b9':'#f5e9ce',4);this.rect(-7,1,23,3,'#213c4c',1);this.path([[1,-5],[7,-4]],back?'#66848a':'#cf795f',2);c.restore();}
 limb(root,end,a,b,color,width,bend=1){const dx=end[0]-root[0],dy=end[1]-root[1],d=Math.max(.01,Math.hypot(dx,dy));const reach=Math.min(d,a+b-.01),along=(a*a-b*b+reach*reach)/(2*reach),height=Math.sqrt(Math.max(0,a*a-along*along));const joint=[root[0]+dx/d*along+dy/d*height*bend,root[1]+dy/d*along-dx/d*height*bend];this.path([root,joint,end],color,width);return joint;}
 person(g,x,y,surf=false){const c=this.c;c.save();c.translate(x,y);c.lineCap='round';c.lineJoin='round';
 const moving=g.intro===0&&g.state!=='menu',air=g.y>0&&!surf,cycle=g.runCycle,theta=cycle*Math.PI*2;
 const trip=surf?0:Math.sin(Math.min(1,(1-g.stumble)*2)*Math.PI/2)*(g.stumble>0?1:0);
 const recovery=surf?0:Math.min(1,g.stumble*3),lean=trip*recovery;
 if(g.state==='caught'||g.state==='lost'){c.translate(g.phase===0?-g.caughtTime*15:0,g.caughtTime*24);c.rotate(Math.min(.9,g.caughtTime*.6));}
 const bob=surf?Math.sin(g.time*5)*2:moving&&!air?Math.sin(theta*2-.6)*2.2:Math.sin(g.time*2)*.5;
 const hip=[0,-64+bob+lean*11+g.land*18],shoulder=[9+lean*25,-105+bob+lean*23+g.land*15];
 const legs=[];
 for(let i=0;i<2;i++){
  const back=i===0,t=((cycle+(back?.5:0))%1+1)%1;let foot;
  if(surf)foot=back?[-29,-3]:[30,-3];
  else if(g.stumble>0)foot=back?[-27,-4-Math.sin(g.time*22)*4]:[28,-4-Math.max(0,Math.sin(g.time*18))*12];
  else if(air){const rise=Math.max(0,Math.min(1,g.vy/620));foot=back?[-25,-9-rise*14]:[24,-8-rise*28];}
  else if(!moving)foot=back?[-12,-3]:[13,-3];
  else if(t<.4)foot=[25-t*148,-3];
  else{
   // Match the backwards velocity at lift-off and landing: no foot snapping.
   const u=(t-.4)/.6,u2=u*u,u3=u2*u;
   const fx=(2*u3-3*u2+1)*-34.2+(u3-2*u2+u)*-88.8+(-2*u3+3*u2)*25+(u3-u2)*-88.8;
   foot=[fx,-3-37*Math.sin(Math.PI*u)**2];
  }
  legs.push({foot,back,t});
 }
 const arm=(back)=>{const swing=moving?-Math.cos(theta+(back?Math.PI:0)):.1;let elbow,wrist;
  if(g.state==='transition'&&g.transitionTime<.8){elbow=[shoulder[0]+23,shoulder[1]+24];wrist=[32,-47];}
  else if(surf){elbow=[shoulder[0]+(back?-28:27),shoulder[1]+20];wrist=[elbow[0]+(back?-21:23),elbow[1]-8];}
  else if(g.stumble>0){elbow=[shoulder[0]+24,shoulder[1]+(back?7:21)];wrist=[elbow[0]+22,elbow[1]-10+Math.sin(g.time*20)*(back?7:-7)];}
  else{const a=air?(back?-.6:.9):swing*.8;elbow=[shoulder[0]+Math.sin(a)*26,shoulder[1]+Math.cos(a)*26];wrist=[elbow[0]+Math.sin(a+1.9)*24,elbow[1]+Math.cos(a+1.9)*24];}
  this.path([shoulder,elbow,wrist],back?'#b57857':'#e5a47b',8);this.ellipse(wrist[0],wrist[1],4.5,4.5,back?'#b57857':'#e5a47b');
 };
 arm(true);
 for(const {foot,back,t} of legs){const knee=this.limb(hip,foot,35,35,back?'#af7454':'#e4a277',8);this.path([hip,[hip[0]+(knee[0]-hip[0])*.56,hip[1]+(knee[1]-hip[1])*.56]],back?'#21394c':'#2c4d61',14);this.shoe(foot,air?-.15:moving&&t>.4?-.6*Math.sin((t-.4)/.6*Math.PI):0,back);}
 this.path([[hip[0]-11,hip[1]-1],[shoulder[0]-12,shoulder[1]-3],[shoulder[0]+12,shoulder[1]],[hip[0]+12,hip[1]+2]],this.gradient(0,-105,25,-55,[[0,'#ffae72'],[.55,'#ee7951'],[1,'#bf533d']]));
 this.path([[hip[0]-8,hip[1]-6],[shoulder[0]-7,shoulder[1]+8]],'#ffc79570',2);this.path([[hip[0]-10,hip[1]+1],[hip[0]+11,hip[1]+1]],'#203d50',5);this.path([[shoulder[0]-6,shoulder[1]+1],[shoulder[0]+7,shoulder[1]+3]],'#fbd0a0',4);arm(false);
 const head=[shoulder[0]+5,shoulder[1]-19];this.path([[head[0]-1,head[1]+6],[shoulder[0]+2,shoulder[1]+1]],'#d8976c',9);
 c.save();c.translate(...head);c.rotate(g.stumble>0?.26:surf?-.07:.06);this.ellipse(0,0,11,14,'#e9ad80');this.path([[9,-2],[15,2],[9,5]],'#e9ad80');this.ellipse(-2,1,3,4,'#c38560');this.ellipse(-2,-11,13,7,'#263848');this.rect(-13,-11,6,12,'#263848',3);this.path([[-10,-15],[-2,-18],[9,-14]],'#3c4a53',3);this.rect(g.intro>0&&!surf?-8:7,-3,2.5,2.5,'#1c3744',1);this.path([[8,8],[12,7]],'#a76550',1.3);c.restore();c.restore();
 }
 obstacle(o,g){const c=this.c,x=o.x,y=g.phase===0?500:396+o.y*155;
 c.save();c.translate(x,y);if(g.phase===1)c.rotate(Math.sin(this.time*2+x)*.08);
 this.ellipse(0,4,o.type==='car'?68:35,7,'#092c3c44');
 if(o.type==='cooler'){this.rect(-26,-40,52,39,this.gradient(-26,-40,26,0,[[0,'#e9a367'],[1,'#bb603f']]),5);this.rect(-29,-46,58,10,'#f7dfae',3);this.rect(-22,-32,44,3,'#f6bc85');this.rect(-8,-25,16,7,'#c2c9ae',2);this.path([[-28,-31],[-33,-28],[-33,-16],[-27,-14]],'#dfcea5',3);}
 else if(o.type==='log'||o.type==='debris'){this.rect(-34,-29,68,27,'#87604b',10);this.path([[-28,-24],[24,-21]],'#c89968',3);this.path([[-23,-12],[19,-14]],'#553f38',2);this.ellipse(28,-16,11,13,'#d9ac77');this.ellipse(28,-16,7,9,'#a27551');this.ellipse(28,-16,3,5,'#c89763');}
 else{this.rect(-59,-31,118,31,this.gradient(-59,-31,59,0,[[0,'#d87956'],[.5,'#ec9970'],[1,'#974b42']]),8);this.path([[-38,-31],[-22,-55],[24,-55],[43,-31]],'#d37d5f');this.path([[-29,-33],[-18,-49],[0,-49],[0,-33]],'#244d63');this.path([[7,-33],[7,-49],[21,-49],[34,-33]],'#35667a');this.path([[-19,-47],[-3,-47]],'#b9d7d0',2);this.rect(6,-25,12,3,'#efc3a0',1);this.rect(46,-24,12,8,'#ffe3a0',2);this.rect(-60,-10,120,5,'#657774',2);for(const xx of [-36,36]){this.ellipse(xx,0,13,13,'#20323e');this.ellipse(xx,0,7,7,'#bdc6bc');this.ellipse(xx,0,3,3,'#50636a');}}
 c.restore();}
 wave(front,g){const c=this.c,t=this.time,base=526;const crest=front-13;
 // This silhouette occupies the street foreground, including the pavement and lane markings.
 c.save();c.fillStyle=this.gradient(0,188,front+60,560,[[0,'#163e5f'],[.3,'#1a647e'],[.7,'#288e9f'],[1,'#70c4bf']]);c.beginPath();c.moveTo(-100,620);c.lineTo(-100,220);c.bezierCurveTo(crest-90,157,crest+5,187,crest+27,236);c.bezierCurveTo(crest+47,282,crest-12,308,crest-16,272);c.bezierCurveTo(crest+3,282,crest+4,246,crest-14,247);c.bezierCurveTo(crest-60,285,crest-26,421,front,base);c.quadraticCurveTo(front+30,566,front+50,620);c.closePath();c.fill();
 c.save();c.clip();for(let i=0;i<17;i++){c.strokeStyle=i%3?'#9ae5d330':'#b8eddb66';c.lineWidth=i%3?2:4;c.beginPath();c.moveTo(crest-180+i*10,219);c.bezierCurveTo(crest-90+i*6,275,crest-150+i*14,370,front-30+i*7,620);c.stroke();}
 for(let i=0;i<52;i++){const yy=235+(i*67+t*85)%365,xx=crest-210+(i*47+t*25)%220;this.ellipse(xx,yy,2+i%3,1+i%2,'#c5f4dd44');}c.restore();
 c.strokeStyle='#d1f0df';c.lineWidth=9;c.beginPath();c.moveTo(crest-125,203);c.bezierCurveTo(crest-50,168,crest+11,194,crest+28,240);c.bezierCurveTo(crest+41,269,crest+6,293,crest-13,276);c.stroke();
 for(let i=0;i<22;i++){const u=i/21,x=crest-130+u*162,yy=201-22*Math.sin(u*Math.PI)+u*u*38;this.ellipse(x+Math.sin(t*4+i)*3,yy,7+i%4,3+i%3,'#d8f6e5');}
 // Foam stays attached to the water surface; no detached jet across the road.
 for(let i=0;i<13;i++){const yy=470+i*9,edge=front-12+(yy-470)*.29;this.ellipse(edge-5+Math.sin(t*3+i)*2,yy,4+i%3,2,'#c8eddb77');}
 this.path([[front-13,490],[front-4,519],[front+16,552],[front+23,576]],'#bcf0dc99',4);
 // Runoff is drawn over the road, not behind the character's ground plane.
 this.ellipse(front-18,541,43,10,'#85d5c78c');this.ellipse(front-32,574,69,10,'#b7edd158');c.restore();
 }
 surfWater(g){const c=this.c,W=this.width,t=this.time;this.rect(0,380,W,220,this.gradient(0,380,0,600,[[0,'#2d879c'],[.5,'#17657f'],[1,'#154860']]));for(let i=0;i<18;i++){const yy=385+i*13;c.strokeStyle=i%4?'#9de2d53b':'#e1f2d788';c.lineWidth=i%4?1.5:3;c.beginPath();for(let x=-40;x<W+40;x+=12){const y=yy+Math.sin(x*.013+t*2+i)*7;x===-40?c.moveTo(x,y):c.lineTo(x,y)}c.stroke();}for(let i=0;i<34;i++){const x=((i*59-g.scroll*1.2)%(W+120)+W+120)%(W+120);this.path([[x,405+i%7*25],[x+19,401+i%7*25]],'#c2f0df60',2)}}
 opening(g){
 const c=this.c,W=this.width,t=g.openingTime,smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
 // The meteor crosses the whole sky and falls into the sea on the left, where the wave is born.
 const IMPACT=5,after=t-IMPACT,sx=W*.97,sy=44,ix=W*.15,iy=270,len=Math.hypot(ix-sx,iy-sy),dx=(ix-sx)/len,dy=(iy-sy)/len;
 const fall=Math.max(0,Math.min(1,(t-3)/(IMPACT-3))),e=fall**1.7,hx=sx+(ix-sx)*e,hy=sy+(iy-sy)*e;
 this.rect(0,0,W,600,this.gradient(0,0,0,380,[[0,'#6eafc1'],[1,'#ffe0b2']]));
 // The sky burns orange while the meteor approaches, then slowly clears.
 if(t>2.4){c.save();c.globalAlpha=smooth((t-2.6)/2.2)*(1-smooth((t-7)/2.5))*.6;this.rect(0,0,W,380,this.gradient(0,0,0,380,[[0,'#3b2846'],[.6,'#d0613f'],[1,'#ffb36b']]));c.restore();}
 this.ellipse(W*.78,113,36,36,'#ffe7b5');
 if(t>2.4&&t<3.3){const a=Math.sin(smooth((t-2.4)/.9)*Math.PI),r=4+a*16;c.save();c.globalAlpha=a;this.ellipse(sx,sy,r*.35,r*.35,'#fffbe9');this.path([[sx-r*1.6,sy],[sx+r*1.6,sy]],'#fff6d0',2);this.path([[sx,sy-r*1.6],[sx,sy+r*1.6]],'#fff6d0',2);c.restore();}
 this.rect(0,250,W,205,this.gradient(0,250,0,455,[[0,'#35778e'],[1,'#8dcfc8']]));
 for(let i=0;i<15;i++){const yy=264+i*12;this.path([[0,yy],[W*.3,yy+Math.sin(t*2+i)*3],[W,yy]],'#d6f1db66',2);}
 if(fall>0&&t<IMPACT){
  // Reflection on the water, halo, layered fire trail, shed embers and a glowing core.
  c.save();c.globalAlpha=.25+fall*.4;this.ellipse(hx,262+(hy-sy)*.08,30+fall*50,4+fall*3,'#ffd38a');c.restore();
  const halo=c.createRadialGradient(hx,hy,0,hx,hy,90+fall*90);halo.addColorStop(0,'#fff3c8cc');halo.addColorStop(.3,'#ff9b4f55');halo.addColorStop(1,'#ff6a3000');this.rect(hx-190,hy-190,380,380,halo);
  const L=60+fall*300;c.save();c.lineCap='round';
  for(const [w,col,k] of [[34,'#ff5a2a44',1],[20,'#ff8c3f88',.8],[10,'#ffd27add',.55],[4,'#fffbe9ff',.3]]){c.strokeStyle=this.gradient(hx,hy,hx-dx*L*k,hy-dy*L*k,[[0,col],[1,col.slice(0,7)+'00']]);c.lineWidth=w*(.6+fall*.7);c.beginPath();c.moveTo(hx,hy);c.lineTo(hx-dx*L*k,hy-dy*L*k);c.stroke();}
  c.restore();
  for(let i=0;i<22;i++){const u=(i*.137+t*1.9)%1,px=hx-dx*L*u+Math.sin(i*12.9)*16*u,py=hy-dy*L*u+Math.cos(i*7.3)*16*u,r=2.6*(1-u)+.5;this.ellipse(px,py,r,r,i%3?'#ffb35c':'#fff0b0');}
  this.ellipse(hx,hy,8+fall*6,8+fall*6,'#fff6da');this.ellipse(hx+dx*2,hy+dy*2,4+fall*3,4+fall*3,'#ffc069');
 }
 if(after>0){
  // Shock rings spread across the sea surface.
  c.save();c.beginPath();c.rect(0,250,W,205);c.clip();c.strokeStyle='#f2fbf0';
  for(let k=0;k<3;k++){const a=after-k*.35;if(a>0&&a<2.6){const r=30+a*330;c.globalAlpha=(1-a/2.6)*.8;c.lineWidth=4-k;c.beginPath();c.ellipse(ix,iy,r,r*.09,0,0,Math.PI*2);c.stroke();}}
  c.restore();
  // Water column, falling spray and a cloud of steam.
  const up=smooth(after/.45),down=smooth((after-.7)/1.6),h=240*up*(1-down);
  if(h>2){this.path([[ix-28-h*.1,iy],[ix-12,iy-h],[ix+12,iy-h*.95],[ix+28+h*.1,iy]],'#d9f3eedd');this.ellipse(ix,iy-h,24+h*.13,14+h*.05,'#effcf6');this.ellipse(ix,iy,45+h*.2,8,'#ffffffaa');}
  for(let i=0;i<30;i++){const s=after*(.8+i%5*.12),ang=-Math.PI/2+(i/29-.5)*2.3,px=ix+Math.cos(ang)*(130+i%7*28)*s,py=iy+Math.sin(ang)*(280+i%4*45)*s+300*s*s,r=2.5+i%3;if(py<iy+4&&s<2.4)this.ellipse(px,py,r,r,'#e8faf3cc');}
  if(after>.2){const a=after-.2,k=smooth(a/3);c.save();c.globalAlpha=(1-smooth((a-1.5)/3))*.55;for(let i=0;i<7;i++)this.ellipse(ix+(i-3)*44*k+a*10,iy-60-k*120-i%3*25,30+k*50,18+k*26,'#eef1ef');c.restore();}
 }
 // Before the tsunami, the sea pulls back and strands fish on the wet sand.
 const recede=smooth((after-.6)/1.4)*(1-smooth((t-7.8)/1.2)),lift=40*recede;
 if(recede>0){this.path([[0,426-lift],[W*.5,410-lift],[W,435-lift],[W,440],[0,440]],'#b8986a');this.path([[0,426-lift],[W*.5,410-lift],[W,435-lift]],'#e7f6e6aa',3);
  for(const [fx,phase] of [[W*.43,0],[W*.62,2.1]]){c.save();c.globalAlpha=smooth((recede-.4)/.3);c.translate(fx,419-lift*.7);c.rotate(Math.sin(t*9+phase)*.35);this.ellipse(0,0,11,4.5,'#c4d6d6');this.path([[9,0],[16,-5],[16,5]],'#9fb7ba');this.ellipse(-6,-1,1.3,1.3,'#203644');c.restore();}}
 if(t>6){const grow=smooth((t-6.1)/3.4),s=.45+grow*.55;c.save();c.globalAlpha=smooth((t-6)/.6);c.translate(0,230-grow*70);c.scale(s,.35+grow*.55);this.wave((ix+grow*W*.25)/s,g);c.restore();}
 this.path([[0,426],[W*.5,410],[W,435],[W,600],[0,600]],'#e9c591');this.path([[0,426],[W*.5,410],[W,435]],'#f8edc9',8);
 this.palm(W-75,483,1.1);this.ellipse(311,516,95,10,'#b7906680');this.rect(236,508,143,9,'#cc785c',3);
 // Folding chair remains behind when he gets up.
 this.path([[252,439],[289,485],[259,514]],'#e6ddbd',5);this.path([[252,439],[273,489],[321,489],[333,514]],'#e6ddbd',5);this.path([[255,443],[278,481],[312,481]],'#508f94',15);
 const stand=smooth((t-6.7)/.9),run=smooth((t-8.1)/1.6);
 if(t>=8.1){this.person({...g,state:'playing',intro:0,runCycle:(t-8.1)*1.8,y:0,land:0,stumble:0},300+run*W*.6,514);}
 else{
  c.save();c.translate(290,514);c.lineCap='round';c.lineJoin='round';
  const hip=[-4,-32-32*stand],shoulder=[-12+21*stand,-74-31*stand];
  this.path([hip,[27-11*stand,-28],[31,-3]],'#ba805f',9);this.path([hip,[19-26*stand,-29],[6,-3]],'#e5a67c',10);
  this.path([hip,[25-13*stand,-28-10*stand]],'#27485a',15);this.shoe([31,-3],0,true);this.shoe([6,-3],0,false);
  this.path([[hip[0]-10,hip[1]],[shoulder[0]-11,shoulder[1]],[shoulder[0]+12,shoulder[1]],[hip[0]+12,hip[1]]],'#ef865b');
  // He looks up at the glint, follows the meteor and stares at the impact.
  const look=smooth((t-2.7)/.5),tilt=t<IMPACT?look*.4:.12,behind=t>=IMPACT||hx<300;
  c.save();c.translate(shoulder[0]+3,shoulder[1]-19);c.rotate(-tilt);this.ellipse(0,0,12,14,'#e8ac80');this.ellipse(-2,-11,13,6,'#263848');this.rect(-12,-10,6,11,'#263848',3);this.rect(look>.5&&behind?-8:7,-2,2.5,3,'#243847');c.restore();
  this.path([[shoulder[0]+9,shoulder[1]+8],[14,-50-stand*18],[36-stand*8,-55-stand*12]],'#e5a67c',8);
  this.path([[shoulder[0]-7,shoulder[1]+8],[-6,-48],[12,-55]],'#c38762',7);c.restore();
 }
 // Newspaper is an actual drawn prop; the impact makes him drop it onto the sand.
 const drop=smooth((t-5.25)/.9);c.save();c.translate(315+drop*38,452+drop*51);c.rotate(-.12+drop*1.4+Math.sin(t*2)*.018);this.rect(-27,-27,57,43,'#f3ecd3',1);this.path([[0,-26],[0,15]],'#b8b5a5',1);this.text('JORNAL',-22,-15,8,'#40505a');this.rect(-21,-9,17,12,'#8caba6');for(let i=0;i<5;i++){this.rect(5,-15+i*5,20,1,'#88928c');if(i<2)this.rect(-21,6+i*4,17,1,'#88928c');}c.restore();
 if(t>2.7&&t<3.7)this.text('?',322,372,28,'#fff3c5','center');
 if(t>5.1&&t<6.6)this.text('!',320,370,32,'#fff3c5','center');
 // Startled gulls flee from the impact.
 if(after>.2&&after<5){const a=after-.2;for(let i=0;i<4;i++){const bx=W*.32+i*38+a*170,by=205-i%2*18-a*32,f=Math.sin(t*14+i)*5;this.path([[bx-9,by-f],[bx,by],[bx+9,by-f]],'#344a55',2);}}
 this.rect(0,0,W,31,'#0b263bc9');this.rect(0,563,W,37,'#0b263bc9');
 if(after>0&&after<1){c.save();c.globalAlpha=(1-smooth(after/.9))*.85;this.rect(0,0,W,600,'#fff8e6');c.restore();}
 if(t>10)this.rect(0,0,W,600,`rgba(10,30,43,${smooth((t-10)/.5)})`);
 }
 transition(g){
 const c=this.c,t=g.transitionTime,smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
 const grab=smooth(t/.65),launch=smooth((t-.7)/1.5),water=smooth((t-.7)/1.5);
 c.save();c.globalAlpha=water;this.surfWater(g);c.restore();
 this.wave(g.waveFront+(148-g.waveFront)*water,g);
 const y=500-120*Math.sin(launch*Math.PI)-26*launch;
 if(t<.7){this.person(g,300,500);this.board(300+28*grab,458-5*grab,-1.18+grab*.6);}
 else{this.person({...g,y:Math.sin(launch*Math.PI)*100,vy:launch<.5?300:-300,stumble:0},300,y-5,launch>.5);this.board(328-28*launch,453+(y-453)*smooth((t-.7)/.5),-.58*(1-launch));}
 if(t>=2.2){const p=Math.min(1,(t-2.2)/.6);for(let i=0;i<14;i++){const direction=i<7?-1:1;this.ellipse(300+direction*(15+p*(25+i%7*7)),480-Math.sin(p*Math.PI)*(15+i%5*7),3*(1-p)+1,2,'#dcf7df');}}
 }
 draw(g){const c=this.c;this.time=g.time;const W=this.width;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.pixelWidth,this.pixelHeight);this.rect(0,0,this.pixelWidth,this.pixelHeight,'#102f41');c.save();c.translate(0,this.offsetY);c.scale(this.scale,this.scale);c.beginPath();c.rect(0,0,W,600);c.clip();if(g.shake>0)c.translate(Math.sin(g.time*91)*g.shake*7,Math.cos(g.time*73)*g.shake*3);
 if(g.state==='opening'||(g.state==='paused'&&g.resumeState==='opening')){this.opening(g);c.restore();return;}
 this.background(g);
 if(g.state==='transition'||(g.state==='paused'&&g.resumeState==='transition')){this.transition(g);}
 else if(g.phase===0){
  for(const o of g.objects)this.obstacle(o,g);
  const bx=300+Math.max(0,300-g.distance)*260/12;
  if(bx<W+100){this.rect(bx-12,403,5,97,'#a37f58');this.rect(bx-57,397,100,25,'#245d64',4);this.text('SUA PRANCHA',bx-7,414,10,'#ffe5b4','center');this.board(bx,458,-1.18);this.ellipse(bx,502,30,5,'#132c3944');}
  this.ellipse(300,505,Math.max(15,32-g.y*.09),5,'#142c4055');
  if(g.stumble>0)for(let i=0;i<9;i++){const u=(g.time*2+i*.11)%1;this.ellipse(278-u*43,501-u*17,3*(1-u)+1,2,'#eccb9877');}
  this.person(g,300,500-g.y);
  this.wave(g.waveFront,g);
  if(g.trips===2&&g.state==='playing'){const v=c.createLinearGradient(0,0,250,0);v.addColorStop(0,'#fb895322');v.addColorStop(1,'#fb895300');this.rect(0,0,250,600,v);}
 }else{this.surfWater(g);this.wave(148,g);for(const o of g.objects)this.obstacle(o,g);const lift=g.jumpTime>0?Math.sin(g.jumpTime/.9*Math.PI)*105:0,yy=396+g.surfY*155-lift;this.ellipse(g.playerX??300,405+g.surfY*155,52,6,'#c7f6df55');c.save();c.translate(g.playerX??300,yy);c.rotate(g.surfVelocity*.17+Math.sin(g.time*4)*.025);this.board(0,0,-.03);this.person(g,0,-5,true);c.restore();for(let i=0;i<12;i++){const u=(g.time*1.7+i*.083)%1;this.ellipse((g.playerX??300)-50-u*68,yy+5-u*18+u*u*25,3*(1-u)+1,1.5,'#e4f6debb')}if(g.state==='caught'||g.state==='lost'){this.rect(0,480-g.caughtTime*55,W,150+g.caughtTime*55,'#268ca7bb');}}
 // Atmospheric edge shading, restrained enough to preserve obstacle contrast.
 const shade=c.createLinearGradient(0,0,0,600);shade.addColorStop(0,'#09213988');shade.addColorStop(.22,'#09213900');shade.addColorStop(.85,'#09213900');shade.addColorStop(1,'#09213955');this.rect(0,0,W,600,shade);if(g.openingFade>0)this.rect(0,0,W,600,`rgba(10,30,43,${g.openingFade/.35})`);c.restore();}
}
