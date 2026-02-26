import { useState, useEffect } from "react";
import { Calendar, Users, ChevronRight, Clock } from "lucide-react";
import { useAIWizard } from "../AIWizardProvider";

export default function StepBasicInfo() {
  const { state, dispatch } = useAIWizard();

  // 초기 state에서 날짜와 시간 분리
  const [pickupDateValue, pickupTimeValue] = state.basicInfo.pickupDate
    ? state.basicInfo.pickupDate.split("T")
    : ["", ""];
  const [returnDateValue, returnTimeValue] = state.basicInfo.returnDate
    ? state.basicInfo.returnDate.split("T")
    : ["", ""];

  const [pickupDate, setPickupDate] = useState(pickupDateValue || "");
  const [pickupTime, setPickupTime] = useState(pickupTimeValue || "09:00");
  const [returnDate, setReturnDate] = useState(returnDateValue || "");
  const [returnTime, setReturnTime] = useState(returnTimeValue || "09:00");
  const [crewSize, setCrewSize] = useState(state.basicInfo.crewSize);

  // 날짜+시간을 합쳐서 전체 datetime 문자열 생성
  const fullPickupDateTime =
    pickupDate && pickupTime ? `${pickupDate}T${pickupTime}` : "";
  const fullReturnDateTime =
    returnDate && returnTime ? `${returnDate}T${returnTime}` : "";

  const handleNext = () => {
    // 기본 정보 저장
    dispatch({
      type: "SET_BASIC_INFO",
      payload: {
        pickupDate: fullPickupDateTime,
        returnDate: fullReturnDateTime,
        crewSize,
      },
    });

    // 다음 스텝으로
    dispatch({ type: "NEXT_STEP" });
  };

  // 최소 날짜 (오늘)
  const minDate = new Date().toISOString().split("T")[0];

  // 시간 옵션 (09:00 ~ 21:00)
  const timeOptions = Array.from({ length: 13 }, (_, i) => {
    const hour = 9 + i;
    return `${hour.toString().padStart(2, "0")}:00`;
  });

  return (
    <div className="p-6 space-y-6">
      {/* 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-sm text-blue-900 leading-relaxed">
          촬영에 필요한 장비를 추천해드립니다. <br />
          대여 기간과 촬영조명팀 인원을 입력해주세요.
        </p>
      </div>

      {/* 대여 시작 (Pick-up) */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-gray-700">
          대여 시작 (Pick-up)
        </label>

        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 space-y-3">
          {/* 날짜 선택 */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>날짜</span>
            </div>
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              min={minDate}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* 시간 선택 */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>시간</span>
            </div>
            <select
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white cursor-pointer"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 반납 예정 (Return) */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-gray-700">
          반납 예정 (Return)
        </label>

        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 space-y-3">
          {/* 날짜 선택 */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-2">
              <Calendar className="w-4 h-4 text-green-600" />
              <span>날짜</span>
            </div>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              min={pickupDate || minDate}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>

          {/* 시간 선택 */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span>시간</span>
            </div>
            <select
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white cursor-pointer"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          선택한 기간의 재고 상황에 맞춰 추천해드립니다
        </p>
      </div>

      {/* 촬영조명팀 인원 수 */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          <Users className="w-4 h-4 inline mr-1" />
          촬영조명팀 인원 수
        </label>

        {/* 슬라이더 */}
        <div className="space-y-3">
          <input
            type="range"
            min="1"
            max="10"
            value={crewSize}
            onChange={(e) => setCrewSize(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          {/* 숫자 표시 */}
          <div className="flex items-center justify-center">
            <div className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-2xl">
              {crewSize}명
            </div>
          </div>

          {/* 인원 수별 가이드 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 text-center">
              {crewSize === 1 && "1명: 최소 구성 (소형 장비 추천)"}
              {crewSize === 2 && "2명: FX3 기반 소규모 촬영"}
              {crewSize === 3 && "3명: 소규모 시네마 구성"}
              {crewSize >= 4 && crewSize <= 6 && "4~6명: Alexa Mini 기반 본격 시네마 구성"}
              {crewSize >= 7 && "7명+: 대규모 촬영 (듀얼 카메라 가능)"}
            </p>
          </div>
        </div>
      </div>

      {/* 다음 버튼 */}
      <button
        onClick={handleNext}
        disabled={!pickupDate || !pickupTime || !returnDate || !returnTime}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
      >
        장비 추천 시작하기
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
