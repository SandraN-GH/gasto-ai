import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface PublicAppConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
}

let clientInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;

async function fetchPublicConfig(): Promise<PublicAppConfig> {
  let response: Response;
  try {
    response = await fetch('/api/config', {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(
      'Não foi possível conectar ao servidor para carregar a configuração.'
    );
  }

  if (!response.ok) {
    throw new Error(
      'Serviço de configuração indisponível no momento. Tente novamente.'
    );
  }

  const data = (await response.json()) as Partial<PublicAppConfig>;
  if (!data.supabaseUrl || !data.supabasePublishableKey) {
    throw new Error('Configuração de autenticação incompleta no servidor.');
  }

  return {
    supabaseUrl: data.supabaseUrl,
    supabasePublishableKey: data.supabasePublishableKey,
  };
}

export async function initSupabaseClient(): Promise<SupabaseClient> {
  if (clientInstance) return clientInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const config = await fetchPublicConfig();
      clientInstance = createClient(
        config.supabaseUrl,
        config.supabasePublishableKey,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
          },
        }
      );
      return clientInstance;
    } catch (err) {
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

export function getSupabaseClient(): SupabaseClient | null {
  return clientInstance;
}
