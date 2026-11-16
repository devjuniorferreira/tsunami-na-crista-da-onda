# Guia de estudo: como o "Apocalipse" foi feito

Este guia explica o jogo arquivo por arquivo, do jeito que você precisa entender para falar dele numa entrevista. Leia na ordem. Em cada parte há um **"Como explicar na entrevista"**, com uma frase curta que você pode adaptar.

---

## 0. Antes de tudo: como falar do uso de IA

O recrutador vai perguntar se você usou IA. **Diga que sim.** O README já diz isso, e mentir é pior do que qualquer resposta técnica fraca. O que o recrutador quer saber é se **você entende e consegue manter** o código. Uma boa resposta:

> "Usei IA como par de programação. Eu defini a ideia, as fases, a história e as regras de cada fase. Pedi as mudanças em partes pequenas, uma por vez (dá para ver nos commits e nos pull requests), testei jogando no computador e no celular e pedi correções quando algo ficava ruim. Depois estudei o código para entender cada parte: a separação entre lógica e desenho, o game loop com passo fixo e os testes automatizados."

Depois desta conversa, isso precisa ser verdade: **estude o código** (seção 9 tem um roteiro com exercícios).

---

## 1. Visão geral em uma frase

Um jogo de ação em pixel art que roda no navegador, feito com **HTML, CSS e JavaScript puro** (sem framework e sem biblioteca de jogos), com 10 fases, cutscenes entre elas, sons gerados por código e testes automatizados em Node.

- Publicado no **GitHub Pages**: https://devjuniorferreira.github.io/tsunami-na-crista-da-onda/
- A pasta `classico/` guarda a **primeira versão** (2 fases: correr e surfar).

---

## 2. Mapa dos arquivos

| Arquivo | Linhas | O que faz |
|---|---|---|
| `index.html` | 12 | Estrutura da página: canvas do jogo, HUD, menu, botões de toque. Carrega os scripts na ordem certa. |
| `style.css` | 25 | Visual da página e layout responsivo (celular em pé, deitado, desktop). |
| `manifest.json` | 9 | Manifesto de **PWA**: permite "instalar" o jogo no celular, em tela cheia e na horizontal. |
| `engine.js` | 259 | **A lógica do jogo** (física, colisões, fases, estados). Não sabe nada de tela, som ou teclado. |
| `pixel.js` | 251 | Ferramenta de **pixel art**: desenha pixel por pixel numa memória e cria todos os sprites ao carregar. |
| `renderer.js` | 776 | **Desenha** cada fase e cutscene no canvas, lendo o estado do `engine`. |
| `audio.js` | 57 | **Sons gerados por código** com a Web Audio API (nenhum arquivo de áudio). |
| `game.js` | 128 | **A cola**: liga teclado/toque ao engine, roda o game loop, atualiza o HUD. |
| `engine.test.cjs` | 26 testes | Testes da lógica (pulo, colisão, pausa, troca de fase…). |
| `input.test.cjs` | 5 testes | Testes dos controles, simulando o navegador. |
| `visual-check.html` | — | Página de apoio que desenha todas as cenas e sprites lado a lado, para conferir os gráficos. |

Rodar os testes: `node --test engine.test.cjs input.test.cjs` (resultado atual: **31 de 31 passando**).

> **Como explicar:** "Separei o jogo em camadas: lógica, desenho, áudio e controles. Assim a lógica pode ser testada sem abrir o navegador."

---

## 3. A arquitetura (o ponto mais importante da entrevista)

```
 Teclado / toque ──► game.js ──► input {up, down, hold, stick…}
                         │
                         ▼
                    engine.js  (ApocalipseGame)
                    update(dt, input)  ← só números e regras
                         │  estado: fase, posição, objetos, sons pedidos
            ┌────────────┼─────────────┐
            ▼            ▼             ▼
      renderer.js    audio.js      HUD (HTML)
      (desenha)      (toca)        (textos e barras)
```

A regra principal: **o `engine` nunca desenha nem toca som.** Ele só muda números. Quando algo deveria fazer barulho, ele coloca o nome do som numa lista:

```js
this.sounds.push('jump');
```

E o `audio.js` esvazia essa lista a cada quadro e toca os sons:

```js
const events = g.sounds.splice(0);
for (const event of events) this.play(event);
```

O mesmo vale para mensagens na tela: o engine põe um texto em `this.event` e o `game.js` mostra na legenda.

**Por que isso é bom?**
1. **Testável:** os testes rodam o engine no Node, sem navegador.
2. **Organizado:** mudar o desenho não quebra a física, e vice-versa.
3. **Independente da tela:** as posições estão em "unidades de mundo" (a tela tem 600 de altura), não em pixels. Por isso funciona igual no celular e no PC.

