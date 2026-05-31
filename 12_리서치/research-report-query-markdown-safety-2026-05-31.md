# Research Report Query Markdown Safety

## 관찰

- 저장 리포트는 `# Research: ${query}`와 `- Query: ${query}`에 검색 쿼리를 그대로 넣는다.
- 검색 쿼리는 사용자가 입력한 문자열이며, 복사한 여러 줄 문장이나 Markdown 문자를 포함할 수 있다.
- 쿼리에 줄바꿈과 `##`가 포함되면 리포트 제목 또는 메타데이터 주변에 의도하지 않은 Markdown 헤더가 생길 수 있다.

## 제품 리스크

- 리포트의 제목과 Metadata는 문서 구조의 기준점이다.
- 쿼리가 구조를 깨면 이후 Summary, Sources, Raw Evidence의 신뢰성과 스캔 가능성이 떨어진다.
- 사용자가 긴 질문형 검색어를 그대로 넣는 워크플로에서는 충분히 발생 가능한 문제다.

## 개선 원칙

- 저장 리포트의 제목과 Query 메타데이터에는 단일 라인으로 정리된 쿼리를 사용한다.
- Markdown 제어 문자는 일반 텍스트로 보이도록 escape한다.
- 검색 실행에 쓰이는 실제 query 값, slug 생성, API 응답 계약은 바꾸지 않는다.

## A/B 검증 기준

- Before: `Market\n## Injected` 같은 쿼리가 저장 리포트에 새 헤더처럼 들어갈 수 있다.
- After: 같은 쿼리가 `Market \#\# Injected`처럼 한 줄 텍스트로 표시된다.
