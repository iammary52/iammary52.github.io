// ============================================================
//  Sidebar.js  –  사이드바 + 네비게이션
// ============================================================

const NAV = [
    {
        group: '관리 및 설정',
        items: [
            {
                id: 'project_mgr',
                label: '프로젝트 등록 및 관리',
                icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2',
            },
            {
                id: 'biz_master_mgr',
                label: '사업마스터관리',
                icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
            },
            {
                id: 'excel_upload',
                label: '엑셀 업로드',
                icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
            },
            {
                id: 'settings_mgr',
                label: '설정',
                icon: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z',
            },
        ],
    },
];

function Sidebar({ appMode, setAppMode, onLogout, userEmail }) {
    const userInitial = userEmail.charAt(0).toUpperCase();

    return (
        <aside className="sidebar">
            <div className="sb-brand">
                <div className="sb-mark">
                    <img src="assets/gh-header-logo.png" alt="GH 경기주택도시공사 CI" />
                </div>
                <div>
                    <div className="sb-brand-name">재무 의사결정지원 시스템</div>
                    <div className="sb-brand-sub">Financial Decision Support</div>
                </div>
            </div>

            <nav className="sb-nav">
                {NAV.map((g, gi) => (
                    <div key={gi}>
                        <div className="sb-grp">{g.group}</div>
                        {g.items.map(it => (
                            <div
                                key={it.id}
                                className={`sb-item ${appMode === it.id ? 'active' : ''}`}
                                onClick={() => setAppMode(it.id)}
                            >
                                <svg className="sb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                                    <path d={it.icon} />
                                </svg>
                                <span>{it.label}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </nav>

            <div className="sb-foot">
                <div className="sb-avatar">{userInitial}</div>
                <div className="sb-user-meta">
                    <div className="sb-user-name">{userEmail}</div>
                    <div className="sb-user-status">DB 정상</div>
                </div>
                <button className="logout-btn" onClick={onLogout}>로그아웃</button>
            </div>
        </aside>
    );
}
