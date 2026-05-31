# Research core quoted country parsing

## 배경

web composer에서 quoted country를 처리해도, API/CLI 또는 다른 call site가 `country: "\"South Korea\""`처럼 값을 넘기면 core `searchResearch`는 invalid country로 보고 country boost를 누락할 수 있었다.

## A/B 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "forwards country boosts"` 실패.
- 실패 내용: general search의 `country`가 `south korea`가 아니라 `undefined`였다.
- 개선안: core country 정규화 전에 양끝이 같은 `'` 또는 `"` wrapping quote를 제거한다.
- GREEN: 같은 테스트 통과. quoted `South Korea`가 `south korea`로 정규화되어 Tavily body에도 전달된다.

## 반영 기준

research 기능은 web composer, API, CLI가 같은 입력 의미를 유지해야 한다. core 정규화를 보강하면 UI 밖에서 들어오는 명령도 같은 country boost 품질을 갖는다.
