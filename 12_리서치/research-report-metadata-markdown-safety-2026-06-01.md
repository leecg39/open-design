# Research Report Metadata Markdown Safety

## 관찰

- 저장 리포트의 query, summary, source title/snippet/raw evidence는 Markdown escape가 적용되어 있다.
- 하지만 일부 메타데이터 문자열은 아직 그대로 렌더링된다.
- 예: `warnings`, provider `requestId`, provider-selected `searchDepth`, source `publishedAt`.
- 이 값들은 대체로 정상 문자열이지만 provider 또는 외부 결과에서 온 값이므로 Markdown 구조를 바꿀 가능성을 완전히 배제할 수 없다.

## 제품 리스크

- 리서치 리포트의 Metadata와 Warnings는 사용자가 품질과 필터링 상태를 판단하는 근거다.
- 메타데이터에 줄바꿈, heading, link-like 문자열이 섞이면 리포트의 섹션 구조와 경고 목록이 흐려진다.
- "근거 파일"로 오래 보존되는 산출물에서는 본문뿐 아니라 메타데이터도 같은 안전 규칙을 따라야 한다.

## 개선 원칙

- 외부 또는 provider 유래 문자열 메타데이터는 `escapeMarkdownText`를 거친다.
- 정규화된 enum, 숫자, 내부 고정 문구는 기존 출력 형태를 유지한다.
- 기존 정상 리포트 출력은 거의 변하지 않아야 한다.

## A/B 검증 기준

- Before: warning `> injected warning` 또는 `publishedAt`의 `## Injected`가 Markdown 구조처럼 보일 수 있다.
- After: 같은 값이 `\> injected warning`, `\#\# Injected`처럼 일반 텍스트로 남는다.
