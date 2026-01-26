import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// 1. [학생용] 장비 목록 가져오기 (숨김 장비는 제외됨)
export const getList = query({
  args: {
    category: v.optional(v.string()), // 대분류
    subCategory: v.optional(v.string()), // 소분류
  },
  handler: async (ctx, args) => {
    const allEquipment = await ctx.db.query("equipment").collect();
    const allCategories = await ctx.db.query("categories").collect();
    const categoryMap = new Map(allCategories.map((c) => [c._id, c]));

    const normalize = (str: string) =>
      str
        .toLowerCase()
        .trim()
        .replace(/[\s·]+/g, "");

    const filtered = allEquipment.filter((item) => {
      // ★ [핵심] isVisible이 false인 장비(부속품 등)는 학생 목록에서 제외합니다.
      if (item.isVisible === false) return false;

      const myCategory = categoryMap.get(item.categoryId);
      if (!myCategory) return false;

      // 부모 카테고리
      const parentCategory = myCategory.parentId
        ? categoryMap.get(myCategory.parentId)
        : null;

      // 대분류 필터링
      if (args.category) {
        const reqCat = normalize(args.category);
        const myCatName = normalize(myCategory.name);
        const parentCatName = parentCategory
          ? normalize(parentCategory.name)
          : "";
        if (myCatName !== reqCat && parentCatName !== reqCat) return false;
      }

      // 소분류 필터링
      if (args.subCategory) {
        const reqSub = normalize(args.subCategory);
        const myCatName = normalize(myCategory.name);
        if (myCatName !== reqSub) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const orderA = a.sortOrder ?? 9999;
      const orderB = b.sortOrder ?? 9999;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  },
});

// 2. 장비 상세 정보
export const getById = query({
  args: { id: v.id("equipment") },
  handler: async (ctx, args) => {
    const equipment = await ctx.db.get(args.id);
    if (!equipment) return null;
    const categoryData = await ctx.db.get(equipment.categoryId);
    return {
      ...equipment,
      categoryName: categoryData?.name || "Uncategorized",
    };
  },
});

// 3. [관리자용] 전체 목록 (숨긴 장비 포함 모두 보임)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("equipment").order("asc").collect();
  },
});

// 4. 카테고리 목록
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("categories").collect();
  },
});

// 5. 생성
export const create = mutation({
  args: {
    name: v.string(),
    categoryId: v.id("categories"),
    totalQuantity: v.number(),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isGroupPrint: v.optional(v.boolean()),
    // ★ [추가] 생성 시 노출 여부 받기
    isVisible: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("equipment", {
      name: args.name,
      categoryId: args.categoryId,
      totalQuantity: args.totalQuantity,
      description: args.description,
      sortOrder: args.sortOrder ?? 999,
      isGroupPrint: args.isGroupPrint ?? false,
      // 기본값은 true(노출)로 설정
      isVisible: args.isVisible ?? true,
    });
  },
});

// 6. 수정
export const update = mutation({
  args: {
    id: v.id("equipment"),
    name: v.string(),
    categoryId: v.id("categories"),
    totalQuantity: v.number(),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isGroupPrint: v.optional(v.boolean()),
    // ★ [추가] 수정 시 노출 여부 받기
    isVisible: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, {
      ...data,
      sortOrder: data.sortOrder ?? 999,
      isGroupPrint: data.isGroupPrint ?? false,
      // 값이 안 넘어오면 기존 값 유지, 아니면 업데이트
      isVisible: data.isVisible ?? true,
    });
    return id;
  },
});

// 7. 삭제
export const remove = mutation({
  args: { id: v.id("equipment") },
  handler: async (ctx, args) => {
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_equipmentId", (q) => q.eq("equipmentId", args.id))
      .collect();

    for (const asset of assets) {
      await ctx.db.delete(asset._id);
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// 8. [마이그레이션] 모든 기존 장비의 isVisible 값을 true로 일괄 업데이트
export const setAllVisible = mutation({
  args: {},
  handler: async (ctx) => {
    const allEquipment = await ctx.db.query("equipment").collect();

    let count = 0;
    for (const item of allEquipment) {
      // isVisible 값이 없거나 false인 경우 모두 true로 덮어씌웁니다.
      if (item.isVisible !== true) {
        await ctx.db.patch(item._id, { isVisible: true });
        count++;
      }
    }
    return `${count}개의 장비가 '노출(true)' 상태로 업데이트 되었습니다.`;
  },
});

// ★ [추가] 관리자 페이지에서 클릭 한 번으로 노출 상태를 변경하는 함수
export const toggleVisibility = mutation({
  args: {
    id: v.id("equipment"),
    isVisible: v.boolean(), // 변경할 타겟 상태
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isVisible: args.isVisible });
  },
});
