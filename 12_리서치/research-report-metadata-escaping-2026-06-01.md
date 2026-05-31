# Research Report Metadata Escaping

## 관찰

- 저장형 리서치 리포트는 요약, 쿼리, 출처 제목, 경고, requestId 일부를 Markdown escape한다.
- 그러나 Metadata의 `provider`, `depth`, `topic`, `country`, `timeRange`, `startDate`, `endDate`, include/exclude domains, selected topic은 그대로 출력된다.
- 이 값들은 대부분 CLI 옵션 또는 provider 응답에서 온 문자열이라, 줄바꿈과 Markdown 문법이 섞이면 리포트 구조가 흔들릴 수 있다.

## 제품 리스크

- 리서치 리포트는 후속 생성/비교/A-B 검증의 근거 파일이다.
- Metadata가 섹션 주입에 취약하면 Design Files에서 리포트를 열었을 때 실제 근거와 가짜 섹션이 섞인다.
- 이미 본문 필드는 escape하고 있으므로 Metadata도 같은 정책을 적용하는 것이 일관적이다.

## 개선 원칙

- 사람이 읽는 값은 유지하되 Markdown 구조를 바꾸는 문자는 escape한다.
- 목록형 Metadata는 각 항목을 개별 escape한 뒤 `, `로 연결한다.
- 숫자/불리언 메타데이터와 기존 stdout JSON 계약은 변경하지 않는다.

## A/B 검증 기준

- Before: `country`나 include/exclude domains에 줄바꿈과 `##`가 있으면 저장 리포트에 가짜 섹션처럼 보일 수 있다.
- After: 같은 입력이 `\#\#` 형태로 escape되어 Metadata 줄 안에 머문다.
