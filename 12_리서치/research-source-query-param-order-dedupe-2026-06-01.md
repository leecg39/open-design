# Research Source Query Parameter Order Dedupe

## 관찰

- `normalizeSourceUrl`은 credential, hash, tracking query parameter, trailing slash를 정리한다.
- 하지만 남은 query parameter의 순서는 provider가 준 순서를 유지한다.
- 같은 URL이라도 `?b=2&a=1`과 `?a=1&b=2`는 현재 서로 다른 source URL로 남을 수 있다.

## 제품 리스크

- 동일 source가 citation list에 중복 표시되어 report 신뢰도와 scan quality가 떨어진다.
- `maxSources`가 제한된 상황에서 같은 문서가 여러 칸을 차지해 실제 다양한 근거를 잃을 수 있다.
- 이미지 URL도 같은 문제가 있으면 visual evidence가 중복될 수 있다.

## 개선 원칙

- tracking parameter 제거 후 남은 query parameters를 안정적으로 정렬한다.
- same key가 여러 번 있는 경우 value까지 포함해 deterministic order를 만든다.
- source URL과 image URL 모두 같은 canonicalization을 사용한다.

## A/B 검증 기준

- Before: `https://example.com/source?b=2&a=1`과 `https://example.com/source?a=1&b=2`가 서로 다른 source로 반환된다.
- After: 두 URL은 같은 canonical URL로 정규화되어 하나만 반환되고 discarded count에 중복이 포함된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "reordered query"` 실패. 순서만 다른 query URL 2개가 모두 source로 남았다.
- GREEN: 동일 명령 통과. query parameters는 key/value 기준으로 정렬되고, reordered duplicate는 `discardedSourceCount`에 포함된다.
