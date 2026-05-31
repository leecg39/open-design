# Tavily Malformed Results Discard

## 관찰

- Tavily 응답의 `results`는 외부 provider 데이터이므로 배열 안에 `null`, 문자열, 숫자 같은 malformed item이 섞일 수 있다.
- 현재 `tavilySearch`는 각 result를 object로 가정하고 `r.url`을 바로 읽는다.
- URL이 잘못된 object는 discard 처리되지만, object가 아닌 item은 discard 이전에 예외를 만들 수 있다.

## 제품 리스크

- usable source가 함께 들어 있어도 malformed item 하나 때문에 전체 `/search`가 provider failure로 끝날 수 있다.
- 사용자는 저장 가능한 research report 대신 502 오류를 보게 된다.
- 이미 `discardedSourceCount`가 있으므로 malformed provider item도 같은 품질 필터링 경로로 집계하는 편이 일관적이다.

## 개선 원칙

- `results` item이 object가 아니면 discarded result로 집계하고 다음 item을 계속 처리한다.
- valid source가 하나라도 있으면 검색 결과를 정상 반환한다.
- 기존 invalid URL, duplicate URL discard 동작은 유지한다.

## A/B 검증 기준

- Before: `results: [null, "bad", validSource]` 응답은 `r.url` 접근에서 예외가 나 전체 검색이 실패한다.
- After: malformed item은 `discardedSourceCount`에 포함되고 valid source는 정상 반환된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "malformed provider result"` 실패. `Cannot read properties of null (reading 'url')`이 `RESEARCH_PROVIDER_FAILED`로 전파되었다.
- GREEN: 동일 명령 통과. malformed item 3개와 invalid URL 1개가 `discardedSourceCount: 4`로 집계되고 valid source 1개가 반환되었다.
