/* Fixed-step simulation for every phase. Positions are world units (the screen is 600 tall), independent of pixels. */
const PHASES=[
 {key:'praia',kind:'run',chase:'wave',goal:300,speed:260,course:[1100,1800,2460,3070,3630,4150,4640,5110,5560,5990].map((position,i)=>({position,type:i<2?'log':i%3===0?'log':'cooler'}))},
 {key:'surfe',kind:'surf',goal:720,speed:350,mpu:18/350},
 {key:'mar',kind:'swim',chase:'shark',goal:420,speed:300,mpu:12/300},
 {key:'predio',kind:'climb',chase:'water',goal:30,speed:170},
 {key:'ceu',kind:'heli',goal:600,speed:420,mpu:18/420},
 // Downhill by bike: rocks, trunks and lava cracks are jumped, low branches need a duck.
 {key:'vulcao',kind:'bike',chase:'lava',goal:480,speed:340,course:[[1100,'rock'],[1750,'trunk'],[2400,'branch'],[3000,'rock'],[3600,'branch'],[4200,'crack'],[4800,'trunk'],[5350,'branch'],[5950,'crack'],[6550,'rock'],[7100,'branch'],[7700,'crack'],[8250,'branch'],[8800,'rock'],[9400,'crack'],[9950,'trunk']].map(([position,type])=>({position,type}))},
 // One button on the dunes: hold to press into the slopes, let go to fly off the crests.
 {key:'deserto',kind:'dune',chase:'storm',goal:560,mpu:12/260},
 // Swinging between vines: hold to hang, let go to fly, hold again to catch the next one.
 {key:'floresta',kind:'vine',chase:'herd',goal:420,mpu:12/260},
 {key:'gelo',kind:'skate',chase:'ice',goal:520,speed:330,mpu:16/330},
 // Zero gravity: cross the asteroid field, then fix three thrusters on the giant meteor.
 {key:'espaco',kind:'space',goal:3,speed:260,field:16}
];
// Dune profile in world units (y up) and its slope.
const duneHeight=x=>85*Math.sin(x/200)+20*Math.sin(x/77);
const duneSlope=x=>85/200*Math.cos(x/200)+20/77*Math.cos(x/77);
const BEACON_REACH=62,VINE_HANDS=126,VINE_SPACING=360,VINE_REACH=310,SPACE_BOSS_R=230,STORM_START=520;
const DUCK_TIME=1;
const LOW_OBSTACLES=new Set(['log','trunk','crack']);
const START_EVENTS=['A onda invadiu a avenida! Corra até a prancha.','PEGOU A PRANCHA! Use o analógico ou as setas.','DEBAIXO D’ÁGUA! Fuja do tubarão — IMPULSO acelera.','SUBA O PRÉDIO! Troque de coluna para desviar.','DECOLAMOS! Desvie dos meteoros.','DESÇA DE BICICLETA! Pule pedras e fendas, abaixe nos galhos.','SEGURE nas descidas, SOLTE nos topos para voar!','SEGURE para agarrar o cipó, SOLTE para se lançar!','O LAGO CONGELOU! Deslize… e cuidado, não dá para frear.','GRAVIDADE ZERO! Atravesse os asteroides.'];
const CHASE_EVENTS={
 wave:['TROPEÇOU! A onda ficou mais perto.','SEGUNDO TROPEÇO! Mais um e a onda pega você.','A ONDA ALCANÇOU VOCÊ!'],
 shark:['BATEU! O tubarão está chegando…','O TUBARÃO ESTÁ COLADO! Cuidado!','O TUBARÃO TE PEGOU!'],
 water:['ATINGIDO! A água subiu.','A ÁGUA ESTÁ NOS SEUS PÉS!','A ÁGUA TE ALCANÇOU!'],
 lava:['BATEU! A lava está mais perto.','SEGUNDA BATIDA! A lava está colada!','A LAVA TE ALCANÇOU!'],
 storm:['','','A TEMPESTADE TE ENGOLIU!'],
 herd:['CAIU! A manada está chegando…','CAIU DE NOVO! A manada está colada!','A MANADA TE ALCANÇOU!'],
 ice:['BATEU! O gelo está rachando mais perto.','O GELO ESTÁ QUEBRANDO NOS SEUS PÉS!','O GELO QUEBROU!']
};
// Cutscene between phase n and n+1 (the last one ends the current story). Beat: [time, sound, shake, caption].
const TRANSITIONS=[
 {length:2.8,event:'A PRANCHA! Segure firme…',beats:[[.55,'pickup'],[2.2,'splash']]},
 {length:4.6,event:'Um kit de mergulho boiando! Pegue!',beats:[[.9,'pickup',0,'CILINDRO, MÁSCARA E PÉ DE PATO!'],[1.6,'warning',0,'A ONDA VAI QUEBRAR!'],[2.3,'crash',1.2,'ENGOLIDO PELA ONDA!'],[3.5,'bubble',0,'Respirando pelo cilindro… Um tubarão! NADE!']]},
 {length:3.2,event:'Uma luz lá em cima…',beats:[[.4,'bubble'],[1.55,'splash',0,'Um prédio! Suba até o heliponto!']]},
 {length:3.4,event:'O HELIPONTO!',beats:[[1.35,'pickup',0,'Sabe pilotar? Vai ter que aprender!'],[2,'liftoff']]},
 {length:7.6,event:'UM METEORO GIGANTE!',beats:[[.2,'warning'],[1.6,'impact',1.3,'FOMOS ATINGIDOS!'],[3.2,'crash',1,'Pouso forçado no topo da montanha!'],[4,'step',0,'Uma capela… tem alguém aí?'],[4.9,'rumble',.7,'Isso não é uma montanha… É UM VULCÃO!'],[5.7,'pickup',0,'Uma BICICLETA! Desça a montanha!']]},
 {length:9.4,event:'O RIO! PULE!',beats:[[1.3,'splash'],[2,'steam',.3,'A lava esfriou… ufa!'],[3.6,'warning',0,'A correnteza… é uma CACHOEIRA!'],[4.9,'splash',.6],[5.6,'step',0,'Um deserto?! O calor do meteoro secou tudo.'],[7,'pickup',0,'Uma prancha de sandboard!'],[8.2,'rumble',.4,'TEMPESTADE DE AREIA! Desça as dunas!']]},
 {length:6.6,event:'Um oásis!',beats:[[1.6,'crash',.7,'A tempestade te arrastou!'],[3.3,'land',0,'Uma floresta… e uma manada fugindo!'],[4.6,'rumble',.6,'Pegue o cipó!'],[5.6,'jump']]},
 {length:6.8,event:'Uma clareira…',beats:[[1.2,'warning',0,'O céu escureceu… a poeira do meteoro cobriu o sol!'],[3,'steam',0,'Está NEVANDO?!'],[4,'pickup',0,'Uma barraca… com casaco e gorro!'],[5.2,'land',0,'O rio congelou! Deslize!']]},
 {length:8.4,event:'Uma base de pesquisa!',beats:[[1.4,'pickup',0,'RÁDIO: “Um segundo meteoro vem aí. Alguém precisa desviá-lo.”'],[3.4,'step',0,'Sobrou eu… vamos lá!'],[4.4,'warning',0,'3… 2… 1…'],[5.6,'liftoff',.9,'DECOLAR!'],[7.2,'bubble',0,'O espaço…']]},
 {length:12,event:'PROPULSORES LIGADOS!',beats:[[.3,'liftoff',.6],[2,'warning',0,'Está funcionando… o meteoro está desviando!'],[4.2,'impact',.4,'Passou raspando! A TERRA ESTÁ SALVA!'],[6.6,'splash',0,'De volta à praia…'],[9,'pickup',0,'Que dia… o fim do mundo foi cancelado.']]}
];
class ApocalipseGame {
 constructor(random=Math.random){this.random=random;this.viewWidth=1100;this.start(0);this.state='menu';this.event='';}
 get config(){return PHASES[this.phase];}
 start(phase=0){
  const cfg=PHASES[phase];
  Object.assign(this,{state:'playing',phase,time:0,distance:0,objects:[],y:0,vy:0,surfY:.5,surfVelocity:0,playerX:300,playerVX:0,health:3,trips:0,invincible:0,spawn:cfg.kind==='climb'?1.4:2.1,intro:phase===0?2.4:2,jumpTime:0,jumpCooldown:0,scroll:0,runCycle:0,speed:0,stumble:0,land:0,jumpBuffer:0,waveFront:110,waveTarget:110,caughtTime:0,shake:0,sounds:[],openingTime:0,openingFade:0,transitionTime:0,transitionFrom:-1,courseIndex:0,tutorialShown:false,duckTutorial:false,duckTime:0,duckBuffer:0,lane:1,laneX:1,event:START_EVENTS[phase]});
  this.course=(cfg.course||[]).map(item=>({...item}));
  if(cfg.kind==='dune')Object.assign(this,{grounded:true,u:260,scroll:330,wy:duneHeight(330),vx:0,airTime:0,gap:STORM_START,perfectCool:0});
  if(cfg.kind==='vine'){this.vines=[];for(let i=0;i*VINE_SPACING<cfg.goal/cfg.mpu+900;i++)this.vines.push({x:220+i*VINE_SPACING,y:500+(i%3)*22});Object.assign(this,{mode:'swing',anchor:this.vines[0],rope:300,theta:-.55,omega:1.4,pressure:0,holdBefore:true,startX:this.vines[0].x-300*Math.sin(.55)});this.placeOnRope();this.scroll=this.wx-300;}
  if(cfg.kind==='space')Object.assign(this,{field:0,boss:null,beacons:[],surfY:.5,playerX:220});
 }
 placeOnRope(){this.wx=this.anchor.x+this.rope*Math.sin(this.theta);this.wy=this.anchor.y-this.rope*Math.cos(this.theta);}
 beginOpening(){this.start(0);this.state='opening';this.event='Uma manhã tranquila na praia…';}
 finishOpening(){if(this.state!=='opening')return;this.state='playing';this.intro=.35;this.openingFade=.35;this.shake=0;this.event='CORRA! A prancha está no fim da avenida.';}
 pause(){if(this.state==='playing'||this.state==='caught'||this.state==='transition'||this.state==='opening'){this.resumeState=this.state;this.state='paused'}else if(this.state==='paused')this.state=this.resumeState||'playing';}
 jump(){
  if(this.state!=='playing'||this.intro>0||this.stumble>0)return;const kind=this.config.kind;
  if(kind==='run'||kind==='bike'){this.jumpBuffer=.16;if(this.y===0)this.takeoff();}
  else if((kind==='surf'||kind==='swim')&&this.jumpTime<=0&&this.jumpCooldown<=0){this.jumpTime=kind==='surf'?.9:.6;this.jumpCooldown=2;this.sounds.push(kind==='surf'?'jump':'dash');}
 }
 duck(){if(this.state!=='playing'||this.intro>0||this.stumble>0||this.config.kind!=='bike')return;if(this.y===0)this.startDuck();else this.duckBuffer=.16;}
 // A tap keeps him low for a full second; holding the key keeps him down for as long as it is held.
 startDuck(){if(this.duckTime<=0)this.sounds.push('step');this.duckTime=Math.max(this.duckTime,DUCK_TIME);this.duckBuffer=0;}
 move(direction){if(this.state!=='playing'||this.intro>0||this.config.kind!=='climb')return;const lane=Math.max(0,Math.min(2,this.lane+direction));if(lane!==this.lane){this.lane=lane;this.sounds.push('step');}}
 takeoff(){this.sounds.push('jump');this.vy=620;this.jumpBuffer=0;this.land=0;this.duckTime=0;}
 hit(obstacle){
  obstacle.hit=true;if(this.invincible>0||this.state!=='playing')return;
  const cfg=this.config;this.sounds.push(cfg.kind==='swim'?'bite':cfg.kind==='vine'?'land':'hit');this.health--;this.invincible=1.7;this.shake=.45;
  if(cfg.chase){
   this.trips++;this.waveTarget=110+this.trips*65;if(cfg.kind==='run'||cfg.kind==='bike'){this.stumble=1;this.jumpBuffer=0;this.duckBuffer=0;this.duckTime=0;}
   this.event=CHASE_EVENTS[cfg.chase][Math.min(3,this.trips)-1];if(this.trips===3){this.state='caught';this.caughtTime=0;this.waveTarget=415;}
  }else{this.event=cfg.kind==='heli'?'ATINGIDO! O helicóptero está avariado.':cfg.kind==='space'?'ATINGIDO! O traje está danificado.':'Bateu! Procure uma passagem entre os destroços.';if(this.health<=0){this.state='caught';this.caughtTime=0;}}
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
  if(kind==='run'||kind==='bike')this.updateRun(dt,input);else if(kind==='climb')this.updateClimb(dt);else if(kind==='dune')this.updateDune(dt,input);else if(kind==='vine')this.updateVine(dt,input);else if(kind==='space')this.updateSpace(dt,input);else this.updateSteer(dt,input);
  if(this.state==='playing'&&this.distance>=this.config.goal)this.finishPhase();
 }
 updateRun(dt,input={}){
  const cfg=this.config,bike=cfg.kind==='bike';this.stumble=Math.max(0,this.stumble-dt);this.duckTime=Math.max(0,this.duckTime-dt);this.duckBuffer=Math.max(0,this.duckBuffer-dt);
  if(bike&&input.duck&&this.y===0&&this.stumble===0&&this.jumpBuffer===0)this.duckTime=Math.max(this.duckTime,.2);
  this.speed+=((this.stumble>0?(bike?120:85):cfg.speed)-this.speed)*(1-Math.exp(-dt*(this.stumble>0?14:6)));
  const travel=this.speed*dt;this.scroll+=travel;this.distance+=travel*12/260;
  if(this.jumpBuffer>0&&this.y===0&&this.stumble===0)this.takeoff();
  const wasAirborne=this.y>0;this.vy-=(this.vy>0?1550:2050)*dt;this.y=Math.max(0,this.y+this.vy*dt);
  if(this.y===0){this.vy=0;if(wasAirborne){this.land=.16;this.sounds.push('land');if(this.duckBuffer>0&&this.stumble===0)this.startDuck();}this.runCycle+=travel/(bike?120:148);}
  while(this.courseIndex<this.course.length&&this.course[this.courseIndex].position<=this.scroll+this.viewWidth+90){const item=this.course[this.courseIndex++];this.objects.push({x:300+item.position-this.scroll+travel,type:item.type,hit:false});}
  if(!this.tutorialShown&&this.objects.some(o=>o.x>340&&o.x<420)){this.tutorialShown=true;if(this.phase===0)this.event='PULE AGORA · toque em PULAR ou aperte espaço';if(bike)this.event='PULE A PEDRA · PULAR ou espaço';}
  if(bike&&!this.duckTutorial&&this.objects.some(o=>o.type==='branch'&&o.x>340&&o.x<480)){this.duckTutorial=true;this.event='GALHO BAIXO! SEGURE ↓ ou ABAIXAR até passar';}
  // A branch is only passed ducking on the ground; jumping into it hits the head.
  for(const o of this.objects){o.x-=travel;if(o.hit)continue;const branch=o.type==='branch',near=Math.abs(o.x-300)<(o.type==='crack'?48:40);
   if(near&&(branch?!(this.duckTime>0&&this.y===0):this.y<(LOW_OBSTACLES.has(o.type)?27:43)))this.hit(o);}
  this.objects=this.objects.filter(o=>o.x>-150);
 }
 updateSteer(dt,input){
  const cfg=this.config,kind=cfg.kind,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  this.stumble=0;this.speed+=(cfg.speed-this.speed)*(1-Math.exp(-dt*6));
  const travel=this.speed*dt;this.scroll+=travel;this.distance+=travel*cfg.mpu;this.runCycle+=dt*(kind==='swim'?1.6:1);
  const minX=kind==='heli'?160:220,maxX=kind==='heli'?Math.min(560,this.viewWidth-200):Math.min(480,this.viewWidth-140);
  const direction=(input.down?1:0)-(input.up?1:0),side=(input.right?1:0)-(input.left?1:0);
  const st=input.stick||{x:0,y:0};
  const vertical=direction||st.y||(input.target?clamp((input.target.y-this.surfY)*7,-1,1):0);
  const horizontal=side||st.x||(input.target?clamp((input.target.x-this.playerX)/45,-1,1):0);
  // On ice the skater keeps gliding: slow to turn, slower to stop.
  const grip=kind==='skate'?[2.4,.55]:[13,18],gripX=kind==='skate'?[2.4,.55]:[12,18];
  this.surfVelocity+=(vertical*(kind==='skate'?.8:.96)-this.surfVelocity)*(1-Math.exp(-dt*(vertical?grip[0]:grip[1])));
  this.playerVX+=(horizontal*175-this.playerVX)*(1-Math.exp(-dt*(horizontal?gripX[0]:gripX[1])));
  this.surfY=clamp(this.surfY+this.surfVelocity*dt,.1,.9);this.playerX=clamp(this.playerX+this.playerVX*dt,minX,maxX);
  if((this.surfY===.1&&this.surfVelocity<0)||(this.surfY===.9&&this.surfVelocity>0))this.surfVelocity=0;
  if((this.playerX===minX&&this.playerVX<0)||(this.playerX===maxX&&this.playerVX>0))this.playerVX=0;
  this.jumpTime=Math.max(0,this.jumpTime-dt);this.jumpCooldown=Math.max(0,this.jumpCooldown-dt);
  this.spawn-=dt;
  if(this.spawn<=0&&this.distance<cfg.goal-(kind==='heli'?30:45)){const r=this.random,W=this.viewWidth;
   if(kind==='surf'){this.objects.push({x:W+90,y:.18+r()*.64,type:r()<.55?'car':'debris',hit:false,variant:Math.floor(r()*3),seed:this.time});this.spawn=1.4+r()*.5;}
   else if(kind==='swim'){const jelly=r()<.6;this.objects.push({x:W+90,y:.15+r()*.7,type:jelly?'jelly':'wreck',hit:false,variant:Math.floor(r()*3),seed:this.time,vy:jelly?0:.03});this.spawn=1.1+r()*.5;}
   else if(kind==='skate'){const k=r(),type=k<.5?'hole':this.distance>180&&k>.86?'bear':'penguin';this.objects.push({x:W+70,y:.12+r()*.76,type,hit:false,seed:this.time,variant:Math.floor(r()*2),vy:type==='penguin'?(r()<.5?-1:1)*(.08+r()*.08):0});this.spawn=type==='bear'?1.8:.95+r()*.5;}
   else{const fromTop=r()<.25,size=.75+r()*.45;this.objects.push(fromTop?{x:W*.4+r()*(W*.6+100),y:-.12,vx:-60,vy:.35+r()*.15,type:'meteor',size,hit:false,seed:this.time}:{x:W+60,y:.05+r()*.9,vx:-(60+r()*110),vy:.04+r()*.1,type:'meteor',size,hit:false,seed:this.time});this.spawn=.85+r()*.4;}
  }
  for(const o of this.objects){
   if(o.type==='bear'){o.vy=Math.max(-.16,Math.min(.16,(this.surfY-o.y)*2));o.vx=120;}
   o.x-=travel+(o.vx||0)*dt;o.y+=(o.vy||0)*dt;if(o.type==='penguin'&&(o.y<.08||o.y>.92))o.vy=-o.vy;const y=o.type==='jelly'?o.y+Math.sin(this.time*2+o.seed*7)*.06:o.y;
   if(o.hit)continue;const dx=Math.abs(o.x-this.playerX),dy=Math.abs(this.surfY-y);
   const collision=kind==='skate'?dx<({hole:30,penguin:22,bear:40}[o.type])&&dy<({hole:.07,penguin:.07,bear:.1}[o.type]):kind==='surf'?dx<(o.type==='car'?65:40)&&dy<(o.type==='car'?.16:.13)&&this.jumpTime<=0:kind==='swim'?dx<(o.type==='wreck'?60:28)&&dy<(o.type==='wreck'?.14:.09)&&this.jumpTime<=0:dx<36*o.size&&dy<.085*o.size;
   if(collision)this.hit(o);
  }
  this.objects=this.objects.filter(o=>o.x>-150&&o.y<1.3);
 }
 updateDune(dt,input){
  const hold=!!input.hold,cfg=this.config,before=this.scroll;this.holding=hold;this.perfectCool=Math.max(0,this.perfectCool-dt);this.stumble=Math.max(0,this.stumble-dt);
  const gAir=hold?2400:600;
  if(this.grounded){
   const m=duneSlope(this.scroll),c=1/Math.sqrt(1+m*m);
   // Holding presses the board into the slope: faster downhill, but it also brakes uphill.
   this.u=Math.max(110,Math.min(720,this.u+(-600*m*c*(hold?(m>0?3.4:2.4):1)-this.u*.08+10)*dt));
   const vx=this.u*c,next=this.scroll+vx*dt,vy=vx*m,ballistic=this.wy+vy*dt-.5*gAir*dt*dt;
   if(!hold&&vy>0&&ballistic>duneHeight(next)){this.grounded=false;this.airTime=0;this.vx=vx;this.vy=vy;if(vy>160)this.sounds.push('jump');}else this.wy=duneHeight(next);
   this.scroll=next;this.runCycle+=dt*2;
  }else{
   this.vy-=gAir*dt;this.scroll+=this.vx*dt;this.wy+=this.vy*dt;this.airTime+=dt;const ground=duneHeight(this.scroll);
   if(this.wy<=ground){
    const m=duneSlope(this.scroll),diff=Math.abs(Math.atan2(this.vy,this.vx)-Math.atan(m)),speed=Math.hypot(this.vx,this.vy);
    // Matching the slope keeps the speed; a flat or uphill landing throws it away.
    if(diff<.34){this.u=speed*Math.cos(diff)*(m<0&&diff<.2?1.08:1);if(this.airTime>.2)this.sounds.push('land');if(m<0&&diff<.2&&!this.perfectCool){this.event='POUSO PERFEITO!';this.perfectCool=5;}}
    else{this.u=speed*Math.cos(diff)*.55;this.sounds.push('hit');this.shake=.35;this.stumble=.5;if(!this.perfectCool){this.event='POUSO RUIM! A tempestade ganhou terreno.';this.perfectCool=4;}}
    this.grounded=true;this.wy=ground;
   }
  }
  const vx=(this.scroll-before)/dt;this.speed=vx;this.distance+=(this.scroll-before)*cfg.mpu;
  // The storm speeds up as the dunes go on.
  this.gap=Math.min(640,this.gap+(vx-(270+this.distance*.1))*dt);
  this.trips=this.gap<150?2:this.gap<320?1:0;this.waveTarget=415-Math.max(0,this.gap)*.55;
  if(this.gap<=0){this.state='caught';this.caughtTime=0;this.trips=3;this.event=CHASE_EVENTS.storm[2];}
 }
 grabVine(){
  const ahead=this.vines.filter(v=>v.x>this.wx-60&&v!==this.released);
  let best=null,dist=Infinity;for(const v of ahead){const d=Math.hypot(v.x-this.wx,v.y-this.wy);if(d<dist){dist=d;best=v;}}
  if(this.mode==='ground'){best=ahead.find(v=>Math.abs(v.x-this.wx)<260);if(!best)return false;this.anchor=best;this.rope=best.y-VINE_HANDS-30;this.theta=Math.asin(Math.max(-.9,Math.min(.9,(this.wx-best.x)/this.rope)));this.omega=1.3;}
  else{if(!best||dist>VINE_REACH)return false;this.anchor=best;this.rope=Math.max(140,Math.min(best.y-200,dist));this.theta=Math.atan2(this.wx-best.x,best.y-this.wy);this.omega=(this.vx*Math.cos(this.theta)+this.vy*Math.sin(this.theta))/this.rope;}
  this.mode='swing';this.placeOnRope();this.sounds.push('step');return true;
 }
 updateVine(dt,input){
  const hold=!!input.hold,cfg=this.config,before=this.wx;this.holding=hold;this.stumble=Math.max(0,this.stumble-dt);
  if(this.mode==='swing'){
   if(!hold){this.mode='fly';this.released=this.anchor;this.vx=this.rope*this.omega*Math.cos(this.theta);this.vy=this.rope*this.omega*Math.sin(this.theta);if(this.vx>150)this.sounds.push('jump');}
   else{
    // Pendulum, with a little pumping while the hero kicks his legs.
    this.omega+=(-1500/this.rope*Math.sin(this.theta)+Math.sign(this.omega)*.5*(Math.abs(this.theta)<.4?1:0))*dt;this.omega=Math.max(-3.2,Math.min(3.2,this.omega));
    this.theta+=this.omega*dt;if(Math.abs(this.theta)>1.35){this.theta=Math.sign(this.theta)*1.35;this.omega=0;}this.placeOnRope();
   }
  }
  if(this.mode==='fly'){
   this.vy-=1500*dt;this.wx+=this.vx*dt;this.wy+=this.vy*dt;
   if(hold&&!this.holdBefore)this.wantGrab=true;if(!hold)this.wantGrab=false;
   if(this.wantGrab&&this.grabVine())this.wantGrab=false;
   else if(this.wy<=VINE_HANDS){this.wy=VINE_HANDS;this.mode='ground';this.vx=0;this.vy=0;this.stumble=.8;this.hit({});this.released=null;}
  }else if(this.mode==='ground'){this.wx+=110*dt;this.runCycle+=110*dt/148;if(hold&&this.stumble<=0)this.grabVine();}
  this.holdBefore=hold;
  const vx=(this.wx-before)/dt;this.speed=vx;this.scroll=this.wx-300;this.distance=Math.max(0,(this.wx-this.startX)*cfg.mpu);
  // Hanging around lets the herd catch up.
  this.pressure=Math.max(0,Math.min(320,this.pressure+dt*(vx<140?70:-45)));this.waveTarget=110+this.trips*65+this.pressure;
  if(this.state==='playing'&&this.waveTarget>=415){this.state='caught';this.caughtTime=0;this.trips=Math.max(this.trips,2);this.event=CHASE_EVENTS.herd[2];}
 }
 bossCenter(){return{x:this.boss.x,y:300};}
 updateSpace(dt,input){
  const cfg=this.config,r=this.random,W=this.viewWidth,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));this.field+=dt;this.runCycle+=dt;
  const side=(input.right?1:0)-(input.left?1:0),vert=(input.down?1:0)-(input.up?1:0);
  const py=90+this.surfY*420,tx=input.target?clamp((input.target.x-this.playerX)/60,-1,1):0,ty=input.target?clamp((90+input.target.y*420-py)/60,-1,1):0;
  // Thrusters push; a light drag keeps the drift controllable.
  const st=input.stick||{x:0,y:0};this.playerVX+=(side||st.x||tx)*520*dt;this.surfVelocity+=(vert||st.y||ty)*1.25*dt;const drag=Math.exp(-dt*1.4);this.playerVX*=drag;this.surfVelocity*=drag;
  this.playerX=clamp(this.playerX+this.playerVX*dt,110,W-90);this.surfY=clamp(this.surfY+this.surfVelocity*dt,.06,.94);
  if(this.playerX===110||this.playerX===W-90)this.playerVX*=-.3;if(this.surfY===.06||this.surfY===.94)this.surfVelocity*=-.3;
  this.speed=cfg.speed;this.scroll+=cfg.speed*dt;this.spawn-=dt;
  if(this.field<cfg.field){if(this.spawn<=0&&this.field<cfg.field-2){const size=.7+r()*.6;this.objects.push({x:W+60,y:.05+r()*.9,vx:40+r()*120,vy:(r()-.5)*.06,type:'asteroid',size,hit:false,seed:this.time});this.spawn=.65+r()*.4;}}
  else{
   if(!this.boss){this.boss={x:W+SPACE_BOSS_R+80};this.event='O METEORO GIGANTE! Encoste nos 3 pontos vermelhos dele.';this.sounds.push('warning');
    this.beacons=[2.55,Math.PI,3.73].map(a=>({a,done:false}));}
   this.boss.x+=((W-130)-this.boss.x)*(1-Math.exp(-dt*1.2));
   const c=this.bossCenter(),pyNow=90+this.surfY*420;
   for(const b of this.beacons){if(b.done)continue;const bx=c.x+Math.cos(b.a)*(SPACE_BOSS_R+8),by=c.y+Math.sin(b.a)*(SPACE_BOSS_R+8);if(Math.hypot(bx-this.playerX,by-pyNow)<BEACON_REACH){b.done=true;this.distance++;this.sounds.push('pickup');this.event=this.distance<3?`PROPULSOR ${this.distance}/3 INSTALADO! Siga a seta para o próximo.`:'PROPULSOR 3/3 INSTALADO!';}}
   // The meteor sheds chunks toward the hero.
   if(this.spawn<=0&&this.boss.x<W){const a=Math.PI*(.65+r()*.7),sx=c.x+Math.cos(a)*SPACE_BOSS_R,sy=c.y+Math.sin(a)*SPACE_BOSS_R;this.objects.push({x:sx,y:(sy-90)/420,vx:-cfg.speed+60+r()*60,vy:(r()-.5)*.12,type:'chunk',size:.55+r()*.3,hit:false,seed:this.time});this.spawn=1.2+r()*.5;}
   const dx=this.playerX-c.x,dy=pyNow-c.y,d=Math.hypot(dx,dy),min=SPACE_BOSS_R+20;
   if(d<min){const k=min/(d||1);this.playerX=c.x+dx*k;this.surfY=clamp((c.y+dy*k-90)/420,.06,.94);this.playerVX=Math.min(this.playerVX,0)-40;}
  }
  for(const o of this.objects){o.x-=(cfg.speed-o.vx)*dt;o.y+=o.vy*dt;if(o.hit)continue;const ox=Math.abs(o.x-this.playerX),oy=Math.abs((90+o.y*420)-(90+this.surfY*420));if(ox<30*o.size&&oy<30*o.size)this.hit(o);}
  this.objects=this.objects.filter(o=>o.x>-120&&o.y>-.3&&o.y<1.3);
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
  // The ride continues straight out of the cutscenes that end in motion.
  if(from===0){this.scroll=scroll;this.intro=0;this.speed=350;}else if(from===4){this.intro=0;this.speed=PHASES[5].speed*.8;}else if(from===5){this.intro=0;this.u=330;}else if(from===6||from===7){this.intro=0;this.speed=PHASES[from+1].speed||0;}else this.intro=1.2;
 }
}
if(typeof module!=='undefined')module.exports={ApocalipseGame,PHASES,TRANSITIONS,duneHeight,duneSlope};
