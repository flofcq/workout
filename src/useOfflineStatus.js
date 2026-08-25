import { useEffect, useState } from 'react'
import { getOfflineStatus, subscribeOfflineStatus } from './offline/status.js'

export default function useOfflineStatus() {
  const [status, setStatus] = useState(getOfflineStatus)
  useEffect(() => subscribeOfflineStatus(setStatus), [])
  return status
}
