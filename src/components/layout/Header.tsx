import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ShoppingCart,
  User,
  LogOut,
  Bell,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { CATEGORY_MAP, CATEGORY_ORDER } from "@/lib/constants";
import { useCartStore } from "../../stores/useCartStore";

// Convex 및 Clerk 훅
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useClerk } from "@clerk/clerk-react";
import { api } from "../../../convex/_generated/api";

const LOGO_URL =
  "https://oxxtmvcfhfmpobjcjugw.supabase.co/storage/v1/object/public/banners/SSFilm_Logo_Black.png";

export default function Header() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentCategory = searchParams.get("category")?.toUpperCase();

  // --- 상태 관리 ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [showNoti, setShowNoti] = useState(false);

  // 알림 드롭다운 ref
  const notiRef = useRef<HTMLDivElement>(null);

  // 장바구니 상태 (Zustand)
  const items = useCartStore((state) => state.items);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // 인증 상태
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useClerk();

  // ✅ [추가] DB 동기화를 위한 Convex 함수들
  const myProfile = useQuery(api.users.getMyProfile);
  const saveCartToDB = useMutation(api.users.saveCart);

  // ✅ 알림 데이터 및 함수
  const notifications = useQuery(api.notifications.getMyNotifications);
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const deleteNotification = useMutation(api.notifications.deleteNotification);
  const cleanupOldNotifications = useMutation(
    api.notifications.cleanupOldNotifications
  );

  // ✅ [로직 1] 로그인 시 DB 장바구니 불러오기 (DB -> Local)
  useEffect(() => {
    if (isAuthenticated && myProfile?.cart) {
      try {
        const dbCartItems = JSON.parse(myProfile.cart);
        // 로컬 장바구니가 비어있고, DB에는 데이터가 있다면 복구
        if (items.length === 0 && dbCartItems.length > 0) {
          useCartStore.setState({ items: dbCartItems });
        }
        // (선택사항) 로컬과 DB를 병합하려면 로직이 복잡해지므로,
        // 일단은 'DB 데이터가 존재하면 로컬을 덮어쓰거나', '비어있을 때만 복구'하는 방식이 안전합니다.
      } catch (e) {
        console.error("장바구니 복구 실패", e);
      }
    }
  }, [isAuthenticated, myProfile]); // 프로필이 로드되면 실행

  // ✅ [로직 2] 장바구니 변경 시 DB에 자동 저장 (Local -> DB)
  useEffect(() => {
    const syncToDB = async () => {
      if (isAuthenticated && items.length > 0) {
        try {
          await saveCartToDB({ cartJson: JSON.stringify(items) });
        } catch (e) {
          console.error("장바구니 서버 저장 실패", e);
        }
      }
    };

    // 너무 잦은 저장을 방지하기 위해 디바운스(Debounce) 적용 가능하지만,
    // 일단은 변경될 때마다 저장합니다.
    const timer = setTimeout(syncToDB, 500); // 0.5초 뒤 저장
    return () => clearTimeout(timer);
  }, [items, isAuthenticated, saveCartToDB]);

  // 알림 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
        setShowNoti(false);
      }
    };

    if (showNoti) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNoti]);

  // 알림 조회 시 자동으로 10개 초과 알림 정리
  useEffect(() => {
    if (isAuthenticated && notifications && notifications.length > 0) {
      cleanupOldNotifications();
    }
  }, [notifications, isAuthenticated, cleanupOldNotifications]);


  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      // 1. 보안을 위해 로컬 화면/스토리지는 비움 (공용 PC 대비)
      // DB에는 장바구니를 유지하여 다음 로그인 시 복구
      useCartStore.setState({ items: [] });
      localStorage.removeItem("cart");
      localStorage.removeItem("cart-storage");

      // 2. 로그아웃 실행
      await signOut();

      navigate("/");
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-[100]">
      {/* 1. 상단 바 */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 로고 */}
            <Link to="/" className="flex items-center">
              <img
                src={LOGO_URL}
                alt="SSFILM RENTAL"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const span = document.createElement("span");
                  span.innerText = "SSFILM RENTAL";
                  span.className = "text-xl font-bold text-gray-900";
                  e.currentTarget.parentElement?.appendChild(span);
                }}
              />
            </Link>

            {/* 우측 아이콘 영역 */}
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* 장바구니 버튼 */}
              <button
                onClick={() => navigate("/cart")}
                className="relative flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-gray-700" />
                <span className="text-sm font-medium text-gray-700">
                  ({itemCount})
                </span>
              </button>

              {/* 유저 메뉴 (로그인 여부에 따라 분기) */}
              {isAuthenticated ? (
                <div className="hidden md:flex items-center space-x-2">
                  {/* 알림 버튼 */}
                  <div className="relative" ref={notiRef}>
                    <button
                      onClick={() => setShowNoti(!showNoti)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-full relative transition-colors"
                    >
                      <Bell className="w-5 h-5" />
                      {(unreadCount ?? 0) > 0 && (
                        <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
                          {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </button>

                    {/* 알림 드롭다운 */}
                    {showNoti && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] flex flex-col animate-fadeIn">
                        {/* 헤더 */}
                        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                          <h3 className="font-bold text-gray-900">알림</h3>
                          {(notifications?.length ?? 0) > 0 && (
                            <button
                              onClick={() => markAllAsRead()}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              모두 읽음
                            </button>
                          )}
                        </div>

                        {/* 알림 목록 */}
                        <div className="overflow-y-auto flex-1">
                          {!notifications || notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                              새로운 알림이 없습니다.
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {notifications.map((noti) => (
                                <div
                                  key={noti._id}
                                  className={`relative group px-4 py-3 hover:bg-gray-50 transition-colors ${
                                    !noti.read ? "bg-blue-50" : ""
                                  }`}
                                >
                                  <button
                                    onClick={() => {
                                      if (!noti.read) {
                                        markAsRead({ notificationId: noti._id });
                                      }
                                      if (noti.relatedId) {
                                        navigate("/mypage");
                                        setShowNoti(false);
                                      }
                                    }}
                                    className="w-full text-left"
                                  >
                                    <div className="flex items-start gap-2 pr-6">
                                      {!noti.read && (
                                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p
                                          className={`text-sm font-bold ${
                                            !noti.read
                                              ? "text-gray-900"
                                              : "text-gray-600"
                                          }`}
                                        >
                                          {noti.title}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                          {noti.message}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                          {new Date(
                                            noti._creationTime
                                          ).toLocaleString("ko-KR", {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                  </button>
                                  {/* X 삭제 버튼 */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification({
                                        notificationId: noti._id,
                                      });
                                    }}
                                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="삭제"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 마이페이지 */}
                  <button
                    onClick={() => navigate("/mypage")}
                    className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>마이페이지</span>
                  </button>

                  {/* 로그아웃 버튼 */}
                  <button
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-red-600 p-2 rounded-lg transition-colors"
                    title="로그아웃"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate("/login")}
                  className="hidden md:block text-sm text-gray-600 hover:text-gray-900 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  로그인 / 회원가입
                </button>
              )}

              {/* 모바일 햄버거 버튼 */}
              <button
                className="md:hidden p-2 text-gray-600"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 네비게이션 바 (카테고리 연동) */}
      <div className="hidden md:block bg-white relative shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-center space-x-1 h-12 items-center">
            {CATEGORY_ORDER.map((catKey) => {
              const isActive = currentCategory === catKey;
              const subCategories = CATEGORY_MAP[catKey] || [];

              return (
                <div
                  key={catKey}
                  className="relative h-full flex items-center"
                  onMouseEnter={() => setHoveredCategory(catKey)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <Link
                    to={`/?category=${catKey}`}
                    className={`px-4 py-2 text-sm font-bold whitespace-nowrap rounded-md transition-colors flex items-center gap-1 uppercase tracking-wide ${
                      isActive
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {catKey}
                    {subCategories.length > 0 && (
                      <ChevronDown
                        className={`w-3 h-3 transition-transform duration-200 ${
                          hoveredCategory === catKey ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </Link>

                  {/* 드롭다운 메뉴 */}
                  {hoveredCategory === catKey && subCategories.length > 0 && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 pt-2 z-50 w-48 animate-fadeIn">
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -ml-2 w-4 h-4 bg-white/95 rotate-45 border-t border-l border-gray-200 backdrop-blur-md"></div>
                      <div className="bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl p-1.5 flex flex-col gap-0.5 rounded-sm">
                        {subCategories.map((sub) => (
                          <Link
                            key={sub}
                            to={`/?category=${catKey}&subCategory=${sub}`}
                            className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-black hover:text-white transition-all text-center uppercase"
                            onClick={() => setHoveredCategory(null)}
                          >
                            {sub}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3. 모바일 메뉴 */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 absolute w-full left-0 z-50 shadow-lg max-h-[80vh] overflow-y-auto">
          <div className="p-4 space-y-4">
            {CATEGORY_ORDER.map((category) => (
              <div key={category}>
                <Link
                  to={`/?category=${category}`}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block text-lg font-bold uppercase mb-2 ${
                    currentCategory === category
                      ? "text-blue-600"
                      : "text-gray-900"
                  }`}
                >
                  {category}
                </Link>
                <div className="pl-4 flex flex-wrap gap-2">
                  {CATEGORY_MAP[category]?.map((sub) => (
                    <Link
                      key={sub}
                      to={`/?category=${category}&subCategory=${sub}`}
                      onClick={() => setIsMenuOpen(false)}
                      className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-sm"
                    >
                      {sub}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  className="flex items-center gap-2 font-bold text-gray-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="w-5 h-5" /> 로그인 / 회원가입
                </Link>
              ) : (
                <>
                  <Link
                    to="/mypage"
                    className="flex items-center gap-2 font-bold text-gray-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="w-5 h-5" /> 마이페이지
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 font-bold text-red-600 text-left"
                  >
                    <LogOut className="w-5 h-5" /> 로그아웃
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
