# Research report URL fallback credential safety

## 관찰

- saved research report의 Key Findings는 source snippet과 rawContent가 비어 있으면 source URL을 fallback 텍스트로 보여준다.
- source list의 markdown link destination은 credentials를 제거하지만, Key Findings fallback 텍스트는 같은 정리를 거치지 않는다.

## 제품 리스크

- provider 또는 내부 호출자가 credential 포함 URL을 넘기면 저장된 리포트 본문에 `user:secret@` 형태가 노출될 수 있다.
- 사용자는 `12_리서치`와 saved report를 재사용하기 때문에 출력 산출물에 비밀성 문자열이 남는 것은 제품 완성도와 신뢰에 직접적인 손상이다.

## 개선 원칙

- Key Findings에서 URL을 fallback으로 표시할 때도 source link와 같은 수준으로 credentials를 제거한다.
- snippet 또는 rawContent가 있으면 기존 우선순위를 유지한다.
- 리포트 구조나 새 필드는 추가하지 않는다.

## A/B 기준

- A: snippet 없는 source의 Key Findings fallback에 `https://user:secret@example.com/source`가 그대로 들어간다.
- B: Key Findings fallback에는 `https://example.com/source`만 들어가고 credential 문자열은 리포트에 남지 않는다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts -t "key finding URL fallbacks"` 실패. Sources 링크는 credential을 제거했지만 Key Findings fallback에는 `https://user:secret@example.com/source`가 그대로 남았다.
- GREEN: 같은 focused test 통과. Key Findings fallback에는 `https://example.com/source`만 남고 credential 문자열은 report에서 제거된다.
- 전체 report 회귀: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts` 통과, 22 tests.
- 타입 검증: `pnpm --filter @open-design/daemon typecheck` 통과.
- 저장소 guard: `pnpm guard`는 기존 `factolink-ir-deck/assets/runtime.js` 잔여 JavaScript allowlist 문제로 실패. Test layout, E2E layout, Web test layout, Tools layout check는 통과.
