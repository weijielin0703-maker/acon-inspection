/* 匯出：Excel（單站 / 全站）、照片相簿 ZIP、JSON 備份 */
(function () {
  const STATUS_TEXT = { O: 'O 正常', X: 'X 異常', NA: '— 不適用', '': '未檢' };

  const latestOf = list => list.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt)[0];
  const abnormal = insp => (insp?.items || []).filter(i => i.status === 'X');
  const safe = s => String(s || '').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40);
  const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

  function sheet(rows, widths) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    if (widths) ws['!cols'] = widths.map(w => ({ wch: w }));
    return ws;
  }

  function siteInfoRows(site) {
    return [
      ['站點名稱', site.name], ['站點地址', site.address || ''], ['現場電力容量', site.power || ''],
      ['設備規格及數量', site.equipment || ''], ['電力及纜線規格', site.cable || ''], ['備註', site.note || ''],
    ];
  }

  function inspectionRows(site, insp) {
    const rows = [['站點', site.name, '巡檢日期', insp.date, '巡檢人員', insp.inspector || ''],
      [],
      ['#', '檢查項目', '標準與說明', '狀態 (O/X)', '數值 / 紀錄', '備註']];
    insp.items.forEach((it, i) => rows.push([i + 1, it.name, it.std, STATUS_TEXT[it.status || ''], it.value || '', it.note || '']));
    rows.push([]);
    rows.push(['異常項目數', abnormal(insp).length, '照片張數', (insp.photos || []).length]);
    if (insp.summary) rows.push(['總結', insp.summary]);
    return rows;
  }

  function detailRows(sitesById, inspections) {
    const rows = [['站點', '巡檢日期', '巡檢人員', '檢查項目', '標準與說明', '狀態', '數值 / 紀錄', '備註']];
    inspections.slice().sort((a, b) => (sitesById[a.siteId]?.name || '').localeCompare(sitesById[b.siteId]?.name || '') || (b.date || '').localeCompare(a.date || ''))
      .forEach(insp => insp.items.forEach(it => rows.push([
        sitesById[insp.siteId]?.name || '(已刪除站點)', insp.date, insp.inspector || '', it.name, it.std,
        STATUS_TEXT[it.status || ''], it.value || '', it.note || '',
      ])));
    return rows;
  }

  async function siteWorkbook(siteId) {
    const site = await Store.get('sites', siteId);
    const list = (await Store.bySite(siteId)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet(siteInfoRows(site), [16, 50]), '站點資料');
    const used = new Set();
    list.forEach(insp => {
      let name = (insp.date || '未填日期').slice(0, 28);
      let n = 2; while (used.has(name)) name = (insp.date || '未填日期') + '-' + n++;
      used.add(name);
      XLSX.utils.book_append_sheet(wb, sheet(inspectionRows(site, insp), [5, 18, 34, 12, 20, 24]), name);
    });
    if (list.length > 1) {
      // 歷次狀態對照：列 = 項目，欄 = 日期
      const dates = list.map(i => i.date);
      const names = [...new Set(list.flatMap(i => i.items.map(x => x.name)))];
      const rows = [['檢查項目', ...dates]];
      names.forEach(n => rows.push([n, ...list.map(i => {
        const it = i.items.find(x => x.name === n);
        return it ? (it.status || '') + (it.value ? ' ' + it.value : '') : '';
      })]));
      XLSX.utils.book_append_sheet(wb, sheet(rows, [18, ...dates.map(() => 14)]), '歷次對照');
    }
    return { wb, filename: `巡檢_${safe(site.name)}_${today()}.xlsx` };
  }

  async function allWorkbook() {
    const [sites, inspections] = await Promise.all([Store.all('sites'), Store.all('inspections')]);
    const byId = Object.fromEntries(sites.map(s => [s.id, s]));
    const wb = XLSX.utils.book_new();

    const overview = [['站點', '地址', '電力容量', '設備規格及數量', '電力及纜線規格', '最近巡檢日', '巡檢人員', '異常數', '異常項目', '巡檢次數']];
    const issues = [['站點', '巡檢日期', '巡檢人員', '異常項目', '數值 / 紀錄', '備註']];
    sites.sort((a, b) => a.name.localeCompare(b.name)).forEach(s => {
      const list = inspections.filter(i => i.siteId === s.id);
      const last = latestOf(list);
      const ab = abnormal(last);
      overview.push([s.name, s.address || '', s.power || '', s.equipment || '', s.cable || '',
        last?.date || '未巡檢', last?.inspector || '', last ? ab.length : '', ab.map(x => x.name).join('、'), list.length]);
      ab.forEach(x => issues.push([s.name, last.date, last.inspector || '', x.name, x.value || '', x.note || '']));
    });
    XLSX.utils.book_append_sheet(wb, sheet(overview, [16, 34, 10, 16, 16, 12, 10, 8, 30, 8]), '站點總覽');
    XLSX.utils.book_append_sheet(wb, sheet(issues, [16, 12, 10, 18, 20, 24]), '待改善異常');
    XLSX.utils.book_append_sheet(wb, sheet(detailRows(byId, inspections), [16, 12, 10, 18, 34, 10, 20, 24]), '全部明細');
    return { wb, filename: `巡檢_全站_${today()}.xlsx` };
  }

  function wbBlob(wb) {
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  async function albumZip(siteId) {
    const site = await Store.get('sites', siteId);
    const list = await Store.bySite(siteId);
    const zip = new JSZip();
    let count = 0;
    for (const insp of list) {
      const folder = zip.folder(insp.date || '未填日期');
      let n = 1;
      for (const p of insp.photos || []) {
        const rec = await Store.get('photos', p.id);
        if (!rec) continue;
        folder.file(`${String(n++).padStart(2, '0')}_${safe(p.caption) || '照片'}.jpg`, rec.blob);
        count++;
      }
    }
    if (!count) throw new Error('此站點還沒有照片');
    const blob = await zip.generateAsync({ type: 'blob' });
    return { blob, filename: `相簿_${safe(site.name)}_${today()}.zip` };
  }

  /* 手機優先用系統分享（可直接傳 LINE / 存到檔案），不支援時改下載 */
  async function deliver(blob, filename) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: filename }); return 'shared'; }
      catch (e) { if (e.name === 'AbortError') return 'cancelled'; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'downloaded';
  }

  window.Exporter = {
    STATUS_TEXT, latestOf, abnormal,
    async site(siteId) { const { wb, filename } = await siteWorkbook(siteId); return deliver(wbBlob(wb), filename); },
    async all() { const { wb, filename } = await allWorkbook(); return deliver(wbBlob(wb), filename); },
    async album(siteId) { const { blob, filename } = await albumZip(siteId); return deliver(blob, filename); },
    async backup() {
      const data = await Store.exportBackup();
      return deliver(new Blob([JSON.stringify(data)], { type: 'application/json' }), `巡檢備份_${today()}.json`);
    },
  };
})();
