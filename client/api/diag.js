/* Diagnostic FCM — endpoint temporaire */
const crypto = require('crypto');
const https  = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'GET' }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch(e) { resolve({ status: res.statusCode, body: d }); } });
    }).on('error', reject).end();
  });
}

function base64url(buf) { return Buffer.from(buf).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_'); }

async function getToken(sa) {
  const now = Math.floor(Date.now()/1000);
  const h = base64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const p = base64url(JSON.stringify({iss:sa.client_email,sub:sa.client_email,aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600,scope:'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email'}));
  const sign = crypto.createSign('RSA-SHA256'); sign.update(h+'.'+p);
  const jwt = h+'.'+p+'.'+base64url(sign.sign(sa.private_key));
  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  const res = await new Promise((resolve, reject) => {
    const req = https.request({hostname:'oauth2.googleapis.com',path:'/token',method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(body)}}, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(JSON.parse(d)));
    }).on('error',reject); req.write(body); req.end();
  });
  return res.access_token;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  try {
    const raw = process.env.PLATFORM_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) { res.status(200).json({ error: 'Aucune variable PLATFORM_SERVICE_ACCOUNT ni FIREBASE_SERVICE_ACCOUNT trouvée' }); return; }
    const sa = JSON.parse(raw);
    const projectId = sa.project_id;
    const token = await getToken(sa);

    // Lire control/fcm_tokens
    const ctrlUrl = `https://${projectId}-default-rtdb.europe-west1.firebasedatabase.app/control/fcm_tokens.json?access_token=${token}`;
    const ctrlRes = await httpsGet(ctrlUrl);
    const ctrlTokens = ctrlRes.status === 200 && ctrlRes.body && typeof ctrlRes.body === 'object'
      ? Object.keys(ctrlRes.body).length : 0;

    // Lire restaurants/
    const restUrl = `https://${projectId}-default-rtdb.europe-west1.firebasedatabase.app/restaurants.json?shallow=true&access_token=${token}`;
    const restRes = await httpsGet(restUrl);
    const restaurants = restRes.status === 200 && restRes.body && typeof restRes.body === 'object'
      ? Object.keys(restRes.body) : [];

    // Lire les tokens FCM de chaque restaurant + envoyer test FCM
    const serverTokens = {};
    const fcmTestResults = {};

    for (const rid of restaurants) {
      const devUrl = `https://${projectId}-default-rtdb.europe-west1.firebasedatabase.app/restaurants/${rid}/devices.json?access_token=${token}`;
      const devRes = await httpsGet(devUrl);
      const devices = devRes.status === 200 && devRes.body && typeof devRes.body === 'object' ? devRes.body : {};
      serverTokens[rid] = { count: Object.keys(devices).length, raw: devices };

      // Envoie un vrai FCM test à chaque device
      for (const [deviceId, d] of Object.entries(devices)) {
        if (!d || !d.token) continue;
        const payload = JSON.stringify({
          message: {
            token: d.token,
            notification: { title: '🔔 Test diagnostic', body: 'Si tu vois ceci, FCM fonctionne !' },
            data: { type: 'bell', table: '99', ts: String(Date.now()) },
            android: { priority: 'high', notification: { channel_id: 'mp_srv_v3', notification_priority: 'PRIORITY_MAX' } }
          }
        });
        const fcmRes = await new Promise((resolve, reject) => {
          const u = new URL(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`);
          const req = https.request({ hostname: u.hostname, path: u.pathname, method: 'POST',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
          }, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try{resolve({status:r.statusCode,body:JSON.parse(d)})}catch(e){resolve({status:r.statusCode,body:d})} }); });
          req.on('error', reject); req.write(payload); req.end();
        });
        fcmTestResults[rid + '/' + deviceId] = { fcm_status: fcmRes.status, fcm_body: fcmRes.body };
      }
    }

    // Test FCM pour control
    const ctrlRes2 = ctrlRes.status === 200 && ctrlRes.body && typeof ctrlRes.body === 'object' ? ctrlRes.body : {};
    const ctrlFcmResults = {};
    for (const [deviceId, d] of Object.entries(ctrlRes2)) {
      if (!d || !d.token) continue;
      const payload = JSON.stringify({
        message: {
          token: d.token,
          notification: { title: '📋 Test diagnostic', body: 'Si tu vois ceci, FCM Control fonctionne !' },
          data: { type: 'devis', ts: String(Date.now()) },
          android: { priority: 'high', notification: { channel_id: 'devis_control' } }
        }
      });
      const fcmRes = await new Promise((resolve, reject) => {
        const u = new URL(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`);
        const req = https.request({ hostname: u.hostname, path: u.pathname, method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        }, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try{resolve({status:r.statusCode,body:JSON.parse(d)})}catch(e){resolve({status:r.statusCode,body:d})} }); });
        req.on('error', reject); req.write(payload); req.end();
      });
      ctrlFcmResults[deviceId] = { fcm_status: fcmRes.status, fcm_body: fcmRes.body };
    }

    res.status(200).json({
      service_account_project: projectId,
      control_fcm_tokens_count: ctrlTokens,
      restaurants_found: restaurants,
      server_fcm_tokens_per_restaurant: serverTokens,
      fcm_test_server: fcmTestResults,
      fcm_test_control: ctrlFcmResults
    });
  } catch(err) {
    res.status(200).json({ error: err.message });
  }
};
