/**
 * Type definitions for the Genesys Cloud AI Search & Analytics Platform
 * Provides comprehensive type safety across all components
 */

// ============================================================================
// Core Data Types
// ============================================================================

/**
 * Genesys Cloud audit event structure
 */
export interface GenesysAuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  userId?: string;
  sessionId?: string;
  source: string;
  details: Record<string, any>;
  metadata?: AuditMetadata;
}

/**
 * Supported audit event types from Genesys Cloud
 */
export type AuditEventType = 
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'CALL_START'
  | 'CALL_END'
  | 'AGENT_STATE_CHANGE'
  | 'QUEUE_ASSIGNMENT'
  | 'SKILL_ASSIGNMENT'
  | 'CONFIGURATION_CHANGE'
  | 'SYSTEM_EVENT';

/**
 * Metadata associated with audit events
 */
export interface AuditMetadata {
  organizationId?: string;
  divisionId?: string;
  queueId?: string;
  agentId?: string;
  customerId?: string;
  interactionId?: string;
  [key: string]: any;
}

/**
 * Genesys Cloud Knowledge Base document structure
 */
export interface GenesysKBDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdDate: string;
  updatedDate: string;
  publishedDate?: string;
  version: number;
  metadata?: KBMetadata;
}

/**
 * Knowledge Base document metadata
 */
export interface KBMetadata {
  author?: string;
  reviewedBy?: string;
  language?: string;
  contentType?: string;
  visibility?: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED';
  [key: string]: any;
}

// ============================================================================
// Processing Types
// ============================================================================

/**
 * Text chunk for embedding and storage
 */
export interface TextChunk {
  id: string;
  content: string;
  embedding?: number[];
  metadata: ChunkMetadata;
  sourceId: string;
  sourceType: 'AUDIT' | 'KB_DOCUMENT';
  chunkIndex: number;
  totalChunks: number;
}

/**
 * Metadata for text chunks
 */
export interface ChunkMetadata {
  timestamp: string;
  source: string;
  originalLength: number;
  chunkLength: number;
  startPosition: number;
  endPosition: number;
  [key: string]: any;
}

/**
 * Normalized audit record for processing
 */
export interface NormalizedAuditRecord {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  userId?: string;
  content: string;
  metadata: AuditMetadata;
  processingTimestamp: string;
}

/**
 * Processing window for backfill operations
 */
export interface ProcessingWindow {
  windowId: string;
  startTime: string;
  endTime: string;
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  recordCount?: number;
  processedCount?: number;
  errorCount?: number;
}

// ============================================================================
// Search Types
// ============================================================================

/**
 * Search request structure
 */
export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
  includeAudits?: boolean;
  includeKB?: boolean;
  similarityThreshold?: number;
}

/**
 * Search filters for refining results
 */
export interface SearchFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  eventTypes?: AuditEventType[];
  userIds?: string[];
  categories?: string[];
  sources?: string[];
  [key: string]: any;
}

/**
 * Search response structure
 */
export interface SearchResponse {
  query: string;
  totalResults: number;
  results: SearchResult[];
  answer?: string;
  citations?: Citation[];
  processingTime: number;
  timestamp: string;
}

/**
 * Individual search result
 */
export interface SearchResult {
  id: string;
  content: string;
  score: number;
  sourceType: 'AUDIT' | 'KB_DOCUMENT';
  sourceId: string;
  metadata: Record<string, any>;
  highlights?: string[];
}

/**
 * Citation for AI-generated answers
 */
export interface Citation {
  sourceId: string;
  sourceType: 'AUDIT' | 'KB_DOCUMENT';
  title?: string;
  excerpt: string;
  relevanceScore: number;
  url?: string;
}

// ============================================================================
// AWS Service Types
// ============================================================================

/**
 * OpenSearch document structure
 */
export interface OpenSearchDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  timestamp: string;
  sourceType: 'AUDIT' | 'KB_DOCUMENT';
  sourceId: string;
}

/**
 * Bedrock embedding request
 */
export interface BedrockEmbeddingRequest {
  inputText: string;
  modelId?: string;
}

/**
 * Bedrock embedding response
 */
export interface BedrockEmbeddingResponse {
  embedding: number[];
  inputTextTokenCount: number;
}

/**
 * Bedrock LLM request for RAG
 */
export interface BedrockLLMRequest {
  prompt: string;
  context: string[];
  maxTokens?: number;
  temperature?: number;
  modelId?: string;
}

/**
 * Bedrock LLM response
 */
export interface BedrockLLMResponse {
  completion: string;
  stopReason: string;
  inputTokens: number;
  outputTokens: number;
}

// ============================================================================
// Lambda Event Types
// ============================================================================

/**
 * EventBridge event for audit notifications
 */
export interface AuditEventBridgeEvent {
  source: string;
  'detail-type': string;
  detail: GenesysAuditEvent;
  time: string;
  region: string;
  account: string;
}

/**
 * EventBridge event for KB document updates
 */
export interface KBEventBridgeEvent {
  source: string;
  'detail-type': string;
  detail: GenesysKBDocument;
  time: string;
  region: string;
  account: string;
}

/**
 * Step Functions input for backfill processing
 */
export interface BackfillStepFunctionInput {
  window: ProcessingWindow;
  batchSize: number;
  maxRetries?: number;
}

/**
 * API Gateway event for search requests
 */
export interface SearchAPIEvent {
  httpMethod: string;
  path: string;
  headers: Record<string, string>;
  body: string;
  queryStringParameters?: Record<string, string>;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * System configuration from SSM parameters
 */
export interface SystemConfig {
  batchSize: number;
  maxConcurrency: number;
  chunkSize: number;
  chunkOverlap: number;
  opensearchBulkSize: number;
  bedrockModelId: string;
  titanEmbeddingModel: string;
  searchResultsLimit: number;
  searchSimilarityThreshold: number;
  maxRetryAttempts: number;
  retryBackoffMultiplier: number;
  processingMetricsEnabled: boolean;
}

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  stage: string;
  region: string;
  opensearchDomain: string;
  opensearchEndpoint: string;
  eventBusName: string;
  stateMachineArn: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Custom error for processing failures
 */
export interface ProcessingError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  sourceId?: string;
  retryable: boolean;
}

/**
 * Batch processing result
 */
export interface BatchProcessingResult {
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: ProcessingError[];
  processingTime: number;
  lastProcessedTimestamp?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  timestamp: string;
  checks: Record<string, ComponentHealth>;
  error?: string;
}

/**
 * Individual component health status
 */
export interface ComponentHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  message?: string;
  lastChecked?: string;
  metrics?: Record<string, any>;
}

// ============================================================================
// Export all types
// ============================================================================

export * from './aws-lambda';
export * from './opensearch';
export * from './bedrock';