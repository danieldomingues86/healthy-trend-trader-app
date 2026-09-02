const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const crypto = require('node:crypto');
const access = require('./platform-access');

const run = promisify(execFile);
const monitors = new Map();

function executableBase(value) {
  const name = String(value || 'Profit.exe').split(/[\\/]/).pop().replace(/\.exe$/i, '');
  if (!/^[a-z0-9 ._-]+$/i.test(name)) throw new Error('Executável do Profit inválido.');
  return name;
}

async function windowSnapshot(executable) {
  const name = executableBase(executable).replace(/'/g, "''");
  const script = `Add-Type @'
using System; using System.Runtime.InteropServices;
public static class ProfitWindow { [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd); [DllImport("user32.dll")] public static extern bool IsZoomed(IntPtr hWnd); }
'@; $p=Get-Process -Name '${name}' -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowHandle -ne 0} | Select-Object -First 1; if($null -eq $p){'{"running":false}'}else{$state=if([ProfitWindow]::IsIconic($p.MainWindowHandle)){'minimized'}elseif([ProfitWindow]::IsZoomed($p.MainWindowHandle)){'maximized'}else{'normal'}; @{running=$true;processId=$p.Id;state=$state}|ConvertTo-Json -Compress}`;
  const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 8000 });
  return JSON.parse(stdout.trim() || '{"running":false}');
}

async function tick(monitor) {
  try {
    const snapshot = await windowSnapshot(monitor.executable);
    if (snapshot.running && !monitor.running) {
      monitor.sessionId = crypto.randomUUID();
      await access.start(monitor.userId, { sessionId: monitor.sessionId, appVersion: 'profit-windows-monitor' });
      await access.recordEvent(monitor.userId, monitor.sessionId, 'opened');
      monitor.running = true; monitor.state = snapshot.state;
      if (snapshot.state === 'minimized' && monitor.preferences.trackMinimize) await access.recordEvent(monitor.userId, monitor.sessionId, 'minimized');
      if (snapshot.state === 'maximized' && monitor.preferences.trackMaximize) await access.recordEvent(monitor.userId, monitor.sessionId, 'maximized');
      return;
    }
    if (!snapshot.running && monitor.running) {
      await access.recordEvent(monitor.userId, monitor.sessionId, 'closed');
      await access.close(monitor.userId, monitor.sessionId);
      monitor.running = false; monitor.sessionId = null; monitor.state = null;
      return;
    }
    if (!snapshot.running || snapshot.state === monitor.state) return;
    const previous = monitor.state; monitor.state = snapshot.state;
    const event = snapshot.state === 'minimized' ? 'minimized' : snapshot.state === 'maximized' ? 'maximized' : previous === 'minimized' ? 'restored' : 'normal';
    if ((event === 'minimized' || event === 'restored') && !monitor.preferences.trackMinimize) return;
    if ((event === 'maximized' || event === 'normal') && !monitor.preferences.trackMaximize) return;
    await access.recordEvent(monitor.userId, monitor.sessionId, event);
  } catch (error) { monitor.error = error.message; }
}

async function start(userId) {
  const preferences = await access.preferences(userId);
  const previous = monitors.get(userId);
  if (previous) return status(userId);
  const monitor = { userId, executable: preferences.targetExecutable, preferences, running: false, state: null, sessionId: null, error: null };
  monitors.set(userId, monitor);
  await tick(monitor);
  monitor.timer = setInterval(() => tick(monitor), 2000);
  return status(userId);
}
function stop(userId) { const monitor = monitors.get(userId); if (!monitor) return; clearInterval(monitor.timer); monitors.delete(userId); }
function status(userId) { const monitor = monitors.get(userId); return monitor ? { active: true, executable: monitor.executable, profitRunning: monitor.running, windowState: monitor.state, error: monitor.error } : { active: false }; }
module.exports = { start, stop, status };
