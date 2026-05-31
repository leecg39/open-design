# Research Report Source Domain Visibility

## 관찰

- 저장 리포트의 Sources 섹션은 `1. [Title](https://...)` 형태로 출처를 표시한다.
- Markdown 렌더러에서는 링크 URL이 숨겨지고 제목만 보이는 경우가 많다.
- 현재 괄호 메타데이터에는 published, score, raw excerpt truncated 등은 표시되지만 도메인은 표시되지 않는다.

## 제품 리스크

- 리서치 품질 판단에서는 출처 제목만큼 출처 도메인이 중요하다.
- 같은 주제라도 공식 문서, 뉴스, 블로그, 커뮤니티 출처를 빠르게 구분해야 한다.
- URL hover나 원문 클릭 없이 도메인을 볼 수 없으면 저장 리포트의 검토 속도가 떨어진다.

## 개선 원칙

- Sources 항목의 괄호 메타데이터 첫 항목으로 hostname을 표시한다.
- `www.` 접두사는 제거해 스캔성을 높인다.
- URL이 예외적으로 파싱되지 않으면 기존 출력처럼 도메인 없이 표시한다.
- 출처 번호, 링크, published, score, raw excerpt truncated 정보는 유지한다.

## A/B 검증 기준

- Before: `1. [Title](https://example.com/page) (score 0.9)`처럼 도메인이 보이지 않는다.
- After: `1. [Title](https://example.com/page) (example.com; score 0.9)`처럼 도메인이 바로 보인다.
