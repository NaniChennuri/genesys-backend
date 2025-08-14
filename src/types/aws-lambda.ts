/**
 * AWS Lambda specific type definitions
 * Extends AWS Lambda types with project-specific interfaces
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

// ============================================================================
// Lambda Handler Types
// ============================================================================

/**
 * Generic Lambda handler type
 */
export type LambdaHandler<TEvent = any, TResult = any> = (
  event: TEvent,
  context: Context
) => Promise<TResult>;

/**
 * API Gateway Lambda handler type
 */
export type APIGatewayHandler = LambdaHandler<APIGatewayProxyEvent, APIGatewayProxyResult>;

/**
 * EventBridge Lambda handler type
 */
export type EventBridgeHandler<TDetail = any> = LambdaHandler<EventBridgeEvent<TDetail>, void>;

/**
 * Step Functions Lambda handler type
 */
export type StepFunctionsHandler<TInput = any, TOutput = any> = LambdaHandler<TInput, TOutput>;

// ============================================================================
// Event Types
// ============================================================================

/**
 * EventBridge event structure
 */
export interface EventBridgeEvent<TDetail = any> {
  version: string;
  id: string;
  'detail-type': string;
  source: string;
  account: string;
  time: string;
  region: string;
  detail: TDetail;
}

/**
 * Lambda response for API Gateway
 */
export interface LambdaAPIResponse<T = any> {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

/**
 * Standard Lambda error response
 */
export interface LambdaErrorResponse {
  statusCode: number;
  body: string;
  headers: {
    'Content-Type': string;
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Headers': string;
    'Access-Control-Allow-Methods': string;
  };
}

// ============================================================================
// Lambda Context Extensions
// ============================================================================

/**
 * Extended Lambda context with additional utilities
 */
export interface ExtendedLambdaContext extends Context {
  requestId: string;
  stage: string;
  region: string;
  startTime: number;
}

// ============================================================================
// Lambda Response Builders
// ============================================================================

/**
 * Success response builder for API Gateway
 */
export const createSuccessResponse = <T>(
  data: T,
  statusCode: number = 200,
  headers: Record<string, string> = {}
): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    ...headers,
  },
  body: JSON.stringify({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  }),
});

/**
 * Error response builder for API Gateway
 */
export const createErrorResponse = (
  error: string,
  statusCode: number = 500,
  details?: any
): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  },
  body: JSON.stringify({
    success: false,
    error,
    details,
    timestamp: new Date().toISOString(),
  }),
});

// ============================================================================
// Lambda Utilities
// ============================================================================

/**
 * Parse JSON body from API Gateway event safely
 */
export const parseJSONBody = <T = any>(event: APIGatewayProxyEvent): T | null => {
  try {
    return event.body ? JSON.parse(event.body) : null;
  } catch (error) {
    console.error('Failed to parse JSON body:', error);
    return null;
  }
};

/**
 * Extract query parameters from API Gateway event
 */
export const getQueryParameters = (event: APIGatewayProxyEvent): Record<string, string> => {
  return event.queryStringParameters || {};
};

/**
 * Extract headers from API Gateway event
 */
export const getHeaders = (event: APIGatewayProxyEvent): Record<string, string> => {
  return event.headers || {};
};

/**
 * Get correlation ID from Lambda context or generate one
 */
export const getCorrelationId = (context: Context): string => {
  return context.awsRequestId;
};

/**
 * Calculate remaining execution time in milliseconds
 */
export const getRemainingTime = (context: Context): number => {
  return context.getRemainingTimeInMillis();
};

// ============================================================================
// Lambda Middleware Types
// ============================================================================

/**
 * Lambda middleware function type
 */
export type LambdaMiddleware<TEvent = any, TResult = any> = (
  handler: LambdaHandler<TEvent, TResult>
) => LambdaHandler<TEvent, TResult>;

/**
 * Middleware configuration options
 */
export interface MiddlewareOptions {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableTracing?: boolean;
  enableErrorHandling?: boolean;
  corsEnabled?: boolean;
}

// ============================================================================
// Lambda Decorators
// ============================================================================

/**
 * Lambda function metadata for decorators
 */
export interface LambdaMetadata {
  functionName: string;
  description?: string;
  timeout?: number;
  memorySize?: number;
  environment?: Record<string, string>;
  tags?: Record<string, string>;
}

/**
 * Performance metrics for Lambda functions
 */
export interface LambdaMetrics {
  executionTime: number;
  memoryUsed: number;
  billedDuration: number;
  initDuration?: number;
  coldStart: boolean;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Lambda-specific error with additional context
 */
export class LambdaError extends Error {
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly retryable: boolean;
  public readonly timestamp: string;

  constructor(
    message: string,
    statusCode: number = 500,
    details?: any,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'LambdaError';
    this.statusCode = statusCode;
    this.details = details;
    this.retryable = retryable;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Validation error for Lambda inputs
 */
export class ValidationError extends LambdaError {
  constructor(message: string, details?: any) {
    super(message, 400, details, false);
    this.name = 'ValidationError';
  }
}

/**
 * Business logic error for Lambda functions
 */
export class BusinessError extends LambdaError {
  constructor(message: string, details?: any) {
    super(message, 422, details, false);
    this.name = 'BusinessError';
  }
}

/**
 * External service error (retryable)
 */
export class ExternalServiceError extends LambdaError {
  constructor(message: string, details?: any) {
    super(message, 502, details, true);
    this.name = 'ExternalServiceError';
  }
}

// ============================================================================
// Export Types
// ============================================================================

export {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';