# Research URL Credential Stripping

## 관찰

- Tavily source/image URL 정규화는 protocol, hash, trailing slash, tracking query를 다룬다.
- 하지만 `https://user:pass@example.com/source` 같은 URL credentials는 그대로 남을 수 있다.
- saved report의 Markdown link destination도 direct findings 입력을 받으면 credential 포함 URL을 그대로 렌더링할 수 있다.

## 제품 리스크

- external evidence URL은 untrusted input이며, credential처럼 보이는 정보가 JSON/report에 저장될 수 있다.
- 사용자가 source list를 공유하면 불필요한 민감정보 모양의 문자열이 함께 전파된다.
- source/image URL canonicalization의 신뢰도가 떨어진다.

## 개선 원칙

- source URL과 image URL normalize 단계에서 username/password를 제거한다.
- Markdown report link destination도 방어적으로 credentials를 제거한다.
- host, path, 의미 있는 query parameter는 보존한다.

## A/B 검증 기준

- Before: `https://user:pass@example.com/source`가 findings/report에 그대로 남는다.
- After: 같은 URL은 `https://example.com/source`로 저장되고 렌더링된다.

## 실제 검증

- Before 구현 제거 상태:
  - `tests/research.test.ts` focused run에서 source/image credentials가 남아 실패.
  - `tests/research-report.test.ts` focused run에서 Markdown link destination에 `user:secret@`가 남아 실패.
- After credential stripping 적용 상태:
  - `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "duplicate and non-web source URLs|visual image evidence"` 통과.
  - `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts -t "credentials from source link"` 통과.
  - `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts tests/research-report.test.ts` 통과.
  - `pnpm --filter @open-design/daemon typecheck` 통과.
