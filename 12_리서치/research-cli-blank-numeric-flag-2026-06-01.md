# Research CLI Blank Numeric Flag

## 관찰

- `parseOptionalNumberFlag`는 숫자 플래그 값을 `Number(value)`로 변환한다.
- JavaScript에서 `Number('')`와 `Number('   ')`는 `0`이다.
- `od research search --min-score=` 또는 공백 값이 들어온 경우 사용자는 값을 빠뜨렸지만 CLI는 0으로 해석할 수 있다.

## 제품 리스크

- agent가 command string을 만들 때 빈 equals-form 플래그가 섞이면 잘못된 요청이 조용히 통과할 수 있다.
- `minScore: 0`은 유효한 값이므로 사용자가 실제로 0을 지정한 경우와 누락한 경우를 구분할 수 없다.
- 리서치 입력 오류는 daemon 호출 전에 CLI에서 빠르게 설명하는 편이 디버깅 비용이 낮다.

## 개선 원칙

- `undefined`는 기존처럼 optional flag 미지정으로 허용한다.
- `''` 또는 whitespace-only 값은 finite number가 아니라 missing value로 거부한다.
- 실제 숫자 문자열인 `0`, `0.5`, `50`은 기존처럼 허용한다.

## A/B 검증 기준

- Before: `parseOptionalNumberFlag('', 'min-score')`가 `0`을 반환한다.
- After: 빈 문자열과 whitespace-only 값은 `flag --min-score requires a finite number`로 실패한다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-cli.test.ts -t "optional numeric"` 실패. 빈 문자열 입력이 throw 없이 통과했다.
- GREEN: 동일 명령 통과. 빈 문자열과 whitespace-only 값은 실패하고, `0`, `0.5`, `50`은 기존처럼 숫자로 파싱된다.
