import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ===========================
// 1. 로그 기록 (내보내기/가져오기)
// ===========================
export const createLog = mutation({
  args: {
    userId: v.id("users"),
    userName: v.string(),
    userEmail: v.string(),
    action: v.string(), // "export" | "import"
    fileName: v.string(),
    equipmentCount: v.optional(v.number()),
    assetCount: v.optional(v.number()),
    importResult: v.optional(
      v.object({
        equipmentCreated: v.number(),
        equipmentUpdated: v.number(),
        equipmentErrors: v.number(),
        assetCreated: v.number(),
        assetUpdated: v.number(),
        assetErrors: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("excelLogs", {
      userId: args.userId,
      userName: args.userName,
      userEmail: args.userEmail,
      action: args.action,
      fileName: args.fileName,
      equipmentCount: args.equipmentCount,
      assetCount: args.assetCount,
      importResult: args.importResult,
      timestamp: Date.now(),
    });
    return logId;
  },
});

// ===========================
// 2. 로그 조회 (전체)
// ===========================
export const getAllLogs = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("excelLogs").order("desc").collect();
    return logs;
  },
});

// ===========================
// 3. 로그 조회 (특정 사용자)
// ===========================
export const getLogsByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("excelLogs")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    return logs;
  },
});

// ===========================
// 4. 로그 조회 (액션별)
// ===========================
export const getLogsByAction = query({
  args: { action: v.string() },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("excelLogs")
      .withIndex("by_action", (q) => q.eq("action", args.action))
      .order("desc")
      .collect();
    return logs;
  },
});
