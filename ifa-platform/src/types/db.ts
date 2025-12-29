import type {
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate
} from '@/types/database.types';

export type { Database, Enums, Json, Tables, TablesInsert, TablesUpdate };

export type DbTableKey = keyof Database['public']['Tables'];
export type DbTables = Database['public']['Tables'];
export type DbViews = Database['public']['Views'];
export type DbRow<T extends DbTableKey> = Database['public']['Tables'][T]['Row'];
export type DbInsert<T extends DbTableKey> = Database['public']['Tables'][T]['Insert'];
export type DbUpdate<T extends DbTableKey> = Database['public']['Tables'][T]['Update'];

export type DbEnumKey = keyof Database['public']['Enums'];
export type DbEnum<T extends DbEnumKey> = Database['public']['Enums'][T];
