const COMPETICOES = Object.freeze({
    champions: {
        nome: 'UEFA Champions League',
        liga: 'ucl',
        temporada: '2026'
    },
    premier: {
        nome: 'Premier League',
        liga: 'pl',
        temporada: '2026'
    },
    laliga: {
        nome: 'LaLiga',
        liga: 'la1',
        temporada: '2026'
    },
    bundesliga: {
        nome: 'Bundesliga',
        liga: 'bl1',
        temporada: '2026'
    },
    europa: {
        nome: 'UEFA Europa League',
        liga: 'uel2026',
        temporada: '2026'
    },
    conference: {
        nome: 'UEFA Conference League',
        liga: 'uecl2026',
        temporada: '2026'
    },
    mundial: {
        nome: 'FIFA World Cup 2026',
        liga: 'wm26',
        temporada: '2026'
    }
});

function listarCompeticoes() {
    return Object.entries(COMPETICOES).map(([id, dados]) => ({
        id,
        ...dados
    }));
}

function obterCompeticao(id) {
    return COMPETICOES[String(id || '').toLowerCase()] || null;
}

module.exports = {
    COMPETICOES,
    listarCompeticoes,
    obterCompeticao
};
