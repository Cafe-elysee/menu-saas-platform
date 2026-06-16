/* ============================================================
   Vercel Function — Payment confirmation email
   Called by control-app _markPaid() after successful payment
   Sends "Paiement reçu, prochain renouvellement le {date}" (5 langs)
============================================================ */

const nodemailer = require('nodemailer');

const DATE_LOCALE = { fr: 'fr-FR', en: 'en-GB', el: 'el-GR', ar: 'ar-MA', de: 'de-DE' };
const LOGO_ATTACHMENT = { filename: 'gn-logo-light.png', path: 'https://menu-saas-platform.vercel.app/assets/gn-logo-light.png', cid: 'gnlogo' };

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(ts, lang) {
  return new Date(ts).toLocaleDateString(DATE_LOCALE[lang] || 'fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
  });
}

function buildPaymentEmail(lang, name, amount, paymentMode, nextDue) {
  const safeName  = escHtml(name);
  const dateStr   = fmtDate(nextDue, lang);
  const isRTL     = lang === 'ar';
  const amountStr = amount + '€';

  const T = {
    fr: {
      subject: `✅ Paiement reçu — GeNext`,
      greeting: `Bonjour ${safeName} 👋`,
      confirmed: `Votre paiement de <strong>${amountStr}</strong> a bien été reçu.`,
      nextLabel: `Prochain renouvellement`,
      nextDate: dateStr,
      note: `Votre accès GeNext reste actif jusqu'à cette date. Vous recevrez un rappel quelques jours avant l'échéance.`,
      closing: `Merci pour votre confiance — L'équipe GeNext`
    },
    en: {
      subject: `✅ Payment received — GeNext`,
      greeting: `Hello ${safeName} 👋`,
      confirmed: `Your payment of <strong>${amountStr}</strong> has been received.`,
      nextLabel: `Next renewal`,
      nextDate: dateStr,
      note: `Your GeNext access remains active until this date. You will receive a reminder a few days before the deadline.`,
      closing: `Thank you for your trust — The GeNext Team`
    },
    el: {
      subject: `✅ Πληρωμή ελήφθη — GeNext`,
      greeting: `Γεια σας ${safeName} 👋`,
      confirmed: `Η πληρωμή σας <strong>${amountStr}</strong> ελήφθη.`,
      nextLabel: `Επόμενη ανανέωση`,
      nextDate: dateStr,
      note: `Η πρόσβασή σας στο GeNext παραμένει ενεργή έως αυτήν την ημερομηνία. Θα λάβετε υπενθύμιση λίγες ημέρες πριν.`,
      closing: `Ευχαριστούμε — Η ομάδα GeNext`
    },
    de: {
      subject: `✅ Zahlung erhalten — GeNext`,
      greeting: `Guten Tag ${safeName} 👋`,
      confirmed: `Ihre Zahlung von <strong>${amountStr}</strong> wurde empfangen.`,
      nextLabel: `Nächste Verlängerung`,
      nextDate: dateStr,
      note: `Ihr GeNext Zugang bleibt bis zu diesem Datum aktiv. Sie erhalten einige Tage vor Ablauf eine Erinnerung.`,
      closing: `Vielen Dank — Das GeNext Team`
    },
    ar: {
      subject: `✅ تم استلام الدفع — GeNext`,
      greeting: `مرحباً ${safeName} 👋`,
      confirmed: `تم استلام دفعتك البالغة <strong>${amountStr}</strong>.`,
      nextLabel: `التجديد القادم`,
      nextDate: dateStr,
      note: `يبقى وصولك إلى GeNext نشطاً حتى هذا التاريخ. ستتلقى تذكيراً قبل أيام قليلة من الموعد النهائي.`,
      closing: `شكراً لثقتك — فريق GeNext`
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
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f0faf4" style="background-color:#f0faf4;border:1px solid #b8e8c8;border-left:3px solid #4caf80;border-radius:0 8px 8px 0;margin-bottom:20px"><tr><td style="padding:12px 16px;font-size:0.95rem;color:#2a1f10;line-height:1.6">${t.confirmed}</td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f8f4ec" style="background-color:#f8f4ec;border:1px solid #e8dfc8;border-radius:10px;margin-bottom:20px"><tr><td style="padding:16px 22px;text-align:center">
    <div style="font-size:0.72rem;color:#9a8060;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">${t.nextLabel}</div>
    <div style="font-size:1.2rem;font-weight:700;color:#c8a44e">${t.nextDate}</div>
  </td></tr></table>
  <p style="color:#7a6555;font-size:0.85rem;line-height:1.6;margin:0">${t.note}</p>
</td></tr>
<tr><td bgcolor="#f2ece0" align="center" background="https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg" style="background-color:#f2ece0;background-image:url('https://menu-saas-platform.vercel.app/assets/gn-bg-light.jpg');background-size:cover;background-position:center;padding:14px 32px;border-top:1px solid #ead9b8">
  <p style="color:#9a8060;font-size:0.78rem;margin:0">${t.closing}</p>
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

  const { rid, email, name, lang, amount, paymentMode, nextDue } = req.body || {};
  if (!email || !nextDue) return res.status(400).json({ error: 'Missing email or nextDue' });

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    return res.status(500).json({ error: 'GMAIL credentials missing' });
  }

  const safeLang = ['fr','en','el','de','ar'].includes(lang) ? lang : 'fr';
  const safeName = String(name || rid || '').slice(0, 80);
  const safeAmt  = Number(amount) || 0;

  try {
    const { subject, html } = buildPaymentEmail(safeLang, safeName, safeAmt, paymentMode, Number(nextDue));
    await createTransport().sendMail({
      from: `"GeNext" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      html,
      attachments: [LOGO_ATTACHMENT]
    });
    return res.status(200).json({ ok: true, email: 'sent' });
  } catch(e) {
    console.error('notify-payment error:', e.message);
    return res.status(200).json({ ok: false, email: 'error: ' + e.message });
  }
};
