/* ============================================================
   Vercel Function — Payment confirmation email
   Called by control-app _markPaid() after successful payment
   Sends "Paiement reçu, prochain renouvellement le {date}" (5 langs)
============================================================ */

const nodemailer = require('nodemailer');

const DATE_LOCALE = { fr: 'fr-FR', en: 'en-GB', el: 'el-GR', ar: 'ar-MA', de: 'de-DE' };

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
      subject: `✅ Paiement reçu — Menu Pro`,
      greeting: `Bonjour ${safeName} 👋`,
      confirmed: `Votre paiement de <strong>${amountStr}</strong> a bien été reçu.`,
      nextLabel: `Prochain renouvellement`,
      nextDate: dateStr,
      note: `Votre accès Menu Pro reste actif jusqu'à cette date. Vous recevrez un rappel quelques jours avant l'échéance.`,
      closing: `Merci pour votre confiance — L'équipe Menu Pro`
    },
    en: {
      subject: `✅ Payment received — Menu Pro`,
      greeting: `Hello ${safeName} 👋`,
      confirmed: `Your payment of <strong>${amountStr}</strong> has been received.`,
      nextLabel: `Next renewal`,
      nextDate: dateStr,
      note: `Your Menu Pro access remains active until this date. You will receive a reminder a few days before the deadline.`,
      closing: `Thank you for your trust — The Menu Pro Team`
    },
    el: {
      subject: `✅ Πληρωμή ελήφθη — Menu Pro`,
      greeting: `Γεια σας ${safeName} 👋`,
      confirmed: `Η πληρωμή σας <strong>${amountStr}</strong> ελήφθη.`,
      nextLabel: `Επόμενη ανανέωση`,
      nextDate: dateStr,
      note: `Η πρόσβασή σας στο Menu Pro παραμένει ενεργή έως αυτήν την ημερομηνία. Θα λάβετε υπενθύμιση λίγες ημέρες πριν.`,
      closing: `Ευχαριστούμε — Η ομάδα Menu Pro`
    },
    de: {
      subject: `✅ Zahlung erhalten — Menu Pro`,
      greeting: `Guten Tag ${safeName} 👋`,
      confirmed: `Ihre Zahlung von <strong>${amountStr}</strong> wurde empfangen.`,
      nextLabel: `Nächste Verlängerung`,
      nextDate: dateStr,
      note: `Ihr Menu Pro Zugang bleibt bis zu diesem Datum aktiv. Sie erhalten einige Tage vor Ablauf eine Erinnerung.`,
      closing: `Vielen Dank — Das Menu Pro Team`
    },
    ar: {
      subject: `✅ تم استلام الدفع — Menu Pro`,
      greeting: `مرحباً ${safeName} 👋`,
      confirmed: `تم استلام دفعتك البالغة <strong>${amountStr}</strong>.`,
      nextLabel: `التجديد القادم`,
      nextDate: dateStr,
      note: `يبقى وصولك إلى Menu Pro نشطاً حتى هذا التاريخ. ستتلقى تذكيراً قبل أيام قليلة من الموعد النهائي.`,
      closing: `شكراً لثقتك — فريق Menu Pro`
    }
  };

  const t     = T[lang] || T.fr;
  const dir   = isRTL ? 'rtl' : 'ltr';
  const align = isRTL ? 'right' : 'left';

  const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Menu Pro</title></head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:32px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a22;border-radius:16px;overflow:hidden;max-width:560px;width:100%">
<tr><td style="background:linear-gradient(135deg,#1e1a10 0%,#2a2010 100%);padding:28px 32px;text-align:center">
  <div style="font-size:1.6rem;font-weight:800;color:#c8a44e;letter-spacing:-0.02em">Menu Pro</div>
  <div style="font-size:0.75rem;color:rgba(200,164,78,.6);margin-top:4px;letter-spacing:0.06em">DIGITAL MENU PLATFORM</div>
</td></tr>
<tr><td style="padding:28px 32px;text-align:${align}">
  <p style="color:#e8e0d0;font-size:1rem;margin:0 0 16px">${t.greeting}</p>
  <div style="background:rgba(80,200,120,.08);border:1px solid rgba(80,200,120,.25);border-radius:10px;padding:16px 20px;margin-bottom:20px">
    <p style="color:#b8ffd0;font-size:0.95rem;line-height:1.6;margin:0">${t.confirmed}</p>
  </div>
  <div style="background:#fdf9f0;border:1px solid #e8d8a0;border-radius:10px;padding:18px 22px;margin-bottom:20px;text-align:center">
    <div style="font-size:0.72rem;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">${t.nextLabel}</div>
    <div style="font-size:1.25rem;font-weight:700;color:#c8a44e">${t.nextDate}</div>
  </div>
  <p style="color:#888;font-size:0.85rem;line-height:1.6;margin:0">${t.note}</p>
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
      from: `"Menu Pro" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      html
    });
    return res.status(200).json({ ok: true, email: 'sent' });
  } catch(e) {
    console.error('notify-payment error:', e.message);
    return res.status(200).json({ ok: false, email: 'error: ' + e.message });
  }
};
