import { base44 } from '@/api/base44Client';

export const SYNC_KEYS = {
  ADVANCES: 'hr_advances_list',
  ADVANCES_ALIAS: 'green_arrow_hr_advances',
  EMPLOYEE_ADVANCES: 'hr_flow_employee_advances',
  LEAVES: 'hr_leave_requests',
  CORRECTIONS: 'hr_correction_requests',
  UNIFIED_REQUESTS: 'hr_flow_unified_requests',
  COMPANY_PROFILE: 'company_profile_data',
  CONTRACTS: 'hr_flow_v12_contracts_store',
  EVALUATIONS: 'green_arrow_hr_evaluations_store',
  ANNOUNCEMENTS: 'green_arrow_hr_live_announcements',
  EMPLOYEES: 'hr_flow_v11_dora_Employee'
};

export const SUPABASE_SYNC_MAP = {
  'hr_advances_list': 'sync_advances',
  'green_arrow_hr_advances': 'sync_advances',
  'hr_flow_employee_advances': 'sync_advances',
  'hr_leave_requests': 'sync_leaves',
  'hr_correction_requests': 'sync_corrections',
  'hr_flow_unified_requests': 'sync_unified_requests',
  'company_profile_data': 'sync_company_profile',
  'hr_flow_v12_contracts_store': 'sync_contracts',
  'green_arrow_hr_evaluations_store': 'sync_evaluations',
  'green_arrow_hr_live_announcements': 'sync_announcements',
  'hr_flow_v11_dora_Employee': 'sync_hr_flow_v11_dora_Employee'
};

/**
 * Merge two arrays of records non-destructively by unique ID
 */
export function mergeRecords(primary = [], secondary = []) {
  const pList = Array.isArray(primary) ? primary : [];
  const sList = Array.isArray(secondary) ? secondary : [];
  const map = new Map();

  const getRecordKey = (item) => {
    if (!item || typeof item !== 'object') return null;
    if (item.employee_number) return 'emp_' + String(item.employee_number).replace('emp_', '');
    return String(item.id || item.unified_id || item.request_number || (item.date || item.created_at || ''));
  };

  // Secondary first
  sList.forEach(item => {
    if (item && typeof item === 'object') {
      const id = getRecordKey(item);
      if (id) map.set(id, item);
    }
  });

  // Primary (newer/cloud) overlays secondary
  pList.forEach(item => {
    if (item && typeof item === 'object') {
      const id = getRecordKey(item);
      if (id) {
        const existing = map.get(id);
        map.set(id, existing ? { ...existing, ...item } : item);
      }
    }
  });

  return Array.from(map.values());
}

/**
 * Save data locally AND push to Hostinger Cloud Backend (and Supabase)
 */
export async function cloudSave(key, data) {
  try {
    if (!data) return;
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    localStorage.setItem(key, serialized);

    if (key === SYNC_KEYS.ADVANCES) {
      localStorage.setItem(SYNC_KEYS.ADVANCES_ALIAS, serialized);
    } else if (key === SYNC_KEYS.ADVANCES_ALIAS) {
      localStorage.setItem(SYNC_KEYS.ADVANCES, serialized);
    }

    // 1. Primary: Hostinger PHP Cloud Sync (Instant & No RLS blocking)
    fetch('/api/cloud_sync.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set', key, data })
    }).catch(err => console.warn('PHP CloudSave non-critical warning:', err));

    // 2. Secondary: Supabase Cloud
    const safeSyncId = 'sync_' + key.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 60);
    if (base44.supabase) {
      const payload = {
        id: safeSyncId,
        title: key,
        content: serialized,
        category: 'cloud_sync',
        status: 'active',
        date: new Date().toISOString().split('T')[0],
      };

      base44.supabase
        .from('announcements')
        .upsert([payload], { onConflict: 'id' })
        .then(() => {})
        .catch(() => {});
    }
  } catch (e) {
    console.warn('CloudSave warning for key ' + key + ':', e);
  }
}

/**
 * Load data with Non-Destructive Bidirectional Merge
 */
