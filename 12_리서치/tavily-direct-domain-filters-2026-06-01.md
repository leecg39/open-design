# Tavily direct domain filter cleanup

## 관찰

- 상위 `searchResearch`는 include/exclude 도메인 필터를 정규화하지만, 직접 `tavilySearch` 호출은 배열을 그대로 Tavily body에 전달한다.
- 그 결과 공백, 중복, 대소문자 노이즈가 provider request에 남을 수 있다.

## 제품 리스크

- 노이즈가 있는 도메인 필터는 Tavily validation 오류나 불필요하게 넓거나 좁은 검색 결과를 만들 수 있다.
- 직접 어댑터 재사용 경로가 상위 research 경로보다 덜 예측 가능해진다.

## 개선 원칙

- 직접 어댑터에서 include/exclude 도메인 배열을 trim, lowercase, dedupe한다.
- 빈 배열이면 provider body에서 해당 필터를 제외한다.
- 도메인 형식 검증 같은 새 정책은 추가하지 않고, 전달되는 값의 노이즈 제거에만 제한한다.

## A/B 기준

- A: 직접 `tavilySearch` 도메인 필터에 공백/중복/대문자가 있으면 provider body에도 그대로 들어간다.
- B: provider body에는 trim, lowercase, dedupe된 도메인 필터만 들어간다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "direct Tavily domain filters"` 실패. 기존 직접 어댑터는 ` Example.com `, 빈 문자열, `OpenAI.com`을 provider body에 그대로 포함했다.
- GREEN: 같은 focused test 통과. provider body에는 `example.com`, `openai.com`, `docs.example.com`처럼 trim, lowercase, dedupe된 도메인만 포함된다.
- 전체 회귀: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts` 통과, 59 tests.
- 타입 검증: `pnpm --filter @open-design/daemon typecheck` 통과.
- 저장소 guard: `pnpm guard`는 기존 `factolink-ir-deck/assets/runtime.js` 잔여 JavaScript allowlist 문제로 실패. Test layout, E2E layout, Web test layout, Tools layout check는 통과.
