// ===== FILE: src/lib/monte-carlo/database.ts =====
// CHANGE: Correct the Supabase query to prevent build failures

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ... (other parts of your database library)

class MonteCarloDatabase {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // UPDATE: Corrected the health status query to use modern Supabase syntax
  async getHealthStatus(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // The original query used a 'count(*)' syntax that is no longer supported
      // and caused the build to fail. This has been corrected.
      const { count, error } = await this.supabase
        .from('cash_flow_scenarios') // Assuming this is the table you want to check
        .select('*', { count: 'exact', head: true }); // ✅ CORRECT WAY TO COUNT

      if (error) {
        // This will now correctly capture and report query parsing errors
        console.error('Database health check failed:', error.message);
        return { success: false, error: `Database health check failed: "${error.message}"` };
      }

      return {
        success: true,
        data: {
          connection: 'ok',
          canQuery: true,
          scenarioCount: count, // The count of rows
        },
      };

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error('Failed to get database health status:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // ... (rest of your listScenarios, etc. methods)
  
  async listScenarios(page: number, pageSize: number) {
    // Ensure all other queries are also using the correct, modern syntax
    // For example, fetching data should look like this:
    const { data, error } = await this.supabase
      .from('your_table')
      .select('column1, column2')
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
        return { success: false, error: error.message, data: [] };
    }

    return { success: true, data };
  }
}

// Ensure a single instance is used throughout the app
let dbInstance: MonteCarloDatabase | null = null;

export function getMonteCarloDatabase() {
  if (!dbInstance) {
    dbInstance = new MonteCarloDatabase();
  }
  return dbInstance;
}