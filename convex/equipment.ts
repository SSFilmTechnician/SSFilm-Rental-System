import { query } from "./_generated/server";
import { v } from "convex/values";

// 1. 장비 목록 가져오기 (카테고리 조인 + 필터링 + 정렬)
export const getList = query({
  args: {
    category: v.optional(v.string()), // 대분류
    subCategory: v.optional(v.string()), // 소분류
  },
  handler: async (ctx, args) => {
    // 1. 데이터 준비
    const allEquipment = await ctx.db.query("equipment").collect();
    const allCategories = await ctx.db.query("categories").collect();

    // ID로 카테고리 정보를 찾는 지도(Map) 생성
    const categoryMap = new Map(allCategories.map((c) => [c._id, c]));

    // 2. 필터링 로직
    const filtered = allEquipment.filter((item) => {
      // (1) 이 장비의 카테고리 찾기
      const myCategory = categoryMap.get(item.categoryId);
      if (!myCategory) return false;

      // (2) 부모 카테고리(대분류) 찾기
      const parentCategory = myCategory.parentId
        ? categoryMap.get(myCategory.parentId)
        : null;

      // ✅ [수정 핵심] 점(·), 띄어쓰기(\s) 모두 제거하고 소문자로 변환하여 비교
      const normalize = (str: string) =>
        str
          .toLowerCase()
          .trim()
          .replace(/[\s·]+/g, "");

      // (3) 대분류 필터링
      if (args.category) {
        const reqCat = normalize(args.category);
        const myCatName = normalize(myCategory.name);
        const parentCatName = parentCategory
          ? normalize(parentCategory.name)
          : "";

        // 내 이름이거나, 내 부모 이름이거나
        const isMatch = myCatName === reqCat || parentCatName === reqCat;
        if (!isMatch) return false;
      }

      // (4) 소분류 필터링
      if (args.subCategory) {
        const reqSub = normalize(args.subCategory);
        const myCatName = normalize(myCategory.name);

        if (myCatName !== reqSub) return false;
      }

      return true;
    });

    // 3. 정렬 로직 (sortOrder 기준 오름차순 -> 이름순)
    return filtered.sort((a, b) => {
      const orderA = a.sortOrder ?? 9999;
      const orderB = b.sortOrder ?? 9999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.name.localeCompare(b.name);
    });
  },
});

// 2. 장비 상세 정보 가져오기
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

// 3. 관리자용 전체 목록
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("equipment").order("asc").collect();
  },
});
