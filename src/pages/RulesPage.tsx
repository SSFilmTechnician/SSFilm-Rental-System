import { useState } from "react";
import {
  Book,
  AlertTriangle,
  Clock,
  Users,
  FileText,
  CheckCircle2,
  MapPin,
  ShieldAlert,
} from "lucide-react";

type Tab = "summary" | "detailed";

export default function RulesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("summary");

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 min-h-screen pb-20">
      <div className="text-center mb-10 px-2">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">
          SSFilm 장비 예약 시스템 이용 규정
        </h1>
        <p className="text-sm sm:text-base text-gray-500 break-words">
          안전하고 공정한 장비 사용을 위해 아래 규정을 반드시 숙지해주시기
          바랍니다.
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex justify-center mb-8 px-2">
        <div className="bg-gray-100 p-1 rounded-lg flex flex-col sm:flex-row gap-1 sm:gap-0 w-full sm:w-auto max-w-md sm:max-w-none">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === "summary"
                ? "bg-white shadow text-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">신청 시 유의사항 (요약)</span>
            <span className="sm:hidden">유의사항 요약</span>
          </button>
          <button
            onClick={() => setActiveTab("detailed")}
            className={`px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === "detailed"
                ? "bg-white shadow text-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Book className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">장비 사용 세부 규칙 (전문)</span>
            <span className="sm:hidden">세부 규칙 전문</span>
          </button>
        </div>
      </div>

      {/* 컨텐츠 영역 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 md:p-10 break-words">
        {/* 탭 1: 유의사항 (요약) */}
        {activeTab === "summary" && (
          <div className="space-y-8 animate-fadeIn">
            {/* 상단 경고 박스 */}
            <div className="bg-red-50 border border-red-100 rounded-xl p-6">
              <h3 className="text-red-700 font-bold text-lg mb-2 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> 필독 사항
              </h3>
              <ul className="list-disc list-outside text-red-700 space-y-1 text-sm pl-5">
                <li className="pl-1">
                  장비대여 신청 전 <b>'장비 사용 세부 규칙'</b>을 반드시
                  숙지해야 합니다.
                </li>
                <li className="pl-1">
                  규정 미숙지로 인해 발생하는 모든 문제는 <b>신청인의 책임</b>
                  입니다.
                </li>
                <li className="pl-1">
                  개인 자격의 장비 대여는 불가하며, 학과 활동 목적이어야 합니다.
                </li>
              </ul>
            </div>

            {/* 신청 마감 시간 표 */}
            <div>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" /> 신청 마감 시간 (근무일 기준 3일
                전)
              </h3>
              <div className="overflow-x-auto border rounded-xl">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        반출 희망일<br className="sm:hidden" />
                        <span className="hidden sm:inline"> </span>(10:00 - 16:00)
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-red-500 uppercase tracking-wider">
                        신청 마감 일시<br className="sm:hidden" />
                        <span className="hidden sm:inline"> </span>(오후 5시)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 text-xs sm:text-sm">
                    <tr>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium">월요일</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-600">
                        이전 주{" "}
                        <span className="font-bold text-red-600">수요일</span>{" "}
                        오후 5시까지
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium">화요일</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-600">
                        이전 주{" "}
                        <span className="font-bold text-red-600">목요일</span>{" "}
                        오후 5시까지
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium">수요일</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-600">
                        이전 주{" "}
                        <span className="font-bold text-red-600">금요일</span>{" "}
                        오후 5시까지
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium">목요일</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-600">
                        해당 주{" "}
                        <span className="font-bold text-red-600">월요일</span>{" "}
                        오후 5시까지
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium">금요일</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-600">
                        해당 주{" "}
                        <span className="font-bold text-red-600">화요일</span>{" "}
                        오후 5시까지
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                ※ 공휴일이 끼어 있는 경우 휴일 기간만큼 당겨서 신청해야 합니다.
                (오후 5시 이후 신청은 다음 날짜로 간주)
              </p>
            </div>

            {/* 인원 및 자격 */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" /> 인원 및 자격
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span>
                      <b>촬영/조명/사운드</b> 파트 팀원 모두 장비사용자격증을
                      보유해야 합니다.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span>
                      반출/반납 시 위 3개 파트 <b>전원 입회(출석)</b>가
                      원칙입니다.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <span>
                      1명이라도 15분 이상 지각 시 <b>반출이 불가</b>합니다.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <span>
                      반납에 <b>지각 또는 불참</b>한 경우 <b>학과운영회의</b>를
                      통해 결정된 패널티가 부여됩니다.
                    </span>
                  </li>
                </ul>
              </div>

              {/* 1. 박스(div)에 flex flex-col h-full 추가: 높이를 꽉 채우고 세로 정렬 */}
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex flex-col h-full">
                {/* 내용 영역 */}
                <div>
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5" /> 공간 사용
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span>
                        반출/반납 시 <b>스튜디오 공간 사용 신청(각 1시간)</b>이
                        필수입니다.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                      <span>공간 미신청 시 반출/반납 처리가 불가능합니다.</span>
                    </li>
                  </ul>
                </div>

                {/* 2. 버튼(a)에 mt-auto 추가: 위쪽 여백을 모두 차지해서 바닥으로 밀어냄 */}
                <a
                  href="https://ssfilm-v0-extra.19721121.xyz/embed"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto pt-6 flex items-center justify-center gap-2 w-full"
                >
                  <div className="w-full py-3 rounded-lg bg-indigo-900 text-white text-sm font-bold hover:bg-indigo-800 transition-all shadow-sm flex items-center justify-center gap-2">
                    공간 사용 신청 사이트 바로가기
                  </div>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 탭 2: 세부 규칙 (상세) */}
        {activeTab === "detailed" && (
          <div className="space-y-8 animate-fadeIn text-gray-800">
            <Section title="제1조 [목적]">
              <p>
                본 세부 규칙은 SSFilm(숭실대학교 영화예술전공) 자산이용규칙 중
                장비를 사용하는 데에 있어 실질적으로 적용되는 세부적인 규칙들을
                제공하는 것을 목적으로 한다.
              </p>
            </Section>

            <Section title="제2조 [정의]">
              <p>SSFilm은 장비의 수준을 크게 다음과 같이 나눈다.</p>
              <ul className="list-disc list-inside mt-2 ml-2 space-y-1 text-gray-600">
                <li>
                  <b>프로 장비:</b> ARRI Alexa Mini, CANON C500 등 (크리틱,
                  워크샵 주 장비)
                </li>
                <li>
                  <b>준프로 장비:</b> SONY FX3, α7S II 등 (수업 실습 및 과제 주
                  장비)
                </li>
              </ul>
            </Section>

            <Section title="제3조 [반출과 사용]">
              <ul className="list-decimal list-inside space-y-2">
                <li>
                  장비대여 신청은 반출일 <b>3일 전(근무일 기준)</b>에 해야 한다.
                  오후 5시 이후는 다음 날로 간주한다.
                </li>
                <li>
                  신청한 장비 외 추가 반출은 불가하다. (단, 라인류 등 단순한 부가 물품은 예외로 한다.)
                </li>
                <li>
                  <b>장비 연습:</b> 당일 출반납 원칙 (10:00~16:00), 스튜디오 내
                  사용 한정.
                </li>
                <li>
                  <b>수업 과제:</b> 24시간 이내 반납 원칙. 주말 반출 불가.
                </li>
                <li>학과 소모임 이용 시 학과운영위 사전 허가 필요.</li>
                <li>개인 자격 대여 불가.</li>
              </ul>
            </Section>

            <Section title="제4조 [반출, 반납]">
              <ul className="list-decimal list-inside space-y-2">
                <li>
                  반출/반납 시 <b>촬영, 촬영부, 동시녹음 담당자 전원</b>이
                  입회하여 이상 유무를 확인해야 한다.
                </li>
                <li>
                  전원 출석이 원칙이며 <b>15분 이상 지각 시 반출 불가</b>.
                </li>
                <li>
                  규정 위반으로 취소된 경우 3일 기간을 지켜 재신청해야 한다.
                  (워크샵은 익일)
                </li>
                <li>
                  지각/불참은 천재지변 등 증거가 있는 불가피한 사유만 참작
                  가능하다.
                </li>
              </ul>
            </Section>

            <Section title="제5조 [장비의 손망실]">
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 text-sm">
                <p className="font-bold mb-2 text-orange-800">
                  책임 소재 및 처리
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>
                    <b>장비 노후:</b> 학교 전액 부담
                  </li>
                  <li>
                    <b>사용팀 과실:</b> 해당 팀 키스탭들이 1/n 부담
                  </li>
                  <li>
                    <b>과실 불분명:</b> 학과운영회의를 통해 비율 조정
                  </li>
                  <li>발생 시점으로부터 2주 내 처리 시작 필요.</li>
                  <li>
                    반납 후 1주일간 손망실 책임 유예 기간 적용 (그 사이 다른
                    반출이 없었을 경우).
                  </li>
                </ul>
              </div>
            </Section>

            <Section title="제6조 [장비 사용 가능 공간]">
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <b>제한 없음:</b> 크리틱, 졸업작품, 본촬영, 수업, 테스트 촬영
                </li>
                <li>
                  <b>스튜디오 내부 한정:</b> 장비 연습
                </li>
                <li>허용된 공간 외 사용 적발 시 패널티 적용.</li>
              </ul>
            </Section>

            <Section title="제7조 [외부인의 장비 사용]">
              <ul className="list-decimal list-inside space-y-1">
                <li>
                  졸업생, 휴학생 포함 SSFilm 구성원이 아니면 외부인으로
                  간주한다.
                </li>
                <li>외부인은 임시 사용 자격을 획득해야 기술 파트 참여 가능.</li>
                <li>
                  외부인은 원칙적으로 <b>키스탭(촬영/조명/사운드 감독) 불가</b>.
                  (부득이한 경우 예외)
                </li>
                <li>
                  외부인 키스탭 참여 시 손망실 1/n 책임에 반드시 포함된다.
                </li>
              </ul>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

// 세부 규칙 섹션 컴포넌트
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
      <h4 className="text-lg font-bold mb-3 text-black flex items-center gap-2">
        <FileText className="w-4 h-4 text-gray-400" /> {title}
      </h4>
      <div className="text-sm leading-relaxed pl-1">{children}</div>
    </div>
  );
}
