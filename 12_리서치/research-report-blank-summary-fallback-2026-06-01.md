# Research Report Blank Summary Fallback

## 관찰

- `buildResearchMarkdownReport`는 `findings.summary`가 truthy이면 summary block을 렌더링한다.
- `summary: '  \n  '` 같은 whitespace-only 값은 truthy지만 `escapeMarkdownBlock` 후 빈 문자열이 된다.
- Tavily answer normalization은 provider answer를 trim하지만, report helper는 direct findings 입력도 받을 수 있다.

## 제품 리스크

- 저장된 Markdown report의 `## Summary` 섹션이 비어 보일 수 있다.
- agent나 CLI 외부 caller가 direct findings를 넘길 때 provider summary가 없는 상태를 명확히 표현하지 못한다.
- research report는 재사용 가능한 산출물이므로 빈 summary 대신 명시적 fallback 문구가 필요하다.

## 개선 원칙

- summary block escaping 후에도 내용이 없으면 `(No provider summary.)`를 렌더링한다.
- non-empty multi-line summary는 기존 줄 보존/Markdown escaping 동작을 유지한다.
- source/key findings 렌더링은 변경하지 않는다.

## A/B 검증 기준

- Before: whitespace-only summary는 `## Summary`와 `## Key Findings` 사이가 비어 있다.
- After: 같은 입력은 `(No provider summary.)`를 렌더링한다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts -t "blank after trimming"` 실패. Received report는 `## Summary` 다음에 빈 줄만 렌더링했다.
- GREEN: 동일 명령 통과. whitespace-only summary가 `(No provider summary.)`로 렌더링됨을 확인했다.
