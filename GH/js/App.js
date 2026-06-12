// ============================================================
//  App.js  –  루트 컴포넌트
// ============================================================

const PAGE_LABEL = {
    project_mgr:   { eyebrow: 'Project List',      title: '프로젝트 등록 및 관리' },
    biz_master_mgr:{ eyebrow: 'Business Master',   title: '사업마스터관리' },
    excel_upload:  { eyebrow: 'Excel Upload',       title: '엑셀 업로드' },
    settings_mgr:  { eyebrow: 'Settings',           title: '설정' },
    view:          { eyebrow: 'Project Data',       title: '데이터 조회' },
    report:        { eyebrow: 'Project Analysis',   title: '현금흐름 리포트' },
};

const STUB_MODES = new Set(['biz_master_mgr', 'excel_upload', 'settings_mgr']);

// ── 메인 앱 (로그인 후) ──────────────────────────────────
function MainApp({ session, onLogout }) {
    const [appMode,    setAppMode]    = React.useState('project_mgr');
    const [amountUnit, setAmountUnit] = React.useState('억원');
    const [status,     setStatus]     = React.useState(null);
    const [manageList, setManageList] = React.useState([]);
    const [projectName,setProjectName]= React.useState('');
    const [nowTime,    setNowTime]    = React.useState('');

    React.useEffect(() => {
        const t = setInterval(() => setNowTime(new Date().toLocaleString('ko-KR', { hour12: false })), 1000);
        return () => clearInterval(t);
    }, []);

    // ── 전체 데이터 로드 ──────────────────────────────────
    const loadData = React.useCallback(async () => {
        setStatus({ type: 'loading', message: '마스터 데이터 동기화 중...' });
        try {
            const [masterRows, allData] = await Promise.all([
                window.db.getProjects(),
                window.db.getAllTableData(),
            ]);
            const { land: lRows, dev: dRows, sup: sRows, rec: rRows } = allData;

            const hasData = {};
            const mark = (rows, key) => (rows || []).forEach(r => {
                const k = `${r.year}_${r.half}_${r.scenario}`;
                if (!hasData[k]) hasData[k] = { land: false, dev: false, sup: false, rec: false };
                hasData[k][key] = true;
            });
            mark(lRows, 'land');
            mark(dRows, 'dev');
            mark(sRows, 'sup');
            mark(rRows, 'rec');

            const list = (masterRows || []).map(m => {
                const k = `${m.year}_${m.half}_${m.scenario}`;
                const s = hasData[k] || {};
                return {
                    origName:    `${m.year}년 ${m.half} ${m.scenario}`,
                    name:        `${m.year}년 ${m.half} ${m.scenario}`,
                    year:        m.year,
                    half:        m.half,
                    scenario:    m.scenario,
                    description: m.description,
                    hasLand:     !!s.land,
                    hasDev:      !!s.dev,
                    hasSup:      !!s.sup,
                    hasRec:      !!s.rec,
                };
            });

            list.sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                if (a.half !== b.half) return a.half === '상반기' ? -1 : 1;
                return a.scenario.localeCompare(b.scenario, 'ko');
            });

            setManageList(list);
            if (list.length > 0 && (!projectName || !list.some(x => x.origName === projectName))) {
                setProjectName(list[0].origName);
            }
            setStatus(null);
        } catch (e) {
            setStatus({ type: 'error', message: '데이터 로드 오류: ' + e.message });
        }
    }, []);

    React.useEffect(() => { loadData(); }, []);

    const handleSetMode = (mode) => { setAppMode(mode); setStatus(null); };

    const userEmail   = session?.user?.email || '운영자';
    const pageLabel   = PAGE_LABEL[appMode]   || { eyebrow: 'System', title: appMode };
    const displayName = (() => {
        if (!projectName) return '(없음)';
        const p = window.parseProjectName(projectName);
        return p.year ? (p.scenario === '기본안' ? `${p.year}년 ${p.half}` : `${p.year}년 ${p.half} ${p.scenario}`) : projectName;
    })();

    return (
        <div className="shell">
            <Sidebar appMode={appMode} setAppMode={handleSetMode} onLogout={onLogout} userEmail={userEmail} />

            <div className="main">
                {/* 톱바 */}
                <div className="topbar">
                    <div className="tb-title">
                        <div className="tb-eyebrow">{pageLabel.eyebrow}</div>
                        <div className="tb-pagename">{pageLabel.title}</div>
                    </div>
                    <div className="tb-meta">
                        {/* 대상 사업 선택 (view / report 에서 활성) */}
                        {(appMode === 'view' || appMode === 'report') && (
                            <div className="tb-sec" style={{ borderRight: '1px solid var(--border)', paddingRight: '12px', marginRight: '6px' }}>
                                <span className="tb-lbl" style={{ marginRight: '6px' }}>📂 <b>대상 사업:</b></span>
                                <select
                                    className="popt-inp"
                                    style={{ height: '30px', padding: '3px 8px', fontSize: '12px', minWidth: '180px' }}
                                    value={projectName}
                                    onChange={e => setProjectName(e.target.value)}
                                >
                                    {manageList.map(p => {
                                        const label = p.scenario === '기본안' ? `${p.year}년 ${p.half}` : `${p.year}년 ${p.half} ${p.scenario}`;
                                        return <option key={p.origName} value={p.origName}>{label}</option>;
                                    })}
                                    {manageList.length === 0 && <option value="">(등록된 프로젝트 없음)</option>}
                                </select>
                            </div>
                        )}

                        {/* 현재 선택 사업 표시 (view / report) */}
                        {(appMode === 'view' || appMode === 'report') && (
                            <div className="tb-sec">
                                <span className="tb-lbl">선택: <b style={{ color: 'var(--acc)' }}>{displayName}</b></span>
                            </div>
                        )}

                        {appMode === 'project_mgr' && (
                            <div className="tb-sec">
                                <span className="tb-lbl">프로젝트를 생성하고 관리하는 화면입니다</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 뷰 헤더 (단위 선택) */}
                <div className="view-hd">
                    <div className="vt">
                        {{ project_mgr: 'PROJECT MANAGEMENT', view: 'PIVOT CONSTRUCTOR', report: 'FINANCIAL REPORT' }[appMode] || appMode.toUpperCase()}
                    </div>
                    <div className="vmeta">
                        <span>출력 단위</span>
                        <select className="popt-inp" value={amountUnit} onChange={e => setAmountUnit(e.target.value)}>
                            <option value="천원">천원</option>
                            <option value="백만원">백만원</option>
                            <option value="억원">억원 (기본)</option>
                        </select>
                    </div>
                </div>

                {/* 본문 */}
                <div className="vbody">
                    {status && (
                        <div className={`alert-box alert-${status.type}`}>
                            <b>{ { error:'오류', success:'완료', loading:'진행' }[status.type] || '' }</b>
                            <span>{status.message}</span>
                        </div>
                    )}

                    {appMode === 'project_mgr' && (
                        <ProjectMgr
                            manageList={manageList}
                            onRefresh={loadData}
                            setStatus={setStatus}
                        />
                    )}

                    {appMode === 'view' && (
                        <DataView
                            projectName={projectName}
                            amountUnit={amountUnit}
                            setStatus={setStatus}
                            onExport={() => {}}
                        />
                    )}

                    {appMode === 'report' && (
                        <Report
                            projectName={projectName}
                            amountUnit={amountUnit}
                            setStatus={setStatus}
                        />
                    )}

                    {STUB_MODES.has(appMode) && (
                        <StubPage mode={appMode} />
                    )}
                </div>

                {/* 상태 바 */}
                <div className="stbar">
                    <div className="sti">탭 <b style={{ color: 'var(--acc)' }}>{appMode.toUpperCase()}</b></div>
                    <div className="stsep"></div>
                    <div className="sti">DB <b>master_project + 4 tables</b></div>
                    <div className="stsep"></div>
                    <div className="sti"><b style={{ color: 'var(--green)' }}>● Auth Active</b></div>
                    <div style={{ flex: 1 }}></div>
                    <div className="sti">{nowTime}</div>
                    <div className="stsep"></div>
                    <div className="sti">GH · v4.0</div>
                </div>
            </div>
        </div>
    );
}

// ── 루트 App (세션 분기) ──────────────────────────────────
function App() {
    const [session,  setSession]  = React.useState(null);
    const [checking, setChecking] = React.useState(true);

    React.useEffect(() => {
        window.db.auth.getSession().then(({ data: { session: s } }) => {
            setSession(s);
            setChecking(false);
        });

        const { data: { subscription } } = window.db.auth.onAuthStateChange((event, s) => {
            setSession(s);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        if (!window.confirm('로그아웃 하시겠습니까?')) return;
        await window.db.auth.signOut();
        setSession(null);
    };

    if (checking) {
        return (
            <div className="login-bg">
                <div style={{ color: '#cbd5e1', fontSize: '13px', letterSpacing: '.02em' }}>세션 확인 중...</div>
            </div>
        );
    }

    if (!session) return <LoginScreen onLoginSuccess={setSession} />;

    return <MainApp session={session} onLogout={handleLogout} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
