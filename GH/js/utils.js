// ============================================================
//  utils.js  –  공통 유틸리티 (현재 사용 중인 것만)
// ============================================================

window.parseProjectName = (name) => {
    const m = String(name).match(/^(\d{4})년\s+(상반기|하반기)\s+(.+)$/);
    if (m) return { year: parseInt(m[1]), half: m[2], scenario: m[3] };
    return { year: null, half: null, scenario: name };
};
