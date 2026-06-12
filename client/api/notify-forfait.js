/* ============================================================
   Vercel Function — Forfait change notification
   Sends confirmation email to client + FCM to Malek
   Syncs forfait/price/paymentMode to control Firebase commande
   pending:true → stores pendingForfaitChange (apply at period end)
============================================================ */

const https      = require('https');
const nodemailer = require('nodemailer');

const CONTROL_DB = 'https://menu-pro-control-default-rtdb.europe-west1.firebasedatabase.app';

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
  });
}

function fbRequest(db, path, method, secret, body) {
  return new Promise((resolve, reject) => {
    const url     = new URL(db + path + '.json?auth=' + secret);
    const bodyStr = body ? JSON.stringify(body) : null;
    const opts    = { hostname: url.hostname, path: url.pathname + url.search, method, headers: {} };
    if (bodyStr) {
      opts.headers['Content-Type']   = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(null); } });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}
const fbGet   = (db, path, s)       => fbRequest(db, path, 'GET',   s, null);
const fbPatch = (db, path, s, body) => fbRequest(db, path, 'PATCH', s, body);

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr), ...headers }
    };
    const req = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.write(bodyStr); req.end();
  });
}

const PRICE = {
  monthly: { 'menu-qr': 49,  'commandes-services': 99  },
  annual:  { 'menu-qr': 490, 'commandes-services': 990 }
};

