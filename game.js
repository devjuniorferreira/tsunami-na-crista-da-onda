(() => {
'use strict';
const $=id=>document.getElementById(id),canvas=$('scene'),game=new TsunamiGame(),renderer=new DeluxeRenderer(canvas),input={up:false,down:false,left:false,right:false,target:null},audio=new TsunamiAudio();
let last=0,accumulator=0,messageTime=0,shownState='menu',lastTrip=-1,ready=false,uiElapsed=0;
const fixedStep=1/120;
function soundButton(){$('sound').textContent=audio.enabled?'SOM ON':'SOM OFF';$('sound').setAttribute('aria-pressed',String(audio.enabled));}
$('sound').onclick=()=>{audio.toggle();soundButton();};soundButton();
function resize(){renderer.resize();game.viewWidth=renderer.width;}
window.addEventListener('resize',resize);resize();
function showOverlay(title,story,label){$('overlay').hidden=false;$('overlay').querySelector('h1').innerHTML=title;$('story').textContent=story;$('start').innerHTML=label+' <span>↗</span>';$('chapters').hidden=true;$('controls').hidden=true;}
function ui(){
 const active=game.state==='playing';$('skip').hidden=game.state!=='opening';$('pause').hidden=game.state==='menu'||game.state==='lost'||game.state==='won';$('pause').textContent=game.state==='paused'?'▶':'Ⅱ';$('pause').setAttribute('aria-label',game.state==='paused'?'Continuar jogo':'Pausar jogo');$('hud').hidden=game.state==='menu'||game.state==='opening'||(game.state==='paused'&&game.resumeState==='opening');
 $('chapter').textContent=game.phase===0?'01 / FUGA NA ORLA':'02 / SURF NA CIDADE';$('objective').textContent=game.phase===0?'ALCANCE A PRANCHA':'ENCONTRE UMA PASSAGEM';
 $('life').textContent=game.phase===0?`${game.trips} / 3 TROPEÇOS`:'♥ '.repeat(game.health)+'♡ '.repeat(3-game.health);$('life').classList.toggle('critical',game.phase===0&&game.trips===2);
 $('meter').textContent=`${Math.min(game.phase===0?300:720,Math.floor(game.distance))} / ${game.phase===0?300:720} m`;$('bar').style.width=Math.min(100,game.distance/(game.phase===0?300:720)*100)+'%';
 $('surfControls').hidden=game.phase===0;$('threat').hidden=game.phase!==0||game.state==='menu'||game.state==='opening'||(game.state==='paused'&&game.resumeState==='opening');$('threatFill').style.width=Math.min(100,(game.waveFront-80)/2.3)+'%';$('threatLabel').textContent=game.trips===0?'A ONDA ESTÁ NA RUA':game.trips===1?'A ONDA ESTÁ MAIS PERTO':game.trips===2?'PERIGO · ÚLTIMA CHANCE':'A ONDA ALCANÇOU VOCÊ';
 $('tip').textContent=game.phase===0?'↑ / ESPAÇO / TOQUE: PULAR · 3 TROPEÇOS = FIM':'ARRASTE OU USE AS SETAS: GUIAR · ESPAÇO: SALTAR';
 if(game.event){$('caption').textContent=game.event;messageTime=3.4;game.event='';}
 if(lastTrip!==game.trips){lastTrip=game.trips;$('stage').classList.toggle('danger',game.trips>=2&&game.phase===0);}
 if(shownState!==game.state){shownState=game.state;
  if(active||game.state==='caught'||game.state==='transition'||game.state==='opening'){$('overlay').hidden=true;$('controls').hidden=!active;}
  else if(game.state==='paused')showOverlay('RECUPERE<br><em>O FÔLEGO.</em>','A fuga está pausada. Continue quando estiver pronto.','CONTINUAR');
  else if(game.state==='lost'){showOverlay(game.phase===0?'A ONDA<br><em>TE PEGOU.</em>':'CAIU DA<br><em>PRANCHA.</em>',game.phase===0?'Três tropeços deram tempo para a onda alcançar você. Antecipe o salto e mantenha o ritmo até a prancha.':'Desvie dos carros subindo e descendo na água. Você pode recomeçar diretamente no surfe.','TENTAR NOVAMENTE');$('instructions').textContent=game.phase===0?'↑, espaço ou PULAR para saltar.':'Arraste na água ou use as quatro setas. PULAR salta os destroços.';}
  else if(game.state==='won'){showOverlay('DOMINOU<br><em>A ONDA!</em>','Você escapou pela avenida, pegou a prancha e atravessou a cidade surfando o tsunami.','JOGAR DE NOVO');$('instructions').textContent='As duas fases foram concluídas!';}
 }
}
$('start').onclick=()=>{if(!ready)return;audio.unlock();if(game.state==='paused')game.pause();else{if(game.state==='lost')game.start(game.phase);else game.beginOpening();input.up=input.down=input.left=input.right=false;input.target=null;accumulator=0;}ui();};
$('practice').onclick=()=>{if(!ready)return;audio.unlock();game.start(1);input.up=input.down=input.left=input.right=false;input.target=null;accumulator=0;ui();};
$('skip').onclick=()=>{game.finishOpening();ui();};
$('pause').onclick=()=>{game.pause();input.up=input.down=input.left=input.right=false;input.target=null;ui();};
$('jump').addEventListener('pointerdown',e=>{e.preventDefault();game.jump();});
for(const key of ['up','down']){const b=$(key);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);input[key]=true;});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>input[key]=false);}
window.addEventListener('keydown',e=>{if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft'||e.key==='a')input.left=true;if(e.key==='ArrowRight'||e.key==='d')input.right=true;if(e.key==='ArrowUp'||e.key==='w')input.up=true;if(e.key==='ArrowDown'||e.key==='s')input.down=true;if(!e.repeat&&(e.key===' '||(e.key==='ArrowUp'&&game.phase===0)))game.jump();if(!e.repeat&&e.key==='Escape'){game.pause();ui();}});
window.addEventListener('keyup',e=>{if(e.key==='ArrowLeft'||e.key==='a')input.left=false;if(e.key==='ArrowRight'||e.key==='d')input.right=false;if(e.key==='ArrowUp'||e.key==='w')input.up=false;if(e.key==='ArrowDown'||e.key==='s')input.down=false;});
function blur(){last=0;accumulator=0;input.up=input.down=input.left=input.right=false;input.target=null;if(game.state==='playing'||game.state==='caught'||game.state==='transition'||game.state==='opening'){game.pause();ui();}}
window.addEventListener('blur',blur);document.addEventListener('visibilitychange',()=>{if(document.hidden)blur();});let drag=null;
canvas.addEventListener('pointerdown',e=>{e.preventDefault();if(game.phase===0){game.jump();return;}if(game.state!=='playing')return;canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,px:game.playerX,py:game.surfY,moved:false};});
canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id||game.state!=='playing')return;const dx=(e.clientX-drag.x)/renderer.scale,dy=(e.clientY-drag.y)/renderer.scale;drag.moved=drag.moved||Math.abs(dx)+Math.abs(dy)>8;input.target={x:Math.max(220,Math.min(480,drag.px+dx)),y:Math.max(.1,Math.min(.9,drag.py+dy/155))};});
canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.moved)game.jump();drag=null;input.target=null;});
for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=null;input.target=null;});
function frame(now){
 const elapsed=last?(now-last)/1000:0;last=now;
 // A suspended tab or long stall must not replay a backlog at high speed.
 const dt=elapsed>.25?0:elapsed;accumulator+=dt;
 while(accumulator>=fixedStep){game.update(fixedStep,input);accumulator-=fixedStep;}
 if(game.state==='playing'){messageTime-=dt;if(messageTime<=0&&$('caption').textContent)$('caption').textContent='';}
 uiElapsed+=dt;if(uiElapsed>=.08||shownState!==game.state){ui();uiElapsed=0;}
 audio.update(game);renderer.draw(game);requestAnimationFrame(frame);
}
async function prepare(){
 try{
  await document.fonts.ready;
  const preview=new TsunamiGame();
  // Generate reusable building artwork before the first playable frame.
  for(let i=0;i<60;i++){
   renderer.building(0,342,78,65+(i*37)%94,i);renderer.building(0,432,127,174,i,true);
   if(i%5===0){$('loadProgress').value=Math.round(i/60*75);await new Promise(requestAnimationFrame);}
  }
  for(const state of ['opening','playing','transition']){preview.state=state;preview.openingTime=3;preview.transitionTime=1;renderer.draw(preview);await new Promise(requestAnimationFrame);}
  preview.phase=1;preview.state='playing';preview.objects=[0,1,2].map((variant)=>({x:450+variant*170,y:.5,type:'car',variant}));renderer.draw(preview);
  $('loadProgress').value=100;renderer.draw(game);ready=true;$('start').disabled=false;$('practice').disabled=false;$('loading').hidden=true;last=0;ui();requestAnimationFrame(frame);
 }catch(error){$('loadingText').textContent='Não foi possível preparar o jogo. Recarregue a página para tentar novamente.';console.error(error);}
}
prepare();
})();
