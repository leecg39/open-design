# Research Report Invalid FetchedAt Handling

## 관찰

- `buildResearchMarkdownReport`는 `fetchedAt`이 finite number이면 바로 `new Date(fetchedAt).toISOString()`을 호출한다.
- `1e100`처럼 숫자이지만 Date 범위를 벗어난 값은 `toISOString()`에서 `RangeError`를 던진다.
- 이 예외는 CLI의 `--save-report` 흐름에서 리포트 저장 실패로 이어진다.

## 제품 리스크

- 리서치 저장은 실패해도 가능한 한 근거 파일을 남기는 쪽이 사용자에게 유리하다.
- provider나 중간 프록시가 이상한 timestamp를 보내도 전체 리포트 생성이 중단되면 A/B 비교와 후속 작업 근거가 사라진다.
- 이미 non-finite 값은 `unknown`으로 처리하므로 out-of-range timestamp도 같은 정책으로 다루는 것이 자연스럽다.

## 개선 원칙

- 유효한 timestamp는 기존 ISO 문자열을 유지한다.
- finite number라도 Date 범위를 벗어나면 `unknown`으로 기록한다.
- stdout JSON과 원본 findings 구조는 바꾸지 않는다.

## A/B 검증 기준

- Before: `fetchedAt: 1e100` 응답을 저장하면 Markdown 생성이 예외로 실패한다.
- After: 같은 응답도 저장되고 Metadata에는 `- Fetched: unknown`이 기록된다.
