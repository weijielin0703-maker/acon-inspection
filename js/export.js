/* 匯出：Excel（單站 / 全站，含照片）、照片相簿 ZIP、JSON 備份 */
(function () {
  const STATUS_TEXT = { O: 'O 正常', X: 'X 異常', NA: '— 不適用', '': '未檢' };
  const COLOR = { head: 'FF0F5D73', headInk: 'FFFFFFFF', bad: 'FFFBE3E0', badInk: 'FFC0362C', ok: 'FF1D7F47', line: 'FFD6E0E3', soft: 'FFF2F6F7' };
  const PHOTO_W = 330;          // 照片在 Excel 中的寬度（px）
  const ROW_PX = 20;            // 預設列高 15pt ≈ 20px

  const latestOf = list => list.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt)[0];
  const abnormal = insp => (insp?.items || []).filter(i => i.status === 'X');
  const safe = s => String(s || '').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40);
  const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const thin = { style: 'thin', color: { argb: COLOR.line } };
  const box = { top: thin, left: thin, bottom: thin, right: thin };

  function sheetName(wb, name) {
    let base = String(name).replace(/[\\/?*[\]:]/g, '-').slice(0, 28) || '工作表';
    let n = base, i = 2;
    while (wb.getWorksheet(n)) n = base.slice(0, 26) + '-' + i++;
    return n;
  }
  function headerRow(row) {
    row.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.head } };
      c.font = { bold: true, color: { argb: COLOR.headInk } };
      c.alignment = { vertical: 'middle', wrapText: true };
      c.border = box;
    });
    row.height = 22;
  }
  function bodyRow(row, bad) {
    row.eachCell({ includeEmpty: true }, c => {
      c.border = box;
      c.alignment = { vertical: 'top', wrapText: true };
      if (bad) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.bad } };
    });
  }
  /* 依欄寬估算換行數並設定固定列高，讓照片位置在各種檢視器都一致 */
  const textWidth = t => [...String(t ?? '')].reduce((n, ch) => n + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0);
  function fitHeight(ws, row) {
    let lines = 1;
    row.eachCell((c, col) => {
      const w = (ws.getColumn(col).width || 10) - 0.5;
      String(c.value ?? '').split('\n').forEach(part => { lines = Math.max(lines, Math.ceil(textWidth(part) / w) || 1); });
    });
    row.height = Math.max(18, lines * 15 + 3);
  }
  function table(ws, header, rows, isBad) {
    headerRow(ws.addRow(header));
    rows.forEach(r => { const row = ws.addRow(r); bodyRow(row, isBad && isBad(r)); fitHeight(ws, row); });
  }

  async function imageSize(blob) {
    try {
      const bmp = await createImageBitmap(blob);
      const s = { w: bmp.width, h: bmp.height }; bmp.close && bmp.close(); return s;
    } catch { return { w: 4, h: 3 }; }
  }

  /* 把照片排成兩欄放在工作表下方，每張下面附說明 */
  async function addPhotos(wb, ws, photos, anchors) {
    if (!photos.length) return;
    ws.addRow([]).height = 18;
    const title = ws.addRow(['', '現場照片', `${photos.length} 張`]);
    title.getCell(2).font = { bold: true, size: 12 };
    title.height = 22;
    let row = title.number + 2;          // 1-based：標題下空一列再放照片
    for (let i = 0; i < photos.length; i += 2) {
      let tallest = 0;
      for (let k = 0; k < 2 && i + k < photos.length; k++) {
        const p = photos[i + k];
        const rec = await Store.get('photos', p.id);
        if (!rec) continue;
        const { w, h } = await imageSize(rec.blob);
        const height = Math.round(PHOTO_W * h / w);
        const buf = await rec.blob.arrayBuffer();
        const id = wb.addImage({ buffer: buf, extension: 'jpeg' });
        ws.addImage(id, { tl: { col: anchors[k], row: row - 1 }, ext: { width: PHOTO_W, height } });
        tallest = Math.max(tallest, height);
        const capRow = row + Math.ceil(height / ROW_PX);
        const cap = ws.getCell(capRow, anchors[k] + 1);
        cap.value = `${i + k + 1}. ${p.caption || '（無說明）'}`;
        cap.font = { color: { argb: 'FF5B6D74' } };
      }
      const used = Math.ceil(tallest / ROW_PX) + 2;
      for (let r = row; r < row + used; r++) ws.getRow(r).height = 15;   // 15pt = 20px，與 ROW_PX 對應
      row += used;
    }
    // 讓後續 addRow 接在照片之後
    ws.getCell(row, 1).value = '';
  }

  async function addInspectionSheet(wb, site, insp, label) {
    const ws = wb.addWorksheet(sheetName(wb, label || insp.date || '未填日期'));
    ws.columns = [5, 18, 34, 12, 20, 24].map(w => ({ width: w }));
    const t = ws.addRow([`${site.name}　巡檢表`]);
    t.getCell(1).font = { bold: true, size: 14 };
    ws.mergeCells(t.number, 1, t.number, 6);
    const info = [
      ['巡檢日期', insp.date || '', '巡檢人員', insp.inspector || ''],
      ['站點地址', site.address || ''],
      ['電力容量', site.power || '', '設備規格', site.equipment || ''],
      ['纜線規格', site.cable || ''],
    ];
    info.forEach(r => {
      const row = ws.addRow(['', r[0], r[1], r[2] || '', r[3] || '']);
      row.getCell(2).font = { bold: true, color: { argb: 'FF5B6D74' } };
      row.getCell(4).font = { bold: true, color: { argb: 'FF5B6D74' } };
      if (r.length === 2) ws.mergeCells(row.number, 3, row.number, 6);
    });
    ws.addRow([]);
    table(ws, ['#', '檢查項目', '標準與說明', '狀態', '數值 / 紀錄', '備註'],
      insp.items.map((it, i) => [i + 1, it.name, it.std, STATUS_TEXT[it.status || ''], it.value || '', it.note || '']),
      r => r[3] === STATUS_TEXT.X);
    ws.eachRow(r => { const c = r.getCell(4); if (c.value === STATUS_TEXT.X) c.font = { bold: true, color: { argb: COLOR.badInk } }; else if (c.value === STATUS_TEXT.O) c.font = { color: { argb: COLOR.ok } }; });
    ws.addRow([]);
    const sum = ws.addRow(['', '異常項目數', abnormal(insp).length, '照片張數', (insp.photos || []).length]);
    sum.getCell(2).font = sum.getCell(4).font = { bold: true };
    if (insp.summary) {
      const r = ws.addRow(['', '巡檢總結', insp.summary]);
      r.getCell(2).font = { bold: true };
      ws.mergeCells(r.number, 3, r.number, 6);
      r.getCell(3).alignment = { wrapText: true, vertical: 'top' };
    }
    ws.eachRow({ includeEmpty: true }, r => { if (!r.height) r.height = 18; });
    ws.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    // 照片：B 欄、D 欄起各一張
    await addPhotos(wb, ws, insp.photos || [], [1, 3]);
    return ws;
  }

  async function siteWorkbook(siteId) {
    const site = await Store.get('sites', siteId);
    const list = (await Store.bySite(siteId)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const wb = new ExcelJS.Workbook();
    wb.creator = '連展電能 巡檢';
    for (const insp of list) await addInspectionSheet(wb, site, insp);
    if (list.length > 1) {
      const ws = wb.addWorksheet('歷次對照');
      const dates = list.map(i => i.date);
      ws.columns = [{ width: 18 }, ...dates.map(() => ({ width: 16 }))];
      const names = [...new Set(list.flatMap(i => i.items.map(x => x.name)))];
      table(ws, ['檢查項目', ...dates], names.map(n => [n, ...list.map(i => {
        const it = i.items.find(x => x.name === n);
        return it ? (it.status === 'NA' ? '—' : it.status || '') + (it.value ? ' ' + it.value : '') : '';
      })]));
      ws.eachRow((r, i) => { if (i > 1) r.eachCell((c, col) => { if (col > 1 && String(c.value).startsWith('X')) { c.font = { bold: true, color: { argb: COLOR.badInk } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.bad } }; } }); });
    }
    if (!list.length) wb.addWorksheet('尚無巡檢').addRow([site.name, '尚無巡檢紀錄']);
    return { wb, filename: `巡檢_${safe(site.name)}_${today()}.xlsx` };
  }

  async function allWorkbook({ withPhotos }) {
    const [sites, inspections] = await Promise.all([Store.all('sites'), Store.all('inspections')]);
    const byId = Object.fromEntries(sites.map(s => [s.id, s]));
    const wb = new ExcelJS.Workbook();
    wb.creator = '連展電能 巡檢';
    sites.sort((a, b) => a.name.localeCompare(b.name));

    const ov = wb.addWorksheet('站點總覽');
    ov.columns = [16, 34, 10, 16, 16, 12, 10, 8, 30, 8].map(w => ({ width: w }));
    const issues = [];
    table(ov, ['站點', '地址', '電力容量', '設備規格及數量', '電力及纜線規格', '最近巡檢日', '巡檢人員', '異常數', '異常項目', '巡檢次數'],
      sites.map(s => {
        const list = inspections.filter(i => i.siteId === s.id);
        const last = latestOf(list);
        const ab = abnormal(last);
        ab.forEach(x => issues.push([s.name, last.date, last.inspector || '', x.name, x.value || '', x.note || '']));
        return [s.name, s.address || '', s.power || '', s.equipment || '', s.cable || '', last?.date || '未巡檢', last?.inspector || '', last ? ab.length : '', ab.map(x => x.name).join('、'), list.length];
      }), r => r[7] > 0);
    ov.views = [{ state: 'frozen', ySplit: 1 }];

    const is = wb.addWorksheet('待改善異常');
    is.columns = [16, 12, 10, 18, 20, 24].map(w => ({ width: w }));
    table(is, ['站點', '巡檢日期', '巡檢人員', '異常項目', '數值 / 紀錄', '備註'], issues);
    is.views = [{ state: 'frozen', ySplit: 1 }];

    const dt = wb.addWorksheet('全部明細');
    dt.columns = [16, 12, 10, 18, 34, 10, 20, 24].map(w => ({ width: w }));
    const rows = [];
    inspections.slice().sort((a, b) => (byId[a.siteId]?.name || '').localeCompare(byId[b.siteId]?.name || '') || (b.date || '').localeCompare(a.date || ''))
      .forEach(insp => insp.items.forEach(it => rows.push([byId[insp.siteId]?.name || '(已刪除站點)', insp.date, insp.inspector || '', it.name, it.std, STATUS_TEXT[it.status || ''], it.value || '', it.note || ''])));
    table(dt, ['站點', '巡檢日期', '巡檢人員', '檢查項目', '標準與說明', '狀態', '數值 / 紀錄', '備註'], rows, r => r[5] === STATUS_TEXT.X);
    dt.views = [{ state: 'frozen', ySplit: 1 }];

    // 每站最近一次巡檢各一張工作表（含照片）
    if (withPhotos) {
      for (const s of sites) {
        const last = latestOf(inspections.filter(i => i.siteId === s.id));
        if (last) await addInspectionSheet(wb, s, last, s.name);
      }
    }
    return { wb, filename: `巡檢_全站_${today()}.xlsx` };
  }

  async function wbBlob(wb) {
    const buf = await wb.xlsx.writeBuffer();
    return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
    async site(siteId) { const { wb, filename } = await siteWorkbook(siteId); return deliver(await wbBlob(wb), filename); },
    async all(opts = { withPhotos: true }) { const { wb, filename } = await allWorkbook(opts); return deliver(await wbBlob(wb), filename); },
    async album(siteId) { const { blob, filename } = await albumZip(siteId); return deliver(blob, filename); },
    async backup() {
      const data = await Store.exportBackup();
      return deliver(new Blob([JSON.stringify(data)], { type: 'application/json' }), `巡檢備份_${today()}.json`);
    },
  };
})();
