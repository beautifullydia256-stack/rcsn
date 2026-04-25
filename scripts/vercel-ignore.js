#!/usr/bin/env node

// Vercel ignore script to prevent deployment on certain conditions
// This helps Vercel understand when NOT to deploy

const { execSync } = require('child_process');

try {
  // Get the current commit message
  const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
  
  // Don't deploy if commit message contains [skip-deploy]
  if (commitMessage.includes('[skip-deploy]')) {
    console.log('Skipping deployment due to [skip-deploy] in commit message');
    process.exit(0);
  }
  
  // Don't deploy if only documentation files changed
  const changedFiles = execSync('git diff HEAD^ HEAD --name-only', { encoding: 'utf8' }).trim();
  const onlyDocsChanged = changedFiles.split('\n').every(file => 
    file.endsWith('.md') || 
    file.startsWith('docs/') || 
    file.startsWith('.github/') ||
    file === 'README.md'
  );
  
  if (onlyDocsChanged && changedFiles.length > 0) {
    console.log('Skipping deployment - only documentation files changed');
    process.exit(0);
  }
  
  // Deploy for all other cases
  console.log('Proceeding with deployment');
  process.exit(1);
  
} catch (error) {
  // If there's an error, proceed with deployment
  console.log('Error in ignore script, proceeding with deployment:', error.message);
  process.exit(1);
}