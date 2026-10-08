/* Fixed-step simulation. Positions are world units, independent of screen pixels. */
class TsunamiGame {
 constructor(random=Math.random){this.random=random;this.viewWidth=1100;this.start();this.state='menu';this.event='';}
 start(phase=0){Object.assign(this,{state:'playing',phase,time:0,distance:0,objects:[],y:0,vy:0,surfY:.5,surfVelocity:0,playerX:300,playerVX:0,health:3,trips:0,invincible:0,spawn:2.1,intro:phase===0?2.4:2,jumpTime:0,scroll:0,runCycle:0,speed:0,stumble:0,land:0,jumpBuffer:0,waveFront:110,waveTarget:110,caughtTime:0,shake:0,sounds:[],openingTime:0,openingFade:0,transitionTime:0,courseIndex:0,tutorialShown:false,event:phase===0?'A onda invadiu a avenida! Corra até a prancha.':'PEGOU A PRANCHA! Arraste na água ou use as quatro setas.'});this.course=[1100,1800,2460,3070,3630,4150,4640,5110,5560,5990].map((position,i)=>({position,type:i<2?'log':i%3===0?'log':'cooler'}));}
 beginOpening(){this.start(0);this.state='opening';this.event='Uma manhã tranquila na praia…';}
 finishOpening(){if(this.state!=='opening')return;this.state='playing';this.intro=.35;this.openingFade=.35;this.event='CORRA! A prancha está no fim da avenida.';}
 pause(){if(this.state==='playing'||this.state==='caught'||this.state==='transition'||this.state==='opening'){this.resumeState=this.state;this.state='paused'}else if(this.state==='paused')this.state=this.resumeState||'playing';}
 jump(){if(this.state!=='playing'||this.intro>0||this.stumble>0)return;if(this.phase===0){this.jumpBuffer=.16;if(this.y===0)this.takeoff();}else if(this.jumpTime<=0){this.jumpTime=.9;this.sounds.push('jump');}}
 takeoff(){this.sounds.push('jump');this.vy=620;this.jumpBuffer=0;this.land=0;}
 hit(obstacle){
  obstacle.hit=true;if(this.invincible>0||this.state!=='playing')return;
  this.sounds.push('hit');this.health--;this.invincible=1.7;this.shake=.45;
  if(this.phase===0){this.trips++;this.stumble=1;this.jumpBuffer=0;this.waveTarget=110+this.trips*65;this.event=this.trips===1?'TROPEÇOU! A onda ficou mais perto.':this.trips===2?'SEGUNDO TROPEÇO! Mais um e a onda pega você.':'A ONDA ALCANÇOU VOCÊ!';if(this.trips===3){this.state='caught';this.caughtTime=0;this.waveTarget=415;}}
  else{this.event='Bateu! Procure uma passagem entre os destroços.';if(this.health<=0){this.state='caught';this.caughtTime=0;}}
 }
 update(dt,input={}){
  if(this.state==='opening'){const before=this.openingTime;this.openingTime+=dt;this.time+=dt;if(before<2.6&&this.openingTime>=2.6){this.event='Espera… o que é aquilo no mar?';this.sounds.push('warning');}if(before<4&&this.openingTime>=4)this.event='UMA ONDA GIGANTE! Preciso da minha prancha!';if(this.openingTime>=6.5)this.finishOpening();return;}
  if(this.state!=='playing'&&this.state!=='caught'&&this.state!=='transition')return;
  this.openingFade=Math.max(0,this.openingFade-dt);
  if(this.state==='transition'){
   const before=this.transitionTime;this.transitionTime+=dt;this.time+=dt;
   if(before<.55&&this.transitionTime>=.55)this.sounds.push('pickup');
   if(before<2.2&&this.transitionTime>=2.2)this.sounds.push('splash');
   if(this.transitionTime>=2.8){const scroll=this.scroll,time=this.time,sounds=this.sounds;this.start(1);this.scroll=scroll;this.time=time;this.sounds=sounds;this.intro=0;this.speed=350;}
   return;
  }
  this.time+=dt;this.shake=Math.max(0,this.shake-dt);this.waveFront+=(this.waveTarget-this.waveFront)*(1-Math.exp(-dt*3.5));
  if(this.state==='caught'){this.caughtTime+=dt;this.stumble=Math.max(.4,this.stumble-dt*.4);if(this.caughtTime>=1.65)this.state='lost';return;}
  this.invincible=Math.max(0,this.invincible-dt);this.land=Math.max(0,this.land-dt);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
  if(this.intro>0){this.intro=Math.max(0,this.intro-dt);return;}
  this.stumble=Math.max(0,this.stumble-dt);
  const targetSpeed=this.phase===0?(this.stumble>0?85:260):350;
  this.speed+=(targetSpeed-this.speed)*(1-Math.exp(-dt*(this.stumble>0?14:6)));
  const travel=this.speed*dt;this.scroll+=travel;this.distance+=travel*(this.phase===0?12/260:18/350);
  if(this.phase===0){
   if(this.jumpBuffer>0&&this.y===0&&this.stumble===0){this.takeoff();}
   const wasAirborne=this.y>0;this.vy-=(this.vy>0?1550:2050)*dt;this.y=Math.max(0,this.y+this.vy*dt);
   if(this.y===0){this.vy=0;if(wasAirborne){this.land=.16;this.sounds.push('land');}this.runCycle+=travel/148;}
  }else{
   const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
   const direction=(input.down?1:0)-(input.up?1:0),side=(input.right?1:0)-(input.left?1:0);
   const vertical=direction||(input.target?clamp((input.target.y-this.surfY)*7,-1,1):0);
   const horizontal=side||(input.target?clamp((input.target.x-this.playerX)/45,-1,1):0);
   this.surfVelocity+=(vertical*.96-this.surfVelocity)*(1-Math.exp(-dt*(vertical?13:18)));
   this.playerVX+=(horizontal*175-this.playerVX)*(1-Math.exp(-dt*(horizontal?12:18)));
   this.surfY=clamp(this.surfY+this.surfVelocity*dt,.1,.9);
   this.playerX=clamp(this.playerX+this.playerVX*dt,220,Math.min(480,this.viewWidth-140));
   if((this.surfY===.1&&this.surfVelocity<0)||(this.surfY===.9&&this.surfVelocity>0))this.surfVelocity=0;
   if((this.playerX===220&&this.playerVX<0)||(this.playerX===Math.min(480,this.viewWidth-140)&&this.playerVX>0))this.playerVX=0;
   this.jumpTime=Math.max(0,this.jumpTime-dt);
  }
  this.spawn-=dt;const target=this.phase===0?300:720;
  if(this.phase===0){
   while(this.courseIndex<this.course.length&&this.course[this.courseIndex].position<=this.scroll+this.viewWidth+90){const item=this.course[this.courseIndex++];this.objects.push({x:300+item.position-this.scroll+travel,type:item.type,hit:false});}
   if(!this.tutorialShown&&this.objects.some(o=>o.x>340&&o.x<420)){this.tutorialShown=true;this.event='PULE AGORA · toque em PULAR ou aperte espaço';}
  }
  if(this.phase===1&&this.spawn<=0&&this.distance<target-45){this.objects.push({x:this.viewWidth+90,y:.18+this.random()*.64,type:this.phase===0?(this.random()<.5?'cooler':'log'):(this.random()<.55?'car':'debris'),hit:false,variant:Math.floor(this.random()*3),seed:this.time});this.spawn=this.phase===0?1.85+this.random()*.55:1.4+this.random()*.5;}
  for(const o of this.objects){o.x-=travel;if(!o.hit&&Math.abs(o.x-(this.phase===0?300:this.playerX))<(o.type==='car'?65:40)){const collision=this.phase===0?this.y<(o.type==='log'?27:43):Math.abs(this.surfY-o.y)<(o.type==='car'?.16:.13)&&this.jumpTime<=0;if(collision)this.hit(o);}}
  this.objects=this.objects.filter(o=>o.x>-150);
  if(this.state==='playing'&&this.distance>=target){if(this.phase===0){this.state='transition';this.transitionTime=0;this.distance=300;this.y=0;this.vy=0;this.objects=[];this.event='A PRANCHA! Segure firme…';}else{this.state='won';this.distance=720;this.event='VOCÊ CONSEGUIU! Da avenida até a crista da onda.';}}
 }
}
if(typeof module!=='undefined')module.exports=TsunamiGame;
