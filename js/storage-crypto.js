// ─── Passphrase-based localStorage encryption (Web Crypto AES-GCM) ───────
const StorageCrypto = (() => {
  const META_KEY = 'plexus_lock_meta';
  const PBKDF2_ITERATIONS = 250000;
  let cryptoKey = null;

  function bytesToB64(bytes) {
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  function b64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function loadMeta() {
    try {
      const raw = localStorage.getItem(META_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveMeta(meta) {
    if (meta) localStorage.setItem(META_KEY, JSON.stringify(meta));
    else localStorage.removeItem(META_KEY);
  }

  function isEnabled() {
    return !!loadMeta()?.encrypted;
  }

  function isUnlocked() {
    return !!cryptoKey;
  }

  function isEnvelope(value) {
    return value && value.e === 1 && typeof value.iv === 'string' && typeof value.ct === 'string';
  }

  async function deriveKey(passphrase, saltB64) {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: b64ToBytes(saltB64),
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptText(text, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
    return { e: 1, iv: bytesToB64(iv), ct: bytesToB64(ct) };
  }

  async function decryptText(envelope, key) {
    const iv = b64ToBytes(envelope.iv);
    const ct = b64ToBytes(envelope.ct);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(pt);
  }

  async function verifyKey(key) {
    const stateRaw = localStorage.getItem('plexus_state');
    if (!stateRaw) return;
    let envelope;
    try {
      envelope = JSON.parse(stateRaw);
    } catch {
      throw new Error('INVALID_DATA');
    }
    if (!isEnvelope(envelope)) throw new Error('INVALID_DATA');
    await decryptText(envelope, key);
  }

  async function unlock(passphrase) {
    const meta = loadMeta();
    if (!meta?.encrypted || !meta.salt) throw new Error('NOT_ENCRYPTED');
    const key = await deriveKey(passphrase, meta.salt);
    try {
      await verifyKey(key);
    } catch {
      throw new Error('WRONG_PASSPHRASE');
    }
    cryptoKey = key;
    return true;
  }

  function lock() {
    cryptoKey = null;
  }

  async function readJson(key, fallback = {}) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return fallback;
    }
    if (isEnvelope(parsed)) {
      if (!cryptoKey) throw new Error('LOCKED');
      const text = await decryptText(parsed, cryptoKey);
      return JSON.parse(text);
    }
    return parsed ?? fallback;
  }

  async function writeJson(key, data) {
    const text = JSON.stringify(data);
    if (isEnabled() && cryptoKey) {
      const envelope = await encryptText(text, cryptoKey);
      localStorage.setItem(key, JSON.stringify(envelope));
    } else {
      localStorage.setItem(key, text);
    }
  }

  async function enableEncryption(passphrase) {
    const salt = bytesToB64(crypto.getRandomValues(new Uint8Array(16)));
    const key = await deriveKey(passphrase, salt);
    let stateObj = {};
    let sessionObj = { sessions: {}, activeId: 'default' };
    const stateRaw = localStorage.getItem('plexus_state');
    const sessionRaw = localStorage.getItem('plexus_sessions');
    if (stateRaw) {
      try {
        const parsed = JSON.parse(stateRaw);
        if (isEnvelope(parsed)) throw new Error('ALREADY_ENCRYPTED');
        stateObj = parsed;
      } catch (err) {
        if (err.message === 'ALREADY_ENCRYPTED') throw err;
      }
    }
    if (sessionRaw) {
      try {
        const parsed = JSON.parse(sessionRaw);
        if (!isEnvelope(parsed)) sessionObj = parsed;
      } catch {}
    }
    saveMeta({ v: 1, encrypted: true, salt, iterations: PBKDF2_ITERATIONS });
    cryptoKey = key;
    await writeJson('plexus_state', stateObj);
    await writeJson('plexus_sessions', sessionObj);
    return { stateObj, sessionObj };
  }

  async function disableEncryption(passphrase) {
    if (!cryptoKey) await unlock(passphrase);
    else {
      const meta = loadMeta();
      const testKey = await deriveKey(passphrase, meta.salt);
      try {
        await verifyKey(testKey);
      } catch {
        throw new Error('WRONG_PASSPHRASE');
      }
    }
    const stateData = await readJson('plexus_state', {});
    const sessionData = await readJson('plexus_sessions', { sessions: {}, activeId: 'default' });
    saveMeta(null);
    lock();
    localStorage.setItem('plexus_state', JSON.stringify(stateData));
    localStorage.setItem('plexus_sessions', JSON.stringify(sessionData));
    return { stateData, sessionData };
  }

  async function changePassphrase(oldPassphrase, newPassphrase) {
    const meta = loadMeta();
    if (!meta?.encrypted) throw new Error('NOT_ENCRYPTED');
    const oldKey = await deriveKey(oldPassphrase, meta.salt);
    try {
      await verifyKey(oldKey);
    } catch {
      throw new Error('WRONG_PASSPHRASE');
    }
    const stateData = await decryptText(JSON.parse(localStorage.getItem('plexus_state')), oldKey).then(t => JSON.parse(t));
    const sessionRaw = localStorage.getItem('plexus_sessions');
    const sessionData = sessionRaw
      ? await decryptText(JSON.parse(sessionRaw), oldKey).then(t => JSON.parse(t))
      : { sessions: {}, activeId: 'default' };
    const newSalt = bytesToB64(crypto.getRandomValues(new Uint8Array(16)));
    cryptoKey = await deriveKey(newPassphrase, newSalt);
    saveMeta({ v: 1, encrypted: true, salt: newSalt, iterations: PBKDF2_ITERATIONS });
    await writeJson('plexus_state', stateData);
    await writeJson('plexus_sessions', sessionData);
    return true;
  }

  return {
    META_KEY,
    PBKDF2_ITERATIONS,
    loadMeta,
    isEnabled,
    isUnlocked,
    isEnvelope,
    unlock,
    lock,
    readJson,
    writeJson,
    enableEncryption,
    disableEncryption,
    changePassphrase,
  };
})();
