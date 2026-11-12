# Apocalipse 🌊

Jogo em pixel art para navegador. Uma manhã tranquila na praia termina com um meteoro no mar: fuja da onda, do tubarão, da lava, da tempestade e do gelo, e vá ao espaço salvar a Terra. São dez fases.

**▶️ Jogar:** https://devjuniorferreira.github.io/tsunami-na-crista-da-onda/

## Controles

Teclado, toque na tela ou botões na tela. Cada fase explica o controle ao começar. Funciona no computador e no celular.

## Como foi feito

- JavaScript puro e HTML, sem framework e sem biblioteca de jogos.
- A lógica do jogo (`engine.js`) fica separada do desenho na tela (`renderer.js`, `pixel.js`), do áudio (`audio.js`) e dos controles (`game.js`). Assim dá para testar a lógica sem abrir o navegador.
- Testes automatizados com o test runner nativo do Node (`engine.test.cjs`, `input.test.cjs`): colisão, pulo, pausa, checkpoints e troca de fase.
- A pasta `classico/` guarda a primeira versão do jogo, "Tsunami — Na crista da onda".
- Publicado no GitHub Pages.
- Desenvolvido com apoio de IA.

## Rodar os testes

```bash
node --test engine.test.cjs input.test.cjs
```

## Autor

Junior Ferreira · [LinkedIn](https://www.linkedin.com/in/devjuniorferreira) · [GitHub](https://github.com/devjuniorferreira)
