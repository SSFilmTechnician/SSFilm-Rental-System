import { httpRouter } from "convex/server";
import { getRecommendation } from "./ai";

const http = httpRouter();

// AI 추천 엔드포인트
http.route({
  path: "/ai/getRecommendation",
  method: "POST",
  handler: getRecommendation,
});

// OPTIONS 요청 처리 (CORS preflight)
http.route({
  path: "/ai/getRecommendation",
  method: "OPTIONS",
  handler: getRecommendation,
});

export default http;
