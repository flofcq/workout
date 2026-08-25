/** Erreur portant le code HTTP, pour que l'appelant puisse distinguer un 401. */
export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code // SQLSTATE Postgres, quand l'API en renvoie un
  }
}
