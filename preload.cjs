const SESSION_ID = process.env.SESSION_ID;
const OWNER_NUMBER = process.env.OWNER_NUMBER;

console.log('[TRUTH-MD] Preload running. SESSION_ID present:', !!SESSION_ID, '| OWNER_NUMBER present:', !!OWNER_NUMBER);

// Patch process.exit so we ALWAYS see why the bot exits, even if it removes listeners
const _origExit = process.exit.bind(process);
process.exit = function(code) {
  const stack = new Error('process.exit called').stack;
  console.error('[TRUTH-MD] process.exit(' + code + ') called. Stack:\n' + stack);
  _origExit(code);
};

// Patch removeAllListeners so bot can't silently strip our error handlers
const _origRemoveAll = process.removeAllListeners.bind(process);
process.removeAllListeners = function(event) {
  console.log('[TRUTH-MD] removeAllListeners called for:', event || 'ALL');
  return _origRemoveAll(event);
};

// Catch crashes
process.on('uncaughtException', (err) => {
  console.error('[TRUTH-MD] UNCAUGHT EXCEPTION:', err && err.message, err && err.stack);
  _origExit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[TRUTH-MD] UNHANDLED REJECTION:', reason && (reason.message || reason));
  _origExit(1);
});
process.on('SIGTERM', () => {
  console.error('[TRUTH-MD] SIGTERM received — killed externally (R14/R15 memory limit?)');
  _origExit(143);
});
process.on('exit', (code) => {
  console.log('[TRUTH-MD] Process exit event, code:', code);
});

if (SESSION_ID || OWNER_NUMBER) {
  const fs = require('fs');
  const path = require('path');

  const patchEnvContent = (content) => {
    if (typeof content !== 'string') return content;
    if (Buffer.isBuffer(content)) content = content.toString('utf8');
    if (SESSION_ID) {
      if (/SESSION_ID=/.test(content)) {
        content = content.replace(/SESSION_ID=(".*?"|'.*?'|[^\r\n]*)/, `SESSION_ID="${SESSION_ID}"`);
      } else {
        content = `SESSION_ID="${SESSION_ID}"\n` + content;
      }
    }
    if (OWNER_NUMBER) {
      if (/OWNER_NUMBER=/.test(content)) {
        content = content.replace(/OWNER_NUMBER=(".*?"|'.*?'|[^\r\n]*)/, `OWNER_NUMBER="${OWNER_NUMBER}"`);
      } else {
        content = `OWNER_NUMBER="${OWNER_NUMBER}"\n` + content;
      }
    }
    return content;
  };

  const isEnvFile = (p) => {
    if (typeof p !== 'string') return false;
    const base = path.basename(p);
    return base === '.env';
  };

  // Patch readFileSync
  const origReadFileSync = fs.readFileSync;
  fs.readFileSync = function (filePath, options) {
    const result = origReadFileSync.call(this, filePath, options);
    if (isEnvFile(filePath)) {
      const str = Buffer.isBuffer(result) ? result.toString('utf8') : result;
      const patched = patchEnvContent(str);
      return options && (options === 'utf8' || options.encoding) ? patched : Buffer.from(patched);
    }
    return result;
  };

  // Patch writeFileSync
  const origWriteFileSync = fs.writeFileSync;
  fs.writeFileSync = function (filePath, data, options) {
    if (isEnvFile(filePath)) data = patchEnvContent(data);
    return origWriteFileSync.call(this, filePath, data, options);
  };

  // Patch readFile (async)
  const origReadFile = fs.readFile;
  fs.readFile = function (filePath, options, callback) {
    if (typeof options === 'function') { callback = options; options = undefined; }
    return origReadFile.call(this, filePath, options, (err, data) => {
      if (!err && isEnvFile(filePath)) data = patchEnvContent(data);
      callback(err, data);
    });
  };

  // Patch writeFile (async)
  const origWriteFile = fs.writeFile;
  fs.writeFile = function (filePath, data, options, callback) {
    if (typeof options === 'function') { callback = options; options = undefined; }
    if (isEnvFile(filePath)) data = patchEnvContent(data);
    return origWriteFile.call(this, filePath, data, options, callback);
  };

  // Patch fs.promises
  if (fs.promises) {
    const origPromisesReadFile = fs.promises.readFile;
    fs.promises.readFile = async function (filePath, options) {
      const result = await origPromisesReadFile.call(this, filePath, options);
      if (isEnvFile(filePath)) return patchEnvContent(result);
      return result;
    };

    const origPromisesWriteFile = fs.promises.writeFile;
    fs.promises.writeFile = async function (filePath, data, options) {
      if (isEnvFile(filePath)) data = patchEnvContent(data);
      return origPromisesWriteFile.call(this, filePath, data, options);
    };
  }

  // Patch copyFileSync
  const origCopyFileSync = fs.copyFileSync;
  fs.copyFileSync = function (src, dest, flags) {
    if (isEnvFile(dest)) {
      try {
        const content = origReadFileSync.call(fs, src, 'utf8');
        const patched = patchEnvContent(content);
        return origWriteFileSync.call(fs, dest, patched);
      } catch (e) {}
    }
    return origCopyFileSync.call(this, src, dest, flags);
  };

  // Patch copyFile (async)
  const origCopyFile = fs.copyFile;
  fs.copyFile = function (src, dest, flags, callback) {
    if (typeof flags === 'function') { callback = flags; flags = undefined; }
    if (isEnvFile(dest)) {
      origReadFile.call(fs, src, 'utf8', (err, content) => {
        if (err) return callback(err);
        const patched = patchEnvContent(content);
        origWriteFile.call(fs, dest, patched, callback);
      });
      return;
    }
    return origCopyFile.call(this, src, dest, flags, callback);
  };

  console.log('[preload] SESSION_ID injection active for .env operations');
}
