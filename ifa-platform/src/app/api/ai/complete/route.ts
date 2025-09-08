import { createClient } from "@/lib/supabase/server"
// =====================================================
// FILE: src/app/api/ai/complete/route.ts
// AI COMPLETION API WITH MULTIPLE PROVIDER SUPPORT - FIXED
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'

// =====================================================
// TYPES & VALIDATION
// =====================================================

const requestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string()
  })),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(4000).optional(),
  stream: z.boolean().optional()
})

type AIProvider = 'openai' | 'anthropic' | 'deepseek' | 'mock'

interface AIConfig {
  provider: AIProvider
  apiKey: string | null
  apiUrl: string
  model: string
  maxTokens: number
  temperature: number
}

// =====================================================
// CONFIGURATION
// =====================================================

const getAIConfig = (): AIConfig => {
  const provider = (process.env.AI_PROVIDER || 'mock') as AIProvider
  
  const configs: Record<AIProvider, AIConfig> = {
    openai: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || null,
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      maxTokens: 2000,
      temperature: 0.3
    },
    anthropic: {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY || null,
      apiUrl: 'https://api.anthropic.com/v1/messages',
      model: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229',
      maxTokens: 2000,
      temperature: 0.3
    },
    deepseek: {
      provider: 'deepseek',
      apiKey: process.env.DEEPSEEK_API_KEY || null,
      apiUrl: 'https://api.deepseek.com/v1/chat/completions',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      maxTokens: 2000,
      temperature: 0.3
    },
    mock: {
      provider: 'mock',
      apiKey: null,
      apiUrl: '',
      model: 'mock',
      maxTokens: 2000,
      temperature: 0.3
    }
  }
  
  return configs[provider]
}

// =====================================================
// RATE LIMITING
// =====================================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 100

function checkRateLimit(clientId: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(clientId)
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return true
  }
  
  if (limit.count >= RATE_LIMIT_MAX) {
    return false
  }
  
  limit.count++
  return true
}

// =====================================================
// AI PROVIDERS
// =====================================================

async function callOpenAI(
  config: AIConfig,
  messages: any[],
  options: any
): Promise<string> {
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || config.model,
      messages,
      temperature: options.temperature || config.temperature,
      max_tokens: options.max_tokens || config.maxTokens,
      response_format: { type: 'json_object' }
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }
  
  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

async function callAnthropic(
  config: AIConfig,
  messages: any[],
  options: any
): Promise<string> {
  // Convert messages format for Anthropic
  const systemMessage = messages.find(m => m.role === 'system')?.content || ''
  const userMessages = messages.filter(m => m.role !== 'system')
  
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey!,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || config.model,
      system: systemMessage,
      messages: userMessages,
      max_tokens: options.max_tokens || config.maxTokens,
      temperature: options.temperature || config.temperature
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${error}`)
  }
  
  const data = await response.json()
  return data.content[0]?.text || ''
}

async function callDeepSeek(
  config: AIConfig,
  messages: any[],
  options: any
): Promise<string> {
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || config.model,
      messages,
      temperature: options.temperature || config.temperature,
      max_tokens: options.max_tokens || config.maxTokens,
      response_format: { type: 'json_object' }
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`)
  }
  
  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

function generateMockResponse(messages: any[]): string {
  const lastMessage = messages[messages.length - 1]?.content || ''
  
  // Check if the request is asking for field suggestions
  if (lastMessage.includes('field') || lastMessage.includes('suggestion')) {
    return JSON.stringify({
      fieldSuggestions: {
        client_name: 'John Smith',
        age: 45,
        target_retirement_age: 65,
        annual_income: 75000,
        monthly_expenditure: 3500,
        investment_amount: 100000,
        time_horizon: 20
      },
      insights: [
        'Client is in peak earning years with good savings potential',
        'Consider maximizing pension contributions for tax efficiency',
        'Emergency fund should be at least £21,000 (6 months expenses)'
      ],
      warnings: [],
      confidence: 0.85
    })
  }
  
  // Check if the request is about risk assessment
  if (lastMessage.includes('risk') || lastMessage.includes('ATR') || lastMessage.includes('CFL')) {
    return JSON.stringify({
      suggestedATR: 5,
      suggestedCFL: '30%',
      reasoning: 'Based on age, income, and investment timeline, a balanced risk approach is suitable',
      warnings: [],
      recommendedAllocation: {
        equities: 60,
        bonds: 35,
        alternatives: 5
      }
    })
  }
  
  // Check if validation is requested
  if (lastMessage.includes('validation') || lastMessage.includes('compliance')) {
    return JSON.stringify({
      issues: [],
      suggestions: [
        'All required fields are complete',
        'Risk profile is consistent with objectives'
      ],
      fcaCompliant: true
    })
  }
  
  // Default response
  return JSON.stringify({
    suggestion: 'Mock suggestion for testing',
    reasoning: 'This is a development environment response',
    confidence: 0.5,
    alternatives: []
  })
}

// =====================================================
// LOGGING & ANALYTICS - FIXED
// =====================================================

async function logAIRequest(
  provider: AIProvider,
  success: boolean,
  responseTime: number,
  error?: string
) {
  try {
    // Check for environment variables first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // ✅ FIXED: Changed from SUPABASE_SERVICE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not configured for AI logging')
      return
    }
    
    // Log to Supabase for analytics
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          get(name: string) {
            return null
          },
          set() {},
          remove() {}
        }
      }
    )
    
    await supabase.from('ai_request_logs').insert({
      provider,
      success,
      response_time_ms: responseTime,
      error_message: error,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('Failed to log AI request:', err)
    // Don't throw - logging failure shouldn't break the main request
  }
}

// =====================================================
// MAIN HANDLER
// =====================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let provider: AIProvider = 'mock'
  
  try {
    // Get client ID from headers or session
    const headersList = headers()
    const clientId = headersList.get('x-client-id') || 'anonymous'
    
    // Check rate limit
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }
    
    // Parse and validate request
    const body = await request.json()
    const validatedData = requestSchema.parse(body)
    
    // Get AI configuration
    const config = getAIConfig()
    provider = config.provider
    
    // Check if provider is configured
    if (config.provider !== 'mock' && !config.apiKey) {
      console.warn(`${config.provider} API key not configured, using mock responses`)
      provider = 'mock'
    }
    
    let content: string
    
    // Call appropriate provider
    switch (provider) {
      case 'openai':
        content = await callOpenAI(config, validatedData.messages, validatedData)
        break
        
      case 'anthropic':
        content = await callAnthropic(config, validatedData.messages, validatedData)
        break
        
      case 'deepseek':
        content = await callDeepSeek(config, validatedData.messages, validatedData)
        break
        
      case 'mock':
      default:
        content = generateMockResponse(validatedData.messages)
        break
    }
    
    // Log successful request
    const responseTime = Date.now() - startTime
    await logAIRequest(provider, true, responseTime)
    
    // Return response
    return NextResponse.json({
      content,
      provider,
      model: config.model,
      usage: {
        prompt_tokens: 0, // Would need to calculate based on provider
        completion_tokens: 0,
        total_tokens: 0
      }
    })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Log failed request
    await logAIRequest(provider, false, responseTime, errorMessage)
    
    // Handle different error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }
    
    if (errorMessage.includes('API error')) {
      return NextResponse.json(
        { error: 'AI service temporarily unavailable', provider },
        { status: 503 }
      )
    }
    
    console.error('AI API error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// OPTIONS HANDLER FOR CORS
// =====================================================

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-id',
      'Access-Control-Max-Age': '86400'
    }
  })
}