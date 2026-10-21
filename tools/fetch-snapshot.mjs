// 📦 상가(상권)정보를 내 PC에서 한 번만 받아 tools/snapshot.json으로 저장해요.
//   실행: node --env-file=.env tools/fetch-snapshot.mjs
//   키는 .env에서만 읽고, 화면 출력·결과 파일 어디에도 남기지 않아요.
import { writeFile } from "node:fs/promises";

let KEY = (process.env.DATA_GO_KR_KEY || "").trim();
if (KEY.includes("%")) KEY = decodeURIComponent(KEY); // Encoding 키를 넣어도 동작하게

// 🔌 상가(상권)정보 — 시군구 단위 상가업소 목록
const ENDPOINT = "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInDong";
const PAGE_SIZE = 1000;

// 서울 25개 구 (시군구 코드, 가나다순)
const DISTRICTS = [
  { name: "서울 강남구",   code: "11680" },
  { name: "서울 강동구",   code: "11740" },
  { name: "서울 강북구",   code: "11305" },
  { name: "서울 강서구",   code: "11500" },
  { name: "서울 관악구",   code: "11620" },
  { name: "서울 광진구",   code: "11215" },
  { name: "서울 구로구",   code: "11530" },
  { name: "서울 금천구",   code: "11545" },
  { name: "서울 노원구",   code: "11350" },
  { name: "서울 도봉구",   code: "11320" },
  { name: "서울 동대문구", code: "11230" },
  { name: "서울 동작구",   code: "11590" },
  { name: "서울 마포구",   code: "11440" },
  { name: "서울 서대문구", code: "11410" },
  { name: "서울 서초구",   code: "11650" },
  { name: "서울 성동구",   code: "11200" },
  { name: "서울 성북구",   code: "11290" },
  { name: "서울 송파구",   code: "11710" },
  { name: "서울 양천구",   code: "11470" },
  { name: "서울 영등포구", code: "11560" },
  { name: "서울 용산구",   code: "11170" },
  { name: "서울 은평구",   code: "11380" },
  { name: "서울 종로구",   code: "11110" },
  { name: "서울 중구",     code: "11140" },
  { name: "서울 중랑구",   code: "11260" },
];

// 업종 5개: 응답의 대분류(indsLclsNm)·중분류(indsMclsNm)·소분류(indsSclsNm) 이름으로 나눠요
const CATEGORIES = [
  { id: "cafe",    label: "카페",   match: s => s.indsSclsNm?.includes("카페") },
  { id: "food",    label: "음식점", match: s => s.indsLclsNm === "음식" },
  { id: "academy", label: "학원",   match: s => s.indsLclsNm === "교육" && (s.indsMclsNm?.includes("학원") || s.indsSclsNm?.includes("학원")) },
  { id: "beauty",  label: "미용",   match: s => s.indsSclsNm?.includes("미용") },
  { id: "conv",    label: "편의점", match: s => s.indsSclsNm?.includes("편의점") },
];

// 오류 메시지에 키가 섞여 나오면 ***로 가려요
const mask = text => String(text).split(KEY).join("***").split(encodeURIComponent(KEY)).join("***");
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchPage(code, pageNo) {
  const params = new URLSearchParams({
    serviceKey: KEY, divId: "signguCd", key: code,
    numOfRows: PAGE_SIZE, pageNo, type: "json",
  });
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${ENDPOINT}?${params}`);
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch {
        throw new Error(`JSON이 아닌 응답 (HTTP ${res.status}): ${text.slice(0, 200)}`);
      }
      if (data.header?.resultCode === "03") return { items: [], totalCount: 0 }; // 데이터 없음
      if (data.header?.resultCode !== "00") throw new Error(`${data.header?.resultCode} ${data.header?.resultMsg}`);
      return { items: data.body.items || [], totalCount: data.body.totalCount };
    } catch (err) {
      if (attempt === 2) throw err;
      await sleep(1000);
    }
  }
}

async function fetchDistrict(d) {
  const dongs = new Map(); // 행정동 이름 → 업종별 가게 수
  let pageNo = 1, totalCount = 0, received = 0;
  do {
    const page = await fetchPage(d.code, pageNo);
    totalCount = page.totalCount;
    for (const store of page.items) {
      const dong = store.adongNm || "(행정동 없음)";
      if (!dongs.has(dong)) dongs.set(dong, Object.fromEntries(CATEGORIES.map(c => [c.id, 0])));
      for (const c of CATEGORIES) if (c.match(store)) dongs.get(dong)[c.id]++;
    }
    received += page.items.length;
    console.log(`  ${d.name}: ${received.toLocaleString()} / ${totalCount.toLocaleString()}곳`);
    pageNo++;
    await sleep(200);
  } while (received < totalCount && pageNo <= Math.ceil(totalCount / PAGE_SIZE));

  return {
    name: d.name,
    dongs: [...dongs].map(([name, counts]) => ({ name, counts }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko")),
  };
}

async function main() {
  if (!KEY) {
    console.log("❗ .env 파일의 DATA_GO_KR_KEY= 뒤에 인증키를 붙여 넣고 저장한 뒤 다시 실행해 주세요.");
    process.exit(1);
  }

  const districts = [];
  for (const d of DISTRICTS) {
    console.log(`📥 ${d.name} 받는 중...`);
    districts.push(await fetchDistrict(d));
  }

  const now = new Date();
  const baseDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const snapshot = {
    isSample: false,
    baseDate,
    categories: CATEGORIES.map(({ id, label }) => ({ id, label })),
    districts,
  };

  const out = new URL("./snapshot.json", import.meta.url);
  await writeFile(out, JSON.stringify(snapshot, null, 2), "utf8");

  console.log("\n✅ 저장 완료: tools/snapshot.json");
  for (const d of districts) {
    const totals = CATEGORIES.map(c => `${c.label} ${d.dongs.reduce((s, x) => s + x.counts[c.id], 0).toLocaleString()}`);
    console.log(`  ${d.name} (행정동 ${d.dongs.length}개): ${totals.join(" · ")}`);
  }
}

main().catch(err => {
  console.log("❌ 받기 실패:", mask(err.message));
  console.log("   키가 맞는지, 활용신청이 '승인'인지(승인 후 1시간쯤 걸릴 수 있어요) 확인해 주세요.");
  process.exit(1);
});
