# Research report blank source titles

## 배경

provider가 빈 source title을 반환하면 saved Markdown report의 Key Findings와 Sources가 `- [1] : ...`, `1. [](<url>)`처럼 읽기 어려운 형태가 될 수 있었다. Tavily 정규화는 보통 URL fallback title을 만들지만, report builder는 재사용 가능한 경계라 자체 fallback이 필요하다.

## A/B 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts -t "source URLs as report titles"` 실패.
- 실패 내용: report가 `- [1] : Evidence...`와 `1. [](<https://example.com/source>)`를 생성했다.
- 개선안: report renderer에서 source title이 blank면 credential-stripped display URL을 title fallback으로 사용한다.
- GREEN: 같은 테스트 통과. Key Findings와 Sources 모두 `https://example.com/source`를 readable title로 사용한다.

## 반영 기준

saved report는 나중에 다시 읽는 artifact다. provider title이 비어도 citation과 source list가 비어 보이지 않아야 사용자가 근거를 빠르게 확인할 수 있다.
