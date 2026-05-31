# Research Report Image URL Escaping

## 관찰

- 리서치 리포트는 source title, summary, raw evidence, image description을 Markdown escape한다.
- 그러나 `Visual References`와 `Source-Level Visual Evidence`의 image URL은 그대로 문자열로 출력한다.
- daemon provider 경로에서는 URL 정규화를 하지만, 리포트 렌더러는 저장 전 마지막 방어선이다.

## 제품 리스크

- 외부 JSON 또는 테스트/프록시 응답에 줄바꿈과 Markdown heading 문자가 섞인 image URL이 들어오면 리포트 구조가 흔들릴 수 있다.
- visual evidence는 디자인 작업에서 그대로 참조되므로, 표시 텍스트가 가짜 섹션을 만들면 근거 파일 신뢰도가 떨어진다.

## 개선 원칙

- URL 값은 사람이 볼 수 있는 텍스트로 유지하되 Markdown 제어 문자를 escape한다.
- 기존 정상 URL 출력은 가능한 한 그대로 유지한다.
- image description의 기존 escape 정책은 유지한다.

## A/B 검증 기준

- Before: image URL에 `\n## Injected`가 있으면 리포트에 새 heading처럼 보일 수 있다.
- After: 같은 값은 `\#\# Injected`로 escape되어 bullet 줄 안에 남는다.