function buildForfaitEmail(lang, name, oldForfait, newForfait, isUpgrade, paymentMode) {
  const isCS    = newForfait === 'commandes-services';
  const safeName = escHtml(name);
  const forfaitLabel = {
    fr: { mq: 'Menu QR', cs: 'Commandes &amp; Services', monthly: 'mensuel',   annual: 'annuel'     },
    en: { mq: 'Menu QR', cs: 'Orders &amp; Services',    monthly: 'monthly',   annual: 'annual'     },
    el: { mq: 'Menu QR', cs: 'Παραγγελίες &amp; Υπηρεσίες', monthly: 'μηνιαίο', annual: 'ετήσιο'  },
    de: { mq: 'Menu QR', cs: 'Bestellungen &amp; Services',  monthly: 'monatlich', annual: 'jährlich' },
    ar: { mq: 'Menu QR', cs: 'الطلبات والخدمات',         monthly: 'شهري',      annual: 'سنوي'       }
  }[lang] || { mq: 'Menu QR', cs: 'Commandes &amp; Services', monthly: 'mensuel', annual: 'annuel' };

  const newLabel  = isCS ? forfaitLabel.cs : forfaitLabel.mq;
  const modeLabel = paymentMode === 'annual' ? forfaitLabel.annual : forfaitLabel.monthly;
  const priceMap  = paymentMode === 'annual' ? PRICE.annual : PRICE.monthly;
  const price     = priceMap[newForfait] || priceMap['menu-qr'];
  const isRTL     = lang === 'ar';

  const subjects = {
    fr: isUpgrade ? `🚀 Votre forfait a été mis à niveau — ${isCS ? 'Commandes & Services' : 'Menu QR'}` : `ℹ️ Votre forfait a changé — ${isCS ? 'Commandes & Services' : 'Menu QR'}`,
    en: isUpgrade ? `🚀 Your plan has been upgraded — ${isCS ? 'Orders & Services' : 'Menu QR'}` : `ℹ️ Your plan has changed — ${isCS ? 'Orders & Services' : 'Menu QR'}`,
    el: isUpgrade ? `🚀 Η συνδρομή σας αναβαθμίστηκε` : `ℹ️ Η συνδρομή σας άλλαξε`,
    de: isUpgrade ? `🚀 Ihr Plan wurde aktualisiert` : `ℹ️ Ihr Plan hat sich geändert`,
    ar: isUpgrade ? `🚀 تمت ترقية خطتك` : `ℹ️ تغيّرت خطتك`
  };

  const T = {
    fr: {
      greeting: `Bonjour ${safeName} 👋`,
      intro: isUpgrade
        ? `Votre forfait a été mis à niveau vers <strong>${newLabel}</strong> (${modeLabel} — ${price}€).`
        : `Votre forfait a été modifié vers <strong>${newLabel}</strong> (${modeLabel} — ${price}€).`,
      payment: isUpgrade ? `Vous avez <strong>7 jours</strong> pour effectuer votre paiement.` : null,
      features: isCS ? `Vos nouvelles fonctionnalités : prise de commandes en ligne, bouton d'appel, système de tables et QR ordering.` : `Votre menu digital reste actif. Les fonctionnalités de commande et d'appel ont été désactivées.`,
      closing: `L'équipe GeNext`
    },
    en: {
      greeting: `Hello ${safeName} 👋`,
      intro: isUpgrade ? `Your plan has been upgraded to <strong>${newLabel}</strong> (${modeLabel} — €${price}).` : `Your plan has been changed to <strong>${newLabel}</strong> (${modeLabel} — €${price}).`,
      payment: isUpgrade ? `You have <strong>7 days</strong> to complete your payment.` : null,
      features: isCS ? `Your new features: online ordering, call button, table system and QR ordering.` : `Your digital menu remains active. Ordering and call features have been disabled.`,
      closing: `The GeNext Team`
    },
    el: {
      greeting: `Γεια σας ${safeName} 👋`,
      intro: isUpgrade ? `Η συνδρομή σας αναβαθμίστηκε σε <strong>${newLabel}</strong> (${modeLabel} — ${price}€).` : `Η συνδρομή σας άλλαξε σε <strong>${newLabel}</strong> (${modeLabel} — ${price}€).`,
      payment: isUpgrade ? `Έχετε <strong>7 ημέρες</strong> για να ολοκληρώσετε την πληρωμή σας.` : null,
      features: isCS ? `Νέες λειτουργίες: online παραγγελίες, κουμπί κλήσης, σύστημα τραπεζιών και QR παραγγελία.` : `Το ψηφιακό σας μενού παραμένει ενεργό. Οι λειτουργίες παραγγελίας και κλήσης έχουν απενεργοποιηθεί.`,
      closing: `Η ομάδα GeNext`
    },
    de: {
      greeting: `Guten Tag ${safeName} 👋`,
      intro: isUpgrade ? `Ihr Plan wurde auf <strong>${newLabel}</strong> aktualisiert (${modeLabel} — ${price}€).` : `Ihr Plan wurde auf <strong>${newLabel}</strong> geändert (${modeLabel} — ${price}€).`,
      payment: isUpgrade ? `Sie haben <strong>7 Tage</strong> Zeit, Ihre Zahlung zu leisten.` : null,
      features: isCS ? `Ihre neuen Funktionen: Online-Bestellungen, Anrufschaltfläche, Tischsystem und QR-Bestellung.` : `Ihr digitales Menü bleibt aktiv. Bestell- und Anruffunktionen wurden deaktiviert.`,
      closing: `Das GeNext Team`
    },
    ar: {
      greeting: `مرحباً ${safeName} 👋`,
      intro: isUpgrade ? `تمت ترقية خطتك إلى <strong>${newLabel}</strong> (${modeLabel} — ${price}€).` : `تغيّرت خطتك إلى <strong>${newLabel}</strong> (${modeLabel} — ${price}€).`,
      payment: isUpgrade ? `لديك <strong>7 أيام</strong> لإتمام الدفع.` : null,
      features: isCS ? `مميزاتك الجديدة: الطلب عبر الإنترنت، زر الاستدعاء، نظام الطاولات وطلب QR.` : `قائمتك الرقمية تبقى نشطة. تم تعطيل ميزات الطلب والاستدعاء.`,
      closing: `فريق GeNext`
    }
  };

  const t     = T[lang] || T.fr;
  const dir   = isRTL ? 'rtl' : 'ltr';
  const align = isRTL ? 'right' : 'left';
  const paymentBlock = t.payment
    ? `<div style="background:rgba(200,164,78,.15);border-left:3px solid #c8a44e;padding:12px 16px;border-radius:6px;margin:16px 0;font-size:0.9rem">${t.payment}</div>`
    : '';

  const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GeNext</title></head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:32px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a22;border-radius:16px;overflow:hidden;max-width:560px;width:100%">
<tr><td style="background:linear-gradient(135deg,#1e1a10 0%,#2a2010 100%);padding:28px 32px;text-align:center">
  <div style="font-size:1.6rem;font-weight:800;color:#c8a44e;letter-spacing:-0.02em">GeNext</div>
  <div style="font-size:0.75rem;color:rgba(200,164,78,.6);margin-top:4px;letter-spacing:0.06em">DIGITAL MENU PLATFORM</div>
</td></tr>
<tr><td style="padding:28px 32px;text-align:${align}">
  <p style="color:#e8e0d0;font-size:1rem;margin:0 0 16px">${t.greeting}</p>
  <p style="color:#b8b0a0;font-size:0.9rem;line-height:1.6;margin:0 0 12px">${t.intro}</p>
  ${paymentBlock}
  <p style="color:#b8b0a0;font-size:0.88rem;line-height:1.6;margin:12px 0 0">${t.features}</p>
</td></tr>
<tr><td style="background:#111118;padding:20px 32px;text-align:center">
  <p style="color:#6b6880;font-size:0.78rem;margin:0">${t.closing}</p>
</td></tr>
</table>
</td></tr></table></body></html>`;

  return { subject: subjects[lang] || subjects.fr, html };
}

function buildPendingEmail(lang, name, newForfait, paymentMode) {
  const isCS     = newForfait === 'commandes-services';
  const safeName = escHtml(name);
  const priceMap = paymentMode === 'annual' ? PRICE.annual : PRICE.monthly;
  const price    = priceMap[newForfait];
  const isRTL    = lang === 'ar';

  const T = {
    fr: {
      subject: `📅 Changement de forfait programmé — GeNext`,
      greeting: `Bonjour ${safeName} 👋`,
      body: `Votre demande de changement de forfait vers <strong>${isCS ? 'Commandes &amp; Services' : 'Menu QR'}</strong> (${price}€) a bien été enregistrée. Elle sera appliquée automatiquement à la fin de votre période en cours.`,
      closing: `L'équipe GeNext`
    },
    en: {
      subject: `📅 Scheduled plan change — GeNext`,
      greeting: `Hello ${safeName} 👋`,
      body: `Your request to change your plan to <strong>${isCS ? 'Orders &amp; Services' : 'Menu QR'}</strong> (€${price}) has been recorded. It will be applied automatically at the end of your current period.`,
      closing: `The GeNext Team`
    },
    el: {
      subject: `📅 Προγραμματισμένη αλλαγή πλάνου — GeNext`,
      greeting: `Γεια σας ${safeName} 👋`,
      body: `Το αίτημά σας για αλλαγή πλάνου σε <strong>${isCS ? 'Παραγγελίες &amp; Υπηρεσίες' : 'Menu QR'}</strong> (${price}€) καταγράφηκε. Θα εφαρμοστεί αυτόματα στο τέλος της τρέχουσας περιόδου σας.`,
      closing: `Η ομάδα GeNext`
    },
    de: {
      subject: `📅 Geplante Planänderung — GeNext`,
      greeting: `Guten Tag ${safeName} 👋`,
      body: `Ihre Anfrage zur Planänderung auf <strong>${isCS ? 'Bestellungen &amp; Services' : 'Menu QR'}</strong> (${price}€) wurde erfasst. Sie wird automatisch am Ende Ihres aktuellen Zeitraums angewendet.`,
      closing: `Das GeNext Team`
    },
    ar: {
      subject: `📅 تغيير الخطة المجدول — GeNext`,
      greeting: `مرحباً ${safeName} 👋`,
      body: `تم تسجيل طلبك لتغيير خطتك إلى <strong>${isCS ? 'الطلبات والخدمات' : 'Menu QR'}</strong> (${price}€). سيتم تطبيقه تلقائياً في نهاية فترتك الحالية.`,
      closing: `فريق GeNext`
    }
  };
  const t     = T[lang] || T.fr;
  const dir   = isRTL ? 'rtl' : 'ltr';
  const align = isRTL ? 'right' : 'left';

  const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GeNext</title></head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:32px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a22;border-radius:16px;overflow:hidden;max-width:560px;width:100%">
