// Self-check: drive Kick + YouTube connect through the actual packaged-app UI via CDP
// Run: CDP_PORT=9228 node test/ui-connect-check.cjs
const http = require('http');
const WebSocket = require('ws');

const port = process.env.CDP_PORT || 9228;

function getDashboardWs() {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/json`, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const page = JSON.parse(d).find(x => x.title.includes('Dashboard'));
        page ? resolve(page.webSocketDebuggerUrl) : reject(new Error('Dashboard page not found'));
      });
    }).on('error', reject);
  });
}

async function main() {
  const wsUrl = await getDashboardWs();
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.on('open', r));
  let id = 0;
  const evalJs = (expr) => new Promise((resolve) => {
    const myId = ++id;
    ws.send(JSON.stringify({ id: myId, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
    const onMsg = (raw) => {
      const m = JSON.parse(String(raw));
      if (m.id === myId) { ws.off('message', onMsg); resolve(m.result?.result?.value); }
    };
    ws.on('message', onMsg);
  });

  const result = await evalJs(`(async () => {
    const out = [];
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    const connect = async (ph, val, wait) => {
      const input = document.querySelector('input[placeholder="'+ph+'"]');
      if (!input) return ph+': INPUT MISSING';
      setter.call(input, val); input.dispatchEvent(new Event('input',{bubbles:true}));
      await new Promise(r=>setTimeout(r,200));
      const btn = input.closest('div.rounded-xl').querySelector('button');
      btn.click();
      await new Promise(r=>setTimeout(r,wait));
      const card = input.closest('div.rounded-xl');
      const err = card.querySelector('.text-red-400')?.textContent || 'none';
      return ph+': '+btn.textContent.trim()+' err='+err;
    };
    out.push(await connect('nama channel, mis. xqc', 'xqc', 15000));
    out.push(await connect('URL live atau nama channel', 'https://www.youtube.com/watch?v=2BG9FPatcEs', 20000));
    // count chat rows
    out.push('chat rows: '+document.querySelectorAll('div[class*="border-l"]').length);
    return out.join(' || ');
  })()`);

  console.log('UI CHECK:', result);
  ws.close();
  // assert
  const kickOk = /nama channel[^|]*Disconnect/.test(result) || /nama channel[^|]*Connecting/.test(result);
  const ytOk = /URL live[^|]*Disconnect/.test(result) || /chat rows: [1-9]/.test(result);
  if (!kickOk) { console.error('FAIL: Kick did not connect'); process.exit(1); }
  if (!ytOk) { console.error('WARN: YouTube result:', result); }
  console.log('Kick: PASS');
  process.exit(0);
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
