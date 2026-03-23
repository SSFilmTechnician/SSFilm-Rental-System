import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ===== 승인 관리 =====

// 승인 대기 목록 조회
export const getPendingReservations = query({
  args: {},
  handler: async (ctx) => {
    const reservations = await ctx.db
      .query("spaceReservations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
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

// 처리 완료 목록 조회
export const getProcessedReservations = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const reservations = await ctx.db
      .query("spaceReservations")
      .order("desc")
      .collect();

    // confirmed와 rejected 모두 조회
    const processedReservations = reservations.filter(
      (r) => r.status === "confirmed" || r.status === "rejected"
    );

    const limited = limit
      ? processedReservations.slice(0, limit)
      : processedReservations;

    // 공간 정보와 함께 반환
    const reservationsWithSpace = await Promise.all(
      limited.map(async (reservation) => {
        const space = await ctx.db.get(reservation.spaceId);
        return { ...reservation, space };
      })
    );

    return reservationsWithSpace;
  },
});

// 예약 승인
export const approveReservation = mutation({
  args: { reservationId: v.id("spaceReservations") },
  handler: async (ctx, { reservationId }) => {
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) {
      throw new Error("예약을 찾을 수 없습니다.");
    }

    if (reservation.status !== "pending") {
      throw new Error("승인 대기 중인 예약만 승인할 수 있습니다.");
    }

    // 상태 변경
    await ctx.db.patch(reservationId, { status: "confirmed" });

    // 예약자에게 알림 발송
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", reservation.userId))
      .first();

    if (user) {
      await ctx.db.insert("notifications", {
        userId: user._id,
        type: "approved",
        title: "예약이 승인되었습니다",
        message: `${reservation.date} ${reservation.startHour}~${reservation.endHour}시 믹싱룸/ADR룸 예약이 승인되었습니다.`,
        relatedSpaceReservationId: reservationId,
        read: false,
      });
    }

    return { success: true };
  },
});

// 예약 거절
export const rejectReservation = mutation({
  args: { reservationId: v.id("spaceReservations"), reason: v.string() },
  handler: async (ctx, { reservationId, reason }) => {
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) {
      throw new Error("예약을 찾을 수 없습니다.");
    }

    if (reservation.status !== "pending") {
      throw new Error("승인 대기 중인 예약만 거절할 수 있습니다.");
    }

    // 상태 변경
    await ctx.db.patch(reservationId, {
      status: "rejected",
      rejectionReason: reason,
    });

    // 예약자에게 알림 발송
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", reservation.userId))
      .first();

    if (user) {
      await ctx.db.insert("notifications", {
        userId: user._id,
        type: "rejected",
        title: "예약이 거절되었습니다",
        message: `${reservation.date} ${reservation.startHour}~${reservation.endHour}시 믹싱룸/ADR룸 예약이 거절되었습니다. 사유: ${reason}`,
        relatedSpaceReservationId: reservationId,
        read: false,
      });
    }

    return { success: true };
  },
});

// 예약 취소 (관리자용 강제 취소)
export const cancelReservation = mutation({
  args: { reservationId: v.id("spaceReservations") },
  handler: async (ctx, { reservationId }) => {
    const reservation = await ctx.db.get(reservationId);
    if (!reservation) {
      throw new Error("예약을 찾을 수 없습니다.");
    }

    await ctx.db.patch(reservationId, { status: "cancelled" });

    return { success: true };
  },
});

// ===== 예약 관리 =====

