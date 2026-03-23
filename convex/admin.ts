import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 1. [예약] 관리자용 전체 예약 목록 가져오기
export const getAllReservations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("reservations").order("desc").collect();
  },
});

// 4. [가용성 체크] 상세 현황 포함 (수정됨)
export const checkAvailability = query({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, args) => {
    const targetRes = await ctx.db.get(args.reservationId);
    if (!targetRes) return null;

    const targetStart = targetRes.startDate;
    const targetEnd = targetRes.endDate;

    const allReservations = await ctx.db.query("reservations").collect();

    // 겹치는 예약 찾기
    const overlappingReservations = allReservations.filter((r) => {
      const isActive = r.status === "approved" || r.status === "rented";
      if (!isActive) return false;
      if (r._id === targetRes._id) return false;
      return r.startDate < targetEnd && r.endDate > targetStart;
    });

    const occupiedAssetIds = new Set<string>();
    overlappingReservations.forEach((r) => {
      r.items.forEach((item) => {
        if (item.assignedAssets) {
          item.assignedAssets.forEach((id) => occupiedAssetIds.add(id));
        }
      });
    });

    const results = await Promise.all(
      targetRes.items.map(async (item) => {
        const allAssets = await ctx.db
          .query("assets")
          .withIndex("by_equipmentId", (q) =>
            q.eq("equipmentId", item.equipmentId),
          )
          .collect();

        // 배정 불가 상태 목록 (상태 필드 기준)
        const UNAVAILABLE_STATUSES = [
          "maintenance",
          "broken",
          "lost",
          "repair",
          "retired",
        ];

        // [상세 카운팅 로직]
        const totalCount = allAssets.length;

        // 상태 불량으로 대여 불가인 장비 수
        const brokenCount = allAssets.filter((a) =>
          UNAVAILABLE_STATUSES.includes(a.status),
        ).length;

        // 상태는 정상이지만 다른 예약이 선점하고 있는 장비 수
        const rentedCount = allAssets.filter(
          (a) =>
            !UNAVAILABLE_STATUSES.includes(a.status) &&
            occupiedAssetIds.has(a._id),
        ).length;

        // 실제 가용 수량 = 상태 정상 + 다른 예약 미선점
        const availableCount = allAssets.filter(
          (a) =>
            !UNAVAILABLE_STATUSES.includes(a.status) &&
            !occupiedAssetIds.has(a._id),
        ).length;

        return {
          equipmentId: item.equipmentId,
          name: item.name,
          requested: item.quantity,
          remaining: availableCount, // 현재 재고 (가용)
          total: totalCount, // 총 재고
          broken: brokenCount, // 수리중/고장
          rented: rentedCount, // 대여중 (타 예약 선점)
          isAvailable: availableCount >= item.quantity,
        };
      }),
    );

    const isFullyAvailable = results.every((r) => r.isAvailable);

    return {
      isFullyAvailable,
      details: results,
    };
  },
});

