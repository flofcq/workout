import bcrypt from 'bcryptjs'
import { sql } from '../_lib/db.js'
import { createSessionCookie } from '../_lib/auth.js'
import { handler } from '../_lib/http.js'

// Hash factice comparé quand l'email est inconnu : le temps de réponse reste
// le même que pour un compte existant, ce qui évite de révéler quels emails
// sont enregistrés.
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

export default handler({
  async POST(req, res) {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')

    const rows = await sql`
      select id, email, password_hash from salle.users where email = ${email}
    `
    const user = rows[0]
    const ok = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH)

    if (!user || !ok) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    res.setHeader('Set-Cookie', await createSessionCookie(user.id))
    return res.status(200).json({ user: { id: user.id, email: user.email } })
  },
})
