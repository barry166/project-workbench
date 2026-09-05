import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  filterProjects,
  toggleFavorite,
  recordRecentVisit,
  getStatusMeta,
  STORAGE_KEYS,
} from '../public/client.mjs';
import { projects } from '../src/projects.mjs';
import health from '../api/health.mjs';
import server from '../src/server.mjs';

test('搜索同时匹配名称、描述、分类和标签且忽略大小写', () => {
  assert.deepEqual(filterProjects(projects, { query: 'GEEK' }).map(({ id }) => id), ['geek-charge']);
  assert.deepEqual(filterProjects(projects, { query: 'ChatGPT' }).map(({ id }) => id), ['chatgpt-account-manager']);
  assert.deepEqual(filterProjects(projects, { query: '预留' }).map(({ id }) => id), ['future-project']);
});

test('分类筛选与关键词搜索可以组合', () => {
  const result = filterProjects(projects, { category: '账号与权益', query: 'charge' });
  assert.deepEqual(result.map(({ id }) => id), ['geek-charge']);
});

test('收藏逻辑可添加和移除项目且不产生重复项', () => {
  assert.deepEqual(toggleFavorite([], 'geek-charge'), ['geek-charge']);
  assert.deepEqual(toggleFavorite(['geek-charge'], 'geek-charge'), []);
  assert.deepEqual(toggleFavorite(['geek-charge', 'geek-charge'], 'chatgpt-account-manager'), [
    'geek-charge',
    'chatgpt-account-manager',
  ]);
});

test('最近访问置顶、去重并最多保留 6 个项目 ID', () => {
  const existing = ['a', 'b', 'c', 'd', 'e', 'f'];
  assert.deepEqual(recordRecentVisit(existing, 'c'), ['c', 'a', 'b', 'd', 'e', 'f']);
  assert.deepEqual(recordRecentVisit(existing, 'g'), ['g', 'a', 'b', 'c', 'd', 'e']);
});

test('状态展示覆盖四种受支持状态', () => {
  for (const status of ['online', 'maintenance', 'private', 'planned']) {
    const meta = getStatusMeta(status);
    assert.equal(typeof meta.label, 'string');
    assert.match(meta.className, /^status-/);
  }
});

test('本地状态只使用收藏和最近访问项目 ID 的存储键', () => {
  assert.deepEqual(STORAGE_KEYS, {
    favorites: 'project-workbench:favorites',
    recent: 'project-workbench:recent',
  });
});

test('健康接口返回稳定且不泄漏环境变量的 JSON', async () => {
  const result = {};
  const response = {
    status(code) { result.status = code; return this; },
    json(value) { result.body = value; return this; },
    setHeader() {},
  };
  await health({ method: 'GET' }, response);
  assert.equal(result.status, 200);
  assert.deepEqual(Object.keys(result.body), ['online', 'responseTimeMs', 'checkedAt']);
  assert.equal(result.body.online, true);
  assert.equal(typeof result.body.responseTimeMs, 'number');
  assert.match(result.body.checkedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.doesNotMatch(JSON.stringify(result.body), /DATABASE|PASSWORD|TOKEN|SECRET/i);
});

test('生产入口将 /api/health 路由到同一个安全健康响应', async () => {
  const result = {};
  const response = {
    setHeader(name, value) { result[name] = value; },
    end(value) { result.body = JSON.parse(value); },
  };
  await server({ url: '/api/health' }, response);
  assert.equal(result.body.online, true);
  assert.equal(result['content-type'], 'application/json; charset=utf-8');
});

test('移动端 CSS 阻止页面级横向溢出并切换为单列', async () => {
  const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(css, /html\s*,\s*body\s*\{[^}]*overflow-x\s*:\s*(?:hidden|clip)/s);
  assert.match(css, /@media\s*\(max-width:\s*640px\)[\s\S]*grid-template-columns\s*:\s*1fr/);
  assert.match(css, /overflow-wrap\s*:\s*anywhere/);
});

test('前端源码不引用敏感环境变量或凭据字段', async () => {
  const files = await Promise.all([
    readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../public/client.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../src/projects.mjs', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(files.join('\n'), /process\.env|DATABASE_URL|AUTH_DRIZZLE_URL|password|cookie/i);
});
