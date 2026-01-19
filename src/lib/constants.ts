// src/lib/constants.ts

// 1. 대분류와 세부 카테고리(소분류) 정의
// CSV 데이터(DB)에 있는 실제 값과 100% 일치시켰습니다.
export const CATEGORY_MAP: Record<string, string[]> = {
  CAMERA: ["ARRI", "SONY"],
  LENS: ["PRIME LENS", "ZOOM LENS", "Adapter"],
  "TRIPOD · GRIP": [
    "TRIPOD", // DB의 오타(TIRPOD)를 수정하셨다고 했으므로 TRIPOD로 설정
    "GRIP",
  ],
  MONITOR: ["MONITOR", "VIDEO WIRELESS", "ACC"],
  ACC: ["FOCUS·MATTEBOX", "BATTERY", "FILTER", "ETC"],
  LIGHTING: ["LIGHT", "STAND", "ACC"],
  AUDIO: ["MIC", "RECORDER", "ACC"],
};

// 2. 상단 네비게이션 표시 순서 (요청하신 순서 완벽 적용)
export const CATEGORY_ORDER = [
  "CAMERA",
  "LENS",
  "TRIPOD · GRIP",
  "MONITOR",
  "ACC", // ✅ MONITOR 다음, LIGHTING 앞으로 이동
  "LIGHTING",
  "AUDIO",
];
