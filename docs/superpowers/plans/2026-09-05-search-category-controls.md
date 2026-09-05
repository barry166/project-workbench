# Search and Category Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the native workbench filter controls with a Geek Charge-style search field and an accessible custom category picker.

**Architecture:** Keep `filterProjects` as the single filtering boundary. Add small exported pure helpers for category counts and keyboard index movement, render the custom menu from project configuration, then bind DOM events in one initialization function. HTML owns accessible structure, CSS owns presentation and motion, and no state is persisted beyond the current page session.

**Tech Stack:** Static HTML, CSS, native ES modules, Node.js built-in test runner, Vercel, no third-party dependencies.

---

### Task 1: Lock category data and keyboard behavior with tests

**Files:**
- Modify: `test/frontend.test.mjs:5-108`
- Modify: `public/client.mjs:15-43`

- [ ] **Step 1: Write failing tests for category counts and keyboard movement**

Add `getCategoryOptions` and `moveOptionIndex` to the import list and add:

```js
test('分类选项由项目数据生成并包含全部项目计数', () => {
  assert.deepEqual(getCategoryOptions(projects), [
    { value: 'all', label: '全部分类', count: 3 },
    { value: '账号与权益', label: '账号与权益', count: 2 },
    { value: '其他工具', label: '其他工具', count: 1 },
  ]);
});

test('键盘方向移动在分类选项首尾循环', () => {
  assert.equal(moveOptionIndex(0, 1, 3), 1);
  assert.equal(moveOptionIndex(2, 1, 3), 0);
  assert.equal(moveOptionIndex(0, -1, 3), 2);
});
```

- [ ] **Step 2: Run focused tests and verify they fail for missing exports**

Run:

```bash
npm test -- --test-name-pattern='分类选项|键盘方向'
```

Expected: FAIL because `getCategoryOptions` and `moveOptionIndex` are not exported.

- [ ] **Step 3: Implement the minimal pure helpers**

Add after `getStatusMeta` in `public/client.mjs`:

```js
export function getCategoryOptions(list) {
  const counts = new Map();
  for (const project of list) {
    counts.set(project.category, (counts.get(project.category) ?? 0) + 1);
  }
  return [
    { value: 'all', label: '全部分类', count: list.length },
    ...[...counts].map(([value, count]) => ({ value, label: value, count })),
  ];
}

export function moveOptionIndex(index, direction, length) {
  return (index + direction + length) % length;
}
```

- [ ] **Step 4: Run the focused and full suites**

Run:

```bash
npm test -- --test-name-pattern='分类选项|键盘方向'
npm test
```

Expected: focused tests PASS; full suite reports zero failures.

- [ ] **Step 5: Commit the pure behavior**

```bash
git add public/client.mjs test/frontend.test.mjs
git commit -m "Make category options deterministic for the custom picker"
```

### Task 2: Replace the filter markup and bind accessible interactions

**Files:**
- Modify: `public/index.html:25-28`
- Modify: `public/client.mjs:77-120`
- Modify: `test/frontend.test.mjs:94-108`

- [ ] **Step 1: Write failing markup contract tests**

Add:

```js
test('筛选控件提供搜索清空与自定义分类菜单的无障碍结构', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="search-clear"[^>]*aria-label="清空搜索"/);
  assert.match(html, /id="category-trigger"[^>]*aria-expanded="false"[^>]*aria-controls="category-menu"/);
  assert.match(html, /id="category-menu"[^>]*role="listbox"/);
  assert.doesNotMatch(html, /<select\b/);
});
```

- [ ] **Step 2: Run the markup test and verify it fails against the native select**

Run:

```bash
npm test -- --test-name-pattern='无障碍结构'
```

Expected: FAIL because the clear button and listbox are absent and a native `<select>` remains.

- [ ] **Step 3: Replace the control strip markup**

Replace `public/index.html:25-28` with:

