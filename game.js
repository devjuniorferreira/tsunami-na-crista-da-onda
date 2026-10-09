(() => {
'use strict';
const $=id=>document.getElementById(id),canvas=$('scene'),game=new ApocalipseGame(),renderer=new PixelRenderer(canvas),input={up:false,down:false,left:false,right:false,target:null},audio=new GameAudio();
let last=0,accumulator=0,messageTime=0,shownState='menu',lastTrip=-1,ready=false,uiElapsed=0;
const fixedStep=1/120;
const INFO=[
 {chapter:'01 / A PRAIA',objective:'ALCANCE A PRANCHA',unit:'m',jump:'PULAR ↗',tip:'↑ / ESPAÇO / TOQUE: PULAR · 3 TROPEÇOS = FIM',threat:['A ONDA ESTÁ NA RUA','A ONDA ESTÁ MAIS PERTO','PERIGO · ÚLTIMA CHANCE','A ONDA ALCANÇOU VOCÊ'],
  lost:['A ONDA<br><em>TE PEGOU.</em>','Três tropeços deram tempo para a onda alcançar você. Antecipe o salto e mantenha o ritmo até a prancha.','↑, espaço ou PULAR para saltar.']},
 {chapter:'02 / O SURFE',objective:'ENCONTRE UMA PASSAGEM',unit:'m',jump:'SALTAR ↗',tip:'ANALÓGICO OU SETAS: GUIAR · OUTRO DEDO OU ESPAÇO: SALTAR',
  lost:['CAIU DA<br><em>PRANCHA.</em>','Desvie dos carros subindo e descendo na água. O salto tem um tempinho de recarga.','Arraste o analógico ou use as setas. Com outro dedo, toque em SALTAR para pular os destroços.']},
 {chapter:'03 / O FUNDO DO MAR',objective:'FUJA DO TUBARÃO',unit:'m',jump:'IMPULSO »',tip:'ANALÓGICO OU SETAS: NADAR · OUTRO DEDO OU ESPAÇO: IMPULSO',threat:['O TUBARÃO ESTÁ LONGE','O TUBARÃO ESTÁ PERTO','PERIGO · ÚLTIMA CHANCE','O TUBARÃO TE PEGOU'],
  lost:['O TUBARÃO<br><em>TE PEGOU.</em>','Cada batida deixa o tubarão mais perto. O IMPULSO atravessa águas-vivas e destroços.','Arraste o analógico ou use as setas para nadar. Com outro dedo, IMPULSO acelera.']},
 {chapter:'04 / O PRÉDIO',objective:'CHEGUE AO HELIPONTO',unit:'andares',jump:'',tip:'← → OU TOQUE NOS LADOS: TROCAR DE COLUNA',threat:['A ÁGUA ESTÁ SUBINDO','A ÁGUA ESTÁ MAIS PERTO','PERIGO · ÚLTIMA CHANCE','A ÁGUA TE ALCANÇOU'],
  lost:['A ÁGUA<br><em>TE ALCANÇOU.</em>','Olhe os avisos “!” no alto: eles mostram de onde as coisas vão cair.','← → ou toque nos lados da tela para trocar de coluna.']},
 {chapter:'05 / O CÉU',objective:'DESVIE DOS METEOROS',unit:'m',jump:'',tip:'ANALÓGICO OU SETAS: PILOTAR',
  lost:['O HELICÓPTERO<br><em>CAIU.</em>','Os meteoros vêm da direita e de cima. Fique mais à esquerda para ter tempo de reagir.','Arraste o analógico ou use as setas para pilotar.']},
 {chapter:'06 / O VULCÃO',objective:'DESÇA ATÉ O RIO',unit:'m',jump:'PULAR ↗',tip:'↑ / ESPAÇO: PULAR · SEGURE ↓: ABAIXADO · TOQUE EM CIMA OU EMBAIXO',threat:['A LAVA ESTÁ DESCENDO','A LAVA ESTÁ MAIS PERTO','PERIGO · ÚLTIMA CHANCE','A LAVA TE ALCANÇOU'],
  lost:['A LAVA<br><em>TE PEGOU.</em>','Pule pedras, troncos e fendas de lava. Nos galhos baixos, abaixe — pular faz você bater a cabeça.','↑, espaço ou PULAR para saltar. Segure ↓ ou ABAIXAR para continuar abaixado sob os galhos.']},
 {chapter:'07 / O DESERTO',objective:'FUJA DA TEMPESTADE',unit:'m',jump:'',hold:'SEGURAR',tip:'SEGURE (ESPAÇO OU TOQUE) NAS DESCIDAS · SOLTE ANTES DO TOPO',threat:['A TEMPESTADE ESTÁ LONGE','A TEMPESTADE ESTÁ CHEGANDO','PERIGO · ACELERE!','A TEMPESTADE TE ENGOLIU'],
  lost:['A TEMPESTADE<br><em>TE ENGOLIU.</em>','Segure nas descidas para ganhar velocidade e solte antes do topo para voar. Pouse na descida da próxima duna — segurar na subida freia.','Espaço, toque na tela ou SEGURAR.']},
 {chapter:'08 / A FLORESTA',objective:'FUJA DA MANADA',unit:'m',jump:'',hold:'SEGURAR',tip:'SEGURE: PENDURAR · SOLTE NO ALTO DO BALANÇO · SEGURE DE NOVO: AGARRAR',threat:['A MANADA ESTÁ LONGE','A MANADA ESTÁ MAIS PERTO','PERIGO · ÚLTIMA CHANCE','A MANADA TE ALCANÇOU'],
  lost:['A MANADA<br><em>TE ALCANÇOU.</em>','Solte o cipó quando ele estiver subindo para a frente e segure de novo perto do próximo. Ficar parado deixa a manada chegar.','Espaço, toque na tela ou SEGURAR.']},
 {chapter:'09 / O GELO',objective:'ATRAVESSE O LAGO',unit:'m',jump:'',tip:'ANALÓGICO OU SETAS: PATINAR · NO GELO NÃO DÁ PARA FREAR',threat:['O GELO ESTÁ RACHANDO','A RACHADURA ESTÁ PERTO','PERIGO · ÚLTIMA CHANCE','O GELO QUEBROU'],
  lost:['O GELO<br><em>QUEBROU.</em>','No gelo você desliza: comece a virar antes. Desvie dos buracos, dos pinguins e do urso-polar.','Arraste o analógico ou use as setas para patinar.']},
 {chapter:'10 / O ESPAÇO',objective:'DESVIE O METEORO',unit:'propulsores',jump:'',tip:'ANALÓGICO OU SETAS: JATOS · SIGA A SETA AMARELA ATÉ OS PONTOS VERMELHOS',
  lost:['O TRAJE<br><em>FALHOU.</em>','Sem gravidade você continua flutuando: use jatos curtos. Encoste nos três pontos vermelhos do meteoro gigante.','Arraste o analógico ou use as setas para os jatos.']}
];
const STEER=new Set(['surf','swim','heli','skate','space']);
const NAMES=['A PRAIA','O SURFE','O FUNDO DO MAR','O PRÉDIO','O CÉU','O VULCÃO','O DESERTO','A FLORESTA','O GELO','O ESPAÇO'];
const text=(id,value)=>{const el=$(id);if(el.textContent!==value)el.textContent=value;};
const show=(id,visible)=>{const el=$(id);if(el.hidden===visible)el.hidden=!visible;};
function soundButton(){$('sound').textContent=audio.enabled?'SOM ON':'SOM OFF';$('sound').setAttribute('aria-pressed',String(audio.enabled));}
$('sound').onclick=()=>{audio.toggle();soundButton();};soundButton();
// Fullscreen hides the browser bars on phones; landscape is locked where the browser allows it.
const fullscreenElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
$('fullscreen').hidden=!(document.fullscreenEnabled||document.webkitFullscreenEnabled);
function fullscreenButton(){const on=!!fullscreenElement();$('fullscreen').setAttribute('aria-pressed',String(on));$('fullscreen').setAttribute('aria-label',on?'Sair da tela cheia':'Tela cheia');$('fullscreen').querySelector('path').setAttribute('d',on?'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5':'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5');}
$('fullscreen').onclick=async()=>{const root=document.documentElement;try{if(fullscreenElement())await (document.exitFullscreen||document.webkitExitFullscreen).call(document);else{await (root.requestFullscreen||root.webkitRequestFullscreen).call(root,{navigationUI:'hide'});try{await screen.orientation.lock('landscape');}catch{}}}catch{}fullscreenButton();};
function resize(){renderer.resize();game.viewWidth=renderer.width;renderer.menuDrawn=false;}
window.addEventListener('resize',resize);resize();
for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,()=>{fullscreenButton();resize();});
function clearInput(){input.up=input.down=input.left=input.right=input.hold=input.duck=false;input.target=null;if(stick)releaseStick();}
function showOverlay(kicker,title,story,label,instructions){$('overlay').hidden=false;text('kicker',kicker);$('overlay').querySelector('h1').innerHTML=title;text('story',story);$('start').innerHTML=label+' <span>↗</span>';$('chapters').hidden=true;$('phaseList').hidden=true;$('story').hidden=false;$('choose').setAttribute('aria-expanded','false');$('controls').hidden=true;$('caption').textContent='';text('instructions',instructions);}
function ui(){
 const state=game.state,info=INFO[game.phase],cfg=game.config,active=state==='playing',cinematic=state==='opening'||state==='transition'||(state==='paused'&&(game.resumeState==='opening'||game.resumeState==='transition'));
 show('skip',state==='opening');show('pause',state!=='menu'&&state!=='lost'&&state!=='won');text('pause',state==='paused'?'▶':'Ⅱ');$('pause').setAttribute('aria-label',state==='paused'?'Continuar jogo':'Pausar jogo');
 show('hud',!(state==='menu'||state==='won'||cinematic));
 text('chapter',info.chapter);text('objective',cfg.kind==='space'?(game.boss?'ENCOSTE NOS PONTOS VERMELHOS':'DESVIE DOS ASTEROIDES'):info.objective);
 text('life',cfg.kind==='dune'?`${Math.round(Math.max(0,game.speed)*.12)} KM/H`:cfg.chase?`${game.trips} / 3 ${cfg.kind==='run'?'TROPEÇOS':cfg.kind==='vine'?'QUEDAS':'BATIDAS'}`:'♥ '.repeat(Math.max(0,game.health))+'♡ '.repeat(3-Math.max(0,game.health)));$('life').classList.toggle('critical',!!cfg.chase&&game.trips===2&&cfg.kind!=='dune');
 const goal=cfg.goal,done=Math.min(goal,Math.floor(game.distance));text('meter',cfg.kind==='space'&&!game.boss?`METEORO EM ${Math.max(0,Math.ceil(cfg.field-game.field))} s`:`${done} / ${goal} ${info.unit}`);$('bar').style.width=Math.min(100,game.distance/goal*100)+'%';
 const kind=cfg.kind;show('stick',active&&STEER.has(kind));show('holdControls',!!info.hold);show('laneControls',kind==='climb');show('bikeControls',kind==='bike');show('jump',!!info.jump);text('jump',info.jump);$('jump').classList.toggle('cooling',(kind==='surf'||kind==='swim')&&game.jumpCooldown>0);
 show('threat',!!cfg.chase&&state!=='menu'&&state!=='won'&&!cinematic);$('threatFill').style.width=Math.min(100,(game.waveFront-80)/2.3)+'%';if(info.threat)text('threatLabel',info.threat[Math.min(3,game.trips)]);
 if(state!=='menu')text('tip',info.tip);
 if(game.event){$('caption').textContent=game.event;messageTime=3.4;game.event='';}
 if(lastTrip!==game.trips){lastTrip=game.trips;$('stage').classList.toggle('danger',game.trips>=2&&!!cfg.chase);}
 if(shownState!==state){shownState=state;
  if(active||state==='caught'||cinematic){$('overlay').hidden=true;$('controls').hidden=!active;}
  else if(state==='paused')showOverlay('PAUSADO','RECUPERE<br><em>O FÔLEGO.</em>','O fim do mundo espera você. Continue quando estiver pronto.','CONTINUAR','');
  else if(state==='lost')showOverlay(`FASE ${game.phase+1} · ${NAMES[game.phase]}`,info.lost[0],info.lost[1],'TENTAR NOVAMENTE',info.lost[2]);
  else if(state==='won'){showOverlay('DEZ FASES CONCLUÍDAS','VOCÊ SALVOU<br><em>O MUNDO.</em>','Da praia ao espaço: onda, tubarão, lava, tempestade, manada, gelo e o meteoro gigante. O fim do mundo foi cancelado.','JOGAR DE NOVO','Escolha uma fase para jogar de novo.');$('chapters').hidden=false;}
 }
}
function begin(phase){if(!ready)return;audio.unlock();clearInput();accumulator=0;if(phase===0)game.beginOpening();else game.start(phase);ui();}
$('start').onclick=()=>{if(!ready)return;audio.unlock();if(game.state==='paused')game.pause();else if(game.state==='lost'){clearInput();accumulator=0;game.start(game.phase);}else begin(0);ui();};
// The phase list replaces the story and chapter list, so everything fits on short screens.
$('choose').onclick=()=>{const open=$('phaseList').hidden;$('phaseList').hidden=!open;$('story').hidden=open;$('chapters').hidden=open||game.state!=='menu'&&game.state!=='won';$('choose').setAttribute('aria-expanded',String(open));if(open&&$('phaseList').scrollIntoView)$('phaseList').scrollIntoView({block:'nearest'});};
NAMES.forEach((name,i)=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<b>${String(i+1).padStart(2,'0')}</b> ${name}`;b.onclick=()=>begin(i);$('phaseList').append(b);});
$('skip').onclick=()=>{game.finishOpening();ui();};
$('pause').onclick=()=>{game.pause();clearInput();ui();};
$('jump').addEventListener('pointerdown',e=>{e.preventDefault();game.jump();});
{const b=$('duck');b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);input.duck=true;game.duck();});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>input.duck=false);}
{const b=$('hold');b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);input.hold=true;});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>input.hold=false);}
$('left').addEventListener('pointerdown',e=>{e.preventDefault();game.move(-1);});$('right').addEventListener('pointerdown',e=>{e.preventDefault();game.move(1);});
const keyOf=e=>e.key.length===1?e.key.toLowerCase():e.key;
window.addEventListener('keydown',e=>{
 const key=keyOf(e),kind=game.config.kind;if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape'].includes(e.key))e.preventDefault();
 if(kind==='climb'){if(!e.repeat&&(key==='ArrowLeft'||key==='a'))game.move(-1);if(!e.repeat&&(key==='ArrowRight'||key==='d'))game.move(1);}
 else if(kind==='bike'){if(key==='ArrowDown'||key==='s'){input.duck=true;if(!e.repeat)game.duck();}}
 // Dunes and vines are played by holding one key.
 else if(kind==='dune'||kind==='vine'){if([' ','ArrowUp','ArrowDown','w','s'].includes(key))input.hold=true;}
 else{if(key==='ArrowLeft'||key==='a')input.left=true;if(key==='ArrowRight'||key==='d')input.right=true;if(key==='ArrowUp'||key==='w')input.up=true;if(key==='ArrowDown'||key==='s')input.down=true;}
 const runner=kind==='run'||kind==='bike';if(kind!=='dune'&&kind!=='vine'&&!e.repeat&&(key===' '||(key==='ArrowUp'&&runner)||(key==='w'&&runner)))game.jump();
 if(!e.repeat&&e.key==='Escape'){game.pause();ui();}
});
window.addEventListener('keyup',e=>{const key=keyOf(e);if(key==='ArrowDown'||key==='s')input.duck=false;if([' ','ArrowUp','ArrowDown','w','s'].includes(key))input.hold=false;if(key==='ArrowLeft'||key==='a')input.left=false;if(key==='ArrowRight'||key==='d')input.right=false;if(key==='ArrowUp'||key==='w')input.up=false;if(key==='ArrowDown'||key==='s')input.down=false;});
function blur(){last=0;accumulator=0;clearInput();if(game.state==='playing'||game.state==='caught'||game.state==='transition'||game.state==='opening'){game.pause();ui();}}
window.addEventListener('blur',blur);document.addEventListener('visibilitychange',()=>{if(document.hidden)blur();});let stick=null,holdPointer=null;
// Floating analog stick: it waits in the corner and jumps under the finger that touches the screen.
const STICK_R=50,STICK_DEAD=6;
function placeStick(x,y){const el=$('stick');el.classList.add('active');el.style.left=x-55+'px';el.style.top=y-55+'px';el.style.bottom='auto';$('knob').style.transform='';}
function releaseStick(){stick=null;input.stick=null;const el=$('stick');el.classList.remove('active');el.style.left=el.style.top=el.style.bottom='';$('knob').style.transform='';}
canvas.addEventListener('pointerdown',e=>{
 e.preventDefault();const kind=game.config.kind;
 if(kind==='run'){game.jump();return;}
 // On the bike, the upper half of the screen jumps and the lower half ducks.
 if(kind==='dune'||kind==='vine'){canvas.setPointerCapture(e.pointerId);input.hold=true;holdPointer=e.pointerId;return;}
 if(kind==='bike'){const box=canvas.getBoundingClientRect();if(e.clientY-box.top<box.height*.55)game.jump();else{canvas.setPointerCapture(e.pointerId);input.duck=true;holdPointer=e.pointerId;game.duck();}return;}
 if(game.state!=='playing')return;
 if(kind==='climb'){const box=canvas.getBoundingClientRect(),x=(e.clientX-box.left)/renderer.scale,player=(renderer.W/2+(game.laneX-1)*37)*3;game.move(x<player?-1:1);return;}
 // First finger: the floating analog stick appears under it. Any other finger jumps.
 if(stick){game.jump();return;}
 canvas.setPointerCapture(e.pointerId);const box=$('stage').getBoundingClientRect();stick={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};input.stick={x:0,y:0};placeStick(e.clientX-box.left,e.clientY-box.top);
});
canvas.addEventListener('pointermove',e=>{if(!stick||e.pointerId!==stick.id)return;let dx=e.clientX-stick.x,dy=e.clientY-stick.y;const d=Math.hypot(dx,dy);stick.moved=stick.moved||d>10;
 if(d>STICK_R){dx*=STICK_R/d;dy*=STICK_R/d;}$('knob').style.transform=`translate(${dx}px,${dy}px)`;input.stick=d<STICK_DEAD?{x:0,y:0}:{x:dx/STICK_R,y:dy/STICK_R};});
canvas.addEventListener('pointerup',e=>{if(e.pointerId===holdPointer){input.hold=input.duck=false;holdPointer=null;}if(stick&&stick.id===e.pointerId){if(!stick.moved)game.jump();releaseStick();}});
for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(stick&&(!e||e.pointerId===undefined||e.pointerId===stick.id))releaseStick();if(holdPointer!==null&&(!e||e.pointerId===undefined||e.pointerId===holdPointer)){input.hold=input.duck=false;holdPointer=null;}});
function frame(now){
 const elapsed=last?(now-last)/1000:0;last=now;
 // A suspended tab or long stall must not replay a backlog at high speed.
 const dt=elapsed>.25?0:elapsed;accumulator+=dt;
 while(accumulator>=fixedStep){game.update(fixedStep,input);accumulator-=fixedStep;}
 if(game.state==='playing'){messageTime-=dt;if(messageTime<=0&&$('caption').textContent)$('caption').textContent='';}
 uiElapsed+=dt;if(uiElapsed>=.08||shownState!==game.state){ui();uiElapsed=0;}
 audio.update(game);if(game.state!=='menu'||!renderer.menuDrawn){renderer.draw(game);renderer.menuDrawn=game.state==='menu';}
 requestAnimationFrame(frame);
}
async function prepare(){
 try{
  $('loadProgress').value=40;await new Promise(requestAnimationFrame);
  renderer.prepare(ApocalipseGame);$('loadProgress').value=90;await new Promise(requestAnimationFrame);
  // The menu shows the avenue behind the title.
  game.start(0);game.state='menu';game.event='';game.scroll=900;game.time=1;game.waveFront=-200;game.speed=0;renderer.draw(game);
  $('loadProgress').value=100;ready=true;$('start').disabled=false;$('choose').disabled=false;$('loading').hidden=true;last=0;ui();requestAnimationFrame(frame);
 }catch(error){$('loadingText').textContent='Não foi possível preparar o jogo. Recarregue a página para tentar novamente.';console.error(error);}
}
prepare();
})();
