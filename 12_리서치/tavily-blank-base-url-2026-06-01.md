# Tavily Blank Base URL

## 관찰

- `tavilySearch`는 `input.baseUrl || DEFAULT_BASE_URL`로 base URL을 정한다.
- 공백 문자열 base URL은 truthy라서 기본 Tavily endpoint로 fallback되지 않는다.
- 저장 config는 새 write 경로에서 trim되지만, direct helper 호출이나 오래된 config가 whitespace base URL을 넘길 수 있다.

## 제품 리스크

- 공백 base URL 하나가 `   /search` 같은 malformed fetch URL로 이어질 수 있다.
- 사용자는 provider/network 문제처럼 보이는 오류를 받지만 실제 원인은 비어 있는 설정값이다.
- API key trim과 같은 provider-boundary 방어선을 base URL에도 맞출 필요가 있다.

## 개선 원칙

- `baseUrl`은 사용 전 trim한다.
- trim 후 빈 문자열이면 `https://api.tavily.com` 기본값을 사용한다.
- non-empty custom base URL과 trailing slash 제거 동작은 유지한다.

## A/B 검증 기준

- Before: `baseUrl: '   '`가 `   /search` fetch URL로 전달된다.
- After: 같은 input은 `https://api.tavily.com/search`로 fallback된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "direct baseUrl"` 실패. blank base URL이 `   /search` fetch URL로 전달되었다.
- GREEN: 동일 명령 통과. blank base URL은 `https://api.tavily.com/search`로 fallback된다.
