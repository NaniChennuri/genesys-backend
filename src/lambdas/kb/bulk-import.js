const config = require('../../config');
const { generateEmbedding, getOpenSearchClient, chunkText } = require('../../shared/ai-utils');
const { getGenesysCredentials, initializeGenesysClient, fetchDocumentContent } = require('../../shared/genesys-client');
const { getCheckpoint, setCheckpointCompleted } = require('../../shared/ssm-utils');

exports.handler = async (event) => {
  console.log('Processing KB document batch:', JSON.stringify(event, null, 2));
  
  try {
    // Check if KB import already completed
    const isCompleted = await getCheckpoint('/genesys/kb_import_done');
    if (isCompleted === 'true') {
      console.log('KB import already completed. Set SSM parameter to false to restart.');
      return { statusCode: 200, message: 'KB import already completed' };
    }
    
    const { batch } = event;
    const { documents, batchId } = batch;
    
    // Get Genesys Cloud credentials and initialize client
    const genesysConfig = await getGenesysCredentials();
    const { knowledgeApi } = await initializeGenesysClient(genesysConfig);
    
    let processedCount = 0;
    const bulkOperations = [];
    
    for (const doc of documents) {
      try {
        // Get full document content
        const fullDocument = await fetchDocumentContent(knowledgeApi, doc.knowledgeBaseId, doc.id);
        
        // Process document and add to bulk operations
        const docBulkOps = await processKBDocumentToBulk(fullDocument, doc.knowledgeBaseName);
        bulkOperations.push(...docBulkOps);
        
        processedCount++;
      } catch (docError) {
        console.error(`Error processing document ${doc.id}:`, docError);
        // Continue with other documents
      }
    }
    
    // Bulk upsert to OpenSearch
    if (bulkOperations.length > 0) {
      const opensearchClient = getOpenSearchClient();
      const bulkResponse = await opensearchClient.bulk({
        body: bulkOperations
      });
      
      if (bulkResponse.body.errors) {
        console.error('Bulk indexing errors:', bulkResponse.body.items.filter(item => item.index.error));
      }
    }
    
    console.log(`✅ KB Batch ${batchId}: Processed ${processedCount} documents, ${bulkOperations.length / 2} chunks`);
    
    return {
      statusCode: 200,
      message: `KB batch ${batchId} completed successfully`,
      batchId: batchId,
      documentsProcessed: processedCount,
      chunksIndexed: bulkOperations.length / 2,
      lastProcessedTimestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error processing KB batch:', error);
    throw error;
  }
};

// All Genesys client functions moved to shared/genesys-client.js

async function processKBDocumentToBulk(document, knowledgeBaseName) {
  // Normalize KB document data
  const normalizedData = {
    id: document.id,
    title: document.title || 'Untitled Document',
    content: extractDocumentContent(document),
    category: document.category?.name || 'General',
    tags: document.labels?.map(label => label.name) || [],
    lastModified: document.dateModified || document.dateCreated || new Date().toISOString(),
    author: document.createdBy?.name || 'System',
    version: document.version || '1.0',
    status: 'published',
    knowledgeBase: knowledgeBaseName,
    source: 'genesys-kb'
  };
  
  // Create searchable text
  const searchableText = `${normalizedData.title}\n\n${normalizedData.content}`;
  
  // Chunk the document content
  const chunks = chunkText(searchableText, config.processing.kbChunkSize, 'kb');
  
  // Process each chunk and return bulk operations
  const bulkOperations = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Generate embedding
    const embedding = await generateEmbedding(chunk);
    
    // Prepare document for OpenSearch
    const chunkDocument = {
      ...normalizedData,
      chunkId: `${normalizedData.id}-${i}`,
      chunkText: chunk,
      embedding: embedding,
      chunkIndex: i,
      totalChunks: chunks.length,
      processedAt: new Date().toISOString()
    };
    
    // Add to bulk operations
    bulkOperations.push(
      { index: { _index: config.opensearch.kbIndex, _id: chunkDocument.chunkId } },
      chunkDocument
    );
  }
  
  console.log(`Prepared KB document: ${normalizedData.title} (${chunks.length} chunks)`);
  return bulkOperations;
}

function extractDocumentContent(document) {
  // Extract content from different document formats
  let content = '';
  
  if (document.content) {
    // Handle different content types
    if (typeof document.content === 'string') {
      content = document.content;
    } else if (document.content.body) {
      content = document.content.body;
    } else if (document.content.text) {
      content = document.content.text;
    }
  }
  
  // Fallback to alternatives if no content found
  if (!content && document.alternatives) {
    content = document.alternatives.map(alt => alt.phrase || alt.text).join('\n');
  }
  
  // Clean HTML tags if present
  content = content.replace(/<[^>]*>/g, '').trim();
  
  return content || 'No content available';
}



// Checkpoint functions moved to shared/ssm-utils.js