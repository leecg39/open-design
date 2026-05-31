# Tavily Blank API Key

## 관찰

- `tavilySearch`는 `!input.apiKey`만 검사한다.
- 공백 문자열 API key는 truthy라서 `Authorization: Bearer    `로 provider fetch까지 진행될 수 있다.
- env key와 새 저장 config는 trim되지만, direct helper 호출이나 오래된 stored config가 whitespace key를 넘길 수 있다.

## 제품 리스크

- 설정 오류가 provider/network 오류처럼 보일 수 있다.
- 사용자에게 필요한 조치가 "키를 다시 설정"인데, 실패 메시지는 provider 호출 실패처럼 흐려진다.
- 잘못된 header를 외부 provider에 보내는 일을 불필요하게 만든다.

## 개선 원칙

- `tavilySearch` 진입점에서 API key를 trim한다.
- trim 후 빈 문자열이면 provider fetch 전에 `Tavily API key is not configured`를 던진다.
- trim된 key를 Authorization header에 사용한다.

## A/B 검증 기준

- Before: `apiKey: '   '`가 provider fetch까지 진행된다.
- After: 같은 input은 provider fetch 없이 설정 오류로 거절된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "blank direct"` 실패. 공백 key로 fetch가 호출된 뒤 mock response 없음 때문에 TypeError가 발생했다.
- GREEN: 동일 명령 통과. blank key는 fetch 전에 `Tavily API key is not configured`로 거절된다.
