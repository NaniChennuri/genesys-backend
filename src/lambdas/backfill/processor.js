const config = require('../../config');
const { generateEmbedding, getOpenSearchClient, chunkText } = require('../../shared/ai-utils');
const { getGenesysCredentials, initializeGenesysClient } = require('../../shared/genesys-client');
const { createErrorResponse, createSuccessResponse, validateEnvironment } = require('../../shared/utils');

exports.handler = async (event) => {
  console.log('Processing audit backfill batch:', JSON.stringify(event, null, 2));
  
  try {
    // Note: Checkpoint completion is handled by Step Function
    
    // Get window parameters (from Step Function ComputeWindows)
    const { startTime, endTime, windowId } = event;
    
    console.log(`Processing window ${windowId}: ${startTime} to ${endTime}`);
    
    // Get Genesys credentials and initialize client
    const genesysConfig = await getGenesysCredentials();
    const { auditApi } = await initializeGenesysClient(genesysConfig);
    
    // Fetch audit data for this window only (within timeout limits)
    const auditData = await fetchBatchAuditData(auditApi, startTime, endTime);
    
    let processedCount = 0;
    const bulkOperations = [];
    
    for (const auditEvent of auditData) {
      // Normalize data
      const normalizedData = {
        id: auditEvent.id || `${Date.now()}-${Math.random()}`,
        timestamp: auditEvent.timestamp,
        eventType: auditEvent.eventType,
        userId: auditEvent.userId,
        sessionId: auditEvent.sessionId,
        details: auditEvent.details || {},
        source: 'genesys-audit-backfill',
        // Remove windowId reference
      };
      
      // Create searchable text
      const searchableText = `${normalizedData.eventType} ${normalizedData.userId} ${JSON.stringify(normalizedData.details)}`;
      
      // Chunk text
      const chunks = chunkText(searchableText, 500);
      
      // Process each chunk
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
        
        // Add to bulk operations
        bulkOperations.push(
          { index: { _index: process.env.OPENSEARCH_INDEX, _id: document.chunkId } },
          document
        );
      }
      
      processedCount++;
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
    
    // Mark window as completed (Step Function will handle final completion)
    console.log(`✅ Window ${windowId} COMPLETED! Processed ${processedCount} events`);
    
    return {
      statusCode: 200,
      message: `Window ${windowId} completed successfully`,
      processedCount: processedCount,
      windowId: windowId,
      timeRange: { startTime, endTime },
      bulkOperationsCount: bulkOperations.length / 2,
      lastProcessedTimestamp: endTime
    };
    
  } catch (error) {
    console.error('Error processing backfill window:', error);
    throw error;
  }
};

async function fetchBatchAuditData(auditApi, startTime, endTime) {
  try {
    const allAuditData = [];
    let pageNumber = 1;
    const pageSize = 200; // Genesys API maximum
    let totalFetched = 0;
    const maxPages = 50; // Limit pages to stay within Lambda timeout
    
    console.log(`🚀 Fetching batch audit data from ${startTime} to ${endTime}`);
    
    while (pageNumber <= maxPages) {
      const opts = {
        q: `timestamp:[${startTime} TO ${endTime}]`,
        pageSize: pageSize,
        pageNumber: pageNumber,
        sort: ['timestamp']
      };
      
      console.log(`📄 Fetching page ${pageNumber} (${totalFetched} records so far)...`);
      
      const response = await auditApi.postAuditsQuery(opts);
      
      if (!response.auditMessages || response.auditMessages.length === 0) {
        console.log('✅ No more audit data in this batch');
        break;
      }
      
      // Transform Genesys audit format to our format
      const transformedData = response.auditMessages.map(audit => ({
        id: audit.id,
        timestamp: audit.timestamp,
        eventType: audit.action?.actionType || audit.serviceName,
        userId: audit.user?.id || audit.user?.name,
        sessionId: audit.sessionId,
        details: {
          action: audit.action,
          entity: audit.entity,
          context: audit.context,
          serviceName: audit.serviceName,
          level: audit.level
        }
      }));
      
      allAuditData.push(...transformedData);
      totalFetched += transformedData.length;
      
      // Check if we have more pages
      if (response.auditMessages.length < pageSize) {
        console.log('📋 Reached last page of batch');
        break;
      }
      
      pageNumber++;
      
      // Add small delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`🎉 Batch complete: fetched ${allAuditData.length} records`);
    return allAuditData;
    
  } catch (error) {
    console.error('❌ Error fetching batch audit data from Genesys:', error);
    throw error;
  }
}

// Checkpoint management moved to Step Function

function getOneYearAgo() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return oneYearAgo.toISOString();
}

// Helper function to create time-based batches
function createTimeBatches(startTime, endTime, numberOfBatches = 12) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const totalMs = end.getTime() - start.getTime();
  const batchMs = totalMs / numberOfBatches;
  
  const batches = [];
  for (let i = 0; i < numberOfBatches; i++) {
    const batchStart = new Date(start.getTime() + (i * batchMs));
    const batchEnd = new Date(start.getTime() + ((i + 1) * batchMs));
    
    batches.push({
      batchNumber: i + 1,
      totalBatches: numberOfBatches,
      batchStartTime: batchStart.toISOString(),
      batchEndTime: batchEnd.toISOString()
    });
  }
  
  return batches;
}

// Helper function to restart backfill (for manual use)
async function resetCheckpoint() {
  const command = new PutParameterCommand({
    Name: process.env.SSM_CHECKPOINT_PATH,
    Value: 'false',
    Overwrite: true
  });
  await ssm.send(command);
  console.log('🔄 Checkpoint reset - backfill can run again');
}

