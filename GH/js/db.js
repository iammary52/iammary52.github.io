// ============================================================
//  db.js  –  DB 추상 레이어
//
//  현재: Supabase 구현 / 테이블: master_project 단일
//  전환: createDbAdapter() 안의 구현만 교체하면 FastAPI로 이동
//
//  FastAPI 전환 예시:
//    getProjects: () => fetch(`${API}/projects`).then(r => r.json())
// ============================================================

function createDbAdapter() {
    const { SUPABASE_URL, SUPABASE_KEY, API_BASE_URL, DB_BACKEND } = window.APP_CONFIG;

    const sb = DB_BACKEND === 'supabase'
        ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: true, autoRefreshToken: true, storage: window.sessionStorage }
          })
        : null;

    return {
        // ── Auth ───────────────────────────────────────────
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
                const token = sessionStorage.getItem('gh_session');
                return Promise.resolve({ data: { session: token ? JSON.parse(token) : null } });
            },
            onAuthStateChange: (callback) => {
                if (DB_BACKEND === 'supabase') return sb.auth.onAuthStateChange(callback);
                return { data: { subscription: { unsubscribe: () => {} } } };
            },
        },

        // ── 프로젝트 목록 ───────────────────────────────────
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

        // ── 프로젝트 생성 ───────────────────────────────────
        createProject: async ({ year, half, scenario, description = null }) => {
            if (DB_BACKEND === 'supabase') {
                const { data: dup } = await sb.from('master_project').select('year')
                    .eq('year', year).eq('half', half).eq('scenario', scenario);
                if (dup && dup.length > 0)
                    throw new Error(`이미 존재하는 프로젝트입니다: ${year}년 ${half} ${scenario}`);
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

        // ── 프로젝트 설명 수정 ──────────────────────────────
        updateProjectDescription: async ({ year, half, scenario, description }) => {
            if (DB_BACKEND === 'supabase') {
                const { error } = await sb.from('master_project')
                    .update({ description })
                    .eq('year', year).eq('half', half).eq('scenario', scenario);
                if (error) throw error;
                return true;
            }
            const r = await fetch(
                `${API_BASE_URL}/projects/${year}/${encodeURIComponent(half)}/${encodeURIComponent(scenario)}/description`,
                { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description }) }
            );
            if (!r.ok) throw new Error(await r.text());
            return r.json();
        },

        // ── 프로젝트 삭제 ───────────────────────────────────
        deleteProject: async ({ year, half, scenario }) => {
            if (DB_BACKEND === 'supabase') {
                const { error } = await sb.from('master_project')
                    .delete().eq('year', year).eq('half', half).eq('scenario', scenario);
                if (error) throw error;
                return true;
            }
            const r = await fetch(
                `${API_BASE_URL}/projects/${year}/${encodeURIComponent(half)}/${encodeURIComponent(scenario)}`,
                { method: 'DELETE' }
            );
            if (!r.ok) throw new Error(await r.text());
            return r.json();
        },
    };
}

window.db = createDbAdapter();
