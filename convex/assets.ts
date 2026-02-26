import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ===========================
// 1. 개별 장비(Asset) 조회
// ===========================

// 특정 장비 모델(Equipment)에 속한 모든 개별 장비(Serial No.) 조회
export const getByEquipmentId = query({
  args: { equipmentId: v.id("equipment") },
  handler: async (ctx, args) => {
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_equipmentId", (q) => q.eq("equipmentId", args.equipmentId))
      .collect();

    // 정렬 로직: 숫자와 문자가 섞인 시리얼 번호를 자연스럽게 정렬 (예: 1, 2, 10, A, B)
    return assets.sort((a, b) => {
      const aNum = parseInt(a.serialNumber || "");
      const bNum = parseInt(b.serialNumber || "");

      // 둘 다 숫자라면 숫자 크기로 비교
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      // 문자가 섞여있다면 문자열 순서로 비교
      return (a.serialNumber || "").localeCompare(b.serialNumber || "");
    });
  },
});

// 사용 가능한(Available) 상태의 개별 장비만 조회 (예약 배정 시 사용)
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
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return (a.serialNumber || "").localeCompare(b.serialNumber || "");
      });
  },
});

// 현재 활성 예약에 배정된 asset 상세 정보 조회 (UI 상태 표시용)
// { assetId → { leaderName, startDate, endDate, reservationStatus } }
// 날짜가 겹치는 예약에 배정된 장비만 "점유"로 처리
export const getOccupiedAssetsWithInfo = query({
  args: { excludeReservationId: v.optional(v.id("reservations")) },
  handler: async (ctx, args) => {
    const reservations = await ctx.db.query("reservations").collect();

    // 현재 예약의 날짜 범위 조회 (날짜 겹침 필터링용)
    let currentStartDate: string | null = null;
    let currentEndDate: string | null = null;
    if (args.excludeReservationId) {
      const currentReservation = reservations.find(
        (r) => r._id === args.excludeReservationId,
      );
      currentStartDate = currentReservation?.startDate ?? null;
      currentEndDate = currentReservation?.endDate ?? null;
    }

    const occupiedMap: Record<
      string,
      {
        leaderName: string;
        startDate: string;
        endDate: string;
        reservationStatus: string;
      }
    > = {};

    for (const reservation of reservations) {
      if (
        reservation.status !== "approved" &&
        reservation.status !== "rented"
      )
        continue;
      if (
        args.excludeReservationId &&
        reservation._id === args.excludeReservationId
      )
        continue;

      // 날짜 겹침 체크: 현재 예약과 날짜가 겹치는 경우만 점유로 처리
      if (currentStartDate && currentEndDate) {
        const overlaps =
          reservation.startDate < currentEndDate &&
          reservation.endDate > currentStartDate;
        if (!overlaps) continue;
      }

      for (const item of reservation.items) {
        if (item.assignedAssets) {
          item.assignedAssets.forEach((id) => {
            occupiedMap[id] = {
              leaderName: reservation.leaderName,
              startDate: reservation.startDate,
              endDate: reservation.endDate,
              reservationStatus: reservation.status,
            };
          });
        }
      }
    }

    return occupiedMap;
  },
});

