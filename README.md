# PENXLE

![](https://vercelbadge.vercel.app/api/penxle/penxle)
![](https://img.shields.io/github/actions/workflow/status/penxle/penxle/ci.yml)
![](https://img.shields.io/github/license/penxle/penxle)
![](https://img.shields.io/github/languages/code-size/penxle/penxle)

함께 그리는 반짝임, PENXLE.

## 모노레포 구성

| 패키지                                                 | 설명                           |
| ------------------------------------------------------ | ------------------------------ |
| [`sites/penxle.com`](sites/penxle.com)                 | PENXLE 메인 사이트             |
| [`sites/penxle.io`](sites/penxle.io)                   | 펜슬컴퍼니 공식 사이트         |
| [`apps/media`](apps/media)                             | 미디어 최적화 전처리 및 후처리 |
| [`packages/eslint-config`](packages/eslint-config)     | ESLint 공용 설정               |
| [`packages/prettier-config`](packages/prettier-config) | Prettier 공용 설정             |
| [`packages/vite`](packages/vite)                       | Vite 서포트 패키지             |

## 디렉토리 구조

- `apps/`: 독립적으로 동작하는 애플리케이션 코드
- `packages/`: 사이트에서 공통으로 사용
- `scripts/`: 스크립트
- `sites/`: 사이트

## 시스템 요구사항

- Node 18 LTS 이상
- pnpm 8 이상
- Doppler CLI

## 외부 서비스 요구사항

|             서비스             |         목적          |
| :----------------------------: | :-------------------: |
|  [Vercel](https://vercel.com)  | 서비스 및 프리뷰 배포 |
| [Doppler](https://doppler.com) |  환경변수 중앙 관리   |

## 요구사항 설치

```bash
$ brew install node dopplerhq/cli/doppler
$ npm install -g pnpm
```

## 환경 초기화

```bash
$ git clone git@github.com:penxle/penxle.git
$ cd penxle
$ pnpm bootstrap

$ doppler login
$ cd sites/penxle.com
$ doppler setup # 명령 실행 후 본인 env 선택

$ cd ../..
$ pnpm codegen
```

## 실행

### 터미널에서 실행시

```bash
$ pnpm dev
```

### vscode에서 실행시

```
`Launch` 액션 사용시 자동으로 실행됨
```

## 라이센스 및 기여

- [LICENSE](LICENSE)
- [Contributor License Agreement](docs/CLA)
