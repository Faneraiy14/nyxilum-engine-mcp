// docs.js — довідник API рушія (docs/API.md у репозиторії NyxilumEngine),
// кешований за mtime. Той самий патерн, що nyxilum_docs у NyxilumMcp
// (GUIDE.md), АЛЕ секції за "## " (не "### "), бо API.md структурований
// одним рівнем заголовків.

import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { engineRoot } from './locate.js';

let apiCache = null; // { mtimeMs: number, text: string } | null

export async function engineDocs({ section } = {}) {
    const apiPath = join(engineRoot(), 'docs', 'API.md');

    let mtimeMs;
    try {
        mtimeMs = (await stat(apiPath)).mtimeMs;
    } catch (err) {
        return { success: false, error: `Не вдалося прочитати docs/API.md: ${err.message}` };
    }

    if (!apiCache || apiCache.mtimeMs !== mtimeMs) {
        let text;
        try {
            text = await readFile(apiPath, 'utf8');
        } catch (err) {
            return { success: false, error: `Не вдалося прочитати docs/API.md: ${err.message}` };
        }
        apiCache = { mtimeMs, text };
    }

    const apiText = apiCache.text;
    if (!section) return { success: true, content: apiText };

    const sections = splitBySections(apiText);
    const match = sections.find((s) => s.heading.toLowerCase().includes(section.toLowerCase()));
    if (!match) {
        return {
            success: false,
            error: `Секцію "${section}" не знайдено. Доступні: ${sections.map((s) => s.heading).join(', ')}`,
        };
    }
    return { success: true, content: match.body.trim() };
}

function splitBySections(markdown) {
    const lines = markdown.split('\n');
    const sections = [];
    let current = null;
    for (const line of lines) {
        if (line.startsWith('## ')) {
            if (current) sections.push(current);
            current = { heading: line.slice(3).trim(), body: line + '\n' };
        } else if (current) {
            current.body += line + '\n';
        }
    }
    if (current) sections.push(current);
    return sections;
}
