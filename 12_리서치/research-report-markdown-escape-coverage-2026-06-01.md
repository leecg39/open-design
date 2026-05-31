# Research Report Markdown Escape Coverage

## 관찰

- 저장 리포트는 외부 출처 제목, 스니펫, 이미지 설명, query, summary를 Markdown 문서에 넣기 전에 escape한다.
- 현재 escape는 `[`는 처리하지만 `]`, `(`, `)`, `>`는 처리하지 않는다.
- Sources 섹션의 링크 텍스트 안에 `]`가 들어오면 Markdown 링크 구조가 깨질 수 있다.
- Summary가 `>`로 시작하면 blockquote처럼 렌더링될 수 있다.

## 제품 리스크

- 리서치 리포트는 외부 텍스트를 장기 보존하는 근거 파일이다.
- 링크 텍스트나 Summary가 Markdown 구조를 바꾸면 citation 링크와 섹션 경계가 흐려진다.
- 외부 검색 결과 제목에는 괄호, 대괄호, quote 스타일 문자가 흔하게 포함된다.

## 개선 원칙

- 외부 텍스트 escape 범위에 `]`, `(`, `)`, `>`를 추가한다.
- 줄 시작 list/blockquote 해석을 줄이기 위해 선행 `>`, `+`, `-`, 숫자 목록 패턴도 방어한다.
- URL 자체는 이미 link destination helper에서 별도로 처리하므로 텍스트 escape 대상과 분리한다.

## A/B 검증 기준

- Before: `Breaking ](https://bad.example)` 제목이 source link text를 닫을 수 있다.
- After: `Breaking \]\(https://bad.example\)`처럼 일반 텍스트로 렌더링된다.
- Before: Summary `> injected quote`가 blockquote로 보일 수 있다.
- After: `\> injected quote`로 일반 텍스트가 된다.