// 3. [반납] 장비 반납 및 수리 자동 등록 처리
export const processReturn = mutation({
  args: {
    reservationId: v.id("reservations"),
    returnItems: v.array(
      v.object({
        assetId: v.id("assets"),
        condition: v.string(),
        note: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) throw new Error("예약 정보를 찾을 수 없습니다.");

    for (const item of args.returnItems) {
      const asset = await ctx.db.get(item.assetId);
      if (!asset) continue;

      if (item.condition !== "normal") {
        const newStatus = item.condition === "lost" ? "lost" : "maintenance";
        await ctx.db.patch(item.assetId, {
          status: newStatus,
          note: item.note || "반납 시 문제 보고됨",
        });

        await ctx.db.insert("repairs", {
          reservationId: args.reservationId,
          equipmentId: asset.equipmentId,
          assetId: asset._id,
          equipmentName: asset.equipmentName,
          serialNumber: asset.serialNumber,
          studentName: reservation.leaderName,
          studentPhone: reservation.leaderPhone,

          stage: "damage_confirmed",
          damageType: item.condition === "lost" ? "lost" : "damaged",
          damageDescription: item.note || "반납 시 자동 등록된 건입니다.",
          damageConfirmedAt: now,

          isFixed: false,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await ctx.db.patch(item.assetId, {
          status: "available",
          note: "",
        });
      }

      await ctx.db.insert("assetHistory", {
        assetId: item.assetId,
        reservationId: args.reservationId,
        action: "returned",
        returnCondition: item.condition,
        returnNotes: item.note,
        timestamp: now,
      });
    }

    await ctx.db.patch(args.reservationId, { status: "returned" });
  },
});

// 4. [예약] 상태 변경
export const updateReservationStatus = mutation({
  args: {
    id: v.id("reservations"),
    status: v.string(),
    repairNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, status, repairNote } = args;
    const reservation = await ctx.db.get(id);
    if (!reservation) throw new Error("Reservation not found");

    if (["pending", "rejected", "cancelled"].includes(status)) {
      const resetItems = reservation.items.map((item) => ({
        ...item,
        assignedAssets: [],
      }));
      await ctx.db.patch(id, { status, items: resetItems });
      return;
    }

    if (status === "approved") {
      const allReservations = await ctx.db.query("reservations").collect();
      const overlappingReservations = allReservations.filter((r) => {
        const isActive = r.status === "approved" || r.status === "rented";
        return (
          isActive &&
          r._id !== id &&
          r.startDate < reservation.endDate &&
          r.endDate > reservation.startDate
        );
      });

      const newItems = await Promise.all(
        reservation.items.map(async (item) => {
          // ✅ 이미 수동으로 배정된 경우 자동 배정 건너뛰기
          if (
            item.assignedAssets &&
            item.assignedAssets.length === item.quantity
          ) {
            return item; // 기존 배정 유지
          }

          const allAssets = await ctx.db
            .query("assets")
            .withIndex("by_equipmentId", (q) =>
              q.eq("equipmentId", item.equipmentId),
            )
            .collect();

          const sortedAssets = allAssets.sort(() => Math.random() - 0.5);

          const occupiedAssetIds = new Set<string>();
          overlappingReservations.forEach((r) => {
            const rItem = r.items.find(
              (i) => i.equipmentId === item.equipmentId,
            );
            if (rItem && rItem.assignedAssets) {
              rItem.assignedAssets.forEach((assetId) =>
                occupiedAssetIds.add(assetId),
              );
            }
          });

          const UNAVAILABLE_STATUSES = [
            "maintenance",
            "broken",
            "lost",
            "repair",
            "retired",
          ];

          const availableAssets = sortedAssets.filter(
            (asset) =>
              !occupiedAssetIds.has(asset._id) &&
              !UNAVAILABLE_STATUSES.includes(asset.status),
          );

          if (availableAssets.length < item.quantity) {
            throw new Error(
              `[재고 부족] '${item.name}' 장비가 해당 기간에 부족합니다.`,
            );
          }

          const assignedAssets = availableAssets
            .slice(0, item.quantity)
            .map((a) => a._id);

          return {
            ...item,
            assignedAssets,
          };
        }),
      );

      await ctx.db.patch(id, { status: "approved", items: newItems });
      return;
    }

    // [반출 처리] rented 상태로 변경 전 재고 검증 (approved 케이스와 동일 로직)
    if (status === "rented") {
      const allReservations = await ctx.db.query("reservations").collect();

      // 기간이 겹치는 활성 예약에서 점유 중인 asset ID 수집
      const overlappingReservations = allReservations.filter((r) => {
        const isActive = r.status === "approved" || r.status === "rented";
        return (
          isActive &&
          r._id !== id &&
          r.startDate < reservation.endDate &&
          r.endDate > reservation.startDate
        );
      });

      const occupiedAssetIds = new Set<string>();
      overlappingReservations.forEach((r) => {
        r.items.forEach((item) => {
          item.assignedAssets?.forEach((assetId) =>
            occupiedAssetIds.add(assetId),
          );
        });
      });

      const UNAVAILABLE_STATUSES = [
        "maintenance",
        "broken",
        "lost",
        "repair",
        "retired",
      ];

      // 각 장비 item에 대해 가용 재고 체크
      for (const item of reservation.items) {
        const allAssets = await ctx.db
          .query("assets")
          .withIndex("by_equipmentId", (q) =>
            q.eq("equipmentId", item.equipmentId),
          )
          .collect();

        const availableCount = allAssets.filter(
          (a) =>
            !UNAVAILABLE_STATUSES.includes(a.status) &&
            !occupiedAssetIds.has(a._id),
        ).length;

        if (availableCount < item.quantity) {
          throw new Error(
            `[재고 부족] '${item.name}' 장비가 해당 기간에 부족합니다. 반출 처리할 수 없습니다.`,
          );
        }
      }

      await ctx.db.patch(id, { status: "rented" });
      return;
    }

    if (status === "returned") {
      await ctx.db.patch(id, { status });
      if (repairNote && repairNote.trim() !== "") {
        const now = Date.now();
        await ctx.db.insert("repairs", {
          reservationId: id,
          studentName: reservation.leaderName,
          studentPhone: reservation.leaderPhone,
          stage: "damage_confirmed",
          damageType: "damaged",
          damageDescription: repairNote,
          damageConfirmedAt: now,
          isFixed: false,
          createdAt: now,
          updatedAt: now,
        });
      }
      return;
    }

    await ctx.db.patch(id, { status });
  },
});

// 5. [수리] 목록 가져오기 (repairs 테이블 + assets 테이블의 수리중 장비 통합)
export const getRepairs = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const repairs = await ctx.db.query("repairs").order("desc").collect();

    let filtered = repairs;
    if (args.status === "in_progress") {
      filtered = repairs.filter((r) => r.stage !== "completed" && !r.isFixed);
    } else if (args.status === "completed") {
      filtered = repairs.filter((r) => r.stage === "completed" || r.isFixed);
    }

    const repairsWithDetails = await Promise.all(
      filtered.map(async (r) => {
        let reservationNumber = "-";
        let leaderName = r.studentName;

        if (r.reservationId) {
          const res = await ctx.db.get(r.reservationId);
          if (res) {
            reservationNumber = res.reservationNumber;
            leaderName = leaderName || res.leaderName;
          }
        }
        return { ...r, reservationNumber, leaderName };
      }),
    );

    // ✅ assets 테이블에서 수리중/점검중/파손/분실 상태인 장비도 포함
    const UNAVAILABLE_STATUSES = ["repair", "maintenance", "broken", "lost"];
    const allAssets = await ctx.db.query("assets").collect();
    const unavailableAssets = allAssets.filter((a) =>
      UNAVAILABLE_STATUSES.includes(a.status),
    );

    // repairs 테이블에 이미 등록된 assetId 수집 (중복 방지)
    const registeredAssetIds = new Set(
      repairsWithDetails
        .filter((r) => r.assetId)
        .map((r) => r.assetId as string),
    );

    // repairs 테이블에 없는 수리중 장비들을 가상 repair 레코드로 추가
    const virtualRepairs = unavailableAssets
      .filter((asset) => !registeredAssetIds.has(asset._id))
      .map((asset) => ({
        _id: `virtual_${asset._id}`,
        _creationTime: asset.createdAt || Date.now(),
        equipmentId: asset.equipmentId,
        assetId: asset._id,
        equipmentName: asset.equipmentName || "Unknown",
        serialNumber: asset.serialNumber || "번호없음",
        studentName: undefined,
        studentPhone: undefined,
        reservationId: undefined,
        stage: "damage_confirmed" as const,
        damageType: (asset.status === "lost" ? "lost" : "damaged") as "lost" | "damaged",
        damageDescription: asset.note || "장비 관리에서 상태 변경됨 (자동 생성)",
        damageConfirmedAt: asset.updatedAt || asset.createdAt || Date.now(),
        isFixed: false,
        createdAt: asset.createdAt || Date.now(),
        updatedAt: asset.updatedAt || Date.now(),
        reservationNumber: "-",
        leaderName: undefined,
        // 가상 레코드 표시용
        isVirtual: true,
        currentStatus: asset.status,
      }));

    // repairs 테이블 데이터 + 가상 레코드 통합
    const combined = [...repairsWithDetails, ...virtualRepairs];

    // 필터링 (in_progress일 때는 가상 레코드도 포함)
    if (args.status === "in_progress") {
      return combined.filter((r) => r.stage !== "completed" && !r.isFixed);
    } else if (args.status === "completed") {
      // 완료된 것만 (가상 레코드 제외)
      return combined.filter((r) => !(r as typeof virtualRepairs[0]).isVirtual && (r.stage === "completed" || r.isFixed));
    }

    return combined;
  },
});

