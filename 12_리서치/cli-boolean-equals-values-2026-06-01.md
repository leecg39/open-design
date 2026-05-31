# CLI Boolean Equals Values

## 관찰

- 공용 CLI parser는 `--flag=value` 형태를 먼저 처리해 boolean flag라도 문자열 값으로 저장한다.
- 이 때문에 `--help=false` 같은 입력이 downstream에서 truthy string처럼 보일 수 있다.
- `--flag` 존재는 true로 유지하되, equals-form boolean은 명확히 `true`/`false`로 파싱하는 편이 예측 가능하다.

## 제품 리스크

- agent가 CLI flag를 기계적으로 생성할 때 `--flag=false`가 의도와 다르게 동작할 수 있다.
- boolean flag가 문자열로 섞이면 호출부마다 `=== true` 또는 truthy check 차이에 따라 표면이 달라진다.

## 개선 원칙

- `--boolean=true`와 `--boolean=false`를 실제 boolean으로 파싱한다.
- `--boolean=maybe` 같은 값은 명확한 에러로 거부한다.
- 기존 `--boolean` 단독 사용은 true로 유지한다.

## A/B 검증 기준

- Before: `parseFlags(['--help=false'])`가 `{ help: 'false' }`처럼 truthy 값을 만든다.
- After: 같은 입력은 `{ help: false }`를 만든다.
