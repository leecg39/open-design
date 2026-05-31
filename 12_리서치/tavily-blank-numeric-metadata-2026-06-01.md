# Tavily Blank Numeric Metadata

## 관찰

- Tavily diagnostics metadata의 `response_time`과 `usage.credits`는 `normalizeNonNegativeNumber`를 통해 숫자로 정규화된다.
- JavaScript에서 `Number('')`와 `Number('   ')`는 `0`이다.
- provider가 빈 문자열을 보내면 실제 0값이 아니라 누락된 metadata인데도 `0`으로 저장될 수 있다.

## 제품 리스크

- saved report metadata에 `Provider response time: 0` 또는 `Provider credits: 0`이 잘못 표시될 수 있다.
- agent가 provider 성능/비용 정보를 해석할 때 누락값과 실제 0값을 구분하지 못한다.
- CLI/JSON findings의 diagnostics 품질이 낮아진다.

## 개선 원칙

- blank string numeric metadata는 `undefined`로 취급해 생략한다.
- 실제 숫자 `0`이나 문자열 `"0"`은 기존처럼 유효한 0으로 유지한다.
- 음수, NaN, 비숫자 값은 기존처럼 생략한다.

## A/B 검증 기준

- Before: `response_time: " "`와 `usage.credits: ""`가 각각 0으로 저장된다.
- After: 같은 빈 문자열 metadata는 `responseTime`과 `usage`에서 생략된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "blank provider numeric"` 실패. `responseTime`이 `0`으로 저장되었다.
- GREEN: 동일 명령 통과. blank string numeric metadata는 생략되고, 실제 numeric zero 값은 기존 경로를 유지한다.
