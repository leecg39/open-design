# Research Report Unsafe Link Scheme Neutralization

## 관찰

- research Markdown report는 source URL을 Markdown link destination으로 렌더링한다.
- 기존 방어는 줄바꿈, 공백, angle bracket 구조 오염을 막지만 URL scheme은 그대로 둔다.
- provider가 `javascript:` 같은 non-web URL을 반환하면 보고서에서 클릭 가능한 위험 링크가 될 수 있다.

## 제품 리스크

- source content는 외부 untrusted evidence이므로 링크 자체도 untrusted input이다.
- 보고서 사용자가 source list를 클릭하는 순간 로컬 Markdown viewer나 브라우저 정책에 기대게 된다.
- research feature는 evidence trail을 만드는 기능이어서, 안전하지 않은 source link는 신뢰도를 떨어뜨린다.

## 개선 원칙

- source link destination은 `http:`와 `https:`만 허용한다.
- 기존 공백/줄바꿈 정규화는 유지해 정상 URL은 계속 한 줄 링크로 보존한다.
- non-web 또는 parse 불가능한 URL은 `<about:blank>`로 중립화한다.

## A/B 검증 기준

- Before: `javascript:alert(1)` source URL이 Markdown link destination으로 그대로 들어간다.
- After: 같은 source URL은 `<about:blank>`로 렌더링된다.