// 전체 예약 조회 (필터링 가능)
export const getAllReservations = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    spaceId: v.optional(v.id("spaces")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { startDate, endDate, spaceId, status }) => {
    let reservations = await ctx.db.query("spaceReservations").order("desc").collect();

    // 필터링
    if (startDate) {
      reservations = reservations.filter((r) => r.date >= startDate);
    }
    if (endDate) {
      reservations = reservations.filter((r) => r.date <= endDate);
    }
    if (spaceId) {
      reservations = reservations.filter((r) => r.spaceId === spaceId);
    }
    if (status) {
      reservations = reservations.filter((r) => r.status === status);
    }

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

// ===== 패널티 관리 =====

// 패널티 부여
export const addPenalty = mutation({
  args: {
    userId: v.string(),
    spaceId: v.id("spaces"),
    reason: v.string(),
  },
  handler: async (ctx, { userId, spaceId, reason }) => {
    // 기존 패널티 조회
    const existingPenalty = await ctx.db
      .query("spacePenalties")
      .withIndex("by_user_space", (q) =>
        q.eq("userId", userId).eq("spaceId", spaceId)
      )
      .first();

    if (existingPenalty) {
      // 누적 횟수 증가
      const newCount = existingPenalty.count + 1;
      let blockedUntil = existingPenalty.blockedUntil;

      // 3회 도달 시 일주일 차단
      if (newCount >= 3) {
        const oneWeekLater = Date.now() + 7 * 24 * 60 * 60 * 1000;
        blockedUntil = oneWeekLater;
      }

      await ctx.db.patch(existingPenalty._id, {
        count: newCount,
        blockedUntil,
        reason: `${existingPenalty.reason}; ${reason}`,
      });

      // 사용자에게 알림 발송
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", userId))
        .first();

      if (user) {
        const space = await ctx.db.get(spaceId);
        const message =
          newCount >= 3
            ? `${space?.name} 패널티 ${newCount}회 누적. 7일간 해당 공간 이용이 제한됩니다.`
            : `${space?.name} 패널티 ${newCount}회 누적.`;

        await ctx.db.insert("notifications", {
          userId: user._id,
          type: "penalty",
          title: "패널티가 부여되었습니다",
          message,
          read: false,
        });
      }

      return { success: true, count: newCount, blocked: newCount >= 3 };
    } else {
      // 새 패널티 생성
      await ctx.db.insert("spacePenalties", {
        userId,
        spaceId,
        reason,
        count: 1,
        createdAt: Date.now(),
      });

      // 사용자에게 알림 발송
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", userId))
        .first();

      if (user) {
        const space = await ctx.db.get(spaceId);
        await ctx.db.insert("notifications", {
          userId: user._id,
          type: "penalty",
          title: "패널티가 부여되었습니다",
          message: `${space?.name} 패널티 1회 누적.`,
          read: false,
        });
      }

      return { success: true, count: 1, blocked: false };
    }
  },
});

// 패널티 초기화
export const removePenalty = mutation({
  args: { userId: v.string(), spaceId: v.id("spaces") },
  handler: async (ctx, { userId, spaceId }) => {
    const penalty = await ctx.db
      .query("spacePenalties")
      .withIndex("by_user_space", (q) =>
        q.eq("userId", userId).eq("spaceId", spaceId)
      )
      .first();

    if (penalty) {
      await ctx.db.delete(penalty._id);
    }

    return { success: true };
  },
});

// 전체 패널티 현황 조회
export const getAllPenalties = query({
  args: {},
  handler: async (ctx) => {
    const penalties = await ctx.db.query("spacePenalties").collect();

    // 공간 정보와 사용자 정보와 함께 반환
    const penaltiesWithDetails = await Promise.all(
      penalties.map(async (penalty) => {
        const space = await ctx.db.get(penalty.spaceId);
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", penalty.userId))
          .first();
        return { ...penalty, space, user };
      })
    );

    return penaltiesWithDetails;
  },
});

// 사용자의 패널티 현황 조회
export const getUserPenalties = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // userId로 모든 패널티 조회
    const allPenalties = await ctx.db.query("spacePenalties").collect();
    const userPenalties = allPenalties.filter((p) => p.userId === userId);

    // 공간 정보와 함께 반환
    const penaltiesWithSpace = await Promise.all(
      userPenalties.map(async (penalty) => {
        const space = await ctx.db.get(penalty.spaceId);
        return { ...penalty, space };
      })
    );

    return penaltiesWithSpace;
  },
});

// ===== 역할 관리 =====

// 역할 부여/변경
export const setUserRole = mutation({
  args: { userId: v.string(), role: v.string() },
  handler: async (ctx, { userId, role }) => {
    // 기존 역할 조회
    const existingRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingRole) {
      await ctx.db.patch(existingRole._id, { role });
    } else {
      await ctx.db.insert("userRoles", {
        userId,
        role,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// 사용자 역할 조회
export const getUserRole = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const userRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return userRole?.role || "user";
  },
});

// 모든 역할 조회
export const getAllRoles = query({
  args: {},
  handler: async (ctx) => {
    const roles = await ctx.db.query("userRoles").collect();

    // 사용자 정보와 함께 반환
    const rolesWithUser = await Promise.all(
      roles.map(async (role) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", role.userId))
          .first();
        return { ...role, user };
      })
    );

    return rolesWithUser;
  },
});

// ===== 자동 관리자 설정 =====

// 장비 예약 시스템의 admin 사용자를 공간 예약 시스템 admin으로 자동 설정
export const syncAdminRoles = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. users 테이블에서 admin 역할을 가진 사용자 찾기
    const adminUsers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .collect();

    let syncCount = 0;

    // 2. 각 admin 사용자를 userRoles 테이블에 추가
    for (const user of adminUsers) {
      const existingRole = await ctx.db
        .query("userRoles")
        .withIndex("by_user", (q) => q.eq("userId", user.clerkId))
        .first();

      if (!existingRole) {
        await ctx.db.insert("userRoles", {
          userId: user.clerkId,
          role: "admin",
          createdAt: Date.now(),
        });
        syncCount++;
      }
    }

    return {
      success: true,
      message: `${syncCount}명의 관리자 역할이 동기화되었습니다.`,
      totalAdmins: adminUsers.length,
    };
  },
});
