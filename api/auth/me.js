import { getUser } from '../_lib/auth.js'
import { handler } from '../_lib/http.js'

export default handler({
  async GET(req, res) {
    // 200 avec user: null plutôt qu'un 401 — au chargement de l'app, « pas
    // connecté » est une réponse normale, pas une erreur.
    const user = await getUser(req)
    return res.status(200).json({ user })
  },
})