<tr><td style="background:linear-gradient(135deg,#1e1a10 0%,#2a2010 100%);padding:28px 32px;text-align:center">
  <div style="font-size:1.6rem;font-weight:800;color:#c8a44e;letter-spacing:-0.02em">GeNext</div>
  <div style="font-size:0.75rem;color:rgba(200,164,78,.6);margin-top:4px;letter-spacing:0.06em">DIGITAL MENU PLATFORM</div>
</td></tr>
<tr><td style="padding:28px 32px;text-align:${align}">
  <p style="color:#e8e0d0;font-size:1rem;margin:0 0 16px">${t.greeting}</p>
  <div style="background:rgba(200,164,78,.08);border:1px solid rgba(200,164,78,.25);border-radius:10px;padding:16px 20px;margin-bottom:16px">
    <p style="color:#b8b0a0;font-size:0.9rem;line-height:1.6;margin:0">${t.body}</p>
  </div>
</td></tr>
<tr><td style="background:#111118;padding:20px 32px;text-align:center">
  <p style="color:#6b6880;font-size:0.78rem;margin:0">${t.closing}</p>
</td></tr>
</table>
</td></tr></table></body></html>`;

  return { subject: t.subject, html };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { rid, name, oldForfait, newForfait, email, lang, paymentMode, pending } = req.body || {};
  if (!rid || !newForfait) return res.status(400).json({ error: 'Missing rid or newForfait' });

  const VALID_FORFAITS = ['menu-qr', 'commandes-services'];
  if (!VALID_FORFAITS.includes(newForfait)) return res.status(400).json({ error: 'Invalid newForfait' });

  const safeLang  = ['fr','en','el','de','ar'].includes(lang) ? lang : 'fr';
  const safeMode  = paymentMode === 'annual' ? 'annual' : 'monthly';
  const isPending = pending === true || pending === 'true';
  const isUpgrade = newForfait === 'commandes-services' && oldForfait !== 'commandes-services';
  const safeName  = String(name || rid).slice(0, 80);
  const price     = PRICE[safeMode][newForfait];
  const forfaitLabel = newForfait === 'commandes-services' ? 'Commandes & Services' : 'Menu QR';
  const results   = { email: null, fcm: null, sync: null };

  // Recherche de la commande dans control Firebase
  const secret = process.env.FIREBASE_CONTROL_SECRET;
  let cmdKey = null;
  if (secret) {
    try {
      const commandes = await fbGet(CONTROL_DB, '/commandes', secret);
      if (commandes) {
        const entry = Object.entries(commandes).find(([, d]) => d?.clientCree?.rid === rid);
        if (entry) cmdKey = entry[0];
      }
    } catch(e) { /* non-bloquant */ }
  }

  // ── Mode annulation de pendingForfaitChange ─────────────────────────────────
  if (pending === 'cancel') {
    if (cmdKey && secret) {
      try {
        await fbPatch(CONTROL_DB, '/commandes/' + cmdKey, secret, { pendingForfaitChange: null });
      } catch(e) { /* non-bloquant */ }
    }
    return res.status(200).json({ ok: true, sync: 'cancelled' });
  }

  if (isPending) {
    // ── Mode différé : stocker pendingForfaitChange pour application fin de période ──
    if (cmdKey && secret) {
      try {
        await fbPatch(CONTROL_DB, '/commandes/' + cmdKey, secret, { pendingForfaitChange: { forfait: newForfait, price } });
        results.sync = 'pending-set';
      } catch(e) { results.sync = 'error: ' + e.message; }
    } else {
      results.sync = cmdKey ? 'no-secret' : 'commande-not-found';
    }

    if (email) {
      try {
        const { subject, html } = buildPendingEmail(safeLang, safeName, newForfait, safeMode);
        await createTransport().sendMail({
          from: `"GeNext" <${process.env.GMAIL_USER}>`,
          to: email, subject, html
        });
        results.email = 'sent';
      } catch(e) { results.email = 'error: ' + e.message; }
    } else {
      results.email = 'no-email';
    }

    try {
      await httpsPost('https://menu-saas-platform.vercel.app/api/notify-control', {}, {
        title: '📅 Changement programmé',
        body: `${safeName} → ${forfaitLabel} (fin de période)`,
        type: 'forfait'
      });
      results.fcm = 'sent';
    } catch(e) { results.fcm = 'error'; }

  } else {
    // ── Mode immédiat : email + sync commande + FCM ─────────────────────────────
    if (email) {
      try {
        const { subject, html } = buildForfaitEmail(safeLang, safeName, oldForfait, newForfait, isUpgrade, safeMode);
        await createTransport().sendMail({
          from: `"GeNext" <${process.env.GMAIL_USER}>`,
          to: email, subject, html
        });
        results.email = 'sent';
      } catch(e) { results.email = 'error: ' + e.message; }
    } else {
      results.email = 'no-email';
    }

    // Sync commande : forfait + price + paymentMode (+ reset reminder si upgrade)
    if (cmdKey && secret) {
      try {
        const update = { forfait: newForfait, price, paymentMode: safeMode };
        if (isUpgrade) {
          update.nextReminderAt = Date.now() + 7 * 24 * 3600 * 1000;
          update.lastReminderSent = null;
        }
        await fbPatch(CONTROL_DB, '/commandes/' + cmdKey, secret, update);
        results.sync = 'ok';
      } catch(e) { results.sync = 'error: ' + e.message; }
    } else {
      results.sync = cmdKey ? 'no-secret' : 'commande-not-found';
    }

    try {
      await httpsPost('https://menu-saas-platform.vercel.app/api/notify-control', {}, {
        title: '🔄 Changement de forfait',
        body: `${safeName} → ${forfaitLabel}`,
        type: 'forfait'
      });
      results.fcm = 'sent';
    } catch(e) { results.fcm = 'error'; }
  }

  return res.status(200).json({ ok: true, isPending, ...results });
};