// 6. [수리] 신규 등록 (수동)
export const createRepair = mutation({
  args: {
    equipmentId: v.optional(v.id("equipment")),
    assetId: v.optional(v.id("assets")),
    reservationId: v.optional(v.id("reservations")),
    equipmentName: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    studentName: v.optional(v.string()),
    studentPhone: v.optional(v.string()),
    damageType: v.string(),
    damageDescription: v.string(),
    expectedCompletionDate: v.optional(v.string()),
    adminMemo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("repairs", {
      ...args,
      stage: "damage_confirmed",
      damageConfirmedAt: now,
      isFixed: false,
      createdAt: now,
      updatedAt: now,
    });

    if (args.assetId) {
      await ctx.db.patch(args.assetId, {
        status: "maintenance",
        note: `수리중: ${args.damageDescription}`,
      });
    }
  },
});

// 7. [수리] 2단계: 청구 결정 (학생 부담 / 학과 처리)
export const updateRepairChargeDecision = mutation({
  args: {
    id: v.id("repairs"),
    chargeType: v.string(), // "student_charge" | "department_handle"
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.id, {
      chargeType: args.chargeType,
      chargeDecidedAt: now,
      stage: "charge_decided",
      updatedAt: now,
    });
    return { success: true };
  },
});

// 8. [수리] 3단계: 수리 견적 요청 (견적서 메모)
export const updateRepairEstimate = mutation({
  args: {
    id: v.id("repairs"),
    estimateMemo: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.id, {
      estimateMemo: args.estimateMemo,
      estimateRequestedAt: now,
      stage: "estimate_requested",
      updatedAt: now,
    });
    return { success: true };
  },
});

