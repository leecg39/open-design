# Research Source Trailing Slash Dedupe

## 관찰

- Tavily source URL 정규화는 hash fragment를 제거해 anchor 중복을 줄인다.
- 하지만 non-root path의 trailing slash는 그대로 두기 때문에 `/source`와 `/source/`가 별도 source로 남을 수 있다.
- 검색 provider는 같은 문서를 약간 다른 URL 형태로 반환할 수 있다.

## 제품 리스크

- 같은 source가 두 개 citation으로 보이면 evidence diversity가 실제보다 높아 보인다.
- maxSources가 작을수록 중복 URL 하나가 더 중요한 출처를 밀어낼 수 있다.
- report의 discardedSourceCount가 실제 dedupe 품질을 반영하지 못한다.

## 개선 원칙

- source URL의 hash 제거는 유지한다.
- root path `/`는 보존한다.
- non-root path의 trailing slash만 제거해 `/source`와 `/source/`를 같은 citation으로 본다.

## A/B 검증 기준

- Before: `https://example.com/source`와 `https://example.com/source/`가 둘 다 sources에 남는다.
- After: trailing slash variant는 duplicate로 discardedSourceCount에 포함된다.
