# Research Report Evidence Safety Placement

## 관찰

- 저장 리포트는 외부 검색 결과를 Summary, Key Findings, Sources, Raw Evidence로 보여준 뒤 마지막에 `Evidence Safety`를 표시한다.
- 사용자는 보통 리포트를 위에서 아래로 읽으므로, 실제로는 경고를 보기 전에 외부 출처 기반 요약과 증거를 먼저 읽게 된다.

## 제품 리스크

- 리서치 소스는 외부 비신뢰 텍스트이며, 원문 excerpt에는 명령문이나 역할 변경 시도가 섞일 수 있다.
- 안전 경고가 리포트 마지막에 있으면 사용자가 외부 텍스트를 해석한 뒤에야 주의 문구를 확인한다.
- 특히 raw content를 저장하는 경우에는 경고가 근거 섹션보다 먼저 보여야 한다.

## 개선 원칙

- `Evidence Safety` 섹션을 Summary와 Key Findings보다 먼저 노출한다.
- Warnings가 있으면 Warnings 다음에, 없으면 Metadata 다음에 배치한다.
- 리포트 하단의 중복 경고는 제거해 문서 흐름을 단순하게 유지한다.

## A/B 검증 기준

- Before: `Evidence Safety`가 `## Sources` 이후에 위치한다.
- After: `Evidence Safety`가 `## Summary`보다 앞에 위치한다.
