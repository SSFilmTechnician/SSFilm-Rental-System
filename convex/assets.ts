import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ===========================
// 1. 개별 장비(Asset) 조회
// ===========================

// 특정 장비 종류의 모든 개별 장비 조회
export const getByEquipmentId = query({
  args: { equipmentId: v.id("equipment") },
  handler: async (ctx, args) => {
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_equipmentId", (q) => q.eq("equipmentId", args.equipmentId))
      .collect();

    return assets.sort((a, b) => {
      // 시리얼 번호로 정렬 (숫자 우선, 알파벳 순)
      const aNum = parseInt(a.serialNumber || "");
      const bNum = parseInt(b.serialNumber || "");

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return (a.serialNumber || "").localeCompare(b.serialNumber || "");
    });
  },
});

// 사용 가능한 개별 장비만 조회
export const getAvailableByEquipmentId = query({
  args: { equipmentId: v.id("equipment") },
  handler: async (ctx, args) => {
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_equipmentId", (q) => q.eq("equipmentId", args.equipmentId))
      .collect();

    return assets
      .filter((a) => a.status === "available")
      .sort((a, b) => {
        const aNum = parseInt(a.serialNumber || "");
        const bNum = parseInt(b.serialNumber || "");

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return (a.serialNumber || "").localeCompare(b.serialNumber || "");
      });
  },
});

// 모든 개별 장비 조회 (관리자용)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const assets = await ctx.db.query("assets").collect();
    const equipment = await ctx.db.query("equipment").collect();

    const equipmentMap = new Map(equipment.map((e) => [e._id, e]));

    return assets.map((asset) => ({
      ...asset,
      equipmentName: equipmentMap.get(asset.equipmentId)?.name || "Unknown",
    }));
  },
});

