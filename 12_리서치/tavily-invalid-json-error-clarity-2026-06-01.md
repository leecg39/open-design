# Tavily Invalid JSON Error Clarity

## 관찰

- `tavilySearch`는 HTTP 200 응답을 받은 뒤 `resp.json()`을 바로 호출한다.
- provider body가 JSON이 아니면 `SyntaxError`가 직접 발생한다.
- `searchResearch`는 TavilyError가 아닌 예외를 `research failed: ...`로 감싸므로 사용자에게 raw parser message가 노출될 수 있다.

## 제품 리스크

- agent와 CLI는 provider 설정 문제인지, 네트워크 문제인지, 응답 body 형식 문제인지 빠르게 구분하기 어렵다.
- raw JSON parser message는 provider boundary의 원인을 충분히 설명하지 못한다.
- `/search` fallback 안내나 사용자 보고에서 정확한 실패 분류가 흐려진다.

## 개선 원칙

- HTTP 200 이후 JSON parsing 실패는 `Tavily returned invalid JSON`으로 보고한다.
- 기존 HTTP non-OK, timeout, abort error wording은 유지한다.
- TavilyError로 변환해 `searchResearch`가 raw parser internals를 감싸지 않게 한다.

## A/B 검증 기준

- Before: invalid JSON body는 `research failed: ...` 형태의 raw parser error로 전파된다.
- After: 같은 응답은 `Tavily returned invalid JSON` provider failure로 전파된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "invalid Tavily JSON"` 실패. invalid JSON body가 `research failed: Unexpected...` 형태로 전파되었다.
- GREEN: 동일 명령 통과. invalid JSON body는 `Tavily returned invalid JSON` 메시지와 `RESEARCH_PROVIDER_FAILED` 코드로 보고된다.
