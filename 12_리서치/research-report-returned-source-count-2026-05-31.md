# Research Report Returned Source Count

## 관찰

- 저장 리포트 Metadata에는 `Effective source cap`, `Filtered by relevance threshold`, `Discarded unusable provider results`가 표시된다.
- 하지만 최종 리포트에 실제로 남은 `sources.length`는 Metadata에서 바로 보이지 않는다.
- 사용자는 Sources 섹션을 직접 세어야 최종 근거량을 알 수 있다.

## 제품 리스크

- 리서치 품질을 빠르게 판단하려면 "요청 상한", "필터링된 수", "폐기된 수", "최종 남은 수"가 함께 보여야 한다.
- 특히 `minScore`, domain filter, provider discard가 결합되면 최종 근거량을 한눈에 파악하기 어렵다.
- A/B 리서치 비교에서는 최종 sources 수가 간단한 품질 지표가 된다.

## 개선 원칙

- 저장 리포트 Metadata에 `Returned sources: N`을 항상 표시한다.
- 값은 최종 `findings.sources.length`를 사용한다.
- 기존 Sources 섹션과 citation 번호는 그대로 유지한다.

## A/B 검증 기준

- Before: Metadata에 최종 source count가 없다.
- After: Metadata에 `Returned sources: N`이 표시된다.
