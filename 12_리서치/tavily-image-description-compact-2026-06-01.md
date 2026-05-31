# Tavily Image Description Compact

## 관찰

- Tavily image description은 visual evidence metadata로 `ResearchImage.description`에 저장된다.
- 현재 `normalizeTavilyImage`는 description을 `trim().slice(0, 500)`만 적용한다.
- report renderer는 Markdown 구조를 escape하지만, stdout JSON과 agent fallback 소비자는 description을 직접 읽는다.

## 제품 리스크

- multi-line image description이 visual evidence list를 구조처럼 보이게 만들 수 있다.
- 긴 description은 실제 URL/source보다 노이즈가 커져 리서치 산출물의 재사용성을 떨어뜨린다.
- title/snippet/publishedAt과 마찬가지로 provider text metadata는 한 줄 bounded field로 맞추는 편이 일관적이다.

## 개선 원칙

- image description은 whitespace를 한 칸으로 compact한다.
- compact된 값은 기존 500자 제한을 유지한다.
- 빈 description은 기존처럼 생략한다.

## A/B 검증 기준

- Before: multi-line image description이 줄바꿈을 유지한 채 `ResearchImage.description`에 들어간다.
- After: 같은 description은 한 줄로 compact되고 500자 이하로 제한된다.

## 실제 검증

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "image descriptions"` 실패. top-level image description에 provider newline이 그대로 남았다.
- GREEN: 동일 명령 통과. top-level/source-level image description 모두 whitespace compact 후 500자로 제한된다.
