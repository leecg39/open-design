# CLI String Flag Missing Value

## 관찰

- `od` CLI의 공용 flag parser는 string flag 뒤에 값이 없고 다음 토큰이 또 다른 `--flag`여도 그 토큰을 값으로 소비한다.
- 예를 들어 `--query --depth deep`은 `--query` 값 누락으로 즉시 실패하기보다 `--depth`를 query 값처럼 먹고 뒤의 `deep`에서 positional error가 난다.
- agent가 stderr를 그대로 사용자에게 보고하는 흐름에서는 첫 에러 메시지가 곧 제품 UX다.

## 제품 리스크

- 사용자는 실제 문제인 “string flag value missing”을 바로 알기 어렵다.
- agent가 명령을 자동 수정하거나 재시도할 때 잘못된 위치를 고칠 수 있다.
- `--query=--literal` 형태는 유지할 수 있으므로, 별도 토큰에서 다른 flag를 값으로 먹는 동작은 줄이는 편이 안전하다.

## 개선 원칙

- string flag의 다음 토큰이 없거나 `--`로 시작하면 `flag --<name> requires a value`로 실패한다.
- `--flag=value` 형태는 기존처럼 유지해 값이 `--`로 시작하는 rare case를 지원한다.
- 공용 parser를 테스트 가능한 소스 모듈로 분리한다.

## A/B 검증 기준

- Before: `--query --depth deep`이 값 누락이 아닌 positional error처럼 보일 수 있다.
- After: 같은 입력은 즉시 `flag --query requires a value`로 실패한다.
