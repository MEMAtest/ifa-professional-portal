// src/lib/env.ts
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

type EnvVarName = typeof requiredEnvVars[number];

class EnvironmentError extends Error {
  constructor(varName: string) {
    super(`Missing required environment variable: ${varName}`);
    this.name = 'EnvironmentError';
  }
}

export function validateEnv(): void {
  const missing: string[] = [];
  
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    console.error('Missing environment variables:', missing);
    throw new EnvironmentError(missing.join(', '));
  }
}

export function getEnvVar(name: EnvVarName): string {
  const value = process.env[name];
  if (!value) {
    throw new EnvironmentError(name);
  }
  return value;
}

// Run validation
if (typeof window === 'undefined') {
  validateEnv();
}