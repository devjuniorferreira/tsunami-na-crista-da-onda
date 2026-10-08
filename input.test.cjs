const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{ApocalipseGame:Game,PHASES}=require('./engine.js');
function load(){
 let game;const handlers={},elements={};
 const element=()=>{const e={style:{},hidden:false,textContent:'',innerHTML:'',classList:{toggle(){}},addEventListener(){},setAttribute(){},append(){},querySelector:()=>element(),getBoundingClientRect:()=>({left:0,top:0,width:1100,height:600}),setPointerCapture(){}};return e;};
 const context={ApocalipseGame:class extends Game{constructor(){super();game=this;}},PHASES,PixelRenderer:class{constructor(){this.width=1100;this.W=367;this.scale=1}resize(){}draw(){}prepare(){}},GameAudio:class{constructor(){this.enabled=true}update(){}unlock(){}},
  document:{getElementById(id){return elements[id]??=element()},createElement:()=>element(),addEventListener(){},documentElement:element()},window:{addEventListener(name,fn){handlers[name]=fn}},requestAnimationFrame(){},console};
 vm.createContext(context);vm.runInContext(fs.readFileSync('game.js','utf8'),context);return {game,handlers};
}
const key=(handlers,k,repeat=false)=>handlers.keydown({key:k,repeat,preventDefault(){}});
test('Up jumps while running, does not repeat, and remains steering during surfing',()=>{
 const {game,handlers}=load();game.start();game.intro=0;key(handlers,'ArrowUp');assert.equal(game.vy,620);game.vy=123;key(handlers,'ArrowUp',true);assert.equal(game.vy,123);game.start(1);game.intro=0;key(handlers,'ArrowUp');assert.equal(game.jumpTime,0);
});
test('arrows change column once per press on the building, with Caps Lock too',()=>{
 const {game,handlers}=load();game.start(3);game.intro=0;key(handlers,'ArrowLeft');assert.equal(game.lane,0);key(handlers,'ArrowLeft',true);assert.equal(game.lane,0);key(handlers,'D');assert.equal(game.lane,1);key(handlers,'ArrowRight');assert.equal(game.lane,2);
});
