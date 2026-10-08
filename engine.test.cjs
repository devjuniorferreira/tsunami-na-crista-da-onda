const assert = require('node:assert/strict');
const test = require('node:test');
const {ApocalipseGame: Game, PHASES} = require('./engine.js');
function tick(g, seconds, input={}){for(let i=0;i<Math.ceil(seconds*120);i++)g.update(1/120,input);}
function running(){const g=new Game(()=>.5);g.start();g.intro=0;g.spawn=999;g.course=[];tick(g,1);return g;}
function collide(g){g.objects=[{x:300,y:g.surfY,type:g.phase?'car':'cooler',hit:false}];g.update(1/120);}
function seeded(seed){return()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296;};}
test('each trip slows the runner and brings the street wave closer; third catches him',()=>{
 const g=running();const startSpeed=g.speed;collide(g);assert.equal(g.trips,1);assert.equal(g.health,2);assert(g.stumble>0);assert.equal(g.waveTarget,175);tick(g,.2);assert(g.speed<startSpeed*.6);assert(g.waveFront>110);
 g.jump();assert.equal(g.jumpBuffer,0);collide(g);assert.equal(g.trips,1,'one contact must not count twice');
 tick(g,1.8);assert(g.speed>250);collide(g);assert.equal(g.trips,2);assert.equal(g.waveTarget,240);tick(g,2);assert(g.waveFront>230);collide(g);assert.equal(g.trips,3);assert.equal(g.state,'caught');
 tick(g,1);assert(g.waveFront>300);assert.equal(g.state,'caught');tick(g,.7);assert.equal(g.state,'lost');g.start();assert.equal(g.trips,0);assert.equal(g.waveFront,110);
});
test('jump clears obstacles, lands, and respects pause',()=>{const g=running();g.jump();tick(g,.15);assert(g.y>48);collide(g);assert.equal(g.trips,0);g.pause();const d=g.distance,y=g.y;tick(g,1);assert.equal(g.distance,d);assert.equal(g.y,y);g.pause();g.objects=[];tick(g,1);assert.equal(g.y,0);});
test('board pickup and surfing checkpoint',()=>{const g=running();g.distance=299.99;g.update(1/120);assert.equal(g.state,'transition');tick(g,2.81);assert.equal(g.phase,1);assert.equal(g.health,3);g.intro=0;g.spawn=999;tick(g,1,{up:true});assert(g.surfY<.2);tick(g,2,{down:true});assert.equal(g.surfY,.9);g.jump();collide(g);assert.equal(g.health,3);g.jumpTime=0;for(let n=0;n<3;n++){g.invincible=0;collide(g)}assert.equal(g.state,'caught');tick(g,2);assert.equal(g.state,'lost');g.start(1);assert.equal(g.phase,1);g.intro=0;g.speed=350;g.distance=719.99;g.update(1/120);assert.equal(g.state,'transition');assert.equal(g.transitionFrom,1);});
test('pause during engulfment',()=>{const g=running();g.trips=2;g.health=1;collide(g);g.pause();tick(g,3);assert.equal(g.caughtTime,0);g.pause();tick(g,2);assert.equal(g.state,'lost');});

test('jump responds immediately, has controlled height and no mid-air double jump',()=>{
 const g=running();g.jump();assert.equal(g.vy,620);let peak=0,duration=0;
 do{g.update(1/120);peak=Math.max(peak,g.y);duration+=1/120;if(duration>.2&&duration<.22){const v=g.vy;g.jump();assert.equal(g.vy,v);}}while(g.y>0&&duration<2);
 assert(peak>115&&peak<130);assert(duration>.65&&duration<.8);
});
test('a press just before landing is remembered, but holding is not required',()=>{
 const g=running();g.jump();while(!(g.y<35&&g.vy<0))g.update(1/120);g.jump();
 let landed=false,rebounded=false;for(let i=0;i<30;i++){g.update(1/120);if(g.y===0)landed=true;if(landed&&g.y>0&&g.vy>0){rebounded=true;break;}}
 assert(rebounded);
});
test('both running courses can be cleared on phone and desktop with a consistent jump cue',()=>{
 for(const phase of [0,5])for(const width of [660,1100,1500]){
  const g=new Game(()=>.5);g.start(phase);g.intro=0;g.viewWidth=width;let jumps=0;const seen=new Set();
  for(let frame=0;frame<120*45&&g.state==='playing';frame++){
   for(const o of g.objects)seen.add(o.type);
   if(g.y===0&&g.objects.some(o=>!o.hit&&o.x>300&&o.x<=410)){g.jump();jumps++;}
   g.update(1/120);assert.equal(g.trips,0,`fair jump window in phase ${phase} at width ${width}`);
  }
  assert.equal(g.state,'transition');assert.equal(jumps,PHASES[phase].course.length);
  assert(phase===0?seen.has('log')&&seen.has('cooler'):seen.has('trunk')&&seen.has('rock'));
 }
});

