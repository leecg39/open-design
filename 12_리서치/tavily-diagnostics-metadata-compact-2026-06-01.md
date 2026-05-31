# Tavily Diagnostics Metadata Compact

## 관찰

- Tavily `request_id`와 `auto_parameters.search_depth`는 provider diagnostics metadata로 JSON findings와 Markdown report metadata에 노출된다.
- 현재 두 값은 `trim()` 또는 `trim().slice()`만 적용되어 내부 줄바꿈을 보존할 수 있다.
- report renderer는 Markdown 구조를 escape하지만, stdout JSON과 agent 후처리는 diagnostics 문자열을 직접 읽는다.

## 제품 리스크

- request ID나 selected search depth가 여러 줄이면 diagnostics metadata가 report 구조처럼 보일 수 있다.
- provider diagnostics는 추적/디버깅용 짧은 값이어야 하므로 긴 문자열과 줄바꿈은 신호 품질을 낮춘다.
- 이미 source text field를 compact하고 있으므로 diagnostics metadata도 같은 provider-boundary 정책을 적용해야 한다.

## 개선 원칙

- `request_id`는 whitespace를 한 칸으로 compact하고 120자로 제한한다.
- `auto_parameters.search_depth`는 whitespace를 한 칸으로 compact하고 기존 40자 제한을 유지한다.
- 빈 값은 기존처럼 생략한다.

## A/B 검증 기준

- Before: multi-line diagnostics metadata가 줄바꿈을 유지한 채 `requestId`와 `selectedParameters.searchDepth`에 들어간다.
- After: 같은 값은 한 줄로 compact되고 각각 120자/40자 이하로 제한된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "diagnostics metadata"` 실패. `requestId`에 provider newline이 그대로 남았다.
- GREEN: 동일 명령 통과. `requestId`는 whitespace compact 후 120자, `selectedParameters.searchDepth`는 whitespace compact 후 40자로 제한된다.
