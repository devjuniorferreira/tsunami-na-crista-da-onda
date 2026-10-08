/* Pixel-art toolkit: crisp rasterising into a pixel buffer, automatic outlines and every sprite of the game, built once at load. */
const PAL={
 ink:'#1a1c2c',white:'#f4f4f4',
 hair:'#2b2433',hairHi:'#54445e',skin:'#f2b48c',skinMid:'#d98d66',skinDark:'#ad6648',
 shirt:'#f0703c',shirtDark:'#b8452f',shorts:'#2d6d93',shortsDark:'#1d4763',shoe:'#f2eedf',shoeDark:'#aaa597',sole:'#3b3d4f'
};
class Surface {
 constructor(w,h){this.w=w;this.h=h;this.data=new Uint32Array(w*h);}
 static color(hex){if(typeof hex==='number')return hex;const n=parseInt(hex.slice(1,7),16),a=hex.length>7?parseInt(hex.slice(7,9),16):255;return((a<<24)|((n&255)<<16)|(n&0xff00)|(n>>16))>>>0;}
 plot(x,y,c){x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<this.w&&y<this.h)this.data[y*this.w+x]=Surface.color(c);}
 get(x,y){return x>=0&&y>=0&&x<this.w&&y<this.h?this.data[y*this.w+x]:0;}
 rect(x,y,w,h,c){const v=Surface.color(c);for(let j=Math.max(0,Math.round(y));j<Math.min(this.h,Math.round(y+h));j++)for(let i=Math.max(0,Math.round(x));i<Math.min(this.w,Math.round(x+w));i++)this.data[j*this.w+i]=v;}
 brush(x,y,w,c){if(w<=1){this.plot(x,y,c);return;}const a=-Math.floor((w-1)/2),b=Math.ceil((w-1)/2);for(let j=a;j<=b;j++)for(let i=a;i<=b;i++)if(w<3||!((i===a||i===b)&&(j===a||j===b)))this.plot(x+i,y+j,c);}
 line(x0,y0,x1,y1,w,c){const n=Math.max(1,Math.round(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let i=0;i<=n;i++)this.brush(Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),w,c);}
 disc(cx,cy,r,c){for(let j=-Math.ceil(r);j<=Math.ceil(r);j++)for(let i=-Math.ceil(r);i<=Math.ceil(r);i++)if(i*i+j*j<=r*r+r*.6)this.plot(cx+i,cy+j,c);}
 ellipse(cx,cy,rx,ry,c){for(let j=-Math.ceil(ry);j<=Math.ceil(ry);j++)for(let i=-Math.ceil(rx);i<=Math.ceil(rx);i++)if((i*i)/(rx*rx+.01)+(j*j)/(ry*ry+.01)<=1.05)this.plot(cx+i,cy+j,c);}
 poly(points,c){
  const v=Surface.color(c),ys=points.map(p=>p[1]);
  for(let y=Math.max(0,Math.floor(Math.min(...ys)));y<=Math.min(this.h-1,Math.ceil(Math.max(...ys)));y++){
   const yc=y+.5,xs=[];
   for(let i=0;i<points.length;i++){const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length];if((ay<=yc&&by>yc)||(by<=yc&&ay>yc))xs.push(ax+(yc-ay)/(by-ay)*(bx-ax));}
   xs.sort((a,b)=>a-b);for(let k=0;k+1<xs.length;k+=2)for(let x=Math.max(0,Math.ceil(xs[k]-.5));x<=Math.min(this.w-1,Math.floor(xs[k+1]-.5));x++)this.data[y*this.w+x]=v;
  }
 }
 grid(rows,palette,ox,oy){rows.forEach((row,j)=>{for(let i=0;i<row.length;i++){const ch=row[i];if(ch!=='.'&&palette[ch])this.plot(ox+i,oy+j,palette[ch]);}});}
 // Ordered (Bayer) dithering between bands keeps gradients crisp at low resolution.
 vgrad(x,y,w,h,colors){const n=colors.length-1,v=colors.map(Surface.color);for(let j=0;j<h;j++){const t=j/Math.max(1,h-1)*n,k=Math.min(n-1,Math.floor(t)),f=t-k;for(let i=0;i<w;i++){const px=Math.round(x+i),py=Math.round(y+j);if(px<0||py<0||px>=this.w||py>=this.h)continue;this.data[py*this.w+px]=f>BAYER[(py&3)*4+(px&3)]?v[k+1]:v[k];}}}
 // Dithering only shades pixels that are already painted, so it never leaks outside a shape.
 dither(x,y,w,h,c,amount){const v=Surface.color(c);for(let j=0;j<h;j++)for(let i=0;i<w;i++){const px=Math.round(x+i),py=Math.round(y+j);if(px>=0&&py>=0&&px<this.w&&py<this.h&&this.data[py*this.w+px]&&amount>BAYER[(py&3)*4+(px&3)])this.data[py*this.w+px]=v;}}
 ditherDisc(cx,cy,r,c,amount){const v=Surface.color(c);for(let j=-Math.ceil(r);j<=Math.ceil(r);j++)for(let i=-Math.ceil(r);i<=Math.ceil(r);i++){const px=Math.round(cx+i),py=Math.round(cy+j);if(i*i+j*j>r*r||px<0||py<0||px>=this.w||py>=this.h||!this.data[py*this.w+px])continue;if(amount>BAYER[(py&3)*4+(px&3)])this.data[py*this.w+px]=v;}}
 outline(c=PAL.ink){const v=Surface.color(c),d=this.data,o=new Uint32Array(d),w=this.w;for(let y=0;y<this.h;y++)for(let x=0;x<w;x++){if(d[y*w+x])continue;if(this.get(x-1,y)||this.get(x+1,y)||this.get(x,y-1)||this.get(x,y+1))o[y*w+x]=v;}this.data=o;return this;}
 flip(vertical=false){const o=new Uint32Array(this.data.length);for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++)o[y*this.w+x]=vertical?this.data[(this.h-1-y)*this.w+x]:this.data[y*this.w+this.w-1-x];this.data=o;return this;}
 recolor(map){const m=new Map(Object.entries(map).map(([a,b])=>[Surface.color(a),Surface.color(b)]));for(let i=0;i<this.data.length;i++){const r=m.get(this.data[i]);if(r!==undefined)this.data[i]=r;}return this;}
 canvas(){const c=document.createElement('canvas');c.width=this.w;c.height=this.h;const x=c.getContext('2d'),img=x.createImageData(this.w,this.h);new Uint32Array(img.data.buffer).set(this.data);x.putImageData(img,0,0);return c;}
}
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16);
function seededRandom(seed){return()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296;};}

