/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analysis_matchTender from "../analysis/matchTender.js";
import type * as billing_helpers from "../billing/helpers.js";
import type * as billing_paystack from "../billing/paystack.js";
import type * as billing_subscriptions from "../billing/subscriptions.js";
import type * as billing_webhook from "../billing/webhook.js";
import type * as crons from "../crons.js";
import type * as documents from "../documents.js";
import type * as extraction_gemini from "../extraction/gemini.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as proposals from "../proposals.js";
import type * as scraperLogs from "../scraperLogs.js";
import type * as scrapers_etenders from "../scrapers/etenders.js";
import type * as scrapers_nocopo from "../scrapers/nocopo.js";
import type * as scrapers_publicprocurement from "../scrapers/publicprocurement.js";
import type * as scrapers_scheduler from "../scrapers/scheduler.js";
import type * as scrapers_tendersnigeria from "../scrapers/tendersnigeria.js";
import type * as scrapers_types from "../scrapers/types.js";
import type * as seed from "../seed.js";
import type * as tenders from "../tenders.js";
import type * as userTenders from "../userTenders.js";
import type * as users from "../users.js";
import type * as vectorSearch from "../vectorSearch.js";
import type * as vectorSearchActions from "../vectorSearchActions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "analysis/matchTender": typeof analysis_matchTender;
  "billing/helpers": typeof billing_helpers;
  "billing/paystack": typeof billing_paystack;
  "billing/subscriptions": typeof billing_subscriptions;
  "billing/webhook": typeof billing_webhook;
  crons: typeof crons;
  documents: typeof documents;
  "extraction/gemini": typeof extraction_gemini;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  proposals: typeof proposals;
  scraperLogs: typeof scraperLogs;
  "scrapers/etenders": typeof scrapers_etenders;
  "scrapers/nocopo": typeof scrapers_nocopo;
  "scrapers/publicprocurement": typeof scrapers_publicprocurement;
  "scrapers/scheduler": typeof scrapers_scheduler;
  "scrapers/tendersnigeria": typeof scrapers_tendersnigeria;
  "scrapers/types": typeof scrapers_types;
  seed: typeof seed;
  tenders: typeof tenders;
  userTenders: typeof userTenders;
  users: typeof users;
  vectorSearch: typeof vectorSearch;
  vectorSearchActions: typeof vectorSearchActions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
