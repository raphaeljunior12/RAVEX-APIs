function normalizarEscudo(valor) {
    if (!valor || String(valor).startsWith('data:')) return null;
    return String(valor).replace(/^http:\/\//i, 'https://');
}

function resultadoFinal(resultados = []) {
    return resultados.find(r => Number(r.resultTypeID) === 2)
        || resultados[resultados.length - 1]
        || null;
}

function obterEstado(partida) {
    if (partida.matchIsFinished) return 'FINALIZADO';

    const data = new Date(partida.matchDateTimeUTC || partida.matchDateTime || 0);
    const inicio = data.getTime();
    const agora = Date.now();

    if (!Number.isFinite(inicio) || inicio <= 0) return 'DESCONHECIDO';
    if (agora < inicio) return 'AGENDADO';
    if (agora <= inicio + (3 * 60 * 60 * 1000)) return 'AO_VIVO';

    return 'DESCONHECIDO';
}

function normalizarPartida(partida, competicao) {
    const resultado = resultadoFinal(partida.matchResults);

    return {
        id: partida.matchID ?? null,
        competicao: {
            id: competicao.id,
            nome: competicao.nome
        },
        casa: {
            nome: partida.team1?.teamName || 'Desconhecido',
            escudo: normalizarEscudo(partida.team1?.teamIconUrl)
        },
        fora: {
            nome: partida.team2?.teamName || 'Desconhecido',
            escudo: normalizarEscudo(partida.team2?.teamIconUrl)
        },
        placar: {
            casa: resultado?.pointsTeam1 ?? null,
            fora: resultado?.pointsTeam2 ?? null
        },
        data: partida.matchDateTimeUTC || partida.matchDateTime || null,
        finalizado: Boolean(partida.matchIsFinished),
        estado: obterEstado(partida)
    };
}

module.exports = {
    normalizarPartida
};
