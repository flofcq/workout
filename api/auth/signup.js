import bcrypt from 'bcryptjs'
import { sql } from '../_lib/db.js'
import { createSessionCookie } from '../_lib/auth.js'
import { handler } from '../_lib/http.js'

export default handler({
  async POST(req, res) {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')

    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Adresse email invalide' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit faire 8 caractères minimum' })
    }

    const hash = await bcrypt.hash(password, 10)

    // `on conflict do nothing` : si l'email existe déjà, aucune ligne n'est
    // renvoyée. On évite ainsi la course entre un SELECT et un INSERT.
    const rows = await sql`
      insert into salle.users (email, password_hash)
      values (${email}, ${hash})
      on conflict (email) do nothing
      returning id, email
    `

    if (!rows.length) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cette adresse' })
    }

    res.setHeader('Set-Cookie', await createSessionCookie(rows[0].id))
    return res.status(201).json({ user: rows[0] })
  },
})
