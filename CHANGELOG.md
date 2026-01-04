# [2.0.0](https://github.com/dankeboy36/boards-list/compare/1.1.0...2.0.0) (2026-01-04)


* feat!: change port key prefix to `port+` ([#5](https://github.com/dankeboy36/boards-list/issues/5)) ([12df6c7](https://github.com/dankeboy36/boards-list/commit/12df6c7390726fe66b4d5c7d77d96b15053e0254))


### BREAKING CHANGES

* Port keys now use the `port+` prefix instead of
`arduino+`; previously stored keys will not parse unless migrated.

Signed-off-by: dankeboy36 <dankeboy36@gmail.com>

# [1.1.0](https://github.com/dankeboy36/boards-list/compare/1.0.0...1.1.0) (2023-12-23)


### Features

* reuse CLI APIs for the board and port ([#3](https://github.com/dankeboy36/boards-list/issues/3)) ([649818a](https://github.com/dankeboy36/boards-list/commit/649818a5a6f084629239c528b9e7e3cf2742948a))

# 1.0.0 (2023-12-23)


### Bug Fixes

* expand boards if available on detected port ([e15d303](https://github.com/dankeboy36/boards-list/commit/e15d303b88a947e44025c80697b842f05a6de650)), closes [#2175](https://github.com/dankeboy36/boards-list/issues/2175)


### Features

* initial release ([#1](https://github.com/dankeboy36/boards-list/issues/1)) ([cd19e14](https://github.com/dankeboy36/boards-list/commit/cd19e1453cb965b9a79e9cf24a6cd70cb9a42f81))
* simplify board and port handling ([#2165](https://github.com/dankeboy36/boards-list/issues/2165)) ([e7d9bc9](https://github.com/dankeboy36/boards-list/commit/e7d9bc974e21d9def6b3480d42a03e21118e7fc0)), closes [#43](https://github.com/dankeboy36/boards-list/issues/43) [#82](https://github.com/dankeboy36/boards-list/issues/82) [#1319](https://github.com/dankeboy36/boards-list/issues/1319) [#1366](https://github.com/dankeboy36/boards-list/issues/1366) [#2143](https://github.com/dankeboy36/boards-list/issues/2143) [#2158](https://github.com/dankeboy36/boards-list/issues/2158)
