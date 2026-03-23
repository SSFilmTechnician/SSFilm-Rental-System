import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Link } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import {
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

export default function SpaceMain() {
  const { isAuthenticated } = useConvexAuth();
  const spaces = useQuery(api.spaces.getActiveSpaces);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900">
          공간 예약
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          학과 공간을 예약하고 이용 현황을 확인하세요.
        </p>
      </div>

      {/* 안내 배너 */}
      <div className="bg-gray-900 text-white rounded-xl p-5 mb-8">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">예약 안내</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                최대 2주 이내 예약 가능
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                1회 최대 6시간, 전일 오후 5시 마감
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                믹싱룸/ADR룸은 관리자 승인 필요
              </li>
            </ul>
          </div>
          {isAuthenticated && (
            <Link
              to="/spaces/my"
              className="inline-flex items-center gap-1 bg-white text-gray-900 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors self-start"
            >
              내 예약 보기
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* 공간 카드 목록 */}
      {spaces === undefined ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map((space) => (
            <Link
              key={space._id}
              to={`/spaces/reservation/${space._id}`}
              className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <h3 className="text-lg font-bold text-gray-900">
                      {space.name}
                    </h3>
                  </div>
                  {space.requiresApproval && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      승인 필요
                    </span>
                  )}
                </div>
                {space.description && (
                  <p className="text-sm text-gray-500 mb-4">
                    {space.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    예약 현황 보기
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
