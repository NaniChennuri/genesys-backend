const { getGenesysCredentials, initializeGenesysClient, fetchKnowledgeBases, fetchKBDocuments } = require('../../shared/genesys-client');

exports.handler = async (event) => {
  console.log('Computing KB document batches:', JSON.stringify(event, null, 2));
  
  try {
    const { batchSize = 25 } = event;
    
    // Get Genesys Cloud credentials
    const genesysConfig = await getGenesysCredentials();
    
    // Initialize Genesys Cloud client
    const { knowledgeApi } = await initializeGenesysClient(genesysConfig);
    
    // Fetch all knowledge bases
    const knowledgeBases = await fetchKnowledgeBases(knowledgeApi);
    
    // Collect all documents from all knowledge bases
    let allDocuments = [];
    
    for (const kb of knowledgeBases) {
      console.log(`Fetching documents from KB: ${kb.name}`);
      
      const documents = await fetchKBDocuments(knowledgeApi, kb.id);
      
      // Add KB context to each document
      const documentsWithKB = documents.map(doc => ({
        ...doc,
        knowledgeBaseId: kb.id,
        knowledgeBaseName: kb.name
      }));
      
      allDocuments = allDocuments.concat(documentsWithKB);
    }
    
    console.log(`Total documents found: ${allDocuments.length}`);
    
    // Create batches
    const batches = [];
    for (let i = 0; i < allDocuments.length; i += batchSize) {
      const batch = allDocuments.slice(i, i + batchSize);
      batches.push({
        batchId: Math.floor(i / batchSize) + 1,
        startIndex: i,
        endIndex: Math.min(i + batchSize - 1, allDocuments.length - 1),
        documents: batch,
        totalDocuments: batch.length
      });
    }
    
    console.log(`Created ${batches.length} batches with ${batchSize} documents each`);
    
    return {
      batches,
      totalBatches: batches.length,
      totalDocuments: allDocuments.length,
      batchSize: batchSize
    };
    
  } catch (error) {
    console.error('Error computing KB batches:', error);
    throw error;
  }
};

// All functions moved to shared/genesys-client.js