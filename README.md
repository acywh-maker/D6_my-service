# 우리 동네 상권 타겟 찾기

> 전단·지역 광고, 어느 동네에 뿌릴까? — 마케터를 위한 휴대폰 한 화면 서비스

구와 업종(카페·음식점·학원 등)을 고르면, 행정동별 가게 수를 순위로 보여 주고 다음 공휴일에 맞춘 홍보 문구 초안까지 만들어 줘요.

🔗 링크: https://acywh-maker.github.io/D6_my-service/

## 기능 3줄
1. 구와 업종을 고르면 **가게 수가 많은 행정동 TOP 5**가 막대와 순위로 보이고, 데이터 기준 날짜가 함께 보인다.
2. **다음 공휴일 이름(한국어)과 D-day**가 보이고, 불러오지 못하면 실패 안내가 보인다.
3. 1위 동네와 다음 공휴일을 넣은 **SNS 홍보 문구 2개**가 보이고, 복사 버튼을 누르면 "복사했어요"가 보인다.

## API 문서 6칸

### ① 소상공인시장진흥공단 상가(상권)정보 (공공데이터포털)
| 칸 | 내용 |
| --- | --- |
| ① 기본 주소 | `https://apis.data.go.kr/B553077/api/open/sdsc2` |
| ② 메뉴 | `/storeListInDong` — 행정구역 단위 상가업소 조회 |
| ③ 옵션 | `divId=signguCd`(시군구 단위), `key=`서울 25개 구 시군구 코드 (예: `11440` 마포구, `11680` 강남구), `numOfRows=1000`, `pageNo=1,2,3…`, `type=json` |
| ④ 응답 모양 | `header.resultCode`("00"=정상), `body.totalCount`(전체 가게 수), `body.items[]` 안에 `adongNm`(행정동), `indsLclsNm`·`indsMclsNm`·`indsSclsNm`(업종 대·중·소분류) |
| ⑤ 키 | 필요함(`serviceKey`) → 화면에서는 부르지 않고, `tools/fetch-snapshot.mjs`로 내 PC에서만 받아 둔 스냅샷 데이터 사용 (2026-10-21 기준, 키는 `.env`에만 보관) |
| ⑥ 규칙 | 이용허락범위 제한 없음 · 개발계정 하루 10,000번 (서울 25개 구 스냅샷 1번 받는 데 약 500번) · 출처 표기 |

### ② Nager.Date 공휴일
| 칸 | 내용 |
| --- | --- |
| ① 기본 주소 | `https://date.nager.at/api/v3` |
| ② 메뉴 | `/NextPublicHolidays/{나라코드}` — 오늘부터 1년 안의 공휴일 |
| ③ 옵션 | 나라코드 `KR` |
| ④ 응답 모양 | 배열 `[{ date: "2026-12-25", localName: "크리스마스", name: "Christmas Day", ... }]` |
| ⑤ 키 | 필요 없음 (화면을 열 때마다 바로 불러옴) |
| ⑥ 규칙 | 출처 "Holidays by Nager.Date" 표기 · 이름은 한국어 `localName` 사용 |

## 데이터 출처
- 자료: 소상공인시장진흥공단 상가(상권)정보 (공공데이터포털 data.go.kr)
- Holidays by Nager.Date
