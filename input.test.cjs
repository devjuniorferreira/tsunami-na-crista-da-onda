const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{ApocalipseGame:Game,PHASES}=require('./engine.js');
function load(extra={}){
 let game;const handlers={},elements={};
 const element=()=>{const e={style:{},hidden:false,textContent:'',innerHTML:'',classList:{toggle(){}},listeners:{},addEventListener(name,fn){e.listeners[name]=fn;},setAttribute(){},append(){},querySelector:()=>element(),getBoundingClientRect:()=>({left:0,top:0,width:1100,height:600}),setPointerCapture(){}};return e;};
 const context={ApocalipseGame:class extends Game{constructor(){super();game=this;}},PHASES,PixelRenderer:class{constructor(){this.width=1100;this.W=367;this.scale=1}resize(){}draw(){}prepare(){}},GameAudio:class{constructor(){this.enabled=true}update(){}unlock(){}},
  document:{getElementById(id){return elements[id]??=element()},createElement:()=>element(),addEventListener(){},documentElement:element()},window:{addEventListener(name,fn){handlers[name]=fn}},requestAnimationFrame(){},console,...extra};
 vm.createContext(context);vm.runInContext(fs.readFileSync('game.js','utf8'),context);return {game,handlers,elements};
}
const key=(handlers,k,repeat=false)=>handlers.keydown({key:k,repeat,preventDefault(){}});
test('Up jumps while running, does not repeat, and remains steering during surfing',()=>{
 const {game,handlers}=load();game.start();game.intro=0;key(handlers,'ArrowUp');assert.equal(game.vy,620);game.vy=123;key(handlers,'ArrowUp',true);assert.equal(game.vy,123);game.start(1);game.intro=0;key(handlers,'ArrowUp');assert.equal(game.jumpTime,0);
});
test('arrows change column once per press on the building, with Caps Lock too',()=>{
 const {game,handlers}=load();game.start(3);game.intro=0;key(handlers,'ArrowLeft');assert.equal(game.lane,0);key(handlers,'ArrowLeft',true);assert.equal(game.lane,0);key(handlers,'D');assert.equal(game.lane,1);key(handlers,'ArrowRight');assert.equal(game.lane,2);
});

test('in space a drag can reach the thrusters on the right side of a wide screen',async()=>{
 const frames=[];const {game,elements}=load({requestAnimationFrame:cb=>frames.push(cb)}),canvas=elements.scene.listeners;
 // Let the loader finish, then drive the real frame loop.
 let now=0;const step=()=>{const pending=frames.splice(0);for(const cb of pending)cb(now+=16);};
 for(let i=0;i<5;i++){step();await new Promise(r=>setImmediate(r));}
 game.start(9);game.intro=0;game.viewWidth=1270;game.spawn=999;game.field=PHASES[9].field;game.update(1/120);game.boss.x=game.viewWidth-130;game.spawn=999;
 const ev=(x,y)=>({pointerId:1,clientX:x,clientY:y,preventDefault(){}}),c=game.bossCenter(),goal=c.x+Math.cos(Math.PI)*238;
 assert(goal>600,'the thruster point is beyond the old 560 limit');
 canvas.pointerdown(ev(100,300));canvas.pointermove(ev(100+(goal-game.playerX),300+(c.y-90-game.surfY*420)));
 for(let i=0;i<60*6&&game.distance===0;i++){game.spawn=999;game.objects=[];step();}
 assert(game.distance>=1,'a thruster was installed by dragging');
});
