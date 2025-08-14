/**
 * Amazon Bedrock specific type definitions
 * Provides type safety for Bedrock AI model interactions
 */

// ============================================================================
// Bedrock Client Configuration
// ============================================================================

/**
 * Bedrock client configuration
 */
export interface BedrockConfig {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  maxRetries?: number;
  timeout?: number;
}

// ============================================================================
// Model Identifiers
// ============================================================================

/**
 * Supported Bedrock model identifiers
 */
export type BedrockModelId = 
  // Claude models
  | 'anthropic.claude-3-sonnet-20240229-v1:0'
  | 'anthropic.claude-3-haiku-20240307-v1:0'
  | 'anthropic.claude-3-opus-20240229-v1:0'
  | 'anthropic.claude-v2:1'
  | 'anthropic.claude-v2'
  | 'anthropic.claude-instant-v1'
  
  // Titan models
  | 'amazon.titan-text-lite-v1'
  | 'amazon.titan-text-express-v1'
  | 'amazon.titan-embed-text-v1'
  | 'amazon.titan-embed-image-v1'
  
  // Jurassic models
  | 'ai21.j2-ultra-v1'
  | 'ai21.j2-mid-v1'
  
  // Command models
  | 'cohere.command-text-v14'
  | 'cohere.command-light-text-v14'
  | 'cohere.embed-english-v3'
  | 'cohere.embed-multilingual-v3'
  
  // Llama models
  | 'meta.llama2-13b-chat-v1'
  | 'meta.llama2-70b-chat-v1';

/**
 * Embedding model identifiers
 */
export type EmbeddingModelId = 
  | 'amazon.titan-embed-text-v1'
  | 'amazon.titan-embed-image-v1'
  | 'cohere.embed-english-v3'
  | 'cohere.embed-multilingual-v3';

/**
 * Text generation model identifiers
 */
export type TextModelId = 
  | 'anthropic.claude-3-sonnet-20240229-v1:0'
  | 'anthropic.claude-3-haiku-20240307-v1:0'
  | 'anthropic.claude-3-opus-20240229-v1:0'
  | 'amazon.titan-text-express-v1'
  | 'ai21.j2-ultra-v1'
  | 'cohere.command-text-v14'
  | 'meta.llama2-70b-chat-v1';

// ============================================================================
// Embedding Types
// ============================================================================

/**
 * Titan embedding request
 */
export interface TitanEmbeddingRequest {
  inputText: string;
  dimensions?: number;
  normalize?: boolean;
}

/**
 * Titan embedding response
 */
export interface TitanEmbeddingResponse {
  embedding: number[];
  inputTextTokenCount: number;
}

/**
 * Cohere embedding request
 */
export interface CohereEmbeddingRequest {
  texts: string[];
  input_type?: 'search_document' | 'search_query' | 'classification' | 'clustering';
  embedding_types?: ('float' | 'int8' | 'uint8' | 'binary' | 'ubinary')[];
  model?: string;
  truncate?: 'NONE' | 'START' | 'END';
}

/**
 * Cohere embedding response
 */
export interface CohereEmbeddingResponse {
  embeddings: number[][];
  texts: string[];
  meta: {
    api_version: {
      version: string;
    };
    billed_units: {
      input_tokens: number;
    };
  };
}

/**
 * Generic embedding request
 */
export interface EmbeddingRequest {
  text: string | string[];
  modelId: EmbeddingModelId;
  dimensions?: number;
  normalize?: boolean;
  inputType?: string;
}

/**
 * Generic embedding response
 */
export interface EmbeddingResponse {
  embeddings: number[][];
  tokenCount: number;
  modelId: string;
  dimensions: number;
}

// ============================================================================
// Text Generation Types
// ============================================================================

/**
 * Claude text generation request
 */
export interface ClaudeRequest {
  prompt: string;
  max_tokens_to_sample: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  anthropic_version?: string;
}

/**
 * Claude text generation response
 */
