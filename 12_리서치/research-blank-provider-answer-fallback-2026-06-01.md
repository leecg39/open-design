# Research Blank Provider Answer Fallback

## 관찰

- Tavily `answer`가 string이면 현재 구현은 trim 없이 그대로 summary 후보로 사용한다.
- `answer`가 공백뿐이어도 JavaScript truthy string이므로 source 기반 fallback summary가 실행되지 않는다.
- 결과적으로 source evidence는 있는데 `summary`가 사실상 비어 있는 JSON findings가 생길 수 있다.

## 제품 리스크

- agent가 research JSON을 바로 읽을 때 핵심 요약이 비어 후속 산출물 품질이 낮아진다.
- report는 summary section을 만들지만 내용이 빈 줄처럼 보일 수 있다.
- provider가 빈 answer를 반환하는 일시적 품질 저하가 Open Design의 research 품질 저하로 그대로 전파된다.

## 개선 원칙

- provider answer는 저장 전에 trim한다.
- trim 후 빈 문자열이면 기존 source 기반 fallback summary를 사용한다.
- source/snippet fallback의 안전장치는 그대로 유지한다.

## A/B 검증 기준

- Before: provider `answer: '  \n  '`가 그대로 findings.summary가 되어 fallback이 실행되지 않는다.
- After: 같은 응답은 `(No provider summary; top snippets follow.)` fallback summary를 반환한다.

## 실제 검증

- Before 구현 제거 상태:
  - `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "provider answers are blank"` 실패.
  - 실패 출력에서 findings.summary가 공백 문자열 그대로임을 확인.
- After provider answer trim 적용 상태:
  - 같은 focused run 통과.