// 9. [수리] 4단계: 금액 설정 + 입금 확인
export const updateRepairPaymentConfirmed = mutation({
  args: {
    id: v.id("repairs"),
    finalAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.id, {
      finalAmount: args.finalAmount,
      paymentConfirmedAt: now,
      stage: "payment_confirmed",
      updatedAt: now,
    });
    return { success: true };
  },
});

// 10. [수리] 5단계: 수리 완료
export const completeRepair = mutation({
  args: {
    id: v.id("repairs"),
    repairResult: v.string(),
    adminMemo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const repair = await ctx.db.get(args.id);
    if (!repair) throw new Error("Repair not found");

    await ctx.db.patch(args.id, {
      repairResult: args.repairResult,
      adminMemo: args.adminMemo,
      completedAt: now,
      stage: "completed",
      isFixed: true,
      updatedAt: now,
    });

    if (repair.assetId) {
      const newStatus =
        args.repairResult === "repaired" ? "available" : "broken";
      const newNote =
        args.repairResult === "repaired"
          ? ""
          : `폐기/교체됨 (${new Date().toLocaleDateString()})`;
      await ctx.db.patch(repair.assetId, { status: newStatus, note: newNote });
    }
    return { success: true };
  },
});

// 11. [수리] 단계 되돌리기
export const revertRepairStage = mutation({
  args: { id: v.id("repairs"), targetStage: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.id, {
      stage: args.targetStage,
      updatedAt: now,
    });
    return { success: true };
  },
});

