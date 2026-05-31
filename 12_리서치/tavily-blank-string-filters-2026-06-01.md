# Tavily direct blank string filters

## 관찰

- 직접 `tavilySearch` 호출은 query와 apiKey를 검증하지만, `country`, `startDate`, `endDate` 같은 선택 문자열 필터는 공백이어도 truthy 값으로 provider body에 포함될 수 있다.
- 상위 `searchResearch` 경로는 이런 필터를 정규화하지만, export된 어댑터 경로는 같은 안전장치를 갖고 있지 않다.

## 제품 리스크

- 공백 문자열 필터가 Tavily API에 전달되면 provider validation 오류가 발생하거나 검색 품질이 떨어질 수 있다.
- 내부 재사용자가 상위 경로와 직접 어댑터 경로의 동작 차이를 예측하기 어려워진다.

## 개선 원칙

- 직접 어댑터에서 선택 문자열 필터를 trim한다.
- trim 후 빈 값인 `country`, `startDate`, `endDate`는 provider body에서 제외한다.
- 날짜 형식 validation 같은 새 정책은 추가하지 않는다. 이번 변경은 공백 필터 제거에만 제한한다.

## A/B 기준

- A: 공백 `country`, `startDate`, `endDate`가 provider body에 포함된다.
- B: 공백 `country`, `startDate`, `endDate`가 provider body에서 빠진다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "blank direct Tavily string filters"` 실패. 기존 직접 어댑터는 공백 `country`를 provider body에 포함했다.
- GREEN: 같은 focused test 통과. 공백 `country`, `startDate`, `endDate`는 provider body에서 제외된다.
- 전체 회귀: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts` 통과, 58 tests.
- 타입 검증: `pnpm --filter @open-design/daemon typecheck` 통과.
- 저장소 guard: `pnpm guard`는 기존 `factolink-ir-deck/assets/runtime.js` 잔여 JavaScript allowlist 문제로 실패. Test layout, E2E layout, Web test layout, Tools layout check는 통과.
