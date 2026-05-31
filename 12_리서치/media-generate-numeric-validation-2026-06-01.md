# Media Generate Numeric Validation

## 관찰

- `od media generate`는 `--length`와 `--duration` 값을 `Number(...)`로 변환해 request body에 넣는다.
- invalid value는 `NaN`이 될 수 있고, JSON serialization 단계에서 `null`처럼 전달될 수 있다.
- media 생성 요청은 외부 provider 비용/대기시간과 연결되므로, 잘못된 numeric control은 CLI에서 빨리 막는 편이 안전하다.

## 제품 리스크

- agent가 `--length high` 같은 값을 만들면 daemon/provider까지 불분명한 payload가 갈 수 있다.
- 사용자는 provider 오류를 보고도 실제 원인이 CLI 숫자 입력인지 알기 어렵다.

## 개선 원칙

- `--length`와 `--duration`이 있으면 finite positive number인지 검증한다.
- invalid value는 fetch 전에 exit 2와 명확한 stderr로 실패한다.
- 값이 없을 때의 기존 동작은 유지한다.

## A/B 검증 기준

- Before: `--length high`가 request body 단계까지 진행할 수 있다.
- After: 같은 입력은 `flag --length requires a positive number`로 즉시 실패한다.
