import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const importEquipment = mutation({
  args: {
    name: v.string(),
    categoryName: v.string(), // CSV: category (대분류)
    subCategoryName: v.optional(v.string()), // CSV: sub_category (소분류)
    manufacturer: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()), // Cloudinary에서 받은 새 URL
    totalQuantity: v.number(),
    isGroupPrint: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. 대분류 카테고리 처리 (없으면 생성, 있으면 ID 가져오기)
    let parentCategory = await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("name"), args.categoryName))
      .first();

    if (!parentCategory) {
      const id = await ctx.db.insert("categories", {
        name: args.categoryName,
        order: 0,
      });
      parentCategory = await ctx.db.get(id);
    }

    // 2. 소분류 카테고리 처리
    let targetCategoryId = parentCategory!._id;

    if (args.subCategoryName) {
      const subCategory = await ctx.db
        .query("categories")
        .filter((q) =>
          q.and(
            q.eq(q.field("name"), args.subCategoryName),
            q.eq(q.field("parentId"), parentCategory!._id)
          )
        )
        .first();

      if (!subCategory) {
        targetCategoryId = await ctx.db.insert("categories", {
          name: args.subCategoryName,
          parentId: parentCategory!._id,
          order: 0,
        });
      } else {
        targetCategoryId = subCategory._id;
      }
    }

    // 3. 장비 마스터(Equipment) 생성
    const equipmentId = await ctx.db.insert("equipment", {
      name: args.name,
      categoryId: targetCategoryId,
      manufacturer: args.manufacturer,
      description: args.description,
      imageUrl: args.imageUrl,
      totalQuantity: args.totalQuantity,
      isGroupPrint: args.isGroupPrint,
      sortOrder: args.sortOrder,
    });

    // 4. 개별 자산(Assets) 자동 생성 (Total Quantity 만큼 반복)
    for (let i = 1; i <= args.totalQuantity; i++) {
      await ctx.db.insert("assets", {
        equipmentId: equipmentId,
        // 임시 관리코드 생성 (예: FX6-AUTO-1)
        managementCode: `${args.name.substring(0, 3).toUpperCase()}-AUTO-${i}`,
        serialNumber: "Pending Update", // 나중에 관리자가 수정
        status: "available", // 기본값: 대여 가능
        note: "Migration data",
      });
    }

    return equipmentId;
  },
});
