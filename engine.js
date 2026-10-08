/* Fixed-step simulation for every phase. Positions are world units (the screen is 600 tall), independent of pixels. */
const PHASES=[
 {key:'praia',kind:'run',chase:'wave',goal:300,speed:260,course:[1100,1800,2460,3070,3630,4150,4640,5110,5560,5990].map((position,i)=>({position,type:i<2?'log':i%3===0?'log':'cooler'}))},
 {key:'surfe',kind:'surf',goal:720,speed:350,mpu:18/350},
 {key:'mar',kind:'swim',chase:'shark',goal:420,speed:300,mpu:12/300},
 {key:'predio',kind:'climb',chase:'water',goal:30,speed:170},
 {key:'ceu',kind:'heli',goal:600,speed:420,mpu:18/420},
 {key:'vulcao',kind:'run',chase:'lava',goal:420,speed:285,course:[1000,1650,2250,2800,3400,3900,4450,4950,5400,5900,6450,6900,7450,7950,8450].map((position,i)=>({position,type:i<2||i%3===1?'trunk':'rock'}))}
];
const LOW_OBSTACLES=new Set(['log','trunk']);
const START_EVENTS=['A onda invadiu a avenida! Corra até a prancha.','PEGOU A PRANCHA! Arraste na água ou use as setas.','DEBAIXO D’ÁGUA! Fuja do tubarão — IMPULSO acelera.','SUBA O PRÉDIO! Troque de coluna para desviar.','DECOLAMOS! Desvie dos meteoros.','É UM VULCÃO! Corra da lava!'];
const CHASE_EVENTS={
 wave:['TROPEÇOU! A onda ficou mais perto.','SEGUNDO TROPEÇO! Mais um e a onda pega você.','A ONDA ALCANÇOU VOCÊ!'],
 shark:['BATEU! O tubarão está chegando…','O TUBARÃO ESTÁ COLADO! Cuidado!','O TUBARÃO TE PEGOU!'],
 water:['ATINGIDO! A água subiu.','A ÁGUA ESTÁ NOS SEUS PÉS!','A ÁGUA TE ALCANÇOU!'],
 lava:['TROPEÇOU! A lava está mais perto.','SEGUNDO TROPEÇO! A lava está colada!','A LAVA TE ALCANÇOU!']
};
// Cutscene between phase n and n+1 (the last one ends the current story). Beat: [time, sound, shake, caption].
const TRANSITIONS=[
 {length:2.8,event:'A PRANCHA! Segure firme…',beats:[[.55,'pickup'],[2.2,'splash']]},
 {length:3.4,event:'A ONDA VAI QUEBRAR!',beats:[[1.1,'crash',1.2,'ENGOLIDO PELA ONDA!'],[2.3,'bubble',0,'Um tubarão… NADE!']]},
 {length:3.2,event:'Uma luz lá em cima…',beats:[[.4,'bubble'],[1.55,'splash',0,'Um prédio! Suba até o heliponto!']]},
 {length:3.4,event:'O HELIPONTO!',beats:[[1.35,'pickup',0,'Sabe pilotar? Vai ter que aprender!'],[2,'liftoff']]},
 {length:5,event:'UM METEORO GIGANTE!',beats:[[.2,'warning'],[1.6,'impact',1.3,'FOMOS ATINGIDOS!'],[3.4,'crash',1],[4,'rumble',.6,'Isso não é uma montanha… É UM VULCÃO!']]},
 {length:4,event:'O RIO! PULE!',beats:[[1.4,'splash'],[2,'steam',.3,'A lava esfriou… você sobreviveu!']]}
];
class ApocalipseGame {
 constructor(random=Math.random){this.random=random;this.viewWidth=1100;this.start(0);this.state='menu';this.event='';}
 get config(){return PHASES[this.phase];}
 start(phase=0){
  const cfg=PHASES[phase];
  Object.assign(this,{state:'playing',phase,time:0,distance:0,objects:[],y:0,vy:0,surfY:.5,surfVelocity:0,playerX:300,playerVX:0,health:3,trips:0,invincible:0,spawn:cfg.kind==='climb'?1.4:2.1,intro:phase===0?2.4:2,jumpTime:0,jumpCooldown:0,scroll:0,runCycle:0,speed:0,stumble:0,land:0,jumpBuffer:0,waveFront:110,waveTarget:110,caughtTime:0,shake:0,sounds:[],openingTime:0,openingFade:0,transitionTime:0,transitionFrom:-1,courseIndex:0,tutorialShown:false,lane:1,laneX:1,event:START_EVENTS[phase]});
  this.course=(cfg.course||[]).map(item=>({...item}));
 }
 beginOpening(){this.start(0);this.state='opening';this.event='Uma manhã tranquila na praia…';}
 finishOpening(){if(this.state!=='opening')return;this.state='playing';this.intro=.35;this.openingFade=.35;this.shake=0;this.event='CORRA! A prancha está no fim da avenida.';}
 pause(){if(this.state==='playing'||this.state==='caught'||this.state==='transition'||this.state==='opening'){this.resumeState=this.state;this.state='paused'}else if(this.state==='paused')this.state=this.resumeState||'playing';}
 jump(){
  if(this.state!=='playing'||this.intro>0||this.stumble>0)return;const kind=this.config.kind;
  if(kind==='run'){this.jumpBuffer=.16;if(this.y===0)this.takeoff();}
  else if((kind==='surf'||kind==='swim')&&this.jumpTime<=0&&this.jumpCooldown<=0){this.jumpTime=kind==='surf'?.9:.6;this.jumpCooldown=2;this.sounds.push(kind==='surf'?'jump':'dash');}
 }
 move(direction){if(this.state!=='playing'||this.intro>0||this.config.kind!=='climb')return;const lane=Math.max(0,Math.min(2,this.lane+direction));if(lane!==this.lane){this.lane=lane;this.sounds.push('step');}}
 takeoff(){this.sounds.push('jump');this.vy=620;this.jumpBuffer=0;this.land=0;}
 hit(obstacle){
  obstacle.hit=true;if(this.invincible>0||this.state!=='playing')return;
  const cfg=this.config;this.sounds.push(cfg.kind==='swim'?'bite':'hit');this.health--;this.invincible=1.7;this.shake=.45;
  if(cfg.chase){
   this.trips++;this.waveTarget=110+this.trips*65;if(cfg.kind==='run'){this.stumble=1;this.jumpBuffer=0;}
   this.event=CHASE_EVENTS[cfg.chase][Math.min(3,this.trips)-1];if(this.trips===3){this.state='caught';this.caughtTime=0;this.waveTarget=415;}
  }else{this.event=cfg.kind==='heli'?'ATINGIDO! O helicóptero está avariado.':'Bateu! Procure uma passagem entre os destroços.';if(this.health<=0){this.state='caught';this.caughtTime=0;}}
 }
 update(dt,input={}){
  if(this.state==='opening'){
   // Beats: glint 2.6 s, meteor 3–5 s, impact 5 s, sea recedes and the wave rises, run 8.1 s.
   const before=this.openingTime,t=this.openingTime+=dt,at=s=>before<s&&t>=s;this.time+=dt;this.shake=Math.max(0,this.shake-dt*.8);
   if(at(2.6))this.event='Hã? Que brilho é aquele no céu?';
   if(at(3))this.sounds.push('meteor');if(t>3&&t<5)this.shake=Math.max(this.shake,(t-3)*.13);
   if(at(5)){this.event='UM METEORO CAIU NO MAR!';this.sounds.push('impact');this.shake=1.3;}
   if(at(6.3)){this.event='O mar está recuando… é uma TSUNAMI!';this.sounds.push('warning');}
   if(at(8.1))this.event='Preciso da minha prancha!';
   if(t>=10.5)this.finishOpening();return;}
  if(this.state!=='playing'&&this.state!=='caught'&&this.state!=='transition')return;
  this.openingFade=Math.max(0,this.openingFade-dt);
  if(this.state==='transition'){this.updateTransition(dt);return;}
  this.time+=dt;this.shake=Math.max(0,this.shake-dt);this.waveFront+=(this.waveTarget-this.waveFront)*(1-Math.exp(-dt*3.5));
  if(this.state==='caught'){this.caughtTime+=dt;this.stumble=Math.max(.4,this.stumble-dt*.4);if(this.caughtTime>=1.65)this.state='lost';return;}
  this.invincible=Math.max(0,this.invincible-dt);this.land=Math.max(0,this.land-dt);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
  if(this.intro>0){this.intro=Math.max(0,this.intro-dt);return;}
  const kind=this.config.kind;
  if(kind==='run')this.updateRun(dt);else if(kind==='climb')this.updateClimb(dt);else this.updateSteer(dt,input);
  if(this.state==='playing'&&this.distance>=this.config.goal)this.finishPhase();
 }
 updateRun(dt){
  const cfg=this.config;this.stumble=Math.max(0,this.stumble-dt);
  this.speed+=((this.stumble>0?85:cfg.speed)-this.speed)*(1-Math.exp(-dt*(this.stumble>0?14:6)));
  const travel=this.speed*dt;this.scroll+=travel;this.distance+=travel*12/260;
  if(this.jumpBuffer>0&&this.y===0&&this.stumble===0)this.takeoff();
  const wasAirborne=this.y>0;this.vy-=(this.vy>0?1550:2050)*dt;this.y=Math.max(0,this.y+this.vy*dt);
  if(this.y===0){this.vy=0;if(wasAirborne){this.land=.16;this.sounds.push('land');}this.runCycle+=travel/148;}
  while(this.courseIndex<this.course.length&&this.course[this.courseIndex].position<=this.scroll+this.viewWidth+90){const item=this.course[this.courseIndex++];this.objects.push({x:300+item.position-this.scroll+travel,type:item.type,hit:false});}
  if(!this.tutorialShown&&this.objects.some(o=>o.x>340&&o.x<420)){this.tutorialShown=true;if(this.phase===0)this.event='PULE AGORA · toque em PULAR ou aperte espaço';}
  for(const o of this.objects){o.x-=travel;if(!o.hit&&Math.abs(o.x-300)<40&&this.y<(LOW_OBSTACLES.has(o.type)?27:43))this.hit(o);}
  this.objects=this.objects.filter(o=>o.x>-150);
 }
 updateSteer(dt,input){
  const cfg=this.config,kind=cfg.kind,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  this.stumble=0;this.speed+=(cfg.speed-this.speed)*(1-Math.exp(-dt*6));
  const travel=this.speed*dt;this.scroll+=travel;this.distance+=travel*cfg.mpu;this.runCycle+=dt*(kind==='swim'?1.6:1);
  const minX=kind==='heli'?160:220,maxX=kind==='heli'?Math.min(560,this.viewWidth-200):Math.min(480,this.viewWidth-140);
  const direction=(input.down?1:0)-(input.up?1:0),side=(input.right?1:0)-(input.left?1:0);
  const vertical=direction||(input.target?clamp((input.target.y-this.surfY)*7,-1,1):0);
  const horizontal=side||(input.target?clamp((input.target.x-this.playerX)/45,-1,1):0);
  this.surfVelocity+=(vertical*.96-this.surfVelocity)*(1-Math.exp(-dt*(vertical?13:18)));
  this.playerVX+=(horizontal*175-this.playerVX)*(1-Math.exp(-dt*(horizontal?12:18)));
  this.surfY=clamp(this.surfY+this.surfVelocity*dt,.1,.9);this.playerX=clamp(this.playerX+this.playerVX*dt,minX,maxX);
  if((this.surfY===.1&&this.surfVelocity<0)||(this.surfY===.9&&this.surfVelocity>0))this.surfVelocity=0;
  if((this.playerX===minX&&this.playerVX<0)||(this.playerX===maxX&&this.playerVX>0))this.playerVX=0;
  this.jumpTime=Math.max(0,this.jumpTime-dt);this.jumpCooldown=Math.max(0,this.jumpCooldown-dt);
  this.spawn-=dt;
  if(this.spawn<=0&&this.distance<cfg.goal-(kind==='heli'?30:45)){const r=this.random,W=this.viewWidth;
   if(kind==='surf'){this.objects.push({x:W+90,y:.18+r()*.64,type:r()<.55?'car':'debris',hit:false,variant:Math.floor(r()*3),seed:this.time});this.spawn=1.4+r()*.5;}
   else if(kind==='swim'){const jelly=r()<.6;this.objects.push({x:W+90,y:.15+r()*.7,type:jelly?'jelly':'wreck',hit:false,variant:Math.floor(r()*3),seed:this.time,vy:jelly?0:.03});this.spawn=1.1+r()*.5;}
   else{const fromTop=r()<.25,size=.75+r()*.45;this.objects.push(fromTop?{x:W*.4+r()*(W*.6+100),y:-.12,vx:-60,vy:.35+r()*.15,type:'meteor',size,hit:false,seed:this.time}:{x:W+60,y:.05+r()*.9,vx:-(60+r()*110),vy:.04+r()*.1,type:'meteor',size,hit:false,seed:this.time});this.spawn=.85+r()*.4;}
  }
  for(const o of this.objects){
   o.x-=travel+(o.vx||0)*dt;o.y+=(o.vy||0)*dt;const y=o.type==='jelly'?o.y+Math.sin(this.time*2+o.seed*7)*.06:o.y;
   if(o.hit)continue;const dx=Math.abs(o.x-this.playerX),dy=Math.abs(this.surfY-y);
   const collision=kind==='surf'?dx<(o.type==='car'?65:40)&&dy<(o.type==='car'?.16:.13)&&this.jumpTime<=0:kind==='swim'?dx<(o.type==='wreck'?60:28)&&dy<(o.type==='wreck'?.14:.09)&&this.jumpTime<=0:dx<36*o.size&&dy<.085*o.size;
   if(collision)this.hit(o);
  }
  this.objects=this.objects.filter(o=>o.x>-150&&o.y<1.3);
 }
 updateClimb(dt){
  const cfg=this.config,r=this.random;this.speed+=(cfg.speed-this.speed)*(1-Math.exp(-dt*6));
  const travel=this.speed*dt;this.scroll+=travel;this.distance=this.scroll/150;this.runCycle+=travel/110;
  this.laneX+=(this.lane-this.laneX)*(1-Math.exp(-dt*16));
  this.spawn-=dt;
  if(this.spawn<=0&&this.distance<cfg.goal-2){
   // Every row leaves at least one free column, and the warning gives time to switch.
   const lanes=[0,1,2].sort(()=>r()-.5),blocked=this.distance>10&&r()<.45?2:1;
   for(let i=0;i<blocked;i++)this.objects.push({lane:lanes[i],y:-90,type:['pot','ac','tv'][Math.floor(r()*3)],warn:.55,hit:false});
   this.spawn=Math.max(.75,1.15-this.distance*.012)+r()*.25;this.sounds.push('fall');
  }
  for(const o of this.objects){
   if(o.warn>0){o.warn-=dt;continue;}o.y+=(this.speed+210)*dt;
   if(!o.hit&&Math.abs(o.lane-this.laneX)<.45&&o.y>300&&o.y<440)this.hit(o);
  }
  this.objects=this.objects.filter(o=>o.y<700);
 }
 finishPhase(){const cfg=this.config;this.state='transition';this.transitionTime=0;this.transitionFrom=this.phase;this.distance=cfg.goal;this.y=0;this.vy=0;this.objects=[];this.event=TRANSITIONS[this.phase].event;}
 updateTransition(dt){
  const before=this.transitionTime,t=this.transitionTime+=dt,from=this.transitionFrom,scene=TRANSITIONS[from];this.time+=dt;this.shake=Math.max(0,this.shake-dt*.8);
  for(const [at,sound,shake,event] of scene.beats)if(before<at&&t>=at){this.sounds.push(sound);if(shake)this.shake=shake;if(event)this.event=event;}
  if(from===4&&t>.2&&t<1.6)this.shake=Math.max(this.shake,(t-.2)*.2);
  if(t<scene.length)return;
  if(from===PHASES.length-1){this.state='won';this.event='VOCÊ SOBREVIVEU… POR ENQUANTO.';return;}
  const scroll=this.scroll,time=this.time,sounds=this.sounds;this.start(from+1);this.time=time;this.sounds=sounds;
  if(from===0){this.scroll=scroll;this.intro=0;this.speed=350;}else this.intro=1.2;
 }
}
if(typeof module!=='undefined')module.exports={ApocalipseGame,PHASES,TRANSITIONS};
