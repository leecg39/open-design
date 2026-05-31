# Tavily Source Title Bound

## 관찰

- Tavily source title은 외부 provider 텍스트다.
- 현재 `tavilySearch`는 `r.title.trim()`만 적용하고 내부 줄바꿈이나 과도한 길이는 그대로 둔다.
- report 렌더러는 Markdown injection을 escape하지만, JSON findings 자체의 title은 agent/CLI/다른 UI가 직접 소비한다.

## 제품 리스크

- 긴 title 하나가 saved report와 stdout JSON을 불필요하게 키울 수 있다.
- title 줄바꿈이 agent의 source 목록 출력이나 후속 요약을 흐트러뜨릴 수 있다.
- snippet/raw content/image description에는 제한이 있으므로 source title도 provider 경계에서 같은 원칙을 적용해야 한다.

## 개선 원칙

- provider title은 whitespace를 한 칸으로 compact한다.
- compact된 title은 300자로 제한한다.
- title이 비어 있으면 기존처럼 normalized URL을 fallback title로 사용한다.

## A/B 검증 기준

- Before: 긴 multi-line provider title이 줄바꿈과 전체 길이를 유지한 채 `ResearchSource.title`에 들어간다.
- After: 같은 title은 한 줄로 compact되고 300자 이하로 제한된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "source titles"` 실패. multi-line title의 `\n`이 그대로 `ResearchSource.title`에 남았다.
- GREEN: 동일 명령 통과. title은 whitespace compact 후 300자로 제한되며, 비어 있지 않은 정상 title fallback 동작은 유지된다.
