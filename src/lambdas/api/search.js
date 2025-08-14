const config = require('../../config');
const { generateEmbedding, generateAIResponse, getOpenSearchClient } = require('../../shared/ai-utils');
const { validateEnvironment, createErrorResponse } = require('../../shared/utils');

exports.handler = async (event) => {
  console.log('Search API request:', JSON.stringify(event, null, 2));
  
  try {
    // Validate required environment variables
    validateEnvironment(['OPENSEARCH_DOMAIN', 'BEDROCK_MODEL_ID', 'TITAN_EMBEDDING_MODEL']);
    // Input validation
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', ...config.api.corsHeaders },
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', ...config.api.corsHeaders },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { query } = body;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', ...config.api.corsHeaders },
        body: JSON.stringify({ error: 'Valid query string is required' })
      };
    }

    if (query.length > 1000) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', ...config.api.corsHeaders },
        body: JSON.stringify({ error: 'Query too long (max 1000 characters)' })
      };
    }
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Search across both audit and KB indices
    const searchResults = await performKNNSearch(queryEmbedding, query);
    
    // Generate AI response using retrieved context
    const context = searchResults
      .map(result => result._source.chunkText)
      .join('\n\n');
    const aiResponse = await generateAIResponse(query, context);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...config.api.corsHeaders
      },
      body: JSON.stringify({
        answer: aiResponse.answer,
        sources: searchResults.map(result => ({
          title: `${result._source.eventType || 'KB Article'} - ${result._source.id}`,
          content: result._source.chunkText,
          score: result._score,
          timestamp: result._source.timestamp,
          source: result._source.source
        })),
        metadata: {
          totalResults: searchResults.length,
          searchTime: new Date().toISOString(),
          query: query
        }
      })
    };
    
  } catch (error) {
    console.error('Search API error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

async function performKNNSearch(queryEmbedding, query) {
  const opensearchClient = getOpenSearchClient();
  
  const searchBody = {
    size: 10,
    query: {
      bool: {
        should: [
          // Vector similarity search
          {
            knn: {
              embedding: {
                vector: queryEmbedding,
                k: 5
              }
            }
          },
          // Text search fallback
          {
            multi_match: {
              query: query,
              fields: ['chunkText', 'eventType', 'userId'],
              boost: 0.5
            }
          }
        ]
      }
    },
    _source: {
      excludes: ['embedding'] // Don't return large embedding vectors
    }
  };
  
  // Search audit chunks
  const auditResults = await opensearchClient.search({
    index: config.opensearch.auditsIndex,
    body: searchBody
  });
  
  // Search KB chunks
  const kbResults = await opensearchClient.search({
    index: config.opensearch.kbIndex,
    body: searchBody
  });
  
  // Combine and sort results by score
  const allResults = [
    ...auditResults.body.hits.hits,
    ...kbResults.body.hits.hits
  ].sort((a, b) => b._score - a._score);
  
  return allResults.slice(0, config.api.maxResults);
}

