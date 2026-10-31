// node tools/make-icons.cjs  — renders tools/icon.svg (or tools/logo-icon.svg if present) into PWA icons (needs: npm i -D playwright)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const src = fs.existsSync(path.join(__dirname, 'logo-icon.svg')) ? 'logo-icon.svg' : 'icon.svg';
  const svg = fs.readFileSync(path.join(__dirname, src), 'utf8');
  const b = await chromium.launch(); const p = await b.newPage();
  const out = path.join(__dirname, '..', 'public', 'icons');
  const jobs = [['icon-512.png', 512, 0], ['icon-192.png', 192, 0], ['apple-touch-icon.png', 180, 0], ['maskable-512.png', 512, 0.12]];
  for (const [name, size, padRatio] of jobs) {
    const pad = Math.round(size * padRatio);
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:#0B2A47"><div style="width:${size}px;height:${size}px;display:grid;place-items:center">
      <div style="width:${size - pad * 2}px;height:${size - pad * 2}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></div></body></html>`);
    await p.screenshot({ path: path.join(out, name), omitBackground: false });
  }
  fs.copyFileSync(path.join(__dirname, src), path.join(out, 'icon.svg'));
  await b.close(); console.log('icons from', src);
})();
