import { clearSessionCookie } from '../_lib/auth.js'
import { handler } from '../_lib/http.js'

export default handler({
  POST(req, res) {
    res.setHeader('Set-Cookie', clearSessionCookie())
    return res.status(200).json({ ok: true })
  },
})
