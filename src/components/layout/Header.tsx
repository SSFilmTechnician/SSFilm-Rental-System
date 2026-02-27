import { useState, useEffect, useRef } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
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
  "https://res.cloudinary.com/dd8pp8ngj/image/upload/v1769400548/SSFilm_Logo_Black_lzx6nw.png";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentCategory = searchParams.get("category")?.toUpperCase();

  // --- 상태 관리 ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [showNoti, setShowNoti] = useState(false);
  const [dbSyncInitialized, setDbSyncInitialized] = useState(false);

  const notiRef = useRef<HTMLDivElement>(null);

  // 인증 상태
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useClerk();

  // 장비리스트 상태
  const storeItems = useCartStore((state) => state.items);
  const displayItems = isAuthenticated ? storeItems : [];
  const itemCount = displayItems.reduce((sum, item) => sum + item.quantity, 0);

  // Convex 함수들
  const myProfile = useQuery(api.users.getMyProfile);
  const saveCartToDB = useMutation(api.users.saveCart);

  // 알림 데이터
  const notifications = useQuery(api.notifications.getMyNotifications);
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const deleteNotification = useMutation(api.notifications.deleteNotification);
  const cleanupOldNotifications = useMutation(
    api.notifications.cleanupOldNotifications,
  );

  // ---------------------------------------------------------------
  // [로직 1: 불러오기] 로그인 직후 DB 데이터를 로컬로 가져옴
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated) {
      if (dbSyncInitialized) setTimeout(() => setDbSyncInitialized(false), 0);
      return;
    }

    if (myProfile === undefined) return;

    if (!dbSyncInitialized) {
      if (myProfile && myProfile.cart) {
        try {
          const dbCartItems = JSON.parse(myProfile.cart);
          if (Array.isArray(dbCartItems)) {
            useCartStore.setState({ items: dbCartItems });
          }
        } catch (e) {
          console.error("장비리스트 파싱 오류", e);
        }
      }
      setTimeout(() => setDbSyncInitialized(true), 0);
    }
  }, [isAuthenticated, myProfile, dbSyncInitialized]);

  // ---------------------------------------------------------------
  // [로직 2: 저장하기] 장비리스트가 변하면 실시간으로 DB 저장
  // ---------------------------------------------------------------
  useEffect(() => {
    const syncToDB = async () => {
      if (isAuthenticated && dbSyncInitialized) {
        try {
          await saveCartToDB({ cartJson: JSON.stringify(storeItems) });
        } catch (e) {
          console.error("장비리스트 저장 실패", e);
        }
      }
    };

    const timer = setTimeout(syncToDB, 500);
    return () => clearTimeout(timer);
  }, [storeItems, isAuthenticated, dbSyncInitialized, saveCartToDB]);

  // 알림 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
        setShowNoti(false);
      }
    };
    if (showNoti) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNoti]);

  // 알림 정리
  useEffect(() => {
    if (isAuthenticated && notifications && notifications.length > 0) {
      cleanupOldNotifications();
    }
  }, [notifications, isAuthenticated, cleanupOldNotifications]);

  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      useCartStore.setState({ items: [] });
      localStorage.removeItem("cart");
      localStorage.removeItem("cart-storage");
      setDbSyncInitialized(false);

      await signOut();
      navigate("/");
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-[100]">
      {/* 1단: 로고 및 아이콘 */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
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

            <div className="flex items-center space-x-2 md:space-x-4">
              {/* 장비리스트 버튼 (항상 보임) */}
              {isAuthenticated && (
                <button
                  onClick={() => navigate("/cart")}
                  className="relative flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <ShoppingCart className="w-5 h-5 text-gray-700" />
                  <span className="text-sm font-medium text-gray-700">
                    ({itemCount})
                  </span>
                </button>
              )}

              {/* PC 전용 메뉴 (1024px 이상에서만 보임) */}
              {isAuthenticated ? (
                <div className="hidden lg:flex items-center space-x-2">
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
                    {showNoti && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] flex flex-col animate-fadeIn">
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
                                      if (!noti.read)
                                        markAsRead({
                                          notificationId: noti._id,
                                        });
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
                                          className={`text-sm font-bold ${!noti.read ? "text-gray-900" : "text-gray-600"}`}
                                        >
                                          {noti.title}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                          {noti.message}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                          {new Date(
                                            noti._creationTime,
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
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification({
                                        notificationId: noti._id,
                                      });
                                    }}
                                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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

                  <button
                    onClick={() => navigate("/mypage")}
                    className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>마이페이지</span>
                  </button>
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
                  className="hidden lg:block text-sm text-gray-600 hover:text-gray-900 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  로그인 / 회원가입
                </button>
              )}

              {/* 모바일 햄버거 메뉴 버튼 (1024px 미만에서만 보임) */}
              <button
                className="lg:hidden p-2 text-gray-600"
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

      {/* 2단: 네비게이션 바 (1024px 이상에서만 보임) */}
      <div className="hidden lg:block bg-white relative shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex justify-center items-center h-12">
            {/* NOTICE: 왼쪽 고정 */}
            <div className="absolute left-0 flex items-center h-full">
              <Link
                to="/rules"
                className={`px-4 py-2 text-sm font-bold whitespace-nowrap rounded-md transition-colors flex items-center gap-1 uppercase tracking-wide ${
                  location.pathname === "/rules"
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                NOTICE
              </Link>
            </div>

            {/* 실시간 장비현황: 오른쪽 고정 (로그인 시에만 표시) */}
            {isAuthenticated && (
              <div className="absolute right-0 flex items-center h-full">
                <Link
                  to="/inventory"
                  className={`px-4 py-2 text-sm font-bold whitespace-nowrap rounded-md transition-colors flex items-center gap-1 uppercase tracking-wide ${
                    location.pathname === "/inventory"
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  실시간 장비현황
                </Link>
              </div>
            )}

            {/* 카테고리: 중앙 정렬 */}
            <nav className="flex space-x-1 h-full items-center">
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
      </div>

      {/* 모바일 메뉴 (1024px 미만에서만 열림) */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 absolute w-full left-0 z-50 shadow-lg max-h-[80vh] overflow-y-auto">
          <div className="p-4 space-y-4">
            <div>
              <Link
                to="/rules"
                onClick={() => setIsMenuOpen(false)}
                className={`block text-lg font-bold uppercase mb-4 ${
                  location.pathname === "/rules"
                    ? "text-blue-600"
                    : "text-gray-900"
                }`}
              >
                - NOTICE
              </Link>
              {isAuthenticated && (
                <Link
                  to="/inventory"
                  onClick={() => setIsMenuOpen(false)}
                  className={`block text-lg font-bold mb-4 ${
                    location.pathname === "/inventory"
                      ? "text-blue-600"
                      : "text-gray-900"
                  }`}
                >
                  - 실시간 장비현황
                </Link>
              )}
            </div>

            {CATEGORY_ORDER.map((category) => (
              <div key={category}>
                <Link
                  to={`/?category=${category}`}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block text-lg font-bold uppercase mb-4 ${
                    currentCategory === category
                      ? "text-blue-600"
                      : "text-gray-900"
                  }`}
                >
                  - {category}
                </Link>
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