// 현재 활성 예약(approved/rented)에 배정된 asset ID 목록 조회 (실시간)
// excludeReservationId: 자기 자신 예약은 제외 (편집 시 본인 배정 장비는 선택 가능하도록)
// 날짜가 겹치는 예약에 배정된 장비만 점유로 처리
export const getOccupiedAssetIds = query({
  args: { excludeReservationId: v.optional(v.id("reservations")) },
  handler: async (ctx, args) => {
    const reservations = await ctx.db.query("reservations").collect();

    // 현재 예약의 날짜 범위 조회 (날짜 겹침 필터링용)
    let currentStartDate: string | null = null;
    let currentEndDate: string | null = null;
    if (args.excludeReservationId) {
      const currentReservation = reservations.find(
        (r) => r._id === args.excludeReservationId,
      );
      currentStartDate = currentReservation?.startDate ?? null;
      currentEndDate = currentReservation?.endDate ?? null;
    }

    const occupied = new Set<string>();

    for (const reservation of reservations) {
      if (
        reservation.status !== "approved" &&
        reservation.status !== "rented"
      )
        continue;
      if (
        args.excludeReservationId &&
        reservation._id === args.excludeReservationId
      )
        continue;

      // 날짜 겹침 체크: 현재 예약과 날짜가 겹치는 경우만 점유로 처리
      if (currentStartDate && currentEndDate) {
        const overlaps =
          reservation.startDate < currentEndDate &&
          reservation.endDate > currentStartDate;
        if (!overlaps) continue;
      }

      for (const item of reservation.items) {
        if (item.assignedAssets) {
          item.assignedAssets.forEach((id) => occupied.add(id));
        }
      }
    }

    return Array.from(occupied);
  },
});

// 모든 개별 장비 조회 (관리자 전체 현황용)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const assets = await ctx.db.query("assets").collect();

    // N+1 문제 방지를 위해 장비 정보를 미리 맵으로 구성
    const equipmentList = await ctx.db.query("equipment").collect();
    const equipmentMap = new Map(equipmentList.map((e) => [e._id, e]));

    return assets.map((asset) => ({
      ...asset,
      equipmentName:
        equipmentMap.get(asset.equipmentId)?.name || "Unknown Equipment",
    }));
  },
});

// 단일 개별 장비 상세 조회
export const getById = query({
  args: { id: v.id("assets") },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.id);
    if (!asset) return null;

    // 장비 모델명도 함께 반환하면 편리함
    const equipment = await ctx.db.get(asset.equipmentId);
    return {
      ...asset,
      equipmentName: equipment?.name || "Unknown",
    };
  },
});

// ===========================
// 2. 개별 장비(Asset) 생성/수정/삭제
// ===========================

// 개별 장비 생성 (단건)
export const create = mutation({
  args: {
    equipmentId: v.id("equipment"),
    serialNumber: v.string(),
    managementCode: v.optional(v.string()),
    status: v.string(), // available, rented, etc.
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const identity = await ctx.auth.getUserIdentity();

    // 검색/표시 성능을 위해 장비명과 카테고리명을 Asset에 복사(Denormalization)
    const equipment = await ctx.db.get(args.equipmentId);
    const equipmentName = equipment?.name || "Unknown";

    let categoryName = "Unknown";
    if (equipment?.categoryId) {
      const category = await ctx.db.get(equipment.categoryId);
      categoryName = category?.name || "Unknown";
    }

    const assetId = await ctx.db.insert("assets", {
      equipmentId: args.equipmentId,
      equipmentName,
      categoryName,
      serialNumber: args.serialNumber.trim(),
      managementCode: args.managementCode?.trim(),
      status: args.status || "available",
      note: args.note?.trim(),
      createdAt: now,
      updatedAt: now,
    });

    // 변경 이력 기록
    if (identity) {
      await ctx.scheduler.runAfter(0, internal.changeHistory.recordChange, {
        userId: identity.subject,
        userName: identity.name || identity.email || "Unknown",
        userEmail: identity.email || "",
        targetType: "asset",
        targetId: assetId,
        targetName: `${equipmentName} - ${args.serialNumber.trim()}`,
        action: "create",
        changes: [
          { field: "equipmentName", fieldLabel: "장비명", newValue: equipmentName },
          { field: "serialNumber", fieldLabel: "시리얼번호", newValue: args.serialNumber.trim() },
          { field: "status", fieldLabel: "상태", newValue: args.status || "available" },
        ],
        source: "manual",
      });
    }

    return assetId;
  },
});

