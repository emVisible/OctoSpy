import * as fs from 'fs';

const OUTPUT_FILE = 'output.json';
const DIRTY_FILE = 'dirty.json';
const FILTERED_OUTPUT_FILE = 'filtered.json';
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
  const outputData = readJsonFile<{ repo: string }[]>(OUTPUT_FILE);
  const dirtyData = readJsonFile<string[]>(DIRTY_FILE);

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
    console.warn(`⚠️ Warning: The following ${invalidEntries.length} entries in ${DIRTY_FILE} are invalid and were ignored:`);
    invalidEntries.forEach(entry => console.warn(`  - "${entry}" is not a valid repo format (expected "owner/repo")`));
  }

  writeJsonFile(FILTERED_OUTPUT_FILE, filteredData);
}
filterData();
