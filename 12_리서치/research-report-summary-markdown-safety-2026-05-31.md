# Research Report Summary Markdown Safety

## 관찰

- 저장 리포트의 Summary 본문은 provider가 반환한 `findings.summary`를 그대로 넣는다.
- provider summary는 외부 검색 결과를 바탕으로 생성된 텍스트이며, Markdown heading, list, link syntax를 포함할 수 있다.
- 출처 텍스트와 query는 escape되었지만, Summary는 아직 리포트 구조를 바꿀 수 있다.

## 제품 리스크

- Summary는 리포트 상단에서 가장 먼저 읽히는 해석 영역이다.
- provider summary에 `##` 같은 문자가 포함되면 실제 리포트 섹션처럼 보일 수 있다.
- 저장 리포트의 섹션 구조가 흔들리면 후속 검토와 A/B 비교가 어려워진다.

## 개선 원칙

- Summary 본문도 외부 증거 텍스트로 보고 단일 라인으로 접은 뒤 Markdown 제어 문자를 escape한다.
- Summary 섹션 제목과 fallback 문구는 유지한다.
- Raw Evidence와 Sources처럼 근거 추적이 필요한 섹션의 구조는 그대로 둔다.

## A/B 검증 기준

- Before: provider summary의 `## Injected`가 저장 리포트 안에서 새 섹션처럼 보일 수 있다.
- After: 같은 텍스트가 `\#\# Injected`처럼 Summary 본문 안의 일반 텍스트로 남는다.
