# Tavily direct query length bound

## 관찰

- `searchResearch`는 provider 호출 전에 query를 trim하고 1000자로 제한한다.
- export된 하위 어댑터 `tavilySearch`는 직접 호출될 때 같은 길이 제한을 적용하지 않는다.

## 제품 리스크

- 초장문 query가 직접 어댑터 경로로 들어오면 provider 요청 본문이 불필요하게 커진다.
- 상위 경로와 하위 어댑터의 입력 경계가 달라져 테스트나 내부 재사용에서 예측하기 어려운 동작이 생긴다.

## 개선 원칙

- `tavilySearch`도 query를 trim한 뒤 1000자로 제한한다.
- 빈 query guard는 유지한다.
- 별도 신규 옵션이나 warning surface는 만들지 않는다. 직접 어댑터는 반환 타입에 warnings가 없으므로 provider로 보내는 본문만 안전하게 제한한다.

## A/B 기준

- A: 직접 `tavilySearch`에 1000자를 넘는 query를 전달하면 provider body에도 초장문 query가 들어간다.
- B: 직접 `tavilySearch`에 1000자를 넘는 query를 전달해도 provider body의 query는 1000자로 제한된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "bounds long direct Tavily queries"` 실패. 기존 직접 어댑터는 provider body query 길이가 1000자가 아니라 1439자였다.
- GREEN: 같은 focused test 통과. 직접 어댑터 provider body query가 trim 후 1000자로 제한된다.
- 전체 회귀: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts` 통과, 57 tests.
- 타입 검증: `pnpm --filter @open-design/daemon typecheck` 통과.
- 저장소 guard: `pnpm guard`는 기존 `factolink-ir-deck/assets/runtime.js` 잔여 JavaScript allowlist 문제로 실패. Test layout, E2E layout, Web test layout, Tools layout check는 통과.
