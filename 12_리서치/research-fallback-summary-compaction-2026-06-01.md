# Research Fallback Summary Compaction

## 관찰

- provider answer가 비어 있으면 Open Design은 source title/snippet으로 fallback summary를 만든다.
- 현재 fallback summary는 source title과 snippet의 내부 줄바꿈을 그대로 유지한다.
- source text는 external evidence라서 title/snippet 안의 `\n## Heading` 또는 `\n- item`이 summary 구조처럼 보일 수 있다.

## 제품 리스크

- JSON findings를 읽는 agent가 fallback summary를 provider-authored 구조화 요약으로 오인할 수 있다.
- report summary는 escape되더라도 JSON summary 자체의 가독성이 떨어진다.
- blank provider answer 상황에서 안전장치로 만든 fallback이 다시 구조 혼선을 만들 수 있다.

## 개선 원칙

- fallback summary의 source별 항목은 한 줄로 compact한다.
- title, snippet, raw excerpt의 내부 whitespace를 한 칸으로 접는다.
- source URL fallback과 전체 source cap 동작은 유지한다.

## A/B 검증 기준

- Before: title/snippet에 줄바꿈이 있으면 fallback summary 안에 `\n## Fake Heading` 또는 `\n- fake list item`이 남는다.
- After: 같은 source는 `[1] Injected title ## Fake Heading: First line - fake list item`처럼 한 줄 항목으로 렌더링된다.

## 실제 검증

- Before 구현 제거 상태:
  - `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "fallback summary source lines"` 실패.
  - 실패 출력에서 fallback summary가 source title/snippet 줄바꿈을 그대로 포함함을 확인.
- After fallback summary compaction 적용 상태:
  - 같은 focused run 통과.
