import { UserCheck, ShoppingCart, CalendarDays, Camera } from "lucide-react";

const STEPS = [
  {
    step: "STEP 01",
    title: "회원가입 및 승인",
    description:
      "로그인 후 마이페이지에서 학번을 인증해주세요. 관리자 승인 후 정식 이용이 가능합니다.",
    // 아이콘 크기 반응형 (모바일: w-8, PC: w-10)
    icon: (
      <UserCheck className="w-8 h-8 md:w-10 md:h-10 mb-2 md:mb-3 text-blue-600" />
    ),
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-900",
  },
  {
    step: "STEP 02",
    title: "장비 담기",
    description: "카테고리별로 필요한 장비를 장비리스트에 담으세요.",
    icon: (
      <ShoppingCart className="w-8 h-8 md:w-10 md:h-10 mb-2 md:mb-3 text-emerald-600" />
    ),
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    text: "text-emerald-900",
  },
  {
    step: "STEP 03",
    title: "예약 신청",
    description:
      "대여 기간과 프로젝트명(촬영 정보)을 입력하고 예약을 신청하세요.",
    icon: (
      <CalendarDays className="w-8 h-8 md:w-10 md:h-10 mb-2 md:mb-3 text-purple-600" />
    ),
    bg: "bg-purple-50",
    border: "border-purple-100",
    text: "text-purple-900",
  },
  {
    step: "STEP 04",
    title: "승인 및 수령",
    description:
      "관리자 승인 알림을 받으면, 예약한 날짜에 장비실에서 장비를 반출하세요.",
    icon: (
      <Camera className="w-8 h-8 md:w-10 md:h-10 mb-2 md:mb-3 text-orange-600" />
    ),
    bg: "bg-orange-50",
    border: "border-orange-100",
    text: "text-orange-900",
  },
];

export default function ServiceGuide() {
  return (
    // 섹션 패딩 반응형 조정 (모바일: py-10, PC: py-16)
    <section className="w-full py-10 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* 섹션 제목 */}
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-3">
            HOW TO USE
          </h2>
          <p className="text-sm md:text-base text-gray-500">
            SSFILM 장비 대여 시스템 이용 절차입니다.
          </p>
        </div>

        {/* 4단 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {STEPS.map((item, idx) => (
            <div
              key={idx}
              // 모바일: p-6 & 높이 자동(min-h-0), PC: p-8 & 최소높이 240px 고정
              className={`p-6 md:p-8 rounded-2xl border ${item.bg} ${item.border} hover:shadow-lg transition-shadow duration-300 flex flex-col items-start justify-between min-h-0 md:min-h-[240px]`}
            >
              <div>
                {item.icon}
                <span
                  className={`text-[10px] md:text-xs font-bold px-2 py-1 rounded-full bg-white bg-opacity-60 mb-2 md:mb-3 inline-block ${item.text}`}
                >
                  {item.step}
                </span>
                <h3
                  className={`text-lg md:text-xl font-bold mb-1 md:mb-2 ${item.text}`}
                >
                  {item.title}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 leading-relaxed word-keep break-keep">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 추가 안내 문구 */}
        <div className="mt-6 md:mt-8 text-center">
          <p className="text-xs text-gray-400 bg-gray-50 inline-block px-3 py-1.5 md:px-4 md:py-2 rounded-full">
            ※ 자세한 안내 사항은 상단 <b>NOTICE</b> 을 참조하시길 바랍니다.
          </p>
        </div>
      </div>
    </section>
  );
}
