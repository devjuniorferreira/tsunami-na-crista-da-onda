/* Procedural audio: no external files, playback starts only after a user gesture. */
class GameAudio {
 constructor(){this.enabled=true;this.context=null;this.step=-1;this.rotor=0;try{this.enabled=localStorage.getItem('apocalipse-sound')!=='off';}catch{}}
 unlock(){
  try{
   if(!this.context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;const c=this.context=new Audio();this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);
    this.noise=c.createBuffer(1,c.sampleRate*3,c.sampleRate);const data=this.noise.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+Math.random()*.12-.06)/1.015;data[i]=last*3;}
    const source=c.createBufferSource();source.buffer=this.noise;source.loop=true;this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=480;this.ambient=c.createGain();this.ambient.gain.value=0;source.connect(this.filter);this.filter.connect(this.ambient);this.ambient.connect(this.master);source.start();
   }
   if(this.context.state==='suspended')this.context.resume().catch(()=>{});
  }catch{this.context=null;}
 }
 toggle(){this.enabled=!this.enabled;try{localStorage.setItem('apocalipse-sound',this.enabled?'on':'off');}catch{}this.unlock();if(this.context)this.master.gain.setTargetAtTime(0,this.context.currentTime,.02);}
 tone(from,to,length,volume,type='sine',delay=0){const c=this.context,t=c.currentTime+delay,o=c.createOscillator(),a=c.createGain();o.type=type;o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(to,t+length);a.gain.setValueAtTime(.001,t);a.gain.linearRampToValueAtTime(volume,t+.012);a.gain.exponentialRampToValueAtTime(.001,t+length);o.connect(a);a.connect(this.master);o.start(t);o.stop(t+length+.02);o.onended=()=>{o.disconnect();a.disconnect();};}
 burst(length,volume,frequency,delay=0,type='lowpass'){const c=this.context,t=c.currentTime+delay,source=c.createBufferSource(),f=c.createBiquadFilter(),a=c.createGain();source.buffer=this.noise;f.type=type;f.frequency.value=frequency;a.gain.setValueAtTime(volume,t);a.gain.exponentialRampToValueAtTime(.001,t+length);source.connect(f);f.connect(a);a.connect(this.master);source.start(t,Math.random());source.stop(t+length);source.onended=()=>{source.disconnect();f.disconnect();a.disconnect();};}
 sweep(length,volume,from,to){const c=this.context,t=c.currentTime,source=c.createBufferSource(),f=c.createBiquadFilter(),a=c.createGain();source.buffer=this.noise;source.loop=true;f.type='bandpass';f.Q.value=1.2;f.frequency.setValueAtTime(from,t);f.frequency.exponentialRampToValueAtTime(to,t+length);a.gain.setValueAtTime(.001,t);a.gain.exponentialRampToValueAtTime(volume,t+length*.92);a.gain.exponentialRampToValueAtTime(.001,t+length+.08);source.connect(f);f.connect(a);a.connect(this.master);source.start(t);source.stop(t+length+.1);source.onended=()=>{source.disconnect();f.disconnect();a.disconnect();};}
 play(event){
  switch(event){
   case 'warning':this.tone(190,350,.65,.09);this.tone(190,350,.65,.09,'sine',.8);break;
   case 'jump':this.tone(190,410,.16,.09,'triangle');break;
   case 'land':this.burst(.09,.22,700);break;
   case 'hit':this.burst(.22,.45,1300);this.tone(110,38,.22,.18);break;
   case 'bite':this.burst(.12,.5,2200,0,'bandpass');this.tone(90,40,.25,.22,'square');this.burst(.1,.4,1800,.12,'bandpass');break;
   case 'dash':this.sweep(.35,.3,400,1600);break;
   case 'step':this.tone(520,380,.05,.05,'triangle');break;
   case 'fall':this.tone(1200,500,.5,.035);break;
   case 'pickup':this.tone(420,640,.12,.1);this.tone(640,850,.18,.1,'sine',.11);break;
   case 'splash':this.burst(.65,.6,2500);break;
   case 'bubble':for(let i=0;i<4;i++)this.tone(300+i*90,700+i*120,.08,.05,'sine',i*.09);break;
   case 'crash':this.burst(1.4,.8,900);this.tone(70,30,1.2,.3);break;
   case 'liftoff':this.sweep(1.2,.35,120,600);break;
   case 'meteor':this.sweep(2,.55,220,2400);this.tone(150,55,2,.05,'sawtooth');break;
   case 'impact':this.burst(1.9,.95,650);this.tone(80,26,1.5,.45);this.tone(52,30,2.3,.3,'sine',.06);break;
   case 'rumble':this.burst(2,.7,180);this.tone(45,30,2,.3);break;
   case 'steam':this.burst(1.6,.35,5000,0,'highpass');break;
  }
 }
 update(g){
  const events=g.sounds.splice(0),active=['playing','transition','caught','opening'].includes(g.state);
  const step=Math.floor(g.runCycle*2);
  if(!this.context){this.step=step;return;}
  const c=this.context,t=c.currentTime,kind=g.config.kind;
  this.master.gain.setTargetAtTime(this.enabled&&active?.6:0,t,.06);
  // Background noise: sea, deep water, wind or rumbling lava depending on the phase.
  const proximity=g.state==='opening'?Math.max(0,(g.openingTime-5)/4):g.config.chase?Math.min(1,(g.waveFront-100)/210):.6;
  const color={run:380,surf:420,swim:260,climb:520,heli:900,bike:220}[kind];
  this.ambient.gain.setTargetAtTime(.08+proximity*.25+Math.sin(g.time*1.3)*.012,t,.3);this.filter.frequency.setTargetAtTime(color+proximity*800,t,.3);
  if(this.enabled&&active){
   if(step!==this.step&&kind==='run'&&g.state==='playing'&&g.intro===0&&g.y===0&&g.stumble===0){this.burst(.055,.13,950);this.tone(95,55,.065,.09);}
   if(kind==='heli'&&g.state==='playing'&&Math.abs(g.time-this.rotor)>.09){this.rotor=g.time;this.burst(.06,.12,300);}
   // Freewheel ticking, faster with speed.
   if(step!==this.step&&kind==='bike'&&g.state==='playing'&&g.y===0)this.burst(.03,.06,3800,0,'highpass');
   for(const event of events)this.play(event);
  }
  this.step=step;
 }
}
