// ============================================================
//  Stub.js  –  개발 예정 화면 플레이스홀더
// ============================================================

const STUB_META = {
    biz_master_mgr: {
        icon: '🏗️',
        title: '사업마스터관리',
        desc: '전체 사업 마스터 데이터의 통합 편집·분류·이관 기능을 제공합니다.',
    },
    excel_upload: {
        icon: '📤',
        title: '엑셀 업로드',
        desc: '엑셀 파일을 파싱해 용지비·조성비·공급·회수 테이블로 자동 이관합니다.',
    },
    settings_mgr: {
        icon: '⚙️',
        title: '시스템 설정',
        desc: 'DB 연결 정보, 사용자 권한, 알림 설정 등을 관리합니다.',
    },
};

function StubPage({ mode }) {
    const meta = STUB_META[mode] || {
        icon: '🚧',
        title: '준비중인 화면',
        desc: '이 기능은 현재 개발 준비 중입니다. 빠른 시일 내에 제공해 드리겠습니다.',
    };

    return (
        <div className="panel" style={{ padding: '60px 40px', textAlign: 'center', background: '#fff' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{meta.icon}</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                {meta.title}
            </h2>
            <p style={{ color: 'var(--text3)', fontSize: '13px', maxWidth: '360px', margin: '0 auto', lineHeight: 1.7 }}>
                {meta.desc}
            </p>
            <p style={{ color: 'var(--text4)', fontSize: '11.5px', marginTop: '20px' }}>
                개발 예정 · 준비중
            </p>
        </div>
    );
}
