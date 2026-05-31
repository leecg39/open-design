# Research Summary Line Preservation

## 관찰

- Research Markdown report는 provider summary를 `escapeMarkdownText`로 처리한다.
- 이 함수는 모든 whitespace를 한 칸으로 접기 때문에 summary의 문단, 줄 구분, bullet-like 구조가 사라진다.
- 동시에 summary는 untrusted evidence라서 줄 구조를 살리더라도 Markdown heading/list/control syntax는 계속 escape되어야 한다.

## 제품 리스크

- deep/medium research에서 provider answer가 여러 단락일 때 report가 한 줄로 뭉쳐 가독성이 떨어진다.
- 사용자는 report를 그대로 공유하거나 후속 작업 입력으로 쓰기 때문에 summary 구조 손실은 리서치 품질 손실로 이어진다.
- 단순히 Markdown을 허용하면 source/prompt injection 위험이 커진다.

## 개선 원칙

- summary block의 줄바꿈은 보존한다.
- 각 줄은 기존 Markdown text escaping을 적용해 heading, list, link, 강조 문법이 구조를 바꾸지 못하게 한다.
- metadata, title, source snippets처럼 한 줄이어야 하는 필드는 기존 단일 줄 escaping을 유지한다.

## A/B 검증 기준

- Before: `Provider answer\n## Injected Summary\n**bold claim**`가 `Provider answer \#\# Injected Summary \*\*bold claim\*\*`처럼 한 줄로 렌더링된다.
- After: 같은 summary가 줄바꿈을 유지하되 `##`와 `**`는 escape되어 report 구조를 바꾸지 않는다.

## 실제 검증

- Before 구현 제거 상태:
  - `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts -t "provider summaries"` 실패.
  - 실패 출력에서 summary가 `Provider answer \#\# Injected Summary \*\*bold claim\*\*` 한 줄로 렌더링됨을 확인.
- After block escaping 적용 상태:
  - 같은 focused run 통과.
