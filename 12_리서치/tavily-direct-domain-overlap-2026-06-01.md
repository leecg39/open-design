# Tavily direct overlapping domain filters

## 관찰

- 상위 `searchResearch`는 includeDomains와 excludeDomains가 겹치면 exclude 쪽 항목을 제거한다.
- 직접 `tavilySearch` 호출은 정리된 도메인 배열을 만들더라도 include/exclude 충돌을 그대로 provider body에 보낼 수 있다.

## 제품 리스크

- 같은 도메인을 include와 exclude에 동시에 보내면 provider가 애매하게 해석하거나 validation 오류를 낼 수 있다.
- 상위 research 경로와 직접 어댑터 경로의 필터 의미가 달라진다.

## 개선 원칙

- 직접 어댑터에서도 includeDomains에 있는 도메인은 excludeDomains에서 제거한다.
- includeDomains는 그대로 유지하고, excludeDomains만 충돌 제거한다.
- 경고나 새 반환 필드는 만들지 않는다.

## A/B 기준

- A: 직접 `tavilySearch` 호출에서 같은 도메인이 include/exclude body에 동시에 들어간다.
- B: provider body의 excludeDomains에서 includeDomains와 겹치는 도메인이 제거된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "overlapping direct Tavily exclude domains"` 실패. 기존 직접 어댑터는 `example.com`을 includeDomains와 excludeDomains에 동시에 포함했다.
- GREEN: 같은 focused test 통과. provider body의 excludeDomains에서 includeDomains와 겹치는 `example.com`이 제거된다.
- 전체 회귀: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts` 통과, 60 tests.
- 타입 검증: `pnpm --filter @open-design/daemon typecheck` 통과.
- 저장소 guard: `pnpm guard`는 기존 `factolink-ir-deck/assets/runtime.js` 잔여 JavaScript allowlist 문제로 실패. Test layout, E2E layout, Web test layout, Tools layout check는 통과.
