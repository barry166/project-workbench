export const STATUS_VALUES = ['online', 'maintenance', 'private', 'planned'];

export const projects = [
  {
    id: 'geek-charge',
    name: 'Geek Charge',
    description: '企业权益充值与课程包绑定控制台。',
    url: 'https://geek-charge.vercel.app',
    category: '账号与权益',
    tags: ['企业版', '课程包', '充值'],
    status: 'online',
    featured: true,
    icon: 'GC',
    sortOrder: 10,
  },
  {
    id: 'chatgpt-account-manager',
    name: 'ChatGPT 账号管理台',
    description: '集中记录账号资产、订单时间与查询入口。',
    url: 'https://chatgpt-account-manager.vercel.app',
    category: '账号与权益',
    tags: ['账号资产', '导入', '记录'],
    status: 'planned',
    featured: true,
    icon: 'AI',
    sortOrder: 20,
  },
  {
    id: 'future-project',
    name: '未来项目配置位',
    description: '在 src/projects.mjs 中添加一条配置即可出现在工作台。',
    url: 'https://future-project.invalid',
    category: '其他工具',
    tags: ['预留', '配置驱动'],
    status: 'planned',
    featured: false,
    icon: '+',
    sortOrder: 90,
  },
];

export function validateProjects(list) {
  const seen = new Set();
  for (const project of list) {
    for (const field of ['id', 'name', 'description', 'url', 'category', 'tags', 'status', 'featured', 'icon', 'sortOrder']) {
      if (!(field in project)) throw new Error(`${project.id ?? 'unknown'} 缺少 ${field}`);
    }
    if (seen.has(project.id)) throw new Error(`项目 ID 重复: ${project.id}`);
    seen.add(project.id);
    let parsed;
    try { parsed = new URL(project.url); } catch { throw new Error(`项目 URL 不安全: ${project.url}`); }
    const local = ['localhost', '127.0.0.1'].includes(parsed.hostname);
    if (!(parsed.protocol === 'https:' || (parsed.protocol === 'http:' && local))) {
      throw new Error(`项目 URL 不安全: ${project.url}`);
    }
    if (!STATUS_VALUES.includes(project.status)) throw new Error(`项目状态无效: ${project.status}`);
    if (!Array.isArray(project.tags)) throw new Error(`项目标签必须为数组: ${project.id}`);
    if (typeof project.featured !== 'boolean') throw new Error(`项目 featured 必须为布尔值: ${project.id}`);
  }
  return list;
}

validateProjects(projects);
