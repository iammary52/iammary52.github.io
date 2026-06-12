// ============================================================
//  db.js  –  DB 추상 레이어
//
//  현재: Supabase 구현
//  전환: createDbAdapter() 안의 구현만 교체하면 FastAPI로 이동
//        → 각 메서드 시그니처(인터페이스)는 그대로 유지
//
//  FastAPI 전환 예시:
//    async getProjects() {
//        const r = await fetch(`${API}/projects`);
//        return r.json();
//    }
// ============================================================

function createDbAdapter() {
    const { SUPABASE_URL, SUPABASE_KEY, API_BASE_URL, DB_BACKEND } = window.APP_CONFIG;

    // ── Supabase 클라이언트 (DB_BACKEND === 'supabase' 일 때만 사용) ──
    const sb = DB_BACKEND === 'supabase'
        ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: true, autoRefreshToken: true, storage: window.sessionStorage }
          })
        : null;

    // ── 공통 헬퍼 ──────────────────────────────────────────────
    const fetchAllRows = async (tableName, filter = null) => {
        if (DB_BACKEND === 'supabase') {
            let allData = [];
            let from = 0;
            const limit = 1000;
            while (true) {
                let q = sb.from(tableName).select('*').range(from, from + limit - 1);
                if (filter) {
                    q = q.eq('year', filter.year).eq('half', filter.half).eq('scenario', filter.scenario);
                }
                const { data, error } = await q;
                if (error) {
                    if (error.code === '42P01') return [];
                    throw error;
                }
                if (!data || data.length === 0) break;
                allData = allData.concat(data);
                if (data.length < limit) break;
                from += limit;
            }
            return allData;
        }

        // FastAPI 구현 예시
        const params = filter
            ? `?year=${filter.year}&half=${encodeURIComponent(filter.half)}&scenario=${encodeURIComponent(filter.scenario)}`
            : '';
        const r = await fetch(`${API_BASE_URL}/tables/${tableName}${params}`);
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    };

    // ── 인터페이스 ──────────────────────────────────────────────
    return {
        // Auth
        auth: {
            signIn: (email, password) => {
                if (DB_BACKEND === 'supabase')
                    return sb.auth.signInWithPassword({ email, password });
                return fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                }).then(r => r.json());
            },
            signOut: () => {
                if (DB_BACKEND === 'supabase') return sb.auth.signOut();
                return fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
            },
            getSession: () => {
                if (DB_BACKEND === 'supabase') return sb.auth.getSession();
                // FastAPI: 세션 토큰을 sessionStorage에서 복원
                const token = sessionStorage.getItem('gh_session');
                return Promise.resolve({ data: { session: token ? JSON.parse(token) : null } });
            },
            onAuthStateChange: (callback) => {
                if (DB_BACKEND === 'supabase') return sb.auth.onAuthStateChange(callback);
                return { data: { subscription: { unsubscribe: () => {} } } };
            },
        },

        // 프로젝트 목록
        getProjects: async () => {
            if (DB_BACKEND === 'supabase') {
                const { data, error } = await sb.from('master_project').select('*');
                if (error) throw error;
                return data || [];
            }
            const r = await fetch(`${API_BASE_URL}/projects`);
            if (!r.ok) throw new Error(await r.text());
            return r.json();
        },

        // 프로젝트 생성
        createProject: async ({ year, half, scenario, description = null }) => {
            if (DB_BACKEND === 'supabase') {
                // 중복 체크
                const { data: dup } = await sb.from('master_project').select('year')
                    .eq('year', year).eq('half', half).eq('scenario', scenario);
                if (dup && dup.length > 0) throw new Error(`이미 존재하는 프로젝트입니다: ${year}년 ${half} ${scenario}`);
                const { error } = await sb.from('master_project').insert({ year, half, scenario, description });
                if (error) throw error;
                return true;
            }
            const r = await fetch(`${API_BASE_URL}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year, half, scenario, description }),
            });
            if (!r.ok) throw new Error(await r.text());
            return r.json();
        },

        // 프로젝트 설명 수정
        updateProjectDescription: async ({ year, half, scenario, description }) => {
            if (DB_BACKEND === 'supabase') {
                const { error } = await sb.from('master_project')
                    .update({ description })
                    .eq('year', year).eq('half', half).eq('scenario', scenario);
                if (error) throw error;
                return true;
            }
            const r = await fetch(`${API_BASE_URL}/projects/${year}/${encodeURIComponent(half)}/${encodeURIComponent(scenario)}/description`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description }),
            });
            if (!r.ok) throw new Error(await r.text());
            return r.json();
        },

        // 프로젝트 삭제 (하위 테이블 CASCADE)
        deleteProject: async ({ year, half, scenario }) => {
            if (DB_BACKEND === 'supabase') {
                const { error } = await sb.from('master_project')
                    .delete().eq('year', year).eq('half', half).eq('scenario', scenario);
                if (error) throw error;
                return true;
            }
            const r = await fetch(`${API_BASE_URL}/projects/${year}/${encodeURIComponent(half)}/${encodeURIComponent(scenario)}`, {
                method: 'DELETE',
            });
            if (!r.ok) throw new Error(await r.text());
            return r.json();
        },

        // 단일 테이블 데이터 조회
        getTableData: async (tableName, { year, half, scenario }) => {
            return fetchAllRows(tableName, { year, half, scenario });
        },

        // 모든 테이블 전체 조회 (대시보드용)
        getAllTableData: async () => {
            const [land, dev, sup, rec] = await Promise.all([
                fetchAllRows('land_costs'),
                fetchAllRows('development_costs'),
                fetchAllRows('supplies'),
                fetchAllRows('recoveries'),
            ]);
            return { land, dev, sup, rec };
        },

        // 엑셀 파싱 후 테이블 벌크 업서트
        upsertTableRows: async (tableName, rows) => {
            if (DB_BACKEND === 'supabase') {
                for (let i = 0; i < rows.length; i += 1000) {
                    const { error } = await sb.from(tableName).insert(rows.slice(i, i + 1000));
                    if (error) throw error;
                }
                return true;
            }
            const r = await fetch(`${API_BASE_URL}/tables/${tableName}/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rows),
            });
            if (!r.ok) throw new Error(await r.text());
            return r.json();
        },

        // 엑셀 업로드 전 기존 데이터 초기화
        clearTableData: async (tableName, { year, half, scenario }) => {
            if (DB_BACKEND === 'supabase') {
                const { error } = await sb.from(tableName)
                    .delete().eq('year', year).eq('half', half).eq('scenario', scenario);
                if (error) throw error;
                return true;
            }
            const r = await fetch(
                `${API_BASE_URL}/tables/${tableName}?year=${year}&half=${encodeURIComponent(half)}&scenario=${encodeURIComponent(scenario)}`,
                { method: 'DELETE' }
            );
            if (!r.ok) throw new Error(await r.text());
            return r.json();
        },
    };
}

// 싱글턴 – 앱 전체에서 window.db 로 접근
window.db = createDbAdapter();
