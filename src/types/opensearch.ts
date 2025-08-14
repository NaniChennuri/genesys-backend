/**
 * OpenSearch specific type definitions
 * Provides type safety for OpenSearch operations and queries
 */

// ============================================================================
// OpenSearch Client Types
// ============================================================================

/**
 * OpenSearch client configuration
 */
export interface OpenSearchConfig {
  endpoint: string;
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  timeout?: number;
  maxRetries?: number;
}

/**
 * OpenSearch index configuration
 */
export interface IndexConfig {
  name: string;
  mappings: IndexMappings;
  settings: IndexSettings;
}

/**
 * OpenSearch index mappings
 */
export interface IndexMappings {
  properties: Record<string, FieldMapping>;
}

/**
 * Field mapping configuration
 */
export interface FieldMapping {
  type: FieldType;
  dimension?: number; // For knn_vector fields
  method?: VectorMethod; // For knn_vector fields
  analyzer?: string; // For text fields
  index?: boolean;
  store?: boolean;
  properties?: Record<string, FieldMapping>; // For nested objects
}

/**
 * Supported OpenSearch field types
 */
export type FieldType = 
  | 'text'
  | 'keyword'
  | 'long'
  | 'integer'
  | 'short'
  | 'byte'
  | 'double'
  | 'float'
  | 'half_float'
  | 'scaled_float'
  | 'date'
  | 'boolean'
  | 'binary'
  | 'object'
  | 'nested'
  | 'knn_vector';

/**
 * Vector method configuration for knn_vector fields
 */
export interface VectorMethod {
  name: 'hnsw' | 'ivf';
  space_type: 'l2' | 'l1' | 'linf' | 'cosinesimil' | 'innerproduct';
  engine: 'nmslib' | 'faiss';
  parameters?: Record<string, any>;
}

/**
 * OpenSearch index settings
 */
