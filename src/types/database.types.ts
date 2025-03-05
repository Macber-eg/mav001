// Add new types for marketplace system
export type MarketplaceItem = {
  id: string;
  type: 'eve' | 'workflow' | 'task' | 'action';
  name: string;
  description: string;
  preview_image_url?: string;
  price: number;
  is_subscription: boolean;
  subscription_interval?: 'monthly' | 'yearly';
  creator_company_id: string;
  is_public: boolean;
  metadata: Record<string, any>;
  ratings_count: number;
  average_rating: number;
  downloads_count: number;
  configuration: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type MarketplacePurchase = {
  id: string;
  item_id: string;
  buyer_company_id: string;
  purchase_date: string;
  subscription_end_date?: string;
  status: 'active' | 'cancelled' | 'expired';
  metadata: Record<string, any>;
}

export type MarketplaceReview = {
  id: string;
  item_id: string;
  company_id: string;
  rating: number;
  review_text?: string;
  created_at: string;
  updated_at: string;
}

// Add types for knowledge base management
export type CompanyKnowledge = {
  id: string;
  company_id: string;
  category: string;
  key: string;
  value: any;
  importance: number;
  is_private: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type EVEKnowledge = {
  id: string;
  eve_id: string;
  category: string;
  key: string;
  value: any;
  importance: number;
  is_private: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Add types for workflow automation
export type Workflow = {
  id: string;
  name: string;
  description: string;
  company_id: string;
  status: 'active' | 'inactive' | 'draft';
  trigger_type: 'manual' | 'scheduled' | 'event';
  trigger_config: Record<string, any>;
  steps: WorkflowStep[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type WorkflowStep = {
  id: string;
  workflow_id: string;
  type: 'task' | 'condition' | 'action' | 'delay' | 'notification';
  config: Record<string, any>;
  next_steps: string[];
  conditions?: WorkflowCondition[];
  position: { x: number; y: number };
  created_at: string;
  updated_at: string;
}

export type WorkflowCondition = {
  id: string;
  step_id: string;
  type: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'exists';
  field: string;
  value: any;
  next_step_id: string;
}

export type WorkflowExecution = {
  id: string;
  workflow_id: string;
  company_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  current_step_id: string;
  results: Record<string, any>;
  error?: string;
  started_at: string;
  completed_at?: string;
}

// Add types for memory system
export type Memory = {
  id: string;
  eve_id: string;
  type: 'conversation' | 'task' | 'fact' | 'preference' | 'relationship';
  key: string;
  value: any;
  importance: number;
  last_accessed: string;
  expiry?: string;
  metadata?: Record<string, any>;
  company_id: string;
  created_at: string;
  updated_at: string;
}

// Add types for voice capabilities
export type VoiceSettings = {
  id: string;
  eve_id: string;
  phone_number?: string;
  greeting_message?: string;
  fallback_message?: string;
  voice_id: string;
  enabled: boolean;
  use_openai_voice: boolean;
  openai_voice_model?: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export type VoiceCall = {
  id: string;
  eve_id: string;
  call_sid: string;
  caller_number: string;
  transcript?: string;
  audio_url?: string;
  status: string;
  duration?: number;
  started_at: string;
  ended_at?: string;
  metadata?: Record<string, any>;
  company_id: string;
  created_at: string;
}

// Add types for company AI settings
export type CompanyAISettings = {
  id: string;
  company_id: string;
  openai_api_key?: string;
  openai_org_id?: string;
  use_company_keys: boolean;
  default_model: string;
  token_quota?: number;
  tokens_used: number;
  created_at: string;
  updated_at: string;
}

// Add types for core entities
export type Company = {
  id: string;
  name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  created_at: string;
  updated_at: string;
}

export type User = {
  id: string;
  email: string;
  company_id: string;
  role: 'company_admin' | 'staff' | 'system_admin';
  created_at: string;
  updated_at: string;
}

export type EVE = {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  company_id: string;
  status: 'active' | 'inactive' | 'training' | 'error';
  capabilities: string[];
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export type Action = {
  id: string;
  name: string;
  description?: string;
  endpoint_url?: string;
  method: string;
  required_params?: any[];
  headers?: Record<string, string>;
  is_global: boolean;
  company_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export type EVEAction = {
  id: string;
  eve_id: string;
  action_id: string;
  parameters?: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  action?: Action;
}

export type Task = {
  id: string;
  eve_id: string;
  action_id?: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  parameters?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_date?: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export type Collaboration = {
  id: string;
  source_eve_id: string;
  target_eve_id: string;
  task_id: string;
  request_type: 'delegate' | 'assist' | 'review';
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_date?: string;
  metadata?: Record<string, any>;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export type Log = {
  id: string;
  eve_id?: string;
  action_id?: string;
  user_id?: string;
  company_id: string;
  event_type: string;
  status: 'success' | 'error' | 'pending' | 'cancelled';
  message: string;
  metadata?: Record<string, any>;
  created_at: string;
}