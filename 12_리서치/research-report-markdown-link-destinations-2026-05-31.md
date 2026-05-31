# Research Report Markdown Link Destinations

## 관찰

- 저장 리포트의 Sources 섹션은 `[Title](https://...)` 형식으로 링크를 만든다.
- URL path에 괄호가 포함되면 일부 Markdown 파서가 `)`를 링크 종료 문자로 해석할 수 있다.
- Tavily에서 온 URL은 HTTP/HTTPS로 정규화되지만, 실제 웹 URL에는 괄호가 포함될 수 있다.

## 제품 리스크

- 저장 리포트의 핵심 가치는 citation 번호와 원문 링크를 나중에 다시 열 수 있다는 점이다.
- URL 링크가 렌더링 중간에서 끊기면 사용자는 출처를 재검증하기 어렵다.
- 괄호가 포함된 URL은 드물지만 논문, 위키, 문서 페이지에서 충분히 발생할 수 있다.

## 개선 원칙

- Markdown 링크 destination을 `<...>` 형식으로 감싸 괄호가 포함된 URL도 안정적으로 렌더링되게 한다.
- 링크 텍스트와 도메인 메타데이터는 기존 형태를 유지한다.
- URL 내부의 `>`는 `%3E`로 치환해 angle destination을 닫지 못하게 한다.

## A/B 검증 기준

- Before: `1. [Title](https://example.com/a_(b))`처럼 URL의 `)`가 링크 경계를 흔들 수 있다.
- After: `1. [Title](<https://example.com/a_(b)>)`처럼 destination 전체가 명시된다.
