import test from 'node:test';
import assert from 'node:assert/strict';

import { projects, validateProjects } from '../src/projects.mjs';

const REQUIRED_FIELDS = [
  'id', 'name', 'description', 'url', 'category', 'tags',
  'status', 'featured', 'icon', 'sortOrder',
];

test('每个项目配置都包含完整字段', () => {
  for (const project of projects) {
    for (const field of REQUIRED_FIELDS) {
      assert.ok(Object.hasOwn(project, field), `${project.id ?? 'unknown'} 缺少 ${field}`);
    }
  }
});

test('初始项目包含 Geek Charge、ChatGPT 管理台和未来项目位', () => {
  assert.deepEqual(projects.map(({ id }) => id), [
    'geek-charge',
    'chatgpt-account-manager',
    'future-project',
  ]);
});

test('项目配置校验拒绝重复 ID', () => {
  const duplicate = [{ ...projects[0] }, { ...projects[0] }];
  assert.throws(() => validateProjects(duplicate), /项目 ID 重复/);
});

test('项目配置只接受 HTTPS 或本地开发地址', () => {
  const invalid = [{ ...projects[0], url: 'http://example.com' }];
  assert.throws(() => validateProjects(invalid), /项目 URL 不安全/);

  assert.doesNotThrow(() => validateProjects([
    { ...projects[0], url: 'http://localhost:3000' },
    { ...projects[1], id: 'local-ip', url: 'http://127.0.0.1:8080' },
  ]));
});

test('项目配置状态值必须受支持', () => {
  assert.throws(
    () => validateProjects([{ ...projects[0], status: 'unknown' }]),
    /项目状态无效/,
  );
});

