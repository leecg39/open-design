# Research report directory path validation

## 관찰

- saved research report 경로는 project-relative path로 검증되지만, `research/`처럼 trailing slash가 있는 디렉터리형 입력은 명확히 거절하지 않는다.
- 이후 파일 쓰기 단계에서 기존 디렉터리와 충돌하면 운영체제 오류처럼 보일 수 있다.

## 제품 리스크

- 사용자가 `--report research/`처럼 실수하면 원인이 "파일명이 빠졌다"는 점이 드러나지 않는다.
- report 저장은 agent 최종 답변에서 다시 참조되는 산출물 경로이므로, 실패 메시지가 명확해야 재시도 비용이 낮다.

## 개선 원칙

- report path가 trailing slash로 끝나면 경로 해석 단계에서 `report path must include a file name`으로 실패한다.
- 확장자 없는 파일명 자체는 계속 허용한다.
- project-relative 및 path traversal 기존 검증은 유지한다.

## A/B 기준

- A: `research/`가 경로 해석에서 통과해 이후 파일 쓰기 오류로 이어질 수 있다.
- B: `research/`가 즉시 명확한 validation 오류로 거절된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts -t "look like directories"` 실패. 기존 `resolveResearchReportPath(root, 'research/')`는 오류 없이 통과했다.
- GREEN: 같은 focused test 통과. trailing slash report path는 `report path must include a file name`으로 즉시 거절된다.
- 전체 report 회귀: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts` 통과, 24 tests.
- 타입 검증: `pnpm --filter @open-design/daemon typecheck` 통과.
- 저장소 guard: `pnpm guard`는 기존 `factolink-ir-deck/assets/runtime.js` 잔여 JavaScript allowlist 문제로 실패. Test layout, E2E layout, Web test layout, Tools layout check는 통과.
