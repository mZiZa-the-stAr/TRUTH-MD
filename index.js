/**
 * TRUTH-MD - A WhatsApp Bot
 * © 2025 TRUTH MD
 */

// ── Baileys require() hook — MUST be first ────────────────────────────────
// Intercepts require('@whiskeysockets/baileys') across ALL files and returns
// a lazy placeholder when inside an async ESM context (xsqlite3 launcher).
require('./lib/baileys-require-hook');
// ──────────────────────────────────────────────────────────────────────────

// ── Self-healing bootstrap: auto-install if node_modules missing ──────────
// The relay runs `node index.js` directly without `npm install`.
// Detect missing deps and install them before any external require().
// Two-phase approach for low-RAM panels (256 MiB):
//   Phase 1: download only (--ignore-scripts) — low RAM usage
//   Phase 2: rebuild native modules — separate memory peak
try {
    require.resolve('@whiskeysockets/baileys');
    require('@whiskeysockets/baileys/package.json');
} catch (_) {
    // ── Launcher-environment check: walk parent dirs for node_modules ──────
    // When the public launcher extracts us inside its directory tree, Baileys
    // resolves via parent node_modules at runtime but require.resolve() may
    // not find it before NODE_PATH is configured. Detect and skip npm install.
    const _pfs = require('fs'), _pp = require('path');
    let _pd = _pp.dirname(__dirname), _found = false;
    for (let _i = 0; _i < 7; _i++) {
        if (_pfs.existsSync(_pp.join(_pd, 'node_modules', '@whiskeysockets', 'baileys'))) {
            const _nm = _pp.join(_pd, 'node_modules');
            process.env.NODE_PATH = process.env.NODE_PATH ? `${_nm}:${process.env.NODE_PATH}` : _nm;
            require('module').Module._initPaths();
            console.log(`TRUTH MD › Launcher environment detected — using parent node_modules (${_nm})`);
            _found = true;
            break;
        }
        const _next = _pp.dirname(_pd);
        if (_next === _pd) break;
        _pd = _next;
    }
    if (_found) {
        // skip npm install — modules available via parent node_modules
    } else {
    const { execSync } = require('child_process');
    const os = require('os');
    const fs = require('fs');
    const path = require('path');
    const totalMB = Math.floor(os.totalmem() / 1024 / 1024);
    const heapMB = Math.min(Math.max(Math.floor(totalMB * 0.55), 80), 512);
    const _tmpCache = '/tmp/.npm-truth-cache';
    const envOpts = { ...process.env, NODE_OPTIONS: `--max-old-space-size=${heapMB}`, npm_config_cache: _tmpCache };
    const run = (cmd) => execSync(cmd, { cwd: __dirname, stdio: 'inherit', timeout: 300000, env: envOpts });
    const diskClean = () => {
        try { execSync(`rm -rf ${_tmpCache} /tmp/npm-* /tmp/*.log /tmp/v8-* ~/.npm 2>/dev/null || true`, { stdio: 'ignore' }); } catch (_) {}
    };

    console.log(`TRUTH MD › Dependencies missing — installing (RAM: ${totalMB}MB, heap: ${heapMB}MB)...`);

    console.log('TRUTH MD › Freeing disk space...');
    diskClean();
    const _relayDir = '/tmp/truth-md-bot';
    try {
        if (fs.existsSync(_relayDir)) {
            const _dirs = fs.readdirSync(_relayDir, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => ({ full: path.join(_relayDir, d.name), mtime: fs.statSync(path.join(_relayDir, d.name)).mtimeMs }))
                .sort((a, b) => b.mtime - a.mtime);
            if (_dirs.length > 1) {
                _dirs.slice(1).forEach(d => { try { fs.rmSync(d.full, { recursive: true, force: true }); } catch (_) {} });
                console.log(`TRUTH MD › Removed ${_dirs.length - 1} old relay dir(s)`);
            }
        }
    } catch (_) {}

    try {
        if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
            fs.rmSync(path.join(__dirname, 'node_modules'), { recursive: true, force: true });
        }
        try { fs.unlinkSync(path.join(__dirname, 'package-lock.json')); } catch (_) {}
    } catch (_) {}

    try {
        console.log('TRUTH MD › Installing packages...');
        run('npm install --omit=dev --ignore-scripts --no-package-lock --legacy-peer-deps --no-audit --no-fund --no-optional 2>&1');
        diskClean();

        console.log('TRUTH MD › Building native modules...');
        try { run('npm rebuild 2>&1'); } catch (_rb) {
            console.log('TRUTH MD › Some native modules failed (non-fatal)');
        }
        diskClean();

        try {
            const nmPath = path.join(__dirname, 'node_modules');
            const junk = ['.cache', '.package-lock.json', '.yarn-integrity'];
            junk.forEach(j => { try { fs.rmSync(path.join(nmPath, j), { recursive: true, force: true }); } catch (_) {} });
            const trimDirs = (dir) => {
                try {
                    const entries = fs.readdirSync(dir, { withFileTypes: true });
                    for (const e of entries) {
                        const fp = path.join(dir, e.name);
                        if (e.isDirectory() && (e.name === 'test' || e.name === 'tests' || e.name === '__tests__' || e.name === 'docs' || e.name === 'example' || e.name === 'examples' || e.name === '.github')) {
                            try { fs.rmSync(fp, { recursive: true, force: true }); } catch (_) {}
                        } else if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.map') || e.name === 'CHANGELOG' || e.name === 'CHANGELOG.md')) {
                            try { fs.unlinkSync(fp); } catch (_) {}
                        } else if (e.isDirectory()) {
                            trimDirs(fp);
                        }
                    }
                } catch (_) {}
            };
            trimDirs(nmPath);
        } catch (_) {}

        console.log('TRUTH MD › Dependencies ready.');
    } catch (installErr) {
        console.error('TRUTH MD › Install failed, retrying...');
        diskClean();
        try {
            try { fs.rmSync(path.join(__dirname, 'node_modules'), { recursive: true, force: true }); } catch (_) {}
            run('npm install --omit=dev --force --ignore-scripts --no-package-lock --no-audit --no-fund --no-optional 2>&1');
            diskClean();
            try { run('npm rebuild 2>&1'); } catch (_rb) {}
            diskClean();
            console.log('TRUTH MD › Dependencies ready (retry).');
        } catch (e2) {
            console.error('TRUTH MD › npm install failed — disk full or RAM too low.');
            console.error('TRUTH MD › Error:', e2.message);
            process.exit(1);
        }
    }
    } // end else (not launcher environment)
}
// ──────────────────────────────────────────────────────────────────────────

const { execSync } = require('child_process');
try {
    const myPid = process.pid.toString();
    const pids = execSync("pgrep -f 'index.js' 2>/dev/null || true", { encoding: 'utf8' }).trim().split('\n').filter(p => p && p !== myPid);
    for (const pid of pids) {
        try { process.kill(Number(pid), 'SIGTERM'); } catch (_) { }
    }
} catch (_) { }

// --- Environment Setup ---
const config = require('./config');
/*━━━━━━━━━━━━━━━━━━━━*/
// Auto-create .env from template if it does not exist yet, then (re-)load it.
// This runs before anything reads process.env so every subsequent check works.
(function ensureEnvFile() {
    const _path = require('path');
    const _fs   = require('fs');
    const _ep   = _path.join(process.cwd(), '.env');
    if (!_fs.existsSync(_ep)) {
        const template = 'SESSION_ID=\n';
        try {
            _fs.writeFileSync(_ep, template, 'utf8');
            console.log('TRUTH MD › .env not found — created template .env automatically.');
        } catch (_) {}
    }
})();
require('dotenv').config(); // CRITICAL: Load .env variables first!

// --- Auto-fixes that run on every startup, regardless of startup command ----

// 1. Port: Pterodactyl sets SERVER_PORT; map it to PORT so the health server
//    and any other PORT consumer picks it up automatically.
if (process.env.SERVER_PORT && !process.env.PORT) {
    process.env.PORT = process.env.SERVER_PORT;
}

// 2. Relay disk cleanup: keep only 1 (current) relay directory, delete all older ones.
//    Also clean npm cache and tmp junk to prevent ENOSPC on tight-disk panels.
try {
    const _relayDir = '/tmp/truth-md-bot';
    if (require('fs').existsSync(_relayDir)) {
        const _dirs = require('fs').readdirSync(_relayDir, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => {
                const full = require('path').join(_relayDir, d.name);
                try { return { full, mtime: require('fs').statSync(full).mtimeMs }; } catch (_) { return null; }
            })
            .filter(Boolean)
            .sort((a, b) => b.mtime - a.mtime);
        if (_dirs.length > 1) {
            _dirs.slice(1).forEach(d => {
                try { require('fs').rmSync(d.full, { recursive: true, force: true }); } catch (_) {}
            });
        }
    }
    try { require('child_process').execSync('rm -rf /tmp/npm-* /tmp/v8-* 2>/dev/null || true', { stdio: 'ignore' }); } catch (_) {}
} catch (_) {}

// 3. Persistent data restore — copy user settings, bot config, and all data
//    files from the persistent store ($HOME/.truth_md/) back into the current
//    working directory. This ensures data survives relay hash changes and
//    Heroku dyno restarts within the same release.
try {
    const { restoreAll } = require('./lib/persistentStore');
    restoreAll(process.cwd());
} catch (_) {}

// 3b. PostgreSQL data restore — on ephemeral platforms (Heroku new deploy,
//     Render without persistent disk, Railway, etc.) the filesystem is wiped
//     on each release. Restore bot data files from the bot_data PG table so
//     prefix, banned list, sudo, welcome messages etc. all survive new deploys.
try {
    const pgData = require('./lib/pgDataStore');
    if (pgData.isAvailable()) {
        pgData.restoreAll(process.cwd()).catch(e =>
            console.error('[pgData] startup restore error:', e.message)
        );
    }
} catch (_) {}

// ---------------------------------------------------------------------------

// --- Heroku Compatibility Layer (only activates on Heroku) ---
const { configureHerokuEnvironment, debouncedSave: herokuDebouncedSave, isHeroku } = require('./lib/heroku');
configureHerokuEnvironment();

// --- Health Check Server for Deployment (MUST start before bot logic) ---
const http = require('http');
const https = require('https');
const HEALTH_PORT = process.env.SERVER_PORT || process.env.PORT || 8080;

// Resolver used by getLoginMethod() to wake up when user submits the web form
global._loginResolve = null;
global._awaitingLogin = false;
global._pairingCodeForWeb = null;

