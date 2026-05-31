# Tavily Answer Bound

## 관찰

- Tavily provider answer는 `ResearchFindings.summary`로 바로 전달된다.
- source title, snippet, published date, image description, raw content는 provider boundary에서 크기를 제한한다.
- answer는 trim만 적용하고 길이 제한이 없어 긴 provider 답변이 JSON findings와 Markdown report를 과도하게 키울 수 있다.

## 제품 리스크

- 긴 summary 하나가 CLI stdout, daemon API response, saved report를 불필요하게 크게 만든다.
- 후속 agent prompt에 research JSON을 붙일 때 summary가 다른 evidence fields를 밀어낼 수 있다.
- 이미 raw content는 4,000자로 제한하므로 provider-generated answer도 같은 수준의 방어선이 필요하다.

## 개선 원칙

- provider answer의 앞뒤 공백 trim은 유지한다.
- summary의 줄바꿈은 보존한다. 기존 `research-summary-line-preservation` 개선과 충돌하지 않아야 한다.
- trim 후 answer는 4,000자로 제한한다.
- answer가 비어 있으면 기존 fallback summary 동작을 유지한다.

## A/B 검증 기준

- Before: 4,000자를 넘는 Tavily answer가 그대로 `findings.summary`로 반환된다.
- After: 같은 answer는 줄 구조를 보존한 채 4,000자로 제한된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "provider answers"` 실패. 긴 answer가 6,024자로 그대로 `findings.summary`에 반환되었다.
- GREEN: 동일 명령 통과. provider answer는 4,000자로 제한되고 줄바꿈은 보존된다.
