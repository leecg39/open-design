# Search Composer Unknown Flag Warning

## 관찰

- `/search` composer parser는 지원하지 않는 `--flag`를 만나면 parsing을 멈추고 남은 토큰을 query로 취급한다.
- 예를 들어 `/search --provider=tavily Open Design`은 `--provider=tavily Open Design` 자체가 검색어가 될 수 있다.
- 사용자는 옵션을 준다고 생각했는데 실제 Tavily query가 flag 문자열로 오염된다.

## 제품 리스크

- 잘못된 slash command 옵션이 source retrieval query 품질을 낮춘다.
- agent prompt에 canonical query로 unknown flag가 들어가면, 이후 리포트와 A/B 근거가 모두 왜곡된다.
- daemon CLI는 unknown flag를 에러로 다루므로 composer도 조용히 query에 섞기보다 알려주는 편이 일관적이다.

## 개선 원칙

- 지원하지 않는 leading `--flag`는 query에서 제거한다.
- `--flag=value` 형태는 한 토큰 안의 value까지 함께 제거한다.
- 공백 뒤 토큰은 실제 검색어일 수 있으므로 값이라고 추측해 버리지 않는다.
- 제거 사실은 `Research parser warning`으로 prompt에 남긴다.

## A/B 검증 기준

- Before: `/search --provider=tavily Open Design research`의 canonical query에 `--provider=tavily`가 섞인다.
- After: canonical query는 `Open Design research`이고, unknown flag 경고가 표시된다.
