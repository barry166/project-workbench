import { projects } from './projects-data.mjs';

export const STORAGE_KEYS = {
  favorites: 'project-workbench:favorites',
  recent: 'project-workbench:recent',
};

const STATUS_META = {
  online: { label: '在线', className: 'status-online' },
  maintenance: { label: '维护中', className: 'status-maintenance' },
  private: { label: '私有', className: 'status-private' },
  planned: { label: '规划中', className: 'status-planned' },
};

export function getStatusMeta(status) {
  return STATUS_META[status] ?? STATUS_META.planned;
}

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

export function filterProjects(list, { query = '', category = 'all' } = {}) {
  const needle = query.trim().toLocaleLowerCase();
  return [...list]
    .filter((project) => category === 'all' || project.category === category)
    .filter((project) => {
      if (!needle) return true;
      return [project.name, project.description, project.category, ...project.tags]
        .join(' ').toLocaleLowerCase().includes(needle);
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function toggleFavorite(ids, id) {
  const unique = [...new Set(ids)];
  return unique.includes(id) ? unique.filter((item) => item !== id) : [...unique, id];
}

export function getPinnedProjects(list, favoriteIds) {
  const favorites = new Set(favoriteIds);
  return list.filter((project) => project.featured || favorites.has(project.id));
}

export function recordRecentVisit(ids, id) {
  return [id, ...ids.filter((item) => item !== id)].slice(0, 6);
}

function readIds(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeIds(key, ids) {
  try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* storage can be disabled */ }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function projectCard(project, favorites) {
  const status = getStatusMeta(project.status);
  const isFavorite = favorites.includes(project.id);
  const disabled = project.status === 'planned' ? ' disabled' : '';
  return `<article class="project-card ${project.featured ? 'is-featured' : ''}" data-project-id="${escapeHtml(project.id)}">
    <div class="card-rail" aria-hidden="true"></div>
    <div class="card-topline"><span class="project-icon">${escapeHtml(project.icon)}</span><span class="project-category">${escapeHtml(project.category)}</span><button class="favorite-button ${isFavorite ? 'is-favorite' : ''}" data-action="favorite" aria-label="${isFavorite ? '取消收藏' : '收藏'} ${escapeHtml(project.name)}" aria-pressed="${isFavorite}">${isFavorite ? '★' : '☆'}</button></div>
    <h3>${escapeHtml(project.name)}</h3>
    <p>${escapeHtml(project.description)}</p>
    <div class="tag-list">${project.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
    <div class="card-meta"><span class="status-chip ${status.className}"><i></i>${status.label}</span><span class="project-url">${escapeHtml(project.url.replace(/^https?:\/\//, ''))}</span></div>
    <button class="launch-button" data-action="launch"${disabled}>${project.status === 'planned' ? '等待上线' : '打开项目'}<span aria-hidden="true">↗</span></button>
  </article>`;
}

function render() {
  const root = document.querySelector('#project-grid');
  const featuredRoot = document.querySelector('#featured-grid');
  const recentRoot = document.querySelector('#recent-grid');
  const empty = document.querySelector('#empty-state');
  const query = document.querySelector('#project-search').value;
  const category = document.querySelector('#category-filter').value;
  const favorites = readIds(STORAGE_KEYS.favorites);
  const recent = readIds(STORAGE_KEYS.recent);
  const visible = filterProjects(projects, { query, category });
  const featured = getPinnedProjects(visible, favorites);
  const recentProjects = recent.map((id) => projects.find((project) => project.id === id)).filter(Boolean);

  featuredRoot.innerHTML = featured.length ? featured.map((project) => projectCard(project, favorites)).join('') : '<p class="muted-state">没有匹配的置顶项目</p>';
  root.innerHTML = visible.map((project) => projectCard(project, favorites)).join('');
  recentRoot.innerHTML = recentProjects.length ? recentProjects.map((project) => projectCard(project, favorites)).join('') : '<p class="muted-state">打开项目后，最近访问会显示在这里</p>';
  empty.hidden = visible.length > 0;
  document.querySelector('#project-count').textContent = `${projects.length} PROJECTS`;
  document.querySelector('#result-count').textContent = `${visible.length} RESULTS`;
  bindCardActions();
}

function bindCardActions() {
  document.querySelectorAll('[data-action="favorite"]').forEach((button) => button.addEventListener('click', () => {
    const card = button.closest('[data-project-id]');
    writeIds(STORAGE_KEYS.favorites, toggleFavorite(readIds(STORAGE_KEYS.favorites), card.dataset.projectId));
    render();
  }));
  document.querySelectorAll('[data-action="launch"]').forEach((button) => button.addEventListener('click', () => {
    const project = projects.find((item) => item.id === button.closest('[data-project-id]').dataset.projectId);
    if (!project || project.status === 'planned') return;
    writeIds(STORAGE_KEYS.recent, recordRecentVisit(readIds(STORAGE_KEYS.recent), project.id));
    window.open(project.url, '_blank', 'noopener,noreferrer');
    render();
  }));
}

if (typeof document !== 'undefined') {
  document.querySelector('#project-search')?.addEventListener('input', render);
  document.querySelector('#category-filter')?.addEventListener('change', render);
  document.querySelector('#clear-favorites')?.addEventListener('click', () => { writeIds(STORAGE_KEYS.favorites, []); render(); });
  document.querySelector('#clock')?.replaceChildren(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
  render();
}
