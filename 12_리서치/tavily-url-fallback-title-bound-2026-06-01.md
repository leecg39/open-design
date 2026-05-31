# Tavily URL Fallback Title Bound

## 관찰

- Tavily result title이 비어 있으면 `tavilySearch`는 normalized URL을 `ResearchSource.title`로 사용한다.
- provider title은 300자로 제한하지만, fallback title에는 같은 제한이 적용되지 않는다.
- 긴 URL은 query/report/agent citation label을 불필요하게 키울 수 있다.

## 제품 리스크

- 제목이 없는 source 하나가 JSON findings와 Markdown report의 source label을 과도하게 늘린다.
- 긴 URL label은 실제 snippet과 citation metadata를 밀어내어 report scan quality를 낮춘다.
- citation URL 자체는 `source.url`에 보존되므로 title fallback을 줄여도 근거 추적성은 유지된다.

## 개선 원칙

- 실제 source URL은 그대로 보존한다.
- 사람이 읽는 fallback title만 기존 title 제한인 300자로 제한한다.
- provider title이 있는 경우 기존 whitespace compact와 length bound 동작을 유지한다.

## A/B 검증 기준

- Before: 빈 provider title과 긴 URL이 들어오면 `ResearchSource.title`이 URL 전체 길이로 반환된다.
- After: 같은 source의 `url`은 전체 보존되고, fallback `title`만 300자로 제한된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "fallback titles"` 실패. 빈 title의 URL fallback이 451자 전체 길이로 반환되었다.
- GREEN: 동일 명령 통과. fallback title은 300자로 제한되고 `source.url`은 전체 URL로 보존된다.
