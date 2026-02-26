import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

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

    return filtered
      .sort((a, b) => {
        const orderA = a.sortOrder ?? 9999;
        const orderB = b.sortOrder ?? 9999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      })
      .map((eq) => {
        const cat = categoryMap.get(eq.categoryId);
        const parentCat = cat?.parentId ? categoryMap.get(cat.parentId) : null;
        return {
          ...eq,
          categoryName: cat?.name ?? "",
          parentCategoryName: parentCat?.name ?? "",
        };
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

// 3-1. [엑셀 내보내기용] 카테고리 정보 포함 전체 장비 목록
export const getAllForExport = query({
  args: {},
  handler: async (ctx) => {
    const allEquipment = await ctx.db.query("equipment").collect();
    const allCategories = await ctx.db.query("categories").collect();
    const categoryMap = new Map(allCategories.map((c) => [c._id, c]));

    return allEquipment
      .sort((a, b) => {
        const orderA = a.sortOrder ?? 9999;
        const orderB = b.sortOrder ?? 9999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      })
      .map((eq) => {
        const cat = categoryMap.get(eq.categoryId);
        const parentCat = cat?.parentId ? categoryMap.get(cat.parentId) : null;
        return {
          _id: eq._id,
          name: eq.name,
          category: parentCat?.name ?? cat?.name ?? "",
          subCategory: parentCat ? (cat?.name ?? "") : "",
          totalQuantity: eq.totalQuantity,
          description: eq.description ?? "",
          isVisible: eq.isVisible !== false,
        };
      });
  },
});

// 3-2. [엑셀 가져오기] 장비 일괄 upsert (신규 생성 or 기존 수정)
export const bulkUpsertEquipment = mutation({
  args: {
    items: v.array(
      v.object({
        id: v.optional(v.string()),          // 기존 _id (수정용)
        name: v.string(),
        categoryName: v.optional(v.string()),
        subCategoryName: v.optional(v.string()),
        totalQuantity: v.optional(v.number()),
        description: v.optional(v.string()),
        isVisible: v.optional(v.boolean()),
      })
    ),
    fileName: v.optional(v.string()), // 엑셀 파일명 (변경 이력 기록용)
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const allCategories = await ctx.db.query("categories").collect();
    const batchId = `excel_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let created = 0, updated = 0, errors = 0;

    for (const item of args.items) {
      try {
        // 카테고리 조회 (서브카테고리 우선)
        const targetCatName = item.subCategoryName || item.categoryName;
        const matchedCat = targetCatName
          ? allCategories.find(
              (c) => c.name.toLowerCase() === targetCatName.toLowerCase()
            )
          : null;

        if (item.id) {
          // 수정: ID로 직접 patch
          const eqId = item.id as Id<"equipment">;
          const existing = await ctx.db.get(eqId);
          if (!existing) { errors++; continue; }

          const oldCategory = await ctx.db.get(existing.categoryId);
          const patch: Partial<{ name: string; totalQuantity: number; description: string; isVisible: boolean; categoryId: Id<"categories"> }> = { name: item.name };
          if (item.totalQuantity !== undefined) patch.totalQuantity = item.totalQuantity;
          if (item.description !== undefined) patch.description = item.description;
          if (item.isVisible !== undefined) patch.isVisible = item.isVisible;
          if (matchedCat) patch.categoryId = matchedCat._id;
          await ctx.db.patch(eqId, patch);
          updated++;

          // 변경 이력 기록
          if (identity) {
            const changes = [];
            if (existing.name !== item.name) {
              changes.push({ field: "name", fieldLabel: "장비명", oldValue: existing.name, newValue: item.name });
            }
            if (matchedCat && existing.categoryId !== matchedCat._id) {
              changes.push({ field: "category", fieldLabel: "카테고리", oldValue: oldCategory?.name, newValue: matchedCat.name });
            }
            if (item.totalQuantity !== undefined && existing.totalQuantity !== item.totalQuantity) {
              changes.push({ field: "totalQuantity", fieldLabel: "전체수량", oldValue: String(existing.totalQuantity), newValue: String(item.totalQuantity) });
            }
            if (item.isVisible !== undefined && existing.isVisible !== item.isVisible) {
              changes.push({ field: "isVisible", fieldLabel: "노출상태", oldValue: existing.isVisible === false ? "숨김" : "노출", newValue: item.isVisible ? "노출" : "숨김" });
            }

            if (changes.length > 0) {
              await ctx.scheduler.runAfter(0, internal.changeHistory.recordChange, {
                userId: identity.subject,
                userName: identity.name || identity.email || "Unknown",
                userEmail: identity.email || "",
                targetType: "equipment",
                targetId: eqId,
                targetName: item.name,
                action: "update",
                changes,
                source: "excel_import",
                sourceDetail: args.fileName,
                batchId,
              });
            }
          }
        } else {
          // 신규: 카테고리 필수
          let categoryId = matchedCat?._id;
          if (!categoryId) categoryId = allCategories[0]?._id;
          if (!categoryId) { errors++; continue; }
          const newId = await ctx.db.insert("equipment", {
            name: item.name,
            categoryId,
            totalQuantity: item.totalQuantity ?? 1,
            description: item.description,
            isVisible: item.isVisible !== false,
          });
          created++;

          // 변경 이력 기록
          if (identity) {
            await ctx.scheduler.runAfter(0, internal.changeHistory.recordChange, {
              userId: identity.subject,
              userName: identity.name || identity.email || "Unknown",
              userEmail: identity.email || "",
              targetType: "equipment",
              targetId: newId,
              targetName: item.name,
              action: "create",
              changes: [
                { field: "name", fieldLabel: "장비명", newValue: item.name },
                { field: "category", fieldLabel: "카테고리", newValue: matchedCat?.name || allCategories[0]?.name },
                { field: "totalQuantity", fieldLabel: "전체수량", newValue: String(item.totalQuantity ?? 1) },
              ],
              source: "excel_import",
              sourceDetail: args.fileName,
              batchId,
            });
          }
        }
      } catch {
        errors++;
      }
    }
    return { created, updated, errors };
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
    const identity = await ctx.auth.getUserIdentity();
    const equipmentId = await ctx.db.insert("equipment", {
      name: args.name,
      categoryId: args.categoryId,
      totalQuantity: args.totalQuantity,
      description: args.description,
      sortOrder: args.sortOrder ?? 999,
      isGroupPrint: args.isGroupPrint ?? false,
      // 기본값은 true(노출)로 설정
      isVisible: args.isVisible ?? true,
    });

    // 변경 이력 기록
    if (identity) {
      const category = await ctx.db.get(args.categoryId);
      await ctx.scheduler.runAfter(0, internal.changeHistory.recordChange, {
        userId: identity.subject,
        userName: identity.name || identity.email || "Unknown",
        userEmail: identity.email || "",
        targetType: "equipment",
        targetId: equipmentId,
        targetName: args.name,
        action: "create",
        changes: [
          { field: "name", fieldLabel: "장비명", newValue: args.name },
          { field: "category", fieldLabel: "카테고리", newValue: category?.name || "" },
          { field: "totalQuantity", fieldLabel: "전체수량", newValue: String(args.totalQuantity) },
          { field: "isVisible", fieldLabel: "노출상태", newValue: (args.isVisible ?? true) ? "노출" : "숨김" },
        ],
        source: "manual",
      });
    }

    return equipmentId;
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
    const identity = await ctx.auth.getUserIdentity();

    // 이전 데이터 가져오기
    const oldEquipment = await ctx.db.get(id);
    if (!oldEquipment) throw new Error("장비를 찾을 수 없습니다.");

    const oldCategory = await ctx.db.get(oldEquipment.categoryId);
    const newCategory = await ctx.db.get(args.categoryId);

    await ctx.db.patch(id, {
      ...data,
      sortOrder: data.sortOrder ?? 999,
      isGroupPrint: data.isGroupPrint ?? false,
      // 값이 안 넘어오면 기존 값 유지, 아니면 업데이트
      isVisible: data.isVisible ?? true,
    });

    // 변경 이력 기록
    if (identity) {
      const changes = [];

      if (oldEquipment.name !== args.name) {
        changes.push({ field: "name", fieldLabel: "장비명", oldValue: oldEquipment.name, newValue: args.name });
      }
      if (oldEquipment.categoryId !== args.categoryId) {
        changes.push({ field: "category", fieldLabel: "카테고리", oldValue: oldCategory?.name, newValue: newCategory?.name });
      }
      if (oldEquipment.totalQuantity !== args.totalQuantity) {
        changes.push({ field: "totalQuantity", fieldLabel: "전체수량", oldValue: String(oldEquipment.totalQuantity), newValue: String(args.totalQuantity) });
      }
      if (oldEquipment.description !== data.description) {
        changes.push({ field: "description", fieldLabel: "설명", oldValue: oldEquipment.description, newValue: data.description });
      }
      if (oldEquipment.isVisible !== (data.isVisible ?? true)) {
        changes.push({
          field: "isVisible",
          fieldLabel: "노출상태",
          oldValue: oldEquipment.isVisible === false ? "숨김" : "노출",
          newValue: (data.isVisible ?? true) ? "노출" : "숨김"
        });
      }

      if (changes.length > 0) {
        await ctx.scheduler.runAfter(0, internal.changeHistory.recordChange, {
          userId: identity.subject,
          userName: identity.name || identity.email || "Unknown",
          userEmail: identity.email || "",
          targetType: "equipment",
          targetId: id,
          targetName: args.name,
          action: "update",
          changes,
          source: "manual",
        });
      }
    }

    return id;
  },
});

// 7. 삭제
export const remove = mutation({
  args: { id: v.id("equipment") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const equipment = await ctx.db.get(args.id);
    if (!equipment) throw new Error("장비를 찾을 수 없습니다.");

    const assets = await ctx.db
      .query("assets")
      .withIndex("by_equipmentId", (q) => q.eq("equipmentId", args.id))
      .collect();

    for (const asset of assets) {
      await ctx.db.delete(asset._id);
    }
    await ctx.db.delete(args.id);

    // 변경 이력 기록
    if (identity) {
      await ctx.scheduler.runAfter(0, internal.changeHistory.recordChange, {
        userId: identity.subject,
        userName: identity.name || identity.email || "Unknown",
        userEmail: identity.email || "",
        targetType: "equipment",
        targetId: args.id,
        targetName: equipment.name,
        action: "delete",
        changes: [
          { field: "deleted", fieldLabel: "삭제됨", newValue: "장비 및 관련 자산 삭제됨" }
        ],
        source: "manual",
      });
    }

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
    const identity = await ctx.auth.getUserIdentity();
    const equipment = await ctx.db.get(args.id);
    if (!equipment) throw new Error("장비를 찾을 수 없습니다.");

    const oldValue = equipment.isVisible === false ? "숨김" : "노출";
    const newValue = args.isVisible ? "노출" : "숨김";

    await ctx.db.patch(args.id, { isVisible: args.isVisible });

    // 변경 이력 기록
    if (identity && oldValue !== newValue) {
      await ctx.scheduler.runAfter(0, internal.changeHistory.recordChange, {
        userId: identity.subject,
        userName: identity.name || identity.email || "Unknown",
        userEmail: identity.email || "",
        targetType: "equipment",
        targetId: args.id,
        targetName: equipment.name,
        action: "status_change",
        changes: [
          { field: "isVisible", fieldLabel: "노출상태", oldValue, newValue }
        ],
        source: "manual",
      });
    }
  },
});

// ★ [추가] 중복 카테고리 찾기
export const findDuplicateCategories = query({
  args: {},
  handler: async (ctx) => {
    const allCategories = await ctx.db.query("categories").collect();

    // 같은 parentId를 가진 카테고리들 중 이름이 같은 것 찾기
    const grouped: Record<string, typeof allCategories> = {};
    for (const cat of allCategories) {
      const key = `${cat.parentId || "root"}_${cat.name.trim().toLowerCase()}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(cat);
    }

    const duplicates = [];
    for (const [key, items] of Object.entries(grouped)) {
      if (items.length > 1) {
        duplicates.push({
          key,
          name: items[0].name,
          parentId: items[0].parentId,
          count: items.length,
          items: items.map((c) => ({ id: c._id, name: c.name, order: c.order })),
        });
      }
    }
    return duplicates;
  },
});

// ★ [추가] 중복 카테고리 삭제 (ID로 삭제)
export const removeCategory = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    // 해당 카테고리를 사용하는 장비가 있는지 확인
    const equipmentUsingCategory = await ctx.db
      .query("equipment")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .collect();

    if (equipmentUsingCategory.length > 0) {
      throw new Error(
        `이 카테고리를 사용하는 장비가 ${equipmentUsingCategory.length}개 있습니다. 먼저 장비를 다른 카테고리로 이동하세요.`
      );
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// ★ [추가] 중복 TRIPOD 카테고리 정리 (사용하지 않는 중복 삭제)
export const cleanupDuplicateTripod = mutation({
  args: {},
  handler: async (ctx) => {
    const allCategories = await ctx.db.query("categories").collect();

    // TRIPOD · GRIP 부모 카테고리 찾기
    const tripodGripParent = allCategories.find(
      (c) => c.name.toUpperCase().includes("TRIPOD") && c.name.includes("GRIP") && !c.parentId
    );

    if (!tripodGripParent) {
      return { message: "TRIPOD · GRIP 부모 카테고리를 찾을 수 없습니다.", deleted: 0 };
    }

    // TRIPOD · GRIP 하위의 TRIPOD 서브카테고리들 찾기
    const tripodSubcategories = allCategories.filter(
      (c) =>
        c.parentId === tripodGripParent._id &&
        c.name.toUpperCase() === "TRIPOD"
    );

    if (tripodSubcategories.length <= 1) {
      return { message: "중복 TRIPOD 카테고리가 없습니다.", deleted: 0 };
    }

    // 각 TRIPOD 카테고리가 사용하는 장비 수 확인
    const categoriesWithUsage = await Promise.all(
      tripodSubcategories.map(async (cat) => {
        const equipment = await ctx.db
          .query("equipment")
          .withIndex("by_category", (q) => q.eq("categoryId", cat._id))
          .collect();
        return { ...cat, equipmentCount: equipment.length };
      })
    );

    // 장비가 없는 중복 카테고리 삭제
    let deletedCount = 0;
    const keptCategory = categoriesWithUsage.find((c) => c.equipmentCount > 0) || categoriesWithUsage[0];

    for (const cat of categoriesWithUsage) {
      if (cat._id !== keptCategory._id && cat.equipmentCount === 0) {
        await ctx.db.delete(cat._id);
        deletedCount++;
      }
    }

    return {
      message: `${deletedCount}개의 중복 TRIPOD 카테고리를 삭제했습니다.`,
      deleted: deletedCount,
      kept: keptCategory._id
    };
  },
});

export const findDuplicatedEquipment = query({
  args: {},
  handler: async (ctx) => {
    // 1. 모든 장비 데이터를 가져옵니다.
    const allEquipment = await ctx.db.query("equipment").collect();

    // 2. 장비 이름(name)을 기준으로 그룹화합니다.
    const groupedByName: Record<string, typeof allEquipment> = {};
    for (const item of allEquipment) {
      // 띄어쓰기나 대소문자 차이로 중복을 놓치지 않도록 이름을 정리합니다.
      const normalizedName = item.name.trim().toLowerCase();
      if (!groupedByName[normalizedName]) {
        groupedByName[normalizedName] = [];
      }
      groupedByName[normalizedName].push(item);
    }

    // 3. 2개 이상 등록된 '중복 장비'만 추려냅니다.
    const duplicates = [];
    for (const [name, items] of Object.entries(groupedByName)) {
      if (items.length > 1) {
        // 보기 편하도록 카테고리 이름까지 조회해서 합쳐줍니다.
        const itemDetails = await Promise.all(
          items.map(async (item) => {
            const category = await ctx.db.get(item.categoryId);
            return {
              id: item._id, // 삭제할 때 필요한 ID
              originalName: item.name,
              categoryName: category?.name || "알 수 없는 카테고리",
              totalQuantity: item.totalQuantity,
            };
          }),
        );

        duplicates.push({
          duplicateName: name,
          count: items.length,
          items: itemDetails,
        });
      }
    }

    return duplicates; // 중복 목록 반환
  },
});

// ★ [추가] 중복 TRIPOD 카테고리 상세 조회 (어떤 장비가 있는지 확인)
export const getDuplicateTripodDetails = query({
  args: {},
  handler: async (ctx) => {
    const allCategories = await ctx.db.query("categories").collect();

    // TRIPOD · GRIP 부모 카테고리 찾기
    const tripodGripParent = allCategories.find(
      (c) => c.name.toUpperCase().includes("TRIPOD") && c.name.includes("GRIP") && !c.parentId
    );

    if (!tripodGripParent) {
      return { message: "TRIPOD · GRIP 부모 카테고리를 찾을 수 없습니다.", categories: [] };
    }

    // TRIPOD · GRIP 하위의 TRIPOD 서브카테고리들 찾기
    const tripodSubcategories = allCategories.filter(
      (c) =>
        c.parentId === tripodGripParent._id &&
        c.name.toUpperCase() === "TRIPOD"
    );

    // 각 카테고리별 장비 목록 조회
    const categoriesWithEquipment = await Promise.all(
      tripodSubcategories.map(async (cat) => {
        const equipment = await ctx.db
          .query("equipment")
          .withIndex("by_category", (q) => q.eq("categoryId", cat._id))
          .collect();
        return {
          categoryId: cat._id,
          categoryName: cat.name,
          order: cat.order,
          equipmentCount: equipment.length,
          equipment: equipment.map(eq => ({
            id: eq._id,
            name: eq.name,
            totalQuantity: eq.totalQuantity,
          })),
        };
      })
    );

    return {
      message: `${tripodSubcategories.length}개의 TRIPOD 서브카테고리를 찾았습니다.`,
      parentCategory: tripodGripParent.name,
      categories: categoriesWithEquipment,
    };
  },
});

// ★ [추가] 장비의 카테고리 변경
export const moveEquipmentToCategory = mutation({
  args: {
    equipmentId: v.id("equipment"),
    newCategoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.equipmentId, { categoryId: args.newCategoryId });
    return args.equipmentId;
  },
});
