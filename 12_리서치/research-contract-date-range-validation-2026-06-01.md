# Research Contract Date Range Validation

## 관찰

- Daemon research input은 `startDate > endDate`이면 `INVALID_DATE_RANGE`로 요청을 거절한다.
- Research command contract는 개별 날짜가 valid calendar date이면 순서를 확인하지 않고 둘 다 command examples에 넣는다.
- 예: `startDate: 2026-05-31`, `endDate: 2026-05-01`은 contract에 그대로 들어가지만 실행하면 daemon 단계에서 실패한다.

## 제품 리스크

- `/search` first-action contract가 실패하는 명령을 안내할 수 있다.
- agent는 command failure를 보고 fallback search로 전환할 수 있어, Open Design 자체 research/report 저장 흐름이 불필요하게 깨진다.
- exact date filter는 최신성 검증에 중요하므로 contract와 daemon의 유효성 기준이 같아야 한다.

## 개선 원칙

- contract 단계에서 reversed exact date range를 제거한다.
- 둘 중 하나만 valid한 경우 기존처럼 단일 bound는 유지한다.
- valid ordered range는 기존 command examples에 그대로 유지한다.

## A/B 검증 기준

- Before: reversed range `2026-05-31` to `2026-05-01`이 command examples에 포함된다.
- After: 같은 reversed range는 command examples에서 제외되고, 기본 depth/max-sources command는 유지된다.

## 실제 검증

- Before 구현 제거 상태:
  - `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-contract.test.ts -t "reversed exact date"` 실패.
  - 실패 출력에서 `--start-date 2026-05-31 --end-date 2026-05-01`가 command examples에 남음을 확인.
- After range-order validation 적용 상태:
  - 같은 focused run 통과.
