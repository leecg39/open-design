# Search Composer Country Topic Warning

## 관찰

- daemon research API는 `topic`이 `news` 또는 `finance`일 때 `country` boost를 지원하지 않아 경고를 반환한다.
- web composer의 `/search` 파서는 같은 조합에서 `country`를 조용히 제거한다.
- 사용자가 `/search --news --kr ...`처럼 입력하면 최종 프롬프트에는 country가 사라지지만 이유가 보이지 않는다.

## 제품 리스크

- 사용자는 한국 뉴스 검색을 의도했는데 실제 명령에는 country가 빠졌다는 사실을 놓칠 수 있다.
- agent가 나중에 결과를 설명할 때 “왜 지역 필터가 없었는지” 근거를 잃는다.
- daemon과 composer의 경고 정책이 다르면 같은 기능이 표면마다 다르게 느껴진다.

## 개선 원칙

- 기존처럼 news/finance에서는 country를 명령에 넣지 않는다.
- 대신 composer prompt에 parser warning을 추가해 제거 이유를 표시한다.
- daemon의 경고 문구와 의미를 맞춘다.

## A/B 검증 기준

- Before: `/search --news --kr ...`는 country를 조용히 제거한다.
- After: 같은 입력은 country를 제거하되 `Research parser warning`에 제거 이유를 포함한다.
