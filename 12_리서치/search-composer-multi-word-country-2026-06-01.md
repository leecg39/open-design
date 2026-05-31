# Search Composer Multi Word Country Values

## 관찰

- `/search --country`는 공백형 country 값을 한 토큰만 읽는다.
- `South Korea`, `United States`, `United Kingdom`처럼 사용자가 자연스럽게 입력하는 핵심 국가명은 두 토큰이다.
- 기존 동작에서는 `/search --country South Korea AI design market`이 country `south`, query `Korea AI design market`로 분리될 수 있다.

## 제품 리스크

- country boost가 의도한 국가와 달라져 source retrieval 품질이 낮아진다.
- 남은 country 단어가 canonical query에 섞여 A/B 리서치 기준을 흐린다.
- 한국/미국/영국은 이미 shortcut과 alias가 있는 핵심 대상이라 multi-word 입력도 같은 의미로 처리되어야 한다.

## 개선 원칙

- 공백형 `--country`는 다음 두 토큰 조합이 알려진 multi-word country이면 한 값으로 소비한다.
- 허용 범위는 기존 shortcut/alias와 연결된 `south korea`, `united states`, `united kingdom`으로 좁힌다.
- 알 수 없는 국가명은 기존 단일 토큰 동작을 유지해 과한 추측을 피한다.

## A/B 검증 기준

- Before: `/search --country South Korea AI design market`의 query가 `Korea AI design market`로 오염된다.
- After: country는 `south korea`, query는 `AI design market`이다.
