/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as assets from "../assets.js";
import type * as changeHistory from "../changeHistory.js";
import type * as chatbot from "../chatbot.js";
import type * as equipment from "../equipment.js";
import type * as excelLogs from "../excelLogs.js";
import type * as http from "../http.js";
import type * as migration from "../migration.js";
import type * as notifications from "../notifications.js";
import type * as reservations from "../reservations.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  assets: typeof assets;
  changeHistory: typeof changeHistory;
  chatbot: typeof chatbot;
  equipment: typeof equipment;
  excelLogs: typeof excelLogs;
  http: typeof http;
  migration: typeof migration;
  notifications: typeof notifications;
  reservations: typeof reservations;
  users: typeof users;
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
