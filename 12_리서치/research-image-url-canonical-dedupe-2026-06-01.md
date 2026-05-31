# Research Image URL Canonical Dedupe

## 관찰

- Tavily source URL은 hash, trailing slash, tracking query를 정규화한다.
- image URL은 현재 protocol만 확인하고 그대로 `url.toString()`을 반환한다.
- 같은 visual evidence가 `#fragment`, `utm_*`, `fbclid`만 다르게 반환되면 별도 이미지로 남을 수 있다.

## 제품 리스크

- visual research report가 중복 이미지로 채워져 실제 visual coverage가 과장된다.
- source-level image limit이 작을 때 duplicate가 더 유용한 시각 자료를 밀어낼 수 있다.
- source URL과 image URL의 dedupe 기준이 달라 사용자에게 일관되지 않게 보인다.

## 개선 원칙

- image URL도 source URL과 같은 tracking parameter 제거 규칙을 사용한다.
- hash fragment는 제거한다.
- query parameter 전체는 보존하되, common tracking parameter만 제거한다.

## A/B 검증 기준

- Before: `product.jpg#hero`와 `product.jpg?utm_source=x`가 각각 별도 image로 남는다.
- After: 둘 다 canonical `product.jpg`로 dedupe된다.
