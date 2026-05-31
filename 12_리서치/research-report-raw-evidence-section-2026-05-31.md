# Research Report Raw Evidence Section

## 관찰

- `--include-raw-content`를 사용하면 API 응답의 각 출처에 `rawContent`와 `rawContentTruncated`가 포함될 수 있다.
- 저장 리포트는 메타데이터에 `Raw content evidence: enabled`를 표시하지만, 본문에서는 `snippet || rawContent || url` 우선순위로 핵심 발견만 만든다.
- 즉 스니펫이 있는 정상 출처는 원문 excerpt를 받아도 저장 리포트에서 직접 확인하기 어렵다.

## 제품 리스크

- 사용자가 raw content를 켜는 이유는 요약보다 깊은 근거를 나중에 재검토하기 위해서다.
- 리포트 파일에 원문 excerpt가 없으면, CLI JSON을 다시 찾아야 하고 Design Files에 남는 리서치 자산의 가치가 떨어진다.
- 개선 전후 A/B를 비교할 때도 원문 근거가 파일에 남지 않으면 판단 근거가 약해진다.

## 개선 원칙

- `rawContent`가 있는 출처가 하나라도 있으면 저장 리포트에 `Raw Evidence Excerpts` 섹션을 추가한다.
- 각 항목은 기존 출처 번호 `[1]`, `[2]`와 맞춰 추적 가능하게 한다.
- 긴 원문은 리포트 안에서 짧은 excerpt로 제한하고, `rawContentTruncated`가 있으면 truncated 표시를 유지한다.
- 외부 원문 텍스트는 Markdown 구조를 바꾸지 않도록 기존 escape 규칙을 적용한다.

## A/B 검증 기준

- Before: 스니펫과 rawContent가 모두 있는 출처는 저장 리포트에 rawContent excerpt가 별도 섹션으로 남지 않는다.
- After: 같은 입력에서 `## Raw Evidence Excerpts`가 생기고, 원문 excerpt와 truncated 상태가 출처 번호와 함께 저장된다.
