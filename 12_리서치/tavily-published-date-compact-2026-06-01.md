# Tavily Published Date Compact

## 관찰

- Tavily `published_date`는 source metadata로 `ResearchSource.publishedAt`에 저장된다.
- 현재 코드는 `trim()`만 적용하므로 provider가 newline이나 긴 문자열을 주면 stdout JSON과 Markdown report metadata까지 그대로 전달될 수 있다.
- report 렌더러는 Markdown injection을 escape하지만, JSON findings는 agent와 CLI가 직접 소비한다.

## 제품 리스크

- 날짜 메타데이터가 여러 줄이면 source list와 후속 agent 요약에서 날짜가 구조처럼 보일 수 있다.
- 과도하게 긴 metadata 하나가 저장 report와 stdout JSON의 신호 대비 잡음을 키운다.
- title/snippet처럼 provider 텍스트 경계에서 짧고 안정적인 evidence field로 정규화하는 편이 일관적이다.

## 개선 원칙

- `published_date`는 whitespace를 한 칸으로 compact한다.
- compact된 값은 100자로 제한한다.
- 비어 있거나 문자열이 아닌 값은 기존처럼 생략한다.

## A/B 검증 기준

- Before: multi-line `published_date`가 줄바꿈과 전체 길이를 유지한 채 `publishedAt`에 들어간다.
- After: 같은 값은 한 줄로 compact되고 100자 이하로 제한된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "published dates"` 실패. `publishedAt`에 provider newline이 그대로 남았다.
- GREEN: 동일 명령 통과. `published_date`는 whitespace compact 후 100자로 제한되고, 비어 있거나 문자열이 아닌 값은 기존처럼 생략된다.