test('transition pauses, emits pickup and splash once, and preserves scenery',()=>{
 const g=running();g.distance=299.99;g.update(1/120);assert.equal(g.state,'transition');const scroll=g.scroll;g.sounds=[];
 tick(g,.6);assert.deepEqual(g.sounds,['pickup']);g.pause();const t=g.transitionTime;tick(g,2);assert.equal(g.transitionTime,t);g.pause();tick(g,2.3);
 assert.equal(g.phase,1);assert.equal(g.state,'playing');assert.equal(g.intro,0);assert(g.scroll>=scroll&&g.scroll-scroll<50);assert.equal(g.sounds.filter(x=>x==='pickup').length,1);assert.equal(g.sounds.filter(x=>x==='splash').length,1);
 g.start();assert.equal(g.transitionTime,0);assert.deepEqual(g.sounds,[]);
});

test('opening plays visually timed beats, pauses, and can be skipped safely',()=>{
 const g=new Game();g.beginOpening();tick(g,5.1);assert.equal(g.state,'opening');assert.equal(g.distance,0);assert(g.sounds.includes('meteor')&&g.sounds.includes('impact'));assert(g.shake>1);g.pause();const time=g.openingTime;tick(g,1);assert.equal(g.openingTime,time);g.pause();tick(g,5.5);assert.equal(g.state,'playing');assert(g.distance<5);g.beginOpening();g.finishOpening();assert.equal(g.state,'playing');assert.equal(g.openingFade,.35);assert.equal(g.trips,0);g.finishOpening();assert.equal(g.state,'playing');
});

test('surf movement accelerates, brakes, respects bounds and collision follows the surfer',()=>{
 const g=new Game(()=>.5);g.start(1);g.intro=0;g.spawn=999;tick(g,.5,{right:true,up:true});assert(g.playerX>350);assert(g.surfY<.5);assert(g.playerVX>100);tick(g,.3);assert(Math.abs(g.playerVX)<2);tick(g,3,{right:true});assert.equal(g.playerX,480);assert.equal(g.playerVX,0);tick(g,4,{left:true,down:true});assert.equal(g.playerX,220);assert.equal(g.surfY,.9);
 g.objects=[{x:300,y:.9,type:'car',hit:false}];g.update(1/120);assert.equal(g.health,3);g.objects=[{x:220,y:.9,type:'car',hit:false}];g.update(1/120);assert.equal(g.health,2);
});
test('drag targets steer both axes without snapping or overshooting',()=>{
 const g=new Game(()=>.5);g.start(1);g.intro=0;g.spawn=999;g.update(1/120,{target:{x:430,y:.2}});assert(g.playerX>300&&g.playerX<301);tick(g,2,{target:{x:430,y:.2}});assert(Math.abs(g.playerX-430)<2);assert(Math.abs(g.surfY-.2)<.02);
});
test('surf jump needs a short recovery, so constant tapping is not a safe strategy',()=>{
 const g=new Game(()=>.5);g.start(1);g.intro=0;g.spawn=999;g.jump();assert.equal(g.jumpTime,.9);tick(g,1);assert.equal(g.jumpTime,0);g.jump();assert.equal(g.jumpTime,0,'still recovering');tick(g,1.1);g.jump();assert.equal(g.jumpTime,.9);
});

