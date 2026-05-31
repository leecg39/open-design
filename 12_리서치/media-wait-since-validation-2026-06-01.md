# Media Wait Since Validation

## 관찰

- `od media wait <taskId> --since <n>`은 polling resume cursor를 받는다.
- 현재 `Number.isFinite(Number(flags.since)) ? Number(flags.since) : 0` 방식이라 invalid value가 조용히 `0`으로 바뀔 수 있다.
- 잘못된 resume cursor는 사용자가 의도한 polling 위치와 실제 동작을 다르게 만든다.

## 제품 리스크

- agent가 잘못된 `--since` 값을 넘겨도 오류를 보지 못하고 처음부터 wait할 수 있다.
- media generation 상태 확인은 timeout/budget이 있으므로, 입력 오류를 조용히 보정하면 진단이 어려워진다.

## 개선 원칙

- `--since`가 있으면 finite non-negative number인지 검증한다.
- invalid value는 fetch 전에 exit 2와 명확한 stderr로 실패한다.
- 값이 없을 때의 기본 `0` 동작은 유지한다.

## A/B 검증 기준

- Before: `--since high`가 `0`처럼 처리되어 polling으로 진행할 수 있다.
- After: 같은 입력은 `flag --since requires a non-negative number`로 즉시 실패한다.
