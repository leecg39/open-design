# Tavily Invalid Results List

## 관찰

- `tavilySearch`는 `json.results`가 array가 아니면 빈 배열로 처리한다.
- 이 경우 provider 응답 shape가 깨졌는데도 `searchResearch`는 `no sources found` 계열 404로 오해할 수 있다.
- 이미 individual result entry가 malformed인 경우는 discard count로 처리하지만, top-level results list shape는 더 근본적인 provider contract 문제다.

## 제품 리스크

- 실제 provider payload 오류가 사용자에게 "검색 결과 없음"처럼 보인다.
- API/CLI caller가 query 품질 문제와 provider schema 문제를 구분하기 어렵다.
- 후속 agent가 같은 검색을 반복하거나 잘못된 리서치 결론을 낼 수 있다.

## 개선 원칙

- `results`가 없거나 정상 배열인 경우 기존 동작을 유지한다.
- `results`가 존재하지만 배열이 아니면 provider failure로 명확히 보고한다.
- malformed individual result entry discard 동작은 그대로 유지한다.

## A/B 검증 기준

- Before: `results: { ... }` provider response는 빈 결과처럼 흘러가 `NO_RESEARCH_SOURCES`가 될 수 있다.
- After: 같은 response는 `Tavily returned invalid results list` provider failure로 표면화된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "results lists"` 실패. `results`가 object인 provider response가 `NO_RESEARCH_SOURCES` 404로 오인되었다.
- GREEN: 동일 명령 통과. malformed top-level results list는 `Tavily returned invalid results list` provider failure로 보고된다.