test('underwater: hits bring the shark closer, the dash passes through, three hits are fatal',()=>{
 const g=new Game(()=>.5);g.start(2);g.intro=0;g.spawn=999;
 g.objects=[{x:300,y:.5,type:'wreck',hit:false,seed:0}];g.update(1/120);assert.equal(g.trips,1);assert.equal(g.waveTarget,175);assert(g.sounds.includes('bite'));
 g.invincible=0;g.jump();assert(g.jumpTime>0);g.objects=[{x:300,y:.5,type:'wreck',hit:false,seed:0}];g.update(1/120);assert.equal(g.trips,1);
 g.jumpTime=0;for(let n=0;n<2;n++){g.invincible=0;g.objects=[{x:300,y:.5,type:'wreck',hit:false,seed:0}];g.update(1/120);}assert.equal(g.state,'caught');
});
test('building: lane switches are smooth, every falling row leaves a free column, hits raise the water',()=>{
 const g=new Game(seeded(7));g.start(3);g.intro=0;g.move(-1);g.move(-1);assert.equal(g.lane,0);tick(g,.4);assert(Math.abs(g.laneX)<.05);g.move(1);assert.equal(g.lane,1);
 let rows=0;for(let i=0;i<120*20;i++){const before=g.objects.length;g.invincible=99;g.update(1/120);const fresh=g.objects.filter(o=>o.y===-90&&o.warn>.54);if(fresh.length&&g.objects.length>before){rows++;assert(fresh.length<3);assert.equal(new Set(fresh.map(o=>o.lane)).size,fresh.length);}}
 assert(rows>10);
 const h=new Game(()=>.5);h.start(3);h.intro=0;h.spawn=999;h.objects=[{lane:1,y:380,type:'pot',warn:0,hit:false}];h.update(1/120);assert.equal(h.trips,1);assert.equal(h.waveTarget,175);
});
test('helicopter: meteors cost hearts and the phase ends with the giant-meteor cutscene',()=>{
 const g=new Game(()=>.5);g.start(4);g.intro=0;g.spawn=999;
 for(let n=0;n<3;n++){g.invincible=0;g.objects=[{x:g.playerX,y:g.surfY,type:'meteor',size:1,hit:false,seed:0}];g.update(1/120);}assert.equal(g.state,'caught');
 g.start(4);g.intro=0;g.speed=420;g.distance=599.9;g.update(1/120);assert.equal(g.state,'transition');g.sounds=[];tick(g,1.7);assert(g.sounds.includes('impact'));tick(g,3.5);assert.equal(g.phase,5);assert.equal(g.state,'playing');
});

test('a careful player can go from the beach to the end of the story',()=>{
 const g=new Game(seeded(3));g.start(0);let frames=0;const seen=[];
 while(g.state!=='won'&&frames<120*400){
  if(g.state==='lost')assert.fail(`lost in phase ${g.phase}`);
  const input={};const kind=g.config.kind;
  if(g.state==='playing'&&!seen.includes(g.phase))seen.push(g.phase);
  if(g.state==='playing'){
   if(kind==='run'&&g.y===0&&g.objects.some(o=>!o.hit&&o.x>300&&o.x<=410))g.jump();
   if(kind==='surf'||kind==='swim'||kind==='heli'){
    const ahead=g.objects.filter(o=>!o.hit&&o.x>g.playerX-70&&o.x<g.playerX+(kind==='heli'?330:260));
    let best=.5,bestGap=-1;for(let y=.1;y<=.9;y+=.05){const gap=ahead.length?Math.min(...ahead.map(o=>{const t=Math.max(0,(o.x-g.playerX)/(g.speed-(o.vx||0)));return Math.abs((o.type==='jelly'?o.y+Math.sin(g.time*2+o.seed*7)*.06:o.y)+(o.vy||0)*t-y);})):1;if(gap>bestGap+.001){bestGap=gap;best=y;}}
    input.target={x:kind==='heli'?180:300,y:best};
    if(ahead.some(o=>Math.abs(o.x-g.playerX)<90&&Math.abs(o.y-g.surfY)<.17))g.jump();
   }
   if(kind==='climb'){const danger=[0,1,2].map(l=>g.objects.some(o=>o.lane===l&&o.y<430&&o.y>-120));if(danger[g.lane]){const free=[0,1,2].filter(l=>!danger[l]).sort((a,b)=>Math.abs(a-g.lane)-Math.abs(b-g.lane))[0];if(free!==undefined)g.move(Math.sign(free-g.lane));}}
  }
  g.update(1/120,input);frames++;
 }
 assert.equal(g.state,'won');assert.deepEqual(seen,[0,1,2,3,4,5]);
});
