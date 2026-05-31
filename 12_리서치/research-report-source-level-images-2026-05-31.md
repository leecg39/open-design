# Research Report Source-Level Images

## 관찰

- `ResearchSource` 계약에는 `images?: ResearchImage[]`가 있고, Tavily 정규화도 source-level images를 최대 3개까지 보존한다.
- 저장 리포트는 top-level `findings.images`만 `Visual References`로 렌더링한다.
- 프롬프트는 "source-level images tied to their source citation"를 요구하지만, 실제 리포트에는 출처별 이미지 근거가 누락된다.

## 제품 리스크

- 시각 리서치에서는 이미지가 어떤 출처에서 나온 것인지가 중요하다.
- source-level 이미지를 누락하면 검색 JSON에는 있던 근거가 Design Files에 저장되는 Markdown 리포트에서 사라진다.
- top-level 이미지와 source-level 이미지를 구분하지 않으면 시각 근거의 추적성이 떨어진다.

## 개선 원칙

- source-level images가 있으면 `Source-Level Visual Evidence` 섹션을 추가한다.
- 각 이미지 항목은 원 출처 citation 번호 `[1]`, `[2]`를 포함한다.
- 이미지 설명과 출처 제목은 Markdown 구조를 바꾸지 않도록 escape한다.
- 기존 top-level `Visual References` 섹션은 유지한다.

## A/B 검증 기준

- Before: `sources[0].images`가 있어도 저장 리포트에 해당 이미지 URL이 나타나지 않는다.
- After: 같은 입력에서 `## Source-Level Visual Evidence`가 생기고, 이미지 URL과 원 출처 번호가 함께 표시된다.
