// run.js — запускає ІСНУЮЧИЙ .nx-файл З РЕПОЗИТОРІЮ NyxilumEngine
// (examples/tests), НЕ довільний код-рядок, як nyxilum_run у
// NyxilumMcp. Свідома відмінність: examples/dodge.nx імпортує
// "../lib/engine.nx" відносним шляхом - запис коду у СВІЖИЙ тимчасовий
// каталог (як робить nyxilum_run) зламав би цей import. Замість цього
// - виконуємо файл ПРЯМО з його реального місця в репозиторії
// (cwd = тека файлу), з перевіркою, що шлях НЕ виходить за межі
// кореня репозиторію (без ../-виходу назовні).

import { execFile } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { dirname, join, relative, isAbsolute } from 'node:path';
import { resolveNyxilumNode, engineRoot } from './locate.js';
import { truncateUtf8 } from './text-truncate.js';

export const MAX_OUTPUT_BYTES = 32 * 1024;
const ENV_ALLOWLIST = ['SystemRoot', 'PATH', 'Path', 'TEMP', 'TMP', 'ProgramFiles', 'ProgramFiles(x86)', 'DOTNET_ROOT'];

function baseEnv() {
    const env = {};
    for (const key of ENV_ALLOWLIST) {
        if (process.env[key] !== undefined) env[key] = process.env[key];
    }
    return env;
}

/**
 * @param {string} relPath шлях ВІДНОСНО кореня NyxilumEngine (напр. "examples/dodge.nx")
 * @param {{ timeoutMs?: number }} options
 */
export async function runEngineFile(relPath, options = {}) {
    if (!relPath.endsWith('.nx')) {
        return { success: false, error: 'Шлях має вказувати на .nx-файл.' };
    }

    const root = engineRoot();
    const candidate = join(root, relPath);

    let realRoot, realCandidate;
    try {
        realRoot = await realpath(root);
        realCandidate = await realpath(candidate);
    } catch (err) {
        return { success: false, error: `Файл не знайдено: ${err.message}` };
    }

    // Захист від виходу за межі репозиторію (напр. "../../../etc/passwd")
    // - realpath() уже розкрив symlink'и/".."/тощо, тому звичайна
    // перевірка префікса тут надійна (не обходиться символічним
    // посиланням, зробленим ПІСЛЯ цієї перевірки).
    const rel = relative(realRoot, realCandidate);
    if (rel.startsWith('..') || isAbsolute(rel)) {
        return { success: false, error: 'Шлях виходить за межі репозиторію NyxilumEngine.' };
    }

    const timeoutMs = clamp(options.timeoutMs ?? 10_000, 100, 60_000);
    const { cmd, preArgs } = resolveNyxilumNode();
    const start = Date.now();

    let childPid;
    const result = await new Promise((resolvePromise) => {
        const child = execFile(
            cmd,
            [...preArgs, realCandidate],
            {
                cwd: dirname(realCandidate),
                timeout: timeoutMs,
                killSignal: 'SIGKILL',
                maxBuffer: MAX_OUTPUT_BYTES * 4,
                encoding: 'utf8',
                windowsHide: true,
                env: baseEnv(),
            },
            (error, stdout, stderr) => {
                resolvePromise({ error, stdout: stdout ?? '', stderr: stderr ?? '' });
            }
        );
        childPid = child.pid;
    });

    const timedOut = result.error?.killed === true || result.error?.signal === 'SIGKILL' || result.error?.signal === 'SIGTERM';

    if (timedOut && process.platform === 'win32' && childPid) {
        await new Promise((resolveCleanup) => {
            execFile('taskkill', ['/pid', String(childPid), '/T', '/F'], () => resolveCleanup());
        });
    }

    const exitCode = typeof result.error?.code === 'number' ? result.error.code : (result.error ? 1 : 0);
    const outTrunc = truncateUtf8(result.stdout, MAX_OUTPUT_BYTES);
    const errTrunc = truncateUtf8(result.stderr, MAX_OUTPUT_BYTES);

    return {
        success: !result.error && !timedOut,
        exitCode,
        timedOut,
        stdout: outTrunc.text,
        stderr: errTrunc.text,
        truncated: outTrunc.truncated || errTrunc.truncated,
        durationMs: Date.now() - start,
    };
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
