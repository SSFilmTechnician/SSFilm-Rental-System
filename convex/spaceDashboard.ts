import { query } from "./_generated/server";
import { v } from "convex/values";

// 오늘의 요약 통계
export const getDashboardSummary = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    // 공간 예약 통계
    const spaceReservations = await ctx.db
      .query("spaceReservations")
      .withIndex("by_date", (q) => q.eq("date", date))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "cancelled"),
          q.neq(q.field("status"), "rejected")
        )
      )
      .collect();

    const spacePendingCount = spaceReservations.filter(
      (r) => r.status === "pending"
    ).length;

    // 장비 예약 통계 (기존 SSFilm)
    const equipmentReservations = await ctx.db
      .query("reservations")
      .withIndex("by_date", (q) => q.eq("startDate", date))
      .collect();

    const equipmentActiveCount = equipmentReservations.filter(
      (r) => r.status === "rented"
    ).length;

    // 활성 사용자 (공간 + 장비)
    const spaceUserIds = new Set(spaceReservations.map((r) => r.userId));
    const equipmentUserIds = new Set(
      equipmentReservations.map((r) => r.userId.toString())
    );
    const allUserIds = new Set([...spaceUserIds, ...equipmentUserIds]);

    return {
      spaceReservationsCount: spaceReservations.length,
      spacePendingCount,
      equipmentReservationsCount: equipmentReservations.length,
      equipmentActiveCount,
      activeUsersCount: allUserIds.size,
    };
  },
});

// 7개 공간의 24시간 타임라인 데이터
export const getSpaceTimeline = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const spaces = await ctx.db.query("spaces").collect();
    const sortedSpaces = spaces.sort((a, b) => a.order - b.order);

    const timeline = await Promise.all(
      sortedSpaces.map(async (space) => {
        const reservations = await ctx.db
          .query("spaceReservations")
          .withIndex("by_space_date", (q) =>
            q.eq("spaceId", space._id).eq("date", date)
          )
          .filter((q) =>
            q.and(
              q.neq(q.field("status"), "cancelled"),
              q.neq(q.field("status"), "rejected")
            )
          )
          .collect();

        return {
          space,
          reservations,
        };
      })
    );

    return timeline;
  },
});

// 장비 대여 현황 요약 (기존 SSFilm 테이블에서)
export const getEquipmentSummary = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    // 오늘 대여 중인 장비 (rented 상태)
    const rentedReservations = await ctx.db
      .query("reservations")
      .withIndex("by_date", (q) => q.eq("startDate", date))
      .filter((q) => q.eq(q.field("status"), "rented"))
      .collect();

    // 오늘 반납 예정 장비 (endDate가 오늘)
    const returnDueReservations = await ctx.db
      .query("reservations")
      .collect()
      .then((reservations) =>
        reservations.filter(
          (r) => r.endDate === date && r.status === "rented"
        )
      );

    return {
      rentedCount: rentedReservations.length,
      returnDueCount: returnDueReservations.length,
      rentedReservations,
      returnDueReservations,
    };
  },
});

// 주간 공간 예약 요약
export const getWeeklyOverview = query({
  args: { weekStart: v.string() },
  handler: async (ctx, { weekStart }) => {
    // weekStart부터 7일간의 데이터
    const weekStartDate = new Date(weekStart);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split("T")[0]);
    }

    const spaces = await ctx.db.query("spaces").collect();
    const sortedSpaces = spaces.sort((a, b) => a.order - b.order);

    const overview = await Promise.all(
      sortedSpaces.map(async (space) => {
        const dailyData = await Promise.all(
          dates.map(async (date) => {
            const reservations = await ctx.db
              .query("spaceReservations")
              .withIndex("by_space_date", (q) =>
                q.eq("spaceId", space._id).eq("date", date)
              )
              .filter((q) =>
                q.and(
                  q.neq(q.field("status"), "cancelled"),
                  q.neq(q.field("status"), "rejected")
                )
              )
              .collect();

            return {
              date,
              count: reservations.length,
            };
          })
        );

        return {
          space,
          dailyData,
        };
      })
    );

    return overview;
  },
});

// 최근 활동 로그 (최근 20건)
export const getRecentActivity = query({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    // 공간 예약 활동
    const spaceReservations = await ctx.db
      .query("spaceReservations")
      .order("desc")
      .take(limit);

    const activities = await Promise.all(
      spaceReservations.map(async (reservation) => {
        const space = await ctx.db.get(reservation.spaceId);
        return {
          type: "space_reservation",
          timestamp: reservation.createdAt,
          user: reservation.userName,
          action: `${space?.name} 예약 (${reservation.date} ${reservation.startHour}~${reservation.endHour}시)`,
          status: reservation.status,
        };
      })
    );

    // 패널티 활동
    const penalties = await ctx.db.query("spacePenalties").order("desc").take(limit);

    const penaltyActivities = await Promise.all(
      penalties.map(async (penalty) => {
        const space = await ctx.db.get(penalty.spaceId);
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", penalty.userId))
          .first();
        return {
          type: "penalty",
          timestamp: penalty.createdAt,
          user: user?.name || "알 수 없음",
          action: `${space?.name} 패널티 부여 (${penalty.count}회)`,
          status: "completed",
        };
      })
    );

    // 모든 활동 합치고 시간순 정렬
    const allActivities = [...activities, ...penaltyActivities].sort(
      (a, b) => b.timestamp - a.timestamp
    );

    return allActivities.slice(0, limit);
  },
});
