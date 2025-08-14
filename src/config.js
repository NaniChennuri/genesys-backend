/**
 * Backend Configuration
 * Centralized configuration for AWS services and environment variables
 */

const config = {
  // AWS Configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    opensearchDomain: process.env.OPENSEARCH_DOMAIN || 'genesys-ai-search-dev',
    bedrockModelId: process.env.BEDROCK_MODEL_ID || 'meta.llama3-70b-instruct-v1:0',
    titanEmbeddingModel: process.env.TITAN_EMBEDDING_MODEL || 'amazon.titan-embed-text-v1'
  },

  // OpenSearch Configuration
  opensearch: {
    auditsIndex: process.env.AUDITS_INDEX || 'audits_chunks',
    kbIndex: process.env.KB_INDEX || 'kb_chunks',
    defaultIndex: process.env.OPENSEARCH_INDEX || 'audits_chunks'
  },

  // SSM Configuration
  ssm: {
    checkpointPath: process.env.SSM_CHECKPOINT_PATH || '/audit/backfill_checkpoint_iso',
    backfillRunningPath: '/audit/backfill_running',
    backfillDonePath: '/audit/backfill_1y_done'
  },

  // Processing Configuration
  processing: {
    chunkSize: 500,
    kbChunkSize: 800,
    batchSize: 100,
    maxRetries: 3,
    retryDelay: 1000
  },

  // API Configuration
  api: {
    timeout: 30000,
    maxResults: 10,
    corsHeaders: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    }
  },

  // Environment
  stage: process.env.STAGE || 'dev',
  isDevelopment: process.env.STAGE === 'dev' || process.env.NODE_ENV === 'development'
};

module.exports = config;