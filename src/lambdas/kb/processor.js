const config = require('../../config');
const { generateEmbedding, getOpenSearchClient, chunkText } = require('../../shared/ai-utils');

exports.handler = async (event) => {
  console.log('Processing KB document event:', JSON.stringify(event, null, 2));
  
  try {
    const kbEvent = event.detail;
    
    // Normalize KB document data
    const normalizedData = {
      id: kbEvent.documentId || `kb-${Date.now()}-${Math.random()}`,
      title: kbEvent.title || 'Untitled Document',
      content: kbEvent.content || kbEvent.body || '',
      category: kbEvent.category || 'General',
      tags: kbEvent.tags || [],
      lastModified: kbEvent.lastModified || new Date().toISOString(),
      author: kbEvent.author || 'System',
      version: kbEvent.version || '1.0',
      status: kbEvent.status || 'published',
      source: 'genesys-kb'
    };
    
    // Create searchable text combining title and content
    const searchableText = `${normalizedData.title}\n\n${normalizedData.content}`;
    
    // Chunk the document content
    const chunks = chunkText(searchableText, config.processing.kbChunkSize, 'kb');
    
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
        index: config.opensearch.kbIndex,
        id: document.chunkId,
        body: document
      });
    }
    
    console.log(`Successfully processed KB document ${normalizedData.id} with ${chunks.length} chunks`);
    
    return {
      statusCode: 200,
      body: {
        message: 'KB document processed successfully',
        documentId: normalizedData.id,
        chunksProcessed: chunks.length,
        title: normalizedData.title
      }
    };
    
  } catch (error) {
    console.error('Error processing KB document:', error);
    throw error;
  }
};

