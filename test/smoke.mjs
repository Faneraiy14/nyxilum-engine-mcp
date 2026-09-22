import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runEngineFile } from '../src/run.js';
import { engineDocs } from '../src/docs.js';

test('engine_run: headless_logic_test.nx виконується успішно (реальний імпорт lib/engine.nx працює)', async () => {
    const result = await runEngineFile('tests/headless_logic_test.nx');
    assert.equal(result.success, true, JSON.stringify(result));
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /УСІ ПЕРЕВІРКИ ПРОЙШЛИ/);
});

test('engine_run: неіснуючий файл дає чітку помилку, не крашить сервер', async () => {
    const result = await runEngineFile('tests/does_not_exist.nx');
    assert.equal(result.success, false);
    assert.match(result.error, /не знайдено/);
});

test('engine_run: спроба вийти за межі репозиторію (../) відхиляється', async () => {
    const result = await runEngineFile('../../../etc/passwd.nx');
    assert.equal(result.success, false);
});

test('engine_run: шлях без .nx відхиляється одразу', async () => {
    const result = await runEngineFile('README.md');
    assert.equal(result.success, false);
    assert.match(result.error, /\.nx/);
});

test('engine_docs: повертає повний API.md без section', async () => {
    const result = await engineDocs({});
    assert.equal(result.success, true);
    assert.match(result.content, /GameObject/);
});

test('engine_docs: фільтрує за секцією "Renderer"', async () => {
    const result = await engineDocs({ section: 'Renderer' });
    assert.equal(result.success, true);
    assert.match(result.content, /rectRenderer/);
    assert.doesNotMatch(result.content, /## Scene/);
});

test('engine_docs: невідома секція дає помилку зі списком доступних', async () => {
    const result = await engineDocs({ section: 'ЦьогоНеІснує' });
    assert.equal(result.success, false);
    assert.match(result.error, /Доступні/);
});
