/**
 * AI Utilities for Genesys AI Search Platform
 * Centralized AI-related functions and client initialization
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { Client } = require('@opensearch-project/opensearch');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
const config = require('../config');

// Initialize clients once and reuse
let bedrockClient;
let opensearchClient;

/**
 * Get or create Bedrock client
 */
function getBedrockClient() {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({ region: config.aws.region });
  }
  return bedrockClient;
}

/**
 * Get or create OpenSearch client
 */
function getOpenSearchClient() {
  if (!opensearchClient) {
    // Use environment variable for OpenSearch endpoint if available
    const opensearchEndpoint = process.env.OPENSEARCH_ENDPOINT || 
      `https://${config.aws.opensearchDomain}.${config.aws.region}.es.amazonaws.com`;
    
    opensearchClient = new Client({
      ...AwsSigv4Signer({
        region: config.aws.region,
        service: 'es',
        getCredentials: () => defaultProvider()(),
      }),
      node: opensearchEndpoint,
    });
  }
  return opensearchClient;
}

/**
 * Generate embedding for text using AWS Titan
 */
async function generateEmbedding(text) {
  const bedrock = getBedrockClient();
  
  const command = new InvokeModelCommand({
    modelId: config.aws.titanEmbeddingModel,
    body: JSON.stringify({ inputText: text }),
    contentType: 'application/json',
    accept: 'application/json'
  });
  
  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.embedding;
}

/**
 * Generate AI response using Bedrock
 */
async function generateAIResponse(query, context, maxTokens = 1000) {
  const bedrock = getBedrockClient();
  
  const prompt = `Based on the following Genesys Cloud data, please answer the user's question.

Context from Genesys Cloud:
${context}

User Question: ${query}

Please provide a helpful and accurate answer based on the context provided. If the context doesn't contain enough information to answer the question, please say so.

Answer:`;
  
  const command = new InvokeModelCommand({
    modelId: config.aws.bedrockModelId,
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    }),
    contentType: 'application/json',
    accept: 'application/json'
  });
  
  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  return {
    answer: responseBody.content[0].text,
    tokensUsed: responseBody.usage?.total_tokens || 0
  };
}

/**
 * Advanced text chunking with different strategies
 */
function chunkText(text, maxLength = 500, strategy = 'simple', overlap = 0) {
  if (strategy === 'kb') {
    return chunkKBText(text, maxLength);
  }
  return chunkSimpleText(text, maxLength, overlap);
}

/**
 * Simple word-based text chunking with optional overlap
 */
function chunkSimpleText(text, maxLength = 500, overlap = 0) {
  const chunks = [];
  const words = text.split(' ');
  let currentChunk = '';
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    if ((currentChunk + ' ' + word).length <= maxLength) {
      currentChunk += (currentChunk ? ' ' : '') + word;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        
        // Create overlap for next chunk if specified
        if (overlap > 0) {
          const overlapWords = currentChunk.split(' ').slice(-Math.floor(overlap / 10));
          currentChunk = overlapWords.join(' ') + ' ' + word;
        } else {
          currentChunk = word;
        }
      } else {
        currentChunk = word;
      }
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Knowledge base text chunking (paragraph and sentence aware)
 */
function chunkKBText(text, maxLength = 800) {
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  const chunks = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if (paragraph.length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim());
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= maxLength) {
          currentChunk += (currentChunk ? '. ' : '') + sentence.trim();
        } else {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = sentence.trim();
        }
      }
    } else {
      if ((currentChunk + '\n\n' + paragraph).length <= maxLength) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      }
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  
  if (chunks.length === 0) {
    return chunkSimpleText(text, maxLength);
  }
  
  return chunks;
}

module.exports = {
  getBedrockClient,
  getOpenSearchClient,
  generateEmbedding,
  generateAIResponse,
  chunkText,
  chunkSimpleText,
  chunkKBText
};