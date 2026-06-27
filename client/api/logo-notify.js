'use strict';
const https      = require('https');
const nodemailer = require('nodemailer');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method: 'GET' };
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.end();
  });
}

function httpsPostJson(url, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };
    const req = https.request(opts, res => {
      // Apps Script renvoie des redirections (302) — suivre manuellement
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsPostJson(res.headers.location, body).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ─── Nodemailer transport ─────────────────────────────────────────────────────

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
  });
}

// ─── Sanitize restaurant name (anti-injection) ────────────────────────────────

function sanitizeName(s) {
  if (typeof s !== 'string') return 'Client';
  return s.replace(/[<>&"'`]/g, '').slice(0, 80).trim() || 'Client';
}

// ─── Handler principal ────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { rid, logoUrl, restaurantName } = req.body || {};

    // Validation
    if (!rid || typeof rid !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(rid))
      return res.status(400).json({ error: 'Invalid rid' });
    if (!logoUrl || typeof logoUrl !== 'string' ||
        !logoUrl.startsWith('https://res.cloudinary.com/dowi189l9/'))
      return res.status(400).json({ error: 'Invalid logoUrl' });

    const safeName = sanitizeName(restaurantName);
    const dateStr  = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filename = `${rid}_${dateStr}.png`;

    // 1. Télécharger le logo depuis Cloudinary
    let imgBuffer;
    try {
      imgBuffer = await httpsGet(logoUrl);
    } catch (e) {
      console.error('[logo-notify] Download failed:', e.message);
      return res.status(502).json({ error: 'Logo download failed' });
    }

    let driveSuccess = false;

    // 2. Envoyer vers Apps Script (Google Drive gratuit) — si configuré
    const scriptUrl    = process.env.DRIVE_SCRIPT_URL;
    const scriptSecret = process.env.DRIVE_SCRIPT_SECRET;

    if (scriptUrl && scriptSecret) {
      try {
        const scriptRes = await httpsPostJson(scriptUrl, {
          secret:      scriptSecret,
          filename,
          imageBase64: imgBuffer.toString('base64')
        });
        const parsed = JSON.parse(scriptRes.body);
        driveSuccess = parsed.ok === true;
        if (!driveSuccess) console.error('[logo-notify] Apps Script error:', scriptRes.body.slice(0, 200));
      } catch (e) {
        console.error('[logo-notify] Apps Script call failed:', e.message);
        // Ne pas bloquer — email sera quand même envoyé
      }
    } else {
      console.log('[logo-notify] DRIVE_SCRIPT_URL absent — Drive ignoré');
    }

    // 3. Email à l'admin avec logo en pièce jointe inline
    const adminEmail = process.env.ADMIN_EMAIL || 'gennextcontact@gmail.com';
    const driveNote  = driveSuccess
      ? `<p style="margin:8px 0;font-size:0.85rem;color:#4caf84">✅ Logo enregistré dans Google Drive → dossier <strong>Logos Clients / Nouveau</strong> (fichier : ${filename})</p>`
      : `<p style="margin:8px 0;font-size:0.85rem;color:#e07b39">⚠️ Drive non configuré — logo disponible ci-dessous uniquement</p>`;

    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#1a1409;font-family:Georgia,serif">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
  <div style="text-align:center;margin-bottom:24px">
    <img src="cid:gn_logo" alt="GeNext" style="height:40px">
  </div>
  <div style="background:rgba(200,164,78,0.08);border:1px solid rgba(200,164,78,0.30);border-radius:16px;padding:28px 24px">
    <h2 style="margin:0 0 6px;color:#c8a44e;font-size:1.3rem;font-weight:600">📸 Nouveau logo client</h2>
    <p style="margin:0 0 18px;color:rgba(245,240,230,0.70);font-size:0.88rem">Un client vient d'uploader son logo.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
      <tr><td style="color:rgba(245,240,230,0.50);font-size:0.80rem;padding:4px 0;width:40%">Restaurant</td>
          <td style="color:#c8a44e;font-size:0.90rem;font-weight:600">${safeName}</td></tr>
      <tr><td style="color:rgba(245,240,230,0.50);font-size:0.80rem;padding:4px 0">ID client</td>
          <td style="color:rgba(245,240,230,0.80);font-size:0.85rem;font-family:monospace">${rid}</td></tr>
      <tr><td style="color:rgba(245,240,230,0.50);font-size:0.80rem;padding:4px 0">Fichier</td>
          <td style="color:rgba(245,240,230,0.80);font-size:0.85rem;font-family:monospace">${filename}</td></tr>
    </table>
    ${driveNote}
    <div style="margin-top:20px;text-align:center;padding:16px;background:rgba(18,14,10,0.60);border-radius:10px;border:1px solid rgba(200,164,78,0.15)">
      <p style="margin:0 0 10px;color:rgba(245,240,230,0.50);font-size:0.78rem">Aperçu du logo</p>
      <img src="cid:logo_client" alt="Logo ${safeName}" style="max-height:120px;max-width:260px;object-fit:contain;border-radius:8px">
    </div>
    <p style="margin:18px 0 0;color:rgba(245,240,230,0.45);font-size:0.78rem;text-align:center">
      Délai d'intégration promis au client : <strong style="color:#c8a44e">48 heures</strong>
    </p>
  </div>
</div></body></html>`;

    // Logo GeNext pour l'en-tête email
    let gnLogoBuf = null;
    try {
      const logoPath = require('path').join(process.cwd(), 'client', 'assets', 'gn-logo-dark.png');
      gnLogoBuf = require('fs').readFileSync(logoPath);
    } catch (_) {
      try {
        gnLogoBuf = await httpsGet('https://menu-saas-platform.vercel.app/assets/gn-logo-dark.png');
      } catch (_2) { /* pas bloquant */ }
    }

    const attachments = [
      {
        filename,
        content: imgBuffer,
        cid: 'logo_client',
        contentType: 'image/png',
        contentDisposition: 'inline'
      }
    ];
    if (gnLogoBuf) {
      attachments.unshift({
        filename: 'gn-logo-dark.png',
        content: gnLogoBuf,
        cid: 'gn_logo',
        contentType: 'image/png',
        contentDisposition: 'inline'
      });
    }

    await createTransport().sendMail({
      from: `"GeNext" <${process.env.GMAIL_USER}>`,
      to: adminEmail,
      subject: `📸 Nouveau logo — ${safeName} (${rid})`,
      html,
      attachments
    });

    return res.status(200).json({ ok: true, drive: driveSuccess });

  } catch (err) {
    console.error('[logo-notify] Error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
