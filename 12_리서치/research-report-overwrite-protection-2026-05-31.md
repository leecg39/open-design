# Research Report Overwrite Protection

## 관찰

- `od research search --save-report`는 쿼리에서 만든 기본 경로 `research/<safe-query-slug>.md`에 Markdown 리포트를 저장한다.
- 같은 프로젝트에서 같은 쿼리를 반복 실행하면 기본 경로가 동일하다.
- 현재 구현은 기본 경로의 기존 파일 존재 여부를 확인하지 않고 `writeFile`로 저장하므로, 이전 리서치 리포트를 덮어쓸 수 있다.

## 제품 리스크

- 리서치 결과는 Design Files에 남는 재사용 자산이다.
- 사용자가 같은 주제를 반복 조사하는 워크플로에서는 시간별 비교와 A/B 검증 기록이 중요하다.
- 자동 저장이 이전 리포트를 덮어쓰면, 사용자는 개선 전후 근거를 잃고 변경 판단을 되돌리기 어렵다.

## 개선 원칙

- 자동 저장인 `--save-report`만 충돌 회피를 적용한다.
- 사용자가 명시적으로 `--report research/file.md`를 지정한 경우에는 기존 동작처럼 정확한 경로에 저장한다.
- 충돌 시 `research/topic.md`, `research/topic-2.md`, `research/topic-3.md` 순서로 다음 빈 경로를 선택한다.
- CLI stdout의 `reportPath`는 실제 저장된 경로를 반환해야 한다.

## A/B 검증 기준

- Before: 같은 쿼리로 `--save-report`를 반복하면 기존 `research/<slug>.md`가 덮어써질 수 있다.
- After: 기존 기본 리포트가 있으면 새 리포트는 `research/<slug>-2.md`로 저장되고, 기존 파일 내용은 유지된다.
- 명시 경로 `--report`는 사용자가 선택한 경로를 그대로 사용한다.
