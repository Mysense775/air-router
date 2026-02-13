export interface User {
  id: string
  email: string
  name: string | null
  role: string
  created_at: string
}

export interface Balance {
  balance_usd: number
  lifetime_spent: number
  lifetime_earned: number
  currency: string
  last_deposit_at: string | null
}

export interface ApiKey {
  id: string
  name: string
  key?: string  // Only present on creation
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

export interface UsageStats {
  period: string
  total_requests: number
  total_tokens: number
  total_cost_usd: number
  total_profit_usd: number
  by_model: {
    model: string
    requests: number
    cost_usd: number
  }[]
}

export interface RequestLog {
  id: string
  model: string
  endpoint: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_usd: number
  status: string
  duration_ms: number
  created_at: string
}
