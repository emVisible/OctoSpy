import * as fs from 'fs';

import path from 'path';
import { config } from 'dotenv';

/**
 * 根据外部的dirty.json的repo信息来进行过滤
*/
config();
const FILTERED_REFERENCE = path.resolve(__dirname, process.env.FILTERED_REFERENCE!)
const FILTERED_INPUT = path.resolve(__dirname, process.env.FILTERED_INPUT!)
const FILTERED_OUTPUT = path.resolve(__dirname, process.env.FILTERED_OUTPUT!)

function readJsonFile<T>(filePath: string): T | null {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error);
    return null;
  }
}
function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Filtered data saved to ${filePath}`);
  } catch (error) {
    console.error(`❌ Error writing ${filePath}:`, error);
  }
}
function filterData() {
  const outputData = readJsonFile<{ repo: string }[]>(FILTERED_INPUT);
  const dirtyData = readJsonFile<string[]>(FILTERED_REFERENCE);

  if (!outputData || !dirtyData) return;

  console.log(`🔍 Original output.json contains ${outputData.length} items.`);
  console.log(`🗑 Filtering ${dirtyData.length} dirty repos...`);
  const invalidEntries: string[] = [];
  const validDirtyRepos = new Set(
    dirtyData.filter(repo => {
      if (!repo.includes('/')) {
        invalidEntries.push(repo);
        return false;
      }
      return true;
    })
  );
  const filteredData = outputData.filter(item => !validDirtyRepos.has(item.repo));

  console.log(`✅ Filtering complete. ${filteredData.length} items remain after filtering.`);
  if (invalidEntries.length > 0) {
    console.warn(`⚠️ Warning: The following ${invalidEntries.length} entries in ${FILTERED_REFERENCE} are invalid and were ignored:`);
    invalidEntries.forEach(entry => console.warn(`  - "${entry}" is not a valid repo format (expected "owner/repo")`));
  }

  writeJsonFile(FILTERED_OUTPUT, filteredData);
}
filterData();
