import { SignJWT, jwtVerify } from 'jose'
import { sql } from './db.js'

const COOKIE = 'session'
const MAX_AGE = 60 * 60 * 24 * 60 // 60 jours

const secretString = process.env.AUTH_SECRET

if (!secretString || secretString.length < 32) {
  throw new Error(
    "AUTH_SECRET manquante ou trop courte (32 caractères minimum). " +
      'Génère-la avec : openssl rand -base64 32'
  )
}

const secret = new TextEncoder().encode(secretString)

export async function createSessionCookie(userId) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret)

  // httpOnly : le JWT est invisible pour le JavaScript de la page, donc
  // inexploitable par une injection de script. SameSite=Lax suffit ici,
  // le front et l'API étant servis depuis la même origine.
  const parts = [
    `${COOKIE}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE}`,
  ]
  if (process.env.NODE_ENV === 'production') parts.push('Secure')
  return parts.join('; ')
}

export function clearSessionCookie() {
  return `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
}

function readCookie(req, name) {
  const header = req.headers.cookie
  if (!header) return null
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return rest.join('=')
  }
  return null
}

/** Renvoie { id, email } si la requête porte une session valide, sinon null. */
export async function getUser(req) {
  const token = readCookie(req, COOKIE)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    const rows = await sql`select id, email from users where id = ${payload.sub}`
    return rows[0] || null
  } catch {
    // Token expiré, signature invalide, utilisateur supprimé : pas de session.
    return null
  }
}

/**
 * Garde d'authentification. Renvoie l'utilisateur, ou répond 401 et renvoie
 * null — auquel cas la route doit s'arrêter immédiatement.
 */
export async function requireUser(req, res) {
  const user = await getUser(req)
  if (!user) {
    res.status(401).json({ error: 'Non authentifié' })
    return null
  }
  return user
}