/* ---------- The hero: poses are joint positions (feet at 0, y up is negative), rasterised as pixel art. ---------- */
const HEADS={
 right:['..hhhh..','.hhHHhh.','hhhhhhhh','hhhsssss','hhdssske','hhssssss','.hsssms.','..dsss..','...ss...'],
 up:['..hhhh..','.hhHHhh.','hhhhhhs.','hhhssske','hhdsssss','hhsssss.','.hssms..','..dss...','...ss...'],
 shock:['..hhhh..','.hhHHhh.','hhhhhhhh','hhhsssss','hhdsswke','hhssssss','.hsssmm.','..dsmm..','...ss...'],
 back:['..hhhh..','.hhHHhh.','hhhhhhhh','hhhhhhhh','dhhhhhhd','hhhhhhhh','.hhhhhh.','..ssss..','...ss...']
};
const HEAD_COLORS={h:PAL.hair,H:PAL.hairHi,s:PAL.skin,d:PAL.skinMid,k:PAL.ink,e:PAL.skin,w:PAL.white,m:'#9c3f3a'};
function drawHero(s,pose,ox,oy){
 const P=p=>[ox+p[0],oy+p[1]],seg=(a,b,w,c)=>{const [x0,y0]=P(a),[x1,y1]=P(b);s.line(x0,y0,x1,y1,w,c);},mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
 const back=pose.view==='back';
 const leg=([root,knee,foot],far)=>{
  seg(root,mix(root,knee,.6),4,far?PAL.shortsDark:PAL.shorts);seg(mix(root,knee,.55),knee,3,far?PAL.skinMid:PAL.skin);seg(knee,foot,3,far?PAL.skinMid:PAL.skin);
  const [fx,fy]=P(foot);if(back){s.rect(fx-1,fy-1,3,2,far?PAL.shoeDark:PAL.shoe);s.rect(fx-1,fy+1,3,1,PAL.sole);}else{s.rect(fx-1,fy-1,5,2,far?PAL.shoeDark:PAL.shoe);s.rect(fx-1,fy+1,5,1,PAL.sole);}
 };
 const arm=([root,elbow,hand],far)=>{seg(root,mix(root,elbow,.45),3,far?PAL.shirtDark:PAL.shirt);seg(mix(root,elbow,.4),elbow,3,far?PAL.skinMid:PAL.skin);seg(elbow,hand,2,far?PAL.skinMid:PAL.skin);const [hx,hy]=P(hand);s.rect(hx-1,hy-1,2,2,far?PAL.skinMid:PAL.skin);};
 const sh=pose.sh,hip=pose.hip;
 if(!back){arm(pose.farArm,true);leg(pose.farLeg,true);}else{leg(pose.farLeg,false);}
 seg(hip,sh,back?7:6,PAL.shirt);
 if(!back){const b=[-2,0];seg([hip[0]+b[0],hip[1]],[sh[0]+b[0],sh[1]+1],2,PAL.shirtDark);}else seg([hip[0],hip[1]-1],[sh[0],sh[1]+3],1,PAL.shirtDark);
 const [hx,hy]=P(hip);s.rect(hx-(back?3:3),hy-1,back?7:6,3,PAL.shorts);
 leg(pose.nearLeg,false);
 if(back)arm(pose.farArm,false);
 seg(sh,mix(sh,pose.head,.55),2,PAL.skinMid);
 arm(pose.nearArm,false);
 const [cx,cy]=P(pose.head);s.grid(HEADS[pose.headType||'right'],HEAD_COLORS,cx-4,cy-5);
}
// Run cycle: contact, down, pass, up for each leg; arms swing against the legs.
const RUN_LEGS=[[[4,7],[6,16]],[[3,7],[0,15]],[[1,8],[-3,16]],[[-2,8],[-7,14]],[[-4,6],[-10,9]],[[0,7],[-6,8]],[[5,5],[3,11]],[[6,6],[8,13]]];
const RUN_ARMS=[[[3,4],[7,1]],[[2,5],[6,3]],[[0,6],[3,8]],[[-2,5],[-1,10]],[[-4,4],[-4,9]],[[-2,5],[-1,10]],[[0,6],[3,8]],[[2,5],[6,3]]];
const RUN_HIP=[-16,-15,-16,-17,-16,-15,-16,-17];
function runPose(f){
 const hip=[0,RUN_HIP[f]],sh=[2,RUN_HIP[f]-11],rel=(r,[a,b])=>[r,[r[0]+a[0],r[1]+a[1]],[r[0]+b[0],r[1]+b[1]]];
 return{hip,sh,head:[3,RUN_HIP[f]-16],nearLeg:rel(hip,RUN_LEGS[f]),farLeg:rel(hip,RUN_LEGS[(f+4)%8]),nearArm:rel(sh,RUN_ARMS[(f+4)%8]),farArm:rel(sh,RUN_ARMS[f])};
}
function sidePose(hip,sh,head,nearLeg,farLeg,nearArm,farArm,headType){return{hip,sh,head,headType,nearLeg:[hip,...nearLeg],farLeg:[hip,...farLeg],nearArm:[sh,...nearArm],farArm:[sh,...farArm]};}
const POSES={
 idle:sidePose([0,-16],[1,-27],[1,-32],[[1,-8],[2,0]],[[-1,-8],[-2,0]],[[2,-21],[3,-16]],[[-1,-21],[-1,-16]]),
 grab:sidePose([0,-16],[1,-27],[1,-32],[[1,-8],[2,0]],[[-1,-8],[-2,0]],[[4,-31],[5,-36]],[[-1,-21],[-1,-16]],'up'),
 jumpUp:sidePose([0,-18],[2,-29],[3,-34],[[5,-13],[3,-6]],[[-2,-11],[-7,-6]],[[5,-31],[8,-35]],[[-3,-25],[-7,-27]]),
 fall:sidePose([0,-17],[1,-28],[2,-33],[[4,-10],[5,-2]],[[-2,-10],[-4,-2]],[[6,-28],[10,-30]],[[-4,-27],[-8,-29]]),
 land:sidePose([0,-12],[3,-22],[4,-27],[[6,-6],[4,0]],[[-1,-5],[-5,0]],[[5,-18],[8,-15]],[[0,-17],[3,-14]]),
 stumbleA:sidePose([0,-14],[7,-23],[10,-27],[[3,-7],[2,0]],[[-5,-10],[-11,-9]],[[11,-22],[15,-26]],[[9,-18],[13,-15]],'shock'),
 stumbleB:sidePose([0,-14],[7,-23],[10,-27],[[3,-7],[2,0]],[[-5,-11],[-11,-11]],[[10,-18],[14,-15]],[[10,-22],[13,-27]],'shock'),
 sit:sidePose([-3,-9],[-5,-20],[-4,-25],[[4,-11],[6,-2]],[[3,-10],[4,-1]],[[0,-15],[4,-18]],[[-2,-15],[3,-19]]),
 sitLook:sidePose([-3,-9],[-5,-20],[-4,-25],[[4,-11],[6,-2]],[[3,-10],[4,-1]],[[0,-15],[4,-18]],[[-2,-15],[3,-19]],'up'),
 shock:sidePose([0,-16],[0,-27],[0,-32],[[2,-8],[3,0]],[[-2,-8],[-3,0]],[[4,-30],[6,-35]],[[-3,-30],[-5,-35]],'shock'),
 surf:sidePose([0,-14],[2,-24],[3,-29],[[5,-8],[8,0]],[[-5,-8],[-8,0]],[[7,-23],[12,-22]],[[-5,-22],[-10,-20]]),
 surfUp:sidePose([0,-14],[0,-24],[0,-29],[[5,-8],[8,0]],[[-5,-8],[-8,0]],[[6,-26],[11,-28]],[[-6,-24],[-11,-24]]),
 surfDown:sidePose([0,-13],[4,-23],[6,-27],[[5,-7],[8,0]],[[-5,-8],[-8,0]],[[8,-20],[13,-18]],[[-3,-21],[-8,-18]]),
 surfJump:sidePose([0,-15],[3,-24],[4,-29],[[6,-9],[5,0]],[[-4,-9],[-6,0]],[[5,-17],[6,-10]],[[-3,-22],[-8,-25]]),
 swim0:sidePose([-7,-11],[5,-14],[10,-16],[[-14,-10],[-21,-8]],[[-14,-13],[-21,-15]],[[10,-12],[15,-13]],[[9,-14],[14,-15]]),
 swim1:sidePose([-7,-11],[5,-14],[10,-16],[[-14,-11],[-21,-11]],[[-14,-12],[-21,-12]],[[8,-9],[11,-8]],[[8,-16],[11,-17]]),
 swim2:sidePose([-7,-11],[5,-14],[10,-16],[[-14,-13],[-21,-15]],[[-14,-10],[-21,-8]],[[4,-9],[6,-12]],[[4,-16],[7,-14]]),
 swim3:sidePose([-7,-11],[5,-14],[10,-16],[[-14,-12],[-21,-12]],[[-14,-11],[-21,-11]],[[9,-11],[13,-12]],[[9,-15],[13,-15]])
};
const climbPose=(up)=>({view:'back',hip:[0,-15],sh:[0,-27],head:[0,-32],headType:'back',
 farArm:up===0?[[-3,-26],[-6,-31],[-6,-37]]:up===2?[[-3,-26],[-6,-22],[-6,-27]]:[[-3,-26],[-6,-27],[-6,-32]],
 nearArm:up===0?[[3,-26],[6,-22],[6,-27]]:up===2?[[3,-26],[6,-31],[6,-37]]:[[3,-26],[6,-27],[6,-32]],
 farLeg:up===0?[[-2,-15],[-3,-8],[-3,0]]:up===2?[[-2,-15],[-4,-11],[-3,-6]]:[[-2,-15],[-3,-9],[-3,-3]],
 nearLeg:up===0?[[2,-15],[4,-11],[3,-6]]:up===2?[[2,-15],[3,-8],[3,0]]:[[2,-15],[3,-9],[3,-3]]});

