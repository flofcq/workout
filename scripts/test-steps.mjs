// Vérifie les gardes de la route /api/steps sans avoir besoin d'une base :
// tous les cas ci-dessous répondent avant la moindre requête SQL.
//
//   node scripts/test-steps.mjs              # route configurée
//   node scripts/test-steps.mjs sans-config  # STEPS_TOKEN/STEPS_EMAIL absentes

const sansConfig = process.argv[2] === 'sans-config'

process.env.DATABASE_URL = 'postgresql://u:p@ep-inexistant.aws.neon.tech/db'
process.env.AUTH_SECRET = 'x'.repeat(40)
if (!sansConfig) {
  process.env.STEPS_TOKEN = 'jeton-secret-de-test'
  process.env.STEPS_EMAIL = 'Toi@Exemple.com  ' // casse et espaces : normalisés au chargement
}

const { default: route } = await import('../api/steps/index.js')

function fakeRes() {
  const res = { code: null, body: null, headers: {} }
  res.setHeader = (k, v) => { res.headers[k] = v }
  res.status = (c) => { res.code = c; return res }
  res.json = (b) => { res.body = b; return res }
  return res
}

async function call(req) {
  const res = fakeRes()
  await route({ headers: {}, ...req }, res)
  return res
}

const bearer = (t) => ({ authorization: `Bearer ${t}` })
const bon = bearer('jeton-secret-de-test')

// Sans configuration, toute écriture est refusée en 503 avant même le jeton.
const attenduPost = (code) => (sansConfig ? 503 : code)

const cas = [
  ['jeton absent', { method: 'POST', body: { steps: 9000 } }, attenduPost(401)],
  ['jeton faux', { method: 'POST', headers: bearer('mauvais'), body: { steps: 9000 } }, attenduPost(401)],
  ['jeton bon mais préfixe Bearer absent', { method: 'POST', headers: { authorization: 'jeton-secret-de-test' }, body: { steps: 9000 } }, attenduPost(401)],
  ['steps absent', { method: 'POST', headers: bon, body: {} }, attenduPost(400)],
  ['steps négatif', { method: 'POST', headers: bon, body: { steps: -5 } }, attenduPost(400)],
  ['steps aberrant', { method: 'POST', headers: bon, body: { steps: 999999 } }, attenduPost(400)],
  ['corps JSON invalide', { method: 'POST', headers: bon, body: '{pas du json' }, attenduPost(400)],
  ['méthode GET refusée', { method: 'GET' }, 405],
]

let echecs = 0
for (const [nom, req, attendu] of cas) {
  const res = await call(req)
  const ok = res.code === attendu
  if (!ok) echecs++
  console.log(`${ok ? '✓' : '✗'} ${nom} → ${res.code} (attendu ${attendu})`)
}

if (!sansConfig) {
  // Une requête valide doit franchir toutes les gardes et n'échouer que sur la
  // base injoignable — c'est ce que prouve le 500.
  const res = await call({ method: 'POST', headers: bon, body: { steps: 9411.6, date: '2026-08-16' } })
  const ok = res.code === 500
  if (!ok) echecs++
  console.log(`${ok ? '✓' : '✗'} requête valide → franchit les gardes et atteint la base (${res.code})`)
}

console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est vert.')
process.exit(echecs ? 1 : 0)
