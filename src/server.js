#!/usr/bin/env node
// server.js — реєструє інструменти в MCP SDK і піднімає stdio-транспорт.
// Крок D плану NyxilumEngine - той самий патерн, що NyxilumMcp/
// nyxilum-cms-mcp, АЛЕ мінімальний набір на старті (за планом): (1)
// запустити приклад/тест рушія й повернути вивід/помилки; (2) довідник
// API. "Скріншот вікна гри, що працює" - свідомо ПОЗА обсягом цієї
// версії (потребує захоплення екрана/кореляції з вікном - окремий
// майбутній крок, не зроблено тут).

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { runEngineFile } from './run.js';
import { engineDocs } from './docs.js';

const server = new McpServer({ name: 'nyxilum-engine-mcp', version: '0.1.0' });

server.registerTool(
    'engine_run',
    {
        title: 'Запустити приклад/тест NyxilumEngine',
        description:
            'Запускає ІСНУЮЧИЙ .nx-файл із репозиторію NyxilumEngine (напр. "tests/headless_logic_test.nx", ' +
            '"examples/dodge.nx") - шлях ВІДНОСНИЙ до кореня репозиторію, НЕ довільний код-рядок (на відміну від ' +
            'nyxilum_run у NyxilumMcp) - потрібно, щоб relative import "../lib/engine.nx" у прикладах працював. ' +
            'examples/dodge.nx (Windows-only, createCanvas/...) на Linux-збірці nx ЧЕСНО провалиться з "невідома ' +
            'функція" - це очікувана поведінка, не баг цього інструменту. Помилки виконання (Runtime/Parse Error) ' +
            'з\'являються у stdout з exitCode=1, а не в stderr.',
        inputSchema: {
            path: z.string().describe('Шлях відносно кореня NyxilumEngine, напр. "tests/headless_logic_test.nx"'),
            timeout_ms: z.number().int().min(100).max(60_000).optional()
                .describe('Таймаут виконання в мілісекундах (100–60000, типово 10000)'),
        },
    },
    async ({ path, timeout_ms }) => {
        const result = await runEngineFile(path, { timeoutMs: timeout_ms });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
);

server.registerTool(
    'engine_docs',
    {
        title: 'Довідник API NyxilumEngine',
        description: 'Повертає docs/API.md (GameObject/Scene/Renderer/BoxCollider/Engine) цілком або конкретну секцію за назвою заголовка "## ".',
        inputSchema: {
            section: z.string().optional().describe('Частина назви заголовка "## " для фільтрації, напр. "Renderer"'),
        },
    },
    async (args) => {
        const result = await engineDocs(args);
        return { content: [{ type: 'text', text: result.success ? result.content : `Помилка: ${result.error}` }] };
    }
);

const transport = new StdioServerTransport();
await server.connect(transport);
