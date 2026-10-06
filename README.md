# nyxilum-engine-mcp

MCP-сервер для [NyxilumEngine](https://github.com/Faneraiy14/NyxilumEngine)
(2D ігровий рушій на [NyxilumLang](https://github.com/Faneraiy14/NyxilumLang))
- Крок D плану, той самий патерн, що
[NyxilumMcp](https://github.com/Faneraiy14/NyxilumMcp)/
[nyxilum-cms-mcp](https://github.com/Faneraiy14/nyxilum-cms-mcp).

## Інструменти

- **`engine_run`** — запускає ІСНУЮЧИЙ `.nx`-файл із репозиторію
  NyxilumEngine (напр. `tests/headless_logic_test.nx`,
  `examples/dodge.nx`) - шлях ВІДНОСНИЙ до кореня репозиторію, не
  довільний код-рядок (на відміну від `nyxilum_run` у NyxilumMcp) -
  потрібно, щоб `import "../lib/engine.nx"` у прикладах реально
  резолвився. `examples/dodge.nx` (Windows-only) на Linux-збірці `nx`
  ЧЕСНО провалюється з "невідома функція" - очікувана поведінка, не
  баг цього інструменту.
- **`engine_docs`** — повертає `docs/API.md` з репозиторію
  NyxilumEngine цілком або фільтровано за секцією.

**Свідомо поза обсягом v1** (за планом): "скріншот вікна гри, що
працює" - потребує захоплення екрана й кореляції з вікном, складніша,
окрема майбутня фіча.

## Встановлення

```bash
npm install
```

Потребує поряд (сусідні теки) зібраного `NyxilumLang` (для `nx` CLI) і
`NyxilumEngine` - той самий лейаут, що на робочій машині. Або задай
`NX_NODE_PATH`/`NX_ECOSYSTEM_ROOT`/`NYXILUM_ENGINE_ROOT` явно.

## Перевірено

`npm test` - 7 тестів, включно з РЕАЛЬНИМ запуском
`tests/headless_logic_test.nx` (підтверджує, що `import
"../lib/engine.nx"` дійсно резолвиться при виклику через цей сервер,
не лише теоретично) і реальним MCP-handshake (`initialize`) через
stdio-транспорт.

## Docker

```bash
docker build -t nyxilum-engine-mcp .
docker run -i --rm nyxilum-engine-mcp
```

The server speaks MCP over stdio, so keep `-i`. Needs: nothing - `nx` and NyxilumEngine (`main`, or `--build-arg ENGINE_REF=<tag>`) are baked into the image.
In an MCP client config use `"command": "docker"` with the same arguments.

## Startup timeout

The server itself starts in about a second, but a client launching several MCP servers at once on a cold machine (right after boot) can hit Claude Code's default 30-second startup limit and mark it "failed". That limit belongs to the client, not to the server, so raise it there - in `~/.claude/settings.json`:

```json
{ "env": { "MCP_TIMEOUT": "120000" } }
```

(or start Claude Code as `MCP_TIMEOUT=120000 claude`). Takes effect in the next session.
