// src/lib/constants.ts

// 1. 대분류와 세부 카테고리(소분류) 정의
// 사용자 요청 및 DB 데이터(CSV) 완벽 반영
export const CATEGORY_MAP: Record<string, string[]> = {
  CAMERA: ["ARRI", "SONY"],
  LENS: [
    "PRIME LENS",
    "ZOOM LENS",
    "Adapter", // DB의 대소문자 혼용 유지
  ],
  "TRIPOD · GRIP": [
    // 화면에 표시될 이름 (DB 카테고리명도 'TRIPOD · GRIP'으로 수정 필요할 수 있음)
    "TRIPOD", // 오타 수정 반영됨 (TIRPOD -> TRIPOD)
    "GRIP",
  ],
  MONITOR: ["MONITOR", "VIDEO WIRELESS", "ACC"],
  LIGHTING: [
    "LIGHT", // DB에 있는 실제값 (LED, TUNGSTEN 통합)
    "STAND",
    "ACC",
  ],
  AUDIO: [
    "MIC",
    "RECORDER",
    "ACC",
    // 'WIRELESS'는 CSV에 없어서 제외 (필요시 DB 추가 후 기입)
  ],
  ACC: [
    "BATTERY",
    "FILTER",
    "FOCUS·MATTEBOX", // DB 값 유지
    "ETC",
  ],
};

// 2. 상단 네비게이션 순서
export const CATEGORY_ORDER = [
  "CAMERA",
  "LENS",
  "TRIPOD · GRIP",
  "MONITOR",
  "LIGHTING",
  "AUDIO",
  "ACC",
];
