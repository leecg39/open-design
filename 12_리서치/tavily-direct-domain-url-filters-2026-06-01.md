# Tavily direct domain URL filters

## 배경

상위 `searchResearch` 경로는 `includeDomains`/`excludeDomains`에 URL, path, port가 섞여도 도메인만 추출한다. 반면 하위 `tavilySearch` helper는 domain filter를 `trim().toLowerCase()`만 해서 `https://docs.example.com/path`, `example.com:443`, `not a domain` 같은 값을 provider body에 그대로 넣을 수 있었다.

## A/B 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "cleans direct Tavily domain filters"` 실패.
- 실패 내용: `include_domains`에 `https://docs.example.com/platform?utm=1`, `example.com:443`, `not a domain`이 그대로 들어갔다.
- 개선안: 직접 Tavily helper에도 URL host 추출, port/path/query/hash 제거, 도메인 형식 검증, 중복 제거를 적용한다.
- GREEN: 같은 테스트 통과. provider body에는 `example.com`, `docs.example.com`, `openai.com`, `news.example.com`처럼 정규화된 도메인만 들어간다.

## 반영 기준

내부 helper라도 provider 요청 직전의 마지막 방어선이다. 상위 API와 하위 Tavily 호출의 정규화 기준을 맞추면 future call site가 생겨도 provider 오류와 검색 품질 저하를 줄일 수 있다.
