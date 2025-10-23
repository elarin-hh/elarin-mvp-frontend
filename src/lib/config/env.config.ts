/**
 * Environment Configuration
 * Centraliza acesso a variáveis de ambiente
 */

export const env = {
  // API
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3337',

  // Supabase
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
} as const;

/**
 * Verifica se usuário atual é desenvolvedor (via flag do banco de dados)
 * A flag is_dev vem do backend após login e é salva no localStorage
 */
export function isDeveloper(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('is_dev') === 'true';
}
