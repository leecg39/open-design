# Research Report Exists Error Message

## 관찰

- 명시 `--report` overwrite guard는 기존 파일을 보존한다.
- 하지만 실패 메시지가 낮은 수준의 filesystem `EEXIST`로만 보이면 사용자가 다음 행동을 바로 알기 어렵다.
- agent도 stderr를 그대로 보고하므로, error message 자체가 제품 UX의 일부다.

## 제품 리스크

- 사용자는 저장 실패 원인이 권한, 경로, 파일 충돌 중 무엇인지 구분하기 어렵다.
- 같은 리서치 재실행 시 `--save-report`를 써야 할지, 다른 `--report` 경로를 줘야 할지 알기 어렵다.

## 개선 원칙

- 기존 파일은 계속 보존한다.
- 충돌 시 프로젝트 상대 경로를 포함한 명확한 메시지를 던진다.
- error code는 `EEXIST`로 유지해 테스트와 호출자가 충돌을 식별할 수 있게 한다.

## A/B 검증 기준

- Before: 기존 명시 경로 충돌은 낮은 수준의 EEXIST 메시지에 의존한다.
- After: `report path already exists: research/...md` 메시지가 stderr에 표시된다.
