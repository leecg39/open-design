# Research report visual URL credential safety

## 관찰

- source link destination과 Key Findings URL fallback은 credentials 제거가 가능하지만, Visual References와 Source-Level Visual Evidence의 image URL 표시 텍스트는 별도 정리를 거치지 않는다.
- provider 결과나 내부 호출자가 credential 포함 image URL을 넘기면 saved report 본문에 그대로 남을 수 있다.

## 제품 리스크

- research report는 사용자가 다시 열고 공유할 수 있는 산출물이므로 image URL의 `user:secret@` 노출은 신뢰와 보안 품질을 낮춘다.
- 시각 증거 URL은 본문 텍스트로 렌더링되어 눈에 잘 띄기 때문에 작은 누출도 확인 비용이 크다.

## 개선 원칙

- Visual References와 Source-Level Visual Evidence에서 표시하는 image URL도 credentials를 제거한다.
- 기존 markdown 구조 방어와 설명 텍스트 escaping은 유지한다.
- 이미지 URL을 링크로 바꾸거나 새 섹션을 추가하지 않는다.

## A/B 기준

- A: credential 포함 image URL이 saved report의 visual evidence 섹션에 그대로 표시된다.
- B: saved report visual evidence 섹션에는 credential이 제거된 image URL만 표시된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts -t "visual evidence urls"` 실패. Source-Level Visual Evidence와 Visual References에 `https://user:secret@example.com/...`가 그대로 표시됐다.
- GREEN: 같은 focused test 통과. Source-Level Visual Evidence와 Visual References 모두 credential이 제거된 image URL만 표시한다.
- 전체 report 회귀: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts` 통과, 23 tests.
- 타입 검증: `pnpm --filter @open-design/daemon typecheck` 통과.
- 저장소 guard: `pnpm guard`는 기존 `factolink-ir-deck/assets/runtime.js` 잔여 JavaScript allowlist 문제로 실패. Test layout, E2E layout, Web test layout, Tools layout check는 통과.