export interface ClaudeResponse {
  completion: string;
  stop_reason: 'stop_sequence' | 'max_tokens' | 'end_turn';
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Claude 3 message format request
 */
export interface Claude3Request {
  messages: Claude3Message[];
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  system?: string;
  anthropic_version: string;
}

/**
 * Claude 3 message
 */
export interface Claude3Message {
  role: 'user' | 'assistant';
  content: string | Claude3Content[];
}

/**
 * Claude 3 content block
 */
export interface Claude3Content {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

/**
 * Claude 3 response
 */
export interface Claude3Response {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Titan text generation request
 */
export interface TitanTextRequest {
  inputText: string;
  textGenerationConfig: {
    maxTokenCount: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
  };
}

/**
 * Titan text generation response
 */
export interface TitanTextResponse {
  inputTextTokenCount: number;
  results: Array<{
    tokenCount: number;
    outputText: string;
    completionReason: 'FINISH' | 'LENGTH' | 'CONTENT_FILTERED';
  }>;
}

/**
 * AI21 Jurassic request
 */
export interface JurassicRequest {
  prompt: string;
  maxTokens: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  countPenalty?: {
    scale: number;
    applyToNumbers?: boolean;
    applyToPunctuations?: boolean;
    applyToStopwords?: boolean;
    applyToWhitespaces?: boolean;
    applyToEmojis?: boolean;
  };
  presencePenalty?: {
    scale: number;
    applyToNumbers?: boolean;
    applyToPunctuations?: boolean;
    applyToStopwords?: boolean;
    applyToWhitespaces?: boolean;
    applyToEmojis?: boolean;
  };
  frequencyPenalty?: {
    scale: number;
    applyToNumbers?: boolean;
    applyToPunctuations?: boolean;
    applyToStopwords?: boolean;
    applyToWhitespaces?: boolean;
    applyToEmojis?: boolean;
  };
}

/**
 * AI21 Jurassic response
 */
export interface JurassicResponse {
  id: string;
  prompt: {
    text: string;
    tokens: Array<{
      generatedToken: {
        token: string;
        logprob: number;
        raw_logprob: number;
      };
      topTokens: any;
      textRange: {
        start: number;
        end: number;
      };
    }>;
  };
  completions: Array<{
    data: {
      text: string;
      tokens: Array<{
        generatedToken: {
          token: string;
          logprob: number;
          raw_logprob: number;
        };
        topTokens: any;
        textRange: {
          start: number;
          end: number;
        };
      }>;
    };
    finishReason: {
      reason: 'endoftext' | 'length' | 'stop';
      length?: number;
    };
  }>;
}

/**
 * Generic text generation request
 */
export interface TextGenerationRequest {
  prompt: string;
  modelId: TextModelId;
  maxTokens: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  system?: string;
}

/**
 * Generic text generation response
 */
export interface TextGenerationResponse {
  text: string;
  stopReason: string;
  inputTokens: number;
  outputTokens: number;
  modelId: string;
}

// ============================================================================
// RAG-Specific Types
// ============================================================================

/**
 * RAG prompt template
 */
export interface RAGPromptTemplate {
  systemPrompt?: string;
  contextTemplate: string;
  questionTemplate: string;
  answerTemplate?: string;
  maxContextLength?: number;
}

/**
 * RAG context chunk
 */
export interface RAGContext {
  content: string;
  source: string;
  sourceType: 'AUDIT' | 'KB_DOCUMENT';
  score: number;
  metadata?: Record<string, any>;
}

/**
 * RAG request
 */
export interface RAGRequest {
  question: string;
  context: RAGContext[];
  modelId: TextModelId;
  template?: RAGPromptTemplate;
  maxTokens?: number;
  temperature?: number;
  includeSourceCitations?: boolean;
}

/**
 * RAG response
 */
export interface RAGResponse {
  answer: string;
  sources: RAGContext[];
  citations?: Citation[];
  confidence?: number;
  inputTokens: number;
  outputTokens: number;
  processingTime: number;
}

/**
 * Source citation
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
// Streaming Types
// ============================================================================

/**
 * Streaming text generation request
 */
export interface StreamingTextRequest extends TextGenerationRequest {
  stream: true;
}

/**
 * Streaming response chunk
 */
export interface StreamingChunk {
  type: 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_start' | 'message_delta' | 'message_stop';
  index?: number;
  delta?: {
    type: 'text_delta';
    text: string;
  };
  content_block?: {
    type: 'text';
    text: string;
  };
  message?: {
    id: string;
    type: 'message';
    role: 'assistant';
    content: any[];
    model: string;
    stop_reason?: string;
    stop_sequence?: string;
    usage: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Bedrock API error
 */
export interface BedrockError {
  message: string;
  code: string;
  statusCode: number;
  retryable: boolean;
  retryDelay?: number;
}

/**
 * Model-specific error types
 */
export type BedrockErrorCode = 
  | 'ValidationException'
  | 'ResourceNotFoundException'
  | 'AccessDeniedException'
  | 'ThrottlingException'
  | 'InternalServerException'
  | 'ServiceQuotaExceededException'
  | 'ModelTimeoutException'
  | 'ModelNotReadyException'
  | 'ModelErrorException';

/**
 * Custom Bedrock client error
 */
export class BedrockClientError extends Error {
  public readonly code: BedrockErrorCode;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly retryDelay?: number;

  constructor(
    message: string,
    code: BedrockErrorCode,
    statusCode: number = 500,
    retryable: boolean = false,
    retryDelay?: number
  ) {
    super(message);
    this.name = 'BedrockClientError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.retryDelay = retryDelay;
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Model capabilities
 */
export interface ModelCapabilities {
  supportsEmbedding: boolean;
  supportsTextGeneration: boolean;
  supportsStreaming: boolean;
  supportsImages: boolean;
  maxTokens: number;
  contextWindow: number;
  embeddingDimensions?: number;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost?: number;
}

/**
 * Batch processing request
 */
export interface BatchRequest<T> {
  requests: T[];
  batchSize?: number;
  maxConcurrency?: number;
  retryConfig?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

/**
 * Batch processing response
 */
export interface BatchResponse<T> {
  results: T[];
  errors: Array<{
    index: number;
    error: BedrockError;
  }>;
  totalProcessed: number;
  totalErrors: number;
  processingTime: number;
}