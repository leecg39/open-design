# Research Provider Preference Fallback

## 관찰

- `ResearchOptions.providers` 계약은 provider preference order로 설명된다.
- Phase 1은 Tavily만 지원하지만, 현재 구현은 첫 provider가 unsupported이면 뒤에 `tavily`가 있어도 즉시 실패한다.
- 예: `providers: ['bing', 'tavily']`는 사용자가 Tavily fallback을 허용한 선호 목록처럼 보이지만 provider unsupported error로 끝난다.

## 제품 리스크

- agent나 UI가 장래 provider 목록을 보수적으로 넣으면 현재 지원 provider가 포함되어도 research가 실패한다.
- Phase 1 제약을 사용자에게 과하게 노출한다.
- preference order 의미와 실제 동작이 어긋난다.

## 개선 원칙

- provider list에서 현재 지원되는 첫 provider를 선택한다.
- unsupported provider는 warning으로 남겨 호출자가 설정 문제를 알 수 있게 한다.
- 지원 provider가 하나도 없으면 기존 unsupported provider error를 유지한다.

## A/B 검증 기준

- Before: `providers: ['bing', 'tavily']`가 `UNSUPPORTED_RESEARCH_PROVIDER`로 실패한다.
- After: 같은 입력은 Tavily로 검색하고 `Ignored unsupported research providers: bing.` warning을 반환한다.

## 실제 검증

- Before 구현 제거 상태:
  - `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "provider preference"` 실패.
  - 실패 원인: `provider "bing" not supported in Phase 1`.
- After supported-provider fallback 적용 상태:
  - 같은 focused run 통과.