// 개별 장비 일괄 생성 (Batch)
export const createBatch = mutation({
  args: {
    equipmentId: v.id("equipment"),
    serialNumbers: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids = [];

    // 이름 정보 미리 조회
    const equipment = await ctx.db.get(args.equipmentId);
    const equipmentName = equipment?.name || "Unknown";

    let categoryName = "Unknown";
    if (equipment?.categoryId) {
      const category = await ctx.db.get(equipment.categoryId);
      categoryName = category?.name || "Unknown";
    }

    for (const serialNumber of args.serialNumbers) {
      const id = await ctx.db.insert("assets", {
        equipmentId: args.equipmentId,
        equipmentName,
        categoryName,
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
    note: v.optional(v.string()), // 빈 문자열("")도 허용됨
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const identity = await ctx.auth.getUserIdentity();

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Asset not found");

    // ...updates를 사용하면 undefined가 아닌 값(빈 문자열 포함)은 모두 업데이트됨
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    // 변경 이력 기록
    if (identity) {
      const changes = [];

      if (args.serialNumber !== undefined && existing.serialNumber !== args.serialNumber) {
        changes.push({ field: "serialNumber", fieldLabel: "시리얼번호", oldValue: existing.serialNumber, newValue: args.serialNumber });
      }
      if (args.managementCode !== undefined && existing.managementCode !== args.managementCode) {
        changes.push({ field: "managementCode", fieldLabel: "자산번호", oldValue: existing.managementCode, newValue: args.managementCode });
      }
      if (args.status !== undefined && existing.status !== args.status) {
        changes.push({ field: "status", fieldLabel: "상태", oldValue: existing.status, newValue: args.status });
      }
      if (args.note !== undefined && existing.note !== args.note) {
        changes.push({ field: "note", fieldLabel: "비고", oldValue: existing.note, newValue: args.note });
      }

      if (changes.length > 0) {
        await ctx.scheduler.runAfter(0, internal.changeHistory.recordChange, {
          userId: identity.subject,
          userName: identity.name || identity.email || "Unknown",
          userEmail: identity.email || "",
          targetType: "asset",
          targetId: id,
          targetName: `${existing.equipmentName} - ${existing.serialNumber}`,
          action: "update",
          changes,
          source: "manual",
        });
      }
    }

    return id;
  },
});

// 개별 장비 삭제
export const remove = mutation({
  args: { id: v.id("assets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const asset = await ctx.db.get(args.id);

    // 필요하다면 여기서 관련 이력(History)도 삭제하거나 보관할 수 있음
    await ctx.db.delete(args.id);

    // 변경 이력 기록
    if (identity && asset) {
      await ctx.scheduler.runAfter(0, internal.changeHistory.recordChange, {
        userId: identity.subject,
        userName: identity.name || identity.email || "Unknown",
        userEmail: identity.email || "",
        targetType: "asset",
        targetId: args.id,
        targetName: `${asset.equipmentName} - ${asset.serialNumber}`,
        action: "delete",
        changes: [
          { field: "deleted", fieldLabel: "삭제됨", newValue: "자산 삭제됨" }
        ],
        source: "manual",
      });
    }

    return args.id;
  },
});

// ===========================
// 3. 장비 배정 및 반납 프로세스 (핵심)
// ===========================

// [예약 승인 시] 장비 배정 실행
export const assignToReservation = mutation({
  args: {
    reservationId: v.id("reservations"),
    assignments: v.array(
      v.object({
        equipmentId: v.id("equipment"),
        assetIds: v.array(v.id("assets")),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) throw new Error("Reservation not found");

    const now = Date.now();
    const user = await ctx.db.get(reservation.userId);
    const userName = user?.name || "Unknown";

    // 배정 전 날짜가 겹치는 다른 활성 예약에서 점유 중인 asset ID 수집
    const allReservations = await ctx.db.query("reservations").collect();
    const occupiedByOthers = new Set<string>();
    allReservations.forEach((r) => {
      const isActive = r.status === "approved" || r.status === "rented";
      if (!isActive || r._id === args.reservationId) return;
      // 날짜 겹침 체크: 현재 예약과 날짜가 겹치는 예약만 충돌로 처리
      const overlaps =
        r.startDate < reservation.endDate &&
        r.endDate > reservation.startDate;
      if (!overlaps) return;
      r.items.forEach((item) => {
        item.assignedAssets?.forEach((id) => occupiedByOthers.add(id));
      });
    });

    // 배정 불가 상태 목록
    const UNAVAILABLE_STATUSES = [
      "maintenance",
      "broken",
      "lost",
      "repair",
      "retired",
    ];

    // 1. 선택된 자산들의 상태를 'rented'로 변경하고 이력 기록
    for (const assignment of args.assignments) {
      for (const assetId of assignment.assetIds) {
        const asset = await ctx.db.get(assetId);

        // 상태 불량 체크
        if (!asset || UNAVAILABLE_STATUSES.includes(asset.status)) {
          throw new Error(
            `장비(${asset?.managementCode || asset?.serialNumber})는 현재 사용 가능한 상태가 아닙니다.`,
          );
        }

        // 다른 활성 예약 중복 배정 체크
        if (occupiedByOthers.has(assetId)) {
          throw new Error(
            `장비(${asset.managementCode || asset.serialNumber})는 다른 예약에 이미 배정되어 있습니다.`,
          );
        }

        // 상태 업데이트
        await ctx.db.patch(assetId, {
          status: "rented",
          updatedAt: now,
        });

        // 이력 생성
        await ctx.db.insert("assetHistory", {
          assetId,
          equipmentName: asset?.equipmentName,
          serialNumber: asset?.serialNumber,
          reservationId: args.reservationId,
          userId: reservation.userId,
          userName,
          action: "rented",
          timestamp: now,
        });
      }
    }

    // 2. 예약 데이터(items)에 배정된 assetId들 저장
    const updatedItems = reservation.items.map((item) => {
      const assignment = args.assignments.find(
        (a) => a.equipmentId === item.equipmentId,
      );

      if (assignment) {
        return {
          ...item,
          assignedAssets: assignment.assetIds, // 배정된 시리얼 ID 목록 저장
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

// [반납 처리] 장비 상태 복구 및 상태 기록
export const returnAssets = mutation({
  args: {
    reservationId: v.id("reservations"),
    returns: v.array(
      v.object({
        assetId: v.id("assets"),
        condition: v.string(), // "normal", "damaged", "missing"
        notes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) throw new Error("Reservation not found");

    const now = Date.now();
    const user = await ctx.db.get(reservation.userId);
    const userName = user?.name || "Unknown";

    for (const ret of args.returns) {
      const asset = await ctx.db.get(ret.assetId);

      // 반납 상태에 따라 자산 상태 결정 (정상이면 available, 아니면 maintenance)
      const newStatus =
        ret.condition === "normal" ? "available" : "maintenance";

      // 1. 자산 상태 업데이트 (메모가 있으면 함께 저장)
      await ctx.db.patch(ret.assetId, {
        status: newStatus,
        note: ret.notes || undefined,
        updatedAt: now,
      });

      // 2. 반납 이력 기록
      await ctx.db.insert("assetHistory", {
        assetId: ret.assetId,
        equipmentName: asset?.equipmentName,
        serialNumber: asset?.serialNumber,
        reservationId: args.reservationId,
        userId: reservation.userId,
        userName,
        action: "returned",
        returnCondition: ret.condition,
        returnNotes: ret.notes,
        timestamp: now,
      });
    }

    return args.reservationId;
  },
});

// [배정 수정] 반출 전/후 장비 교체
export const updateAssignment = mutation({
  args: {
    reservationId: v.id("reservations"),
    equipmentId: v.id("equipment"),
    oldAssetIds: v.array(v.id("assets")), // 해제할 장비들
    newAssetIds: v.array(v.id("assets")), // 새로 배정할 장비들
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) throw new Error("Reservation not found");

    // 수량 초과 체크: 예약된 수량을 넘을 수 없음
    const targetItem = reservation.items.find(
      (item) => item.equipmentId === args.equipmentId,
    );
    if (targetItem && args.newAssetIds.length > targetItem.quantity) {
      throw new Error(
        `'${targetItem.name || "장비"}'의 배정 수량(${args.newAssetIds.length}개)이 예약 수량(${targetItem.quantity}개)을 초과합니다.`,
      );
    }

    // 날짜가 겹치는 다른 활성 예약에서 점유 중인 asset ID 수집
    const allReservations = await ctx.db.query("reservations").collect();
    const occupiedByOthers = new Set<string>();
    allReservations.forEach((r) => {
      const isActive = r.status === "approved" || r.status === "rented";
      if (!isActive || r._id === args.reservationId) return;
      const overlaps =
        r.startDate < reservation.endDate && r.endDate > reservation.startDate;
      if (!overlaps) return;
      r.items.forEach((item) => {
        item.assignedAssets?.forEach((id) => occupiedByOthers.add(id));
      });
    });

    const UNAVAILABLE_STATUSES = [
      "maintenance",
      "broken",
      "lost",
      "repair",
      "retired",
    ];

    const now = Date.now();
    const user = await ctx.db.get(reservation.userId);
    const userName = user?.name || "Unknown";

    // 1. 배정 해제 (Release): 기존 목록에만 있는 것들 -> Available로 복귀
    const toRelease = args.oldAssetIds.filter(
      (id) => !args.newAssetIds.includes(id),
    );

    for (const assetId of toRelease) {
      const asset = await ctx.db.get(assetId);
      await ctx.db.patch(assetId, {
        status: "available",
        updatedAt: now,
      });

      await ctx.db.insert("assetHistory", {
        assetId,
        equipmentName: asset?.equipmentName,
        serialNumber: asset?.serialNumber,
        reservationId: args.reservationId,
        userId: reservation.userId,
        userName,
        action: "unassigned", // "배정 취소" 이력
        timestamp: now,
      });
    }

    // 2. 신규 배정 (Occupy): 새 목록에만 있는 것들 -> Rented로 변경
    const toOccupy = args.newAssetIds.filter(
      (id) => !args.oldAssetIds.includes(id),
    );

    for (const assetId of toOccupy) {
      const asset = await ctx.db.get(assetId);

      // 상태 불량 체크
      if (!asset || UNAVAILABLE_STATUSES.includes(asset.status)) {
        throw new Error(
          `장비(${asset?.managementCode || asset?.serialNumber})는 현재 사용 가능한 상태가 아닙니다.`,
        );
      }

      // 날짜가 겹치는 다른 예약 중복 배정 체크
      if (occupiedByOthers.has(assetId)) {
        throw new Error(
          `장비(${asset.managementCode || asset.serialNumber})는 같은 날짜의 다른 예약에 이미 배정되어 있습니다.`,
        );
      }

      await ctx.db.patch(assetId, {
        status: "rented",
        updatedAt: now,
      });

      await ctx.db.insert("assetHistory", {
        assetId,
        equipmentName: asset?.equipmentName,
        serialNumber: asset?.serialNumber,
        reservationId: args.reservationId,
        userId: reservation.userId,
        userName,
        action: "rented", // "배정(교체)" 이력
        timestamp: now,
      });
    }

    // 3. 예약 정보 업데이트
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

// 특정 개별 장비(S/N)의 전체 이력 조회
export const getHistory = query({
  args: { assetId: v.id("assets") },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("assetHistory")
      .withIndex("by_assetId", (q) => q.eq("assetId", args.assetId))
      .collect();

    // 사용자 이름, 예약 번호 등을 조인해서 리턴
    const enrichedHistory = await Promise.all(
      history.map(async (h) => {
        const user = h.userId ? await ctx.db.get(h.userId) : null;
        const reservation = h.reservationId
          ? await ctx.db.get(h.reservationId)
          : null;

        return {
          ...h,
          userName: (user as { name?: string } | null)?.name || "Unknown",
          reservationNumber:
            (
              reservation as { reservationNumber?: string } | null
            )?.reservationNumber || "Unknown",
        };
      }),
    );

    // 최신순 정렬
    return enrichedHistory.sort((a, b) => b.timestamp - a.timestamp);
  },
});

// 특정 예약에 연결된 모든 장비 이력 조회
export const getHistoryByReservation = query({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("assetHistory")
      .withIndex("by_reservationId", (q) =>
        q.eq("reservationId", args.reservationId),
      )
      .collect();

    // 어떤 장비였는지 정보 조인
    const enrichedHistory = await Promise.all(
      history.map(async (h) => {
        const asset = await ctx.db.get(h.assetId);

        return {
          ...h,
          serialNumber: asset?.serialNumber || "Unknown",
          equipmentName: h.equipmentName || "Unknown", // 이력에 저장된 이름 우선 사용
        };
      }),
    );

    return enrichedHistory;
  },
});

// ===========================
// 5. 유틸리티 & 마이그레이션
// ===========================

// (관리자용) 기존 데이터에 장비명/카테고리명이 없는 경우 채워넣기
export const migrateNames = mutation({
  args: {},
  handler: async (ctx) => {
    const assets = await ctx.db.query("assets").collect();
    let updatedCount = 0;

    for (const asset of assets) {
      let needsUpdate = false;
      let equipmentName = asset.equipmentName;
      let categoryName = asset.categoryName;

      // 이름이 없으면 부모 테이블에서 찾아옴
      if (!equipmentName || !categoryName) {
        const equipment = await ctx.db.get(asset.equipmentId);
        if (equipment) {
          equipmentName = equipment.name;
          if (equipment.categoryId) {
            const category = await ctx.db.get(equipment.categoryId);
            categoryName = category?.name;
          }
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await ctx.db.patch(asset._id, {
          equipmentName,
          categoryName,
        });
        updatedCount++;
      }
    }

    return { updated: updatedCount, total: assets.length };
  },
});

// ===========================
// 6. 엑셀 가져오기: 일괄 upsert
// ===========================
export const bulkUpsertAssets = mutation({
  args: {
    items: v.array(
      v.object({
        id: v.optional(v.string()),           // 기존 asset _id (수정용)
        equipmentId: v.optional(v.string()),  // equipment _id
        equipmentName: v.optional(v.string()),
        serialNumber: v.optional(v.string()),
        managementCode: v.optional(v.string()),
        status: v.optional(v.string()),
        note: v.optional(v.string()),
      })
    ),
    fileName: v.optional(v.string()), // 엑셀 파일명 (변경 이력 기록용)
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const allEquipment = await ctx.db.query("equipment").collect();
    const now = Date.now();
    const batchId = `excel_import_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const affectedEquipmentIds = new Set<Id<"equipment">>();
    let created = 0, updated = 0, errors = 0;

    for (const item of args.items) {
      try {
        // equipment 조회 (ID 우선, 이름 fallback)
        let resolvedEquipmentId: Id<"equipment"> | null = null;
        if (item.equipmentId) {
          const eq = allEquipment.find((e) => e._id === item.equipmentId);
          if (eq) resolvedEquipmentId = eq._id;
        }
        if (!resolvedEquipmentId && item.equipmentName) {
          const eq = allEquipment.find((e) => e.name === item.equipmentName);
          if (eq) resolvedEquipmentId = eq._id;
        }

        if (item.id) {
          // 수정: ID로 직접 patch
          const assetId = item.id as Id<"assets">;
          const existing = await ctx.db.get(assetId);
          if (!existing) { errors++; continue; }
          const patch: Partial<{ serialNumber: string; managementCode: string; status: string; note: string; updatedAt: number }> = { updatedAt: now };
          if (item.serialNumber !== undefined) patch.serialNumber = item.serialNumber;
          if (item.managementCode !== undefined) patch.managementCode = item.managementCode;
          if (item.status !== undefined) patch.status = item.status;
          if (item.note !== undefined) patch.note = item.note;
          await ctx.db.patch(assetId, patch);
          if (existing.equipmentId) affectedEquipmentIds.add(existing.equipmentId);
          updated++;

          // 변경 이력 기록
          if (identity) {
            const changes = [];
            if (item.serialNumber !== undefined && existing.serialNumber !== item.serialNumber) {
              changes.push({ field: "serialNumber", fieldLabel: "시리얼번호", oldValue: existing.serialNumber, newValue: item.serialNumber });
            }
            if (item.managementCode !== undefined && existing.managementCode !== item.managementCode) {
              changes.push({ field: "managementCode", fieldLabel: "자산번호", oldValue: existing.managementCode, newValue: item.managementCode });
            }
            if (item.status !== undefined && existing.status !== item.status) {
              changes.push({ field: "status", fieldLabel: "상태", oldValue: existing.status, newValue: item.status });
            }
            if (item.note !== undefined && existing.note !== item.note) {
              changes.push({ field: "note", fieldLabel: "비고", oldValue: existing.note, newValue: item.note });
            }

            if (changes.length > 0) {
              await ctx.scheduler.runAfter(0, internal.changeHistory.recordChange, {
                userId: identity.subject,
                userName: identity.name || identity.email || "Unknown",
                userEmail: identity.email || "",
                targetType: "asset",
                targetId: assetId,
                targetName: `${existing.equipmentName} - ${existing.serialNumber}`,
                action: "update",
                changes,
                source: "excel_import",
                sourceDetail: args.fileName,
                batchId,
              });
            }
          }
        } else {
          // 신규: equipmentId 필수
          if (!resolvedEquipmentId) { errors++; continue; }
          const eq = allEquipment.find((e) => e._id === resolvedEquipmentId);
          const newAssetId = await ctx.db.insert("assets", {
            equipmentId: resolvedEquipmentId,
            equipmentName: eq?.name ?? item.equipmentName ?? "",
            serialNumber: item.serialNumber ?? "",
            managementCode: item.managementCode,
            status: item.status ?? "available",
            note: item.note,
            createdAt: now,
            updatedAt: now,
          });
          affectedEquipmentIds.add(resolvedEquipmentId);
          created++;

          // 변경 이력 기록
          if (identity) {
            await ctx.scheduler.runAfter(0, internal.changeHistory.recordChange, {
              userId: identity.subject,
              userName: identity.name || identity.email || "Unknown",
              userEmail: identity.email || "",
              targetType: "asset",
              targetId: newAssetId,
              targetName: `${eq?.name ?? item.equipmentName} - ${item.serialNumber}`,
              action: "create",
              changes: [
                { field: "equipmentName", fieldLabel: "장비명", newValue: eq?.name ?? item.equipmentName ?? "" },
                { field: "serialNumber", fieldLabel: "시리얼번호", newValue: item.serialNumber ?? "" },
                { field: "status", fieldLabel: "상태", newValue: item.status ?? "available" },
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

    // 자산 추가된 장비의 totalQuantity 자동 재계산
    for (const eqId of affectedEquipmentIds) {
      const assetCount = (
        await ctx.db
          .query("assets")
          .withIndex("by_equipmentId", (q) => q.eq("equipmentId", eqId))
          .collect()
      ).length;
      await ctx.db.patch(eqId, { totalQuantity: assetCount });
    }

    return { created, updated, errors };
  },
});
