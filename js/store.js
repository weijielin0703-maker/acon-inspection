/* 本機資料庫（IndexedDB）：站點、巡檢紀錄、照片、設定 */
(function () {
  const DB_NAME = 'acon-inspection';
  const DB_VER = 1;

  const DEFAULT_CHECKLIST = [
    ['供電容量', '請電、借電容量是否足夠'],
    ['充電樁外觀', '外殼無破損、鏽蝕、變形，標示完整'],
    ['充電槍 / 插頭', '無破損、燒焦、變形；插接正常'],
    ['充電線纜', '無龜裂、破皮、異常發熱或拉扯'],
    ['急停開關', '外觀正常，功能測試正常'],
    ['漏電 / 過電流保護', '保護裝置無異常跳脫，測試正常'],
    ['配電箱', '箱體、門鎖及內部元件正常，無異味'],
    ['斷路器及端子', '無鬆動、過熱、變色或燒焦'],
    ['接地系統', '接地線完整，接地端子無鬆脫'],
    ['電纜 / 管路', '管線固定良好，無破損、積水或裸露'],
    ['網路通訊', '4G / 網路連線正常，後台可連線'],
    ['OCPP / 後台', '充電樁狀態及交易資料可正常回傳'],
    ['顯示器 / 指示燈', '畫面、指示燈及操作介面正常'],
    ['攝影機 / 辨識設備', '影像清晰，車牌辨識及錄影正常'],
    ['消防 / 安全設備', '是否有設置滅火器'],
    ['環境清潔', '設備周邊無積水、垃圾及妨礙操作物品'],
    ['充電功能測試', '實際啟動充電，停止充電功能正常'],
  ].map(([name, std], i) => ({ id: 'c' + String(i + 1).padStart(2, '0'), name, std }));

  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('sites')) db.createObjectStore('sites', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('inspections')) {
          const s = db.createObjectStore('inspections', { keyPath: 'id' });
          s.createIndex('siteId', 'siteId');
        }
        if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }

  function tx(store, mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let result;
      Promise.resolve(fn(s)).then(r => { result = r; });
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }));
  }
  const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const Store = {
    uid,
    DEFAULT_CHECKLIST,
    all: store => tx(store, 'readonly', s => reqP(s.getAll())),
    get: (store, id) => tx(store, 'readonly', s => reqP(s.get(id))),
    put: (store, obj) => tx(store, 'readwrite', s => { s.put(obj); return obj; }),
    del: (store, id) => tx(store, 'readwrite', s => { s.delete(id); }),
    clear: store => tx(store, 'readwrite', s => { s.clear(); }),
    bySite: siteId => tx('inspections', 'readonly', s => reqP(s.index('siteId').getAll(siteId))),

    async getMeta(key, fallback) {
      const r = await Store.get('meta', key);
      return r ? r.value : fallback;
    },
    setMeta: (key, value) => Store.put('meta', { key, value }),

    async checklist() {
      const c = await Store.getMeta('checklist', null);
      return c && c.length ? c : DEFAULT_CHECKLIST.map(x => ({ ...x }));
    },

    async deleteInspection(id) {
      const insp = await Store.get('inspections', id);
      if (insp) for (const p of insp.photos || []) await Store.del('photos', p.id);
      await Store.del('inspections', id);
    },
    async deleteSite(id) {
      const list = await Store.bySite(id);
      for (const i of list) await Store.deleteInspection(i.id);
      await Store.del('sites', id);
    },

    /* 首次開啟：放入現有系統中的汐止同興資料，方便上手 */
    async seedIfFirstRun() {
      if (await Store.getMeta('seeded', false)) return;
      const sites = await Store.all('sites');
      if (!sites.length) {
        const siteId = uid();
        await Store.put('sites', {
          id: siteId, name: '汐止同興', address: '新北市汐止區大同路一段339-2號旁空地',
          power: '40A', equipment: 'AC 7KW*1', cable: 'XLPE 1.31mm', note: '',
          createdAt: Date.now(), updatedAt: Date.now(),
        });
        const items = DEFAULT_CHECKLIST.map(c => ({
          ...c, status: c.name === '消防 / 安全設備' ? 'X' : 'O',
          value: c.name === '消防 / 安全設備' ? '無滅火器' : '', note: '',
        }));
        await Store.put('inspections', {
          id: uid(), siteId, date: '2026-10-15', inspector: 'jay', items, photos: [],
          summary: '', createdAt: Date.now(), updatedAt: Date.now(),
        });
      }
      await Store.setMeta('seeded', true);
    },

    /* 完整備份（含照片 base64） */
    async exportBackup() {
      const [sites, inspections, photos, checklist] = await Promise.all([
        Store.all('sites'), Store.all('inspections'), Store.all('photos'), Store.checklist(),
      ]);
      const photoData = [];
      for (const p of photos) photoData.push({ id: p.id, type: p.blob.type, data: await blobToBase64(p.blob) });
      return { app: 'acon-inspection', version: 1, exportedAt: new Date().toISOString(), checklist, sites, inspections, photos: photoData };
    },
    async importBackup(data, mode) {
      if (!data || data.app !== 'acon-inspection') throw new Error('這不是巡檢系統的備份檔');
      if (mode === 'replace') {
        await Promise.all(['sites', 'inspections', 'photos'].map(Store.clear));
      }
      if (data.checklist && data.checklist.length) await Store.setMeta('checklist', data.checklist);
      for (const s of data.sites || []) await Store.put('sites', s);
      for (const i of data.inspections || []) await Store.put('inspections', i);
      for (const p of data.photos || []) await Store.put('photos', { id: p.id, blob: base64ToBlob(p.data, p.type) });
      await Store.setMeta('seeded', true);
    },
  };

  function blobToBase64(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1]);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(blob);
    });
  }
  function base64ToBlob(b64, type) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: type || 'image/jpeg' });
  }

  window.Store = Store;
})();
