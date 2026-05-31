# Research Report Windows Reserved Slugs

## 관찰

- 기본 리서치 리포트 파일명은 쿼리를 slug로 바꾼 `research/<slug>.md`이다.
- `CON`, `PRN`, `AUX`, `NUL`, `COM1`, `LPT1` 같은 Windows 예약 이름은 확장자가 붙어도 파일명으로 안전하지 않다.
- Open Design은 macOS뿐 아니라 Windows 패키징과 설치 경로도 관리하므로, 기본 산출물 파일명이 OS별로 실패하지 않아야 한다.

## 제품 리스크

- 사용자가 `/search CON`처럼 짧은 약어 또는 모델/제품명을 검색하면 Windows 환경에서 저장 실패가 날 수 있다.
- 자동 리포트 저장은 에이전트가 호출하는 기능이라 사용자가 경로를 즉시 수정하기 어렵다.
- 명시 `--report` 경로까지 바꾸면 사용자의 의도를 침범하므로 기본 slug 생성에만 적용하는 것이 안전하다.

## 개선 원칙

- 일반 쿼리의 기존 파일명은 유지한다.
- Windows 예약 basename과 정확히 일치하는 기본 slug만 `research-<slug>`로 바꾼다.
- 명시 `--report` 경로 검증 정책은 그대로 둔다.

## A/B 검증 기준

- Before: `defaultResearchReportPath('CON')`은 `research/con.md`를 반환한다.
- After: 같은 입력은 `research/research-con.md`를 반환하고, 일반 쿼리 slug는 변하지 않는다.
