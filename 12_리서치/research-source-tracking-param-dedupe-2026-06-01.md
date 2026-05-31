# Research Source Tracking Parameter Dedupe

## 관찰

- Tavily source URL canonicalization은 hash fragment와 non-root trailing slash를 제거한다.
- 하지만 `utm_source`, `utm_medium`, `fbclid`, `gclid` 같은 tracking query parameter는 그대로 둔다.
- 같은 문서가 tracking query만 다른 URL로 반환되면 별도 source citation으로 남을 수 있다.

## 제품 리스크

- report의 source count가 실제보다 다양해 보인다.
- 작은 `maxSources`에서는 tracking duplicate가 더 좋은 출처를 밀어낼 수 있다.
- evidence trail의 품질은 unique source canonicalization에 크게 의존한다.

## 개선 원칙

- 의미 있는 query parameter는 보존한다.
- `utm_` prefix와 대표 click/email tracking parameter만 제거한다.
- tracking 제거 후 같은 URL이 되면 duplicate로 버리고 `discardedSourceCount`에 반영한다.

## A/B 검증 기준

- Before: `https://example.com/source?utm_source=newsletter`가 `https://example.com/source`와 별도 source로 남는다.
- After: tracking query variant는 duplicate로 discardedSourceCount에 포함된다.
