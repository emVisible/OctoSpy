import { format, parse, subDays, subHours } from "date-fns";
import { enUS } from "date-fns/locale";
import { config } from 'dotenv';
import path from "path";
import fs from "fs";
import { RepoItem } from "./crawl";

config();
const RECONCILE_INPUT = process.env.MERGE_OUTPUT
const RECONCILE_OUTPUT = process.env.RECONCILE_OUTPUT
const reconcileInput = path.resolve(__dirname, RECONCILE_INPUT!)
const reconcileOutput = path.resolve(__dirname, RECONCILE_OUTPUT!)


export const reconcile = () => {
  const rawData: RepoItem[] = JSON.parse(fs.readFileSync(reconcileInput, "utf-8"));
  const dedupedData: RepoItem[] = [];
  const seenRepos = new Map<string, RepoItem>();

  for (const item of rawData) {
    const key = item.repo;
    const currentTimestamp = getTimestamp(item.update);
    if (currentTimestamp > 0) {
      item.update = format(new Date(currentTimestamp), "yyyy-MM-dd");
    } else {
      item.update = "null";
    }
    Object.keys(item).forEach((prop) => {
      if (item[prop as keyof RepoItem] === null) {
        (item as any)[prop] = "null";
      } else if (prop === "tags" && typeof item.tags === "string") {
        item.tags = item.tags.replace(/\n/g, ",");
      }
    });
    if (!seenRepos.has(key) || currentTimestamp > getTimestamp(seenRepos.get(key)!.update)) {
      seenRepos.set(key, item);
    }
  }
  dedupedData.push(...seenRepos.values());
  fs.writeFileSync(reconcileOutput, JSON.stringify(dedupedData, null, 2), "utf-8");
  console.log(`✅ 去重完成：原始记录数：${rawData.length}，去重后记录数：${dedupedData.length}`);
}

const getTimestamp = (update: string | null): number => {
  if (!update) return 0;
  const now = new Date();
  if (update.includes("second ago") || update.includes("seconds ago")) {
    return now.getTime();
  }
  if (update.includes("minute ago") || update.includes("minutes ago")) {
    return now.getTime();
  }
  if (update.includes("hours ago") || update.includes("hour ago")) {
    const hours = parseInt(update.match(/\d+/)?.[0] || "0", 10);
    return subHours(now, hours).getTime();
  }
  if (update.includes("yesterday")) {
    return subDays(now, 1).getTime();
  }
  if (update.includes("days ago")) {
    const days = parseInt(update.match(/\d+/)?.[0] || "0", 10);
    return subDays(now, days).getTime();
  }
  if (/on [A-Za-z]+ \d{1,2}$/.test(update)) {
    const dateStr = update.replace("on ", "").trim() + `, ${now.getFullYear()}`;
    const parsedDate = parse(dateStr, "MMMM d, yyyy", now, { locale: enUS });
    return parsedDate.getTime();
  }
  if (/on [A-Za-z]+ \d{1,2}, \d{4}/.test(update)) {
    const dateStr = update.replace("on ", "").trim();
    const parsedDate = parse(dateStr, "MMMM d, yyyy", now, { locale: enUS });
    return parsedDate.getTime();
  }
  const other = Date.parse(update);
  return isNaN(other) ? 0 : other;
};

reconcile()