> **Como explicar:** "Usei uma separação parecida com Model–View: o engine é o modelo, o renderer e o áudio são a visão, e o game.js é o controlador."

---

## 4. O game loop com passo fixo (`game.js`, função `frame`)

Todo jogo tem um laço que roda ~60 vezes por segundo: **ler entrada → atualizar → desenhar**. Aqui ele usa `requestAnimationFrame`, que o navegador chama antes de cada quadro.

O detalhe técnico que vale ouro na entrevista é o **passo fixo (fixed timestep)**:

```js
const fixedStep = 1/120;              // a física sempre avança 1/120 s

function frame(now){
  const elapsed = last ? (now - last)/1000 : 0;  last = now;
  const dt = elapsed > .25 ? 0 : elapsed;        // aba suspensa? ignora o atraso
  accumulator += dt;
  while (accumulator >= fixedStep){              // roda quantos passos couberem
    game.update(fixedStep, input);
    accumulator -= fixedStep;
  }
  audio.update(game);
  renderer.draw(game);
  requestAnimationFrame(frame);
}
```

**Por que passo fixo?** Monitores rodam a 60 Hz, 120 Hz, 144 Hz… Se a física usasse o tempo variável de cada quadro, o pulo teria alturas diferentes em cada computador. Com passo fixo, a física é **igual em qualquer máquina** e **previsível nos testes**.

**Por que o `elapsed > .25 ? 0`?** Se você troca de aba e volta depois de 10 s, o jogo não tenta "recuperar" 10 s de física de uma vez (o personagem morreria sem você ver).

> **Como explicar:** "O loop usa requestAnimationFrame para desenhar e um acumulador para rodar a física em passos fixos de 1/120 s, então o jogo se comporta igual em telas de 60 ou 144 Hz."

---

## 5. O engine (`engine.js`)

### 5.1 Fases como dados
As 10 fases são uma lista de configurações (`PHASES`). Cada uma tem um `kind` (tipo de jogabilidade), uma meta e uma velocidade:

```js
{key:'praia',  kind:'run',   chase:'wave',  goal:300, speed:260, course:[…]},
{key:'surfe',  kind:'surf',  goal:720, speed:350},
{key:'predio', kind:'climb', chase:'water', goal:30,  speed:170},
…
```

São 10 tipos de jogabilidade: `run` (correr e pular), `surf`, `swim`, `climb` (trocar de coluna), `heli`, `bike` (pular e abaixar), `dune` (segurar/soltar nas dunas), `vine` (balançar no cipó), `skate` (gelo que escorrega) e `space` (gravidade zero).

O `update` escolhe a função certa de acordo com o tipo:
```js
if (kind==='run' || kind==='bike') this.updateRun(dt, input);
else if (kind==='climb') this.updateClimb(dt);
else if (kind==='dune')  this.updateDune(dt, input);
…
```

> **Como explicar:** "As fases são dados, não código repetido. Fases parecidas (surfe, mergulho, helicóptero, gelo) reaproveitam a mesma função de movimento com parâmetros diferentes."

### 5.2 Máquina de estados
O jogo está sempre em **um** estado: `menu`, `opening` (abertura), `playing`, `paused`, `caught` (sendo pego), `lost`, `transition` (cutscene) ou `won`. Cada estado tem regras próprias. Exemplo: pausar guarda o estado anterior para voltar a ele:

```js
pause(){
  if (['playing','caught','transition','opening'].includes(this.state)){
    this.resumeState = this.state; this.state = 'paused';
  } else if (this.state === 'paused') this.state = this.resumeState || 'playing';
}
```

### 5.3 Física simples
- **Pulo (correr/bicicleta):** velocidade inicial para cima (`vy = 620`) e gravidade puxando para baixo a cada passo. A gravidade é **mais forte na descida** (2050) do que na subida (1550): o pulo fica mais "firme", truque comum em jogos de plataforma.
- **Jump buffer:** se você aperta pular um pouquinho antes de tocar o chão, o jogo lembra por 0,16 s e pula assim que pousar (`jumpBuffer`). Isso deixa o controle "justo".
- **Suavização exponencial:** muita coisa se aproxima do valor alvo com `x += (alvo - x) * (1 - Math.exp(-dt * k))`. Exemplo: a velocidade do corredor e a onda chegando perto. Fica suave e não depende da taxa de quadros.
- **Dunas:** o chão é uma função matemática (soma de senos) e a inclinação é a derivada dela:
  ```js
  const duneHeight = x => 85*Math.sin(x/200) + 20*Math.sin(x/77);
  const duneSlope  = x => 85/200*Math.cos(x/200) + 20/77*Math.cos(x/77);
  ```
  Pousar com o ângulo da descida mantém a velocidade; pousar torto freia.
