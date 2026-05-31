# Research contract quoted country parsing

## 배경

web composer와 core research는 quoted country를 보강했지만, agent에게 전달되는 `renderResearchCommandContract`도 별도 country 정규화를 갖고 있었다. 이 경로가 quoted country를 놓치면 command 예시에서 `--country`가 빠져 agent가 실제 의도보다 넓은 검색을 실행할 수 있다.

## A/B 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-contract.test.ts -t "normalized country boost"` 실패.
- 실패 내용: `country: "\"South Korea\""` 입력에서 command suffix가 `--country south-korea`를 포함하지 않았다.
- 개선안: contract country 정규화 전에 양끝이 같은 `'` 또는 `"` wrapping quote를 제거한다.
- GREEN: 같은 테스트 통과. contract command 예시가 `--depth shallow --country south-korea --max-sources 5`를 포함한다.

## 반영 기준

research의 UI, core, contract가 같은 입력을 같은 명령으로 해석해야 agent 실행 품질이 안정된다. contract 프롬프트도 실제 daemon 정규화와 맞춰 둔다.
