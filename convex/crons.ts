import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Scrape tenders every 5 minutes
crons.interval(
  "scrape-tenders",
  { minutes: 5 },
  internal.scrapers.scheduler.runAllScrapers
);

export default crons;