/* ---------- Props, obstacles and vehicles ---------- */
function sprite(w,h,draw,outline=true){const s=new Surface(w,h);draw(s);if(outline)s.outline();return s.canvas();}
function rotated(points,angle,ox,oy){const c=Math.cos(angle),s=Math.sin(angle);return points.map(([x,y])=>[ox+x*c-y*s,oy+x*s+y*c]);}
const Art={
 build(){
  if(this.built)return;this.built=true;const A=this;
  A.hero={};const frame=pose=>sprite(48,50,s=>drawHero(s,pose,24,46));
  A.hero.run=[0,1,2,3,4,5,6,7].map(f=>frame(runPose(f)));
  for(const [name,pose] of Object.entries(POSES))A.hero[name]=frame(pose);
  A.hero.swim=[0,1,2,3].map(f=>A.hero['swim'+f]);A.hero.climb=[0,1,2,1].map(f=>frame(climbPose(f)));
  A.board=sprite(30,7,s=>{s.poly([[1,3],[6,1],[24,1],[29,3],[24,5],[6,5]],'#fff0c4');s.rect(4,3,22,1,'#e8673f');s.rect(6,4,18,1,'#37939a');});
  A.log=sprite(26,11,s=>{s.rect(1,1,22,9,'#8a5a3b');s.rect(2,2,20,2,'#b07a4f');s.rect(3,7,18,1,'#6b4430');s.ellipse(21,5,4,4,'#e0ad73');s.ellipse(21,5,2,2,'#a8734a');});
  A.cooler=sprite(20,17,s=>{s.rect(1,4,18,12,'#e0593c');s.rect(1,4,18,2,'#f08a5a');s.rect(0,1,20,4,'#f2e6c8');s.rect(7,7,6,3,'#f2e6c8');s.rect(1,14,18,2,'#a63e2b');});
  const car=(body,dark,rust)=>sprite(46,20,s=>{s.poly([[1,14],[1,9],[7,8],[12,3],[30,3],[35,8],[43,9],[44,14]],body);s.rect(2,13,42,2,dark);s.poly([[13,4],[20,4],[20,8],[9,8]],rust?'#2b3a3a':'#2f5470');s.poly([[22,4],[29,4],[33,8],[22,8]],rust?'#24302f':'#3f6d8a');s.plot(14,5,'#cfe8ef');s.plot(23,5,'#cfe8ef');s.rect(41,10,2,2,'#ffe28a');s.rect(1,10,2,2,'#d8443a');for(const x of [11,34]){s.disc(x,15,3,'#262b33');s.plot(x,15,'#9aa3a8');}});
  A.cars=[car('#f0a04b','#b0632f'),car('#e8e4d0','#9aa09a'),car('#5cb8c4','#2f6f86')];
  A.wreck=[0,1,2].map(i=>{const s=new Surface(46,20);const src=[['#7d5a45','#4f382c'],['#5d6b5c','#3b463d'],['#6b5a6e','#413645']][i];s.poly([[1,14],[1,9],[7,8],[12,3],[30,3],[35,8],[43,9],[44,14]],src[0]);s.rect(2,13,42,2,src[1]);s.poly([[13,4],[20,4],[20,8],[9,8]],'#1b2a33');s.poly([[22,4],[29,4],[33,8],[22,8]],'#1b2a33');for(const x of [11,34])s.disc(x,15,3,'#1f2328');for(let k=0;k<7;k++)s.plot(6+k*5,10+(k%2),'#8a4a2c');s.flip(true);s.line(30,0,28,-6,1,'#3f8a52');s.outline();return s.canvas();});
  A.debris=sprite(28,13,s=>{s.line(2,9,25,4,3,'#8d6a4a');s.line(4,3,22,10,3,'#a07b55');s.disc(14,7,4,'#2a2d33');s.disc(14,7,2,'#54585e');});
  A.jelly=[0,1].map(f=>sprite(16,20,s=>{s.ellipse(8,6,6,5,'#e98ac9');s.rect(2,7,13,3,'#e98ac9');s.rect(4,3,4,2,'#ffd1ef');for(let k=0;k<4;k++){const x=4+k*3;for(let j=0;j<8;j++)s.plot(x+Math.round(Math.sin(j*.8+f*2+k)*1),10+j,j%2?'#c461a6':'#f0a7d9');}}));
  A.shark=[0,1,2].map(f=>sprite(52,28,s=>{
   const body=[[9,13],[17,9],[29,7],[39,8],[45,10],[49,13],[45,17],[37,19],[25,20],[15,19],[9,16]];s.poly(body,'#6f8596');
   s.poly([[23,9],[28,1],[32,8]],'#5d7282');s.poly(f===1?[[11,15],[3,7],[6,15],[2,23],[11,17]]:[[11,15],[2,9],[6,15],[3,21],[11,17]],'#5d7282');
   s.poly([[13,17],[25,20],[37,19],[45,17],[47,15],[30,16]],'#dfe7ea');s.poly([[29,18],[25,25],[34,19]],'#5d7282');
   for(let k=0;k<3;k++)s.line(34+k*2,12,34+k*2,15,1,'#4a5d6b');s.plot(42,12,'#101820');s.plot(41,12,'#dfe7ea');
   if(f===2){s.poly([[40,15],[52,10],[52,22]],0);s.poly([[42,15],[51,12],[51,20]],'#9c2f3a');for(let k=0;k<4;k++){s.plot(44+k*2,13-Math.round(k*.4),'#ffffff');s.plot(44+k*2,18+Math.round(k*.4),'#ffffff');}}else s.line(44,16,49,15,1,'#3b4a55');
   s.dither(15,9,28,4,'#8ea3b2',.35);
  }));
  A.pot=sprite(12,15,s=>{s.poly([[2,7],[10,7],[9,14],[3,14]],'#c8643c');s.rect(1,6,10,2,'#e07a4a');s.disc(4,4,2,'#3f8a52');s.disc(8,3,2,'#4fa05e');s.disc(6,2,2,'#3f8a52');});
  A.ac=sprite(18,14,s=>{s.rect(1,1,16,12,'#c9cdd4');s.rect(1,11,16,2,'#8c929c');for(let k=0;k<5;k++)s.rect(2,3+k*2,6,1,'#7d838c');s.disc(12,6,3,'#7d838c');s.disc(12,6,1,'#c9cdd4');});
  A.tv=sprite(16,14,s=>{s.rect(1,1,14,10,'#3a3f4f');s.rect(2,2,10,8,'#5e8fa6');s.rect(3,3,3,2,'#a9d6e8');s.rect(13,3,1,1,'#e05a4a');s.line(5,11,3,13,1,'#3a3f4f');s.line(11,11,13,13,1,'#3a3f4f');});
  A.rock=sprite(18,15,s=>{s.poly([[1,14],[3,6],[8,2],[13,3],[17,8],[17,14]],'#7b7380');s.poly([[3,7],[8,3],[12,4],[9,7]],'#a49ca8');s.dither(4,10,12,4,'#5a5462',.5);});
  A.trunk=sprite(28,11,s=>{s.rect(1,2,24,8,'#6a4632');s.rect(2,3,22,2,'#8d6145');s.ellipse(24,6,4,4,'#c99a64');s.ellipse(24,6,2,2,'#8d6145');s.rect(6,1,5,2,'#4f8a3c');s.rect(15,8,4,2,'#4f8a3c');});
  A.meteor=[5,7,9].map(r=>sprite(r*2+4,r*2+4,s=>{const c=r+2,rnd=seededRandom(r*31);s.disc(c,c,r,'#5b4640');for(let k=0;k<6;k++){const a=rnd()*6.28;s.disc(c+Math.cos(a)*r*.75,c+Math.sin(a)*r*.75,Math.max(1,r*.35),'#5b4640');}s.disc(c-1,c-1,r*.6,'#7d6156');s.disc(c+r*.3,c+r*.25,Math.max(1,r*.25),'#3f302c');s.line(c-r*.5,c+r*.2,c+r*.1,c+r*.6,1,'#ff9a3c');s.plot(c+r*.4,c-r*.4,'#ffcf7a');}));
  A.heli=[-.18,0,.16].map(a=>sprite(64,34,s=>{
   const R=p=>rotated(p,a,32,18);
   s.poly(R([[-12,-4],[-29,-2],[-29,1],[-12,3]]),'#c23b32');s.poly(R([[-30,-9],[-26,-2],[-31,2]]),'#c23b32');
   s.poly(R([[-11,-8],[4,-9],[12,-4],[15,2],[9,7],[-10,7],[-14,0]]),'#e04a3b');s.poly(R([[-11,2],[13,2],[9,7],[-10,7]]),'#a8302a');
   s.poly(R([[2,-7],[9,-4],[12,1],[3,1]]),'#8fd3e8');s.poly(R([[4,-6],[8,-4],[9,-2],[5,-2]]),'#d6f2fa');
   const [hx,hy]=R([[1,-4]])[0];s.rect(hx,hy-1,3,2,PAL.hair);s.rect(hx+1,hy+1,2,2,PAL.skin);
   for(const p of [[-8,7,-9,11],[7,7,8,11]]){const [[x0,y0],[x1,y1]]=R([[p[0],p[1]],[p[2],p[3]]]);s.line(x0,y0,x1,y1,1,'#3b3d4f');}
   const [[k0x,k0y],[k1x,k1y]]=R([[-12,11],[13,11]]);s.line(k0x,k0y,k1x,k1y,1,'#3b3d4f');
   const [[m0x,m0y],[m1x,m1y]]=R([[0,-9],[0,-12]]);s.line(m0x,m0y,m1x,m1y,2,'#3b3d4f');
   const [[tx,ty]]=R([[-29,-4]]);s.disc(tx,ty,1,'#9aa3a8');
   s.dither(...R([[-6,-6]])[0],10,3,'#f07a5f',.4);
  }));
  A.palm=sprite(48,58,s=>{
   for(let k=0;k<44;k++){const y=56-k,x=24+Math.round(Math.sin(k/44*1.6)*6-3);s.rect(x-1,y,4,1,k%4===0?'#6b4e36':'#8a6a4a');s.plot(x+2,y,'#5e4430');}
   const top=[27,13];
   for(const [a,len,c,d] of [[-3.0,19,'#2f6b45','#24523a'],[-2.45,21,'#3f8a52','#2f6b45'],[-1.85,13,'#4fa05e','#3f8a52'],[-1.2,15,'#4fa05e','#3f8a52'],[-.6,21,'#3f8a52','#2f6b45'],[-.1,19,'#2f6b45','#24523a'],[-3.5,15,'#24523a','#1d4230'],[.35,14,'#24523a','#1d4230']])
    for(let k=0;k<len;k++){const x=Math.round(top[0]+Math.cos(a)*k),y=Math.round(top[1]+Math.sin(a)*k*.6+(k/len)**2*9),w=k<len*.55?3:k<len*.85?2:1;s.brush(x,y,w,c);if(k%2&&k>3)s.plot(x,y+Math.ceil(w/2),d);}
   s.disc(26,15,2,'#6e4b2a');s.disc(29,16,2,'#7c5532');
  });
  A.pine=[0,1,2].map(v=>sprite(26,48,s=>{const c=['#1f3a2c','#24402f','#2b4a35'][v];s.rect(12,38,3,9,'#4a3024');for(let k=0;k<4;k++){const y=6+k*9,w=4+k*3;s.poly([[13,y-6],[13+w+2,y+6],[13-w-2,y+6]],c);s.dither(13-w,y+2,w*2,4,'#162b20',.4);}s.dither(15,4,6,36,'#3a5a44',.25);}));
  A.tree=[0,1].map(v=>sprite(34,46,s=>{s.rect(15,26,4,19,'#5a3a28');s.line(17,30,10,24,2,'#5a3a28');const c=v?'#2e5236':'#365d3c';for(const [x,y,r] of [[17,14,10],[9,19,7],[25,19,8],[13,9,6],[22,9,6]])s.disc(x,y,r,c);s.dither(5,4,24,10,'#4c7a4a',.3);s.dither(5,18,24,10,'#1f3a28',.45);}));
  A.chair=sprite(30,22,s=>{s.line(2,1,13,16,2,'#e6ddbd');s.line(13,16,29,16,2,'#e6ddbd');s.line(5,20,13,16,1,'#c9bf9e');s.line(26,16,28,21,1,'#c9bf9e');s.poly([[3,2],[6,1],[16,14],[13,15]],'#4f97a0');s.rect(13,13,14,3,'#4f97a0');s.dither(4,3,10,12,'#e6ddbd',.35);});
  A.paper=sprite(12,12,s=>{s.rect(0,0,11,10,'#f3ecd3');s.rect(5,0,1,10,'#c9c3ad');for(let k=0;k<4;k++){s.rect(1,2+k*2,3,1,'#88928c');s.rect(7,2+k*2,3,1,'#88928c');}s.rect(1,1,3,1,'#40505a');});
  A.boardUp=sprite(9,32,s=>{s.poly([[4,1],[7,6],[7,26],[4,30],[1,26],[1,6]],'#fff0c4');s.rect(4,4,1,24,'#e8673f');s.rect(3,6,1,20,'#37939a');});
  A.rack=sprite(22,40,s=>{s.rect(2,8,2,31,'#7a5a3e');s.rect(17,8,2,31,'#7a5a3e');s.rect(1,7,20,3,'#a5794f');s.rect(5,1,12,5,'#e8673f');s.rect(6,2,10,1,'#f2d14a');},false);
  A.helipad=sprite(60,8,s=>{s.ellipse(30,4,28,3,'#4b5260');s.ellipse(30,4,25,2,'#606878');s.rect(25,3,2,3,'#f2d14a');s.rect(33,3,2,3,'#f2d14a');s.rect(27,4,6,1,'#f2d14a');},false);
 }
};
