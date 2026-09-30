(function () {
  'use strict';
  const KEY = 'miga-brand-kit-v1';
  const defaults = { name: '', voice: '', primary: '#0e2a47', accent: '#e2a63b', body: '#16202b', configured: false };
  function validColor(value) { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value); }
  function normalize(value) {
    if (!value || typeof value !== 'object') return { ...defaults };
    return {
      name: typeof value.name === 'string' ? value.name.slice(0, 80) : '',
      voice: typeof value.voice === 'string' ? value.voice.slice(0, 240) : '',
      primary: validColor(value.primary) ? value.primary : defaults.primary,
      accent: validColor(value.accent) ? value.accent : defaults.accent,
      body: validColor(value.body) ? value.body : defaults.body,
      configured: value.configured === true || ['primary', 'accent', 'body'].some(key => validColor(value[key]) && value[key].toLowerCase() !== defaults[key])
    };
  }
  function get() {
    try { return normalize(JSON.parse(localStorage.getItem(KEY) || 'null')); }
    catch (_) { return { ...defaults }; }
  }
  function save(value) {
    const clean = normalize(value);
    try { localStorage.setItem(KEY, JSON.stringify(clean)); }
    catch (_) { /* Storage may be disabled; callers still receive local values. */ }
    return clean;
  }
  window.MigaBrand = { get, save };

  function mount() {
    const main = document.querySelector('main');
    if (!main || document.getElementById('migaBrandKit')) return;
    const lang = document.documentElement.lang || 'en';
    const labels = {
      en: ['Brand kit (saved on this device)', 'Brand name', 'Brand voice', 'Primary', 'Accent', 'Body text', 'Export', 'Import', 'Choose a brand-kit JSON file'],
      es: ['Kit de marca (guardado en este dispositivo)', 'Nombre de marca', 'Voz de marca', 'Principal', 'Acento', 'Texto', 'Exportar', 'Importar', 'Elige un archivo JSON del kit de marca'],
      ar: ['مجموعة العلامة التجارية (محفوظة على هذا الجهاز)', 'اسم العلامة', 'صوت العلامة', 'أساسي', 'تمييز', 'النص', 'تصدير', 'استيراد', 'اختر ملف JSON لمجموعة العلامة'],
      zh: ['品牌套件（保存在此设备）', '品牌名称', '品牌语气', '主色', '强调色', '正文颜色', '导出', '导入', '选择品牌套件 JSON 文件'],
      sw: ['Seti ya chapa (imehifadhiwa kwenye kifaa hiki)', 'Jina la chapa', 'Sauti ya chapa', 'Msingi', 'Msisitizo', 'Maandishi', 'Hamisha', 'Ingiza', 'Chagua faili ya JSON ya seti ya chapa']
    }[lang] || ['Brand kit (saved on this device)', 'Brand name', 'Brand voice', 'Primary', 'Accent', 'Body text', 'Export', 'Import', 'Choose a brand-kit JSON file'];
    const panel = document.createElement('details');
    panel.id = 'migaBrandKit'; panel.className = 'panel'; panel.style.margin = '0 auto 18px';
    const summary = document.createElement('summary'); summary.textContent = labels[0]; summary.style.cursor = 'pointer'; summary.style.fontWeight = '700';
    panel.append(summary);
    const grid = document.createElement('div'); grid.className = 'grid'; grid.style.marginTop = '14px';
    const data = get();
    const fields = [['name', 'text'], ['voice', 'text'], ['primary', 'color'], ['accent', 'color'], ['body', 'color']];
    fields.forEach(([key, type], index) => {
      const wrap = document.createElement('div'); wrap.className = 'field';
      const label = document.createElement('label'); label.textContent = labels[index + 1];
      const input = document.createElement('input'); input.type = type; input.value = data[key]; input.maxLength = key === 'voice' ? 240 : 80;
      input.setAttribute('aria-label', labels[index + 1]);
      input.addEventListener('input', () => { data[key] = input.value; if (['primary', 'accent', 'body'].includes(key)) data.configured = true; save(data); });
      wrap.append(label, input); grid.append(wrap);
    });
    panel.append(grid);
    const actions = document.createElement('div'); actions.className = 'actions';
    const exportButton = document.createElement('button'); exportButton.className = 'secondary'; exportButton.textContent = labels[6];
    exportButton.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(get(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'miga-brand-kit.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    const importLabel = document.createElement('label'); importLabel.className = 'secondary'; importLabel.style.cursor = 'pointer'; importLabel.textContent = labels[7];
    const file = document.createElement('input'); file.type = 'file'; file.accept = 'application/json,.json'; file.hidden = true; file.setAttribute('aria-label', labels[8]);
    file.addEventListener('change', async () => {
      const chosen = file.files && file.files[0]; if (!chosen) return;
      if (chosen.size > 16384) { file.value = ''; return; }
      try {
        const parsed = JSON.parse(await chosen.text());
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid brand kit');
        Object.assign(data, normalize(parsed)); save(data);
        grid.querySelectorAll('input').forEach((input, index) => { input.value = data[fields[index][0]]; });
        document.dispatchEvent(new CustomEvent('miga:brand-change', { detail: get() }));
      } catch (_) { window.alert('Could not import that brand-kit file.'); }
      file.value = '';
    });
    importLabel.append(file); actions.append(exportButton, importLabel); panel.append(actions);
    const privacy = document.createElement('p'); privacy.className = 'muted'; privacy.textContent = 'Brand details stay in this browser unless you export them or send text to a service yourself.'; panel.append(privacy);
    main.insertBefore(panel, main.firstChild);
    panel.addEventListener('input', () => document.dispatchEvent(new CustomEvent('miga:brand-change', { detail: get() })));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