export async function cloudLoad(key, defaultValue = []) {
  try {
    // 1. Get current local data
    let localData = null;
    const local = localStorage.getItem(key);
    if (local !== null) {
      try {
        localData = JSON.parse(local);
      } catch (e) {
        localData = local;
      }
    }

    // Also check alias if advances
    if (key === SYNC_KEYS.ADVANCES || key === SYNC_KEYS.ADVANCES_ALIAS) {
      try {
        const altKey = key === SYNC_KEYS.ADVANCES ? SYNC_KEYS.ADVANCES_ALIAS : SYNC_KEYS.ADVANCES;
        const alt = JSON.parse(localStorage.getItem(altKey) || '[]');
        if (Array.isArray(alt) && alt.length > 0) {
          localData = mergeRecords(Array.isArray(localData) ? localData : [], alt);
        }
      } catch (e) {}
    }

    let cloudData = null;

    // 2. Fetch from Hostinger PHP Cloud Sync (Authoritative)
    try {
      const res = await fetch(`/api/cloud_sync.php?action=get&key=${encodeURIComponent(key)}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.status === 'success' && json.data !== null && json.data !== undefined) {
          cloudData = json.data;
        }
      }
    } catch (e) {}

    // 3. Fallback to Supabase Cloud if PHP had nothing
    if (cloudData === null) {
      const syncId = SUPABASE_SYNC_MAP[key] || (key.startsWith('hr_flow_approval_') ? ('sync_appr_' + key.replace('hr_flow_approval_', '')) : null);
      if (syncId && base44.supabase) {
        try {
          const { data, error } = await base44.supabase
            .from('announcements')
            .select('content')
            .eq('id', syncId)
            .single();

          if (!error && data && data.content) {
            try {
              cloudData = JSON.parse(data.content);
            } catch (e) {
              cloudData = data.content;
            }
          }
        } catch (e) {}
      }
    }

    // 4. Merge logic
    if (Array.isArray(cloudData) || Array.isArray(localData)) {
      const merged = mergeRecords(Array.isArray(cloudData) ? cloudData : [], Array.isArray(localData) ? localData : []);
      if (merged.length > 0) {
        const serialized = JSON.stringify(merged);
        localStorage.setItem(key, serialized);
        if (key === SYNC_KEYS.ADVANCES) localStorage.setItem(SYNC_KEYS.ADVANCES_ALIAS, serialized);
        else if (key === SYNC_KEYS.ADVANCES_ALIAS) localStorage.setItem(SYNC_KEYS.ADVANCES, serialized);
        return merged;
      }
    } else if (cloudData && typeof cloudData === 'object') {
      const mergedObj = { ...(localData && typeof localData === 'object' ? localData : {}), ...cloudData };
      localStorage.setItem(key, JSON.stringify(mergedObj));
      return mergedObj;
    } else if (cloudData !== null && cloudData !== undefined) {
      const strVal = typeof cloudData === 'object' ? JSON.stringify(cloudData) : String(cloudData);
      localStorage.setItem(key, strVal);
      return cloudData;
    }

    if (localData !== null && localData !== undefined) return localData;
    return defaultValue;
  } catch (e) {
    console.warn('CloudLoad warning for key ' + key + ':', e);
    try {
      const fallback = JSON.parse(localStorage.getItem(key) || '[]');
      return fallback !== null && fallback !== undefined ? fallback : defaultValue;
    } catch(err) {
      return defaultValue;
    }
  }
}

/**
 * Initial Full Cloud Sync on App Startup with Non-Destructive Merging
 */
export async function initFullCloudSync() {
  try {
    // 1. Load all synced datasets from Hostinger PHP Cloud Sync
    let phpSyncedCount = 0;
    try {
      const res = await fetch('/api/cloud_sync.php?action=get_all');
      if (res.ok) {
        const json = await res.json();
        if (json && json.status === 'success' && json.data) {
          Object.entries(json.data).forEach(([rawKey, val]) => {
            try {
              if (Array.isArray(val)) {
                let localArr = [];
                try { localArr = JSON.parse(localStorage.getItem(rawKey) || '[]'); } catch(e) {}
                const merged = mergeRecords(val, localArr);
                localStorage.setItem(rawKey, JSON.stringify(merged));
                if (rawKey === SYNC_KEYS.ADVANCES) localStorage.setItem(SYNC_KEYS.ADVANCES_ALIAS, JSON.stringify(merged));
                else if (rawKey === SYNC_KEYS.ADVANCES_ALIAS) localStorage.setItem(SYNC_KEYS.ADVANCES, JSON.stringify(merged));
              } else if (val && typeof val === 'object') {
                let localObj = {};
                try { localObj = JSON.parse(localStorage.getItem(rawKey) || '{}'); } catch(e) {}
                const merged = { ...localObj, ...val };
                localStorage.setItem(rawKey, JSON.stringify(merged));
              } else {
                localStorage.setItem(rawKey, String(val));
              }
              phpSyncedCount++;
            } catch(e) {}
          });
        }
      }
    } catch(e) {
      console.warn('PHP full cloud sync warning:', e);
    }

    // 2. Also try Supabase Cloud Sync
    if (base44.supabase) {
      try {
        const { data, error } = await base44.supabase
          .from('announcements')
          .select('id, title, content')
          .eq('category', 'cloud_sync');

        if (!error && Array.isArray(data) && data.length > 0) {
          data.forEach(row => {
            if (row.title && row.content) {
              try {
                const cloudArr = JSON.parse(row.content);
                if (Array.isArray(cloudArr)) {
                  let localArr = [];
                  try { localArr = JSON.parse(localStorage.getItem(row.title) || '[]'); } catch(e) {}
                  const merged = mergeRecords(cloudArr, localArr);
                  localStorage.setItem(row.title, JSON.stringify(merged));
                } else if (cloudArr && typeof cloudArr === 'object') {
                  let localObj = {};
                  try { localObj = JSON.parse(localStorage.getItem(row.title) || '{}'); } catch(e) {}
                  const merged = { ...localObj, ...cloudArr };
                  localStorage.setItem(row.title, JSON.stringify(merged));
                }
              } catch (e) {}
            }
          });
        }
      } catch (e) {}
    }

    console.log(`✓ Green Arrow Cloud Sync: Synced ${phpSyncedCount} datasets from Cloud`);
    window.dispatchEvent(new Event('cloud_data_synced'));
  } catch (e) {
    console.warn('Initial Cloud Sync Error:', e);
  }
}

/**
 * Export full system JSON backup
 */
export function exportSystemBackupJSON() {
  const backup = {
    version: '2.5',
    exported_at: new Date().toISOString(),
    system: 'Green Arrow HR Cloud',
    data: {}
  };

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('hr_') || k.startsWith('payroll_') || k.includes('advance') || k.includes('approval') || k.includes('settings'))) {
      try {
        backup.data[k] = JSON.parse(localStorage.getItem(k));
      } catch (e) {
        backup.data[k] = localStorage.getItem(k);
      }
    }
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'green_arrow_hr_backup_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import system JSON backup
 */
export async function importSystemBackupJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (json.data && typeof json.data === 'object') {
          for (const [key, val] of Object.entries(json.data)) {
            const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
            localStorage.setItem(key, strVal);
            await cloudSave(key, val);
          }
          resolve({ success: true, keysRestored: Object.keys(json.data).length });
        } else {
          reject(new Error('ملف النسخ الاحتياطي غير صالح'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
