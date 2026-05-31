# Research report dot path validation

## 관찰

- `research/`처럼 trailing slash가 있는 report path는 명확히 거절되지만, `research/.`처럼 현재 디렉터리를 가리키는 입력은 파일명처럼 통과할 수 있다.
- 이 경로는 실제 파일이 아니라 디렉터리를 가리키므로 이후 파일 쓰기 단계에서 흐릿한 운영체제 오류로 이어질 수 있다.

## 제품 리스크

- 사용자가 report 파일명을 빠뜨린 경우 재시도에 필요한 원인이 바로 보이지 않는다.
- saved research report는 agent 답변과 Design Files에서 재사용되는 산출물이므로, 경로 오류는 초기에 이해 가능한 메시지로 막아야 한다.

## 개선 원칙

- report path의 마지막 segment가 `.`이면 `report path must include a file name`으로 거절한다.
- `research/report`처럼 확장자 없는 파일명은 계속 허용한다.
- traversal, absolute path, trailing slash 기존 검증은 유지한다.

## A/B 기준

- A: `resolveResearchReportPath(root, 'research/.')`가 통과한다.
- B: 같은 입력이 명확한 validation 오류로 거절된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts -t "look like directories"` 실패. 기존 `resolveResearchReportPath(root, 'research/.')`는 오류 없이 통과했다.
- GREEN: 같은 focused test 통과. `research/.`는 `report path must include a file name`으로 즉시 거절된다.
- 전체 report 회귀: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts` 통과, 24 tests.
- 타입 검증: `pnpm --filter @open-design/daemon typecheck` 통과.
- 저장소 guard: `pnpm guard`는 기존 `factolink-ir-deck/assets/runtime.js` 잔여 JavaScript allowlist 문제로 실패. Test layout, E2E layout, Web test layout, Tools layout check는 통과.
