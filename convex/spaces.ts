import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 초기 공간 데이터 시드
export const seedSpaces = mutation({
  args: {},
  handler: async (ctx) => {
    // 이미 공간이 있는지 확인
    const existing = await ctx.db.query("spaces").first();
    if (existing) {
      return { success: false, message: "공간 데이터가 이미 존재합니다." };
    }

    const spaces = [
      {
        name: "마스터링룸 1",
        requiresApproval: false,
        isActive: true,
        description: "마스터링 작업용 공간",
        order: 1,
      },
      {
        name: "마스터링룸 2",
        requiresApproval: false,
        isActive: true,
        description: "마스터링 작업용 공간",
        order: 2,
      },
      {
        name: "스튜디오",
        requiresApproval: false,
        isActive: true,
        description: "녹음 및 촬영용 스튜디오",
        order: 3,
      },
      {
        name: "회의실",
        requiresApproval: false,
        isActive: true,
        description: "회의 및 스터디용 공간",
        order: 4,
      },
      {
        name: "믹싱룸/ADR룸",
        requiresApproval: true,
        isActive: true,
        description: "믹싱 및 ADR 작업용 공간 (승인 필요)",
        order: 5,
      },
      {
        name: "과방",
        requiresApproval: false,
        isActive: true,
        description: "학과 공용 공간",
        order: 6,
      },
      {
        name: "편집실",
        requiresApproval: false,
        isActive: true,
        description: "영상 편집용 공간",
        order: 7,
      },
    ];

    for (const space of spaces) {
      await ctx.db.insert("spaces", space);
    }

    return { success: true, message: "7개 공간이 성공적으로 생성되었습니다." };
  },
});

// 모든 공간 조회
export const getAllSpaces = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("spaces").order("asc").collect();
  },
});

// 활성화된 공간만 조회
export const getActiveSpaces = query({
  args: {},
  handler: async (ctx) => {
    const spaces = await ctx.db.query("spaces").collect();
    return spaces.filter((s) => s.isActive).sort((a, b) => a.order - b.order);
  },
});

// 공간 ID로 조회
export const getSpaceById = query({
  args: { spaceId: v.id("spaces") },
  handler: async (ctx, { spaceId }) => {
    return await ctx.db.get(spaceId);
  },
});
