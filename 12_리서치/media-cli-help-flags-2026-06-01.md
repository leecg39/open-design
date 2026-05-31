# Media CLI Help Flags

## 관찰

- `od media generate`와 `od media wait`는 help flag를 parser allowlist에 포함한다.
- 그러나 `generate --help`는 help를 확인하기 전에 project id validation으로 떨어질 수 있다.
- `wait --help`도 task id 확인이 먼저라 help 대신 usage error가 나온다.

## 제품 리스크

- agent나 사용자가 도움말을 요청했는데 오류가 먼저 나오면 명령을 고치기 어렵다.
- allowlist에 help가 있는데 handler가 쓰지 않으면 CLI 표면의 일관성이 떨어진다.

## 개선 원칙

- `od media generate --help`와 `od media wait --help` 모두 정상 exit 0으로 media help를 출력한다.
- 기존 필수값 validation은 help가 아닐 때 그대로 유지한다.
- 실제 CLI 실행으로 stdout/stderr를 확인한다.

## A/B 검증 기준

- Before: `od media generate --help`가 project id required 오류로 보일 수 있다.
- After: 같은 명령은 media help를 출력하고 성공한다.
