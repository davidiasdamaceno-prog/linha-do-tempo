# Globo — fontes

O site só usa `../globo.js` e `../geo.json` (carregados quando o usuário abre o Globo). Esta pasta guarda como eles são gerados.

## Refazer `globo.js`
```
cd globo/src
npm install
npm run build
```

| Arquivo | O que é |
|---|---|
| `main.js` | toda a lógica (mapa, linha do tempo, cartão, escolha de lugar) e a montagem das duas partes na página |
| `ui.html` / `ui.css` | tela do globo (dentro de um Shadow DOM, para não misturar estilos com o site) |
| `ctl.html` / `ctl.css` | botões Fronteiras / Divisões / Pontos, que ficam na linha dos filtros |
| `base.css` | cores (claro/escuro) e botões, usados pelas duas partes |

O site conversa com o globo por `window.JTGlobo` (ver `_jtgHost` em `index.html`).

## Refazer `geo.json`
`data/mk_geo.py` e `data/prep_divs.js` montam o arquivo a partir do Natural Earth (domínio público): países 110m (world-atlas), divisões administrativas, cidades (`populated_places`) e nomes em português. Baixe os arquivos do Natural Earth para uma pasta `dl/` ao lado dos scripts antes de rodar. Os mapas históricos (Tordesilhas, capitanias, União Ibérica, Madri) são desenhados em `main.js` e são ilustrativos.
