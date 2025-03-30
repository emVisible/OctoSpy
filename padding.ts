import { readFile, writeFile } from 'fs/promises';
import { get_encoding } from 'tiktoken';

const enc = get_encoding('cl100k_base');

function countTokens(text: string) {
  return enc.encode(text).length;
}

async function splitJsonByTokens(inputPath: string, outputPrefix: string, maxTokens = 15000) {
  try {
    console.log(`Starting JSON split process for file: ${inputPath}`);
    const rawData = await readFile(inputPath, 'utf-8');
    const jsonData = JSON.parse(rawData);

    if (!Array.isArray(jsonData) && typeof jsonData !== 'object') {
      throw new Error('Invalid JSON format: Input should be an array or object');
    }

    let currentChunk = [];
    let currentTokenCount = 0;
    let chunkIndex = 1;
    const isArray = Array.isArray(jsonData);
    const items = isArray ? jsonData : Object.entries(jsonData);

    console.log(`Processing ${items.length} items from input JSON`);

    for (const item of items) {
      const itemString = JSON.stringify(item);
      const itemTokens = countTokens(itemString);

      if (currentTokenCount + itemTokens <= maxTokens) {
        currentChunk.push(item);
        currentTokenCount += itemTokens;
      } else {
        const outputData = isArray ? currentChunk : Object.fromEntries(currentChunk);
        const outputPath = `${outputPrefix}-${chunkIndex.toString().padStart(2, '0')}.json`;
        await writeFile(outputPath, JSON.stringify(outputData)); // 去除空格
        console.log(`Created chunk ${chunkIndex} at ${outputPath} with ${currentTokenCount} tokens`);

        chunkIndex++;
        currentChunk = [item];
        currentTokenCount = itemTokens;
      }
    }

    if (currentChunk.length > 0) {
      const outputData = isArray ? currentChunk : Object.fromEntries(currentChunk);
      const outputPath = `${outputPrefix}-${chunkIndex.toString().padStart(2, '0')}.json`;
      await writeFile(outputPath, JSON.stringify(outputData)); // 去除空格
      console.log(`Created final chunk ${chunkIndex} at ${outputPath} with ${currentTokenCount} tokens`);
    }

    console.log(`Successfully split JSON into ${chunkIndex} files`);
  } catch (error: any) {
    console.error('Error during JSON splitting:', error.message);
    throw error;
  }
}

splitJsonByTokens("./filtered.json", "output")