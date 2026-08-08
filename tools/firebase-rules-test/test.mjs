import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { ref, set, get, update } from 'firebase/database';
import fs from 'fs';

const A = 'resto-a', B = 'resto-b';
let pass = 0, fail = 0;
const results = [];

async function t(name, promise, expect) {
  try {
    if (expect === 'ok') await assertSucceeds(promise); else await assertFails(promise);
    pass++; results.push(['PASS', name]);
  } catch (e) {
    fail++; results.push(['FAIL', name + '  →  ' + (e.message || e).toString().slice(0, 110)]);
  }
}

const testEnv = await initializeTestEnvironment({
  projectId: 'menu-saas-platform',
  database: { host: '127.0.0.1', port: 9012, rules: fs.readFileSync('database.rules.json', 'utf8') }
});

// État initial réaliste, écrit en contournant les règles
await testEnv.withSecurityRulesDisabled(async (c) => {
  const db = c.database();
  for (const rid of [A, B]) {
    await set(ref(db, `restaurants/${rid}`), {
      config: {
        active: true, suspendu: false, adminHash: 'SECRET_HASH', staffPinHash: 'SECRET_PIN',
        defaultLang: 'fr', primaryLang: 'fr', enabledLangs: { fr: true }, retention: { orders: 604800000 },
        tableCount: 5, features: { orderUI: true },
        subscription: { forfait: 'menu-qr', price: 290, email: 'client@exemple.fr' }
      },
      menu: { cats: [{ names: { fr: 'Boissons' } }], items: [] },
      profile: { name: 'Restaurant ' + rid, createdAt: 1 },
      devices: { dev1: { token: 'FCM_TOKEN_STAFF', ts: 1, lang: 'fr' } },
      orders: { o1: { table: '1', ts: 1 } },
      messages: { m1: { text: 'note', ts: 1 } }
    });
  }
});

const anon      = testEnv.unauthenticatedContext().database();
const menuA     = testEnv.authenticatedContext('menu_' + A,  { rid: A, role: 'menu-client' }).database();
const adminA    = testEnv.authenticatedContext('admin_' + A, { rid: A, role: 'admin' }).database();
const staffA    = testEnv.authenticatedContext('staff_' + A, { rid: A, role: 'staff' }).database();
const adminB    = testEnv.authenticatedContext('admin_' + B, { rid: B, role: 'admin' }).database();
const platform  = testEnv.authenticatedContext('platform_malek', { role: 'platform' }).database();

// ---------- 1. LA FAILLE C1 : le jeton du menu public ne doit plus rien pouvoir casser ----------
await t('C1 menu-client NE PEUT PAS supprimer le menu',        set(ref(menuA, `restaurants/${A}/menu`), null), 'ko');
await t('C1 menu-client NE PEUT PAS réécrire le menu',         set(ref(menuA, `restaurants/${A}/menu/cats`), [{ names: { fr: 'PIRATE' } }]), 'ko');
await t('C1 menu-client NE PEUT PAS écrire profile',           set(ref(menuA, `restaurants/${A}/profile/name`), 'PIRATE'), 'ko');
await t('C1 menu-client NE PEUT PAS LIRE config (adminHash)',  get(ref(menuA, `restaurants/${A}/config`)), 'ko');
await t('C1 menu-client NE PEUT PAS lire config/adminHash',    get(ref(menuA, `restaurants/${A}/config/adminHash`)), 'ko');
await t('C1 menu-client NE PEUT PAS lire config/staffPinHash', get(ref(menuA, `restaurants/${A}/config/staffPinHash`)), 'ko');
await t('C1 menu-client NE PEUT PAS lire config/subscription', get(ref(menuA, `restaurants/${A}/config/subscription`)), 'ko');
await t('C1 menu-client NE PEUT PAS écrire config',            update(ref(menuA, `restaurants/${A}/config`), { features: { orderUI: false } }), 'ko');
await t('C1 menu-client NE PEUT PAS supprimer devices',        set(ref(menuA, `restaurants/${A}/devices`), null), 'ko');
await t('C1 menu-client NE PEUT PAS lire devices (jetons FCM)',get(ref(menuA, `restaurants/${A}/devices`)), 'ko');
await t('C1 menu-client NE PEUT PAS écrire messages',          set(ref(menuA, `restaurants/${A}/messages/x`), { text: 'phishing', ts: 2 }), 'ko');
await t('C1 menu-client NE PEUT PAS écrire sessions',          set(ref(menuA, `restaurants/${A}/sessions/x`), true), 'ko');
await t('C1 anonyme NE PEUT PAS lire devices',                 get(ref(anon, `restaurants/${A}/devices`)), 'ko');
await t('C1 anonyme NE PEUT PAS écrire le menu',               set(ref(anon, `restaurants/${A}/menu/cats`), []), 'ko');

