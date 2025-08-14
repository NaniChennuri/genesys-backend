/**
 * Shared utilities for Genesys AI Search Platform
 */



/**
 * Normalize audit event data
 */
function normalizeAuditEvent(event) {
  return {
    id: event.id || `audit-${Date.now()}-${Math.random()}`,
    timestamp: event.timestamp || new Date().toISOString(),
    eventType: event.eventType || 'UNKNOWN',
    userId: event.userId || 'anonymous',
    sessionId: event.sessionId || null,
    details: event.details || {},
    source: event.source || 'genesys-audit'
  };
}

/**
 * Create searchable text from audit event
 */
function createSearchableText(auditEvent) {
  const parts = [
    auditEvent.eventType,
    auditEvent.userId,
    auditEvent.sessionId,
    JSON.stringify(auditEvent.details)
  ].filter(Boolean);
  
  return parts.join(' ');
}

/**
 * Create searchable text for KB documents
 */
function createKBSearchableText(kbDocument) {
  return `${kbDocument.title}\n\n${kbDocument.content}`;
}

/**
 * Process document chunks and create bulk operations for OpenSearch
 */
async function createBulkOperations(normalizedData, searchableText, chunkSize, strategy, indexName, generateEmbedding) {
  const { chunkText } = require('./ai-utils');
  const chunks = chunkText(searchableText, chunkSize, strategy);
  const bulkOperations = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await generateEmbedding(chunk);
    
    const document = {
      ...normalizedData,
      chunkId: `${normalizedData.id}-${i}`,
      chunkText: chunk,
      embedding: embedding,
      chunkIndex: i,
      totalChunks: chunks.length,
      processedAt: new Date().toISOString()
    };
    
    bulkOperations.push(
      { index: { _index: indexName, _id: document.chunkId } },
      document
    );
  }
  
  return bulkOperations;
}

/**
 * Validate required environment variables
 */
function validateEnvironment(requiredVars) {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Create standardized error response
 */
function createErrorResponse(statusCode, message, details = null) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      error: message,
      details,
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * Create standardized success response
 */
function createSuccessResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    },
    body: JSON.stringify({
      ...data,
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = {
  normalizeAuditEvent,
  createSearchableText,
  createKBSearchableText,
  createBulkOperations,
  validateEnvironment,
  createErrorResponse,
  createSuccessResponse,
  retryWithBackoff
};