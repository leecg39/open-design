# Tavily base URL credentials

## 배경

Tavily provider 인증은 `Authorization: Bearer ...` 헤더로 처리한다. 그런데 직접 호출 경로의 `baseUrl`이 `https://user:pass@example.com`처럼 자격 정보를 포함해도 별도 검증 없이 `/search` 호출로 이어졌다.

## A/B 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "direct Tavily base URL credentials"` 실패.
- 실패 내용: 기대한 설정 오류 대신 `Cannot read properties of undefined (reading 'ok')`가 발생했고, provider fetch가 호출될 수 있는 흐름이었다.
- 개선안: Tavily base URL 정규화 단계에서 `username` 또는 `password`가 있으면 즉시 `Tavily base URL must not include credentials`로 실패시킨다.
- GREEN: 같은 테스트 통과. 자격 정보가 포함된 endpoint는 fetch 전에 차단된다.

## 반영 기준

provider endpoint 설정은 URL 자격 정보를 인증 수단으로 쓰지 않는다. 잘못 섞인 자격 정보를 초기에 거부하면 민감 정보가 네트워크/오류 경로로 흐를 가능성을 줄이고, 사용자는 수정 가능한 설정 오류를 바로 확인할 수 있다.
