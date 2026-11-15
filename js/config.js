// Public client configuration. No secrets here: the Supabase anon key is public and protected by RLS.
export const SUPABASE_URL = 'https://mgkfurnltdzcqazvqbqv.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_u8nMiWmuQ9QBNGUBpU5TzQ_MgiO3-no';

// Function URL: same origin when running locally with `vercel dev`, the deployed Vercel URL otherwise.
const PROD_FUNCTION_URL = 'https://meddo-tau.vercel.app/api/ask';
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
export const FUNCTION_URL = isLocal ? '/api/ask' : PROD_FUNCTION_URL;
