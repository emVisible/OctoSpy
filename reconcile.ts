import { format, parse, subDays, subHours } from "date-fns";
import { enUS } from "date-fns/locale";
import { config } from 'dotenv';
import path from "path";
import fs from "fs";

export interface RepoItem {
  repo: string;
  desc: string;
  tags: string;
  star: number;
  lang: string;
  update: string;
}

type RawDataItem = Record<string, any>;

// Configuration setup
config();
const RECONCILE_INPUT = process.env.MERGE_OUTPUT;
const RECONCILE_OUTPUT = process.env.RECONCILE_OUTPUT;
const reconcileInput = path.resolve(__dirname, RECONCILE_INPUT!);
const reconcileOutput = path.resolve(__dirname, RECONCILE_OUTPUT!);

// Main reconciliation function
export const reconcile = (): void => {
  try {
    const rawData = readJsonFile<RawDataItem[]>(reconcileInput);
    const dedupedData = processRepositoryData(rawData);

    writeJsonFile(reconcileOutput, dedupedData);
    logProcessingResults(rawData.length, dedupedData.length);
  } catch (error) {
    console.error(`Reconciliation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// File operations
const readJsonFile = <T>(filePath: string): T => {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(fileContent);
};

const writeJsonFile = (filePath: string, data: any): void => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
};

// Data processing
const processRepositoryData = (rawData: RawDataItem[]): RepoItem[] => {
  const seenRepos = new Map<string, RepoItem>();

  rawData.forEach(item => {
    const key = item.repo;
    const processedItem = createRepoItem(item);
    const existingItem = seenRepos.get(key);

    if (!existingItem || getTimestamp(processedItem.update) > getTimestamp(existingItem.update)) {
      seenRepos.set(key, processedItem);
    }
  });

  return Array.from(seenRepos.values());
};

const createRepoItem = (item: RawDataItem): RepoItem => ({
  repo: item.repo,
  desc: item.desc ?? "null",
  tags: typeof item.tags === "string" ? item.tags.replace(/\n/g, ",") : "null",
  star: normalizeStar(item.star),
  lang: item.lang ?? "null",
  update: formatUpdateDate(item.update)
});

const formatUpdateDate = (update: string | null): string => {
  const timestamp = getTimestamp(update);
  return timestamp > 0 ? format(new Date(timestamp), "yyyy-MM-dd") : "null";
};

// Value normalization
const normalizeStar = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;

  const trimmed = value.trim();
  if (!trimmed || trimmed === "null") return 0;

  return trimmed.endsWith('k') || trimmed.endsWith('K')
    ? parseKiloStars(trimmed)
    : parseNumericStars(trimmed);
};

const parseKiloStars = (value: string): number => {
  const num = parseFloat(value.slice(0, -1));
  return isNaN(num) ? 0 : Math.round(num * 1000);
};

const parseNumericStars = (value: string): number => {
  const num = parseFloat(value.replace(/,/g, ''));
  return isNaN(num) ? 0 : Math.round(num);
};

// Date processing
const getTimestamp = (update: string | null): number => {
  if (!update) return 0;

  const now = new Date();
  const timePatterns = [
    { pattern: /second ago/i, handler: () => now.getTime() },
    { pattern: /minute ago/i, handler: () => now.getTime() },
    { pattern: /hours? ago/i, handler: () => handleHoursAgo(update, now) },
    { pattern: /yesterday/i, handler: () => subDays(now, 1).getTime() },
    { pattern: /days ago/i, handler: () => handleDaysAgo(update, now) },
    { pattern: /on [A-Za-z]+ \d{1,2}$/, handler: () => handleMonthDayDate(update, now) },
    { pattern: /on [A-Za-z]+ \d{1,2}, \d{4}/, handler: () => handleFullDate(update, now) }
  ];

  const matchedPattern = timePatterns.find(({ pattern }) => pattern.test(update));
  if (matchedPattern) return matchedPattern.handler();

  const parsedDate = Date.parse(update);
  return isNaN(parsedDate) ? 0 : parsedDate;
};

const handleHoursAgo = (update: string, now: Date): number => {
  const hours = parseInt(update.match(/\d+/)?.[0] || "0", 10);
  return subHours(now, hours).getTime();
};

const handleDaysAgo = (update: string, now: Date): number => {
  const days = parseInt(update.match(/\d+/)?.[0] || "0", 10);
  return subDays(now, days).getTime();
};

const handleMonthDayDate = (update: string, now: Date): number => {
  const dateStr = update.replace("on ", "").trim() + `, ${now.getFullYear()}`;
  return parseDate(dateStr, now);
};

const handleFullDate = (update: string, now: Date): number => {
  const dateStr = update.replace("on ", "").trim();
  return parseDate(dateStr, now);
};

const parseDate = (dateStr: string, now: Date): number => {
  const parsedDate = parse(dateStr, "MMMM d, yyyy", now, { locale: enUS });
  return parsedDate.getTime();
};

// Logging
const logProcessingResults = (inputCount: number, outputCount: number): void => {
  console.log(`
    ============================================
    DATA PROCESSING COMPLETE
    --------------------------------------------
    Input items:  ${inputCount}
    Output items: ${outputCount}
    Duplicates removed: ${inputCount - outputCount}
    ============================================
  `);
};

reconcile();