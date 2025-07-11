import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Test query
    const { data, error } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    if (error) {
      return NextResponse.json({ 
        status: 'error', 
        message: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      status: 'connected', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}