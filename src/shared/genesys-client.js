/**
 * Genesys Cloud Client Utilities
 * Centralized Genesys Cloud API client initialization and common operations
 */

const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const platformClient = require('purecloud-platform-client-v2');
const config = require('../config');

const ssm = new SSMClient({ region: config.aws.region });

/**
 * Get Genesys Cloud credentials from SSM
 */
async function getGenesysCredentials() {
  try {
    const [clientIdParam, clientSecretParam, environmentParam] = await Promise.all([
      ssm.send(new GetParameterCommand({
        Name: '/genesys/client_id',
        WithDecryption: true
      })),
      ssm.send(new GetParameterCommand({
        Name: '/genesys/client_secret',
        WithDecryption: true
      })),
      ssm.send(new GetParameterCommand({
        Name: '/genesys/environment'
      }))
    ]);
    
    return {
      clientId: clientIdParam.Parameter.Value,
      clientSecret: clientSecretParam.Parameter.Value,
      environment: environmentParam.Parameter.Value
    };
  } catch (error) {
    throw new Error('Failed to get Genesys Cloud credentials from SSM: ' + error.message);
  }
}

/**
 * Initialize Genesys Cloud client
 */
async function initializeGenesysClient(genesysConfig) {
  const client = platformClient.ApiClient.instance;
  client.setEnvironment(genesysConfig.environment);
  await client.loginClientCredentialsGrant(genesysConfig.clientId, genesysConfig.clientSecret);
  
  return {
    knowledgeApi: new platformClient.KnowledgeApi(),
    auditApi: new platformClient.AuditApi(),
    client: client
  };
}

/**
 * Fetch all knowledge bases
 */
async function fetchKnowledgeBases(knowledgeApi) {
  try {
    const response = await knowledgeApi.getKnowledgeKnowledgebases();
    return response.entities || [];
  } catch (error) {
    console.error('Error fetching knowledge bases:', error);
    throw error;
  }
}

/**
 * Fetch documents from a knowledge base with pagination
 */
async function fetchKBDocuments(knowledgeApi, knowledgeBaseId) {
  try {
    let allDocuments = [];
    let pageNumber = 1;
    const pageSize = 100;
    
    while (true) {
      const opts = {
        pageSize: pageSize,
        pageNumber: pageNumber,
        published: true
      };
      
      const response = await knowledgeApi.getKnowledgeKnowledgebaseDocuments(knowledgeBaseId, opts);
      const documents = response.entities || [];
      
      allDocuments = allDocuments.concat(documents);
      
      if (documents.length < pageSize) {
        break;
      }
      
      pageNumber++;
    }
    
    return allDocuments;
  } catch (error) {
    console.error('Error fetching KB documents:', error);
    throw error;
  }
}

/**
 * Fetch full document content
 */
async function fetchDocumentContent(knowledgeApi, knowledgeBaseId, documentId) {
  try {
    const response = await knowledgeApi.getKnowledgeKnowledgebaseDocument(knowledgeBaseId, documentId);
    return response;
  } catch (error) {
    console.error('Error fetching document content:', error);
    throw error;
  }
}

module.exports = {
  getGenesysCredentials,
  initializeGenesysClient,
  fetchKnowledgeBases,
  fetchKBDocuments,
  fetchDocumentContent
};