/**
 * CMS Prototype – Storage helpers (localStorage keys from docs)
 *
 * Chiavi usate nel prototipo:
 * - pmp_cms_areas, pmp_cms_templates, pmp_cms_pages, pmp_cms_navigations
 * - pmp_cms_forms, pmp_admin_users, pmp_cms_system_variable_defaults, pmp_cms_system_variable_custom_keys
 * - pmp_component_<id> (un record per componente)
 * - pmp_cms_settings (Settings: branding, SSO – usato da admin/settings.html)
 * - pmp_cms_email_templates (oggetto keyed by id – usato da admin/emails.html)
 */
const CMS_KEYS = {
  areas: 'pmp_cms_areas',
  templates: 'pmp_cms_templates',
  pages: 'pmp_cms_pages',
  navigations: 'pmp_cms_navigations',
  forms: 'pmp_cms_forms',
  users: 'pmp_admin_users',
  systemVariableDefaults: 'pmp_cms_system_variable_defaults',
  systemVariableCustomKeys: 'pmp_cms_system_variable_custom_keys',
};

function getJson(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function setJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getAreas() { return getJson(CMS_KEYS.areas, []); }
function getTemplates() { return getJson(CMS_KEYS.templates, []); }
function getPages() { return getJson(CMS_KEYS.pages, []); }
function getNavigations() { return getJson(CMS_KEYS.navigations, {}); }
function getForms() {
  const v = getJson(CMS_KEYS.forms, []);
  const arr = Array.isArray(v) ? v : Object.entries(v).map(([id, o]) => ({ id, name: (o && o.name) != null ? o.name : id }));
  return arr.map((f) => {
    const name = f.name != null ? String(f.name) : '';
    const id = f.id != null ? String(f.id) : normalizeFormName(name);
    return { id, name: name || id, ...(f.fields && { fields: f.fields }) };
  });
}
function normalizeFormName(name) {
  if (name == null) return '';
  const s = String(name).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return s || 'form-' + Date.now();
}
function getUsers() { return getJson(CMS_KEYS.users, []); }
function getSystemVariableDefaults() { return getJson(CMS_KEYS.systemVariableDefaults, {}); }
function getComponent(id) { return getJson('pmp_component_' + id, null); }
function getAllComponentIds() {
  const ids = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('pmp_component_')) ids.push(key.replace('pmp_component_', ''));
  }
  return ids;
}

function seedIfEmpty() {
  if (getAreas().length === 0) {
    setJson(CMS_KEYS.areas, [
      { name: 'Public', displayName: 'Public Area', siteName: 'CMS Site', description: 'Public-facing pages', badgeColor: 'info', icon: 'fa-solid fa-globe', status: 'active', pagesCount: 0, rootPath: '/' },
      { name: 'Startup', displayName: 'Startup Area', siteName: 'Startup', description: 'Startup area', badgeColor: 'success', icon: 'fa-solid fa-rocket', status: 'active', pagesCount: 0, rootPath: '/startup' },
    ]);
  }
  if (getPages().length === 0) {
    setJson(CMS_KEYS.pages, [
      { id: '1', title: 'Home', slug: '', fullPath: '/', area: 'Public', status: 'Published', parentId: null, structure: [{ componentId: 'hero-1', order: 1 }, { componentId: 'content-1', order: 2 }], content: {}, seo: { metaTitle: 'Home', metaDescription: 'Welcome', keywords: '' }, style: {} },
    ]);
  }
  const nav = getNavigations();
  if (Object.keys(nav).length === 0) {
    setJson(CMS_KEYS.navigations, {
      'main-header': { name: 'Main Header', items: [{ type: 'page', label: 'Home', url: '/' }, { type: 'custom', label: 'Privacy', url: '/privacy-policy' }, { type: 'custom', label: 'Terms', url: '/terms' }], template: '', additionalCss: '', additionalJs: '' },
      'footer-links': { name: 'Footer Links', items: [{ type: 'custom', label: 'Privacy', url: '/privacy-policy' }, { type: 'custom', label: 'Terms', url: '/terms' }], template: '', additionalCss: '', additionalJs: '' },
    });
  }
}

if (typeof window !== 'undefined') {
  window.CMS_KEYS = CMS_KEYS;
  window.getAreas = getAreas;
  window.getTemplates = getTemplates;
  window.getPages = getPages;
  window.getNavigations = getNavigations;
  window.getForms = getForms;
  window.normalizeFormName = normalizeFormName;
  window.getUsers = getUsers;
  window.getSystemVariableDefaults = getSystemVariableDefaults;
  window.getComponent = getComponent;
  window.getAllComponentIds = getAllComponentIds;
  window.getJson = getJson;
  window.setJson = setJson;
  window.seedIfEmpty = seedIfEmpty;
}
