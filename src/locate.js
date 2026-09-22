// locate.js — знаходить зібраний NyxilumNode (компілятор/VM NyxilumLang)
// і корінь репозиторію NyxilumEngine. Той самий підхід, що NyxilumMcp's
// locate.js (окремий репозиторій від NyxilumLang, щоб node_modules не
// потрапляв у dotnet-збірку) - адаптовано з двома коренями замість
// одного (NyxilumLang для 'nx', NyxilumEngine для прикладів/докс).

import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export function nyxilumLangRoot() {
    return process.env.NX_ECOSYSTEM_ROOT || join(__dirname, '..', '..', 'NyxilumLang');
}

export function engineRoot() {
    return process.env.NYXILUM_ENGINE_ROOT || join(__dirname, '..', '..', 'NyxilumEngine');
}

// Бінарник зветься "Nx" (AssemblyName у NyxilumLang.csproj), НЕ "nx" -
// той самий факт, що вже виявлено ЖИВЦЕМ цієї ж сесії (CI NyxilumEngine).
// net10.0 (без -windows) - пріоритетний вибір: examples/*.nx, що
// використовують createCanvas/тощо, ЧЕСНО провалюються з "невідома
// функція" на такому білді (не вдають, що працюють) - той самий
// принцип, що NyxilumMcp's locate.js уже застосовує для довільного,
// потенційно ненадійного .nx-коду.
function candidatePaths(root) {
    const binName = process.platform === 'win32' ? 'Nx.exe' : 'Nx';
    return {
        nonWindows: [
            join(root, 'src', 'NyxilumLang', 'bin', 'Release', 'net10.0', binName),
            join(root, 'src', 'NyxilumLang', 'bin', 'Debug', 'net10.0', binName),
        ],
        windowsFallback: [
            join(root, 'src', 'NyxilumLang', 'bin', 'Release', 'net10.0-windows', 'Nx.exe'),
            join(root, 'src', 'NyxilumLang', 'bin', 'Debug', 'net10.0-windows', 'Nx.exe'),
        ],
    };
}

function newestExisting(paths) {
    let best = null;
    for (const p of paths) {
        if (!existsSync(p)) continue;
        const mtime = statSync(p).mtimeMs;
        if (!best || mtime > best.mtime) best = { path: p, mtime };
    }
    return best?.path ?? null;
}

/** @returns {{ cmd: string, preArgs: string[], path: string }} */
export function resolveNyxilumNode() {
    const explicit = process.env.NX_NODE_PATH;
    if (explicit) {
        if (!existsSync(explicit)) {
            throw new Error(`NX_NODE_PATH задано, але файл не знайдено: ${explicit}`);
        }
        return toInvocation(explicit);
    }

    const root = nyxilumLangRoot();
    const { nonWindows, windowsFallback } = candidatePaths(root);

    const best = newestExisting(nonWindows) ?? newestExisting(windowsFallback);
    if (best) return toInvocation(best);

    const tried = [...nonWindows, ...windowsFallback];
    throw new Error(
        'Не знайдено зібраний NyxilumNode. Перевірені шляхи:\n' +
        tried.map((p) => `  - ${p}`).join('\n') +
        '\nЗадай NX_NODE_PATH (шлях до Nx/Nx.exe чи .dll) або NX_ECOSYSTEM_ROOT (корінь NyxilumLang) вручну.'
    );
}

function toInvocation(p) {
    if (p.toLowerCase().endsWith('.dll')) {
        return { cmd: 'dotnet', preArgs: [p], path: p };
    }
    return { cmd: p, preArgs: [], path: p };
}
