# Research Report Self Path Metadata

## 관찰

- `od research search --save-report`와 `--report`는 stdout JSON에 `reportPath`를 반환한다.
- 그러나 저장된 Markdown 리포트 파일 자체에는 `reportPath`가 없다.
- Design Files 안에서 리포트를 직접 열거나 다른 맥락으로 공유하면, 파일 내부만 보고는 어떤 프로젝트 상대 경로의 산출물인지 바로 알기 어렵다.

## 제품 리스크

- 리서치 리포트는 A/B 비교와 후속 작업의 근거 파일이다.
- 파일 내부에 자기 경로가 없으면 여러 리포트를 비교할 때 stdout 로그나 파일 브라우저 상태에 의존해야 한다.
- 자동 충돌 회피로 `-2`, `-3` 경로가 생기는 상황에서는 실제 저장 경로를 파일 내부에도 남기는 편이 추적성에 좋다.

## 개선 원칙

- 저장 시점에 확정된 실제 `reportPath`를 Markdown Metadata에 포함한다.
- 자동 저장과 명시 `--report` 모두 같은 방식으로 표시한다.
- path 값도 Markdown escape를 적용해 메타데이터 구조를 보호한다.
- CLI stdout의 기존 `reportPath` 계약은 유지한다.

## A/B 검증 기준

- Before: 저장 파일에는 `Report path` 메타데이터가 없다.
- After: 저장 파일 Metadata에 `- Report path: research/...md`가 포함되고, stdout JSON의 `reportPath`와 일치한다.
