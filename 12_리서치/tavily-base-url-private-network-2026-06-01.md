# Tavily base URL private network guard

## 배경

OpenAI-compatible provider 연결 테스트와 proxy 경로는 loopback을 제외한 사설망 base URL을 차단한다. Tavily 실제 검색 호출 경로는 같은 `baseUrl` 설정을 사용하면서도 `http://192.168.0.10` 같은 사설망 endpoint를 별도로 막지 않았다.

## A/B 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "private-network direct Tavily base URLs"` 실패.
- 실패 내용: 기대한 차단 오류 대신 `Cannot read properties of undefined (reading 'ok')`가 발생했고, provider fetch가 호출될 수 있는 흐름이었다.
- 개선안: `@open-design/contracts/api/connectionTest`의 loopback/blocked-host 판정 함수를 Tavily base URL 정규화에 재사용한다.
- GREEN: 같은 테스트 통과. loopback이 아닌 사설망 host는 fetch 전에 차단된다.

## 반영 기준

외부 research provider endpoint는 로컬/사설망 리소스 탐색 수단이 되면 안 된다. 기존 provider 연결 정책과 Tavily 검색 경로를 맞춰 SSRF 계열 위험과 애매한 네트워크 실패를 줄인다.