export interface IndexSettings {
  'index.knn'?: boolean;
  'index.knn.algo_param.ef_search'?: number;
  'index.number_of_shards'?: number;
  'index.number_of_replicas'?: number;
  'index.refresh_interval'?: string;
  [key: string]: any;
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * OpenSearch query DSL structure
 */
export interface OpenSearchQuery {
  query?: QueryClause;
  size?: number;
  from?: number;
  sort?: SortClause[];
  _source?: string[] | boolean;
  highlight?: HighlightConfig;
  aggs?: Record<string, AggregationClause>;
}

/**
 * Query clause types
 */
export type QueryClause = 
  | MatchQuery
  | TermQuery
  | RangeQuery
  | BoolQuery
  | KNNQuery
  | MultiMatchQuery
  | MatchAllQuery;

/**
 * Match query for full-text search
 */
export interface MatchQuery {
  match: Record<string, string | MatchQueryConfig>;
}

/**
 * Match query configuration
 */
export interface MatchQueryConfig {
  query: string;
  operator?: 'and' | 'or';
  fuzziness?: string | number;
  boost?: number;
}

/**
 * Term query for exact matches
 */
export interface TermQuery {
  term: Record<string, string | number | boolean>;
}

/**
 * Range query for numeric/date ranges
 */
export interface RangeQuery {
  range: Record<string, RangeQueryConfig>;
}

/**
 * Range query configuration
 */
export interface RangeQueryConfig {
  gte?: string | number;
  gt?: string | number;
  lte?: string | number;
  lt?: string | number;
  boost?: number;
}

/**
 * Boolean query for combining multiple queries
 */
export interface BoolQuery {
  bool: {
    must?: QueryClause[];
    should?: QueryClause[];
    must_not?: QueryClause[];
    filter?: QueryClause[];
    minimum_should_match?: number | string;
    boost?: number;
  };
}

/**
 * k-NN query for vector similarity search
 */
export interface KNNQuery {
  knn: Record<string, KNNQueryConfig>;
}

/**
 * k-NN query configuration
 */
export interface KNNQueryConfig {
  vector: number[];
  k: number;
  boost?: number;
  filter?: QueryClause;
}

/**
 * Multi-match query for searching across multiple fields
 */
export interface MultiMatchQuery {
  multi_match: {
    query: string;
    fields: string[];
    type?: 'best_fields' | 'most_fields' | 'cross_fields' | 'phrase' | 'phrase_prefix';
    boost?: number;
  };
}

/**
 * Match all query
 */
export interface MatchAllQuery {
  match_all: {
    boost?: number;
  };
}

/**
 * Sort clause configuration
 */
export interface SortClause {
  [field: string]: SortOrder | SortConfig;
}

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Sort configuration
 */
export interface SortConfig {
  order: SortOrder;
  missing?: '_first' | '_last';
  unmapped_type?: FieldType;
}

/**
 * Highlight configuration
 */
export interface HighlightConfig {
  fields: Record<string, HighlightFieldConfig>;
  pre_tags?: string[];
  post_tags?: string[];
  fragment_size?: number;
  number_of_fragments?: number;
}

/**
 * Highlight field configuration
 */
export interface HighlightFieldConfig {
  fragment_size?: number;
  number_of_fragments?: number;
  type?: 'unified' | 'plain' | 'fvh';
}

/**
 * Aggregation clause
 */
export interface AggregationClause {
  terms?: TermsAggregation;
  date_histogram?: DateHistogramAggregation;
  range?: RangeAggregation;
  avg?: MetricAggregation;
  sum?: MetricAggregation;
  max?: MetricAggregation;
  min?: MetricAggregation;
  cardinality?: MetricAggregation;
  aggs?: Record<string, AggregationClause>;
}

/**
 * Terms aggregation
 */
export interface TermsAggregation {
  field: string;
  size?: number;
  order?: Record<string, SortOrder>;
}

/**
 * Date histogram aggregation
 */
export interface DateHistogramAggregation {
  field: string;
  calendar_interval?: string;
  fixed_interval?: string;
  format?: string;
  time_zone?: string;
}

/**
 * Range aggregation
 */
export interface RangeAggregation {
  field: string;
  ranges: Array<{
    from?: number;
    to?: number;
    key?: string;
  }>;
}

/**
 * Metric aggregation
 */
export interface MetricAggregation {
  field: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * OpenSearch search response
 */
export interface OpenSearchResponse<T = any> {
  took: number;
  timed_out: boolean;
  _shards: ShardInfo;
  hits: SearchHits<T>;
  aggregations?: Record<string, AggregationResult>;
}

/**
 * Shard information
 */
export interface ShardInfo {
  total: number;
  successful: number;
  skipped: number;
  failed: number;
}

/**
 * Search hits container
 */
export interface SearchHits<T = any> {
  total: {
    value: number;
    relation: 'eq' | 'gte';
  };
  max_score: number | null;
  hits: SearchHit<T>[];
}

/**
 * Individual search hit
 */
export interface SearchHit<T = any> {
  _index: string;
  _type?: string;
  _id: string;
  _score: number | null;
  _source: T;
  highlight?: Record<string, string[]>;
  sort?: any[];
}

/**
 * Aggregation result
 */
export interface AggregationResult {
  buckets?: AggregationBucket[];
  value?: number;
  doc_count?: number;
  [key: string]: any;
}

/**
 * Aggregation bucket
 */
export interface AggregationBucket {
  key: string | number;
  doc_count: number;
  [key: string]: any;
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Bulk operation request
 */
export interface BulkRequest {
  body: BulkOperation[];
  index?: string;
  refresh?: boolean | 'wait_for';
  timeout?: string;
}

/**
 * Bulk operation
 */
export type BulkOperation = IndexOperation | UpdateOperation | DeleteOperation;

/**
 * Index operation for bulk requests
 */
export interface IndexOperation {
  index: {
    _index: string;
    _id?: string;
  };
}

/**
 * Update operation for bulk requests
 */
export interface UpdateOperation {
  update: {
    _index: string;
    _id: string;
  };
}

/**
 * Delete operation for bulk requests
 */
export interface DeleteOperation {
  delete: {
    _index: string;
    _id: string;
  };
}

/**
 * Bulk response
 */
export interface BulkResponse {
  took: number;
  errors: boolean;
  items: BulkResponseItem[];
}

/**
 * Bulk response item
 */
export interface BulkResponseItem {
  index?: BulkItemResponse;
  update?: BulkItemResponse;
  delete?: BulkItemResponse;
}

/**
 * Individual bulk item response
 */
export interface BulkItemResponse {
  _index: string;
  _type?: string;
  _id: string;
  _version?: number;
  result?: string;
  status: number;
  error?: {
    type: string;
    reason: string;
    caused_by?: any;
  };
}

// ============================================================================
// Index Management
// ============================================================================

/**
 * Index creation request
 */
export interface CreateIndexRequest {
  index: string;
  body: {
    mappings?: IndexMappings;
    settings?: IndexSettings;
    aliases?: Record<string, any>;
  };
}

/**
 * Index exists response
 */
export interface IndexExistsResponse {
  exists: boolean;
}

/**
 * Index health information
 */
export interface IndexHealth {
  status: 'green' | 'yellow' | 'red';
  number_of_shards: number;
  number_of_replicas: number;
  active_primary_shards: number;
  active_shards: number;
  relocating_shards: number;
  initializing_shards: number;
  unassigned_shards: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * OpenSearch error response
 */
export interface OpenSearchError {
  error: {
    type: string;
    reason: string;
    caused_by?: OpenSearchError['error'];
    root_cause?: OpenSearchError['error'][];
  };
  status: number;
}

/**
 * Custom OpenSearch client error
 */
export class OpenSearchClientError extends Error {
  public readonly statusCode: number;
  public readonly type: string;
  public readonly details?: any;

  constructor(message: string, statusCode: number = 500, type: string = 'OpenSearchError', details?: any) {
    super(message);
    this.name = 'OpenSearchClientError';
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Vector similarity search parameters
 */
export interface VectorSearchParams {
  vector: number[];
  k: number;
  field: string;
  filter?: QueryClause;
  boost?: number;
}

/**
 * Hybrid search parameters (combining text and vector search)
 */
export interface HybridSearchParams {
  textQuery: string;
  vector?: number[];
  textFields: string[];
  vectorField?: string;
  k?: number;
  textBoost?: number;
  vectorBoost?: number;
  filter?: QueryClause;
}

/**
 * Search result with similarity score
 */
export interface SimilaritySearchResult<T = any> {
  document: T;
  score: number;
  similarity: number;
  highlights?: Record<string, string[]>;
}