// ---------- 2. NON-RÉGRESSION : le menu client doit continuer à fonctionner ----------
await t('OK menu-client crée une commande',        set(ref(menuA, `restaurants/${A}/orders/n1`), { table: '3', ts: 2 }), 'ok');
await t('OK menu-client appelle le serveur',       set(ref(menuA, `restaurants/${A}/calls/c1`), { table: '3', ts: 2 }), 'ok');
await t('OK menu-client écrit calls/lastCall',     set(ref(menuA, `restaurants/${A}/calls/lastCall`), { table: '3', ts: 2 }), 'ok');
await t('OK menu-client écrit logs/receipts',      set(ref(menuA, `restaurants/${A}/logs/receipts/n1`), { ts: 2 }), 'ok');
await t('OK menu-client écrit logs/errors',        set(ref(menuA, `restaurants/${A}/logs/errors/e1`), { msg: 'x', ts: 2 }), 'ok');
await t('OK menu-client écrit analytics',          set(ref(menuA, `restaurants/${A}/analytics/2026-08-08`), { createdAt: 2 }), 'ok');
await t('OK menu-client écrit firstOpen',          set(ref(menuA, `restaurants/${A}/firstOpen`), true), 'ok');
await t('OK menu-client lit le menu (public)',     get(ref(menuA, `restaurants/${A}/menu`)), 'ok');
await t('OK menu-client lit config/active',        get(ref(menuA, `restaurants/${A}/config/active`)), 'ok');
await t('OK menu-client lit config/enabledLangs',  get(ref(menuA, `restaurants/${A}/config/enabledLangs`)), 'ok');
await t('OK menu-client lit config/features',      get(ref(menuA, `restaurants/${A}/config/features`)), 'ok');
await t('OK anonyme lit le menu (QR public)',      get(ref(anon,  `restaurants/${A}/menu`)), 'ok');

// ---------- 3. NON-RÉGRESSION : app Serveur (role staff) ----------
await t('OK staff enregistre son jeton FCM',       set(ref(staffA, `restaurants/${A}/devices/dev2`), { token: 'T', ts: 2, lang: 'fr' }), 'ok');
await t('OK staff supprime son jeton FCM',         set(ref(staffA, `restaurants/${A}/devices/dev2`), null), 'ok');
await t('OK staff change le statut commande',      set(ref(staffA, `restaurants/${A}/orders/o1/status`), 'done'), 'ok');
await t('OK staff change le statut appel',         set(ref(staffA, `restaurants/${A}/calls/c1/status`), 'done'), 'ok');
await t('OK staff supprime des messages',          update(ref(staffA, `restaurants/${A}/messages`), { m1: null }), 'ok');
await t('OK staff lit config/primaryLang',         get(ref(staffA, `restaurants/${A}/config/primaryLang`)), 'ok');
await t('OK staff lit config/retention',           get(ref(staffA, `restaurants/${A}/config/retention`)), 'ok');
await t('OK staff lit config/features',            get(ref(staffA, `restaurants/${A}/config/features`)), 'ok');
await t('OK staff lit config/active',              get(ref(staffA, `restaurants/${A}/config/active`)), 'ok');
await t('OK staff lit devices',                    get(ref(staffA, `restaurants/${A}/devices`)), 'ok');
await t('   staff NE PEUT PAS lire config/adminHash', get(ref(staffA, `restaurants/${A}/config/adminHash`)), 'ko');
await t('   staff NE PEUT PAS réécrire le menu',   set(ref(staffA, `restaurants/${A}/menu/cats`), []), 'ko');

