import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ===========================
// 헬퍼: 변경 이력 기록
// ===========================

/**
 * 변경 이력을 기록하는 헬퍼 함수
 * @param ctx - Convex context
 * @param params - 이력 기록에 필요한 정보
 */
export const recordChange = internalMutation({
  args: {
    userId: v.string(),
    userName: v.string(),
    userEmail: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    targetName: v.string(),
    action: v.string(),
    changes: v.array(v.object({
      field: v.string(),
      fieldLabel: v.string(),
      oldValue: v.optional(v.string()),
      newValue: v.optional(v.string()),
    })),
    source: v.string(),
    sourceDetail: v.optional(v.string()),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 최신 버전 번호 조회
    const latestLog = await ctx.db
      .query("changeHistory")
      .withIndex("by_timestamp")
      .order("desc")
      .first();

    let newMajor = 1;
    let newMinor = 0;

    if (latestLog) {
      if (args.source === "excel_import") {
        // 엑셀 Import: 메이저 버전 증가, 마이너는 0으로 리셋
        newMajor = latestLog.versionMajor + 1;
        newMinor = 0;
      } else {
        // 수동 수정: 메이저 유지, 마이너 증가
        newMajor = latestLog.versionMajor;
        newMinor = latestLog.versionMinor + 1;
      }
    } else {
      // 첫 기록: v1.0
      newMajor = 1;
      newMinor = 0;
    }

    // 변경 이력 기록
    await ctx.db.insert("changeHistory", {
      versionMajor: newMajor,
      versionMinor: newMinor,
      userId: args.userId,
      userName: args.userName,
      userEmail: args.userEmail,
      targetType: args.targetType,
      targetId: args.targetId,
      targetName: args.targetName,
      action: args.action,
      changes: args.changes,
      source: args.source,
      sourceDetail: args.sourceDetail,
      batchId: args.batchId,
      timestamp: Date.now(),
    });

    return { major: newMajor, minor: newMinor };
  },
});

// ===========================
// 쿼리: 최신 버전 정보
// ===========================

export const getLatestVersion = query({
  args: {},
  handler: async (ctx) => {
    const latest = await ctx.db
      .query("changeHistory")
      .withIndex("by_timestamp")
      .order("desc")
      .first();

    if (!latest) return null;

    // 날짜 포맷: YYYY-MM-DD
    const date = new Date(latest.timestamp);
    const dateStr = date.toISOString().split('T')[0];

    // 버전 문자열: v1 또는 v1.1
    const versionStr = latest.versionMinor === 0
      ? `v${latest.versionMajor}`
      : `v${latest.versionMajor}.${latest.versionMinor}`;

    // 전체 형식: 2026-02-21_백상원_v1
    const fullVersion = `${dateStr}_${latest.userName}_${versionStr}`;

    return {
      versionMajor: latest.versionMajor,
      versionMinor: latest.versionMinor,
      versionString: versionStr,
      fullVersion: fullVersion,
      timestamp: latest.timestamp,
      userName: latest.userName,
      userEmail: latest.userEmail,
      source: latest.source,
      sourceDetail: latest.sourceDetail,
    };
  },
});

// ===========================
// 쿼리: 변경 이력 조회
// ===========================

export const getChanges = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    targetType: v.optional(v.string()),
    source: v.optional(v.string()),
    userId: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("changeHistory")
      .withIndex("by_timestamp")
      .order("desc");

    // 필터 적용
    const allLogs = await query.collect();

    let filtered = allLogs;

    if (args.targetType) {
      filtered = filtered.filter(log => log.targetType === args.targetType);
    }

    if (args.source) {
      filtered = filtered.filter(log => log.source === args.source);
    }

    if (args.userId) {
      filtered = filtered.filter(log => log.userId === args.userId);
    }

    if (args.startDate) {
      filtered = filtered.filter(log => log.timestamp >= args.startDate!);
    }

    if (args.endDate) {
      filtered = filtered.filter(log => log.timestamp <= args.endDate!);
    }

    // 페이지네이션
    const limit = args.limit || 50;
    const cursorIndex = args.cursor ? parseInt(args.cursor) : 0;
    const paged = filtered.slice(cursorIndex, cursorIndex + limit);
    const hasMore = cursorIndex + limit < filtered.length;
    const nextCursor = hasMore ? String(cursorIndex + limit) : undefined;

    return {
      logs: paged,
      nextCursor,
      hasMore,
    };
  },
});

// ===========================
// 쿼리: 특정 대상의 변경 이력
// ===========================

export const getChangesByTarget = query({
  args: {
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("changeHistory")
      .withIndex("by_targetId", (q) =>
        q.eq("targetId", args.targetId)
      )
      .order("desc")
      .collect();

    return logs;
  },
});

// ===========================
// 쿼리: 배치별 변경 이력
// ===========================

export const getChangesByBatch = query({
  args: {
    batchId: v.string(),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("changeHistory")
      .withIndex("by_batchId", (q) =>
        q.eq("batchId", args.batchId)
      )
      .collect();

    return logs;
  },
});

// ===========================
// 유틸: 변경사항 감지
// ===========================

/**
 * 두 객체를 비교하여 변경된 필드를 추출
 */
export function detectChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>,
  fieldLabels: Record<string, string>
): Array<{ field: string; fieldLabel: string; oldValue?: string; newValue?: string }> {
  const changes: Array<{ field: string; fieldLabel: string; oldValue?: string; newValue?: string }> = [];

  for (const field in fieldLabels) {
    const oldVal = oldData[field];
    const newVal = newData[field];

    // 값이 다를 때만 기록
    if (oldVal !== newVal) {
      changes.push({
        field,
        fieldLabel: fieldLabels[field],
        oldValue: oldVal !== undefined && oldVal !== null ? String(oldVal) : undefined,
        newValue: newVal !== undefined && newVal !== null ? String(newVal) : undefined,
      });
    }
  }

  return changes;
}
