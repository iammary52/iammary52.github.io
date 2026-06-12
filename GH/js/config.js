// ============================================================
//  config.js  –  환경 상수
//  FastAPI 전환 시: DB_BACKEND = 'fastapi', API_BASE_URL 설정
// ============================================================

window.APP_CONFIG = {
    // 'supabase' | 'fastapi'
    DB_BACKEND: 'supabase',

    // Supabase
    SUPABASE_URL: 'https://heriqvakrijvudvluzrw.supabase.co',
    SUPABASE_KEY: 'sb_publishable_Z-31-p1MTLwBPYCnzEpq6g_6w3QWYmy',

    // FastAPI (로컬 PostgreSQL 전환 시 사용)
    API_BASE_URL: 'http://localhost:8000/api',

    // 공통
    CHART_COLORS: ['#004a9c','#0091da','#16a34a','#ea580c','#9333ea','#dc2626','#d97706','#475569'],
    CAT_OPTIONS:  ['택지','산단','주택','기타'],
    TABLES: [
        { id: 'land_costs',        label: '용지비' },
        { id: 'development_costs', label: '조성비' },
        { id: 'supplies',          label: '공급'   },
        { id: 'recoveries',        label: '회수'   },
    ],
};
