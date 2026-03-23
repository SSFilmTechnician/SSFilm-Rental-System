import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 공간 예약 생성
export const createSpaceReservation = mutation({
  args: {
    userId: v.string(),
    userName: v.string(),
    userStudentId: v.string(),
    userEmail: v.string(),
    spaceId: v.id("spaces"),
    date: v.string(),
    startHour: v.number(),
    endHour: v.number(),
    purpose: v.string(),
    purposeDetail: v.string(),
    companions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. 날짜가 2주 이내인지 확인
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reservationDate = new Date(args.date);
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

    if (reservationDate > twoWeeksLater) {
      throw new Error("2주 이내의 날짜만 예약 가능합니다.");
    }

    // 2. 과거 및 당일 예약 차단 (사용일 하루 전 17시 마감)
    if (reservationDate.getTime() <= today.getTime()) {
      throw new Error("당일 및 과거 날짜는 예약할 수 없습니다. 사용일 하루 전 17시까지 예약해주세요.");
    }

    // 3. 내일 예약은 오늘 17시 마감
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const now = new Date();
    const currentHour = now.getHours();

    if (
      reservationDate.getTime() === tomorrow.getTime() &&
      currentHour >= 17
    ) {
      throw new Error("내일 예약은 오늘 오후 5시까지만 가능합니다.");
    }

    // 4. 시간이 연속인지 확인
    const hours = [];
    for (let i = args.startHour; i < args.endHour; i++) {
      hours.push(i);
    }
    if (hours.length === 0) {
      throw new Error("시작 시간과 종료 시간을 확인해주세요.");
    }

    // 5. 6시간 이하인지 확인
    const duration = args.endHour - args.startHour;
    if (duration > 6) {
      throw new Error("최대 6시간까지만 예약 가능합니다.");
    }

    // 6. 해당 시간대에 이미 예약(confirmed 또는 pending)이 없는지 확인
    const existingReservations = await ctx.db
      .query("spaceReservations")
      .withIndex("by_space_date", (q) =>
        q.eq("spaceId", args.spaceId).eq("date", args.date)
      )
      .filter((q) =>
        q.or(q.eq(q.field("status"), "confirmed"), q.eq(q.field("status"), "pending"))
      )
      .collect();

    for (const existing of existingReservations) {
      // 시간대 겹침 확인
      if (
        !(
          args.endHour <= existing.startHour ||
          args.startHour >= existing.endHour
        )
      ) {
        throw new Error(
          `해당 시간대(${existing.startHour}~${existing.endHour}시)는 이미 예약되었습니다.`
        );
      }
    }

    // 7. 같은 날 같은 공간에 해당 유저의 예약이 없는지 (1인 1예약)
    const userReservation = await ctx.db
      .query("spaceReservations")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("spaceId"), args.spaceId),
          q.or(
            q.eq(q.field("status"), "confirmed"),
            q.eq(q.field("status"), "pending")
          )
        )
      )
      .first();

    if (userReservation) {
      throw new Error("같은 날 같은 공간에 이미 예약이 있습니다.");
    }

    // 8. 패널티로 차단되지 않았는지 확인
    const penalty = await ctx.db
      .query("spacePenalties")
      .withIndex("by_user_space", (q) =>
        q.eq("userId", args.userId).eq("spaceId", args.spaceId)
      )
      .first();

    if (penalty && penalty.blockedUntil) {
      const now = Date.now();
      if (now < penalty.blockedUntil) {
        const unblockDate = new Date(penalty.blockedUntil).toLocaleDateString(
          "ko-KR"
        );
        throw new Error(
          `패널티로 인해 ${unblockDate}까지 해당 공간 이용이 제한됩니다.`
        );
      }
    }

    // 9. 공간 정보 조회 (승인 필요 여부 확인)
    const space = await ctx.db.get(args.spaceId);
    if (!space) {
      throw new Error("존재하지 않는 공간입니다.");
    }

    // 10. 예약 생성
    const status = space.requiresApproval ? "pending" : "confirmed";
    const reservationId = await ctx.db.insert("spaceReservations", {
      ...args,
      companions: args.companions || "",
      status,
      createdAt: Date.now(),
    });

    // 11. 믹싱룸/ADR룸이면 관리자에게 알림 발송
    if (space.requiresApproval) {
      // mixing_manager 역할 사용자들 조회
      const managers = await ctx.db
        .query("userRoles")
        .withIndex("by_role", (q) => q.eq("role", "mixing_manager"))
        .collect();

      const admins = await ctx.db
        .query("userRoles")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .collect();

      const managerUserIds = [
        ...managers.map((m) => m.userId),
        ...admins.map((a) => a.userId),
      ];

      // userId를 사용하여 users 테이블에서 실제 _id 조회
      for (const clerkUserId of managerUserIds) {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkUserId))
          .first();

        if (user) {
          await ctx.db.insert("notifications", {
            userId: user._id,
            type: "approval_request",
            title: "새 믹싱룸 예약 신청",
            message: `${args.userName}님이 ${args.date} ${args.startHour}~${args.endHour}시 믹싱룸/ADR룸 예약을 신청했습니다.`,
            relatedSpaceReservationId: reservationId,
            read: false,
          });
        }
      }
    }

    return { success: true, reservationId, status };
  },
});