- **Cipó:** é um **pêndulo** (ângulo `theta`, velocidade angular `omega`). Ao soltar, a velocidade do pêndulo vira velocidade de voo.
- **Espaço:** inércia. Os jatos empurram e um atrito leve (`drag`) segura o movimento.

### 5.4 Colisão
É feita com **distância entre o jogador e o objeto** (caixas simples), por exemplo:
```js
const near = Math.abs(o.x - 300) < 40;
if (near && this.y < 27) this.hit(o);   // bateu se não estava alto o bastante
```
Depois de bater, o jogador fica **invencível por 1,7 s** (`invincible`) e cada objeto só conta uma vez (`o.hit = true`).

### 5.5 Perseguição
Nas fases com `chase` (onda, tubarão, lava…), cada batida aproxima a ameaça: `waveTarget = 110 + trips*65`. Na terceira batida o estado vira `caught`.

### 5.6 Aleatoriedade injetável
```js
constructor(random = Math.random){ this.random = random; … }
```
No jogo usa `Math.random`; nos testes passa uma função fixa (`() => .5`) ou um gerador com semente. Assim **os testes sempre dão o mesmo resultado**. Isso se chama **injeção de dependência**.

### 5.7 Cutscenes como dados
Cada transição (`TRANSITIONS`) é uma lista de "batidas" com tempo, som, tremor de tela e legenda:
```js
{length:3.4, event:'O HELIPONTO!', beats:[[1.35,'pickup',0,'Sabe pilotar? Vai ter que aprender!'],[2,'liftoff']]}
```
O engine percorre essa lista conforme o tempo passa.

---

## 6. Os gráficos (`pixel.js` e `renderer.js`)

**Não há nenhuma imagem no projeto.** Tudo é desenhado por código.

### 6.1 `pixel.js`: a "tela de pintura"
- A classe `Surface` guarda a imagem num `Uint32Array` (um número por pixel, com a cor). Tem funções para pintar pixel, retângulo, linha, círculo, elipse e polígono.
- **Contorno automático** (`outline`): pinta de escuro todo pixel vazio que encosta num pixel pintado. É isso que dá o visual de pixel art com borda.
- **Dithering de Bayer** (`vgrad`, `dither`): para fazer degradê com poucas cores, alterna pixels num padrão 4×4. É a técnica dos jogos antigos.
- **Personagem por esqueleto:** o herói é descrito por posições de articulações (quadril, joelho, pé…) e desenhado com linhas. Cada quadro de animação é uma pose diferente. A cabeça vem de uma pequena "grade" de letras, onde cada letra é uma cor:
  ```js
  right:['..hhhh..','.hhHHhh.','hhhhhhhh','hhhsssss', …]   // h = cabelo, s = pele…
  ```
- `seededRandom`: gerador pseudoaleatório com semente, para que cenários "aleatórios" saiam sempre iguais.
- Tudo isso é gerado **uma vez ao carregar** (`Art.build()`, a barra "Preparando o fim do mundo").

### 6.2 `renderer.js`: desenhar o mundo
- **Resolução baixa e ampliada:** o canvas real tem só **200 pixels de altura** (1 pixel = 3 unidades do mundo). O CSS amplia sem suavizar (`imageSmoothingEnabled = false`). Resultado: pixels nítidos e pouco trabalho por quadro, bom para celular.
- **Cache de camadas** (`layer`): cenários que não mudam (céu, prédios, montanhas) são desenhados uma vez e guardados num `Map`. Depois só são copiados.
- **Parallax:** camadas de fundo andam mais devagar do que as da frente (`strip(c, offset, y)` repete a faixa horizontalmente), o que dá sensação de profundidade.
- A onda e a lava (`wall`) são desenhadas coluna por coluna, com a crista que se curva.
- Uma função por fase: `runPhase`, `surfPhase`, `swimPhase`, `climbPhase`, `heliPhase`, `bikePhase`, `dunePhase`, `vinePhase`, `skatePhase`, `spacePhase`, além das cutscenes (`opening`, `transition`, `cutFinale`…). O `draw(g)` escolhe qual chamar.

> **Como explicar:** "Toda a arte é procedural: uma pequena biblioteca de rasterização gera os sprites ao carregar, com contorno automático e dithering. O jogo desenha num canvas pequeno e amplia sem suavização, o que deixa a pixel art nítida e leve no celular."

---

## 7. O som (`audio.js`)

