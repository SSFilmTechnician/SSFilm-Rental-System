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

// 3. 예약 상세 정보 가져오기 (인쇄용)
export const getById = query({
  args: { id: v.id("reservations") },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.id);
    if (!reservation) return null;

    // equipment 정보를 조인해서 description, sortOrder, isGroupPrint 가져오기
    // 배정된 자산의 시리얼 번호도 가져오기
    const itemsWithDetails = await Promise.all(
      reservation.items.map(async (item) => {
        const equipment = await ctx.db.get(item.equipmentId);

        // 배정된 자산들의 시리얼 번호 가져오기
        let assignedSerialNumbers: string[] = [];
        if (item.assignedAssets && item.assignedAssets.length > 0) {
          const assets = await Promise.all(
            item.assignedAssets.map((assetId) => ctx.db.get(assetId))
          );
          assignedSerialNumbers = assets
            .filter((a) => a !== null)
            .map((a) => a!.serialNumber || "")
            .filter((s) => s !== "");
        }

        return {
          ...item,
          assignedSerialNumbers,
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