```html
<section class="control-strip" aria-label="项目筛选">
  <div class="control-field search-control">
    <label class="control-label" for="project-search"><span>项目搜索</span><b>SEARCH / PROJECTS</b></label>
    <div class="search-input-shell">
      <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>
      <input id="project-search" type="search" placeholder="输入项目名称、标签或描述" autocomplete="off">
      <button id="search-clear" class="search-clear" type="button" aria-label="清空搜索" hidden>×</button>
      <span class="field-scan" aria-hidden="true"></span>
    </div>
  </div>
  <div class="control-field category-control">
    <span class="control-label"><span>项目分类</span><b>CATEGORY / FILTER</b></span>
    <div class="category-picker">
      <button id="category-trigger" class="category-trigger" type="button" aria-expanded="false" aria-controls="category-menu">
        <span id="category-current">全部分类</span><small id="category-count">03</small>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"/></svg>
      </button>
      <div id="category-menu" class="category-menu" role="listbox" aria-label="项目分类" tabindex="-1" hidden></div>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Add current filter state and render the category options**

Declare `let selectedCategory = 'all'; let activeCategoryIndex = 0;` at module scope. Add helpers that build option buttons with `role="option"`, `aria-selected`, `data-category`, label and zero-padded count. Replace `document.querySelector('#category-filter').value` in `render()` with `selectedCategory`.

Use this option shape:

```js
function categoryOption(option) {
  const selected = option.value === selectedCategory;
  return `<button class="category-option" type="button" role="option" aria-selected="${selected}" data-category="${escapeHtml(option.value)}"><span>${escapeHtml(option.label)}</span><small>${String(option.count).padStart(2, '0')}</small><i aria-hidden="true">✓</i></button>`;
}
```

- [ ] **Step 5: Bind clear, open, close, selection, outside-click and keyboard behavior**

Create `initFilterControls()` and call it before the initial `render()`. It must:

```js
search.addEventListener('input', () => {
  clear.hidden = !search.value;
  render();
});
clear.addEventListener('click', () => {
  search.value = '';
  clear.hidden = true;
  search.focus();
  render();
});
trigger.addEventListener('click', () => setMenuOpen(trigger.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('click', (event) => {
  if (!picker.contains(event.target)) setMenuOpen(false);
});
```

The trigger and menu key handlers must use `moveOptionIndex`, update `.is-active`, select with Enter or Space, close with Escape, update `selectedCategory`, `#category-current`, `#category-count`, `aria-selected`, and call `render()`.

- [ ] **Step 6: Run tests and commit the accessible DOM behavior**

Run:

```bash
npm test
```

Expected: all tests PASS.

Commit:

```bash
git add public/index.html public/client.mjs test/frontend.test.mjs
git commit -m "Replace the native category select with an accessible picker"
```

### Task 3: Match Geek Charge field styling and add restrained motion

**Files:**
- Modify: `public/styles.css:1-2`
- Modify: `test/frontend.test.mjs:94-108`

- [ ] **Step 1: Extend CSS contract tests before styling**

In the mobile CSS test, add:

```js
assert.match(css, /\.search-input-shell:focus-within[^}]*border-color\s*:\s*var\(--orange\)/s);
assert.match(css, /\.search-input-shell:focus-within\s+\.field-scan[^}]*width\s*:\s*100%/s);
assert.match(css, /\.category-menu[^}]*position\s*:\s*absolute/s);
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
```

- [ ] **Step 2: Run the CSS test and verify the new contracts fail**

Run:

```bash
npm test -- --test-name-pattern='移动端 CSS'
```

Expected: FAIL because the new control selectors do not exist.

- [ ] **Step 3: Replace the current control CSS**

Remove `.search-field`, `.filter-field`, and native select rules. Add:

```css
.control-strip{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,34%);gap:clamp(28px,5vw,72px);padding:38px clamp(22px,7vw,110px);background:#0e1011;border-bottom:1px solid var(--line);overflow:visible}
.control-field{min-width:0}.control-label{display:flex;justify-content:space-between;align-items:end;margin-bottom:11px;color:var(--ink);font-size:13px}.control-label b{color:#64696b;font:500 9px/1 var(--mono);letter-spacing:.15em}.search-input-shell,.category-trigger{height:78px;border:0;border-top:1px solid #555a5c;border-bottom:1px solid #555a5c;background:transparent;color:var(--ink)}
.search-input-shell{display:flex;align-items:center;position:relative;transition:border-color .2s}.search-input-shell:focus-within{border-color:var(--orange)}.search-icon{width:22px;height:22px;margin-right:20px;padding-right:0;fill:none;stroke:var(--orange);stroke-width:1.7}.search-input-shell:before{content:"";width:1px;height:27px;order:1;background:var(--line);margin-right:20px}.search-input-shell input{order:2;min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--ink);font:500 clamp(18px,2vw,26px)/1 var(--mono)}.search-clear{order:3;width:48px;height:48px;border:0;background:none;color:var(--muted);font:22px/1 var(--mono);cursor:pointer}.field-scan{position:absolute;bottom:-1px;left:0;width:0;height:2px;background:var(--orange);box-shadow:0 0 12px var(--orange);transition:width .35s}.search-input-shell:focus-within .field-scan{width:100%}
.category-picker{position:relative}.category-trigger{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:14px;padding:0 16px;text-align:left;cursor:pointer;font:600 16px var(--mono);transition:border-color .2s}.category-trigger:hover,.category-trigger[aria-expanded="true"]{border-color:var(--orange)}.category-trigger small{color:var(--orange);font:700 10px var(--mono)}.category-trigger svg{width:20px;fill:none;stroke:var(--orange);stroke-width:1.7;transition:transform .18s}.category-trigger[aria-expanded="true"] svg{transform:rotate(180deg)}.category-menu{position:absolute;z-index:20;top:calc(100% + 8px);left:0;width:100%;padding:6px;border:1px solid #555a5c;background:#101315;box-shadow:0 22px 50px rgba(0,0,0,.42);animation:menu-in .16s ease-out}.category-option{position:relative;width:100%;min-height:52px;display:grid;grid-template-columns:minmax(0,1fr) auto 20px;align-items:center;gap:10px;padding:0 12px;border:0;background:transparent;color:#aeb2b3;text-align:left;cursor:pointer;font:600 12px var(--mono)}.category-option:hover,.category-option.is-active{background:#171b1d;color:var(--ink)}.category-option[aria-selected="true"]{color:var(--orange)}.category-option[aria-selected="true"]:before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:2px;background:var(--orange)}.category-option small{color:var(--dim);font:700 9px var(--mono)}.category-option i{visibility:hidden;color:var(--orange);font-style:normal}.category-option[aria-selected="true"] i{visibility:visible}@keyframes menu-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
```

- [ ] **Step 4: Add mobile rules and reduced-motion coverage**

At `max-width:900px`, set `.control-strip{grid-template-columns:1fr}`. At `max-width:640px`, keep 20px page padding, set both shells to `height:68px`, ensure `.category-menu{max-width:calc(100vw - 40px)}`, and keep `.search-clear` at least 48px. Retain the existing reduced-motion rule so `menu-in`, scan transitions, and arrow rotation are disabled.

- [ ] **Step 5: Run the full automated verification**

Run:

```bash
npm run build
npm test
git diff --check
```

Expected: build succeeds, all tests pass, and `git diff --check` prints nothing.

- [ ] **Step 6: Commit styling**

```bash
git add public/styles.css test/frontend.test.mjs
git commit -m "Align workbench filters with the Geek Charge interaction system"
```

### Task 4: Browser QA, responsive verification and deployment

**Files:**
- Verify: `public/index.html`
- Verify: `public/styles.css`
- Verify: `public/client.mjs`

- [ ] **Step 1: Start the local server**

Run:

```bash
npm run dev
```

Expected: `Project Workbench running at http://127.0.0.1:4173`.

- [ ] **Step 2: Verify the desktop interaction path**

At 1440×1000:

1. Focus search and confirm the orange scan line reaches 100%.
2. Type `Geek` and confirm only Geek Charge remains.
3. Clear search and confirm all three projects return with focus retained.
4. Open category picker, select `其他工具`, and confirm only the future project remains.
5. Reopen with keyboard, use arrows, Enter and Escape, and confirm focus and ARIA state.

- [ ] **Step 3: Verify mobile and reduced motion**

At 390×844, confirm controls stack, the menu remains inside the viewport, touch targets are at least 48px, URL text wraps, and `document.documentElement.scrollWidth === document.documentElement.clientWidth`. Emulate reduced motion and confirm no scanning or menu translation animation runs.

- [ ] **Step 4: Compare against Geek Charge**

Capture current Geek Charge and workbench screenshots at the same viewport. Inspect field height, top/bottom borders, label hierarchy, orange focus state, type scale, left icon divider and mobile spacing. Fix any visible drift before deployment.

- [ ] **Step 5: Run final verification, push and deploy**

Run:

```bash
npm run build
npm test
git status --short
git push
npx --yes vercel --prod --yes
curl --retry 3 --retry-all-errors -fsSI https://project-workbench-roan.vercel.app/
curl --retry 3 --retry-all-errors -fsS https://project-workbench-roan.vercel.app/api/health
```

Expected: zero test failures, clean worktree, Vercel reports `READY`, homepage returns HTTP 200, and health JSON contains only `online`, `responseTimeMs`, and `checkedAt`.
