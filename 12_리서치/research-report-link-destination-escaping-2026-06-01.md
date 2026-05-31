# Research Report Link Destination Escaping

## 관찰

- source URL은 Markdown 링크 destination 안에 `<...>` 형태로 출력된다.
- 기존 처리는 `>`만 `%3E`로 바꾼다.
- URL 문자열에 줄바꿈, 공백, `<`가 섞이면 링크 destination이 깨지거나 리포트 구조를 흔들 수 있다.

## 제품 리스크

- 리서치 리포트의 source list는 가장 중요한 근거 색인이다.
- 링크 destination이 깨지면 클릭 가능한 출처와 표시 텍스트가 어긋난다.
- 외부 provider/프록시 응답을 최종 파일로 저장하는 경계에서는 URL도 방어적으로 다뤄야 한다.

## 개선 원칙

- 정상 URL은 기존 표시를 유지한다.
- whitespace는 `%20`으로, `<`/`>`는 percent-encoded 형태로 바꾼다.
- source title과 domain 표시 정책은 유지한다.

## A/B 검증 기준

- Before: source URL에 줄바꿈과 heading 문자가 있으면 link destination 안에서 줄이 갈라질 수 있다.
- After: 같은 URL은 한 줄의 percent-encoded link destination으로 남는다.