Também **não há arquivos de som**. Tudo usa a **Web Audio API**:
- `tone(de, para, duração, volume, tipo)`: um oscilador que muda de frequência (ex.: pulo = tom subindo de 190 para 410 Hz).
- `burst(...)`: um pedaço de **ruído filtrado** (batidas, splash, pouso).
- `sweep(...)`: ruído com filtro que varre frequências (helicóptero decolando, meteoro).
- Um **ruído de fundo contínuo** muda de cor em cada fase (mar, vento, lava) e fica mais alto quando a ameaça está perto.
- **Regra dos navegadores:** o áudio só pode começar depois de um clique do usuário. Por isso existe `audio.unlock()`, chamado ao apertar "Começar".
- A preferência de som ligado/desligado fica salva no `localStorage`.

---

## 8. Controles e interface (`game.js`, `index.html`, `style.css`)

- **Teclado:** `keydown` e `keyup` ligam e desligam campos do objeto `input` (`input.left = true`…). O `e.repeat` impede que segurar a tecla conte como vários pulos.
- **Toque:** usa **Pointer Events** (`pointerdown`, `pointermove`, `pointerup`), que funcionam igual para mouse, dedo e caneta. `setPointerCapture` garante que o "soltar" seja recebido mesmo se o dedo sair do botão.
- **Analógico flutuante:** onde o primeiro dedo toca, aparece o analógico; a distância do arrasto vira um vetor de -1 a 1 (com "zona morta" de 6 px). Um segundo dedo pula.
- **Pausa automática** ao trocar de aba (`visibilitychange`) ou perder o foco (`blur`).
- **Tela cheia** com a Fullscreen API e trava na horizontal com `screen.orientation.lock('landscape')`, quando o navegador permite.
- **HUD em HTML** (não no canvas): textos e barras ficam por cima do canvas. Só é atualizado a cada 0,08 s, e `text()` só mexe no DOM se o texto mudou, para economizar.
- **Acessibilidade:** `aria-label`, `aria-pressed`, `role="status"` e `aria-live` na legenda, foco visível nos botões.
- **CSS responsivo:** `@media` para celular em pé, celular deitado e desktop; `aspect-ratio: 11/6`; unidades `dvh` (altura real da tela do celular).
- **Tudo dentro de `(() => { … })()`** (IIFE) com `'use strict'`, para não criar variáveis globais.

---

## 9. Os testes (`engine.test.cjs`, `input.test.cjs`)

Usam o **test runner nativo do Node** (`node:test` e `node:assert`), sem instalar nada.

Exemplo de como um teste funciona:
```js
function tick(g, seconds, input={}){            // avança o tempo do jogo
  for (let i=0; i<Math.ceil(seconds*120); i++) g.update(1/120, input);
}

test('jump clears obstacles, lands, and respects pause', () => {
  const g = running();     // jogo começado, sem obstáculos
  g.jump(); tick(g, .15);
  assert(g.y > 48);         // está no ar
  …
});
```

Graças ao passo fixo e à aleatoriedade injetável, dá para "jogar" sem tela e conferir números exatos. Um teste interessante joga as fases 1 e 6 inteiras **em três larguras de tela** (celular e desktop) e confirma que todo obstáculo pode ser evitado com tempo justo.

O `input.test.cjs` é mais avançado: carrega o `game.js` dentro de um **contexto falso** (`node:vm`) com um `document` e um `window` de mentira, e simula teclas.

> **Como explicar:** "Como a lógica não depende do navegador, escrevi testes com o test runner do Node: eles simulam segundos de jogo em passos fixos e verificam pulo, colisão, pausa e troca de fase. Para os controles, carreguei o game.js num contexto vm com um DOM falso."

---

## 10. Como o jogo evoluiu (histórico do Git)

Mostre que o projeto foi feito em **etapas**, com pull requests:

