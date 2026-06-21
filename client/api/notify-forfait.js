/* ============================================================
   Vercel Function — Forfait change notification
   Sends confirmation email to client + FCM to Malek
   Syncs forfait/price/paymentMode to control Firebase commande
   pending:true → stores pendingForfaitChange (apply at period end)
============================================================ */

const https      = require('https');
const nodemailer = require('nodemailer');

const CONTROL_DB = 'https://menu-pro-control-default-rtdb.europe-west1.firebasedatabase.app';
const LOGO_ATTACHMENT = { filename: 'gn-logo-email.png', path: 'https://menu-saas-platform.vercel.app/assets/gn-logo-email.png', cid: 'gnlogo' };

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
    ? `<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#fdf9f2" style="background-color:#fdf9f2;border:1px solid #e8dfc8;border-left:3px solid #c8a44e;border-radius:0 8px 8px 0;margin:16px 0 4px"><tr><td style="padding:12px 16px;font-size:0.88rem;color:#2a1f10;line-height:1.6">${t.payment}</td></tr></table>`
    : '';

  const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GeNext</title></head>
<body style="margin:0;padding:0;background-color:#f2ece0">
<table dir="${dir}" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f2ece0" background="https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg" style="background-color:#f2ece0;background-image:url('https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg');background-size:cover;background-position:center;background-repeat:no-repeat">
<tr><td align="center" background="https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg" style="padding:24px 0;background-image:url('https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg');background-size:cover;background-position:center">
<table width="580" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:580px;width:100%;background-color:#ffffff;font-family:'Segoe UI',Arial,sans-serif">
<tr><td bgcolor="#ffffff" align="center" background="https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg" style="background-color:#ffffff;background-image:url('https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg');background-size:cover;background-position:center;padding:26px 32px;border-bottom:1px solid #ead9b8">
  <img src="cid:gnlogo" alt="GeNext" width="140" height="147" style="display:block;margin:0 auto;max-width:140px;border:0">
  <div style="font-size:0.75rem;color:#9a8060;margin-top:8px;letter-spacing:0.06em">DIGITAL MENU PLATFORM</div>
</td></tr>
<tr><td bgcolor="#ffffff" background="https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg" style="background-color:#ffffff;background-image:url('https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg');background-size:cover;background-position:center;padding:28px 32px;text-align:${align}">
  <p style="color:#2a1f10;font-size:1rem;margin:0 0 12px;font-weight:600">${t.greeting}</p>
  <p style="color:#4a3728;font-size:0.9rem;line-height:1.6;margin:0 0 4px">${t.intro}</p>
  ${paymentBlock}
  <p style="color:#7a6555;font-size:0.88rem;line-height:1.6;margin:12px 0 0">${t.features}</p>
</td></tr>
<tr><td bgcolor="#f2ece0" align="center" background="https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg" style="background-color:#f2ece0;background-image:url('https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg');background-size:cover;background-position:center;padding:14px 32px;border-top:1px solid #ead9b8">
  <p style="color:#9a8060;font-size:0.78rem;margin:0">${t.closing} · GeNext</p>
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
<body style="margin:0;padding:0;background-color:#f2ece0">
<table dir="${dir}" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f2ece0" background="https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg" style="background-color:#f2ece0;background-image:url('https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg');background-size:cover;background-position:center;background-repeat:no-repeat">
<tr><td align="center" background="https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg" style="padding:24px 0;background-image:url('https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg');background-size:cover;background-position:center">
<table width="580" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:580px;width:100%;background-color:#ffffff;font-family:'Segoe UI',Arial,sans-serif">
<tr><td bgcolor="#ffffff" align="center" background="https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg" style="background-color:#ffffff;background-image:url('https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg');background-size:cover;background-position:center;padding:26px 32px;border-bottom:1px solid #ead9b8">
  <img src="cid:gnlogo" alt="GeNext" width="140" height="147" style="display:block;margin:0 auto;max-width:140px;border:0">
  <div style="font-size:0.75rem;color:#9a8060;margin-top:8px;letter-spacing:0.06em">DIGITAL MENU PLATFORM</div>
</td></tr>
<tr><td bgcolor="#ffffff" background="https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg" style="background-color:#ffffff;background-image:url('https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg');background-size:cover;background-position:center;padding:28px 32px;text-align:${align}">
  <p style="color:#2a1f10;font-size:1rem;margin:0 0 16px;font-weight:600">${t.greeting}</p>
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#fdf9f2" style="background-color:#fdf9f2;border:1px solid #e8dfc8;border-left:3px solid #c8a44e;border-radius:0 8px 8px 0;margin-bottom:8px"><tr><td style="padding:14px 18px;font-size:0.9rem;color:#2a1f10;line-height:1.6">${t.body}</td></tr></table>
</td></tr>
<tr><td bgcolor="#f2ece0" align="center" background="https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg" style="background-color:#f2ece0;background-image:url('https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg');background-size:cover;background-position:center;padding:14px 32px;border-top:1px solid #ead9b8">
  <p style="color:#9a8060;font-size:0.78rem;margin:0">${t.closing} · GeNext</p>
