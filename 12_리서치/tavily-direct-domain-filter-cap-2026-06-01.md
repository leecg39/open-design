# Tavily direct domain filter cap

## 배경

상위 `searchResearch`는 `includeDomains`와 `excludeDomains`를 각각 20개로 제한한다. 하지만 하위 `tavilySearch` helper는 직접 호출될 때 도메인 필터 개수를 제한하지 않아 future call site가 큰 도메인 목록을 provider body에 그대로 보낼 수 있었다.

## A/B 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "caps direct Tavily domain filters"` 실패.
- 실패 내용: `include_domains`와 `exclude_domains`가 각각 25개 그대로 전달됐다.
- 개선안: 직접 Tavily helper의 domain filter 정규화에도 20개 cap을 적용한다.
- GREEN: 같은 테스트 통과. provider body에는 각 domain filter가 최대 20개까지만 들어간다.

## 반영 기준

provider 호출 직전의 helper도 상위 API와 같은 제한을 지켜야 한다. 이 정렬은 과도한 요청 payload와 provider-side validation 실패 가능성을 줄이고, future call site에도 같은 안전 경계를 제공한다.
