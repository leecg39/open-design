# Web search quoted domain lists

## 배경

`/search --include-domains OpenAI.com,docs.openai.com ...`는 정상 동작하지만, 사용자가 값 전체를 따옴표로 감싸 `/search --include-domains "OpenAI.com,docs.openai.com" ...`라고 입력하면 기존 파서는 따옴표를 domain 문자열 일부로 취급했다.

## A/B 검증

- RED: `pnpm --filter @open-design/web exec vitest run -c vitest.config.ts tests/components/ChatComposer.search.test.tsx -t "domain flags"` 실패.
- 실패 내용: include domains가 모두 invalid 처리되어 command 예시에서 `--include-domains openai.com,docs.openai.com`가 빠졌다.
- 개선안: domain list 전체 값과 각 domain 항목에 대해 양끝이 같은 `'` 또는 `"` wrapping quote를 제거한다.
- GREEN: 같은 테스트 통과. quoted comma list도 `openai.com`, `docs.openai.com`으로 정규화된다.

## 반영 기준

검색 composer는 사용자가 CLI처럼 자연스럽게 쓰는 quoting을 받아들여야 한다. domain filter가 빠지면 공식 출처 제한 의도가 사라지므로, UI 단계에서 같은 의도를 안정적으로 metadata에 반영한다.
