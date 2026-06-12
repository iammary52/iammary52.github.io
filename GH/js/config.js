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
};
