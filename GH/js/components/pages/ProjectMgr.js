// ============================================================
//  ProjectMgr.js  –  프로젝트 등록 및 관리 페이지
// ============================================================

function ProjectMgr({ manageList, onRefresh, setStatus }) {
    const [projYear,          setProjYear]          = React.useState(2025);
    const [projHalf,          setProjHalf]          = React.useState('상반기');
    const [projScenarioType,  setProjScenarioType]  = React.useState('기본안');
    const [projScenarioVal,   setProjScenarioVal]   = React.useState('시나리오1');
    const [projScenarioCustom,setProjScenarioCustom]= React.useState('');
    const [projScenarioDesc,  setProjScenarioDesc]  = React.useState('');

    const [isEditModalOpen,   setIsEditModalOpen]   = React.useState(false);
    const [editingProject,    setEditingProject]    = React.useState(null);
    const [editProjDesc,      setEditProjDesc]      = React.useState('');

    // ── 생성 ───────────────────────────────────────────────
    const handleCreate = async (e) => {
        e.preventDefault();
        const scenarioName = projScenarioType === '기본안'
            ? '기본안'
            : (projScenarioVal === '직접입력' ? projScenarioCustom.trim() : projScenarioVal);

        if (projScenarioType === '시나리오' && projScenarioVal === '직접입력' && !projScenarioCustom.trim()) {
            setStatus({ type: 'error', message: '시나리오 이름을 직접 입력해 주세요.' });
            return;
        }

        const projName = `${projYear}년 ${projHalf} ${scenarioName}`;
        setStatus({ type: 'loading', message: `'${projName}' 프로젝트를 DB에 생성 중...` });

        try {
            await window.db.createProject({
                year: parseInt(projYear),
                half: projHalf,
                scenario: scenarioName,
                description: projScenarioType === '시나리오' ? projScenarioDesc : null,
            });
            setStatus({ type: 'success', message: `'${projName}' 프로젝트가 등록되었습니다.` });
            if (projScenarioVal === '직접입력') setProjScenarioCustom('');
            setProjScenarioDesc('');
            setTimeout(onRefresh, 500);
        } catch (err) {
            setStatus({ type: 'error', message: err.message });
        }
    };

    // ── 삭제 ───────────────────────────────────────────────
    const handleDelete = async (p) => {
        if (!window.confirm(`[경고] '${p.origName}' 사업을 삭제하시겠습니까?\n\n하위 4개 테이블의 관련 데이터가 모두 영구 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`)) return;
        setStatus({ type: 'loading', message: `'${p.origName}' 삭제 중...` });
        try {
            await window.db.deleteProject({ year: p.year, half: p.half, scenario: p.scenario });
            setStatus({ type: 'success', message: `'${p.origName}' 삭제 완료.` });
            setTimeout(onRefresh, 500);
        } catch (err) {
            setStatus({ type: 'error', message: `삭제 실패: ${err.message}` });
        }
    };

    // ── 설명 수정 ──────────────────────────────────────────
    const handleEditDesc = async () => {
        if (!editingProject) return;
        setStatus({ type: 'loading', message: `설명 수정 중...` });
        try {
            await window.db.updateProjectDescription({
                year: editingProject.year,
                half: editingProject.half,
                scenario: editingProject.scenario,
                description: editProjDesc,
            });
            setStatus({ type: 'success', message: `'${editingProject.scenario}' 설명이 수정되었습니다.` });
            setIsEditModalOpen(false);
            setEditingProject(null);
            setEditProjDesc('');
            setTimeout(onRefresh, 500);
        } catch (err) {
            setStatus({ type: 'error', message: `수정 실패: ${err.message}` });
        }
    };

    return (
        <>
            <div className="two-col" style={{ gridTemplateColumns: '4fr 6fr', alignItems: 'start' }}>

                {/* 왼쪽: 생성 폼 */}
                <div className="panel" style={{ overflow: 'visible' }}>
                    <div className="phd"><div className="pt">새 프로젝트 생성</div></div>
                    <form onSubmit={handleCreate} className="pb" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                        <div>
                            <label className="login-lbl">연도 선택 (2025 ~ 2030년)</label>
                            <div className="year-btn-grid">
                                {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                                    <button
                                        key={y}
                                        type="button"
                                        className={`year-btn ${projYear === y ? 'active' : ''}`}
                                        onClick={() => setProjYear(y)}
                                    >
                                        <span>{y}년</span>
                                        <span className="year-btn-sub">Target Year</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="login-lbl">반기 선택</label>
                            <div className="segmented-control">
                                {['상반기', '하반기'].map(h => (
                                    <button key={h} type="button" className={`seg-btn ${projHalf === h ? 'active' : ''}`} onClick={() => setProjHalf(h)}>{h}</button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="login-lbl">안 구분</label>
                            <div className="segmented-control">
                                <button type="button" className={`seg-btn ${projScenarioType === '기본안' ? 'active' : ''}`}
                                    onClick={() => { setProjScenarioType('기본안'); setProjScenarioDesc(''); }}>
                                    기본안
                                </button>
                                <button type="button" className={`seg-btn ${projScenarioType === '시나리오' ? 'active' : ''}`}
                                    onClick={() => setProjScenarioType('시나리오')}>
                                    시나리오 지정
                                </button>
                            </div>
                        </div>

                        {projScenarioType === '시나리오' && (
                            <div>
                                <label className="login-lbl">시나리오 구분</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select className="popt-inp" style={{ flex: 1, minWidth: '100px' }} value={projScenarioVal} onChange={e => setProjScenarioVal(e.target.value)}>
                                        {['시나리오1','시나리오2','시나리오3','시나리오4','직접입력'].map(v => (
                                            <option key={v} value={v}>{v === '직접입력' ? '직접 입력' : v}</option>
                                        ))}
                                    </select>
                                    {projScenarioVal === '직접입력' && (
                                        <input type="text" className="popt-inp" style={{ flex: 1.5 }}
                                            value={projScenarioCustom} onChange={e => setProjScenarioCustom(e.target.value)}
                                            placeholder="예: 시나리오5" />
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="login-lbl">시나리오 설명</label>
                            <textarea
                                className="popt-inp"
                                style={{ width: '100%', height: '70px', resize: 'none' }}
                                value={projScenarioDesc}
                                onChange={e => setProjScenarioDesc(e.target.value)}
                                placeholder={projScenarioType === '기본안' ? '기본안은 설명이 필요하지 않습니다.' : '시나리오 상세 설명을 입력하세요.'}
                                disabled={projScenarioType === '기본안'}
                            />
                        </div>

                        <button type="submit" className="tbtn acc" style={{ width: '100%', height: '40px', justifyContent: 'center', marginTop: '6px' }}>
                            프로젝트 생성하기
                        </button>
                    </form>
                </div>

                {/* 오른쪽: 마스터 프로젝트 목록 */}
                <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '520px' }}>
                    <div className="phd"><div className="pt">마스터 프로젝트 목록 및 데이터 입력 현황</div></div>
                    <div className="pb" style={{ flex: 1, overflow: 'auto', padding: '15px' }}>
                        {manageList.length === 0 ? (
                            <div style={{ color: 'var(--text4)', textAlign: 'center', padding: '40px 0' }}>
                                등록된 마스터 프로젝트가 없습니다.
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="proj-table">
                                    <thead>
                                        <tr>
                                            <th>연도</th>
                                            <th>반기</th>
                                            <th>시나리오</th>
                                            <th>설명</th>
                                            <th style={{ textAlign: 'center' }}>토지비</th>
                                            <th style={{ textAlign: 'center' }}>개발비</th>
                                            <th style={{ textAlign: 'center' }}>분양</th>
                                            <th style={{ textAlign: 'center' }}>회수</th>
                                            <th style={{ textAlign: 'center' }}>관리</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {manageList.map(p => (
                                            <tr key={p.origName}>
                                                <td style={{ fontWeight: 600 }}>{p.year}년</td>
                                                <td>{p.half}</td>
                                                <td style={{ color: 'var(--acc)', fontWeight: 600 }}>{p.scenario}</td>
                                                <td style={{ whiteSpace: 'normal', wordBreak: 'break-all', color: 'var(--text3)', fontSize: '11.5px', maxWidth: '150px' }}>
                                                    {p.description || '-'}
                                                </td>
                                                {[p.hasLand, p.hasDev, p.hasSup, p.hasRec].map((has, i) => (
                                                    <td key={i} style={{ textAlign: 'center' }}>
                                                        <span className={`badge ${has ? 'success' : 'empty'}`}>{has ? '입력완료' : '미입력'}</span>
                                                    </td>
                                                ))}
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                        <button className="tbtn" style={{ height: '24px', padding: '1px 8px', fontSize: '11px' }}
                                                            onClick={() => { setEditingProject(p); setEditProjDesc(p.description || ''); setIsEditModalOpen(true); }}>
                                                            수정
                                                        </button>
                                                        <button className="tbtn danger" style={{ height: '24px', padding: '1px 8px', fontSize: '11px' }}
                                                            onClick={() => handleDelete(p)}>
                                                            삭제
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 설명 수정 모달 */}
            {isEditModalOpen && editingProject && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="modal-head">
                            <div className="modal-title">프로젝트 설명 수정</div>
                            <button className="modal-close" onClick={() => { setIsEditModalOpen(false); setEditingProject(null); setEditProjDesc(''); }}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ fontSize: '11.5px', color: 'var(--text3)' }}>
                                대상: <b>{editingProject.year}년 {editingProject.half} {editingProject.scenario}</b>
                            </div>
                            <div>
                                <label className="login-lbl">시나리오 설명</label>
                                <textarea
                                    className="popt-inp"
                                    style={{ width: '100%', height: '80px', resize: 'none', fontSize: '12px' }}
                                    value={editProjDesc}
                                    onChange={e => setEditProjDesc(e.target.value)}
                                    placeholder="수정할 설명을 입력하세요."
                                />
                            </div>
                        </div>
                        <div className="modal-foot">
                            <button className="tbtn" onClick={() => { setIsEditModalOpen(false); setEditingProject(null); setEditProjDesc(''); }}>취소</button>
                            <button className="tbtn acc" onClick={handleEditDesc}>저장</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
