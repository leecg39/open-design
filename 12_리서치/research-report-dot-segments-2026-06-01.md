# Research report dot segment normalization

## 관찰

- report path 검증은 traversal과 디렉터리형 입력을 막지만, `research/./report.md`처럼 중간 `.` segment가 있는 경로는 그대로 relativePath에 남을 수 있다.
- 실제 파일 위치는 `research/report.md`와 같지만, stdout JSON과 saved report metadata에는 더 지저분한 경로가 표시될 수 있다.

## 제품 리스크

- agent 최종 답변이 `research/./report.md` 같은 경로를 사용자에게 보여주면 재사용성과 신뢰도가 떨어진다.
- 같은 파일을 가리키는 경로 표기가 여러 형태로 남으면 collision 처리와 Design Files 표시를 이해하기 어려워진다.

## 개선 원칙

- 중간 `.` segment는 제거해 canonical project-relative reportPath를 반환한다.
- 마지막 segment가 `.`인 파일명 누락 입력은 계속 거절한다.
- `..` traversal 검증은 그대로 유지한다.

## A/B 기준

- A: `resolveResearchReportPath(root, 'research/./report.md')`가 `research/./report.md`를 반환한다.
- B: 같은 입력이 `research/report.md`로 정규화된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts -t "keeps explicit report paths"` 실패. 기존 반환값은 absolutePath는 canonical이지만 relativePath가 `research/./report.md`로 남았다.
- GREEN: 같은 focused test 통과. `research/./report.md` 입력은 `research/report.md`로 정규화된다.
- 전체 report 회귀: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts` 통과, 24 tests.
- 타입 검증: `pnpm --filter @open-design/daemon typecheck` 통과.
- 저장소 guard: `pnpm guard`는 기존 `factolink-ir-deck/assets/runtime.js` 잔여 JavaScript allowlist 문제로 실패. Test layout, E2E layout, Web test layout, Tools layout check는 통과.
