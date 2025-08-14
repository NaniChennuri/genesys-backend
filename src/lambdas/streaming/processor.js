const config = require('../../config');
const { generateEmbedding, getOpenSearchClient, chunkText } = require('../../shared/ai-utils');

exports.handler = async (event) => {
  console.log('Processing streaming audit event:', JSON.stringify(event, null, 2));
  
  try {
    const auditEvent = event.detail;
    
    // Normalize audit data
    const normalizedData = {
      id: auditEvent.id || `${Date.now()}-${Math.random()}`,
      timestamp: auditEvent.timestamp || new Date().toISOString(),
      eventType: auditEvent.eventType,
      userId: auditEvent.userId,
      sessionId: auditEvent.sessionId,
      details: auditEvent.details || {},
      source: 'genesys-audit'
    };
    
    // Create searchable text
    const searchableText = `${normalizedData.eventType} ${normalizedData.userId} ${JSON.stringify(normalizedData.details)}`;
    
    // Chunk text (simple chunking for now)
    const chunks = chunkText(searchableText, config.processing.chunkSize);
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate embedding
      const embedding = await generateEmbedding(chunk);
      
      // Prepare document for OpenSearch
      const document = {
        ...normalizedData,
        chunkId: `${normalizedData.id}-${i}`,
        chunkText: chunk,
        embedding: embedding,
        chunkIndex: i,
        totalChunks: chunks.length,
        processedAt: new Date().toISOString()
      };
      
      // Index in OpenSearch
      const opensearchClient = getOpenSearchClient();
      await opensearchClient.index({
        index: config.opensearch.defaultIndex,
        id: document.chunkId,
        body: document
      });
    }
    
    console.log(`Successfully processed ${chunks.length} chunks for event ${normalizedData.id}`);
    
    return {
      statusCode: 200,
      body: {
        message: 'Event processed successfully',
        eventId: normalizedData.id,
        chunksProcessed: chunks.length
      }
    };
    
  } catch (error) {
    console.error('Error processing streaming event:', error);
    throw error;
  }
};