// 특정 날짜의 공간 예약 조회 (공간별 그룹화)
export const getSpaceReservationsByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const reservations = await ctx.db
      .query("spaceReservations")
      .withIndex("by_date", (q) => q.eq("date", date))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "rejected")
        )
      )
      .collect();

    // 공간 정보와 함께 반환
    const spaces = await ctx.db.query("spaces").collect();

    return spaces
      .sort((a, b) => a.order - b.order)
      .map((space) => ({
        space,
        reservations: reservations.filter((r) => r.spaceId === space._id),
      }));
  },
});

// 특정 공간+날짜의 예약 목록 조회 (시간대 차단용)
export const getReservationsBySpaceAndDate = query({
  args: { spaceId: v.id("spaces"), date: v.string() },
  handler: async (ctx, { spaceId, date }) => {
    return await ctx.db
      .query("spaceReservations")
      .withIndex("by_space_date", (q) => q.eq("spaceId", spaceId).eq("date", date))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "confirmed"), q.eq(q.field("status"), "pending"))
      )
      .collect();
  },
});

// 사용자의 특정 공간+날짜 예약 확인 (1인 1예약 체크용)
export const getUserReservationForSpaceAndDate = query({
  args: { userId: v.string(), spaceId: v.id("spaces"), date: v.string() },
  handler: async (ctx, { userId, spaceId, date }) => {
    return await ctx.db
      .query("spaceReservations")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .filter((q) =>
        q.and(
          q.eq(q.field("spaceId"), spaceId),
          q.or(
            q.eq(q.field("status"), "confirmed"),
            q.eq(q.field("status"), "pending")
          )
        )
      )
      .first();
  },
});

// 사용자의 모든 예약 조회
export const getMyReservations = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const reservations = await ctx.db
      .query("spaceReservations")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // 공간 정보와 함께 반환
    const reservationsWithSpace = await Promise.all(
      reservations.map(async (reservation) => {
        const space = await ctx.db.get(reservation.spaceId);
        return { ...reservation, space };
      })
    );

    return reservationsWithSpace;
  },
});

// 사용자의 예정된 예약만 조회
export const getMyUpcomingReservations = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split("T")[0];

    const reservations = await ctx.db
      .query("spaceReservations")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), todayString),
          q.or(
            q.eq(q.field("status"), "confirmed"),
            q.eq(q.field("status"), "pending")
          )
        )
      )
      .order("desc")
      .collect();

    // 공간 정보와 함께 반환
    const reservationsWithSpace = await Promise.all(
      reservations.map(async (reservation) => {
        const space = await ctx.db.get(reservation.spaceId);
        return { ...reservation, space };
      })
    );

    return reservationsWithSpace;
  },
});

// 예약 취소 (본인만 가능)
export const cancelMyReservation = mutation({
  args: { reservationId: v.id("spaceReservations"), userId: v.string() },
  handler: async (ctx, { reservationId, userId }) => {
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) {
      throw new Error("예약을 찾을 수 없습니다.");
    }

    if (reservation.userId !== userId) {
      throw new Error("본인의 예약만 취소할 수 있습니다.");
    }

    if (
      reservation.status !== "confirmed" &&
      reservation.status !== "pending"
    ) {
      throw new Error("취소할 수 없는 예약입니다.");
    }

    // 이미 지난 시간인지 확인
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reservationDate = new Date(reservation.date);
    if (reservationDate < today) {
      throw new Error("이미 지난 예약은 취소할 수 없습니다.");
    }

    await ctx.db.patch(reservationId, { status: "cancelled" });

    return { success: true };
  },
});