// 단일 개별 장비 조회
export const getById = query({
  args: { id: v.id("assets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ===========================
// 2. 개별 장비(Asset) 생성/수정/삭제
// ===========================

// 개별 장비 생성
export const create = mutation({
  args: {
    equipmentId: v.id("equipment"),
    serialNumber: v.string(),
    managementCode: v.optional(v.string()),
    status: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("assets", {
      equipmentId: args.equipmentId,
      serialNumber: args.serialNumber,
      managementCode: args.managementCode,
      status: args.status || "available",
      note: args.note,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// 개별 장비 일괄 생성
export const createBatch = mutation({
  args: {
    equipmentId: v.id("equipment"),
    serialNumbers: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids = [];

    for (const serialNumber of args.serialNumbers) {
      const id = await ctx.db.insert("assets", {
        equipmentId: args.equipmentId,
        serialNumber: serialNumber.trim(),
        status: "available",
        createdAt: now,
        updatedAt: now,
      });
      ids.push(id);
    }

    return ids;
  },
});

// 개별 장비 수정
export const update = mutation({
  args: {
    id: v.id("assets"),
    serialNumber: v.optional(v.string()),
    managementCode: v.optional(v.string()),
    status: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Asset not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// 개별 장비 삭제
export const remove = mutation({
  args: { id: v.id("assets") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// ===========================
// 3. 장비 배정 및 반납
// ===========================

// 장비 배정 (예약 승인 시)
export const assignToReservation = mutation({
  args: {
    reservationId: v.id("reservations"),
    assignments: v.array(
      v.object({
        equipmentId: v.id("equipment"),
        assetIds: v.array(v.id("assets")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) throw new Error("Reservation not found");

    const now = Date.now();

    // 1. 개별 장비 상태를 'rented'로 변경
    for (const assignment of args.assignments) {
      for (const assetId of assignment.assetIds) {
        await ctx.db.patch(assetId, {
          status: "rented",
          updatedAt: now,
        });

        // 이력 기록
        await ctx.db.insert("assetHistory", {
          assetId,
          reservationId: args.reservationId,
          userId: reservation.userId,
          action: "rented",
          timestamp: now,
        });
      }
    }

    // 2. 예약의 items에 assignedAssets 추가
    const updatedItems = reservation.items.map((item) => {
      const assignment = args.assignments.find(
        (a) => a.equipmentId === item.equipmentId
      );

      if (assignment) {
        return {
          ...item,
          assignedAssets: assignment.assetIds,
        };
      }
      return item;
    });

    await ctx.db.patch(args.reservationId, {
      items: updatedItems,
    });

    return args.reservationId;
  },
});

// 장비 반납 처리
export const returnAssets = mutation({
  args: {
    reservationId: v.id("reservations"),
    returns: v.array(
      v.object({
        assetId: v.id("assets"),
        condition: v.string(),  // "normal" | "damaged" | "missing_parts"
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) throw new Error("Reservation not found");

    const now = Date.now();

    for (const ret of args.returns) {
      // 1. 개별 장비 상태 업데이트
      const newStatus = ret.condition === "normal" ? "available" : "maintenance";

      await ctx.db.patch(ret.assetId, {
        status: newStatus,
        note: ret.notes || undefined,
        updatedAt: now,
      });

      // 2. 이력 기록
      await ctx.db.insert("assetHistory", {
        assetId: ret.assetId,
        reservationId: args.reservationId,
        userId: reservation.userId,
        action: "returned",
        returnCondition: ret.condition,
        returnNotes: ret.notes,
        timestamp: now,
      });
    }

    return args.reservationId;
  },
});

// 배정 변경 (반출 후 수정)
export const updateAssignment = mutation({
  args: {
    reservationId: v.id("reservations"),
    equipmentId: v.id("equipment"),
    oldAssetIds: v.array(v.id("assets")),
    newAssetIds: v.array(v.id("assets")),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) throw new Error("Reservation not found");

    const now = Date.now();

    // 1. 기존 장비 상태 복원 (available로)
    for (const assetId of args.oldAssetIds) {
      if (!args.newAssetIds.includes(assetId)) {
        await ctx.db.patch(assetId, {
          status: "available",
          updatedAt: now,
        });
      }
    }

    // 2. 새 장비 상태 변경 (rented로)
    for (const assetId of args.newAssetIds) {
      if (!args.oldAssetIds.includes(assetId)) {
        await ctx.db.patch(assetId, {
          status: "rented",
          updatedAt: now,
        });

        // 이력 기록
        await ctx.db.insert("assetHistory", {
          assetId,
          reservationId: args.reservationId,
          userId: reservation.userId,
          action: "rented",
          timestamp: now,
        });
      }
    }

    // 3. 예약의 items 업데이트
    const updatedItems = reservation.items.map((item) => {
      if (item.equipmentId === args.equipmentId) {
        return {
          ...item,
          assignedAssets: args.newAssetIds,
        };
      }
      return item;
    });

    await ctx.db.patch(args.reservationId, {
      items: updatedItems,
    });

    return args.reservationId;
  },
});

// ===========================
// 4. 이력 조회
// ===========================

// 특정 개별 장비의 이력 조회
export const getHistory = query({
  args: { assetId: v.id("assets") },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("assetHistory")
      .withIndex("by_assetId", (q) => q.eq("assetId", args.assetId))
      .collect();

    // 사용자 정보와 예약 정보 조인
    const enrichedHistory = await Promise.all(
      history.map(async (h) => {
        const user = await ctx.db.get(h.userId);
        const reservation = await ctx.db.get(h.reservationId);

        return {
          ...h,
          userName: user?.name || "Unknown",
          reservationNumber: reservation?.reservationNumber || "Unknown",
        };
      })
    );

    return enrichedHistory.sort((a, b) => b.timestamp - a.timestamp);
  },
});

// 특정 예약의 장비 이력 조회
export const getHistoryByReservation = query({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("assetHistory")
      .withIndex("by_reservationId", (q) =>
        q.eq("reservationId", args.reservationId)
      )
      .collect();

    // 자산 정보 조인
    const enrichedHistory = await Promise.all(
      history.map(async (h) => {
        const asset = await ctx.db.get(h.assetId);
        const equipment = asset
          ? await ctx.db.get(asset.equipmentId)
          : null;

        return {
          ...h,
          serialNumber: asset?.serialNumber || "Unknown",
          equipmentName: equipment?.name || "Unknown",
        };
      })
    );

    return enrichedHistory;
  },
});