// ---------- 4. NON-RÉGRESSION : admin.html (role admin) ----------
await t('OK admin réécrit le menu',                set(ref(adminA, `restaurants/${A}/menu/cats`), [{ names: { fr: 'Plats' } }]), 'ok');
await t('OK admin écrit menu/menuTheme',           set(ref(adminA, `restaurants/${A}/menu/menuTheme`), 'prestige'), 'ok');
await t('OK admin écrit profile/name',             set(ref(adminA, `restaurants/${A}/profile/name`), 'Nouveau nom'), 'ok');
await t('OK admin lit config (abonnement)',        get(ref(adminA, `restaurants/${A}/config`)), 'ok');
await t('OK admin lit config/subscription',        get(ref(adminA, `restaurants/${A}/config/subscription`)), 'ok');
await t('OK admin écrit config/features',          update(ref(adminA, `restaurants/${A}/config/features`), { orderUI: false }), 'ok');
await t('OK admin écrit config/subscription',      update(ref(adminA, `restaurants/${A}/config/subscription`), { forfait: 'commandes-services' }), 'ok');
await t('OK admin écrit config/staffPinHash',      set(ref(adminA, `restaurants/${A}/config/staffPinHash`), 'NEWPIN'), 'ok');
await t('OK admin écrit config/tableCount',        set(ref(adminA, `restaurants/${A}/config/tableCount`), 8), 'ok');
await t('OK admin écrit config/defaultLang',       set(ref(adminA, `restaurants/${A}/config/defaultLang`), 'en'), 'ok');
await t('OK admin écrit logs/actions',             set(ref(adminA, `restaurants/${A}/logs/actions/a1`), { t: 'login' }), 'ok');
await t('OK admin envoie un message au staff',     set(ref(adminA, `restaurants/${A}/messages/m2`), { text: 'service', ts: 2 }), 'ok');
await t('OK admin écrit sessions',                 set(ref(adminA, `restaurants/${A}/sessions/s1`), true), 'ok');

// ---------- 5. FACTURATION : un restaurant suspendu ne se réactive pas lui-même ----------
await t('   admin NE PEUT PAS se réactiver (active)',   set(ref(adminA, `restaurants/${A}/config/active`), false), 'ko');
await t('   admin NE PEUT PAS lever sa suspension',     set(ref(adminA, `restaurants/${A}/config/suspendu`), true), 'ko');
await t('OK plateforme suspend un restaurant',          update(ref(platform, `restaurants/${A}/config`), { active: false, suspendu: true }), 'ok');
await t('OK plateforme réactive un restaurant',         update(ref(platform, `restaurants/${A}/config`), { active: true, suspendu: false }), 'ok');

// ---------- 6. CROSS-TENANT : A ne touche jamais B ----------
await t('   admin A NE PEUT PAS écrire le menu de B',   set(ref(adminA, `restaurants/${B}/menu/cats`), []), 'ko');
await t('   admin A NE PEUT PAS lire config de B',      get(ref(adminA, `restaurants/${B}/config`)), 'ko');
await t('   admin A NE PEUT PAS lire devices de B',     get(ref(adminA, `restaurants/${B}/devices`)), 'ko');
await t('   menu-client A NE PEUT PAS commander chez B',set(ref(menuA,  `restaurants/${B}/orders/x`), { table: '1', ts: 2 }), 'ko');
await t('   admin B NE PEUT PAS écrire le menu de A',   set(ref(adminB, `restaurants/${A}/menu/cats`), []), 'ko');

// ---------- 7. PLATEFORME (control-app) ----------
await t('OK plateforme lit tous les restaurants',  get(ref(platform, 'restaurants')), 'ok');
await t('OK plateforme écrit le menu de A',        set(ref(platform, `restaurants/${A}/menu/hiddenThemes`), { x: true }), 'ok');
await t('OK plateforme archive un client',         set(ref(platform, `archivedClients/${A}`), { profile: { name: 'x' } }), 'ok');
await t('OK plateforme écrit demoPage',            set(ref(platform, 'demoPage/content/x'), 'y'), 'ok');
await t('   menu-client NE PEUT PAS lire tous les restaurants', get(ref(menuA, 'restaurants')), 'ko');
await t('   menu-client NE PEUT PAS écrire demoPage',           set(ref(menuA, 'demoPage/content/x'), 'pirate'), 'ko');
await t('   anonyme NE PEUT PAS lire les archives',             get(ref(anon, 'archivedClients')), 'ko');

// ---------- 8. logs/errors : plus de contournement par la profondeur ----------
await t('   anonyme NE PEUT PAS écrire sous logs/errors/x/y', set(ref(anon, `restaurants/${A}/logs/errors/x/y`), 'A'.repeat(5000)), 'ko');
await t('   anonyme NE PEUT PAS écrire un log hors format',   set(ref(anon, `restaurants/${A}/logs/errors/e9`), { msg: 'A'.repeat(5000), ts: 1 }), 'ko');
await t('OK log d\'erreur au bon format accepté',             set(ref(anon, `restaurants/${A}/logs/errors/e8`), { msg: 'oops', ts: 2 }), 'ok');

console.log('\n' + '='.repeat(78));
for (const [st, name] of results) console.log((st === 'PASS' ? '  ✅ ' : '  ❌ ') + name);
console.log('='.repeat(78));
console.log(`RÉSULTAT : ${pass} réussis, ${fail} échoués, ${pass + fail} au total`);
await testEnv.cleanup();
process.exit(fail > 0 ? 1 : 0);
