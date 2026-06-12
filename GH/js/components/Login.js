// ============================================================
//  Login.js  –  로그인 화면 컴포넌트
// ============================================================

function LoginScreen({ onLoginSuccess }) {
    const [email,    setEmail]    = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading,  setLoading]  = React.useState(false);
    const [error,    setError]    = React.useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('이메일과 비밀번호를 모두 입력해주세요.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const { data, error: authErr } = await window.db.auth.signIn(email.trim(), password);
            if (authErr) throw authErr;
            if (data?.session) {
                onLoginSuccess(data.session);
            } else {
                throw new Error('세션 발급에 실패했습니다.');
            }
        } catch (err) {
            let msg = err.message || '로그인에 실패했습니다.';
            if (msg.includes('Invalid login credentials'))
                msg = '이메일 또는 비밀번호가 일치하지 않습니다.';
            else if (msg.includes('Email not confirmed'))
                msg = '이메일 인증이 완료되지 않았습니다. 관리자에게 문의하세요.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-bg">
            <div className="login-card">
                <div className="login-head">
                    <div className="login-mark">
                        <div className="login-mark-dot">
                            <img src="assets/gh-header-logo.png" alt="GH 경기주택도시공사 CI" />
                        </div>
                        <div className="login-mark-name">GH · 재무 의사결정지원 시스템</div>
                    </div>
                    <div className="login-title">로그인</div>
                    <div className="login-sub">승인된 운영자 계정으로 데이터 파이프라인에 접근합니다</div>
                </div>
                <form className="login-body" onSubmit={handleLogin}>
                    {error && <div className="login-err">{error}</div>}
                    <div className="login-field">
                        <label className="login-lbl">이메일</label>
                        <input
                            type="email"
                            className="login-inp"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@company.local"
                            autoFocus
                            disabled={loading}
                        />
                    </div>
                    <div className="login-field">
                        <label className="login-lbl">비밀번호</label>
                        <input
                            type="password"
                            className="login-inp"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            disabled={loading}
                        />
                    </div>
                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? '인증 중...' : '로그인'}
                    </button>
                </form>
                <div className="login-footer">
                    Secured by Auth · 승인된 사용자만 접근 가능
                </div>
            </div>
        </div>
    );
}
