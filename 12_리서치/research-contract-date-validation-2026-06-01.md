# Research Contract Date Validation

## 관찰

- Daemon research input은 exact date가 실제 존재하는 UTC calendar date인지 확인한다.
- Research command contract는 `YYYY-MM-DD` 정규식만 확인해 `2026-02-30`, `2026-99-01` 같은 불가능한 날짜도 명령 예시에 포함할 수 있다.
- 이 경우 agent가 contract대로 명령을 실행하면 daemon은 해당 date filter를 무시하고 warning을 반환한다.

## 제품 리스크

- command contract가 실제 daemon validation보다 느슨하면 agent가 불필요한 warning이 있는 command를 첫 action으로 실행한다.
- `/search` prompt의 "canonical query/command" 신뢰도가 떨어진다.
- 날짜 필터는 최신성/기간 정확도에 직접 연결되므로 contract 단계에서 정합성이 중요하다.

## 개선 원칙

- contract의 exact date validation을 daemon의 calendar-date validation과 맞춘다.
- 불가능한 날짜는 command examples에서 제외한다.
- 기존 valid `YYYY-MM-DD` 날짜와 source cap/depth normalization은 유지한다.

## A/B 검증 기준

- Before: `startDate: '2026-02-30'`, `endDate: '2026-99-01'`이 command examples에 그대로 들어간다.
- After: 같은 불가능한 날짜는 command examples에서 제외된다.

## 실제 검증

- Before 구현 제거 상태:
  - `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-contract.test.ts -t "impossible exact date"` 실패.
  - 실패 출력에서 `--start-date 2026-02-30 --end-date 2026-99-01`가 command examples에 남음을 확인.
- After calendar date validation 적용 상태:
  - 같은 focused run 통과.
  - full `tests/research-contract.test.ts` run에서 기존 valid date command example도 유지됨을 확인.
