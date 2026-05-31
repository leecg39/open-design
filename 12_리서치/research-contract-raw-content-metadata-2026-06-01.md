# Research Contract Raw Content Metadata

## 관찰

- Research command contract는 `--include-raw-content`와 source-level `rawContent` 예시를 보여준다.
- 실제 research findings는 raw content 요청 시 top-level `includeRawContent: true`도 반환한다.
- 하지만 contract의 stdout JSON 예시에는 `includeRawContent` metadata가 빠져 있어 agent가 반환 형태를 덜 정확하게 예상할 수 있다.

## 제품 리스크

- agent가 raw evidence 요청 상태를 최종 보고서 metadata에 반영하지 못할 수 있다.
- command contract와 daemon response shape가 어긋나면 `/search` 워크플로의 신뢰도가 낮아진다.
- raw evidence 옵션은 비용과 evidence density에 영향을 주므로 metadata 예시에 명확히 보여야 한다.

## 개선 원칙

- stdout JSON 예시는 활성화된 top-level research 옵션을 정확히 포함한다.
- `includeImages`, `includeRawContent`, `autoParameters` 예시 조합이 서로 누락되지 않게 조립한다.
- 실제 daemon DTO shape는 바꾸지 않고 contract 문구/예시만 정합화한다.

## A/B 검증 기준

- Before: `includeRawContent: true` 옵션으로 contract를 만들면 stdout JSON 예시에 `"includeRawContent": true`가 없다.
- After: 같은 contract 예시에 `"includeRawContent": true`가 포함된다.

## 실제 검증

- Before 구현 제거 상태:
  - `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-contract.test.ts -t "raw content"` 실패.
  - 실패 출력에서 stdout JSON 예시에 source `rawContent`만 있고 top-level `includeRawContent`가 없음을 확인.
- After stdout option field 조립 적용 상태:
  - 같은 focused run 통과.
