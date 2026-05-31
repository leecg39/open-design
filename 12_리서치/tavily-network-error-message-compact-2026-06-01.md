# Tavily Network Error Message Compact

## 관찰

- Tavily fetch가 네트워크 오류를 던지면 `tavilySearch`는 error message를 `Tavily request failed:` 뒤에 그대로 붙인다.
- non-OK response body는 compact되지만, thrown network error message에는 같은 처리가 없다.
- 네트워크 계층 오류도 CLI stderr, daemon API error, agent-facing failure text로 그대로 전달된다.

## 제품 리스크

- multi-line DNS/proxy/TLS 오류가 JSON error message와 CLI 출력 구조를 흐트러뜨릴 수 있다.
- provider 자체 오류와 네트워크 오류의 표시 품질이 달라져 사용자가 실패 원인을 빠르게 비교하기 어렵다.
- 긴 오류 메시지가 후속 agent prompt나 saved diagnostics를 불필요하게 키울 수 있다.

## 개선 원칙

- timeout과 abort의 명시 메시지는 유지한다.
- 일반 fetch 실패 메시지는 whitespace compact 후 200자로 제한한다.
- 원인을 알 수 없는 경우에도 빈 문자열 대신 읽을 수 있는 fallback을 둔다.

## A/B 검증 기준

- Before: fetch가 줄바꿈과 긴 반복 공백이 있는 Error message를 던지면 그대로 `Tavily request failed:`에 노출된다.
- After: 같은 오류는 한 줄 200자 이하 preview로 표시된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "network error messages"` 실패. `Tavily request failed:` 뒤에 fetch Error message의 줄바꿈과 긴 반복 공백이 그대로 남았다.
- GREEN: 동일 명령 통과. network error message는 한 줄 200자 이하 preview로 compact된다.
