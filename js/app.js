/* 連展電能 手機巡檢 — 主程式 */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const fmtDate = s => s ? s.replace(/-/g, '/') : '—';
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 無痕模式等情況略過 */ } },
    del(k) { try { localStorage.removeItem(k); } catch { } },
  };

  const ICON = {
    search: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="2.3" fill="currentColor"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor"/></svg>',
    camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 17l5-5 4 4 2-2 3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="15.5" cy="9.5" r="1.5" fill="currentColor"/></svg>',
    excel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l5 5v13H6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14 3v6h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 12l6 6M15 12l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    zip: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 4v3h2v2h-2v2h2v2h-2v2h2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="4" cy="6" r="1.3" fill="currentColor"/><circle cx="4" cy="12" r="1.3" fill="currentColor"/><circle cx="4" cy="18" r="1.3" fill="currentColor"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 19h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M7 9l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 19h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    warn: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3l10 18H2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="18" r="1.2" fill="currentColor"/></svg>',
    emptySites: '<svg viewBox="0 0 96 96" aria-hidden="true"><rect x="30" y="18" width="36" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="3"/><path d="M52 30l-9 15h7l-2 12 10-16h-7l1-11z" fill="currentColor"/><path d="M20 80h56" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    emptyInsp: '<svg viewBox="0 0 96 96" aria-hidden="true"><rect x="22" y="16" width="52" height="66" rx="6" fill="none" stroke="currentColor" stroke-width="3"/><rect x="38" y="10" width="20" height="10" rx="3" fill="currentColor"/><path d="M34 40h28M34 52h28M34 64h18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  };
  const shortName = n => String(n || '').replace(/^acon-eco\s*/i, '');

  /* 外觀：ninja（忍者村風）或 plain（標準） */
  const SKIN_COLOR = { ninja: '#1b1915', cyber: '#06080f', plain: '#0f5d73' };
  const isNinja = () => ['ninja', 'cyber'].includes(document.documentElement.dataset.skin);
  function applySkin(skin) {
    document.documentElement.dataset.skin = skin;
    LS.set('skin', skin);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SKIN_COLOR[skin] || SKIN_COLOR.plain);
  }
  const N = (ninjaText, plainText) => isNinja() ? ninjaText : plainText;

  const app = $('#app');
  const state = { cur: null, dirty: false, photoUrls: new Map(), search: LS.get('search', '') };

  /* ---------- 共用 UI ---------- */
  let toastTimer;
  function toast(msg, kind) {
    const t = $('#toast');
    t.textContent = msg; t.className = 'toast' + (kind ? ' ' + kind : ''); t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  function openSheet(html, bind) {
    const sh = $('#sheet'), bd = $('#sheetBackdrop');
    sh.innerHTML = `<div class="sheet-grip" aria-hidden="true"></div>${html}`;
    sh.hidden = false; bd.hidden = false;
    requestAnimationFrame(() => { sh.classList.add('open'); bd.classList.add('open'); });
    bind && bind(sh);
  }
  function closeSheet() {
    const sh = $('#sheet'), bd = $('#sheetBackdrop');
    sh.classList.remove('open'); bd.classList.remove('open');
    setTimeout(() => { sh.hidden = true; bd.hidden = true; sh.innerHTML = ''; }, 200);
  }
  $('#sheetBackdrop').addEventListener('click', closeSheet);

  function confirmSheet({ title, message, ok = '確定', danger = false }) {
    return new Promise(resolve => {
      openSheet(`
        <h2 class="sheet-title">${esc(title)}</h2>
        ${message ? `<p class="sheet-msg">${esc(message)}</p>` : ''}
        <div class="sheet-actions">
          <button class="btn ghost" data-r="0">取消</button>
          <button class="btn ${danger ? 'danger' : 'primary'}" data-r="1">${esc(ok)}</button>
        </div>`, sh => {
        $$('[data-r]', sh).forEach(b => b.addEventListener('click', () => { closeSheet(); resolve(b.dataset.r === '1'); }));
      });
    });
  }

  function setTop({ eyebrow = '連展電能', title, back = false }) {
    $('#topEyebrow').textContent = eyebrow;
    $('#topTitle').textContent = title;
    $('#backBtn').hidden = !back;
    document.title = title === '多站點巡檢' ? '連展電能 巡檢' : `${title}｜巡檢`;
  }

  async function go(hash) {
    if (state.dirty && !(await confirmSheet({ title: '巡檢還沒儲存', message: '離開會保留草稿，下次打開這筆巡檢可以接著填。', ok: '先離開' }))) return;
    state.dirty = false;
    location.hash = hash;
  }
  $('#backBtn').addEventListener('click', () => {
    const r = route();
    if (r.name === 'insp' || r.name === 'inspNew') go('#/site/' + (state.cur?.siteId || r.siteId));
    else if (r.name === 'siteEdit' && r.id !== 'new') go('#/site/' + r.id);
    else go('#/');
  });

  /* ---------- 路由 ---------- */
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const p = h.split('/').filter(Boolean);
    if (!p.length) return { name: 'sites' };
    if (p[0] === 'site' && p[2] === 'edit') return { name: 'siteEdit', id: p[1] };
    if (p[0] === 'site' && p[1] === 'new') return { name: 'siteEdit', id: 'new' };
    if (p[0] === 'site') return { name: 'site', id: p[1] };
    if (p[0] === 'insp' && p[1] === 'new') return { name: 'inspNew', siteId: p[2] };
    if (p[0] === 'insp') return { name: 'insp', id: p[1] };
    if (p[0] === 'checklist') return { name: 'checklist' };
    return { name: 'sites' };
  }

  async function render() {
    const r = route();
    window.scrollTo(0, 0);
    if (r.name !== 'insp' && r.name !== 'inspNew') state.cur = null;
    document.body.classList.toggle('has-savebar', r.name === 'insp' || r.name === 'inspNew' || r.name === 'checklist' || r.name === 'siteEdit');
    try {
      if (r.name === 'sites') await viewSites();
      else if (r.name === 'site') await viewSite(r.id);
      else if (r.name === 'siteEdit') await viewSiteEdit(r.id);
      else if (r.name === 'inspNew') await viewInspection(null, r.siteId);
      else if (r.name === 'insp') await viewInspection(r.id);
      else if (r.name === 'checklist') await viewChecklist();
    } catch (e) {
      console.error(e);
      app.innerHTML = `<div class="empty"><p>畫面載入失敗：${esc(e.message)}</p><a class="btn ghost" href="#/">回站點清單</a></div>`;
    }
  }
  window.addEventListener('hashchange', render);

  /* ---------- 站點清單 ---------- */
  function statusKind(insp) {
    if (!insp) return 'none';
    if (Exporter.abnormal(insp).length) return 'bad';
    if (insp.items.some(i => !i.status)) return 'warn';
    return 'ok';
  }
  function statusPill(insp) {
    const k = statusKind(insp);
    if (k === 'none') return '<span class="pill none">未巡檢</span>';
    if (k === 'bad') return `<span class="pill bad">異常 ${Exporter.abnormal(insp).length}</span>`;
    if (k === 'warn') return `<span class="pill warn">未完成 ${insp.items.filter(i => !i.status).length}</span>`;
    return '<span class="pill ok">全部正常</span>';
  }

  async function viewSites() {
    setTop({ title: '多站點巡檢' });
    const [sites, insps] = await Promise.all([Store.all('sites'), Store.all('inspections')]);
    const rows = sites.map(s => {
      const list = insps.filter(i => i.siteId === s.id);
      return { s, last: Exporter.latestOf(list), count: list.length };
    }).sort((a, b) => (b.last?.date || '').localeCompare(a.last?.date || '') || a.s.name.localeCompare(b.s.name));

    const totalAb = rows.reduce((n, r) => n + (r.last ? Exporter.abnormal(r.last).length : 0), 0);
    const never = rows.filter(r => !r.last).length;
    let filter = LS.get('filter', 'all');

    app.innerHTML = `
      <section class="summary" role="group" aria-label="篩選">
        <button data-f="all" class="${filter === 'all' ? 'on' : ''}"><b class="num">${sites.length}</b><span>站點</span></button>
        <button data-f="bad" class="k-bad ${totalAb ? '' : 'zero'} ${filter === 'bad' ? 'on' : ''}"><b class="num">${totalAb}</b><span>待改善異常</span></button>
        <button data-f="none" class="k-none ${filter === 'none' ? 'on' : ''}"><b class="num">${never}</b><span>未巡檢</span></button>
      </section>
      <label class="search">${ICON.search}
        <input id="q" type="search" placeholder="搜尋站點名稱或地址" value="${esc(state.search)}" autocomplete="off">
      </label>
      <div class="list-head" id="listHead" hidden></div>
      <ul class="site-list" id="siteList"></ul>
      <button class="fab" id="addSite">${ICON.plus} 新增站點</button>`;

    const listEl = $('#siteList'), head = $('#listHead');
    const FILTER_NAME = { bad: '有異常的站點', none: '尚未巡檢的站點' };
    const draw = () => {
      const q = state.search.trim().toLowerCase();
      let shown = rows.filter(r => !q || r.s.name.toLowerCase().includes(q) || (r.s.address || '').toLowerCase().includes(q));
      if (filter === 'bad') shown = shown.filter(r => statusKind(r.last) === 'bad');
      if (filter === 'none') shown = shown.filter(r => !r.last);
      $$('.summary button').forEach(b => b.classList.toggle('on', b.dataset.f === filter));
      head.hidden = filter === 'all';
      head.innerHTML = `<span>${FILTER_NAME[filter] || ''}（${shown.length}）</span><button type="button" id="clearFilter">顯示全部</button>`;
      $('#clearFilter')?.addEventListener('click', () => { filter = 'all'; LS.set('filter', filter); draw(); });
      if (!rows.length) {
        listEl.innerHTML = `<li class="empty illu">${ICON.emptySites}<strong>還沒有站點</strong><p>按右下角「新增站點」從場站列表選一個開始，或從右上角選單還原備份。</p></li>`;
        return;
      }
      if (!shown.length) {
        listEl.innerHTML = `<li class="empty illu">${ICON.search.replace('width="18" height="18"', '')}<strong>${q ? `找不到「${esc(state.search)}」` : '這個分類目前沒有站點'}</strong><p>${filter !== 'all' ? '換個分類或清除篩選再試試。' : '試試用地區或路名搜尋。'}</p></li>`;
        return;
      }
      listEl.innerHTML = shown.map(({ s, last, count }) => `
        <li><a class="site-card st-${statusKind(last)}" href="#/site/${s.id}">
          <div class="site-main">
            <strong>${esc(shortName(s.name))}</strong>
            <span class="addr">${esc(s.address || '未填地址')}</span>
            <span class="meta"><span class="num">${fmtDate(last?.date)}</span>${last?.inspector ? `<i class="dot"></i>${esc(last.inspector)}` : ''}<i class="dot"></i>${count} 次巡檢</span>
          </div>
          <div class="site-side">${statusPill(last)}</div>
          ${ICON.chev}
        </a></li>`).join('');
    };
    draw();
    $('#q').addEventListener('input', e => { state.search = e.target.value; LS.set('search', state.search); draw(); });
    $$('.summary button').forEach(b => b.addEventListener('click', () => { filter = filter === b.dataset.f ? 'all' : b.dataset.f; LS.set('filter', filter); draw(); }));
    $('#addSite').addEventListener('click', () => go('#/site/new'));
  }

  /* ---------- 站點詳情 ---------- */
  async function viewSite(id) {
    const site = await Store.get('sites', id);
    if (!site) { app.innerHTML = `<div class="empty"><p>找不到這個站點，可能已被刪除。</p><a class="btn ghost" href="#/">回站點清單</a></div>`; return; }
    setTop({ eyebrow: '站點', title: shortName(site.name), back: true });
    const list = (await Store.bySite(id)).sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);
    const last = list[0];
    const ab = last ? Exporter.abnormal(last) : [];
    const photoCount = list.reduce((n, i) => n + (i.photos || []).length, 0);
    const thumbUrls = {};
    for (const i of list) for (const p of (i.photos || []).slice(0, 3)) thumbUrls[p.id] = await photoUrl(p.id);
    const thumbs = i => {
      const ps = i.photos || []; if (!ps.length) return '';
      return `<span class="thumbs">${ps.slice(0, 3).map(p => `<img src="${thumbUrls[p.id] || ''}" alt="">`).join('')}${ps.length > 3 ? `<span class="more">+${ps.length - 3}</span>` : ''}</span>`;
    };

    app.innerHTML = `
      <section class="site-hero">
        <div class="addr-row">${ICON.pin}<span>${esc(site.address || '未填地址')}</span></div>
        <dl class="spec">
          <div><dt>現場電力容量</dt><dd class="num">${esc(site.power || '—')}</dd></div>
          <div><dt>設備規格及數量</dt><dd class="num">${esc(site.equipment || '—')}</dd></div>
          <div class="wide"><dt>電力及纜線規格</dt><dd class="num">${esc(site.cable || '—')}</dd></div>
          ${site.note ? `<div class="wide"><dt>備註</dt><dd>${esc(site.note)}</dd></div>` : ''}
        </dl>
        <a class="link-btn" href="#/site/${id}/edit">編輯站點資料</a>
      </section>

      ${ab.length ? `<section class="alert">
        <strong>${ICON.warn}最近一次（${fmtDate(last.date)}）有 ${ab.length} 項異常</strong>
        <ul>${ab.map(x => `<li>${esc(x.name)}${x.value ? '：' + esc(x.value) : ''}</li>`).join('')}</ul>
      </section>` : ''}

      <button class="btn primary block big" id="startInsp">${ICON.plus} 開始新巡檢</button>
      <div class="btn-row">
        <button class="btn ghost" id="expSite" ${list.length ? '' : 'disabled'}>${ICON.excel} 匯出 Excel</button>
        <button class="btn ghost" id="expAlbum" ${photoCount ? '' : 'disabled'}>${ICON.image} 匯出相簿</button>
      </div>

      <h2 class="section-title">巡檢紀錄 <span class="muted">${list.length} 次${photoCount ? ` · ${photoCount} 張照片` : ''}</span></h2>
      ${list.length ? `<ul class="history">${list.map(i => `
        <li><a href="#/insp/${i.id}">
          <span class="num date">${fmtDate(i.date)}</span>
          <span class="who"><span>${esc(i.inspector || '未填人員')}</span>${thumbs(i)}</span>
          ${statusPill(i)}
        </a></li>`).join('')}</ul>`
        : `<div class="empty illu">${ICON.emptyInsp}<strong>還沒有巡檢紀錄</strong><p>按「開始新巡檢」建立第一筆。</p></div>`}

      <button class="btn text danger-text" id="delSite">刪除此站點</button>`;

    $('#startInsp').addEventListener('click', () => go('#/insp/new/' + id));
    $('#expSite').addEventListener('click', () => runExport(() => Exporter.site(id)));
    $('#expAlbum').addEventListener('click', () => runExport(() => Exporter.album(id)));
    $('#delSite').addEventListener('click', async () => {
      if (await confirmSheet({ title: `刪除「${site.name}」？`, message: `會一併刪除 ${list.length} 筆巡檢紀錄和 ${photoCount} 張照片，無法復原。建議先從選單匯出備份。`, ok: '刪除', danger: true })) {
        await Store.deleteSite(id); toast('已刪除站點'); go('#/');
      }
    });
  }

  async function runExport(fn) {
    toast('產生檔案中…');
    try {
      const r = await fn();
      if (r === 'downloaded') toast('檔案已下載', 'ok');
      else if (r === 'shared') toast('已開啟分享', 'ok');
    } catch (e) { console.error(e); toast(e.message || '匯出失敗', 'bad'); }
  }

  /* ---------- 站點新增 / 編輯 ---------- */
  async function viewSiteEdit(id) {
    const isNew = id === 'new';
    const site = isNew ? { name: '', address: '', power: '', equipment: '', cable: DEFAULT_CABLE, note: '' } : await Store.get('sites', id);
    if (!site) { location.hash = '#/'; return; }
    setTop({ eyebrow: isNew ? '新增' : '編輯站點', title: isNew ? '新增站點' : site.name, back: true });
    const f = (key, label, ph, type = 'text') => `
      <label class="field"><span>${label}</span>
        <input id="f_${key}" type="${type}" value="${esc(site[key])}" placeholder="${ph}"></label>`;
    app.innerHTML = `
      <form class="card form" id="siteForm" novalidate>
        <div class="field combo" id="combo">
          <label for="f_name">站點名稱 *</label>
          <div class="combo-box">
            <input id="f_name" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="comboList"
              autocomplete="off" enterkeyhint="search" value="${esc(site.name)}" placeholder="搜尋場站名稱、地區或地址">
            <button type="button" class="combo-clear" id="comboClear" aria-label="清除" ${site.name ? '' : 'hidden'}>×</button>
            <button type="button" class="combo-toggle" id="comboToggle" aria-label="展開場站清單">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
          <ul class="combo-list" id="comboList" role="listbox" hidden></ul>
          <p class="combo-meta" id="comboMeta" hidden></p>
        </div>
        ${f('address', '站點地址', '選擇場站後自動帶入')}
        <div class="grid2">
          ${f('power', '現場電力容量', '例：40A')}
          ${f('equipment', '設備規格及數量', '例：AC 7KW*1')}
        </div>
        <div class="field combo" id="cableCombo">
          <label for="f_cable">電力及纜線規格</label>
          <div class="combo-box">
            <input id="f_cable" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cableList"
              autocomplete="off" value="${esc(site.cable)}" placeholder="選擇或自行輸入，例：XLPE 8mm²">
            <button type="button" class="combo-clear" id="cableClear" aria-label="清除" ${site.cable ? '' : 'hidden'}>×</button>
            <button type="button" class="combo-toggle" id="cableToggle" aria-label="展開常用規格">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
          <ul class="combo-list" id="cableList" role="listbox" hidden></ul>
        </div>
        <label class="field"><span>備註</span><textarea id="f_note" rows="2" placeholder="停車位編號、聯絡窗口等">${esc(site.note)}</textarea></label>
        <p class="hint" id="cableHint" hidden></p>
      </form>
      <div class="savebar"><button class="btn primary block big" id="saveSite">${isNew ? '建立站點' : '儲存'}</button></div>`;

    await setupSiteCombo(id);
    setupCableCombo();

    // 線徑提醒：數字過小又沒有寫平方，可能是單位填錯
    const hint = $('#cableHint');
    const checkCable = () => {
      const v = $('#f_cable').value;
      const m = v.match(/(\d+(?:\.\d+)?)\s*mm(?!²|2)/i);
      hint.hidden = !(m && parseFloat(m[1]) < 3.5);
      hint.textContent = '線徑通常以 mm²（截面積）標示。7kW 單相約 32A，一般需 5.5–8 mm² 以上，請確認數值與單位。';
    };
    $('#f_cable').addEventListener('change', checkCable); checkCable();

    const save = async () => {
      const data = {};
      ['name', 'address', 'power', 'equipment', 'cable', 'note'].forEach(k => { data[k] = $('#f_' + k).value.trim(); });
      if (!data.name) { $('#f_name').focus(); toast('請填站點名稱', 'bad'); return; }
      const all = await Store.all('sites');
      if (all.some(s => s.name === data.name && s.id !== id)) { toast('已有同名站點', 'bad'); return; }
      const rec = isNew ? { id: Store.uid(), createdAt: Date.now(), ...data } : { ...site, ...data };
      rec.updatedAt = Date.now();
      await Store.put('sites', rec);
      toast(N(isNew ? '新據點登錄完成' : '已儲存', isNew ? '已建立站點' : '已儲存'), 'ok');
      location.hash = '#/site/' + rec.id;
    };
    $('#siteForm').addEventListener('submit', e => { e.preventDefault(); save(); });
    $('#saveSite').addEventListener('click', save);
  }

  /* 纜線規格：常用規格下拉，也可自行輸入其他規格 */
  const DEFAULT_CABLE = 'XLPE 8mm²';
  const CABLE_OPTIONS = [
    ['XLPE 5.5mm²', '小功率 AC 樁分路'],
    ['XLPE 8mm²', 'AC 7kW 單相常用'],
    ['XLPE 14mm²', 'AC 樁長距離配線 / 多樁分路'],
    ['XLPE 22mm²', 'AC 多樁幹線'],
    ['XLPE 30mm²', '幹線'],
    ['XLPE 38mm²', '幹線'],
    ['XLPE 50mm²', 'DC 快充 / 幹線'],
    ['XLPE 60mm²', 'DC 快充 / 幹線'],
    ['XLPE 80mm²', 'DC 快充 / 幹線'],
    ['XLPE 100mm²', 'DC 快充 / 總幹線'],
    ['XLPE 125mm²', 'DC 快充 / 總幹線'],
    ['XLPE 150mm²', 'DC 快充 / 總幹線'],
    ['XLPE 3.5mm²', '控制 / 小負載'],
    ['PVC 8mm²', ''],
    ['PVC 14mm²', ''],
  ];
  function setupCableCombo() {
    const input = $('#f_cable'), list = $('#cableList'), clearBtn = $('#cableClear');
    let shown = [], active = -1;
    const isOption = v => CABLE_OPTIONS.some(([o]) => o === v.trim());
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };
    const draw = (showAll) => {
      const q = norm(input.value).replace(/²/g, '').replace(/平方/g, '');
      shown = CABLE_OPTIONS.filter(([o]) => showAll || !q || norm(o).replace(/²/g, '').includes(q));
      const cur = input.value.trim();
      list.innerHTML = (shown.length ? shown.map(([o, note], i) => `
        <li role="option" id="cab${i}" data-i="${i}" class="${i === active ? 'active' : ''}${o === cur ? ' current' : ''}" aria-selected="${o === cur}">
          <div class="opt-top"><strong>${esc(o)}</strong>${o === DEFAULT_CABLE ? '<span class="opt-tag">預設</span>' : ''}</div>
          ${note ? `<span class="opt-addr">${esc(note)}</span>` : ''}
        </li>`).join('') : '')
        + (cur && !isOption(cur) ? `<li class="combo-empty">使用自行輸入的「${esc(cur)}」</li>` : '');
      list.hidden = !list.innerHTML; input.setAttribute('aria-expanded', String(!list.hidden));
    };
    const pick = i => {
      const o = shown[i]; if (!o) return;
      input.value = o[0]; clearBtn.hidden = false; close();
      input.dispatchEvent(new Event('change'));
      input.blur();
    };
    // 目前值是清單中的規格時，點開就顯示全部，方便換選
    input.addEventListener('focus', () => draw(isOption(input.value) || !input.value));
    input.addEventListener('input', () => { active = -1; clearBtn.hidden = !input.value; draw(false); input.dispatchEvent(new Event('change')); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { active = Math.min(shown.length - 1, active + 1); draw(true); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); draw(true); e.preventDefault(); }
      else if (e.key === 'Enter') { if (!list.hidden && active >= 0) pick(active); else close(); e.preventDefault(); }
      else if (e.key === 'Escape') close();
    });
    list.addEventListener('pointerdown', e => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); pick(+li.dataset.i); } });
    $('#cableToggle').addEventListener('click', () => { if (list.hidden) { input.focus(); draw(true); } else close(); });
    clearBtn.addEventListener('click', () => { input.value = ''; clearBtn.hidden = true; input.focus(); draw(true); input.dispatchEvent(new Event('change')); });
    document.addEventListener('pointerdown', function outside(e) {
      if (!document.body.contains(input)) { document.removeEventListener('pointerdown', outside); return; }
      if (!e.target.closest('#cableCombo')) close();
    });
  }

  /* 站點名稱：從場站列表下拉搜尋，選取後帶入名稱與地址；也可自行輸入 */
  const norm = t => String(t || '').toLowerCase().replace(/acon-eco/g, '').replace(/臺/g, '台').replace(/\s+/g, '');
  async function setupSiteCombo(editingId) {
    const master = window.SITE_MASTER || [];
    const input = $('#f_name'), list = $('#comboList'), meta = $('#comboMeta'), clearBtn = $('#comboClear');
    const existing = new Map((await Store.all('sites')).filter(s => s.id !== editingId).map(s => [s.name, s.id]));
    const index = master.map(m => ({ ...m, key: norm(m.name + ' ' + m.address + ' ' + m.type) }));
    let shown = [], active = -1;

    const showMeta = () => {
      const m = master.find(x => x.name === input.value.trim());
      meta.hidden = !m;
      if (m) meta.textContent = [m.type, m.kw, m.slots != null ? m.slots + ' 格' : ''].filter(Boolean).join(' · ');
      clearBtn.hidden = !input.value;
    };
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };
    const draw = () => {
      const tokens = input.value.split(/\s+/).map(norm).filter(Boolean);
      const hits = index.filter(m => tokens.every(t => m.key.includes(t)));
      shown = hits.slice(0, 60);
      if (!master.length) { list.innerHTML = '<li class="combo-empty">沒有場站列表資料</li>'; }
      else if (!shown.length) { list.innerHTML = `<li class="combo-empty">場站列表沒有符合的站點，可直接用輸入的名稱建立。</li>`; }
      else {
        list.innerHTML = shown.map((m, i) => {
          const done = existing.has(m.name);
          return `<li role="option" id="opt${i}" data-i="${i}" class="${done ? 'done' : ''}${i === active ? ' active' : ''}" aria-selected="${i === active}" aria-disabled="${done}">
            <div class="opt-top"><strong>${esc(shortName(m.name))}</strong>${done ? '<span class="pill none">已建立</span>' : `<span class="opt-tag">${esc(m.type)}</span>`}</div>
            <span class="opt-addr">${esc(m.address)}</span>
          </li>`;
        }).join('') + (hits.length > shown.length ? `<li class="combo-empty">還有 ${hits.length - shown.length} 筆，請輸入更多關鍵字</li>` : '');
      }
      list.hidden = false; input.setAttribute('aria-expanded', 'true');
      input.setAttribute('aria-activedescendant', active >= 0 ? 'opt' + active : '');
    };
    const open = () => { draw(); input.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
    const pick = i => {
      const m = shown[i]; if (!m) return;
      if (existing.has(m.name)) { toast('這個站點已經建立過了'); return; }
      input.value = m.name;
      $('#f_address').value = m.address;
      close(); showMeta();
      $('#f_power').focus({ preventScroll: true });
    };

    input.addEventListener('focus', open);
    input.addEventListener('input', () => { active = -1; draw(); showMeta(); });
    input.addEventListener('keydown', e => {
      if (list.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { draw(); return; }
      if (e.key === 'ArrowDown') { active = Math.min(shown.length - 1, active + 1); draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); draw(); e.preventDefault(); }
      else if (e.key === 'Enter' && !list.hidden && active >= 0) { pick(active); e.preventDefault(); }
      else if (e.key === 'Escape') close();
    });
    // pointerdown 先於 blur，避免清單在點選前就關掉
    list.addEventListener('pointerdown', e => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); pick(+li.dataset.i); } });
    $('#comboToggle').addEventListener('click', () => { if (list.hidden) { input.focus(); open(); } else close(); });
    clearBtn.addEventListener('click', () => { input.value = ''; showMeta(); input.focus(); draw(); });
    document.addEventListener('pointerdown', function outside(e) {
      if (!document.body.contains(input)) { document.removeEventListener('pointerdown', outside); return; }
      if (!e.target.closest('#combo')) close();
    });
    showMeta();
  }

  /* ---------- 巡檢表 ---------- */
  async function viewInspection(id, siteIdForNew) {
    let insp;
    if (id) {
      insp = await Store.get('inspections', id);
      if (!insp) { app.innerHTML = `<div class="empty"><p>找不到這筆巡檢。</p><a class="btn ghost" href="#/">回站點清單</a></div>`; return; }
      insp = structuredClone(insp);
      insp._isNew = false;
    } else {
      const checklist = await Store.checklist();
      insp = {
        id: Store.uid(), siteId: siteIdForNew, date: todayISO(), inspector: LS.get('inspector', ''),
        items: checklist.map(c => ({ ...c, status: '', value: '', note: '' })), photos: [], summary: '',
        createdAt: Date.now(), _isNew: true,
      };
    }
    const site = await Store.get('sites', insp.siteId);
    if (!site) { location.hash = '#/'; return; }

    // 草稿還原
    const draftKey = 'draft:' + (insp._isNew ? 'new:' + insp.siteId : insp.id);
    const draft = LS.get(draftKey, null);
    let restored = false;
    if (draft && (insp._isNew || (draft.savedAt > (insp.updatedAt || 0)))) {
      Object.assign(insp, draft.data); restored = true;
    }
    state.cur = insp; state.dirty = restored; state.draftKey = draftKey; state.pendingPhotoDeletes = [];

    setTop({ eyebrow: shortName(site.name), title: insp._isNew ? '新巡檢' : `巡檢 ${fmtDate(insp.date)}`, back: true });

    app.innerHTML = `
      ${restored ? '<p class="note">已載入上次未儲存的草稿。</p>' : ''}
      <section class="card form">
        <div class="grid2">
          <label class="field"><span>巡檢日期</span><input id="i_date" type="date" value="${esc(insp.date)}"></label>
          <label class="field"><span>巡檢人員</span><input id="i_inspector" type="text" value="${esc(insp.inspector)}" placeholder="姓名"></label>
        </div>
        <details class="site-peek">
          <summary>站點規格：${esc(site.power || '—')} · ${esc(site.equipment || '—')}</summary>
          <p class="small muted">${esc(site.address || '')}<br>纜線：${esc(site.cable || '—')}</p>
        </details>
      </section>

      <section class="card">
        <div class="card-head"><h2>現場照片 <span class="muted small" id="photoCount"></span></h2><span class="muted small">自動壓縮至 200KB 內</span></div>
        <div class="photo-grid" id="photoGrid"></div>
        <div class="btn-row">
          <button class="btn primary-soft" id="takePhoto">${ICON.camera} 拍照</button>
          <button class="btn ghost" id="pickPhoto">${ICON.image} 從相簿選</button>
        </div>
      </section>

      <div class="progress-wrap" id="progressWrap">
        <div class="progress-text"><span id="progText"></span><button class="link-btn" id="allOk">未檢項目全設為正常</button></div>
        <div class="progress"><i id="progBar"></i></div>
        <label class="autonext"><input type="checkbox" id="autoNext" ${LS.get('autoNext', true) ? 'checked' : ''}> 選完自動跳到下一項</label>
      </div>

      <ol class="checklist" id="checklist"></ol>

      <section class="card form">
        <label class="field"><span>巡檢總結 / 待辦</span><textarea id="i_summary" rows="3" placeholder="例：消防設備需補滅火器，已通知場地方">${esc(insp.summary || '')}</textarea></label>
      </section>

      ${insp._isNew ? '' : '<button class="btn text danger-text" id="delInsp">刪除這筆巡檢</button>'}

      <div class="savebar"><button class="btn primary block big" id="saveInsp">儲存巡檢<span class="sub" id="saveSub"></span></button></div>`;

    renderChecklist();
    renderPhotos();
    updateProgress();

    const markDirty = () => { state.dirty = true; saveDraft(); };
    $('#i_date').addEventListener('change', e => { insp.date = e.target.value; markDirty(); });
    $('#i_inspector').addEventListener('input', e => { insp.inspector = e.target.value; markDirty(); });
    $('#i_summary').addEventListener('input', e => { insp.summary = e.target.value; markDirty(); });
    $('#takePhoto').addEventListener('click', () => $('#photoCamera').click());
    $('#pickPhoto').addEventListener('click', () => $('#photoPick').click());
    $('#autoNext').addEventListener('change', e => LS.set('autoNext', e.target.checked));
    $('#allOk').addEventListener('click', () => {
      let n = 0; insp.items.forEach(it => { if (!it.status) { it.status = 'O'; n++; } });
      if (!n) { toast('沒有未檢的項目'); return; }
      renderChecklist(); updateProgress(); markDirty(); toast(N(`影分身之術！${n} 項一次設為正常`, `${n} 項設為正常`));
    });
    $('#saveInsp').addEventListener('click', saveInspection);
    $('#delInsp')?.addEventListener('click', async () => {
      if (await confirmSheet({ title: '刪除這筆巡檢？', message: `${fmtDate(insp.date)} 的紀錄與 ${insp.photos.length} 張照片會一起刪除，無法復原。`, ok: '刪除', danger: true })) {
        await Store.deleteInspection(insp.id); LS.del(state.draftKey); state.dirty = false; toast('已刪除');
        location.hash = '#/site/' + insp.siteId;
      }
    });
  }

  let draftTimer;
  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      if (!state.cur || !state.dirty) return;
      const { _isNew, ...data } = state.cur;
      LS.set(state.draftKey, { savedAt: Date.now(), data });
    }, 400);
  }

  const STATUS_BTNS = [['O', '正常'], ['X', '異常'], ['NA', '不適用']];

  function itemHTML(it, idx) {
    const open = it.status === 'X' || it.value || it.note || it._open;
    return `
      <li class="item s-${it.status || 'none'}" data-idx="${idx}">
        <div class="item-head">
          <span class="item-no num">${String(idx + 1).padStart(2, '0')}</span>
          <div class="item-text"><strong>${esc(it.name)}</strong><span>${esc(it.std)}</span></div>
        </div>
        <div class="seg" role="radiogroup" aria-label="${esc(it.name)} 狀態">
          ${STATUS_BTNS.map(([v, l]) => `<button type="button" role="radio" aria-checked="${it.status === v}" class="seg-${v}${it.status === v ? ' on' : ''}" data-v="${v}">${v === 'NA' ? '—' : v} <small>${l}</small></button>`).join('')}
        </div>
        ${open ? `
        <div class="item-fields">
          <input type="text" data-f="value" value="${esc(it.value)}" placeholder="數值 / 紀錄（例：接地 3.2Ω、電壓 221V）">
          <input type="text" data-f="note" value="${esc(it.note)}" placeholder="備註">
        </div>` : `<button type="button" class="link-btn add-note" data-open>＋ 數值 / 備註</button>`}
      </li>`;
  }
  function renderChecklist() {
    $('#checklist').innerHTML = state.cur.items.map(itemHTML).join('');
  }

  $('#app').addEventListener('click', e => {
    const li = e.target.closest('.item');
    if (!li || !state.cur) return;
    const it = state.cur.items[+li.dataset.idx];
    const btn = e.target.closest('.seg button');
    if (btn) {
      const v = btn.dataset.v;
      it.status = it.status === v ? '' : v;
      if (navigator.vibrate) try { navigator.vibrate(8); } catch { }
      rerenderItem(li, it);
      state.dirty = true; saveDraft(); updateProgress();
      if (it.status === 'X' && !it.value) setTimeout(() => $(`#checklist .item[data-idx="${li.dataset.idx}"] [data-f="value"]`)?.focus(), 30);
      else if (it.status && $('#autoNext')?.checked) scrollToNext(+li.dataset.idx);
    } else if (e.target.closest('[data-open]')) {
      it._open = true; const idx = li.dataset.idx; rerenderItem(li, it);
      $(`#checklist .item[data-idx="${idx}"] [data-f="value"]`)?.focus();
    }
  });
  $('#app').addEventListener('input', e => {
    const f = e.target.dataset.f; const li = e.target.closest('.item');
    if (!f || !li || !state.cur) return;
    state.cur.items[+li.dataset.idx][f] = e.target.value;
    state.dirty = true; saveDraft();
  });
  function rerenderItem(li, it) {
    li.outerHTML = itemHTML(it, +li.dataset.idx);
  }

  /* 選完正常 / 不適用後，捲到下一個未檢項目；異常項目留在原地填說明 */
  let nextTimer;
  function scrollToNext(idx) {
    clearTimeout(nextTimer);
    nextTimer = setTimeout(() => {
      const items = state.cur?.items; if (!items) return;
      let target = items.findIndex((x, i) => i > idx && !x.status);
      if (target < 0) target = items.findIndex(x => !x.status);
      const el = target >= 0 ? $(`#checklist .item[data-idx="${target}"]`) : $('#i_summary')?.closest('.card');
      if (!el) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    }, 220);
  }

  function updateProgress() {
    const items = state.cur.items;
    const done = items.filter(i => i.status).length;
    const bad = items.filter(i => i.status === 'X').length;
    $('#progText').innerHTML = `已檢 <b class="num">${done}</b> / ${items.length}${bad ? ` · <span class="bad-text">異常 ${bad}</span>` : ''}`;
    $('#progBar').style.width = (items.length ? done / items.length * 100 : 0) + '%';
    const sub = $('#saveSub'); if (sub) sub.textContent = done === items.length ? '（已完成）' : `（${done}/${items.length}）`;
    $('#progressWrap').classList.toggle('complete', done === items.length);
  }

  async function saveInspection() {
    const insp = state.cur;
    if (!insp.date) { toast('請選巡檢日期', 'bad'); $('#i_date').focus(); return; }
    if (!insp.inspector.trim()) { toast('請填巡檢人員', 'bad'); $('#i_inspector').focus(); return; }
    const unchecked = insp.items.filter(i => !i.status).length;
    if (unchecked && !(await confirmSheet({ title: `還有 ${unchecked} 項未檢`, message: '可以先存起來，之後再打開這筆補填。', ok: '仍要儲存' }))) return;
    const missingNote = insp.items.filter(i => i.status === 'X' && !i.value && !i.note);
    if (missingNote.length && !(await confirmSheet({ title: '異常項目沒有說明', message: `「${missingNote.map(i => i.name).join('、')}」標為異常但沒填紀錄或備註，後續追蹤會比較難。`, ok: '仍要儲存' }))) return;
    const { _isNew, ...rec } = insp;
    rec.items = rec.items.map(({ _open, ...x }) => x);
    rec.inspector = rec.inspector.trim();
    rec.updatedAt = Date.now();
    await Store.put('inspections', rec);
    LS.set('inspector', rec.inspector);
    clearTimeout(draftTimer);
    LS.del(state.draftKey);
    for (const pid of state.pendingPhotoDeletes || []) await Store.del('photos', pid);
    state.pendingPhotoDeletes = [];
    state.dirty = false;
    toast(N(unchecked ? '任務暫存，之後再補完' : '任務完成！巡檢已儲存', '巡檢已儲存'), 'ok');
    location.hash = '#/site/' + rec.siteId;
  }

  /* ---------- 照片 ---------- */
  async function photoUrl(id) {
    if (state.photoUrls.has(id)) return state.photoUrls.get(id);
    const rec = await Store.get('photos', id);
    if (!rec) return '';
    const url = URL.createObjectURL(rec.blob);
    state.photoUrls.set(id, url);
    return url;
  }

  async function renderPhotos() {
    const insp = state.cur;
    const grid = $('#photoGrid');
    $('#photoCount').textContent = insp.photos.length ? `${insp.photos.length} 張` : '';
    if (!insp.photos.length) { grid.innerHTML = '<p class="muted small photo-empty">尚無照片。拍下設備銘牌、配電箱內部與異常處。</p>'; return; }
    const urls = await Promise.all(insp.photos.map(p => photoUrl(p.id)));
    grid.innerHTML = insp.photos.map((p, i) => `
      <figure class="photo" data-i="${i}">
        <button type="button" class="photo-img" data-view aria-label="放大照片"><img src="${urls[i]}" alt="${esc(p.caption || '現場照片')}" loading="lazy"></button>
        <button type="button" class="photo-del" data-del aria-label="刪除照片">×</button>
        <input type="text" data-cap value="${esc(p.caption)}" placeholder="照片說明">
      </figure>`).join('');
  }

  $('#app').addEventListener('click', async e => {
    const fig = e.target.closest('.photo'); if (!fig || !state.cur) return;
    const i = +fig.dataset.i; const p = state.cur.photos[i];
    if (e.target.closest('[data-del]')) {
      if (await confirmSheet({ title: '刪除這張照片？', ok: '刪除', danger: true })) {
        state.cur.photos.splice(i, 1);
        if (!state.cur._isNew) {
          // 已存的巡檢：照片先從清單移除，按「儲存巡檢」後才真正刪檔
          state.pendingPhotoDeletes = (state.pendingPhotoDeletes || []).concat(p.id);
        } else await Store.del('photos', p.id);
        state.dirty = true; saveDraft(); renderPhotos();
      }
    } else if (e.target.closest('[data-view]')) {
      const url = await photoUrl(p.id);
      openSheet(`<img class="photo-full" src="${url}" alt="${esc(p.caption || '現場照片')}"><p class="sheet-msg">${esc(p.caption || '（無說明）')}</p><div class="sheet-actions"><button class="btn ghost" data-close>關閉</button></div>`,
        sh => $('[data-close]', sh).addEventListener('click', closeSheet));
    }
  });
  $('#app').addEventListener('input', e => {
    if (!e.target.matches('[data-cap]') || !state.cur) return;
    state.cur.photos[+e.target.closest('.photo').dataset.i].caption = e.target.value;
    state.dirty = true; saveDraft();
  });

  async function compressImage(file, maxBytes = 200 * 1024) {
    const bmp = await loadImage(file);
    let maxSide = 1600, quality = 0.82, blob;
    for (let round = 0; round < 8; round++) {
      const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      blob = await new Promise(r => c.toBlob(r, 'image/jpeg', quality));
      if (blob.size <= maxBytes) break;
      if (quality > 0.55) quality -= 0.1; else maxSide = Math.round(maxSide * 0.8);
    }
    return blob;
  }
  function loadImage(file) {
    if (window.createImageBitmap) return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => viaImg(file));
    return viaImg(file);
  }
  function viaImg(file) {
    return new Promise((res, rej) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('讀不到這張圖片')); };
      img.src = url;
    });
  }

  async function addFiles(files) {
    if (!state.cur || !files.length) return;
    toast(`處理 ${files.length} 張照片…`);
    let ok = 0;
    for (const f of files) {
      try {
        const blob = await compressImage(f);
        const id = Store.uid();
        await Store.put('photos', { id, blob });
        state.cur.photos.push({ id, caption: '' });
        ok++;
      } catch (e) { console.error(e); toast(e.message || '照片處理失敗', 'bad'); }
    }
    state.dirty = true; saveDraft(); renderPhotos();
    if (ok) toast(N(`情報收集完成，${ok} 張照片`, `已加入 ${ok} 張照片`), 'ok');
  }
  ['#photoCamera', '#photoPick'].forEach(sel => $(sel).addEventListener('change', e => { addFiles([...e.target.files]); e.target.value = ''; }));

  /* ---------- 巡檢項目設定 ---------- */
  async function viewChecklist() {
    setTop({ eyebrow: '設定', title: '巡檢項目', back: true });
    let items = (await Store.checklist()).map(x => ({ ...x }));
    const draw = () => {
      $('#clList').innerHTML = items.map((it, i) => `
        <li class="cl-row" data-i="${i}">
          <span class="item-no num">${String(i + 1).padStart(2, '0')}</span>
          <div class="cl-fields">
            <input type="text" data-k="name" value="${esc(it.name)}" placeholder="檢查項目">
            <input type="text" data-k="std" value="${esc(it.std)}" placeholder="標準與說明">
          </div>
          <div class="cl-ops">
            <button type="button" class="icon-btn sm" data-op="up" aria-label="上移" ${i ? '' : 'disabled'}>↑</button>
            <button type="button" class="icon-btn sm" data-op="down" aria-label="下移" ${i < items.length - 1 ? '' : 'disabled'}>↓</button>
            <button type="button" class="icon-btn sm danger-text" data-op="del" aria-label="刪除">×</button>
          </div>
        </li>`).join('');
    };
    app.innerHTML = `
      <p class="note">修改只影響之後的新巡檢；已存的紀錄保留當時的項目。</p>
      <ol class="cl-list" id="clList"></ol>
      <div class="btn-row">
        <button class="btn ghost" id="clAdd">＋ 新增項目</button>
        <button class="btn ghost" id="clReset">恢復預設 17 項</button>
      </div>
      <div class="savebar"><button class="btn primary block big" id="clSave">儲存巡檢項目</button></div>`;
    draw();
    $('#clList').addEventListener('input', e => { const k = e.target.dataset.k; if (k) items[+e.target.closest('.cl-row').dataset.i][k] = e.target.value; });
    $('#clList').addEventListener('click', e => {
      const op = e.target.closest('[data-op]')?.dataset.op; if (!op) return;
      const i = +e.target.closest('.cl-row').dataset.i;
      if (op === 'up') [items[i - 1], items[i]] = [items[i], items[i - 1]];
      if (op === 'down') [items[i + 1], items[i]] = [items[i], items[i + 1]];
      if (op === 'del') items.splice(i, 1);
      draw();
    });
    $('#clAdd').addEventListener('click', () => { items.push({ id: 'c' + Store.uid(), name: '', std: '' }); draw(); $$('#clList input[data-k="name"]').pop()?.focus(); });
    $('#clReset').addEventListener('click', async () => {
      if (await confirmSheet({ title: '恢復預設項目？', message: '目前的自訂項目會被預設 17 項取代（按儲存後生效）。', ok: '恢復' })) { items = Store.DEFAULT_CHECKLIST.map(x => ({ ...x })); draw(); }
    });
    $('#clSave').addEventListener('click', async () => {
      const clean = items.map(x => ({ ...x, name: x.name.trim(), std: x.std.trim() })).filter(x => x.name);
      if (!clean.length) { toast('至少要有一個項目', 'bad'); return; }
      await Store.setMeta('checklist', clean); toast('巡檢項目已儲存', 'ok'); location.hash = '#/';
    });
  }

  /* ---------- 選單 ---------- */
  $('#menuBtn').addEventListener('click', () => {
    openSheet(`
      <h2 class="sheet-title">選單</h2>
      <div class="menu">
        <button data-m="allZip"><span class="mi">${ICON.zip}</span><span class="mt"><b>匯出全站壓縮檔</b><span>每站一個 Excel（含照片）＋全站總表</span></span></button>
        <button data-m="all"><span class="mi">${ICON.excel}</span><span class="mt"><b>匯出全站 Excel（含照片）</b><span>總覽、待改善異常、明細，加上每站最近一次巡檢</span></span></button>
        <button data-m="allLite"><span class="mi">${ICON.excel}</span><span class="mt"><b>匯出全站 Excel（不含照片）</b><span>只有三張總表，檔案小、傳得快</span></span></button>
        <div class="menu-sep"></div>
        <button data-m="checklist"><span class="mi">${ICON.list}</span><span class="mt"><b>編輯巡檢項目</b><span>新增、刪除、調整順序</span></span></button>
        <div class="menu-sep"></div>
        <button data-m="backup"><span class="mi">${ICON.down}</span><span class="mt"><b>下載備份（JSON）</b><span>含照片。換手機或換瀏覽器前先備份</span></span></button>
        <button data-m="restore"><span class="mi">${ICON.up}</span><span class="mt"><b>還原備份</b><span>從備份檔匯入資料</span></span></button>
      </div>
      <div class="skin-row"><span>外觀</span><span class="seg2">${[['cyber', '科幻忍村'], ['ninja', '忍者村'], ['plain', '標準']].map(([k, l]) => `<button type="button" data-skin="${k}" class="${document.documentElement.dataset.skin === k ? 'on' : ''}">${l}</button>`).join('')}</span></div>
      <p class="small muted center">資料儲存在本機瀏覽器，不會上傳到任何伺服器。</p>`, sh => {
      $$('[data-skin]', sh).forEach(b => b.addEventListener('click', () => { applySkin(b.dataset.skin); $$('[data-skin]', sh).forEach(x => x.classList.toggle('on', x === b)); toast({ cyber: '系統已切換：科幻忍村', ninja: '切換為忍者村風格', plain: '切換為標準外觀' }[b.dataset.skin]); }));
      $$('[data-m]', sh).forEach(b => b.addEventListener('click', async () => {
        const m = b.dataset.m; closeSheet();
        if (m === 'all') runExport(() => Exporter.all({ withPhotos: true }));
        if (m === 'allZip') runExport(() => Exporter.allZip((i, n) => toast(`產生中 ${i} / ${n} 站…`)));
        if (m === 'allLite') runExport(() => Exporter.all({ withPhotos: false }));
        if (m === 'checklist') go('#/checklist');
        if (m === 'backup') runExport(() => Exporter.backup());
        if (m === 'restore') $('#importFile').click();
      }));
    });
  });

  $('#importFile').addEventListener('change', async e => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch { toast('檔案不是有效的 JSON', 'bad'); return; }
    if (data.app !== 'acon-inspection') { toast('這不是巡檢系統的備份檔', 'bad'); return; }
    const n = (data.sites || []).length, m = (data.inspections || []).length;
    openSheet(`
      <h2 class="sheet-title">還原備份</h2>
      <p class="sheet-msg">備份內有 ${n} 個站點、${m} 筆巡檢（${esc((data.exportedAt || '').slice(0, 10))}）。</p>
      <div class="menu">
        <button data-mode="merge"><b>合併</b><span>保留這支手機現有資料，同 ID 的資料以備份覆蓋</span></button>
        <button data-mode="replace" class="danger-text"><b>全部取代</b><span>先清空這支手機的資料再匯入</span></button>
      </div>
      <div class="sheet-actions"><button class="btn ghost" data-close>取消</button></div>`, sh => {
      $('[data-close]', sh).addEventListener('click', closeSheet);
      $$('[data-mode]', sh).forEach(b => b.addEventListener('click', async () => {
        closeSheet();
        try { await Store.importBackup(data, b.dataset.mode); toast('已還原備份', 'ok'); location.hash = '#/'; render(); }
        catch (err) { toast(err.message || '還原失敗', 'bad'); }
      }));
    });
  });

  window.addEventListener('beforeunload', e => { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- 啟動 ---------- */
  (async function start() {
    applySkin(LS.get('skin', 'cyber'));
    try { await Store.removeSampleOnce(); } catch (e) { console.error(e); }
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => { });
    render();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
  })();
})();
