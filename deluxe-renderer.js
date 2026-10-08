/* Detailed vector art built on the existing scene. Static facades remain cached. */
class DeluxeRenderer extends TsunamiRenderer {
 buildingArt(x,base,w,h,seed,near=false){
  const c=this.c,top=base-h;
  if(!near){super.buildingArt(x,base,w,h,seed,false);this.rect(x+3,top+3,3,h-3,'#c8dde82b');for(let k=0;k<3;k++)this.rect(x+10+k*19,top+16+((seed+k)%3)*27,7,10,'#f4d59a55');return;}
  const colors=[['#dfb38a','#a87366'],['#b8cfc5','#729b99'],['#b4c4d3','#718999'],['#deb99f','#a28781']][seed%4];
  this.rect(x,top,w,h,this.gradient(x,top,x+w,base,[[0,colors[0]],[1,colors[1]]]));this.rect(x+w-13,top,13,h,'#28425733');
  this.rect(x-3,top-5,w+6,8,'#efdbb7');this.rect(x+3,top+4,w-6,3,'#5b6d6944');
  for(let y=top+20;y<base-66;y+=39){this.rect(x+2,y+29,w-4,3,'#edddc178');for(let xx=x+12;xx<x+w-18;xx+=29){
   this.rect(xx-2,y-2,20,28,'#decfb1');this.rect(xx,y,16,23,this.gradient(xx,y,xx+16,y+23,[[0,'#243f57'],[.5,'#7fa4b1'],[1,'#284d62']]));this.path([[xx+2,y+1],[xx+13,y+1],[xx+2,y+16]],'#d8eee54a');this.path([[xx+8,y],[xx+8,y+23]],'#dcceb0',1.5);
   this.rect(xx-5,y+20,26,3,'#385361');for(let b=0;b<5;b++)this.rect(xx-4+b*6,y+17,1,10,'#344d57');this.rect(xx-5,y+27,26,3,'#dcc7a7');
  }}
  this.rect(x+6,base-50,w-12,50,'#203e53');for(let xx=x+11;xx<x+w-14;xx+=24){this.rect(xx,base-43,19,40,'#689ca6');this.path([[xx+1,base-42],[xx+16,base-42],[xx+1,base-22]],'#cbe1d558');this.rect(xx+17,base-41,2,38,'#c7c3a3');}
  this.rect(x+3,base-64,w-6,18,'#284c5a',2);this.text(['MARÉ • CAFÉ','CASA DO SURF','PADARIA SOL','ORLA HOTEL'][seed%4],x+w/2,base-51,9,'#ffe0a0','center');
  this.path([[x+3,base-46],[x+w-3,base-46],[x+w+3,base-34],[x-3,base-34]],'#d06f58');for(let i=0;i<w;i+=20)this.path([[x+i,base-46],[x+i+10,base-46],[x+i+13,base-34],[x+i-3,base-34]],'#f0d3a2');
  for(const xx of [x+10,x+w-19]){this.rect(xx,base-10,13,10,'#8c6350',2);this.ellipse(xx+6,base-12,11,8,'#537969');this.ellipse(xx+1,base-15,5,6,'#799264');}
 }
 background(g){
  super.background(g);const c=this.c,W=this.width;
  // Sun shafts, wet asphalt highlights, gutters and street furniture.
  c.save();c.globalAlpha=.09;this.path([[W*.77,150],[W*.95,469],[W*.67,469]],'#ffe8b5');c.restore();
  this.tiles(g.scroll,420,.55,120,(x,id)=>{this.path([[x,440],[x,293],[x+26,283]],'#334d5c',4);this.rect(x+19,280,27,7,'#334d5c',3);this.rect(x+22,287,21,2,'#ffe5a7');this.rect(x-6,437,12,5,'#314552',2);});
  this.tiles(g.scroll,290,1,140,(x,id)=>{
   const y=514+id%3*20;this.ellipse(x,y,51+id%3*11,5,'#a6c7cc17');this.path([[x-35,y],[x+25,y]],'#d1dedd32',1);this.rect(x+91,474,28,8,'#263e4a',1);for(let j=0;j<6;j++)this.rect(x+94+j*4,475,1,6,'#7c969757');
  });
  this.path([[0,584],[W,584]],'#142c3c',3);this.rect(0,587,W,13,'#243e4b');
 }
 vehicle(x,y,variant=0,tilt=0){
  const c=this.c,van=variant%3===1,colors=[['#efab58','#a95a37'],['#dddac6','#809999'],['#69bbc0','#33677d']][variant%3];
  c.save();c.translate(x,y);c.rotate(tilt);this.ellipse(0,9,75,9,'#082b3f55');
  // A single footprint keeps every vehicle variant consistent with collisions.
  const roof=van?-67:-53;
  c.beginPath();c.moveTo(-64,-9);c.lineTo(-61,-29);c.quadraticCurveTo(-57,-36,-43,-36);c.lineTo(-29,roof+8);c.quadraticCurveTo(-26,roof, -17,roof);c.lineTo(22,roof);c.quadraticCurveTo(30,roof,36,roof+10);c.lineTo(49,-33);c.lineTo(64,-26);c.lineTo(67,-8);c.closePath();c.fillStyle=this.gradient(-40,roof,20,0,[[0,colors[0]],[.6,colors[0]],[1,colors[1]]]);c.fill();c.strokeStyle='#233e51';c.lineWidth=1.5;c.stroke();
  this.path([[-37,-34],[-22,roof+7],[-3,roof+7],[-3,-34]],this.gradient(0,roof,0,-29,[[0,'#1c3c56'],[1,'#79aab8']]));this.path([[3,-34],[3,roof+7],[21,roof+7],[39,-34]],'#30566f');
  this.path([[-22,roof+9],[-7,roof+9],[-30,-35]],'#d7ebe056');this.path([[7,roof+9],[19,roof+9],[34,-36]],'#b4d8d26b');
  this.path([[-1,-31],[-1,-13],[32,-13],[36,-29]],'#34556288',1);this.rect(5,-28,9,3,'#dee0c8',1);this.path([[-54,-30],[46,-30]],'#fff2ce80',2);this.rect(-65,-10,132,6,'#253e4e',2);this.rect(-64,-8,131,2,'#b8c7c1');
  this.rect(54,-26,11,8,'#fff1ba',2);this.rect(-61,-27,6,7,'#d9564a',1);this.rect(43,-39,9,5,colors[1],2);this.rect(57,-15,9,3,'#1a394e',1);
  for(const xx of [-39,39]){this.ellipse(xx,-3,17,17,'#243541');this.ellipse(xx,-3,12,12,'#192d3a');this.ellipse(xx,-3,8,8,this.gradient(xx-8,-11,xx+8,5,[[0,'#e9e4cc'],[1,'#718d98']]));for(let k=0;k<5;k++){const a=k*Math.PI*.4;this.path([[xx,-3],[xx+Math.cos(a)*6,-3+Math.sin(a)*6]],'#324b5b',1.5);}this.ellipse(xx,-3,2,2,'#bccac4');}
  if(van){this.rect(-18,roof-4,44,4,'#516b75',2);this.rect(-13,roof-10,31,6,'#af9676',2);}
  c.restore();
 }
 obstacle(o,g){if(o.type!=='car'){super.obstacle(o,g);if(o.type==='cooler'){this.rect(o.x-19,472,8,2,'#fff4c6');}return;}
  const yy=396+o.y*155,variant=o.variant||0;this.vehicle(o.x,yy,variant,Math.sin(g.time*2+(o.seed||0))*.045);
  this.path([[o.x-65,yy+13],[o.x-40,yy+16],[o.x+35,yy+16],[o.x+66,yy+12]],'#cef4e2a6',2);
 }
 board(x,y,angle=0){const c=this.c;c.save();c.translate(x,y);c.rotate(angle);this.ellipse(0,5,57,7,'#102c4555');c.beginPath();c.moveTo(-57,0);c.bezierCurveTo(-28,-15,37,-12,59,-3);c.bezierCurveTo(48,8,-37,14,-57,0);c.fillStyle=this.gradient(0,-10,0,9,[[0,'#fff6cc'],[1,'#c6c6a3']]);c.fill();this.path([[-45,0],[43,-2]],'#df7654',4);this.path([[-36,4],[28,3]],'#3c909a',2);this.rect(-23,-6,13,11,'#253f5555',2);c.restore();}
 person(g,x,y,surf=false){
  const c=this.c;const active=g.intro===0&&g.state!=='menu',air=!surf&&g.y>0,phase=g.runCycle,angle=phase*Math.PI*2;
  const trip=!surf&&g.stumble>0?Math.sin(Math.min(1,(1-g.stumble)*2)*Math.PI/2)*Math.min(1,g.stumble*3):0;
  const flex=surf?Math.abs(g.surfVelocity)*7:0,bob=surf?Math.sin(g.time*4)*1.3:active&&!air?Math.sin(angle*2-.6)*1.8:0;
  const hip=[0,-65+bob+trip*13+g.land*20+flex],shoulder=[10+trip*27+(surf?g.surfVelocity*8:0),-105+bob+trip*27+g.land*14+flex];
  c.save();c.translate(x,y);c.lineCap='round';c.lineJoin='round';if(g.state==='caught'||g.state==='lost'){c.translate(-g.caughtTime*12,g.caughtTime*24);c.rotate(Math.min(.9,g.caughtTime*.6));}
  const legs=[];for(let i=0;i<2;i++){const back=i===0,t=((phase+(back?.5:0))%1+1)%1;let foot;
   if(surf)foot=back?[-30,-3]:[31,-3];else if(trip)foot=back?[-29,-4]:[24,-5-Math.max(0,Math.sin(g.time*18))*12];else if(air){const rising=Math.max(0,g.vy/620);foot=back?[-25,-8-rising*18]:[25,-7-rising*30];}else if(!active)foot=back?[-11,-3]:[12,-3];else if(t<.4)foot=[25-t*148,-3];else{const u=(t-.4)/.6,u2=u*u,u3=u2*u;foot=[(2*u3-3*u2+1)*-34.2+(u3-2*u2+u)*-88.8+(-2*u3+3*u2)*25+(u3-u2)*-88.8,-3-37*Math.sin(Math.PI*u)**2];}legs.push({back,t,foot});}
  const arm=back=>{let elbow,wrist;const a=air?(back?-.55:.8):active?-Math.cos(angle+(back?Math.PI:0))*.75:0;
   if(surf){elbow=[shoulder[0]+(back?-25:24),shoulder[1]+22];wrist=[elbow[0]+(back?-22:23),elbow[1]-8-g.surfVelocity*8];}
   else if(trip||g.state==='transition'){elbow=[shoulder[0]+24,shoulder[1]+20];wrist=[elbow[0]+20,elbow[1]-8];}
   else{elbow=[shoulder[0]+Math.sin(a)*25,shoulder[1]+Math.cos(a)*25];wrist=[elbow[0]+Math.sin(a+1.9)*24,elbow[1]+Math.cos(a+1.9)*24];}
   this.path([shoulder,elbow,wrist],back?'#a26a50':'#d99973',9);this.path([shoulder,elbow,wrist],back?'#bf8760':'#efbb87',5);this.ellipse(wrist[0],wrist[1],4,4,back?'#c18b67':'#edb789');
  };
  arm(true);for(const {back,t,foot} of legs){const knee=this.limb(hip,foot,35.5,35,back?'#aa735a':'#e4aa7d',9);this.path([[knee[0]-1,knee[1]],[foot[0]-1,foot[1]-3]],back?'#c08e69':'#f0c394',3);this.path([hip,[hip[0]+(knee[0]-hip[0])*.6,hip[1]+(knee[1]-hip[1])*.6]],back?'#1d3348':'#345567',15);this.shoe(foot,air?-.15:active&&t>.4?-.55*Math.sin((t-.4)/.6*Math.PI):0,back);}
  c.beginPath();c.moveTo(hip[0]-12,hip[1]);c.quadraticCurveTo(hip[0]-7,hip[1]-22,shoulder[0]-13,shoulder[1]+2);c.quadraticCurveTo(shoulder[0],shoulder[1]-7,shoulder[0]+13,shoulder[1]+1);c.lineTo(hip[0]+13,hip[1]+2);c.closePath();c.fillStyle=this.gradient(shoulder[0]-12,shoulder[1],hip[0]+13,hip[1],[[0,'#ffca85'],[.4,'#ef8d5c'],[1,'#b74e40']]);c.fill();
  this.path([[shoulder[0]-7,shoulder[1]+7],[hip[0]-6,hip[1]-5]],'#ffcfa077',2);this.path([[hip[0]-9,hip[1]-8],[hip[0]+10,hip[1]-6]],'#a3463f77',2);this.path([[shoulder[0]-6,shoulder[1]+1],[shoulder[0]+6,shoulder[1]+2]],'#f9dfb0',4);this.rect(shoulder[0]+2,shoulder[1]+11,7,8,'#ffe5af99',1);arm(false);
  const hx=shoulder[0]+4,hy=shoulder[1]-20;this.path([[hx-1,hy+10],[shoulder[0]+1,shoulder[1]+2]],'#d5946a',9);c.save();c.translate(hx,hy);c.rotate(trip?.22:surf?-.1:.04);
  this.ellipse(0,0,11,14,this.gradient(-10,-10,12,10,[[0,'#f6c798'],[1,'#cb8c65']]));this.path([[9,-3],[15,1],[10,4]],'#e8b184');this.ellipse(-5,2,3,4,'#d99a73');this.rect(-13,-12,8,13,'#273e4f',3);this.path([[-13,-10],[-12,-17],[-4,-20],[9,-15],[12,-8],[4,-11],[-4,-8]],'#283d4f');this.path([[-10,-15],[-3,-17],[6,-14]],'#57707a',2);this.rect(7,-4,2.5,2.5,'#193549',1);this.path([[5,-7],[10,-6]],'#4b4843',1.5);this.path([[8,8],[12,7]],'#8d584a',1.3);c.restore();c.restore();
 }
 wave(front,g){super.wave(front,g);const c=this.c; // Surface highlights stay within the existing wave, avoiding detached jets.
  c.save();c.globalAlpha=.2;for(let i=0;i<5;i++){const x=front-75-i*25;this.path([[x,320],[x+7,375],[x+18,441],[x+28,500]],'#d6fff0',1.5);}c.restore();
 }
 surfWater(g){const c=this.c,W=this.width,t=g.time;this.rect(0,380,W,220,this.gradient(0,380,0,600,[[0,'#479fa6'],[.3,'#226f8a'],[1,'#173f5f']]));
  for(let i=0;i<13;i++){const yy=385+i*17;c.beginPath();for(let x=-20;x<W+20;x+=16){const y=yy+Math.sin(x*.012-t*2.5+i)*6+Math.sin(x*.033+t+i)*2;x===-20?c.moveTo(x,y):c.lineTo(x,y);}c.strokeStyle=i%3?'#91d4cb45':'#d2f3da99';c.lineWidth=i%3?1.5:3;c.stroke();}
  for(let i=0;i<32;i++){const x=((i*79-g.scroll*1.1)%(W+100)+W+100)%(W+100),y=402+i%8*22;this.path([[x,y],[x+12+i%4*4,y-2]],'#dff7df60',1.5);}
 }
}
