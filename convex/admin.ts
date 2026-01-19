import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 1. [예약] 관리자용 전체 예약 목록 가져오기
export const getAllReservations = query({
  args: {},
  handler: async (ctx) => {
    const reservations = await ctx.db
      .query("reservations")
      .order("desc")
      .collect();

    // 유저 정보 조인이 필요하다면 여기서 Promise.all로 처리하거나
    // 프론트에서 보여줄 정보가 reservations에 다 들어있다면 그대로 리턴
    return reservations;
  },
});

// 2. [예약] 상태 변경 (승인, 반출, 반납 + 수리내역 자동 생성)
export const updateReservationStatus = mutation({
  args: {
    id: v.id("reservations"),
    status: v.string(),
    repairNote: v.optional(v.string()), // 반납 시 수리 메모가 있으면
  },
  handler: async (ctx, args) => {
    // 1. 상태 업데이트
    await ctx.db.patch(args.id, { status: args.status });

    // 2. 반납인데 수리 메모가 있다면 수리 내역 생성
    if (
      args.status === "returned" &&
      args.repairNote &&
      args.repairNote.trim() !== ""
    ) {
      await ctx.db.insert("repairs", {
        reservationId: args.id,
        content: args.repairNote,
        isFixed: false,
        adminMemo: "",
      });
    }
  },
});

// 3. [예약] 장비 목록 수정 (Edit Modal 저장용)
export const updateReservationItems = mutation({
  args: {
    id: v.id("reservations"),
    items: v.array(
      v.object({
        equipmentId: v.id("equipment"),
        name: v.string(),
        quantity: v.number(),
        checkedOut: v.boolean(),
        returned: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { items: args.items });
  },
});

// 4. [수리] 목록 가져오기 (예약 정보 Join)
export const getRepairs = query({
  args: {},
  handler: async (ctx) => {
    const repairs = await ctx.db.query("repairs").order("desc").collect();

    // 예약 정보(학생 이름, 예약 번호)를 같이 가져오기 위해 Join
    const repairsWithInfo = await Promise.all(
      repairs.map(async (repair) => {
        const reservation = await ctx.db.get(repair.reservationId);
        return {
          ...repair,
          leaderName: reservation?.leaderName || "알 수 없음",
          reservationNumber: reservation?.reservationNumber || "-",
        };
      })
    );

    return repairsWithInfo;
  },
});

// 5. [수리] 상태 토글 (수리완료 <-> 수리필요)
export const toggleRepairStatus = mutation({
  args: { id: v.id("repairs"), isFixed: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isFixed: args.isFixed });
  },
});

// 6. [수리] 관리자 메모 업데이트
export const updateRepairMemo = mutation({
  args: { id: v.id("repairs"), memo: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { adminMemo: args.memo });
  },
});

// 7. [수리] 기록 삭제
export const deleteRepair = mutation({
  args: { id: v.id("repairs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// 8. [캘린더] 장비 목록 가져오기 (sortOrder 정렬)
export const getEquipmentsForCalendar = query({
  args: {},
  handler: async (ctx) => {
    const equipment = await ctx.db.query("equipment").collect();

    // sortOrder 기준 정렬 (없으면 9999) -> 이름순
    return equipment.sort((a, b) => {
      const orderA = a.sortOrder ?? 9999;
      const orderB = b.sortOrder ?? 9999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.name.localeCompare(b.name);
    });
  },
});

// 9. [캘린더] 예약 목록 가져오기 (rejected, canceled 제외)
export const getReservationsForCalendar = query({
  args: {},
  handler: async (ctx) => {
    const reservations = await ctx.db
      .query("reservations")
      .collect();

    // rejected, canceled 제외
    return reservations.filter(
      (r) => r.status !== "rejected" && r.status !== "cancelled"
    );
  },
});

// 10. [재고조회] 장비 검색 (이름으로)
export const searchEquipment = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    if (!args.searchTerm || args.searchTerm.trim() === "") {
      return [];
    }

    const allEquipment = await ctx.db.query("equipment").collect();
    const searchLower = args.searchTerm.toLowerCase();

    return allEquipment
      .filter((eq) => eq.name.toLowerCase().includes(searchLower))
      .slice(0, 5); // 최대 5개만 반환
  },
});

// 11. [재고조회] 특정 기간 동안의 예약 가져오기
export const getReservationsForPeriod = query({
  args: {
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const reservations = await ctx.db.query("reservations").collect();

    // rejected, canceled 제외하고 기간이 겹치는 예약만 필터링
    return reservations.filter((r) => {
      if (r.status === "rejected" || r.status === "cancelled") {
        return false;
      }

      // 예약 기간과 조회 기간이 겹치는지 확인
      // 예약 시작일 <= 조회 종료일 AND 예약 종료일 >= 조회 시작일
      const resStart = r.startDate.split("T")[0];
      const resEnd = r.endDate.split("T")[0];

      return resStart <= args.endDate && resEnd >= args.startDate;
    });
  },
});
