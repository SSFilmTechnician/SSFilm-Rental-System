import dotenv from "dotenv";
import fs from "fs";
import csv from "csv-parser";
import { v2 as cloudinary } from "cloudinary";
import { ConvexHttpClient } from "convex/browser";
// ✅ 중요: .js 확장자를 꼭 붙여야 합니다!
import { api } from "../convex/_generated/api.js";

// 환경 변수 설정
dotenv.config({ path: ".env.local" });

// 1. 설정 확인
const CONVEX_URL = process.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("❌ 오류: .env.local 파일에 VITE_CONVEX_URL이 없습니다.");
  process.exit(1);
}

// 2. Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const client = new ConvexHttpClient(CONVEX_URL);
const results = [];

// 3. CSV 파일 경로
const CSV_FILE_PATH = "migration/data.csv";

// --- 메인 로직 ---
async function processRow(row) {
  try {
    console.log(`\n📦 처리 중: ${row.name}...`);

    let newImageUrl = "";

    // A. 이미지 업로드 (Cloudinary)
    if (row.image_url && row.image_url.startsWith("http")) {
      try {
        console.log(`   - ☁️ Cloudinary에 이미지 업로드 중...`);
        const uploadResult = await cloudinary.uploader.upload(row.image_url, {
          folder: "ssfilm_equipment",
        });
        newImageUrl = uploadResult.secure_url;
        console.log(`   - ✅ 업로드 완료: ${newImageUrl}`);
      } catch (err) {
        console.error(
          `   - ⚠️ 이미지 업로드 실패 (URL만 비워둠): ${err.message}`
        );
      }
    }

    // B. 데이터 매핑
    const payload = {
      name: row.name,
      categoryName: row.category || "Uncategorized",
      subCategoryName: row.sub_category || undefined,
      manufacturer: row.manufacturer,
      description: row.model
        ? `[Model: ${row.model}] ${row.description || ""}`
        : row.description,
      imageUrl: newImageUrl,
      totalQuantity: parseInt(row.total_quantity || "0", 10),
      isGroupPrint: row.is_group_print === "t" || row.is_group_print === "true",
      sortOrder: parseInt(row.sort_order || "0", 10),
    };

    // C. Convex로 전송
    await client.mutation(api.migration.importEquipment, payload);
    console.log(
      `   ✨ DB 저장 완료: ${row.name} (수량: ${payload.totalQuantity})`
    );
  } catch (error) {
    console.error(`❌ 에러 발생 (${row.name}):`, error);
  }
}

// --- 실행 시작 ---
console.log("🚀 마이그레이션 시작...");

if (!fs.existsSync(CSV_FILE_PATH)) {
  console.error(`❌ 오류: '${CSV_FILE_PATH}' 파일을 찾을 수 없습니다.`);
  console.error(
    "👉 CSV 파일이 'migration' 폴더 안에 'data.csv'라는 이름으로 있는지 확인해주세요."
  );
  process.exit(1);
}

fs.createReadStream(CSV_FILE_PATH)
  .pipe(csv())
  .on("data", (data) => results.push(data))
  .on("end", async () => {
    console.log(`총 ${results.length}개의 데이터를 찾았습니다.`);

    for (const row of results) {
      await processRow(row);
    }

    console.log("\n🎉 모든 작업이 완료되었습니다!");
  });
