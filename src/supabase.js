import { createClient } from '@supabase/supabase-js'
import { mockSupabase } from './supabase.mock'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Mode démo : interface remplie avec des données factices, aucune base requise.
// Active-le avec VITE_DEMO=1 (voir README) pour regarder l'app avant de créer
// ton projet Supabase.
const demo = import.meta.env.VITE_DEMO === '1'

export const isConfigured = demo || Boolean(url && anonKey)
export const isDemo = demo

export const supabase = demo
  ? mockSupabase
  : isConfigured
    ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
    : null
