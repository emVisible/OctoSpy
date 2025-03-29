import { config } from 'dotenv';
import { readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

config();
const MERGE_INPUT = process.env.MERGE_INPUT;
const MERGE_OUTPUT = process.env.MERGE_OUTPUT;
const mergeInput = path.resolve(__dirname, MERGE_INPUT!);
const mergeOutput = path.resolve(__dirname, MERGE_OUTPUT!);

function filterItems(data: any[]) {
  return data.filter(item => item.desc !== null);
}

export async function merge() {
  const files = await readdir(mergeInput);
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  console.log('[System] Number of JSON files found:', jsonFiles.length);

  const res = await Promise.all(
    jsonFiles.map(async file => {
      const filePath = path.join(mergeInput, file);
      const content = await readFile(filePath, 'utf8');
      return JSON.parse(content);
    })
  );

  const flattened = res.flat();
  console.log('[System] Total items before filtering:', flattened.length); // Log initial length
  const filteredData = filterItems(flattened);
  console.log('[System] Total items after filtering:', filteredData.length); // Log filtered length
  await writeFile(
    mergeOutput,
    JSON.stringify(filteredData, null, 2),
    'utf8'
  );
}

merge();