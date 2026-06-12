# GH 재무 의사결정지원 시스템 — 인수인계 문서

> 새 대화창 시작 시 이 문서를 먼저 읽어주세요.

---

## 프로젝트 개요

- **목적**: GH(경기주택도시공사) 중장기 재무 의사결정 지원 웹 시스템
- **현재 단계**: 테스트 버전 종료 → **완전 재설계 진행 중**
- **현재 구현 범위**: 프로젝트 등록/관리 (master_project 단일 테이블) 만 완성
- **향후 방향**: 로컬 PostgreSQL + FastAPI 백엔드로 전환 예정 (현재는 Supabase)

---

## 경로

| 항목 | 경로 |
|---|---|
| 작업 디렉터리 | `C:\Users\iamma\OneDrive\바탕 화면\업무\1. 개인\GH\26-06 재무의사결정\working\` |
| GitHub Pages 리포 | `C:\Users\iamma\OneDrive\문서\iammary52.github.io\` |
| 배포 URL | `https://iammary52.github.io/GH/` |
| 이전 버전 참조 | `working/reference/index.html` (구버전 전체 소스) |

---

## 파일 구조

```
working/
├── index.html          ← 메인 앱 (랜딩 + React 앱 all-in-one, file:// 실행 가능)
├── SQL.html            ← DB 스키마 & SQL 레퍼런스 문서
├── deploy.ps1          ← 배포 스크립트 (working → iammary52.github.io/GH/)
├── .gitignore          ← .claude/, *.xlsx, deploy.ps1 제외
├── css/
│   └── main.css        ← 전체 스타일
├── js/
│   ├── config.js       ← 환경 상수 (DB_BACKEND 스위치)
│   ├── db.js           ← DB 추상 레이어 ★ FastAPI 전환 핵심
│   ├── utils.js        ← 공통 유틸 (현재 parseProjectName만)
│   ├── App.js          ← 루트 컴포넌트 소스 (참조용)
│   ├── components/
│   │   ├── Login.js
│   │   ├── Sidebar.js
│   │   └── pages/
│   │       ├── ProjectMgr.js
│   │       ├── DataView.js   ← 소스만 보관 (미사용)
│   │       ├── Report.js     ← 소스만 보관 (미사용)
│   │       └── Stub.js
├── lib/                ← 오프라인 라이브러리
│   ├── react.production.min.js
│   ├── react-dom.production.min.js
│   ├── babel.min.js
│   ├── supabase.js
│   ├── xlsx.bundle.js  ← 현재 미사용 (향후 업로드 기능 복원 시 필요)
│   ├── chart.umd.min.js ← 현재 미사용 (향후 차트 기능 복원 시 필요)
│   └── fonts.css + fonts/
├── assets/             ← 이미지 (GH 로고, 배경)
└── reference/          ← ★ 이전 버전 전체 소스 보관 (기능 재구현 참조용)
```

> **주의**: `js/` 폴더의 컴포넌트 파일들은 **참조용 원본**입니다.  
> 실제 실행되는 코드는 **`index.html` 안에 인라인**으로 있습니다.  
> (이유: `file://` 로컬 실행 시 외부 Babel 스크립트 CORS 차단)

---

## 현재 구현된 화면

### 사이드바 메뉴

| 메뉴 | 상태 | 내용 |
|---|---|---|
| 프로젝트 등록 및 관리 | ✅ 완성 | master_project CRUD |
| 사업마스터관리 | 🚧 준비중 | 설계 예정 |
| 엑셀 업로드 | 🚧 준비중 | 설계 예정 |
| 설정 | 🚧 준비중 | 설계 예정 |

### 프로젝트 등록/관리 화면 기능
- 연도(2025~2030) / 반기 / 기본안·시나리오 선택으로 프로젝트 생성
- 마스터 프로젝트 목록 테이블 (연도·반기·시나리오·설명·수정·삭제)
- 설명 수정 모달
- Supabase DB 실시간 연동

---

## DB 구조 (현재)

**테이블 1개만 운영 중**: `master_project`

```sql
CREATE TABLE master_project (
    year        INT          NOT NULL,  -- PK, 2025~2035
    half        VARCHAR(10)  NOT NULL,  -- PK, 상반기|하반기
    scenario    VARCHAR(50)  NOT NULL,  -- PK
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (year, half, scenario)
);
```

- **Supabase**: `https://heriqvakrijvudvluzrw.supabase.co`
- RLS 활성화, authenticated 유저만 접근

---

## FastAPI 전환 방법

`js/config.js` 두 줄만 수정:
```js
DB_BACKEND:   'fastapi',
API_BASE_URL: 'http://localhost:8000/api',
```

현재 필요한 API 엔드포인트:
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/projects
POST   /api/projects
DELETE /api/projects/{year}/{half}/{scenario}
PATCH  /api/projects/{year}/{half}/{scenario}/description
```

---

## 배포 방법

```powershell
# 작업 디렉터리에서 실행
./deploy.ps1                        # 자동 커밋 메시지
./deploy.ps1 "GH: 변경 내용 설명"   # 직접 메시지
```

배포 제외 항목: `.claude/`, `reference/`, `*.xlsx`, `deploy.ps1`

---

## 이전 버전 참조 방법

기능 재구현 시 `reference/index.html` 참조. 주요 위치:

| 기능 | 참조할 함수/블록 |
|---|---|
| 데이터 조회 (피벗 테이블) | `executeDataView()`, `appMode === 'view'` 렌더 블록 |
| 현금흐름 리포트 (NPV·IRR) | `executeReport()`, `appMode === 'report'` 렌더 블록 |
| 엑셀 업로드 (다중 시트 파싱) | `processExcelAndUpload()` |
| 엑셀 내보내기 (스타일 포함) | `styleWorksheet()`, `exportToExcel()` |
| 대시보드 차트 | `appMode === 'dashboard'` 렌더 블록 |

---

## 주의 사항

1. **`index.html`은 단일 파일로 self-contained** — `js/` 폴더 컴포넌트는 별도 실행 안 됨
2. **컴포넌트 수정 시** → `index.html` 인라인 블록 수정 + `js/` 원본 파일도 동기화
3. **배포 후 GitHub Pages 반영은 약 1~2분 소요**
4. **라이브러리 오프라인 전용** — CDN 없이 `lib/` 폴더에서 로드
