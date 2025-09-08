// src/hooks/useAutoSave.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';

interface AutoSaveOptions {
  debounceMs?: number;
  tableName: string;
  idField?: string;
  onSave?: (data: any) => Promise<void>;
  enabled?: boolean;
}

export function useAutoSave<T extends Record<string, any>>(
  data: T,
  id: string | null,
  options: AutoSaveOptions
) {
  const {
    debounceMs = 2000,
    tableName,
    idField = 'id',
    onSave,
    enabled = true
  } = options;

  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const previousDataRef = useRef<string>();
  
  // ✅ Create the supabase client
  const supabase = createClient();

  // Track changes
  useEffect(() => {
    const currentDataString = JSON.stringify(data);
    
    if (previousDataRef.current && previousDataRef.current !== currentDataString) {
      setHasUnsavedChanges(true);
    }
    
    previousDataRef.current = currentDataString;
  }, [data]);

  // Auto-save logic
  const performSave = useCallback(async () => {
    if (!enabled || !hasUnsavedChanges) return;

    setIsSaving(true);
    
    try {
      if (onSave) {
        // Use custom save function if provided
        await onSave(data);
      } else {
        // Default Supabase save
        const saveData = {
          ...data,
          updated_at: new Date().toISOString()
        };

        if (id) {
          // Update existing record
          const { error } = await supabase  // ✅ Now supabase is defined
            .from(tableName)
            .update(saveData)
            .eq(idField, id);

          if (error) throw error;
        } else {
          // For new records, you might want to handle this differently
          console.warn('No ID provided for auto-save');
          return;
        }
      }

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      
      // Show subtle success indicator
      toast({
        title: "Saved",
        description: "Your changes have been saved",
        duration: 2000,
      });
    } catch (error) {
      console.error('Auto-save error:', error);
      toast({
        title: "Auto-save failed",
        description: "Your changes could not be saved. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [data, id, enabled, hasUnsavedChanges, onSave, tableName, idField, toast, supabase]); // ✅ Add supabase to deps

  // Debounced save
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, enabled, hasUnsavedChanges, debounceMs, performSave]);

  // Save on unmount if there are unsaved changes
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges && enabled) {
        // Note: This is a synchronous cleanup, so we can't await
        // Consider using beforeunload event for critical saves
        performSave();
      }
    };
  }, [hasUnsavedChanges, enabled, performSave]);

  // Manual save trigger
  const saveNow = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await performSave();
  }, [performSave]);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    saveNow
  };
}

// Example usage in a form component:
/*
export function MyForm({ clientId }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    // ... other fields
  });

  const { isSaving, lastSaved, hasUnsavedChanges } = useAutoSave(
    formData,
    clientId,
    {
      tableName: 'clients',
      debounceMs: 1500,
      enabled: true
    }
  );

  return (
    <form>
      {hasUnsavedChanges && (
        <Badge variant="outline">Unsaved changes</Badge>
      )}
      {isSaving && <Spinner />}
      {lastSaved && (
        <span className="text-sm text-gray-500">
          Last saved: {lastSaved.toLocaleTimeString()}
        </span>
      )}
      
      <input
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
      />
    </form>
  );
}
*/