1. **Tsunami: na crista da onda**: versão inicial, correr e surfar (hoje em `classico/`).
2. Abertura com meteoro, botão de tela cheia e ajustes de jogabilidade.
3. **Apocalipse**: troca para pixel art e seis fases.
4. Kit de mergulho, pouso na capela, descida de bicicleta no vulcão (PR #1).
5. Fases 7 a 10 (deserto, floresta, gelo, espaço), cutscenes e final (PR #2).
6. Ajustes de controle: abaixar na bicicleta, espaço, analógico na tela (PRs #3 e #4).
7. Melhorias gráficas: luz, profundidade e detalhes (PRs #5 e #6).
8. README.

Para ver você mesmo: `git log --oneline`.

> **Como explicar:** "Comecei com um protótipo de duas fases, publiquei, joguei, e fui crescendo em pull requests pequenos: primeiro conteúdo, depois controles no celular, depois polimento visual."

---

## 11. Perguntas prováveis na entrevista (e respostas curtas)

**Por que não usou um framework como Phaser ou Unity?**
Para aprender os fundamentos (loop, física, desenho) e deixar o jogo leve: abre direto no navegador, sem instalar nada e sem build.

**Qual foi a maior dificuldade?**
Fazer os controles funcionarem bem no celular: botões de segurar que "soltavam" sozinhos (resolvido com `setPointerCapture`) e o analógico flutuante para não cobrir o jogo. *(Escolha algo que você realmente viveu testando o jogo.)*

**Como você garante que o jogo roda igual em computadores diferentes?**
Passo fixo de física (1/120 s) com acumulador, e posições em unidades de mundo, não em pixels.

**Como funciona a colisão?**
Comparação de distâncias em x e y entre o jogador e cada objeto, com invencibilidade curta depois de cada batida para não contar duas vezes.

**Como você testou?**
31 testes automatizados com `node --test`, mais testes manuais no celular e no PC, e uma página (`visual-check.html`) que mostra todas as cenas para conferir os gráficos.

**O que você melhoraria?**
Respostas honestas e boas:
- O código está **muito compacto** (várias instruções por linha). Eu formataria com Prettier e quebraria funções grandes, como o `renderer.js` (776 linhas), em um arquivo por fase.
- Usaria **módulos ES** (`import`/`export`) em vez de vários `<script>` em ordem.
- Adicionaria **CI** (GitHub Actions) para rodar os testes a cada pull request.
- Um **service worker** para o PWA funcionar offline.
- Salvar o progresso (última fase) no `localStorage`.

**Qual parte foi da IA e qual foi sua?**
Veja a seção 0. Fale das decisões que foram suas: a história, a ordem das fases, o que estava difícil ou injusto ao jogar, o pedido de controles para celular.

---

## 12. Roteiro de estudo (faça na prática)

Entender lendo é pouco; mude o código e veja o efeito. Abra o `index.html` no navegador (ou use `npx serve .`) e rode os testes depois de cada mudança.

**Dia 1: estrutura**
1. Leia `index.html` e veja a ordem dos `<script>`. O que aconteceria se `game.js` viesse antes de `engine.js`?
2. Leia a função `frame` do `game.js` (seção 4) até conseguir explicá-la em voz alta.

**Dia 2: engine**
3. Em `engine.js`, mude `this.vy=620` para `800` na função `takeoff`. Jogue a fase 1. Rode os testes e veja qual falha e por quê.
4. Mude o `goal` da praia de `300` para `100` e veja a fase terminar mais rápido.
5. Leia `hit()` e explique a diferença entre fases com `chase` e sem.

**Dia 3: gráficos e som**
6. Em `pixel.js`, troque a cor `shirt` em `PAL` e veja a camiseta do herói mudar.
7. Abra `visual-check.html` no navegador.
8. Em `audio.js`, mude o som `jump` (`this.tone(190,410,...)`) para outras frequências.

**Dia 4: controles e testes**
9. Adicione a tecla `j` como pulo no `keydown` do `game.js`.
10. Escreva **um teste novo** em `engine.test.cjs`, por exemplo: "depois de bater, o jogador fica invencível". Esse é o melhor exercício para a entrevista: um teste escrito por você.

**Dia 5: ensaio**
11. Explique o projeto em voz alta em 2 minutos, usando as frases "Como explicar".
12. Abra o jogo no celular e mostre ao vivo; tenha o link do GitHub pronto.

---

## Glossário rápido

- **Game loop:** laço que repete ler entrada → atualizar → desenhar.
- **Fixed timestep (passo fixo):** a física sempre avança o mesmo intervalo de tempo.
- **requestAnimationFrame:** função do navegador que chama seu código antes de cada quadro.
- **Canvas:** elemento HTML onde se desenha por código.
- **Sprite:** imagem de um personagem ou objeto.
- **Parallax:** camadas de fundo que se movem em velocidades diferentes.
- **Dithering:** alternar pixels de duas cores para simular uma cor intermediária.
- **Procedural:** gerado por código, não feito à mão em arquivo.
- **Web Audio API:** API do navegador para gerar e mixar som.
- **Pointer Events:** eventos que unificam mouse, toque e caneta.
- **PWA:** site que pode ser "instalado" como aplicativo.
- **Injeção de dependência:** passar algo de fora (como a função de aleatoriedade) em vez de usar direto, para poder trocar nos testes.
- **Máquina de estados:** o sistema está sempre em um estado definido, com regras para mudar de um para outro.