export const deleteRepair = mutation({
  args: { id: v.id("repairs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const updateRepairMemo = mutation({
  args: { id: v.id("repairs"), memo: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { adminMemo: args.memo });
  },
});

// 기타 유틸리티
export const updateReservationItems = mutation({
  args: { id: v.id("reservations"), items: v.array(v.any()) },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.id);
    if (!reservation) throw new Error("Reservation not found");

    // 날짜가 겹치는 다른 활성 예약에서 장비별 신청 수량 집계
    const allReservations = await ctx.db.query("reservations").collect();
    const occupiedQuantity: Record<string, number> = {};
    allReservations.forEach((r) => {
      const isActive = r.status === "approved" || r.status === "rented";
      if (!isActive || r._id === args.id) return;
      const overlaps =
        r.startDate < reservation.endDate && r.endDate > reservation.startDate;
      if (!overlaps) return;
      r.items.forEach((item) => {
        const eqId = item.equipmentId as string;
        occupiedQuantity[eqId] = (occupiedQuantity[eqId] || 0) + item.quantity;
      });
    });

    // 각 장비별 가용 수량 검증
    for (const item of args.items) {
      const equipment = await ctx.db.get(item.equipmentId);
      if (!equipment) continue;
      const occupied = occupiedQuantity[item.equipmentId as string] || 0;
      const available = (equipment as { totalQuantity: number }).totalQuantity - occupied;
      if (item.quantity > available) {
        throw new Error(
          `'${item.name || (equipment as { name: string }).name}' 장비의 신청 수량(${item.quantity}개)이 해당 날짜의 가용 재고(${available}개)를 초과합니다.`,
        );
      }
    }

    // ✅ 기존 assignedAssets, checkedOut, returned 보존하면서 items 업데이트
    const updatedItems = args.items.map((newItem) => {
      // 기존 예약에서 같은 equipmentId를 가진 항목 찾기
      const existingItem = reservation.items.find(
        (oldItem) => String(oldItem.equipmentId) === String(newItem.equipmentId)
      );

      // 기존 항목이 있으면 배정 정보 및 상태 보존, 없으면 초기값
      const itemWithStates = newItem as typeof newItem & {
        checkedOut?: boolean;
        returned?: boolean;
      };

      return {
        ...newItem,
        assignedAssets: existingItem?.assignedAssets || [],
        checkedOut: existingItem?.checkedOut ?? itemWithStates.checkedOut ?? false,
        returned: existingItem?.returned ?? itemWithStates.returned ?? false,
      };
    });

    await ctx.db.patch(args.id, { items: updatedItems });
  },
});

export const getEquipmentsForCalendar = query({
  args: {},
  handler: async (ctx) => {
    const equipment = await ctx.db.query("equipment").collect();
    return equipment.sort((a, b) => {
      const orderA = a.sortOrder ?? 9999;
      const orderB = b.sortOrder ?? 9999;
      return orderA !== orderB ? orderA - orderB : a.name.localeCompare(b.name);
    });
  },
});

export const getReservationsForCalendar = query({
  args: {},
  handler: async (ctx) => {
    const reservations = await ctx.db.query("reservations").collect();
    return reservations.filter(
      (r) => !["cancelled", "rejected"].includes(r.status),
    );
  },
});

export const searchEquipment = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    if (!args.searchTerm) return [];
    const allEquipment = await ctx.db.query("equipment").collect();
    return allEquipment
      .filter((eq) =>
        eq.name.toLowerCase().includes(args.searchTerm.toLowerCase()),
      )
      .slice(0, 5);
  },
});

export const getReservationsForPeriod = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    const reservations = await ctx.db.query("reservations").collect();
    return reservations.filter((r) => {
      if (["cancelled", "rejected"].includes(r.status)) return false;
      return r.startDate <= args.endDate && r.endDate >= args.startDate;
    });
  },
});

export const getConflictingReservations = query({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, args) => {
    const targetRes = await ctx.db.get(args.reservationId);
    if (!targetRes) return [];
    const allReservations = await ctx.db.query("reservations").collect();
    const overlapping = allReservations.filter((r) => {
      const isActive = r.status === "approved" || r.status === "rented";
      if (!isActive || r._id === targetRes._id) return false;
      return r.startDate < targetRes.endDate && r.endDate > targetRes.startDate;
    });
    const targetEquipmentIds = new Set(
      targetRes.items.map((i) => i.equipmentId),
    );
    return overlapping
      .map((r) => {
        const conflictingItems = r.items.filter((item) =>
          targetEquipmentIds.has(item.equipmentId),
        );
        if (conflictingItems.length === 0) return null;
        return {
          reservationId: r._id,
          reservationNumber: r.reservationNumber,
          leaderName: r.leaderName,
          startDate: r.startDate,
          endDate: r.endDate,
          status: r.status,
          conflictingItems: conflictingItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
          })),
        };
      })
      .filter((c) => c !== null);
  },
});
