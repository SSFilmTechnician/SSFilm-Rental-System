import { httpRouter } from "convex/server";
import { getRecommendation } from "./ai";
import { testOpenAI } from "./testOpenAI";

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

// OpenAI 테스트 엔드포인트
http.route({
  path: "/test/openai",
  method: "GET",
  handler: testOpenAI,
});

http.route({
  path: "/test/openai",
  method: "OPTIONS",
  handler: testOpenAI,
});

export default http;
