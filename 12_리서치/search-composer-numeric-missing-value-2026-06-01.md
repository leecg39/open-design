# Search Composer Numeric Missing Value Recovery

## 관찰

- `/search --min-score`와 `/search --max-sources`는 공백형 값을 기대한다.
- 값이 빠지고 다음 토큰이 다른 flag이면, 기존 parser는 그 flag를 숫자값으로 소비한다.
- 예를 들어 `/search --min-score --images ...`는 `--images`를 invalid score로 처리해 visual research가 켜지지 않을 수 있다.

## 제품 리스크

- 사용자는 숫자 옵션 하나를 잘못 썼을 뿐인데, 뒤따르는 이미지/원문 수집 옵션까지 조용히 무시된다.
- prompt에는 invalid numeric warning만 남고, 실제로 어떤 기능 flag가 사라졌는지 알기 어렵다.
- 리서치 품질 옵션은 서로 조합해서 쓰는 경우가 많으므로 cursor recovery가 중요하다.

## 개선 원칙

- 숫자 flag가 값을 받지 못했을 때 다음 토큰이 `--`로 시작하면 값으로 소비하지 않는다.
- invalid numeric warning은 유지한다.
- 다음 flag는 정상적으로 계속 parsing한다.

## A/B 검증 기준

- Before: `/search --min-score --images --max-sources --raw Open Design evidence quality`에서 `--images`와 `--raw`가 무력화된다.
- After: invalid numeric warning을 남기면서 `includeImages`와 `includeRawContent`는 유지된다.
