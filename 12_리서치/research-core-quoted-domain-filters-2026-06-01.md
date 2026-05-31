# Research core quoted domain filters

## 배경

web composer는 quoted domain list를 정규화하도록 보강했지만, API/CLI 등 다른 call site가 `includeDomains: ['"OpenAI.com"']` 또는 `excludeDomains: ["'Reddit.com'"]`처럼 값을 넘기면 core `searchResearch`는 해당 domain을 invalid로 버릴 수 있었다.

## A/B 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "forwards normalized domain filters"` 실패.
- 실패 내용: quoted `OpenAI.com`과 `Reddit.com`이 빠져 include order와 exclude metadata가 기대와 달라졌다.
- 개선안: core domain 정규화 전에 양끝이 같은 `'` 또는 `"` wrapping quote를 제거한다.
- GREEN: 같은 테스트 통과. quoted domain 값도 `openai.com`, `reddit.com`으로 정규화되어 provider body에 전달된다.

## 반영 기준

research domain filter는 공식 출처 제한과 노이즈 제거에 직접 영향을 준다. UI 밖에서 들어오는 값도 같은 의미로 해석되도록 core 경계를 보강한다.
