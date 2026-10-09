const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{ApocalipseGame:Game,PHASES}=require('./engine.js');
function load(extra={},missing=[]){
 let game;const handlers={},elements={};
 const element=()=>{const e={style:{},hidden:false,textContent:'',innerHTML:'',classList:{toggle(){},add(){},remove(){}},listeners:{},addEventListener(name,fn){e.listeners[name]=fn;},setAttribute(){},append(){},querySelector:()=>element(),getBoundingClientRect:()=>({left:0,top:0,width:1100,height:600}),setPointerCapture(){}};return e;};
 const context={ApocalipseGame:class extends Game{constructor(){super();game=this;}},PHASES,PixelRenderer:class{constructor(){this.width=1100;this.W=367;this.scale=1}resize(){}draw(){}prepare(){}},GameAudio:class{constructor(){this.enabled=true}update(){}unlock(){}},
  document:{getElementById(id){return missing.includes(id)?null:elements[id]??=element()},createElement:()=>element(),addEventListener(){},documentElement:element()},window:{addEventListener(name,fn){handlers[name]=fn}},requestAnimationFrame(){},console,...extra};
 vm.createContext(context);vm.runInContext(fs.readFileSync('game.js','utf8'),context);return {game,handlers,elements};
}
const key=(handlers,k,repeat=false)=>handlers.keydown({key:k,repeat,preventDefault(){}});
test('Up jumps while running, does not repeat, and remains steering during surfing',()=>{
 const {game,handlers}=load();game.start();game.intro=0;key(handlers,'ArrowUp');assert.equal(game.vy,620);game.vy=123;key(handlers,'ArrowUp',true);assert.equal(game.vy,123);game.start(1);game.intro=0;key(handlers,'ArrowUp');assert.equal(game.jumpTime,0);
});
test('arrows change column once per press on the building, with Caps Lock too',()=>{
 const {game,handlers}=load();game.start(3);game.intro=0;key(handlers,'ArrowLeft');assert.equal(game.lane,0);key(handlers,'ArrowLeft',true);assert.equal(game.lane,0);key(handlers,'D');assert.equal(game.lane,1);key(handlers,'ArrowRight');assert.equal(game.lane,2);
});

async function booted(){
 const frames=[];const loaded=load({requestAnimationFrame:cb=>frames.push(cb)});let now=0;
 const step=()=>{const pending=frames.splice(0);for(const cb of pending)cb(now+=16);};
 for(let i=0;i<5;i++){step();await new Promise(r=>setImmediate(r));}
 return {...loaded,step,canvas:loaded.elements.scene.listeners};
}
const ev=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,preventDefault(){}});
test('the analog stick steers in proportion to how far it is pushed, and springs back on release',async()=>{
 const {game,step,canvas,elements}=await booted();game.start(1);game.intro=0;game.spawn=999;game.surfY=.5;
 canvas.pointerdown(ev(1,200,300));assert(elements.stick.classList,'stick element exists');
 canvas.pointermove(ev(1,200,325));for(let i=0;i<20;i++)step();const half=game.surfY-.5;
 game.surfY=.5;game.surfVelocity=0;canvas.pointermove(ev(1,200,380));for(let i=0;i<20;i++)step();const full=game.surfY-.5;
 assert(half>0&&full>half*1.5,'pushing further steers faster');
 canvas.pointerup(ev(1,200,380));for(let i=0;i<30;i++)step();assert(Math.abs(game.surfVelocity)<.01,'released stick stops steering');
});
test('two fingers: one holds the stick while the other taps to jump; a quick tap alone also jumps',async()=>{
 const {game,step,canvas}=await booted();game.start(1);game.intro=0;game.spawn=999;
 canvas.pointerdown(ev(1,200,300));canvas.pointermove(ev(1,200,350));canvas.pointerdown(ev(2,800,300));assert(game.jumpTime>0,'second finger jumps');
 for(let i=0;i<10;i++)step();assert(game.surfY>.5,'the stick kept steering');
 canvas.pointerup(ev(2,800,300));canvas.pointerup(ev(1,200,350));
 game.jumpTime=0;game.jumpCooldown=0;canvas.pointerdown(ev(3,500,300));canvas.pointerup(ev(3,500,300));assert(game.jumpTime>0,'a tap without dragging jumps');
});
test('in space the stick reaches the thrusters on the right side of a wide screen',async()=>{
 const {game,step,canvas}=await booted();game.start(9);game.intro=0;game.viewWidth=1270;game.spawn=999;game.field=PHASES[9].field;game.update(1/120);game.boss.x=game.viewWidth-130;
 const c=game.bossCenter(),goal=c.x-238;assert(goal>600,'the thruster point is beyond the old 560 limit');
 canvas.pointerdown(ev(1,200,300));
 for(let i=0;i<60*8&&game.distance===0;i++){const py=90+game.surfY*420,dx=goal-game.playerX,dy=c.y-py,d=Math.hypot(dx,dy)||1;canvas.pointermove(ev(1,200+dx/d*50,300+dy/d*50));game.spawn=999;game.objects=[];step();}
 assert(game.distance>=1,'a thruster was installed with the stick');
});

test('the menu offers to continue from the last phase reached, and the story keeps going from there',async()=>{
 const store={};const localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
 const frames=[];const loaded=load({requestAnimationFrame:cb=>frames.push(cb),localStorage});let now=0;const step=()=>{for(const cb of frames.splice(0))cb(now+=16);};
 for(let i=0;i<5;i++){step();await new Promise(r=>setImmediate(r));}
 const {game,elements}=loaded;assert.equal(elements.continue.hidden,true,'nothing saved yet');
 game.start(5);for(let i=0;i<10;i++)step();assert.equal(store['apocalipse-fase'],'5','reaching phase 6 is saved');
 // A new visit with that save shows CONTINUAR and starts at phase 6.
 const again=load({requestAnimationFrame:cb=>frames.push(cb),localStorage});for(let i=0;i<5;i++){step();await new Promise(r=>setImmediate(r));}
 assert.equal(again.elements.continue.hidden,false);assert.match(again.elements.continue.innerHTML,/FASE 06 O VULCÃO/);
 again.elements.continue.onclick();assert.equal(again.game.phase,5);assert.equal(again.game.state,'playing');
 again.game.state='won';for(let i=0;i<10;i++)step();assert.equal(store['apocalipse-fase'],undefined,'finishing the story clears it');
});

test('a page cached from an older version, missing newer elements, still loads',async()=>{
 const frames=[];const {game,elements}=load({requestAnimationFrame:cb=>frames.push(cb)},['stick','knob','continue','hold','holdControls','duck','bikeControls','up','down']);let now=0;
 for(let i=0;i<5;i++){for(const cb of frames.splice(0))cb(now+=16);await new Promise(r=>setImmediate(r));}
 assert.equal(elements.start.disabled,false,'the start button is enabled once loading finished');game.start(1);for(let i=0;i<5;i++)for(const cb of frames.splice(0))cb(now+=16);
});
test('every script and stylesheet in the page carries the same version, so phones never mix old and new files',()=>{
 const html=fs.readFileSync('index.html','utf8'),assets=[...html.matchAll(/(?:src|href)="((?:engine|pixel|renderer|audio|game)\.js|style\.css)(\?v=[^"]+)?"/g)];
 assert.equal(assets.length,6);const versions=new Set(assets.map(a=>a[2]));assert.equal(versions.size,1);const v=[...versions][0];assert(v&&v.startsWith('?v='),'files are versioned');
});
