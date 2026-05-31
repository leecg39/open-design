# Research Report Explicit Overwrite Guard

## 관찰

- `--save-report` 자동 저장은 기존 파일이 있으면 `-2`, `-3` suffix로 충돌을 피한다.
- `--report <path>` 명시 저장은 현재 `writeFile(..., 'utf8')`로 기존 파일을 덮어쓴다.
- 리서치 리포트는 A/B 비교와 후속 생성의 근거 파일이라 조용한 덮어쓰기는 위험하다.

## 제품 리스크

- agent가 명시 경로를 재사용하면 이전 리서치 근거가 사라질 수 있다.
- 사용자가 Design Files에서 보관하던 보고서와 새 실행 결과를 비교할 기회를 잃는다.
- 저장 명령은 되돌리기 어려운 파일 변경이므로 기본값은 보수적이어야 한다.

## 개선 원칙

- 명시 `--report`도 `wx` exclusive write로 저장한다.
- 파일이 이미 있으면 실패하고 기존 파일은 그대로 둔다.
- 자동 `--save-report`의 suffix 충돌 회피 정책은 그대로 유지한다.

## A/B 검증 기준

- Before: 기존 `research/report.md`가 있을 때 `--report research/report.md`는 파일을 덮어쓴다.
- After: 같은 명령은 실패하고 기존 파일 내용은 유지된다.
