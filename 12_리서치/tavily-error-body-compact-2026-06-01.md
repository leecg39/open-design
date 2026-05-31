# Tavily Error Body Compact

## 관찰

- Tavily가 non-OK 응답을 반환하면 `tavilySearch`는 body 앞 200자를 error message에 포함한다.
- 현재 body의 줄바꿈과 반복 공백은 그대로 남을 수 있다.
- provider 오류는 CLI stderr, daemon API error, agent-facing failure text로 전달될 수 있다.

## 제품 리스크

- multi-line provider 오류가 CLI 출력과 API error rendering을 불필요하게 흔든다.
- provider body가 verbose하면 실제 상태 코드와 핵심 이유를 빠르게 읽기 어렵다.
- 정상 research findings는 이미 source/title/snippet metadata를 compact하므로 오류 경계에도 같은 원칙이 필요하다.

## 개선 원칙

- 상태 코드는 그대로 유지한다.
- 오류 body는 whitespace를 한 칸으로 compact하고 200자로 제한한다.
- body가 공백뿐이면 기존처럼 `no body`로 표시한다.

## A/B 검증 기준

- Before: `429` body에 줄바꿈과 긴 반복 공백이 있으면 error message에도 그대로 노출된다.
- After: 같은 body는 한 줄 200자 이하 preview로 표시된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "error response bodies"` 실패. `TavilyError` message에 provider body의 줄바꿈과 앞 공백이 그대로 남았다.
- GREEN: 동일 명령 통과. error message는 상태 코드와 한 줄로 compact된 200자 body preview를 포함한다.
