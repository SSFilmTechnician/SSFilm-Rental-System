import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 1. 예약 생성
export const create = mutation({
  args: {
    items: v.array(
      v.object({
        equipmentId: v.id("equipment"),
        quantity: v.number(),
        name: v.string(),
      })
    ),
    purpose: v.string(),
    purposeDetail: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("로그인이 필요합니다.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("유저 정보를 찾을 수 없습니다.");
    }

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    const reservationNumber = `${today}-${random}`;

    return await ctx.db.insert("reservations", {
      userId: user._id,
      reservationNumber,
      status: "pending",
      purpose: args.purpose,
      purposeDetail: args.purposeDetail,
      startDate: args.startDate,
      endDate: args.endDate,
      leaderName: user.name,
      leaderPhone: user.phone || "",
      leaderStudentId: user.studentId || "",

      // ✅ [여기가 수정됨] items 배열 안에 name도 같이 저장하도록 변경!
      items: args.items.map((item) => ({
        equipmentId: item.equipmentId,
        quantity: item.quantity,
        name: item.name, // 👈 이걸 추가해서 마이페이지 에러 해결
        checkedOut: false,
        returned: false,
      })),
    });
  },
});

// 2. 내 예약 내역 가져오기
export const getMyReservations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    const reservations = await ctx.db
      .query("reservations")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    // 최신순 정렬
    return reservations.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// 3. [재고조회] 특정 장비의 날짜 범위 내 예약 데이터 조회 (학생용 캘린더)
export const getEquipmentCalendarData = query({
  args: {
    equipmentId: v.id("equipment"),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(),   // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const equipment = await ctx.db.get(args.equipmentId);
    if (!equipment) return null;

    const allReservations = await ctx.db.query("reservations").collect();

    // 재고를 실제로 점유하는 상태: 대기/승인/대여중
    const OCCUPYING_STATUSES = ["pending", "approved", "rented"];

    const relevant = allReservations.filter((r) => {
      // 재고 점유 상태가 아니면 제외 (반납완료, 취소, 반려 등)
      if (!OCCUPYING_STATUSES.includes(r.status)) return false;
      // DB 날짜는 "YYYY-MM-DD HH:MM" 형식으로 저장되므로 앞 10자리(날짜)만 비교
      const rStart = r.startDate.substring(0, 10);
      const rEnd = r.endDate.substring(0, 10);
      // 날짜 범위 겹침 확인 (rStart <= args.endDate AND rEnd >= args.startDate)
      if (rStart > args.endDate || rEnd < args.startDate) return false;
      // 해당 장비가 포함된 예약인지 확인
      return r.items.some((item) => String(item.equipmentId) === String(args.equipmentId));
    });

    return {
      totalQuantity: equipment.totalQuantity,
      reservations: relevant.map((r) => {
        const item = r.items.find((i) => String(i.equipmentId) === String(args.equipmentId))!;
        return {
          leaderName: r.leaderName,
          purposeDetail: r.purposeDetail,
          startDate: r.startDate,
          endDate: r.endDate,
          quantity: item.quantity,
          status: r.status,
        };
      }),
    };
  },
});

// 4. 예약 상세 정보 가져오기 (인쇄용)
export const getById = query({
  args: { id: v.id("reservations") },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.id);
    if (!reservation) return null;

    // equipment 정보를 조인해서 description, sortOrder, isGroupPrint 가져오기
    // 배정된 자산의 관리코드(managementCode)도 가져오기
    const itemsWithDetails = await Promise.all(
      reservation.items.map(async (item) => {
        const equipment = await ctx.db.get(item.equipmentId);

        // 배정된 자산들의 관리코드 가져오기 (없으면 시리얼번호 사용)
        let assignedManagementCodes: string[] = [];
        if (item.assignedAssets && item.assignedAssets.length > 0) {
          const assets = await Promise.all(
            item.assignedAssets.map((assetId) => ctx.db.get(assetId))
          );
          assignedManagementCodes = assets
            .filter((a) => a !== null)
            .map((a) => a!.managementCode || a!.serialNumber || "")
            .filter((s) => s !== "");
        }

        return {
          ...item,
          assignedManagementCodes,
          equipment: equipment
            ? {
                name: equipment.name,
                description: equipment.description || "",
                sortOrder: equipment.sortOrder || 999,
                isGroupPrint: equipment.isGroupPrint || false,
              }
            : null,
        };
      })
    );

    return {
      ...reservation,
      items: itemsWithDetails,
    };
  },
});
