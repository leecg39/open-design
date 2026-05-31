# Tavily direct blank query guard

## 관찰

- `searchResearch`는 query를 정리하고 빈 검색어를 막지만, 하위 어댑터인 `tavilySearch`는 직접 호출될 때 `input.query`를 그대로 provider 요청 본문에 넣는다.
- `tavilySearch`는 export된 함수라 테스트나 내부 재사용 경로에서 공백 query가 Tavily API까지 전달될 수 있다.

## 제품 리스크

- 공백 검색어는 provider 비용과 latency를 만들고, 사용자에게는 원인 파악이 어려운 외부 API 오류로 보일 수 있다.
- adapter 경계에서 API key, base URL, max results는 이미 방어하고 있으므로 query도 같은 수준의 일관성이 필요하다.

## 개선 원칙

- 검색어를 trim한 뒤 빈 값이면 fetch 전에 `Tavily query is required`로 실패한다.
- 유효한 검색어는 trim된 값만 provider 요청에 전달한다.
- 기능 확장은 하지 않고 adapter 입력 경계만 강화한다.

## A/B 기준

- A: 공백 query 직접 호출 시 provider fetch가 호출된다.
- B: 공백 query 직접 호출 시 provider fetch가 호출되지 않고 명확한 TavilyError가 반환된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "blank direct Tavily queries"` 실패. 기존 구현은 공백 query를 provider fetch까지 진행해 `Cannot read properties of undefined (reading 'ok')` 내부 오류를 노출했다.
- GREEN: 같은 focused test 통과. 공백 query는 fetch 전에 `Tavily query is required`로 실패하고 provider fetch는 호출되지 않는다.
- 전체 회귀: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts` 통과, 56 tests.
- 타입 검증: `pnpm --filter @open-design/daemon typecheck` 통과.
- 저장소 guard: `pnpm guard`는 기존 `factolink-ir-deck/assets/runtime.js` 잔여 JavaScript allowlist 문제로 실패. Test layout, E2E layout, Web test layout, Tools layout check는 통과.
