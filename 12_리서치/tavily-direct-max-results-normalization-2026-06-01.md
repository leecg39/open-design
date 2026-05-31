# Tavily Direct Max Results Normalization

## 관찰

- `searchResearch`는 `maxSources`를 provider limit 안의 정수로 정규화한다.
- 하지만 lower-level `tavilySearch` helper를 직접 호출하면 `maxResults`가 그대로 `max_results` payload에 들어간다.
- 예를 들어 `maxResults: 0.5`는 provider가 기대하는 양의 정수가 아니다.

## 제품 리스크

- 내부 호출 경로가 늘어날수록 상위 validator를 우회하는 helper 사용이 생길 수 있다.
- Tavily API에 fractional 또는 non-finite `max_results`를 보내면 provider error나 불안정한 결과로 이어질 수 있다.
- research pipeline의 provider boundary는 자체적으로도 안전해야 한다.

## 개선 원칙

- `tavilySearch` 안에서 `maxResults`를 finite number인지 확인한다.
- finite이면 floor 처리 후 최소 1, 최대 provider limit 20으로 clamp한다.
- finite number가 아니면 기존 default 5를 사용한다.

## A/B 검증 기준

- Before: direct `tavilySearch({ maxResults: 0.5 })`가 `max_results: 0.5`를 보낸다.
- After: 같은 호출은 `max_results: 1`을 보낸다.
