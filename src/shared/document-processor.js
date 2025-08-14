/**
 * Document Processing Utilities
 * Centralized document processing logic for audit events and KB documents
 */

const config = require('../config');
const { generateEmbedding, getOpenSearchClient, chunkText } = require('./ai-utils');

/**
 * Process audit event to bulk operations
 */
async function processAuditEventToBulk(auditEvent, indexName, additionalFields = {}) {
  // Normalize audit data
  const normalizedData = {
    id: auditEvent.id || `audit-${Date.now()}-${Math.random()}`,
    timestamp: auditEvent.timestamp || new Date().toISOString(),
    eventType: auditEvent.eventType || 'UNKNOWN',
    userId: auditEvent.userId || 'anonymous',
    sessionId: auditEvent.sessionId || null,
    details: auditEvent.details || {},
    source: auditEvent.source || 'genesys-audit',
    ...additionalFields
  };
  
  // Create searchable text
  const searchableText = `${normalizedData.eventType} ${normalizedData.userId} ${JSON.stringify(normalizedData.details)}`;
  
  return await createBulkOperations(normalizedData, searchableText, config.processing.chunkSize, 'simple', indexName);
}

/**
 * Process KB document to bulk operations
 */
async function processKBDocumentToBulk(kbDocument, knowledgeBaseName, indexName) {
  // Normalize KB document data
  const normalizedData = {
    id: kbDocument.id || kbDocument.documentId || `kb-${Date.now()}-${Math.random()}`,
    title: kbDocument.title || 'Untitled Document',
    content: extractDocumentContent(kbDocument),
    category: kbDocument.category?.name || kbDocument.category || 'General',
    tags: kbDocument.labels?.map(label => label.name) || kbDocument.tags || [],
    lastModified: kbDocument.dateModified || kbDocument.lastModified || new Date().toISOString(),
    author: kbDocument.createdBy?.name || kbDocument.author || 'System',
    version: kbDocument.version || '1.0',
    status: kbDocument.status || 'published',
    knowledgeBase: knowledgeBaseName,
    source: 'genesys-kb'
  };
  
  // Create searchable text
  const searchableText = `${normalizedData.title}\\n\\n${normalizedData.content}`;
  
  return await createBulkOperations(normalizedData, searchableText, config.processing.kbChunkSize, 'kb', indexName);
}

/**
 * Create bulk operations for OpenSearch
 */
async function createBulkOperations(normalizedData, searchableText, chunkSize, strategy, indexName) {
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
 * Execute bulk operations in OpenSearch
 */
async function executeBulkOperations(bulkOperations) {
  if (bulkOperations.length === 0) return { errors: false };
  
  const opensearchClient = getOpenSearchClient();
  const bulkResponse = await opensearchClient.bulk({
    body: bulkOperations
  });
  
  if (bulkResponse.body.errors) {
    console.error('Bulk indexing errors:', bulkResponse.body.items.filter(item => item.index?.error));
  }
  
  return bulkResponse.body;
}

/**
 * Process single document (for streaming)
 */
async function processSingleDocument(normalizedData, searchableText, chunkSize, strategy, indexName) {
  const chunks = chunkText(searchableText, chunkSize, strategy);
  const opensearchClient = getOpenSearchClient();
  
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
    
    await opensearchClient.index({
      index: indexName,
      id: document.chunkId,
      body: document
    });
  }
  
  return chunks.length;
}

/**
 * Extract content from KB document
 */
function extractDocumentContent(document) {
  let content = '';
  
  // Handle different content structures
  if (document.content) {
    if (typeof document.content === 'string') {
      content = document.content;
    } else if (document.content.body) {
      content = document.content.body;
    } else if (document.content.text) {
      content = document.content.text;
    }
  }
  
  // Fallback to body or alternatives
  if (!content && document.body) {
    content = document.body;
  }
  
  if (!content && document.alternatives) {
    content = document.alternatives.map(alt => alt.phrase || alt.text).join('\\n');
  }
  
  // Clean HTML tags
  content = content.replace(/<[^>]*>/g, '').trim();
  
  return content || 'No content available';
}

module.exports = {
  processAuditEventToBulk,
  processKBDocumentToBulk,
  createBulkOperations,
  executeBulkOperations,
  processSingleDocument,
  extractDocumentContent
};