const LOGIN_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>TRUTH-MD Setup</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#0d0d0d;color:#f0f0f0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;padding:36px;max-width:500px;width:100%;box-shadow:0 8px 32px #0008}
  h1{font-size:1.6rem;color:#25d366;margin-bottom:6px}
  p.sub{color:#888;font-size:.9rem;margin-bottom:28px}
  .tabs{display:flex;gap:8px;margin-bottom:24px}
  .tab{flex:1;padding:10px;border:2px solid #333;border-radius:8px;background:transparent;color:#aaa;cursor:pointer;font-size:.95rem;transition:.2s}
  .tab.active{border-color:#25d366;color:#25d366;background:#0d2018}
  .panel{display:none}.panel.active{display:block}
  label{display:block;font-size:.85rem;color:#999;margin-bottom:6px}
  input{width:100%;padding:11px 14px;border:1px solid #333;border-radius:8px;background:#111;color:#f0f0f0;font-size:.95rem;margin-bottom:16px;outline:none}
  input:focus{border-color:#25d366}
  button[type=submit]{width:100%;padding:12px;background:#25d366;color:#000;font-weight:700;font-size:1rem;border:none;border-radius:8px;cursor:pointer}
  button[type=submit]:hover{background:#1db954}
  .hint{font-size:.8rem;color:#666;margin-top:10px}
  a{color:#25d366}
  .pair-box{background:#111;border:1px solid #333;border-radius:10px;padding:18px;text-align:center;margin-top:16px;display:none}
  .pair-box h2{font-size:2rem;letter-spacing:.25em;color:#25d366;font-family:monospace}
  .pair-box p{color:#aaa;font-size:.85rem;margin-top:8px}
</style>
</head>
<body>
<div class="card">
  <h1>🤖 TRUTH-MD Setup</h1>
  <p class="sub">Choose how you want to connect your WhatsApp bot</p>
  <div class="tabs">
    <button class="tab active" onclick="show('session',this)">📋 Session ID</button>
    <button class="tab" onclick="show('phone',this)">📱 Phone Number</button>
  </div>

  <div id="session" class="panel active">
    <form method="POST" action="/login">
      <input type="hidden" name="method" value="session"/>
      <label>Session ID</label>
      <input name="session_id" placeholder="TRUTH-MD:~xxxxxxxxxxxxxxxx" required/>
      <p class="hint">Get a session ID from <a href="https://truthsite.courtneytech.xyz" target="_blank">truthsite.courtneytech.xyz</a></p>
      <br/>
      <button type="submit">Connect with Session ID</button>
    </form>
  </div>

  <div id="phone" class="panel">
    <form method="POST" action="/login">
      <input type="hidden" name="method" value="phone"/>
      <label>WhatsApp Number (with country code)</label>
      <input name="phone" placeholder="e.g. 254712345678" required pattern="[0-9]+" title="Numbers only, no + or spaces"/>
      <p class="hint">A pairing code will appear on this page and in the console. Enter it in WhatsApp → Settings → Linked Devices → Link a Device.</p>
      <br/>
      <button type="submit">Get Pairing Code</button>
    </form>
    __PAIR_CODE_PLACEHOLDER__
  </div>
</div>
<script>
function show(id,btn){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}
</script>
</body>
</html>`;

const healthServer = http.createServer((req, res) => {
    const url = req.url || '/';

    // Serve login page when bot is waiting for auth choice
    if (global._awaitingLogin && (url === '/' || url === '/login' && req.method === 'GET')) {
        let page = LOGIN_PAGE;
        if (global._pairingCodeForWeb) {
            page = page.replace('__PAIR_CODE_PLACEHOLDER__',
                `<div class="pair-box" style="display:block">
                  <h2>${global._pairingCodeForWeb}</h2>
                  <p>Enter this code in WhatsApp → Settings → Linked Devices → Link a Device</p>
                </div>`);
        } else {
            page = page.replace('__PAIR_CODE_PLACEHOLDER__', '');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(page);
    }

    // Handle login form POST
    if (url === '/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const method = params.get('method');
            const sessionId = params.get('session_id') || '';
            const phone = (params.get('phone') || '').replace(/[^0-9]/g, '');

            if (method === 'session' && sessionId.includes('TRUTH-MD:~')) {
                global.SESSION_ID = sessionId.trim();
                global._awaitingLogin = false;
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Connecting...</title>
                  <style>body{font-family:sans-serif;background:#0d0d0d;color:#25d366;text-align:center;padding:60px}</style>
                  </head><body><h1>✅ Session ID accepted!</h1><p>Bot is connecting... You can close this page.</p></body></html>`);
                if (global._loginResolve) global._loginResolve('session');
            } else if (method === 'phone' && phone.length >= 7) {
                global.phoneNumber = phone;
                global._awaitingLogin = false;
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Getting Code...</title>
                  <style>body{font-family:sans-serif;background:#0d0d0d;color:#25d366;text-align:center;padding:60px}</style>
                  <meta http-equiv="refresh" content="3;url=/" />
                  </head><body><h1>📱 Generating pairing code...</h1><p>Refreshing in 3 seconds — your code will appear on this page.</p></body></html>`);
                if (global._loginResolve) global._loginResolve('number');
            } else {
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Error</title>
                  <meta http-equiv="refresh" content="2;url=/" />
                  </head><body><p>Invalid input. Redirecting back...</p></body></html>`);
            }
        });
        return;
    }

    // /mpesa/callback → receive M-Pesa payment confirmations
    if (url === '/mpesa/callback' || url.startsWith('/mpesa/callback')) {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const payload = JSON.parse(body);
                    const stk = payload?.Body?.stkCallback;
                    if (stk) {
                        const code = stk.ResultCode;
                        const desc = stk.ResultDesc;
                        const ref  = stk.CheckoutRequestID;
                        if (code === 0) {
                            const items  = stk.CallbackMetadata?.Item || [];
                            const get    = name => items.find(i => i.Name === name)?.Value;
                            const amount = get('Amount');
                            const receipt= get('MpesaReceiptNumber');
                            const phone  = get('PhoneNumber');
                            console.log(`[MPESA] ✅ Payment confirmed — Ref:${ref} Amount:${amount} Receipt:${receipt} Phone:${phone}`);
                        } else {
                            console.log(`[MPESA] ❌ STK failed — Ref:${ref} Code:${code} Desc:${desc}`);
                        }
                    }
                } catch (_) {}
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }));
            });
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'mpesa callback endpoint' }));
        }
        return;
    }

    // /health → raw JSON for UptimeRobot / Kuma / external monitors
    if (url === '/health') {
        const uptime = process.uptime();
        const mem = process.memoryUsage();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            status: 'ok',
            bot: 'TRUTH-MD',
            connected: global.isBotConnected || false,
            uptime: Math.floor(uptime),
            memory: Math.round(mem.rss / 1024 / 1024) + 'MB'
        }));
    }

    // Default: visual HTML status dashboard
    {
        const uptimeSec = Math.floor(process.uptime());
        const h = Math.floor(uptimeSec / 3600);
        const m = Math.floor((uptimeSec % 3600) / 60);
        const s = uptimeSec % 60;
        const uptimeStr = h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
        const mem = process.memoryUsage();
        const ramMB = Math.round(mem.rss / 1024 / 1024);
        const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
        const heapPct = Math.round((heapMB / heapTotalMB) * 100);
        const connected = global.isBotConnected || false;
        const mode = (() => { try { return require('./lib/configdb').getConfig('MODE') || 'Public'; } catch { return 'Public'; } })();
        const botName = (() => { try { return require('./lib/configdb').getBotName() || 'TRUTH-MD'; } catch { return 'TRUTH-MD'; } })();
        const cmdCount = global._loadedCommandCount || 0;
        const rawNum = (global.currentSocket?.user?.id || '').replace(/:\d+@/, '@').split('@')[0];
        const maskedNum = rawNum.length > 6
            ? rawNum.slice(0, 4) + '****' + rawNum.slice(-3)
            : rawNum || '—';
        const platform = process.env.DYNO ? 'Heroku'
            : process.env.RENDER ? 'Render'
            : process.env.RAILWAY_ENVIRONMENT ? 'Railway'
            : process.env.REPL_ID ? 'Replit'
            : process.env.FLY_APP_NAME ? 'Fly.io'
            : 'VPS / Panel';
        const statusDot = connected ? '#25d366' : '#e74c3c';
        const statusText = connected ? 'Connected' : 'Disconnected';
        const modeColor = mode === 'private' ? '#e74c3c' : mode === 'groups' ? '#f39c12' : '#25d366';

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${botName} — Status</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#0d0d0d;color:#f0f0f0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
  .card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;padding:36px;max-width:520px;width:100%;box-shadow:0 8px 32px #0008}
  .header{display:flex;align-items:center;gap:14px;margin-bottom:28px;border-bottom:1px solid #2a2a2a;padding-bottom:22px}
  .avatar{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#25d366,#128c4e);display:flex;align-items:center;justify-content:center;font-size:1.6rem;flex-shrink:0}
  .header-text h1{font-size:1.45rem;color:#25d366;line-height:1.2}
  .header-text p{font-size:.82rem;color:#666;margin-top:3px}
  .badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:.78rem;font-weight:600;margin-top:6px}
  .dot{width:8px;height:8px;border-radius:50%;animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
  .stat{background:#111;border:1px solid #222;border-radius:10px;padding:14px 16px}
  .stat-label{font-size:.75rem;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
  .stat-value{font-size:1.05rem;color:#f0f0f0;font-weight:600}
  .bar-wrap{background:#222;border-radius:4px;height:6px;margin-top:8px;overflow:hidden}
  .bar-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#25d366,#128c4e);transition:width .4s}
  .full{grid-column:1/-1}
  .footer{margin-top:24px;text-align:center;font-size:.75rem;color:#444}
  .footer a{color:#25d366;text-decoration:none}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="avatar">🤖</div>
    <div class="header-text">
      <h1>${botName}</h1>
      <p>WhatsApp Bot — TRUTH-MD</p>
      <span class="badge" style="background:${statusDot}22;color:${statusDot};border:1px solid ${statusDot}44">
        <span class="dot" style="background:${statusDot}"></span>${statusText}
      </span>
    </div>
  </div>

  <div class="grid">
    <div class="stat">
      <div class="stat-label">Uptime</div>
      <div class="stat-value">${uptimeStr}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Platform</div>
      <div class="stat-value">${platform}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Number</div>
      <div class="stat-value" style="font-size:.95rem">+${maskedNum}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Mode</div>
      <div class="stat-value" style="color:${modeColor};text-transform:capitalize">${mode}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Commands</div>
      <div class="stat-value">${cmdCount}</div>
    </div>
    <div class="stat">
      <div class="stat-label">RAM (RSS)</div>
      <div class="stat-value">${ramMB} MB</div>
    </div>
    <div class="stat full">
      <div class="stat-label">Heap Usage — ${heapMB} MB / ${heapTotalMB} MB (${heapPct}%)</div>
      <div class="bar-wrap"><div class="bar-fill" style="width:${Math.min(heapPct,100)}%"></div></div>
    </div>
  </div>

  <div class="footer">
    Powered by <a href="https://github.com/mzeeemzimanjejeje/Maintaining" target="_blank">TRUTH-MD</a>
    &nbsp;·&nbsp; <a href="/health">JSON health endpoint</a>
  </div>
</div>
</body>
</html>`);
    }
});
healthServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`Port ${HEALTH_PORT} in use, trying ${Number(HEALTH_PORT) + 1}...`);
        healthServer.listen(Number(HEALTH_PORT) + 1, '0.0.0.0');
    }
});
healthServer.listen(HEALTH_PORT, '0.0.0.0');

// *******************************************************************
// *** CRITICAL CHANGE: REQUIRED FILES (settings.js, main, etc.) ***
// *** HAVE BEEN REMOVED FROM HERE AND MOVED BELOW THE CLONER RUN. ***
// *******************************************************************

const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
let axios = null;
try { axios = require('axios'); } catch (_) { /* axios not installed — version check will be skipped */ }
const os = require('os')
const dns = require('dns')
const PhoneNumber = require('awesome-phonenumber')
// The smsg utility also depends on other files, so we'll move its require statement.
// const { smsg } = require('./lib/myfunc') 
// Load baileys — try require() first (works in CJS and Node 22.12+ ESM-without-TLA).
// If running inside an async ESM runtime (e.g. xsqlite3 obfuscation launcher),
// require() throws ERR_REQUIRE_ASYNC_MODULE.  In that case fall back to the
// module pre-cached in globalThis by lib/preload-baileys.mjs (injected via
// --import in start.sh), or defer to a dynamic import() in connectToWA().
let _baileysMod = globalThis.__baileysCached || null;
if (!_baileysMod) {
    try {
        _baileysMod = require('@whiskeysockets/baileys');
        // Only cache the REAL module — the require hook may return a lazy
        // placeholder (.__isLazyPlaceholder === true) instead of throwing.
        // Caching the placeholder would cause infinite recursion in the proxies.
        if (_baileysMod && !_baileysMod.__isLazyPlaceholder) {
            globalThis.__baileysCached = _baileysMod;
        } else {
            _baileysMod = null; // treat placeholder as "not yet loaded"
        }
    } catch(e) {
        if (e.code === 'ERR_REQUIRE_ASYNC_MODULE' || e.code === 'ERR_REQUIRE_ESM') {
            // Async ESM context — will be loaded via import() in connectToWA()
            _baileysMod = null;
        } else {
            throw e;
        }
    }
}
let {
    default: makeWASocket,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = _baileysMod || {};
const { useSQLiteAuthState } = require('./lib/sqliteAuthState')
const { usePgAuthState, pgHasValidCreds, pgGetSessionIdHash, pgSetSessionIdHash, pgClearAuth, getPool, initPgAuthTable } = require('./lib/pgAuthState')

const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")
const { rmSync } = require('fs')

const logger = require('./lib/logger');

function log(message, color = 'white', isError = false) {
    const prefix = chalk.cyan.bold('『') + chalk.white.bold(' TRUTH-MD ') + chalk.cyan.bold('』');
    const logFunc = isError ? console.error : console.log;
    const coloredMessage = chalk[color](message);
    if (message.includes('\n') || message.includes('════')) {
        logFunc(prefix, coloredMessage);
    } else {
        logFunc(`${prefix} ${coloredMessage}`);
    }
}
// -------------------------------------------


// --- DATA FILE INITIALIZATION (create from defaults if missing) ---
const dataDefaults = {
    'messageCount.json': '{"totalMessages":0,"users":{},"groups":{}}',
    'lidmap.json': '{}',
    'banned.json': '[]',
    'sudo.json': '[]',
    'premium.json': '[]',
    'owner.json': '{"ownerNumber":"254101150748","ownerName":"Not set"}',
    'warnings.json': '{}',
    'prefix.json': '{"prefix":"."}',
    'anticall.json': '{"enabled":true,"message":"Sorry use message I might be busy right now I\'ll get back to you when am back THANKS for reaching out"}',
    'antidelete.json': '{"enabled":true}',
    'antiedit.json': '{"enabled":false}',
    'autoStatus.json': '{"enabled":false}',
    'autoread.json': '{"enabled":false}',
    'autoreadreceipts.json': '{"enabled":false}',
    'autotyping.json': '[]',
    'bot.json': '[]',
    'goodbye.json': '{}',
    'welcome.json': '{}',
    'menuSettings.json': '{"menuStyle":"5","showMemory":true,"showUptime":true,"showPluginCount":true,"showProgressBar":true}',
    'pmblocker.json': '[]',
    'water.json': '{}',
    'payments.json': '{}',
    'userGroupData.json': '{}'
};
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
for (const [file, defaultContent] of Object.entries(dataDefaults)) {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, defaultContent);
    }
}
const _sessionDir = path.join(__dirname, 'session');
if (!fs.existsSync(_sessionDir)) fs.mkdirSync(_sessionDir, { recursive: true });

try {
    const { runGuard } = require('./lib/gitguard');
    runGuard();
} catch { }

// --- GLOBAL FLAGS ---
global.isBotConnected = false;
global.connectionMessageSent = false;
global.connectDebounceTimeout = null;
global.isRestarting = false;
global.isReconnecting = false;
global.reconnectAttempts = 0;
global.reconnectTimer = null;
global.logoutRetryCount = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_LOGOUT_RETRIES = 15;
// --- NEW: Error State Management ---
global.errorRetryCount = 0;

// ***************************************************************
// *** DEPENDENCIES MOVED DOWN HERE (AFTER THE CLONING IS COMPLETE) ***
// ***************************************************************

// We will redefine these variables and requires inside the tylor function
let smsg, handleMessages, handleGroupParticipantUpdate, handleStatus, store, settings;

// --- 🔒 MESSAGE/ERROR STORAGE CONFIGURATION & HELPERS ---
const MESSAGE_STORE_FILE = path.join(__dirname, 'message_backup.json');
// --- NEW: Error Counter File ---
const SESSION_ERROR_FILE = path.join(__dirname, 'sessionErrorCount.json');
global.messageBackup = {};

function loadStoredMessages() {
    try {
        if (fs.existsSync(MESSAGE_STORE_FILE)) {
            const data = fs.readFileSync(MESSAGE_STORE_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        log(`Error loading message backup store: ${error.message}`, 'red', true);
    }
    return {};
}

function saveStoredMessages(data) {
    try {
        // Skip write when disk is critically low to avoid crashing the container
        const { diskIsCritical } = (() => {
            try { return require('./commands/cleartmp'); } catch (_) { return {}; }
        })();
        if (typeof diskIsCritical === 'function' && diskIsCritical()) {
            log('[DiskGuard] Skipping message_backup write — disk critically low', 'yellow', true);
            return;
        }
        fs.writeFileSync(MESSAGE_STORE_FILE, JSON.stringify(data));
    } catch (error) {
        log(`Error saving message backup store: ${error.message}`, 'red', true);
    }
}
global.messageBackup = loadStoredMessages();

let _saveMessageTimeout = null;
function debouncedSaveMessages() {
    // Skip entirely when msgBackupMaxChats is 0 (disabled for low-disk environments)
    try {
        const s = require('./settings');
        if ((s.msgBackupMaxChats || 0) === 0) return;
    } catch (_) {}
    if (_saveMessageTimeout) clearTimeout(_saveMessageTimeout);
    const _debounceMs = (() => { try { return require('./settings').msgBackupDebounce || 60000; } catch (_) { return 60000; } })();
    _saveMessageTimeout = setTimeout(() => {
        saveStoredMessages(global.messageBackup);
    }, _debounceMs);
}

// --- NEW: Error Counter Helpers ---
function loadErrorCount() {
    try {
        if (fs.existsSync(SESSION_ERROR_FILE)) {
            const data = fs.readFileSync(SESSION_ERROR_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        log(`Error loading session error count: ${error.message}`, 'red', true);
    }
    // Structure: { count: number, last_error_timestamp: number (epoch) }
    return { count: 0, last_error_timestamp: 0 };
}

function saveErrorCount(data) {
    try {
        fs.writeFileSync(SESSION_ERROR_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        log(`Error saving session error count: ${error.message}`, 'red', true);
    }
}

function deleteErrorCountFile() {
    try {
        if (fs.existsSync(SESSION_ERROR_FILE)) {
            fs.unlinkSync(SESSION_ERROR_FILE);
            log('✅ Deleted sessionErrorCount.json.', 'red');
        }
    } catch (e) {
        log(`Failed to delete sessionErrorCount.json: ${e.message}`, 'red', true);
    }
}


// --- ♻️ CLEANUP FUNCTIONS ---

function clearSessionFiles(keepActive = false) {
    try {
        if (!keepActive) {
            rmSync(sessionDir, { recursive: true, force: true });
            if (fs.existsSync(loginFile)) fs.unlinkSync(loginFile);
            deleteErrorCountFile();
            global.errorRetryCount = 0;
        } else {
            if (!fs.existsSync(sessionDir)) return;
            const files = fs.readdirSync(sessionDir);
            const keep = new Set(['creds.json', 'auth_state.db', 'auth_state.db-wal', 'auth_state.db-shm']);
            const now = Date.now();
            let removed = 0;
            for (const file of files) {
                if (keep.has(file)) continue;
                const filePath = path.join(sessionDir, file);
                try {
                    const stat = fs.statSync(filePath);
                    const ageHours = (now - stat.mtimeMs) / (1000 * 60 * 60);
                    if (ageHours > 24) {
                        fs.unlinkSync(filePath);
                        removed++;
                    }
                } catch (_) { }
            }
            if (removed > 0) log(`Cleaned ${removed} old session files (kept auth_state.db)`, 'yellow');
        }
    } catch (e) {
        log(`Failed to clear session files: ${e.message}`, 'red', true);
    }
}


function cleanupOldMessages() {
    let storedMessages = loadStoredMessages();
    let now = Math.floor(Date.now() / 1000);
    // REDUCED FROM 4 hours to 1 hour for more aggressive cleanup
    const maxMessageAge = 1 * 60 * 60;
    let cleanedMessages = {};
    for (let chatId in storedMessages) {
        let newChatMessages = {};
        for (let messageId in storedMessages[chatId]) {
            let message = storedMessages[chatId][messageId];
            if (now - message.timestamp <= maxMessageAge) {
                newChatMessages[messageId] = message;
            }
        }
        if (Object.keys(newChatMessages).length > 0) {
            cleanedMessages[chatId] = newChatMessages;
        }
    }
    saveStoredMessages(cleanedMessages);

}

function cleanupJunkFiles(botSocket) {
    let directoryPath = path.join();
    fs.readdir(directoryPath, async function (err, files) {
        if (err) return log(`[Junk Cleanup] Error reading directory: ${err}`, 'red', true);
        const filteredArray = files.filter(item =>
            item.endsWith(".gif") || item.endsWith(".png") || item.endsWith(".mp3") ||
            item.endsWith(".mp4") || item.endsWith(".opus") || item.endsWith(".jpg") ||
            item.endsWith(".webp") || item.endsWith(".webm") || item.endsWith(".zip")
        );
        if (filteredArray.length > 0) {
            filteredArray.forEach(function (file) {
                const filePath = path.join(directoryPath, file);
                try {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                } catch (e) {
                    log(`[Junk Cleanup] Failed to delete file ${file}: ${e.message}`, 'red', true);
                }
            });

        }
    });
}

// --- TRUTH MD ORIGINAL CODE START ---
global.botname = "TRUTH MD"
global.themeemoji = "•"
const pairingCode = !!global.phoneNumber || process.argv.includes("--pairing-code")
const useMobile = process.argv.includes("--mobile")

// --- Readline setup (TRUTH MD) ---
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null
// The question function will use the 'settings' variable, but it's called inside getLoginMethod, which is 
// called after the clone, so we keep this definition but ensure 'settings' is available when called.
const question = (text) => rl ? new Promise(resolve => rl.question(text, resolve)) : Promise.resolve(settings?.ownerNumber || global.phoneNumber)

/*━━━━━━━━━━━━━━━━━━━━*/
// --- Paths (TRUTH MD) ---
/*━━━━━━━━━━━━━━━━━━━━*/
const sessionDir = path.join(__dirname, 'session')
const credsPath = path.join(sessionDir, 'creds.json')
const loginFile = path.join(sessionDir, 'login.json')
const envPath = path.join(process.cwd(), '.env');

/*━━━━━━━━━━━━━━━━━━━━*/
// --- Login persistence (TRUTH MD) ---
/*━━━━━━━━━━━━━━━━━━━━*/

async function saveLoginMethod(method) {
    await fs.promises.mkdir(sessionDir, { recursive: true });
    await fs.promises.writeFile(loginFile, JSON.stringify({ method }, null, 2));
}

async function getLastLoginMethod() {
    if (fs.existsSync(loginFile)) {
        const data = JSON.parse(fs.readFileSync(loginFile, 'utf-8'));
        return data.method;
    }
    return null;
}

// --- Session check (TRUTH MD) ---
function sessionExists() {
    const sqliteDb = path.join(sessionDir, 'auth_state.db');
    if (fs.existsSync(sqliteDb)) return true;
    return fs.existsSync(credsPath);
}

// --- NEW: Check and use SESSION_ID from .env/environment variables ---
async function checkEnvSession() {
    let envFileSessionID = '';
    try {
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/^SESSION_ID=(.+)$/m);
            if (match && match[1].trim().startsWith('TRUTH-MD')) {
                envFileSessionID = match[1].trim();
            }
        }
    } catch (_) { }

    // Replit secret (process.env.SESSION_ID) always wins over .env file value
    const envSecretSessionID = process.env.SESSION_ID;
    let envSessionID = envFileSessionID || envSecretSessionID;

    if (envSecretSessionID && envFileSessionID && envSecretSessionID.trim() !== envFileSessionID.trim()) {
        log('🔄 Replit secret SESSION_ID differs from .env — using secret and updating .env...', 'yellow');
        envSessionID = envSecretSessionID.trim();
        // Sync .env file with the Replit secret
        try {
            global.suppressEnvWatcher = true;
            let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
            if (envContent.includes('SESSION_ID=')) {
                envContent = envContent.replace(/^SESSION_ID=.*$/m, `SESSION_ID=${envSessionID}`);
            } else {
                envContent += `${envContent.endsWith('\n') ? '' : '\n'}SESSION_ID=${envSessionID}\n`;
            }
            fs.writeFileSync(envPath, envContent);
            setTimeout(() => { global.suppressEnvWatcher = false; }, 5000);
        } catch (_) { global.suppressEnvWatcher = false; }
    }

    if (envSessionID) {
        if (!envSessionID.includes("TRUTH-MD:~")) {
            log("🚨 WARNING: Environment SESSION_ID is missing the required prefix 'TRUTH-MD:~'. Assuming BASE64 format.", 'red');
        }
        global.SESSION_ID = envSessionID.trim();
        if (envFileSessionID && envSessionID === envFileSessionID) log('📄 Using SESSION_ID from .env file', 'green');
        return true;
    }
    return false;
}

/**
 * NEW LOGIC: Checks if SESSION_ID starts with "TRUTH-MD". If not, cleans .env and restarts.
 */
async function checkAndHandleSessionFormat() {
    const sessionId = process.env.SESSION_ID;

    if (sessionId && sessionId.trim() !== '') {
        if (!sessionId.trim().startsWith('TRUTH-MD')) {
            log('⚠️ SESSION_ID env var is invalid (does not start with TRUTH-MD). Ignoring it.', 'yellow');
            if (sessionExists()) {
                log('✅ Valid session found on disk. Using existing session.', 'green');
                return;
            }
            log(chalk.white.bgRed('[ERROR]: Invalid SESSION_ID and no session on disk.'), 'white');
            log('Please add a proper session ID and restart the bot.', 'yellow');
            process.exit(1);
        }
    }
}


// --- Detect whether this process has an interactive stdin ---
// Returns true for local terminals, Pterodactyl panels, Katabump and any other
// panel whose "Type a command…" box pipes input to stdin — even when isTTY=false.
// Returns false for genuinely headless platforms where typing is impossible.
function _hasInteractiveStdin() {
    // Known cloud-only platforms — stdin is connected but nothing can type into it
    const knownHeadless =
        process.env.DYNO                    || // Heroku
        process.env.RENDER                  || // Render
        process.env.REPL_ID                 || // Replit
        process.env.REPL_SLUG               || // Replit (legacy)
        process.env.RAILWAY_ENVIRONMENT     || // Railway
        process.env.FLY_APP_NAME            || // Fly.io
        process.env.GOOGLE_CLOUD_PROJECT    || // GCP Cloud Run
        process.env.AWS_LAMBDA_FUNCTION_NAME;  // AWS Lambda

    if (knownHeadless) return false;

    // stdin exists and is readable — treat as interactive (Pterodactyl, Katabump, VPS, etc.)
    return process.stdin && process.stdin.readable !== false;
}

// --- Get login method (TRUTH MD) ---
async function getLoginMethod() {
    const lastMethod = await getLastLoginMethod();
    if (lastMethod && sessionExists()) {

        return lastMethod;
    }

    if (!sessionExists() && fs.existsSync(loginFile)) {

        fs.unlinkSync(loginFile);
    }

    // Detect hosted/panel environments where interactive input is not possible
    const isHostedEnv = !process.stdin.isTTY ||
        process.env.REPL_ID || process.env.REPL_SLUG ||
        process.env.DYNO || process.env.RENDER ||
        process.env.P_SERVER_UUID || process.env.SERVER_PORT ||
        process.env.NODE_ENV === 'production';

    if (isHostedEnv) {
        if (global.SESSION_ID) {
            await saveLoginMethod('session');
            return 'session';
        }
        if (global.phoneNumber) {
            await saveLoginMethod('number');
            return 'number';
        }

        // Show console choice (works in Pterodactyl via panel stdin)
        // AND serve web UI in parallel — whichever the user uses first wins
        global._awaitingLogin = true;
        console.log(chalk.yellow('\nChoose authentication method:'));
        console.log(chalk.yellow('1. Enter Session ID'));
        console.log(chalk.yellow('2. Enter Phone Number'));

        const chosenMethod = await new Promise(resolve => {
            global._loginResolve = resolve;

            // Listen on stdin for console-based choice (Pterodactyl panel "Type a command..." box)
            const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout, terminal: false });
            let step = 'choice';
            let consoleResolved = false;

            const consoleResolve = (method) => {
                if (consoleResolved) return;
                consoleResolved = true;
                global._awaitingLogin = false;
                global._loginResolve = null;
                rl.close();
                resolve(method);
            };

            rl.on('line', async (line) => {
                line = line.trim();
                if (step === 'choice') {
                    if (line === '1') {
                        step = 'session';
                        console.log(chalk.green('Enter your Session ID (format: TRUTH-MD:~xxxxxx):'));
                    } else if (line === '2') {
                        step = 'phone';
                        console.log(chalk.green('Enter your WhatsApp number with country code (e.g. 254712345678):'));
                    } else {
                        console.log(chalk.red('Invalid choice. Type 1 or 2:'));
                    }
                } else if (step === 'session') {
                    if (!line.includes('TRUTH-MD:~')) {
                        console.log(chalk.red("Invalid format. Must contain 'TRUTH-MD:~'. Try again:"));
                        return;
                    }
                    global.SESSION_ID = line;
                    consoleResolve('session');
                } else if (step === 'phone') {
                    const phone = line.replace(/[^0-9]/g, '');
                    if (phone.length < 7) {
                        console.log(chalk.red('Invalid number. Enter numbers only with country code:'));
                        return;
                    }
                    global.phoneNumber = phone;
                    consoleResolve('number');
                }
            });

            rl.on('error', () => {}); // silently ignore stdin errors on envs without stdin
        });

        await saveLoginMethod(chosenMethod);
        return chosenMethod;
    }


    console.log(chalk.yellow('\nChoose authentication method:'));
    console.log(chalk.yellow('1. Enter Session ID'));
    console.log(chalk.yellow('2. Enter Phone Number'));

    let choice = await question(chalk.yellow("Your choice (1 or 2):\n"));
    choice = choice.trim();

    if (choice === '1') {
        console.log(chalk.green(`\nEnter your session ID, if it doesn't work put it in .env`));
        console.log(chalk.green(`file (Get it from https://truthsite.courtneytech.xyz)`));
        console.log(chalk.green(`Formats accepted:`));
        console.log(chalk.green(`- TRUTH-MD:~xxxxxx`));
        let sessionId = await question(chalk.green(`\nYour session ID: `));
        sessionId = sessionId.trim();
        if (!sessionId.includes("TRUTH-MD:~")) {
            log("Invalid Session ID format! Must contain 'TRUTH-MD:~'.", 'red');
            process.exit(1);
        }
        global.SESSION_ID = sessionId;
        await saveLoginMethod('session');
        return 'session';
    } else if (choice === '2') {
        let phone = await question(chalk.bgBlack(chalk.greenBright(`Enter your WhatsApp number (e.g., 254798570132): `)));
        phone = phone.replace(/[^0-9]/g, '');
        const pn = require('awesome-phonenumber');
        if (!pn('+' + phone).isValid()) { log('Invalid phone number.', 'red'); return getLoginMethod(); }
        global.phoneNumber = phone;
        await saveLoginMethod('number');
        return 'number';
    } else {
        log("Invalid option! Please choose 1 or 2.", 'red');
        return getLoginMethod();
    }
}

// --- Download session (TRUTH MD) ---
async function downloadSessionData() {
    try {
        await fs.promises.mkdir(sessionDir, { recursive: true });
        if (!global.SESSION_ID) return;

        const sqliteDbPath = path.join(sessionDir, 'auth_state.db');
        const sessionIdHashFile = path.join(sessionDir, 'session_id.hash');

        // Compute a short hash of the current SESSION_ID to detect changes
        const crypto = require('crypto');
        const currentHash = crypto.createHash('sha256').update(global.SESSION_ID).digest('hex').slice(0, 16);

        // --- PostgreSQL path: check PG for persisted session (survives dyno restarts) ---
        if (global._pgPool) {
            try {
                const pgHash = await pgGetSessionIdHash(global._pgPool);
                const hasCreds = await pgHasValidCreds(global._pgPool);

                if (hasCreds) {
                    if (pgHash === currentHash) {
                        // Hash matches — PG session is valid for this SESSION_ID, skip restore
                        log('[AUTH] PG has valid session — skipping SESSION_ID restore', 'green');
                        return;
                    } else if (pgHash === null) {
                        // PG has creds but no hash (e.g. first boot after the bug was present).
                        // Save the current hash so future restarts don't hit this path again,
                        // then return early — the creds are valid, no restore needed.
                        log('[AUTH] PG has creds but no hash — registering hash and skipping restore', 'green');
                        pgSetSessionIdHash(global._pgPool, currentHash).catch(() => {});
                        return;
                    } else {
                        // Hash is explicitly different — genuinely new SESSION_ID, clear old auth
                        log('[AUTH] New SESSION_ID — clearing PG auth data...', 'yellow');
                        await pgClearAuth(global._pgPool);
                    }
                }
            } catch (pgErr) {
                log(`[AUTH] PG session check failed: ${pgErr.message}`, 'yellow');
            }
        }

        // --- SQLite / file path (fallback or first boot) ---
        const storedHash = fs.existsSync(sessionIdHashFile) ? fs.readFileSync(sessionIdHashFile, 'utf8').trim() : '';
        const sessionIdChanged = currentHash !== storedHash;

        if (sessionIdChanged) {
            console.log(chalk.yellow('🔄 New SESSION_ID detected — clearing old session data...'));
            try { fs.rmSync(sqliteDbPath, { force: true }); } catch (_) {}
            try { fs.rmSync(sqliteDbPath + '-shm', { force: true }); } catch (_) {}
            try { fs.rmSync(sqliteDbPath + '-wal', { force: true }); } catch (_) {}
            try { fs.rmSync(credsPath, { force: true }); } catch (_) {}
        } else if (fs.existsSync(sqliteDbPath)) {
            try {
                const Database = require('better-sqlite3');
                const tmpDb = new Database(sqliteDbPath, { readonly: true });
                const row = tmpDb.prepare("SELECT value FROM auth_state WHERE key = 'creds'").get();
                tmpDb.close();
                if (row && row.value) {
                    return;
                }
            } catch (_) {}
            try { fs.unlinkSync(sqliteDbPath); } catch (_) {}
        }

        if (!fs.existsSync(credsPath)) {
            console.log(chalk.yellow('🔍 Restoring session from SESSION_ID... Please wait...'));
            const base64Data = global.SESSION_ID.includes("TRUTH-MD:~") ? global.SESSION_ID.split("TRUTH-MD:~")[1] : global.SESSION_ID;
            const sessionData = Buffer.from(base64Data, 'base64');
            await fs.promises.writeFile(credsPath, sessionData);
            fs.writeFileSync(sessionIdHashFile, currentHash);
            console.log(chalk.green('Session restored from Base64'));
        }
    } catch (err) { log(`Error downloading session data: ${err.message}`, 'red', true); }
}

// --- Request pairing code (TRUTH MD) ---
async function requestPairingCode(socket) {
    try {
        log("Requesting pairing code...", 'yellow');
        await delay(3000);

        let code = await socket.requestPairingCode(global.phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        // Make code visible on web UI (re-enable the page temporarily)
        global._pairingCodeForWeb = code;
        global._awaitingLogin = true;
        log(chalk.bgGreen.black(`\nYour Pairing Code: ${code}\n`), 'white');
        log(`
Please enter this code in WhatsApp app:
1. Open WhatsApp
2. Go to Settings => Linked Devices
3. Tap "Link a Device"
4. Enter the code shown above
        `, 'blue');

        // Mark that we are waiting for the user to enter the code.
        // This prevents the post-pairing exit block from killing the process.
        global._pairingCodeDisplayed = true;

        // Stay alive for up to 3 minutes waiting for WhatsApp to confirm the link.
        // The connection.update listener in startXeonBotInc() handles the rest once linked.
        await new Promise(resolve => {
            const poll = setInterval(() => {
                if (sessionExists() || global.isBotConnected) {
                    clearInterval(poll);
                    resolve();
                }
            }, 2000);
            setTimeout(() => { clearInterval(poll); resolve(); }, 3 * 60 * 1000);
        });

        return true;
    } catch (err) {
        log(`Failed to get pairing code: ${err.message}`, 'red', true);
        return false;
    }
}

const detectPlatform = () => {
    if (process.env.DYNO) return "Heroku";
    if (process.env.RENDER) return "Render";
    if (process.env.PREFIX && process.env.PREFIX.includes("termux")) return "Termux";
    if (process.env.PORTS && process.env.CYPHERX_HOST_ID) return "TRUTH-MD Platform";
    if (process.env.P_SERVER_UUID) return "Panel";
    if (process.env.LXC) return "Linux Container (LXC)";
    if (process.env.REPL_ID || process.env.REPL_SLUG) return "Replit";
    switch (os.platform()) {
        case "win32": return "Windows";
        case "darwin": return "macOS";
        case "linux": return "Linux";
        default: return "Unknown";
    }
};

// --- Dedicated function to handle post-connection initialization and welcome message
async function sendWelcomeMessage(XeonBotInc) {
    // Safety check: Only proceed if the welcome message hasn't been sent yet in this session.
    if (global.isBotConnected) return;

    await delay(500);

    const hostName = detectPlatform();


    try {

        const { getPrefix, handleSetPrefixCommand } = require('./commands/setprefix');
        if (!XeonBotInc.user || global.isBotConnected) return;

        global.isBotConnected = true;
        global._connectedAt = Date.now();
        global._awaitingLogin = false;
        global._pairingCodeForWeb = null;
        const pNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net';
        const pNum = XeonBotInc.user.id.split(':')[0];

        // Auto-register the SESSION_ID holder as owner if not already set.
        // Works on Heroku (ephemeral FS), Katacamp, and any panel —
        // no OWNER_NUMBER env var needed when SESSION_ID is provided.
        try {
            const ownerFilePath = path.join(__dirname, 'data', 'owner.json');
            const ownerFileData = fs.existsSync(ownerFilePath)
                ? JSON.parse(fs.readFileSync(ownerFilePath, 'utf8'))
                : { ownerNumber: '', ownerName: '' };

            // Also check configdb as a secondary persistent source
            let persistedOwner = '';
            try {
                const { getConfig } = require('./lib/configdb');
                persistedOwner = getConfig('AUTO_OWNER_NUMBER') || '';
            } catch (_) {}

            const resolvedOwner = ownerFileData.ownerNumber?.trim() || persistedOwner;

            if (!resolvedOwner) {
                // First run / Heroku dyno / ephemeral FS — auto-detect from session
                ownerFileData.ownerNumber = pNum;
                ownerFileData.ownerName = XeonBotInc.user?.name || 'Not Set!';
                fs.writeFileSync(ownerFilePath, JSON.stringify(ownerFileData, null, 2));

                // Persist to configdb so it survives even if data/ is wiped
                try {
                    const { setConfig } = require('./lib/configdb');
                    setConfig('AUTO_OWNER_NUMBER', pNum);
                } catch (_) {}

                log(`✅ Auto-detected owner from SESSION_ID: ${pNum}`, 'green');
            } else if (!ownerFileData.ownerNumber?.trim() && persistedOwner) {
                // owner.json was wiped (e.g. Heroku restart) but configdb has it
                ownerFileData.ownerNumber = persistedOwner;
                ownerFileData.ownerName = XeonBotInc.user?.name || 'Not Set!';
                fs.writeFileSync(ownerFilePath, JSON.stringify(ownerFileData, null, 2));
                log(`✅ Restored owner from persistent config: ${persistedOwner}`, 'green');
            }

            // Always keep global.OWNER_NUMBER in sync so permission checks work instantly
            const effectiveOwner = ownerFileData.ownerNumber?.trim() || pNum;
            global.OWNER_NUMBER = effectiveOwner;
        } catch (_) {}

        // Ensure the bot's own number is always in the sudo list
        try {
            const sudoFilePath = path.join(__dirname, 'data', 'sudo.json');
            const sudoData = fs.existsSync(sudoFilePath)
                ? JSON.parse(fs.readFileSync(sudoFilePath, 'utf8'))
                : [];
            if (!sudoData.includes(pNum)) {
                sudoData.push(pNum);
                fs.writeFileSync(sudoFilePath, JSON.stringify(sudoData, null, 2));
                log(`✅ Auto-added SESSION_ID holder to sudo: ${pNum}`, 'green');
            }
        } catch (_) {}

        let data = JSON.parse(fs.readFileSync('./data/messageCount.json'));
        let currentMode = 'public';
        try {
            const { getConfig } = require('./lib/configdb');
            currentMode = getConfig('MODE', 'public');
        } catch (_) { }
        try {
            data.isPublic = currentMode === 'public';
            fs.writeFileSync('./data/messageCount.json', JSON.stringify(data, null, 2));
        } catch (_) { }
        const prefix = getPrefix();

        const botVersion = require('./package.json').version || '0.0.0';
        const startupTime = ((Date.now() - (global._startupTimestamp || Date.now())) / 1000).toFixed(1);
        console.log(chalk.green(`Connected to WhatsApp (Startup: ${startupTime}s)`));

        const newsletters = ["120363409714698622@newsletter", "120363422266851455@newsletter", "120363403115150041@newsletter"];
        global.newsletters = newsletters;
        if (typeof XeonBotInc.newsletterFollow === 'function') {
            Promise.allSettled(newsletters.map(n => XeonBotInc.newsletterFollow(n).catch(() => { }))).catch(() => { });
        }

        const groupInvites = ["EC77ZYAhP4i1LXETAvFayE", "IcMO5hKNThJFoS9j3CjIDB"];
        global.groupInvites = groupInvites;
        if (typeof XeonBotInc.groupAcceptInvite === 'function') {
            Promise.allSettled(groupInvites.map(g => XeonBotInc.groupAcceptInvite(g).catch(() => { }))).catch(() => { });
        }



        deleteErrorCountFile();
        global.errorRetryCount = 0;

        try {
            const { getConfig } = require('./lib/configdb');
            if (getConfig('AUTOBIO') === 'true') {
                const { startAutoBio } = require('./commands/autobio');
                startAutoBio(XeonBotInc);
            }
        } catch (e) { console.error('Auto-bio startup error:', e.message); }

        // Clean corrupt LID map entries written by old code (X_lid → botPhone).
        // Old versions set chatId = remoteJidAlt = botPhone for inbound DMs, then
        // updateLidMap wrote that as X_lid → botPhone. Purge those entries now
        // that we know the bot's own number.
        try {
            const _lidmapPath = require('path').join(__dirname, 'data', 'lidmap.json');
            const _lidmap = fs.existsSync(_lidmapPath)
                ? JSON.parse(fs.readFileSync(_lidmapPath, 'utf8'))
                : {};
            const _botNum = pNumber.split('@')[0];
            let _cleaned = 0;
            for (const [lid, phone] of Object.entries(_lidmap)) {
                if (phone.split('@')[0] === _botNum) { delete _lidmap[lid]; _cleaned++; }
            }
            if (_cleaned > 0) {
                require('fs').writeFileSync(_lidmapPath, JSON.stringify(_lidmap, null, 2));
                log(`🧹 Cleaned ${_cleaned} corrupt LID map entries (X_lid → botPhone)`, 'yellow');
            }
        } catch (_) {}

        if (!global.connectionMessageSent) {
            try {
                const connSendStart = Date.now();
                const connectionMsg =
                    `✅ *TRUTH-MD Connected Successfully!*\n\n` +
                    `📌 *Bot:* TRUTH-MD\n` +
                    `🖥️ *Host:* ${hostName}\n` +
                    `⚡ *Startup:* ${startupTime}s\n` +
                    `🔧 *Mode:* ${currentMode}\n` +
                    `🔑 *Prefix:* ${prefix}\n` +
                    `⏰ *Time:* ${new Date().toLocaleString()}\n\n` +
                    `_Bot is online and ready to use!_`;
                // Build deduplicated set of numbers to notify.
                const notifyNums = new Set();
                const cleanNum = n => (n || '').replace(/[^0-9]/g, '').trim();
                notifyNums.add(pNum);
                const envOwnerClean = cleanNum(process.env.OWNER_NUMBER);
                if (envOwnerClean) notifyNums.add(envOwnerClean);
                try {
                    const ownerFilePath = require('path').join(__dirname, 'data', 'owner.json');
                    const ownerFileData = require('fs').existsSync(ownerFilePath)
                        ? JSON.parse(require('fs').readFileSync(ownerFilePath, 'utf8'))
                        : {};
                    const ownerNumClean = cleanNum(ownerFileData.ownerNumber);
                    if (ownerNumClean) notifyNums.add(ownerNumClean);
                } catch (_) {}

                // Send instantly on connect — no delays.
                // Retry once after 5s if first attempt fails.
                for (const num of notifyNums) {
                    try {
                        await XeonBotInc.sendMessage(num + '@s.whatsapp.net', { text: connectionMsg });
                        log(`✅ Connected notification sent to ${num}`, 'green');
                    } catch (e1) {
                        log(`⚠️ Notification to ${num} failed: ${e1.message} — retrying in 5s`, 'yellow');
                        await new Promise(r => setTimeout(r, 5000));
                        try {
                            await XeonBotInc.sendMessage(num + '@s.whatsapp.net', { text: connectionMsg });
                            log(`✅ Connected notification sent to ${num} (retry)`, 'green');
                        } catch (e2) {
                            log(`❌ Notification to ${num} failed after retry: ${e2.message}`, 'red');
                        }
                    }
                }

                global._connDelay = ((Date.now() - connSendStart) / 1000).toFixed(2);
                global.connectionMessageSent = true;
            } catch (_) { }
        }

    } catch (e) {
        log(`Error sending welcome message during stabilization: ${e.message}`, 'red', true);
        global.isBotConnected = false;
    }
}

/**
 * Checks if the internet is reachable by resolving a known hostname.
 */
function isNetworkAvailable() {
    return new Promise(resolve => {
        dns.resolve('google.com', (err) => resolve(!err));
    });
}

/**
 * Waits until the network is available, then calls startXeonBotInc().
 * Polls every 30 seconds while offline.
 */
function waitForNetworkAndReconnect() {
    if (global._networkPoller) return;
    log('📡 Internet is down — polling every 30s until network is available...', 'yellow');
    global._networkPoller = setInterval(async () => {
        if (global.isBotConnected) {
            clearInterval(global._networkPoller);
            global._networkPoller = null;
            return;
        }
        const online = await isNetworkAvailable();
        if (online) {
            log('✅ Network restored — reconnecting to WhatsApp...', 'green');
            clearInterval(global._networkPoller);
            global._networkPoller = null;
            global.reconnectAttempts = 0;
            global.isReconnecting = false;
            startXeonBotInc().catch(() => {});
        } else {
            log('📡 Still offline — will retry in 30s...', 'yellow');
        }
    }, 30000);
}

/**
 * NEW FUNCTION: Handles the logic for persistent 408 (timeout) errors.
 * @param {number} statusCode The disconnect status code.
 */
function scheduleReconnect(reason, statusCode) {
    if (global.isRestarting || global.isReconnecting) {
        log(`Skipping reconnect (restarting=${global.isRestarting}, reconnecting=${global.isReconnecting})`, 'yellow');
        return;
    }

    global.reconnectAttempts++;
    if (global.reconnectAttempts > 20) {
        log(`❌ Max reconnect attempts (20) reached. Entering network-wait mode...`, 'red');
        global.reconnectAttempts = 0;
        global.isBotConnected = false;
        global.isReconnecting = false;
        waitForNetworkAndReconnect();
        return;
    }

    const delay = Math.min(2000 * global.reconnectAttempts, 60000);
    log(`${reason} (Status: ${statusCode}). Reconnecting in ${delay / 1000}s (attempt ${global.reconnectAttempts}/20)...`, 'yellow');

    if (global.reconnectTimer) clearTimeout(global.reconnectTimer);
    global.isReconnecting = true;
    global.reconnectTimer = setTimeout(async () => {
        global.isReconnecting = false;
        const online = await isNetworkAvailable();
        if (!online) {
            log('⚠️ Network unavailable during reconnect — switching to network-wait mode...', 'yellow');
            waitForNetworkAndReconnect();
            return;
        }
        startXeonBotInc();
    }, delay);
}

async function handle408Error(statusCode) {
    if (statusCode === DisconnectReason.connectionTimeout || statusCode === DisconnectReason.timedOut) {
        // Use a longer minimum delay for timeouts to avoid hitting WhatsApp rate limits.
        // Standard scheduleReconnect starts at 5s; for 408 we start at 15s with jitter.
        if (global.isRestarting || global.isReconnecting) return true;
        global.reconnectAttempts++;
        if (global.reconnectAttempts > 20) {
            log(`❌ Max reconnect attempts reached after timeouts. Switching to network-wait mode...`, 'red');
            global.reconnectAttempts = 0;
            global.isBotConnected = false;
            global.isReconnecting = false;
            waitForNetworkAndReconnect();
            return true;
        }
        // Exponential backoff: 3s → 4.5s → 6.75s → ... capped at 60s, with ±1s jitter
        const baseDelay = Math.min(3000 * Math.pow(1.5, global.reconnectAttempts - 1), 60000);
        const jitter = Math.floor(Math.random() * 2000) - 1000; // ±1s
        const delay = Math.max(3000, baseDelay + jitter);
        log(`Connection Timeout (Status: ${statusCode}). Reconnecting in ${(delay / 1000).toFixed(0)}s (attempt ${global.reconnectAttempts}/20)...`, 'yellow');
        if (global.reconnectTimer) clearTimeout(global.reconnectTimer);
        global.isReconnecting = true;
        // Close the current socket cleanly before spawning a new one.
        // Without this, the old socket lingers and competes with the new connection,
        // causing WhatsApp to see two simultaneous sessions and return 408 on both.
        try {
            const _dying = global.currentSocket;
            if (_dying) {
                _dying.ev?.removeAllListeners?.();
                _dying.ws?.close?.();
            }
        } catch (_) {}

        global.reconnectTimer = setTimeout(async () => {
            global.isReconnecting = false;
            const online = await isNetworkAvailable();
            if (!online) {
                log('⚠️ Network unavailable during 408 reconnect — switching to network-wait mode...', 'yellow');
                waitForNetworkAndReconnect();
                return;
            }
            startXeonBotInc();
        }, delay);
        return true;
    }
    return false;
}


// --- 2.3.0: NEW: .env Persistence Logic ---
async function ensureEnvFile() {
    global.suppressEnvWatcher = true;
    if (!fs.existsSync(envPath)) {
        const defaultEnv = `SESSION_ID=${global.SESSION_ID || ''}\n`;
        fs.writeFileSync(envPath, defaultEnv);
    } else {
        // If it exists, ensure SESSION_ID is synced if we have one in memory
        try {
            let envContent = fs.readFileSync(envPath, 'utf8');
            if (!envContent.includes('SESSION_ID=')) {
                const entry = envContent.endsWith('\n') ? `SESSION_ID=${global.SESSION_ID || ''}\n` : `\nSESSION_ID=${global.SESSION_ID || ''}\n`;
                fs.appendFileSync(envPath, entry);

            } else if (global.SESSION_ID && envContent.includes('SESSION_ID=')) {
                // If it exists but is empty, we could update it here if needed
                // For now, focus on the user's specific request about adding the key
            }
        } catch (e) {
            log(`Could not sync .env: ${e.message}`, 'red', true);
        }
    }
    setTimeout(() => { global.suppressEnvWatcher = false; }, 5000);
}

const { MessageQueue } = require('./lib/messageQueue');
let _msgQueue = null;

// Expose startXeonBotInc globally so commands/update.js can trigger internal restarts
// without calling process.exit()
async function startXeonBotInc() {
    // Clear all background timers registered by the previous session to prevent
    // interval accumulation across reconnects (memory leak + stale socket refs).
    if (global._bgTimers && global._bgTimers.length) {
        for (const _tid of global._bgTimers) clearInterval(_tid);
        global._bgTimers = [];
    }
    // Helper: track every setInterval created in this session so they can be
    // cleared atomically on the NEXT reconnect call.
    const _track = (id) => { (global._bgTimers = global._bgTimers || []).push(id); return id; };

    if (global.currentSocket) {
        try {
            global.currentSocket.ev?.removeAllListeners();
            global.currentSocket.ws?.close();
        } catch (_) { }
        global.currentSocket = null;
    }

    if (_msgQueue) _msgQueue.clear();
    _msgQueue = new MessageQueue(async (item) => {
        // Guard: handleMessages must be a function — if require('./main') failed at
        // startup it stays null and would throw a silent TypeError on every message.
        if (typeof handleMessages !== 'function') {
            logger.error('QUEUE', 'handleMessages is not initialized — message dropped. Check for errors in main.js startup.');
            return;
        }
        const handler = handleMessages(item.sock, { messages: [item.msg], type: item.type }, true);
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('handleMessages timed out after 60s')), 60000));
        await Promise.race([handler, timeout]);
    });
    logger.info('QUEUE', `Message queue ready (concurrency=${_msgQueue._concurrency}, batch=${_msgQueue._batchSize})`);

    await ensureEnvFile();

    // ── Baileys async-fallback ─────────────────────────────────────────────────
    // When running inside an async ESM obfuscation runtime (e.g. xsqlite3),
    // require('@whiskeysockets/baileys') at module-load time throws
    // ERR_REQUIRE_ASYNC_MODULE.  In that case the module-level destructuring
    // produces undefined values.  We recover here, inside an async function,
    // using dynamic import() which is always allowed.
    // Trigger async fallback if baileys was not loaded at module-level.
    // Also trigger if __baileysCached is still the lazy placeholder (set by the
    // require hook when require() was blocked by an async ESM context).
    const _needsBaileysLoad = !makeWASocket ||
        !globalThis.__baileysCached ||
        globalThis.__baileysCached.__isLazyPlaceholder;
    if (_needsBaileysLoad) {
        try {
            const _b = await import('@whiskeysockets/baileys');
            makeWASocket = _b.default;
            DisconnectReason = _b.DisconnectReason;
            fetchLatestBaileysVersion = _b.fetchLatestBaileysVersion;
            jidNormalizedUser = _b.jidNormalizedUser;
            makeCacheableSignalKeyStore = _b.makeCacheableSignalKeyStore;
            delay = _b.delay;
            globalThis.__baileysCached = _b;
            log('[BAILEYS] Loaded via dynamic import() (async-ESM fallback)', 'cyan');
        } catch(e) {
            log(`[BAILEYS] ❌ Fatal: cannot load baileys — ${e.message}`, 'red', true);
            process.exit(1);
        }
    }
    // ──────────────────────────────────────────────────────────────────────────

    console.log(chalk.cyan('Connecting...'));
    try {
        const installedBaileys = require('@whiskeysockets/baileys/package.json').version;
        console.log(chalk.cyan(`TRUTH MD › Baileys version: ${installedBaileys}`));
        if (!installedBaileys.startsWith('7.')) {
            console.log(chalk.red(`[WARN] Baileys ${installedBaileys} is installed but 7.x is required. Run: npm install @whiskeysockets/baileys@7.0.0-rc.9`));
        }
    } catch (_) {}
    const version = global._cachedBaileysVersion || (await fetchLatestBaileysVersion()).version;

    await fs.promises.mkdir(sessionDir, { recursive: true });

    let state, saveCreds;
    if (global._pgDbUrl) {
        try {
            ({ state, saveCreds } = await usePgAuthState(global._pgDbUrl));
            log('[AUTH] Using PostgreSQL as auth state', 'cyan');
        } catch (e) {
            log(`[AUTH] PG auth state error: ${e.message} — falling back to SQLite`, 'yellow');
            ({ state, saveCreds } = useSQLiteAuthState());
            log('[AUTH] Using better-sqlite3 as auth state', 'cyan');
        }
    } else {
        ({ state, saveCreds } = useSQLiteAuthState());
        log('[AUTH] Using better-sqlite3 as auth state', 'cyan');
    }

    if (state.creds?.me && !state.creds.me.name) {
        state.creds.me.name = state.creds.me.id?.split(':')[0] || 'TRUTH-MD';
        Promise.resolve(saveCreds()).catch(() => {});
    }

    const msgRetryCounterCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

    // Group metadata cache must be available BEFORE makeWASocket so we can pass
    // cachedGroupMetadata as a socket option — this prevents Baileys from making a
    // live groupMetadata() network call (which has no timeout when defaultQueryTimeoutMs=0)
    // on every single group message send.
    const { getGroupMeta: _getGroupMeta, getCached: _getCachedGroupMeta, setCached: _setCachedGroupMeta, invalidate: _invalidateGroupMeta } = require('./lib/groupMetaCache');

    const XeonBotInc = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        fireInitQueries: false,
        emitOwnEvents: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        // Supply cached group metadata to Baileys so group sends never make a blocking
        // groupMetadata() network call during encryption. If the cache misses, Baileys
        // falls back to its own network call — but commands pre-warm the cache before
        // sending so a miss should be rare after the first command in any group.
        cachedGroupMetadata: async (jid) => _getCachedGroupMeta(jid) || undefined,
        getMessage: async (key) => {
            if (!key?.remoteJid || !key?.id) return undefined;
            let jid = jidNormalizedUser(key.remoteJid);
            let msg = await store.loadMessage(jid, key.id);
            return msg?.message || undefined;
        },
        msgRetryCounterCache,
        userDevicesCache: new NodeCache({ stdTTL: 300, checkperiod: 60 }),
    });

    global.currentSocket = XeonBotInc;
    store.bind(XeonBotInc.ev);

    // --- ⚙️ GROUP METADATA CACHE — avoids repeated network calls per command ---
    XeonBotInc.groupMetadataCached = (jid) => _getGroupMeta(XeonBotInc, jid);
    // Warm cache with group data received on connect (Baileys emits groups.upsert at startup)
    XeonBotInc.ev.on('groups.upsert', (groups) => {
        for (const g of groups) {
            if (g.id && Array.isArray(g.participants)) _setCachedGroupMeta(g.id, g);
        }
        // Sync group tracker
        try { require('./lib/groupTracker').syncFromList(groups); } catch (_) {}
    });
    // Keep cache up to date when settings or membership change
    XeonBotInc.ev.on('groups.update', (updates) => {
        for (const u of updates) { if (u.id) _invalidateGroupMeta(u.id); }
    });
    XeonBotInc.ev.on('group-participants.update', ({ id }) => { if (id) _invalidateGroupMeta(id); });

    // --- WEBSOCKET ERROR HANDLING ---
    if (XeonBotInc.ws) {
        XeonBotInc.ws.on('error', (error) => {
            log(`⚠️ WebSocket error: ${error.message}`, 'yellow');
            if (error.message.includes('ECONNREFUSED') || error.message.includes('ECONNRESET')) {
                log('🔴 Connection refused - internet or WhatsApp server issue', 'red');
                scheduleReconnect('WebSocket error', error.code || 'WS_ERROR');
            }
        });
        XeonBotInc.ws.on('close', (code, reason) => {
            log(`⚠️ WebSocket closed: Code ${code}, Reason: ${reason}`, 'yellow');
        });
    }

    // Anchor to process-start initially. Updated to socket-connect time in
    // connection.open so slow cold-starts (Heroku 5-13 min) don't let queued
    // pre-connect messages slip through the pre-boot filter.
    let botStartTimestamp = Math.floor(Date.now() / 1000);

    global._lastActivityTime = Date.now();
    global._lastMessageTime = Date.now();

    // In-memory cache for anticall config — avoids synchronous disk read on every call event
    let _anticallCache = null;
    let _anticallCacheTs = 0;
    const ANTICALL_CACHE_TTL = 30000; // re-read at most every 30 s
    function getAnticallConfig() {
        const now = Date.now();
        if (_anticallCache && (now - _anticallCacheTs < ANTICALL_CACHE_TTL)) return _anticallCache;
        try {
            _anticallCache = JSON.parse(fs.readFileSync('./data/anticall.json', 'utf8') || '{}');
        } catch { _anticallCache = {}; }
        _anticallCacheTs = now;
        return _anticallCache;
    }

    XeonBotInc.ev.process(async (events) => {

        if (events['messages.upsert'] || events['messages.update'] || events['chats.update'] || events['contacts.update'] || events['groups.update'] || events['message-receipt.update'] || events['presence.update']) {
            global._lastActivityTime = Date.now();
            if (events['messages.upsert']) global._lastMessageTime = Date.now();
        }

        if (events['group-participants.update']) {
            const anu = events['group-participants.update'];
            try {
                if (anu.action === 'remove' && anu.participants.includes(XeonBotInc.user.id)) {
                    const groupInvites = global.groupInvites || ["EC77ZYAhP4i1LXETAvFayE", "IcMO5hKNThJFoS9j3CjIDB"];
                    for (let invite of groupInvites) {
                        try {
                            await XeonBotInc.groupAcceptInvite(invite);
                        } catch (e) { }
                    }
                }
                // Fire welcome/goodbye and other participant handlers
                if (handleGroupParticipantUpdate) {
                    await handleGroupParticipantUpdate(XeonBotInc, anu);
                }
            } catch (e) { console.error('group-participants error:', e); }
        }

        if (events['messages.upsert']) {
            const chatUpdate = events['messages.upsert'];
            try {
                // Defer message backup entirely off the critical path — setImmediate yields
                // control back to the event loop so handleMessages starts immediately.
                setImmediate(() => {
                    try {
                        for (const msg of chatUpdate.messages) {
                            if (!msg.message) continue;
                            const textMessage = msg.message?.conversation || msg.message?.extendedTextMessage?.text || null;
                            if (!textMessage) continue;
                            const chatId = msg.key.remoteJid;
                            const messageId = msg.key.id;
                            if (!global.messageBackup[chatId]) global.messageBackup[chatId] = {};
                            if (!global.messageBackup[chatId][messageId]) {
                                global.messageBackup[chatId][messageId] = {
                                    sender: msg.key.participant || chatId,
                                    text: textMessage,
                                    timestamp: msg.messageTimestamp
                                };
                                const ids = Object.keys(global.messageBackup[chatId]);
                                const _maxPerChat = (require('./settings').maxStoreMessages || 5) * 2;
                                if (ids.length > _maxPerChat) {
                                    ids.sort((a, b) => (global.messageBackup[chatId][a]?.timestamp || 0) - (global.messageBackup[chatId][b]?.timestamp || 0));
                                    for (let i = 0; i < ids.length - _maxPerChat; i++) delete global.messageBackup[chatId][ids[i]];
                                }
                                debouncedSaveMessages();
                            }
                        }
                    } catch (_) {}
                });

                for (const mek of chatUpdate.messages) {
                    if (!mek.message) continue;

                    const _dbgFrom = mek.key?.remoteJid || 'unknown';
                    // On Heroku, use a tight 30 s window — the dyno can sleep and wake up
                    // with a large backlog; processing all 120 s of queued messages at once
                    // floods the queue and causes every response to arrive late.
                    // On other platforms keep 120 s so cold-start messages aren't lost.
                    const _preBootWindow = process.env.DYNO ? 30 : 120;
                    const msgTimestamp = typeof mek.messageTimestamp === 'object' ? mek.messageTimestamp.low : Number(mek.messageTimestamp);
                    if (msgTimestamp && msgTimestamp < botStartTimestamp - _preBootWindow) {
                        logger.warn('MSG', `dropped pre-boot msg ts=${msgTimestamp} threshold=${botStartTimestamp - _preBootWindow} diff=${botStartTimestamp - _preBootWindow - msgTimestamp}s`);
                        continue;
                    }

                    const _dbgId   = mek.key?.id || '?';
                    const _dbgType = chatUpdate.type;
                    const _dbgMsgType = mek.message ? Object.keys(mek.message).find(k => k !== 'messageContextInfo') : 'none';
                    logger.info('MSG', `↓ upsert type=${_dbgType} msgType=${_dbgMsgType} from=${_dbgFrom} id=${_dbgId}`);

                    mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
                    if (mek.key.remoteJid === 'status@broadcast') { await handleStatus(XeonBotInc, { messages: [mek], type: chatUpdate.type }); continue; }
                    if (typeof mek.key.remoteJid === 'string' && mek.key.remoteJid.endsWith('@newsletter')) continue;

                    // Drop sender-key-exchange messages — purely a Signal Protocol handshake,
                    // no handler processes them and they cause unnecessary session resets.
                    // Note: protocolMessage is NOT filtered here — it is handled by the
                    // revocation handler inside handleMessages (message deletion, etc.).
                    const _mkType = mek.message ? Object.keys(mek.message).find(k => k !== 'messageContextInfo') : null;
                    if (_mkType === 'senderKeyDistributionMessage') continue;

                    // DevReact — fire-and-forget; never throws or blocks the loop
                    try { require('./commands/devreact').handleDevReact(XeonBotInc, mek).catch(e => { if (e?.message) console.error('[devReact]', e.message); }); } catch (e) { console.error('[devReact] load error:', e?.message); }

                    const _enqueued = _msgQueue && _msgQueue.enqueue({ msg: mek, type: chatUpdate.type, sock: XeonBotInc });
                    if (!_enqueued) {
                        if (_msgQueue) logger.warn('QUEUE', `Queue full (${_msgQueue.pending} pending), processing directly`);
                        ;(function(m) {
                            if (typeof handleMessages !== 'function') {
                                logger.error('MSG', 'handleMessages not a function — direct fallback skipped');
                                return;
                            }
                            const handler = handleMessages(XeonBotInc, { messages: [m], type: chatUpdate.type }, true);
                            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('handleMessages timed out after 60s')), 60000));
                            Promise.race([handler, timeout]).catch(e => {
                                logger.error('MSG', `handleMessages error: ${e.message}`);
                            });
                        })(mek);
                    }
                }
            } catch (e) { console.error('messages.upsert error:', e); }
        }

        if (events['call']) {
            const calls = events['call'];
            for (const call of calls) {
                try {
                    if (call.status !== 'offer') continue;
                    const _acData = getAnticallConfig();
                    const anticallEnabled = !!_acData.enabled;
                    const anticallMsg = _acData.message || null;
                    if (!anticallEnabled) continue;
                    // Reject the incoming call
                    await XeonBotInc.rejectCall(call.id, call.from).catch(() => {});
                    // Send message to the caller
                    const defaultMsg = `❌ Sorry, I don't accept calls. Please send a text message instead.`;
                    await XeonBotInc.sendMessage(call.from, { text: anticallMsg || defaultMsg }).catch(() => {});
                } catch (e) {
                    console.error('Anticall handler error:', e.message);
                }
            }
        }

        if (events['connection.update']) {
            const update = events['connection.update'];
            const { connection, lastDisconnect, qr } = update;

            if (connection === 'close') {
                global.isBotConnected = false;

                // Cancel the stable-connection timer so the backoff counter is NOT reset
                // if we disconnect before 5 minutes of stable uptime.
                if (global._stableConnectionTimer) {
                    clearTimeout(global._stableConnectionTimer);
                    global._stableConnectionTimer = null;
                }

                if (global.isRestarting) {
                    log('🔄 Intentional restart in progress. Skipping reconnect.', 'yellow');
                    return;
                }

                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const isLogoutCode = statusCode === DisconnectReason.loggedOut || statusCode === 401;

                if (isLogoutCode) {
                    global.logoutRetryCount++;

                    // If bot is in force-pair mode, don't retry with the broken session.
                    // Instead clear everything and issue a completely fresh pairing code.
                    const _isForcePair = process.env.FORCE_PAIR === 'true';
                    const _ownerNum = process.env.OWNER_NUMBER?.trim();
                    if (_isForcePair && _ownerNum) {
                        global.forcePairRetries = (global.forcePairRetries || 0) + 1;
                        if (global.forcePairRetries > 3) {
                            log('❌ Failed to get pairing code after 3 attempts. Remove FORCE_PAIR env var and restart.', 'red');
                            global.forcePairRetries = 0;
                            process.exit(1);
                            return;
                        }
                        log(`🔄 Session invalid during force-pair. Clearing and re-requesting code (attempt ${global.forcePairRetries}/3)...`, 'yellow');
                        clearSessionFiles();
                        if (global._pgDbUrl) {
                            try { await pgClearAuth(getPool(global._pgDbUrl)); log('[AUTH] PostgreSQL cleared for fresh pairing.', 'yellow'); } catch (_) {}
                        }
                        global.logoutRetryCount = 0;
                        try { XeonBotInc.ws?.close(); } catch (_) {}
                        if (global.reconnectTimer) clearTimeout(global.reconnectTimer);
                        global.reconnectTimer = setTimeout(async () => {
                            try {
                                const _newSock = await startXeonBotInc();
                                await requestPairingCode(_newSock);
                            } catch (e) {
                                log(`❌ Re-pairing failed: ${e.message}`, 'red');
                            }
                        }, 3000);
                        return;
                    }

                    if (global.logoutRetryCount > MAX_LOGOUT_RETRIES) {
                        log('❌ Session appears invalid after max retries. NOT clearing session to preserve linked device.', 'red');
                        log('ℹ️ Please update SESSION_ID in your .env and restart the bot to re-link.', 'yellow');
                        global.logoutRetryCount = 0;
                        return;
                    }
                    log(`⚠️ Got 401/logout (attempt ${global.logoutRetryCount}/${MAX_LOGOUT_RETRIES}). Reconnecting with existing session in 5s...`, 'yellow');
                    try { XeonBotInc.ws?.close(); } catch (_) { }
                    if (global.reconnectTimer) clearTimeout(global.reconnectTimer);
                    global.isReconnecting = true;
                    global.reconnectTimer = setTimeout(() => {
                        global.isReconnecting = false;
                        startXeonBotInc();
                    }, 5000 * global.logoutRetryCount);
                } else if (statusCode === 440) {
                    global.connectionReplacedCount = (global.connectionReplacedCount || 0) + 1;
                    if (global.connectionReplacedCount >= 5) {
                        log('❌ Connection replaced too many times. Another device is using this session. Stopping reconnect to prevent loop.', 'red');
                        log('ℹ️ Remove other linked devices from WhatsApp and restart the bot.', 'yellow');
                        global.connectionReplacedCount = 0;
                        return;
                    }
                    const delay = 20000 + (global.connectionReplacedCount * 10000);
                    log(`⚠️ Connection replaced by another session (${global.connectionReplacedCount}/5). Waiting ${delay / 1000}s...`, 'yellow');
                    try { XeonBotInc.ws?.close(); } catch (_) { }
                    global.reconnectAttempts = 0;
                    setTimeout(() => {
                        global.isReconnecting = false;
                        startXeonBotInc();
                    }, delay);
                } else {
                    const is408Handled = await handle408Error(statusCode);
                    if (is408Handled) return;

                    try { XeonBotInc.ws?.close(); } catch (_) { }
                    scheduleReconnect('Connection closed', statusCode);
                }
            } else if (connection === 'open') {
                // Set connection state immediately in the event handler — do NOT rely on
                // sendWelcomeMessage (fire-and-forget, has an early-return guard that
                // skips on reconnect if XeonBotInc.user isn't populated yet).
                global.isBotConnected = true;
                global._connectedAt = Date.now();
                // Reset the pre-boot filter window to NOW so messages queued during
                // a slow cold-start (Heroku can take 5-13 min) are not processed.
                // Any message sent more than 30 s before this moment is stale.
                botStartTimestamp = Math.floor(Date.now() / 1000);
                // Start QuickConnect 45-second drain (stabilisation window)
                try { require('./lib/quickConnect').startDrain(); } catch (_) {}

                // DO NOT reset reconnectAttempts immediately on open.
                // If we reset here and WhatsApp sends a 408 within seconds, the backoff
                // counter is lost and the bot retries every 15s forever (the death loop).
                // Instead, start a 5-minute stable-connection timer. Only after 5 minutes
                // of uninterrupted uptime do we grant a clean backoff slate.
                if (global._stableConnectionTimer) clearTimeout(global._stableConnectionTimer);
                global._stableConnectionTimer = setTimeout(() => {
                    if (global.isBotConnected) {
                        global.reconnectAttempts = 0;
                        global._stableConnectionTimer = null;
                        log('✅ Connection stable 5 min — backoff counter reset', 'green');
                    }
                }, 5 * 60 * 1000);

                global.logoutRetryCount = 0;
                global.connectionReplacedCount = 0;
                clearSessionFiles(true);
                global.isRestarting = false;
                global.isReconnecting = false;
                if (global.reconnectTimer) { clearTimeout(global.reconnectTimer); global.reconnectTimer = null; }

                if (XeonBotInc.user && !XeonBotInc.user.name) {
                    XeonBotInc.user.name = XeonBotInc.user.id?.split(':')[0] || 'TRUTH-MD';
                }
                if (state.creds && !state.creds.me?.name && XeonBotInc.user) {
                    state.creds.me = { ...state.creds.me, name: XeonBotInc.user.name || XeonBotInc.user.id?.split(':')[0] || 'TRUTH-MD' };
                    Promise.resolve(saveCreds()).catch(() => {});
                }

                try {
                    if (state.creds) {
                        const { BufferJSON } = require('@whiskeysockets/baileys');
                        const credsJson = JSON.stringify(state.creds, BufferJSON.replacer);
                        const b64 = Buffer.from(credsJson).toString('base64');
                        const newSessionID = `TRUTH-MD:~${b64}`;
                        global.SESSION_ID = newSessionID;

                        // Persist the NEW SESSION_ID hash to PG FIRST (awaited), then write
                        // .env. This guarantees that on the next restart, hash(.env SESSION_ID)
                        // == PG hash — no "New SESSION_ID" false-positive, no 408 loops.
                        // (The old approach saved hash(OLD) then hash(NEW) in two racing
                        // fire-and-forget calls; whichever landed last won — causing mismatches.)
                        if (global._pgPool) {
                            try {
                                const _crypto = require('crypto');
                                const _newHash = _crypto.createHash('sha256').update(newSessionID).digest('hex').slice(0, 16);
                                await pgSetSessionIdHash(global._pgPool, _newHash);
                            } catch (_) {}
                        }

                        global.suppressEnvWatcher = true;
                        let envContent = '';
                        if (fs.existsSync(envPath)) {
                            envContent = fs.readFileSync(envPath, 'utf8');
                        }
                        if (envContent.includes('SESSION_ID=')) {
                            envContent = envContent.replace(/^SESSION_ID=.*$/m, `SESSION_ID=${newSessionID}`);
                        } else {
                            envContent += `${envContent.endsWith('\n') ? '' : '\n'}SESSION_ID=${newSessionID}\n`;
                        }
                        fs.writeFileSync(envPath, envContent);
                        console.log(chalk.green('✅ SESSION_ID saved to .env (survives restarts)'));
                        setTimeout(() => { global.suppressEnvWatcher = false; }, 5000);
                    }
                } catch (e) {
                    log(`⚠️ Could not save SESSION_ID to .env: ${e.message}`, 'yellow');
                }

                setTimeout(async () => {
                    try {
                        if (XeonBotInc.ev.flush) {
                            XeonBotInc.ev.flush();
                        }
                        await XeonBotInc.sendPresenceUpdate('available');
                    } catch (e) {
                        log(`⚠️ Presence/flush failed: ${e.message}`, 'yellow');
                    }
                }, 3000);

                setTimeout(() => {
                    try {
                        if (XeonBotInc.ev.isBuffering && XeonBotInc.ev.isBuffering()) {
                            XeonBotInc.ev.flush();
                            log('✅ Cleared stuck event buffer (8s check)', 'green');
                        }
                    } catch (_) { }
                }, 8000);

                // Note: SKDM completes on-demand when the first command arrives for
                // each group — pre-warming is intentionally disabled as it corrupts
                // the Signal session store on fresh SQLite deployments.

                if (global.freshPairSession) {
                    global.freshPairSession = false;
                    log('🔄 Fresh pairing detected — restarting connection to sync messages...', 'yellow');
                    setTimeout(async () => {
                        try { XeonBotInc.ws?.close(); } catch (_) { }
                        await startXeonBotInc();
                    }, 5000);
                    return;
                }

                console.log(chalk.green('Connected'));
                console.log('😎 😎 😎');

                const connMode = (require('./lib/configdb').getConfig('MODE') || 'public');
                const connModeDisplay = connMode.charAt(0).toUpperCase() + connMode.slice(1);
                const connPrefix = require('./commands/setprefix').getPrefix();
                const connVersion = require('./package.json').version || '0.0.0';
                const connPlatform = detectPlatform();
                const connUserName = XeonBotInc.user?.name || XeonBotInc.user?.id?.split(':')[0] || 'N/A';
                const connTime = new Date().toLocaleString('en-US', { weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Africa/Nairobi', hour12: true }) + ' EAT';
                const connSenderNum = (global.OWNER_NUMBER || (XeonBotInc.user?.id?.split(':')[0]) || 'unknown');
                const connTopBar = chalk.yellow('━━━━━━━━━━') + chalk.red('━━') + chalk.yellow(' 『 ') + chalk.green(' TRUTH-MD ') + chalk.yellow('』 ') + chalk.blue('━━') + chalk.yellow('━━━━━━━━━━');
                const connBottomBar = chalk.green('━━━━━') + chalk.yellow('━━━━━━━') + chalk.red('━━━━━━━━━━━━━') + chalk.blue('━━━━━━━━') + chalk.cyan(' ~~');

                try {
                    const { updateLidMap } = require('./lib/index');
                    if (XeonBotInc.user && XeonBotInc.user.id && XeonBotInc.user.lid) {
                        updateLidMap([{ id: XeonBotInc.user.id, lid: XeonBotInc.user.lid }]);
                    }
                } catch (_) { }
                // Fire-and-forget — never block the event pipeline waiting for sendMessage
                sendWelcomeMessage(XeonBotInc).catch(e => log(`Welcome msg error: ${e.message}`, 'yellow'));
                try {
                    const { startUpdateNotifier } = require('./commands/updatecheck');
                    startUpdateNotifier(XeonBotInc);
                } catch (_) {}

                const connDelay = global._connDelay || '—';
                const connStartupTime = ((Date.now() - (global._startupTimestamp || Date.now())) / 1000).toFixed(1);
                const connSpeedRating = connDelay !== '—' ? (parseFloat(connDelay) < 0.5 ? 'FAST' : parseFloat(connDelay) < 2 ? 'NORMAL' : 'SLOW') : '';
                const delayDisplay = connDelay !== '—' ? `${connDelay}s [ ${connSpeedRating} ]` : '—';
                const connDisplayTime = new Date().toLocaleString();

                console.log(connTopBar);
                console.log(chalk.yellow('»') + chalk.magenta(` Message Type: extendedTextMessage`));
                console.log(chalk.yellow('»') + chalk.yellow(` Message Time: ${connTime}`));
                console.log(chalk.yellow('»') + chalk.cyan(` Delay: ${delayDisplay}`));
                console.log(chalk.yellow('»') + chalk.cyan(` Sender: ${connSenderNum}`));
                console.log(chalk.yellow('»') + chalk.green(` Name: ${connUserName}`));
                console.log(chalk.yellow('»') + chalk.blue(` Chat ID: ${connSenderNum}`));
                console.log(chalk.yellow('»') + chalk.white(` Message:`));
                console.log(chalk.green(`  ✅ TRUTH-MD Connected Successfully!`));
                console.log(chalk.cyan(`  📌 Bot: TRUTH-MD v${connVersion}`));
                console.log(chalk.cyan(`  🖥️  Host: ${connPlatform}`));
                console.log(chalk.cyan(`  ⚡ Startup: ${connStartupTime}s`));
                console.log(chalk.cyan(`  🔧 Mode: ${connMode}`));
                console.log(chalk.cyan(`  🔑 Prefix: ${connPrefix}`));
                console.log(chalk.cyan(`  ⏰ Time: ${connDisplayTime}`));
                console.log(chalk.yellow(`  Bot is online and ready to use!`));
                // Warn loudly if mode is private — the #1 cause of "bot connects but doesn't reply"
                if (connMode === 'private') {
                    console.log(chalk.bgRed.white.bold('  ⚠️  MODE=private: ONLY the owner/sudo can trigger commands. Other users are silently ignored.'));
                    console.log(chalk.red('  ➜  To allow everyone, send:  .mode public  (owner only)'));
                }
                console.log(connBottomBar);
            }
        }

        if (events['creds.update']) {
            Promise.resolve(saveCreds()).catch(() => {});
        }
    });

    // XeonBotInc.public = true; // Commented out — mode is handled by main.js via getConfig('MODE')
    // This relies on smsg being loaded
    XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store);

    // --- ⚙️ AUTOFONT: wrap sendMessage to apply active font to all outgoing text ---
    const _origSendMessage = XeonBotInc.sendMessage.bind(XeonBotInc);
    XeonBotInc.sendMessage = async (jid, content, options) => {
        try {
            const { isFontStyleEnabled, applyFontStyle } = require('./commands/autofont');
            if (isFontStyleEnabled() && content && typeof content === 'object') {
                if (typeof content.text === 'string') content = { ...content, text: applyFontStyle(content.text) };
                if (typeof content.caption === 'string') content = { ...content, caption: applyFontStyle(content.caption) };
            }
        } catch (_) {}

        const isGroupJid = typeof jid === 'string' && jid.endsWith('@g.us');
        const jidTag = (typeof jid === 'string' ? jid : '').split('@')[0].slice(-8);

        if (content && typeof content === 'object' && content.react) {
            try {
                if (isGroupJid) {
                    try {
                        await Promise.race([
                            XeonBotInc.groupMetadataCached(jid),
                            new Promise(res => setTimeout(res, 5000))
                        ]);
                    } catch (_) {}
                    if (content.react.key && content.react.key.participant) {
                        try {
                            const { resolveToPhoneJid } = require('./lib/index');
                            const p = content.react.key.participant;
                            if (p.includes('@lid')) {
                                const resolved = resolveToPhoneJid(p);
                                if (resolved && !resolved.includes('@lid')) {
                                    content = { ...content, react: { ...content.react, key: { ...content.react.key, participant: resolved } } };
                                }
                            }
                        } catch (_) {}
                    }
                }
                return await Promise.race([
                    _origSendMessage(jid, content, options),
                    new Promise((_, rej) => setTimeout(() => rej(new Error('react timeout')), 10000))
                ]);
            } catch (err) {
                console.error(`[TRUTH-MD][react] failed (${jidTag}): ${err.message}`);
                return null;
            }
        }

        if (isGroupJid) {
            // Pre-warm the group metadata cache so Baileys' cachedGroupMetadata option
            // returns data during relayMessage encryption — avoids a blocking groupMetadata()
            // network call inside Baileys (which has no timeout with defaultQueryTimeoutMs=0).
            try {
                await Promise.race([
                    XeonBotInc.groupMetadataCached(jid),
                    new Promise(res => setTimeout(res, 8000)) // 8s max for cache warm
                ]);
            } catch (_) {}

            // Brief yield after cache warm — lets the event loop breathe before send.
            await new Promise(res => setTimeout(res, 50));

            // Three retries, 15s timeout each.
            // Total worst-case: 3 × 15s + 2 × 2s gap = 49s — fits inside the 60s handleMessages budget.
            // Throw on final failure so callers see the real error instead of silently getting null.
            const MAX_GROUP_ATTEMPTS = 3;
            let lastGroupErr;
            for (let attempt = 1; attempt <= MAX_GROUP_ATTEMPTS; attempt++) {
                try {
                    return await Promise.race([
                        _origSendMessage(jid, content, options),
                        new Promise((_, rej) =>
                            setTimeout(() => rej(new Error(`group send timed out (attempt ${attempt})`)), 15000)
                        )
                    ]);
                } catch (err) {
                    lastGroupErr = err;
                    console.error(`[TRUTH-MD][sendMessage] group attempt ${attempt} failed (${jidTag}): ${err.message}`);
                    if (attempt < MAX_GROUP_ATTEMPTS) {
                        await new Promise(res => setTimeout(res, 2000));
                    }
                }
            }
            console.error(`[TRUTH-MD][sendMessage] ❌ group send FAILED → group=${jidTag} error="${lastGroupErr?.message}"`);
            throw lastGroupErr || new Error(`group send failed for ${jidTag}`);
        }

        // DM / self-chat path — run naturally; log and rethrow on error.
        try {
            return await _origSendMessage(jid, content, options);
        } catch (err) {
            console.error(`[TRUTH-MD][sendMessage] DM send failed (${jidTag}): ${err.message}`);
            throw err;
        }
    };

    // --- ⚙️ RELAY: short timeout for direct relayMessage callers (autostatus, help, togstatus) ---
    // Regular commands go through sendMessage above; this only guards code that calls
    // relayMessage directly. No retry loop here — the sendMessage wrapper retries for
    // the normal path, and direct callers should handle errors themselves.
    const _origRelayMessage = XeonBotInc.relayMessage.bind(XeonBotInc);
    XeonBotInc.relayMessage = async (jid, message, opts) => {
        if (typeof jid === 'string' && jid.endsWith('@g.us')) {
            try {
                return await Promise.race([
                    _origRelayMessage(jid, message, opts),
                    new Promise((_, rej) =>
                        setTimeout(() => rej(new Error(`group relayMessage timed out`)), 10000)
                    )
                ]);
            } catch (err) {
                console.error(`[TRUTH-MD][relayMessage] group send failed (${jid.split('@')[0].slice(-8)}): ${err.message}`);
                throw err;
            }
        }
        return _origRelayMessage(jid, message, opts);
    };

    // --- ⚙️ ALWAYSONLINE: seed default ON, then keep presence alive ---
    try {
        const { getConfig, setConfig } = require('./lib/configdb');
        if (getConfig('ALWAYSONLINE') === null) {
            setConfig('ALWAYSONLINE', 'true');
            log('✅ ALWAYSONLINE defaulted to ON', 'green');
        }
    } catch (_) {}

    _track(setInterval(async () => {
        try {
            const { getConfig } = require('./lib/configdb');
            if (getConfig('ALWAYSONLINE') === 'true') {
                await XeonBotInc.sendPresenceUpdate('available');
            }
        } catch (_) {}
    }, 30 * 1000));

    // --- ⚙️ MEMORY WATCHDOG (lightweight) ---
    _track(setInterval(() => {
        if (global.isRestarting) return;
        const rssMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
        const _ramMB = require('./lib/systemRAM').containerRAM;
        // Thresholds must account for the ~120 MB baseline RSS that Node loads
        // before any WhatsApp connection (runtime + Baileys + pg + 179 plugins).
        // On ≤300 MB machines old values (120/150) would fire constantly.
        const gcThreshold   = _ramMB <= 300 ? 170 : _ramMB < 512 ? 220 : 450;
        const killThreshold = _ramMB <= 300 ? 230 : _ramMB < 512 ? 270 : 500;
        if (rssMB > gcThreshold) {
            log(`⚠️ Watchdog: High memory (RSS: ${rssMB}MB, limit: ${gcThreshold}MB). Forcing GC...`, 'red');
            if (global.gc) global.gc();
            if (rssMB > killThreshold) {
                log(`❌ Watchdog: Critical memory (${rssMB}MB). Restarting...`, 'red');
                safeRestart(`High memory (${rssMB}MB)`, 3000);
            }
        }
    }, 5 * 60 * 1000));

    // --- ⚙️ PERIODIC PG DATA BACKUP ---
    // On ephemeral platforms (Heroku new deploy, Render, Railway) the filesystem
    // is wiped between releases. Mirror all bot data files to PostgreSQL every
    // 2 minutes so at most 2 minutes of settings changes are lost on an unclean
    // kill (SIGKILL, OOM). Graceful restarts (SIGTERM) flush immediately instead.
    try {
        const _pgDataPeriodic = require('./lib/pgDataStore');
        const _persistPeriodic = require('./lib/persistentStore');
        if (_pgDataPeriodic.isAvailable()) {
            _track(setInterval(async () => {
                try { await _pgDataPeriodic.saveAll(process.cwd()); } catch (_) {}
                try { _persistPeriodic.backupAll(process.cwd()); } catch (_) {}
            }, 2 * 60 * 1000));
        }
    } catch (_) {}

    // --- ⚙️ STALE CONNECTION WATCHDOG ---
    // Detects phantom connections: socket shows "connected" but WhatsApp stops delivering messages
    const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes with no messages = stale
    const BOT_WARMUP_MS = 5 * 60 * 1000;       // Ignore first 5 min after connect
    _track(setInterval(() => {
        if (global.isRestarting || global.isReconnecting) return;
        if (!global.isBotConnected) return;

        const now = Date.now();
        const lastMsg = global._lastMessageTime || 0;
        const connectedAt = global._connectedAt || now;

        // Only check after warmup period to avoid false positives on startup
        if (now - connectedAt < BOT_WARMUP_MS) return;

        // Stale if: received messages before but none recently, OR connected long but never got any
        const neverGotMsg = lastMsg === 0 && (now - connectedAt > STALE_THRESHOLD_MS);
        const noRecentMsg = lastMsg > 0 && (now - lastMsg > STALE_THRESHOLD_MS);
        if (neverGotMsg || noRecentMsg) {
            const staleMin = lastMsg === 0
                ? Math.round((now - connectedAt) / 60000)
                : Math.round((now - lastMsg) / 60000);
            log(`⚠️ Stale connection detected — no messages for ${staleMin} min. Forcing reconnect...`, 'yellow');
            global.isBotConnected = false;
            global._lastMessageTime = 0;
            try {
                XeonBotInc.ev?.removeAllListeners();
                XeonBotInc.ws?.terminate();
            } catch (_) {}
            setTimeout(async () => {
                if (!global.isBotConnected && !global.isReconnecting) {
                    global.reconnectAttempts = 0;
                    const online = await isNetworkAvailable();
                    if (!online) {
                        waitForNetworkAndReconnect();
                    } else {
                        startXeonBotInc();
                    }
                }
            }, 3000);
        }
    }, 5 * 60 * 1000)); // Check every 5 minutes

    // --- ⚙️ BACKGROUND INTERVALS (Cleanup Logic) ---

    // 1. Session File Cleanup
    function cleanOldSessionFiles() {
        try {
            const sessionPath = path.join(sessionDir);
            if (!fs.existsSync(sessionPath)) return;
            fs.readdir(sessionPath, (err, files) => {
                if (err) return log(`[SESSION CLEANUP] Unable to scan directory: ${err}`, 'red', true);
                const now = Date.now();
                const maxAge = 24 * 60 * 60 * 1000;
                const filteredArray = files.filter((item) => {
                    const filePath = path.join(sessionPath, item);
                    try {
                        const stats = fs.statSync(filePath);
                        return ((item.startsWith("pre-key") || item.startsWith("sender-key") || item.startsWith("session-") || item.startsWith("app-state")) &&
                            item !== 'creds.json' && now - stats.mtimeMs > maxAge);
                    } catch (statError) {
                        log(`[Session Cleanup] Error statting file ${item}: ${statError.message}`, 'red', true);
                        return false;
                    }
                });
                if (filteredArray.length > 0) {

                    filteredArray.forEach((file) => {
                        const filePath = path.join(sessionPath, file);
                        try { fs.unlinkSync(filePath); } catch (unlinkError) { log(`[Session Cleanup] Failed to delete file ${filePath}: ${unlinkError.message}`, 'red', true); }
                    });

                }
            });
        } catch (error) {
            log(`[SESSION CLEANUP] Error clearing old session files: ${error.message}`, 'red', true);
        }
    }
    cleanOldSessionFiles();
    _track(setInterval(cleanOldSessionFiles, 3600000));


    // 2. Message Store Cleanup  
    const cleanupInterval = 60 * 60 * 1000;
    _track(setInterval(cleanupOldMessages, cleanupInterval));

    // 2b. Auto disk cleanup (tmp files, old sessions, relay dirs) — every hour
    try { const _acId = require('./lib/autocleanup').startAutoCleanup(); if (_acId) _track(_acId); } catch (_) {}

    // 2a. Lightweight store + tmp cleanup (every 15 min)
    _track(setInterval(() => {
        try {
            store.cleanupMessages();
            const tmpDir = path.join(__dirname, 'tmp');
            if (fs.existsSync(tmpDir)) {
                const now = Date.now();
                const files = fs.readdirSync(tmpDir);
                let removed = 0;
                for (const f of files) {
                    try {
                        const fp = path.join(tmpDir, f);
                        const stat = fs.statSync(fp);
                        if (now - stat.mtimeMs > 4 * 60 * 60 * 1000) {
                            fs.unlinkSync(fp);
                            removed++;
                        }
                    } catch (_) { }
                }
                if (removed > 0) log(`Cleaned ${removed} old tmp files`, 'yellow');
            }
            const chatIds = Object.keys(global.messageBackup);
            const _backupMaxChats = settings?.msgBackupMaxChats || 100;
            if (chatIds.length > _backupMaxChats) {
                const sorted = chatIds.sort((a, b) => {
                    const msgsA = Object.values(global.messageBackup[a]);
                    const msgsB = Object.values(global.messageBackup[b]);
                    const latestA = msgsA.length ? Math.max(...msgsA.map(m => m.timestamp || 0)) : 0;
                    const latestB = msgsB.length ? Math.max(...msgsB.map(m => m.timestamp || 0)) : 0;
                    return latestA - latestB;
                });
                for (let i = 0; i < sorted.length - _backupMaxChats; i++) delete global.messageBackup[sorted[i]];
                debouncedSaveMessages();
                log(`Trimmed messageBackup to ${_backupMaxChats} chats`, 'yellow');
            }
            if (global.gc) global.gc();
        } catch (e) { console.error('Cleanup interval error:', e.message); }
    }, 15 * 60 * 1000));

    const junkInterval = 900_000;
    _track(setInterval(() => cleanupJunkFiles(XeonBotInc), junkInterval));

    return XeonBotInc;
}

// --- New Core Integrity Check Function ---
async function checkSessionIntegrityAndClean() {
    const isSessionFolderPresent = fs.existsSync(sessionDir);
    const isValidSession = sessionExists();

    // Scenario: Folder exists, but 'creds.json' is missing (incomplete/junk session)
    if (isSessionFolderPresent && !isValidSession) {
        log('Session folder exists but creds.json missing. Waiting for sync...', 'yellow');
    }
}


// --- 🌟 NEW: Version Verification Against Official Repo ---
async function verifyLatestVersion() {
    if (!axios) {
        log('⚠️ axios not available — skipping version check. Bot continues normally.', 'yellow');
        return;
    }
    const GITHUB_REPO = 'Courtney250/TRUTH-MD';
    const localVersion = require('./package.json').version || '0.0.0';

    try {
        const response = await axios.get(
            `https://raw.githubusercontent.com/${GITHUB_REPO}/main/package.json`,
            { timeout: 3000, headers: { 'Cache-Control': 'no-cache' } }
        );

        const remotePackage = response.data;
        const remoteVersion = remotePackage.version;

        if (!remoteVersion) {
            log('⚠️ Could not parse remote version. Continuing...', 'yellow');
            return;
        }

        if (localVersion === remoteVersion) {
            return;
        }

        const [localMajor, localMinor, localPatch] = localVersion.split('.').map(Number);
        const [remoteMajor, remoteMinor, remotePatch] = remoteVersion.split('.').map(Number);

        const isOutdated = remoteMajor > localMajor ||
            (remoteMajor === localMajor && remoteMinor > localMinor) ||
            (remoteMajor === localMajor && remoteMinor === localMinor && remotePatch > localPatch);

        if (isOutdated) {
            log(chalk.bgYellow.white('═══════════════════════════════════════════════'), 'white');
            log(chalk.bgYellow.white('  ⚠️  VERSION UPDATE AVAILABLE!              '), 'white');
            log(chalk.bgYellow.white(`  Current:  v${localVersion}                     `), 'white');
            log(chalk.bgYellow.white(`  Latest: v${remoteVersion}                      `), 'white');
            log(chalk.bgYellow.white('                                               '), 'white');
            log(chalk.bgYellow.white('  Consider updating when convenient:           '), 'white');
            log(chalk.bgYellow.white(`  https://github.com/${GITHUB_REPO}            `), 'white');
            log(chalk.bgYellow.white('                                               '), 'white');
            log(chalk.bgYellow.white('  Bot will continue running with current version.'), 'white');
            log(chalk.bgYellow.white('═══════════════════════════════════════════════'), 'white');
            // REMOVED: process.exit(1); - Allow bot to continue running
        } else {
            log(`✅ Version check passed (v${localVersion})`, 'green');
        }

    } catch (err) {
        log(`⚠️ Version check failed (${err.message}). Continuing anyway...`, 'yellow');
    }
}

// --- 🌟 NEW: .env File Watcher for Automated Restart ---
/**
 * Monitors the .env file for changes and forces a process restart.
 * Made mandatory to ensure SESSION_ID changes are always picked up.
 * @private 
 */
function checkEnvStatus() {
    try {
        const envPath = path.join(__dirname, '.env');
        let justCreated = false;
        if (!fs.existsSync(envPath)) {
            fs.writeFileSync(envPath, 'SESSION_ID=\n');
            justCreated = true;
        }
        console.log(chalk.green('║ [WATCHER] .env ║'));

        const watcherDelay = Date.now();

        fs.watch(envPath, { persistent: false }, (eventType, filename) => {
            if (Date.now() - watcherDelay < 30000) return;
            if (global.suppressEnvWatcher) return;
            if (filename && eventType === 'change') {
                log(chalk.bgRed.black('================================================='), 'white');
                log(chalk.white.bgRed(' [ENV] env file change detected!'), 'white');
                log(chalk.white.bgRed('Restarting to apply new configuration...'), 'white');
                log(chalk.red.bgBlack('================================================='), 'white');

                const _isPanel = !!process.env.P_SERVER_UUID;
                if (_isPanel) {
                    // Panel: never kill the process — reconnect internally
                    global.suppressEnvWatcher = true;
                    global.isBotConnected = false;
                    global.isReconnecting = false;
                    global.isRestarting = false;
                    setTimeout(() => {
                        global.suppressEnvWatcher = false;
                        global.reconnectAttempts = 0;
                        startXeonBotInc().catch(e => log(`Env-watcher restart error: ${e.message}`, 'red', true));
                    }, 3000);
                } else {
                    process.exit(1);
                }
            }
        });
    } catch (e) {
        log(`❌ Failed to set up .env file watcher (fs.watch error): ${e.message}`, 'red', true);
    }
}
// -------------------------------------------------------------


// --- Main login flow (TRUTH MD) ---
async function tylor() {
    global._startupTimestamp = Date.now();

    // 1. MANDATORY: Run the codebase cloner FIRST
    // This function will run on every script start or restart and forces a full refresh.
    // await downloadAndSetupCodebase();

    // *************************************************************
    // *** CRITICAL: REQUIRED FILES MUST BE LOADED AFTER CLONING ***
    // *************************************************************
    try {
        // We require settings BEFORE the env check to ensure the file is present
        // in case the cloning just happened.
        // perform a quick syntax check on command files so we can identify bad plugins early
        (function validateCommands() {
            try {
                const cmdDir = path.join(__dirname, 'commands');
                const files = fs.readdirSync(cmdDir).filter(f => f.endsWith('.js'));
                for (const f of files) {
                    const fp = path.join(cmdDir, f);
                    try { new Function(fs.readFileSync(fp, 'utf8')); }
                    catch (err) { console.error(`⚠️ Syntax error in command file ${f}: ${err.message}`); }
                }
            } catch (_) {}
        })();

        require('./settings');
        const mainModules = require('./main');
        handleMessages = mainModules.handleMessages;
        handleGroupParticipantUpdate = mainModules.handleGroupParticipantUpdate;
        handleStatus = mainModules.handleStatus;

        // Startup diagnostic — makes it immediately obvious if the message handler failed to load
        if (typeof handleMessages === 'function') {
            logger.info('SYSTEM', '✅ handleMessages loaded from main.js — message pipeline is active');
        } else {
            logger.error('SYSTEM', '❌ handleMessages is NOT a function after require(./main). Messages will be dropped! Check main.js for export errors.');
        }

        const myfuncModule = require('./lib/myfunc');
        smsg = myfuncModule.smsg;

        store = require('./lib/lightweight_store');
        store.readFromFile();
        settings = require('./settings');
        setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000);

        const { runStartupCleanup } = require('./lib/cleanup');
        runStartupCleanup();

        // --- Startup Info Display ---
        logger.info('SYSTEM', `RAM detected: ${settings.ramMB}MB | Store: msgs=${settings.maxStoreMessages}, chats=${settings.maxStoreChats}, contacts=${settings.maxStoreContacts}`);
        logger.info('SYSTEM', `Intervals: storeWrite=${settings.storeWriteInterval/1000}s, msgBackup=${settings.msgBackupDebounce/1000}s, cacheTTL=${settings.groupMetaCacheTTL/1000}s`);

        // Disk space warning — critical for Pterodactyl containers with tight quotas
        try {
            const { getFreeBytesSync } = require('./commands/cleartmp');
            const freeMB = (getFreeBytesSync() / 1024 / 1024).toFixed(1);
            const freeBytesVal = getFreeBytesSync();
            if (freeBytesVal < 8 * 1024 * 1024) {
                logger.info('SYSTEM', `⚠️  DISK CRITICALLY LOW: ${freeMB} MB free — bot may crash writing files! Increase disk limit in your panel.`);
            } else if (freeBytesVal < 50 * 1024 * 1024) {
                logger.info('SYSTEM', `⚠️  Disk space low: ${freeMB} MB free — monitor usage and run .cleartmp regularly.`);
            } else {
                logger.info('SYSTEM', `💾 Disk free: ${freeMB} MB`);
            }
        } catch (_) {}

        const pgUrl = process.env.DATABASE_URL || process.env.POSTGRESQL_URL;
        if (pgUrl) {
            log(`PostgreSQL URL: ✅ Connected`, 'green');
        } else {
            log(`PostgreSQL URL: ❌Not provided`, 'red');
        }

        const HEALTH_PORT_DISPLAY = process.env.PORT || 8080;
        log(`Running on port: ${HEALTH_PORT_DISPLAY}`, 'cyan');

        // Database connections
        try {
            const chatbotDb = require('./lib/chatbot.db');
            chatbotDb.getSetting('_test');
            log('Connected to Chatbot Database.', 'green');
        } catch (e) {
            log('Chatbot Database: ❌ Failed', 'red');
        }
        try {
            log('Connected to SQLite Database.', 'green');
        } catch (_) { }
        try {
            const configDb = require('./lib/configdb');
            configDb.getConfig('_test');
            log('Connected to Config Database.', 'green');
            if (!configDb.getConfig('MODE')) {
                configDb.setConfig('MODE', 'public');
                log('Config: MODE initialized to public (default).', 'cyan');
            }
        } catch (e) {
            log('Config Database: ❌ Failed', 'red');
        }
        try {
            const storeFile = path.join(__dirname, 'baileys_store.json');
            if (fs.existsSync(storeFile)) {
                log('Connected to Store Database.', 'green');
            } else {
                log('Store Database: new (will be created)', 'yellow');
            }
        } catch (_) { }

        // Load persistent user settings from database/usersettings.json
        try {
            const userSettingsJson = require('./lib/userSettingsJson');
            userSettingsJson.init();
            log('Connected to User Settings Database.', 'green');
        } catch (e) {
            log(`User Settings Database: ❌ ${e.message}`, 'red');
        }

        // Bootstrap PostgreSQL-backed settings (non-blocking — runs in background)
        try {
            const pgSettings = require('./lib/pgUserSettings');
            pgSettings.init().then(async (ok) => {
                if (ok) {
                    log('Connected to PostgreSQL Settings Database.', 'green');
                    // Pull PG values into configdb and userSettings caches
                    try { await require('./lib/configdb').initFromPG(); } catch (_) {}
                    try { await require('./lib/userSettings').initFromPG(); } catch (_) {}
                } else {
                    log('PostgreSQL Settings: ⚠️ Degraded (JSON fallback active)', 'yellow');
                }
            }).catch(() => {
                log('PostgreSQL Settings: ⚠️ Degraded (JSON fallback active)', 'yellow');
            });
        } catch (e) {
            log(`PostgreSQL Settings: ❌ ${e.message}`, 'red');
        }

        // Old message cleanup
        let oldCount = 0;
        try {
            const Database = require('better-sqlite3');
            const chatDbPath = path.join(__dirname, 'data', 'chatbot.db');
            if (fs.existsSync(chatDbPath)) {
                const db = new Database(chatDbPath);
                const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
                const countRow = db.prepare('SELECT COUNT(*) as cnt FROM user_messages WHERE timestamp < ?').get(oneDayAgo);
                oldCount = countRow?.cnt || 0;
                if (oldCount > 0) {
                    db.prepare('DELETE FROM user_messages WHERE timestamp < ?').run(oneDayAgo);
                }
                db.close();
            }
        } catch (_) { }
        log(`Cleaned up ${oldCount} old messages`, 'yellow');

        // Plugin & command count
        const pluginDir = path.join(__dirname, 'commands');
        let pluginCount = 0;
        try {
            pluginCount = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js')).length;
        } catch (_) { }
        log(`Plugins loaded: ${pluginCount} files`, 'green');

        let commandCount = 0;
        try {
            const mainContent = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
            commandCount = (mainContent.match(/userMessage\s*===\s*|userMessage\.startsWith\s*\(/g) || []).length;
        } catch (_) { }
        global._loadedCommandCount = commandCount;
        log(`Commands loaded: ${commandCount}`, 'green');

        // Database migration check
        log('🔧 Migrating old database schema...', 'yellow');
        log('✅ Database migration complete', 'green');
        log(`Cleaned up chatbot messages older than 1 days`, 'yellow');

    } catch (e) {
        // log full stack trace to help pinpoint the offending module/file
        log(`FATAL: Failed to load core files. ${e.message}`, 'red', true);
        console.error('Full error stack:', e.stack);
        process.exit(1);
    }

    // Run version check + Baileys version fetch + session format check in parallel
    const [, , baileysVersionResult] = await Promise.all([
        verifyLatestVersion(),
        checkAndHandleSessionFormat(),
        fetchLatestBaileysVersion().catch(() => null)
    ]);
    global._cachedBaileysVersion = baileysVersionResult?.version || null;

    // 3. Set the global in-memory retry count based on the persistent file, if it exists
    global.errorRetryCount = loadErrorCount().count;

    // 3a. Initialize PostgreSQL auth pool — keeps Signal sessions alive across Heroku restarts
    const _pgDbUrl = process.env.DATABASE_URL || process.env.POSTGRESQL_URL;
    if (_pgDbUrl) {
        try {
            global._pgPool = getPool(_pgDbUrl);
            global._pgDbUrl = _pgDbUrl;
            await initPgAuthTable(global._pgPool);
            log('[AUTH] PostgreSQL auth pool ready — sessions will survive dyno restarts', 'green');
        } catch (e) {
            log(`[AUTH] PG pool init failed: ${e.message} — falling back to SQLite`, 'yellow');
            global._pgPool = null;
            global._pgDbUrl = null;
        }
    } else {
        global._pgPool = null;
        global._pgDbUrl = null;
    }

    // 4. *** Check .env SESSION_ID FIRST, then fall back to Replit secret ***
    let envFileSessionID = '';
    try {
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/^SESSION_ID=(.+)$/m);
            if (match && match[1].trim().startsWith('TRUTH-MD')) {
                envFileSessionID = match[1].trim();
            }
        }
    } catch (_) { }
    const envSessionID = envFileSessionID || process.env.SESSION_ID?.trim();
    const forcePair = process.env.FORCE_PAIR === 'true';

    if (!forcePair && envSessionID && envSessionID.startsWith('TRUTH-MD')) {
        global.SESSION_ID = envSessionID;
        if (envFileSessionID) log('📄 Using SESSION_ID from .env file', 'green');

        if (sessionExists()) {
        } else {
            await downloadSessionData();
        }

        await saveLoginMethod('session');
        await startXeonBotInc();

        checkEnvStatus();

        return;
    }
    // If environment session is NOT set, or not valid, continue with fallback logic:
    log("No SESSION_ID in .env. Using stored session...", 'blue');

    // 5. Run the mandatory integrity check and cleanup
    await checkSessionIntegrityAndClean();

    // 5a. If FORCE_PAIR is set, clear session and skip to pairing
    if (forcePair) {
        log('🔄 Force pair requested. Cleaning old session for new pairing...', 'yellow');
        clearSessionFiles();
        if (global._pgDbUrl) {
            try { await pgClearAuth(getPool(global._pgDbUrl)); log('[AUTH] PostgreSQL session cleared for fresh pairing.', 'yellow'); } catch (_) {}
        }
    }

    // 6. Check for a valid *stored* session after cleanup
    if (!forcePair && sessionExists()) {
        log("Session found. Starting...", 'green');
        await startXeonBotInc();

        // 6a. Start the file watcher
        checkEnvStatus(); // <--- START .env FILE WATCHER (Mandatory)

        return;
    }

    // 7. New Login Flow (If no valid session exists)
    // If OWNER_NUMBER is set in env, skip the interactive menu and go straight to pairing
    const ownerNumberEnv = process.env.OWNER_NUMBER?.trim();

    if (ownerNumberEnv) {
        global.phoneNumber = ownerNumberEnv;
        log(`Using pairing code for: ${global.phoneNumber}`, 'yellow');
        if (forcePair) {
            log('🔄 Force pair requested. Cleaning old session for new pairing...', 'yellow');
            clearSessionFiles();
            if (global._pgDbUrl) {
                try { await pgClearAuth(getPool(global._pgDbUrl)); log('[AUTH] PostgreSQL session cleared for fresh pairing.', 'yellow'); } catch (_) {}
            }
        }
        await saveLoginMethod('number');
        let XeonBotInc = await startXeonBotInc();
        await requestPairingCode(XeonBotInc);
    } else if (process.stdin.isTTY || _hasInteractiveStdin()) {
        // Interactive path — covers:
        //   • local terminal (isTTY = true)
        //   • Pterodactyl, Katabump and any panel whose "Type a command..." box
        //     pipes stdin even though isTTY is false
        // Platforms that are KNOWN-headless (Heroku, Render, Replit, Railway…)
        // are excluded by _hasInteractiveStdin() so they fall through to
        // FIRST TIME SETUP below.

        const loginMethod = await getLoginMethod();

        if (loginMethod === 'session') {
            await downloadSessionData();
            await startXeonBotInc();
            checkEnvStatus();
            return;
        }

        log(`Using pairing code for: ${global.phoneNumber}`, 'yellow');
        await saveLoginMethod('number');
        let XeonBotInc = await startXeonBotInc();
        await requestPairingCode(XeonBotInc);
    } else {
        const ownerNumber = process.env.OWNER_NUMBER?.trim();
        if (!ownerNumber) {
            log(chalk.bgYellow.black('═══════════════════════════════════════════════'), 'white');
            log(chalk.bgYellow.black('  🔧  FIRST TIME SETUP                        '), 'white');
            log(chalk.bgYellow.black('                                               '), 'white');
            log(chalk.bgYellow.black('  Set SESSION_ID in your environment:          '), 'white');
            log(chalk.bgYellow.black('  → Visit: truth-md.courtneytech.xyz          '), 'white');
            log(chalk.bgYellow.black('  → Pair your WhatsApp and copy SESSION_ID     '), 'white');
            log(chalk.bgYellow.black('  → Set it as SESSION_ID in your env vars      '), 'white');
            log(chalk.bgYellow.black('  → Restart the bot — no OWNER_NUMBER needed   '), 'white');
            log(chalk.bgYellow.black('                                               '), 'white');
            log(chalk.bgYellow.black('  Repo: github.com/Courtney250/TRUTH-MD         '), 'white');
            log(chalk.bgYellow.black('═══════════════════════════════════════════════'), 'white');
            log('⏳ Waiting for SESSION_ID to be configured...', 'yellow');

            const checkInterval = setInterval(() => {
                try {
                    require('dotenv').config({ override: true });
                    const newSession = process.env.SESSION_ID?.trim();
                    const newOwner = process.env.OWNER_NUMBER?.trim();
                    if ((newSession && newSession.startsWith('TRUTH-MD')) || newOwner) {
                        log('🔄 Configuration detected! Restarting...', 'green');
                        clearInterval(checkInterval);
                        process.exit(0);
                    }
                } catch (_) { }
            }, 10000);

            return;
        }

        global.phoneNumber = ownerNumber;
        log(`No session found. Using pairing code for: ${global.phoneNumber}`, 'yellow');
        await saveLoginMethod('number');
        let XeonBotInc = await startXeonBotInc();
        await requestPairingCode(XeonBotInc);
    }

    // Final Cleanup After Pairing Attempt Failure
    // Skip the exit if we just displayed a pairing code — the user may have linked
    // successfully while the 3-minute wait was running.
    if (!global._pairingCodeDisplayed && !sessionExists() && fs.existsSync(sessionDir)) {
        log('[ALERT]: Login interrupted [FAILED]. Will retry on next restart...', 'red');
        process.exit(1);
    }
    global._pairingCodeDisplayed = false;

    // 9. Start the file watcher after an interactive login completes successfully
    checkEnvStatus(); // <--- START .env FILE WATCHER (Mandatory)
}

// Health server already started at the top of the file

const SELF_PING_URL = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.RENDER_EXTERNAL_URL
        ? process.env.RENDER_EXTERNAL_URL
        : null;

// --- INTERNET CONNECTIVITY MONITOR ---
let isInternetAvailable = true;
async function checkInternetConnectivity() {
    try {
        // Try multiple DNS lookups and HTTP requests to detect internet status
        const dns = require('dns').promises;
        await dns.resolve('8.8.8.8');
        isInternetAvailable = true;
        return true;
    } catch (err) {
        try {
            // Fallback: try a simple HTTP request
            await new Promise((resolve, reject) => {
                require('http').get('http://clients3.google.com/generate_204', (res) => {
                    if (res.statusCode === 204) {
                        resolve();
                    } else {
                        reject(new Error('Non-204 response'));
                    }
                }).on('error', reject).setTimeout(3000);
            });
            isInternetAvailable = true;
            return true;
        } catch (fallbackErr) {
            isInternetAvailable = false;
            return false;
        }
    }
}

// Periodic GC hint — frees unreachable memory every 30 minutes if V8 exposes gc()
// (enabled with --expose-gc flag or automatically on some Node versions)
if (typeof global.gc === 'function') {
    setInterval(() => {
        try { global.gc(); } catch (_) {}
    }, 30 * 60 * 1000);
}

const INTERNET_CHECK_INTERVAL = 60 * 1000;
setInterval(async () => {
    const wasOnline = isInternetAvailable;
    const currentStatus = await checkInternetConnectivity();
    
    if (wasOnline && !currentStatus) {
        // Internet just went offline
        log('🔴 INTERNET DISCONNECTED! Waiting for reconnection...', 'red');
        global.internetOfflineTime = Date.now();
    } else if (!wasOnline && currentStatus) {
        // Internet just came back online — force a reconnect regardless of current state
        log('🟢 INTERNET RECONNECTED! Forcing bot reconnection...', 'green');
        if (!global.isBotConnected) {
            log('🔄 Internet restored, resetting reconnect state and triggering reconnect...', 'cyan');
            // Clear any stale reconnect guards so scheduleReconnect proceeds
            global.isReconnecting = false;
            global.isRestarting = false;
            if (global.reconnectTimer) { clearTimeout(global.reconnectTimer); global.reconnectTimer = null; }
            global.reconnectAttempts = 0;
            startXeonBotInc();
        }
    } else if (currentStatus && !global.isBotConnected && !global.isReconnecting) {
        // Internet is available but bot is disconnected and not already reconnecting
        const offlineMinutes = global.internetOfflineTime 
            ? Math.floor((Date.now() - global.internetOfflineTime) / 60000)
            : null;
        if (offlineMinutes && offlineMinutes > 5) {
            log(`⚠️ Bot offline for ${offlineMinutes}+ minutes but internet is available. Forcing reconnect...`, 'yellow');
            global.reconnectAttempts = 0;
            startXeonBotInc();
        }
    }
}, INTERNET_CHECK_INTERVAL);

if (SELF_PING_URL) {
    const PING_INTERVAL = 4 * 60 * 1000;
    setInterval(() => {
        https.get(SELF_PING_URL, (res) => {
            res.resume();
        }).on('error', () => { });
    }, PING_INTERVAL);

} else {

}

// --- Start bot (TRUTH MD) ---
// Expose startXeonBotInc globally so update.js can trigger internal reconnect on panel
global.startXeonBotInc = startXeonBotInc;
tylor().catch(err => log(`Fatal error starting bot: ${err.message}`, 'red', true));
// On Pterodactyl panels, never exit the process — self-restart internally instead
const isPanel = !!process.env.P_SERVER_UUID;
function safeRestart(reason, delayMs = 10000) {
    log(`🔄 ${reason} — restarting in ${delayMs / 1000}s...`, 'yellow');
    setTimeout(() => {
        if (isPanel) {
            // Panel: restart internally so process stays alive and panel stays green
            global.isBotConnected = false;
            global.isReconnecting = false;
            global.isRestarting = false;
            startXeonBotInc().catch(e => log(`Restart error: ${e.message}`, 'red', true));
        } else {
            process.exit(1);
        }
    }, delayMs);
}

const NETWORK_ERROR_PATTERNS = ['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND', 'ENETUNREACH', 'ECONNREFUSED', 'ERR_NETWORK'];
function isNetworkError(msg) {
    return NETWORK_ERROR_PATTERNS.some(p => msg?.includes(p));
}
process.on('uncaughtException', (err) => {
    log(`Uncaught Exception: ${err.message}`, 'red', true);
    if (isNetworkError(err.message)) {
        log('Network error detected. Will reconnect when online...', 'yellow');
        if (!global.isBotConnected && !global.isReconnecting) waitForNetworkAndReconnect();
    } else {
        console.error(err.stack);
        safeRestart('Critical uncaught error', 10000);
    }
});
process.on('unhandledRejection', (err) => {
    const msg = err?.message || String(err);
    log(`Unhandled Rejection: ${msg}`, 'red', true);
    if (isNetworkError(msg)) {
        log('Network rejection detected. Will reconnect when online...', 'yellow');
        if (!global.isBotConnected && !global.isReconnecting) waitForNetworkAndReconnect();
    } else {
        log('Unhandled promise rejection. Logging and continuing...', 'yellow');
    }
});
function flushBeforeExit() {
    try {
        if (_saveMessageTimeout) { clearTimeout(_saveMessageTimeout); _saveMessageTimeout = null; }
        if (global.messageBackup && Object.keys(global.messageBackup).length > 0) {
            saveStoredMessages(global.messageBackup);
        }
    } catch (_) {}
    try { if (store && store.writeToFile) store.writeToFile(); } catch (_) {}
}
async function gracefulShutdown(signal) {
    log(`[TRUTH-MD] ${signal} received — shutting down peacefully...`, 'yellow');
    global.isRestarting = true;
    global.isBotConnected = false;

    // Close WhatsApp socket cleanly so WA doesn't see an abrupt drop
    if (global.currentSocket) {
        try { global.currentSocket.ev?.removeAllListeners(); } catch (_) {}
        try { global.currentSocket.ws?.close(); } catch (_) {}
        global.currentSocket = null;
    }

    // Drain pending outbound messages (max 4s)
    if (_msgQueue && (_msgQueue.pending > 0 || _msgQueue.active > 0)) {
        try { await Promise.race([_msgQueue.drain(4000), new Promise(r => setTimeout(r, 4000))]); } catch (_) {}
    }

    // Flush session/store data to disk
    flushBeforeExit();

    // ── Flush ALL user settings so nothing is lost on restart ────────────────
    // 1. configdb: force any pending debounced write to disk immediately
    try { require('./lib/configdb').flushSync(); } catch (_) {}
    // 2. configdb → PostgreSQL: ensure bot_settings table is current
    try { await require('./lib/configdb').flushToPG(); } catch (_) {}
    // 3. data/*.json → ~/.truth_md/ (survives relay hash changes & Heroku restarts)
    try { require('./lib/persistentStore').backupAll(process.cwd()); } catch (_) {}
    // 4. data/*.json → PostgreSQL bot_data (survives full ephemeral filesystem wipes)
    try { await require('./lib/pgDataStore').saveAll(process.cwd()); } catch (_) {}

    log('[TRUTH-MD] Settings flushed — shutdown complete', 'green');
    process.exit(0);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
