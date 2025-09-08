declare module '@supabase/ssr' {
  export function createServerClient<Database = any>(
    supabaseUrl: string,
    supabaseKey: string,
    options?: any
  ): any;
  
  export function createBrowserClient<Database = any>(
    supabaseUrl: string,
    supabaseKey: string,
    options?: any
  ): any;
}