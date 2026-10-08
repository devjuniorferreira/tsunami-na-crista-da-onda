/* Procedural audio: no external files, playback starts only after a user gesture. */
class TsunamiAudio {
 constructor(){this.enabled=true;this.context=null;this.step=-1;try{this.enabled=localStorage.getItem('tsunami-sound')!=='off';}catch{}}
 unlock(){
  try{
   if(!this.context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;const c=this.context=new Audio();this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);
    this.noise=c.createBuffer(1,c.sampleRate*3,c.sampleRate);const data=this.noise.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+Math.random()*.12-.06)/1.015;data[i]=last*3;}
    const source=c.createBufferSource();source.buffer=this.noise;source.loop=true;this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=480;this.ocean=c.createGain();this.ocean.gain.value=0;source.connect(this.filter);this.filter.connect(this.ocean);this.ocean.connect(this.master);source.start();
   }
   if(this.context.state==='suspended')this.context.resume().catch(()=>{});
  }catch{this.context=null;}
 }
 toggle(){this.enabled=!this.enabled;try{localStorage.setItem('tsunami-sound',this.enabled?'on':'off');}catch{}this.unlock();if(this.context)this.master.gain.setTargetAtTime(0,this.context.currentTime,.02);}
 tone(from,to,length,volume,type='sine',delay=0){const c=this.context,t=c.currentTime+delay,o=c.createOscillator(),a=c.createGain();o.type=type;o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(to,t+length);a.gain.setValueAtTime(.001,t);a.gain.linearRampToValueAtTime(volume,t+.012);a.gain.exponentialRampToValueAtTime(.001,t+length);o.connect(a);a.connect(this.master);o.start(t);o.stop(t+length+.02);o.onended=()=>{o.disconnect();a.disconnect();};}
 burst(length,volume,frequency){const c=this.context,t=c.currentTime,source=c.createBufferSource(),f=c.createBiquadFilter(),a=c.createGain();source.buffer=this.noise;f.type='lowpass';f.frequency.value=frequency;a.gain.setValueAtTime(volume,t);a.gain.exponentialRampToValueAtTime(.001,t+length);source.connect(f);f.connect(a);a.connect(this.master);source.start(t,Math.random());source.stop(t+length);source.onended=()=>{source.disconnect();f.disconnect();a.disconnect();};}
 sweep(length,volume,from,to){const c=this.context,t=c.currentTime,source=c.createBufferSource(),f=c.createBiquadFilter(),a=c.createGain();source.buffer=this.noise;source.loop=true;f.type='bandpass';f.Q.value=1.2;f.frequency.setValueAtTime(from,t);f.frequency.exponentialRampToValueAtTime(to,t+length);a.gain.setValueAtTime(.001,t);a.gain.exponentialRampToValueAtTime(volume,t+length*.92);a.gain.exponentialRampToValueAtTime(.001,t+length+.08);source.connect(f);f.connect(a);a.connect(this.master);source.start(t);source.stop(t+length+.1);source.onended=()=>{source.disconnect();f.disconnect();a.disconnect();};}
 update(g){
  const events=g.sounds.splice(0),active=['playing','transition','caught','opening'].includes(g.state);
  const step=Math.floor(g.runCycle*2);
  if(!this.context){this.step=step;return;}
  const c=this.context,t=c.currentTime;
  this.master.gain.setTargetAtTime(this.enabled&&active?.6:0,t,.06);
  const proximity=g.state==='opening'?Math.max(0,(g.openingTime-5)/4):g.phase===1?.75:Math.min(1,(g.waveFront-100)/210);
  this.ocean.gain.setTargetAtTime(.10+proximity*.27+Math.sin(g.time*1.3)*.012,t,.3);this.filter.frequency.setTargetAtTime(380+proximity*1000,t,.3);
  if(this.enabled&&active){
   if(step!==this.step&&g.phase===0&&g.state==='playing'&&g.intro===0&&g.y===0&&g.stumble===0){this.burst(.055,.13,950);this.tone(95,55,.065,.09);}
   for(const event of events){
    if(event==='warning'){this.tone(190,350,.65,.09,'sine');this.tone(190,350,.65,.09,'sine',.8);}
    if(event==='jump')this.tone(190,410,.16,.09,'triangle');
    if(event==='land')this.burst(.09,.22,700);
    if(event==='hit'){this.burst(.22,.45,1300);this.tone(110,38,.22,.18);}
    if(event==='pickup'){this.tone(420,640,.12,.1,'sine');this.tone(640,850,.18,.1,'sine',.11);}
    if(event==='meteor'){this.sweep(2,.55,220,2400);this.tone(150,55,2,.05,'sawtooth');}
    if(event==='impact'){this.burst(1.9,.95,650);this.tone(80,26,1.5,.45);this.tone(52,30,2.3,.3,'sine',.06);}
    if(event==='splash')this.burst(.65,.6,2500);
   }
  }
  this.step=step;
 }
}
