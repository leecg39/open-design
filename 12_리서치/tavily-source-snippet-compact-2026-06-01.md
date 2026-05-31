# Tavily Source Snippet Compact

## 관찰

- Tavily `content`는 source snippet으로 저장된다.
- 현재 snippet은 `trim().slice(0, 800)`만 적용하므로 내부 줄바꿈과 목록형 whitespace가 JSON findings에 남을 수 있다.
- Markdown report는 `clip()`에서 whitespace를 compact하지만, stdout JSON과 agent fallback 소비자는 원본 snippet을 직접 볼 수 있다.

## 제품 리스크

- source snippet 줄바꿈이 JSON을 읽는 agent의 key finding 합성이나 CLI 후처리에서 불필요한 구조처럼 보일 수 있다.
- provider snippet은 raw content가 아니므로 줄 보존보다 compact evidence line이 더 중요하다.
- title, fallback summary, report key findings와 같은 한 줄 evidence 원칙을 provider boundary에도 맞출 필요가 있다.

## 개선 원칙

- source snippet은 whitespace를 한 칸으로 compact한다.
- 기존 800자 제한은 유지한다.
- raw content는 별도 evidence 필드이므로 기존 줄/길이 정책을 바꾸지 않는다.

## A/B 검증 기준

- Before: multi-line `content`가 줄바꿈을 유지한 채 `ResearchSource.snippet`에 들어간다.
- After: 같은 content는 한 줄로 compact되고 800자 이하로 제한된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "source snippets"` 실패. multi-line content의 `\n`이 그대로 `ResearchSource.snippet`에 남았다.
- GREEN: 동일 명령 통과. snippet은 whitespace compact 후 800자로 제한되며 raw content 필드는 변경하지 않았다.
