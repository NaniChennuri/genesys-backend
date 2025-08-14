/**
 * SSM Parameter Store Utilities
 * Centralized SSM operations for checkpoints and configuration
 */

const { SSMClient, GetParameterCommand, PutParameterCommand } = require('@aws-sdk/client-ssm');
const config = require('../config');

const ssm = new SSMClient({ region: config.aws.region });

/**
 * Get checkpoint value from SSM
 */
async function getCheckpoint(parameterPath) {
  try {
    const command = new GetParameterCommand({
      Name: parameterPath
    });
    const response = await ssm.send(command);
    return response.Parameter.Value; // 'true' or 'false'
  } catch (error) {
    console.log(`No checkpoint found at ${parameterPath}, starting fresh`);
    return 'false';
  }
}

/**
 * Update checkpoint in SSM
 */
async function updateCheckpoint(parameterPath, value) {
  const command = new PutParameterCommand({
    Name: parameterPath,
    Value: value,
    Overwrite: true
  });
  await ssm.send(command);
}

/**
 * Set checkpoint as completed
 */
async function setCheckpointCompleted(parameterPath) {
  const command = new PutParameterCommand({
    Name: parameterPath,
    Value: 'true', // Mark as completed
    Overwrite: true
  });
  await ssm.send(command);
  console.log(`✅ Checkpoint ${parameterPath} marked as completed`);
}

/**
 * Get multiple parameters at once
 */
async function getParameters(parameterPaths) {
  const promises = parameterPaths.map(path => 
    ssm.send(new GetParameterCommand({
      Name: path,
      WithDecryption: path.includes('secret') || path.includes('password')
    }))
  );
  
  const responses = await Promise.all(promises);
  return responses.map(response => response.Parameter.Value);
}

module.exports = {
  getCheckpoint,
  updateCheckpoint,
  setCheckpointCompleted,
  getParameters
};