</td></tr>
</table>
</td></tr></table></body></html>`;

  return { subject: t.subject, html };
}

function buildPaymentModeEmail(lang, name, newMode, forfait) {
  const isCS     = forfait === 'commandes-services';
  const safeName = escHtml(name);
  const priceMap = newMode === 'annual' ? PRICE.annual : PRICE.monthly;
  const price    = priceMap[forfait] || priceMap['menu-qr'];
  const isRTL    = lang === 'ar';

  const T = {
    fr: {
      subject: `💳 Mode de paiement mis à jour — GeNext`,
      greeting: `Bonjour ${safeName} 👋`,
      body: newMode === 'annual'
        ? `Votre abonnement est désormais en facturation <strong>annuelle</strong> (${price}€/an).`
        : `Votre abonnement est désormais en facturation <strong>mensuelle</strong> (${price}€/mois).`,
      closing: `L'équipe GeNext`
    },
    en: {
      subject: `💳 Payment mode updated — GeNext`,
      greeting: `Hello ${safeName} 👋`,
      body: newMode === 'annual'
        ? `Your subscription is now billed <strong>annually</strong> (€${price}/year).`
        : `Your subscription is now billed <strong>monthly</strong> (€${price}/month).`,
      closing: `The GeNext Team`
    },
    el: {
      subject: `💳 Ο τρόπος πληρωμής ενημερώθηκε — GeNext`,
      greeting: `Γεια σας ${safeName} 👋`,
      body: newMode === 'annual'
        ? `Η συνδρομή σας χρεώνεται πλέον <strong>ετησίως</strong> (${price}€/έτος).`
        : `Η συνδρομή σας χρεώνεται πλέον <strong>μηνιαίως</strong> (${price}€/μήνα).`,
      closing: `Η ομάδα GeNext`
    },
    de: {
      subject: `💳 Zahlungsmodus aktualisiert — GeNext`,
      greeting: `Guten Tag ${safeName} 👋`,
      body: newMode === 'annual'
        ? `Ihr Abonnement wird nun <strong>jährlich</strong> abgerechnet (${price}€/Jahr).`
        : `Ihr Abonnement wird nun <strong>monatlich</strong> abgerechnet (${price}€/Monat).`,
      closing: `Das GeNext Team`
    },
    ar: {
      subject: `💳 تم تحديث وضع الدفع — GeNext`,
      greeting: `مرحباً ${safeName} 👋`,
      body: newMode === 'annual'
        ? `يتم الآن فوترة اشتراكك <strong>سنوياً</strong> (${price}€/سنة).`
        : `يتم الآن فوترة اشتراكك <strong>شهرياً</strong> (${price}€/شهر).`,
      closing: `فريق GeNext`
    }
  };
  const t     = T[lang] || T.fr;
  const dir   = isRTL ? 'rtl' : 'ltr';
  const align = isRTL ? 'right' : 'left';

  const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GeNext</title></head>
<body style="margin:0;padding:0;background-color:#f2ece0">
<table dir="${dir}" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f2ece0" background="https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg" style="background-color:#f2ece0;background-image:url('https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg');background-size:cover;background-position:center;background-repeat:no-repeat">
<tr><td align="center" background="https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg" style="padding:24px 0;background-image:url('https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg');background-size:cover;background-position:center">
<table width="580" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:580px;width:100%;background-color:#ffffff;font-family:'Segoe UI',Arial,sans-serif">
<tr><td bgcolor="#ffffff" align="center" background="https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg" style="background-color:#ffffff;background-image:url('https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg');background-size:cover;background-position:center;padding:26px 32px;border-bottom:1px solid #ead9b8">
  <img src="cid:gnlogo" alt="GeNext" width="140" height="147" style="display:block;margin:0 auto;max-width:140px;border:0">
  <div style="font-size:0.75rem;color:#9a8060;margin-top:8px;letter-spacing:0.06em">DIGITAL MENU PLATFORM</div>
</td></tr>
<tr><td bgcolor="#ffffff" background="https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg" style="background-color:#ffffff;background-image:url('https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg');background-size:cover;background-position:center;padding:28px 32px;text-align:${align}">
  <p style="color:#2a1f10;font-size:1rem;margin:0 0 12px;font-weight:600">${t.greeting}</p>
  <p style="color:#4a3728;font-size:0.9rem;line-height:1.6;margin:0">${t.body}</p>
</td></tr>
<tr><td bgcolor="#f2ece0" align="center" background="https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg" style="background-color:#f2ece0;background-image:url('https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg');background-size:cover;background-position:center;padding:14px 32px;border-top:1px solid #ead9b8">
  <p style="color:#9a8060;font-size:0.78rem;margin:0">${t.closing} · GeNext</p>
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

  const { rid, name, oldForfait, newForfait, email, lang, paymentMode, pending, onlyPaymentMode } = req.body || {};
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

  // ── Mode "changement du mode de paiement uniquement" (forfait inchangé) ─────
  if (onlyPaymentMode === true) {
    if (cmdKey && secret) {
      try {
        await fbPatch(CONTROL_DB, '/commandes/' + cmdKey, secret, { paymentMode: safeMode, price });
        results.sync = 'ok';
      } catch(e) { results.sync = 'error: ' + e.message; }
    } else {
      results.sync = cmdKey ? 'no-secret' : 'commande-not-found';
    }

    if (email) {
      try {
        const { subject, html } = buildPaymentModeEmail(safeLang, safeName, safeMode, newForfait);
        await createTransport().sendMail({
          from: `"GeNext" <${process.env.GMAIL_USER}>`,
          to: email, subject, html,
          attachments: [LOGO_ATTACHMENT]
        });
        results.email = 'sent';
      } catch(e) { results.email = 'error: ' + e.message; }
    } else {
      results.email = 'no-email';
    }

    try {
      await httpsPost('https://menu-saas-platform.vercel.app/api/notify-control', {}, {
        title: '💳 Changement de mode de paiement',
        body: `${safeName} → ${safeMode === 'annual' ? 'Annuel' : 'Mensuel'}`,
        type: 'forfait'
      });
      results.fcm = 'sent';
    } catch(e) { results.fcm = 'error'; }

    return res.status(200).json({ ok: true, onlyPaymentMode: true, ...results });
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
          to: email, subject, html,
          attachments: [LOGO_ATTACHMENT]
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
          to: email, subject, html,
          attachments: [LOGO_ATTACHMENT]
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
