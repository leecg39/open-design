# Tavily base URL validation

## 배경

`apps/daemon/src/research/tavily.ts`의 직접 Tavily 호출 경로는 `baseUrl`을 `trim()`하고 `/search`를 붙이는 방식이었다. 이 상태에서는 `ftp://example.com` 같은 비HTTP 엔드포인트가 들어와도 설정 오류로 멈추지 않고 `fetch` 이후 내부 오류처럼 보일 수 있다.

## A/B 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "non-http direct Tavily base URLs"` 실패.
- 실패 내용: 기대한 `Tavily base URL must use http or https`가 아니라 `Cannot read properties of undefined (reading 'ok')`가 발생했다.
- 개선안: Tavily base URL을 `URL`로 파싱하고 `http:`/`https:`만 허용한 뒤 query/hash를 제거해 `/search`를 붙인다.
- GREEN: 같은 테스트 통과. 비HTTP URL은 provider fetch 전에 차단된다.

## 반영 기준

리서치 기능의 설정 오류는 네트워크 장애나 내부 예외가 아니라 사용자가 고칠 수 있는 명확한 오류여야 한다. 이번 변경은 잘못된 provider endpoint를 조기에 차단해 디버깅 가능성과 실패 품질을 높인다.
