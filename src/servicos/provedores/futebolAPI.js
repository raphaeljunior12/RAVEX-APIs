const { requisitarJson } = require('../../utilitarios/httpAPI');
const cache = require('../../utilitarios/cache');
const { obterCompeticao } = require('./competicoes');
const { normalizarPartida } = require('./normalizarPartida');

const requisicoesEmAndamento = new Map();

function obterConfiguracao() {
    const nome = String(process.env.FUTEBOL_API_NOME || '').trim();
    const url = String(process.env.FUTEBOL_API_URL || '')
        .trim()
        .replace(/\/+$/, '');
    const chave = String(process.env.FUTEBOL_API_KEY || '').trim();
    const cabecalho = String(process.env.FUTEBOL_API_HEADER || '').trim();

    return {
        configurado: Boolean(url),
        nome: nome || 'Não configurada',
        url,
        chave,
        cabecalho
    };
}

function obterStatusSeguro() {
    const config = obterConfiguracao();

    return {
        configurado: config.configurado,
        nome: config.nome,
        possuiChave: Boolean(config.chave),
        possuiCabecalho: Boolean(config.cabecalho)
    };
}

function obterCabecalhos() {
    const config = obterConfiguracao();
    const headers = {
        Accept: 'application/json'
    };

    if (config.chave && config.cabecalho) {
        headers[config.cabecalho] = config.chave;
    }

    return headers;
}

async function buscarPartidas(idCompeticao) {
    const config = obterConfiguracao();
    const competicao = obterCompeticao(idCompeticao);

    if (!config.configurado) {
        throw new Error('Fonte de futebol não configurada.');
    }

    if (!competicao) {
        throw new Error('Competição não suportada pela RAVEX Futebol.');
    }

    const chaveCache = `futebol:${idCompeticao}`;
    const armazenado = cache.obter(chaveCache);

    if (armazenado) {
        return armazenado;
    }

    if (requisicoesEmAndamento.has(chaveCache)) {
        return requisicoesEmAndamento.get(chaveCache);
    }

    const requisicao = (async () => {
        const endpoint =
        `${config.url}/getmatchdata/` +
        `${encodeURIComponent(competicao.liga)}/` +
        `${encodeURIComponent(competicao.temporada)}`;

    const dados = await requisitarJson(endpoint, {
        headers: obterCabecalhos(),
        timeout: 15000
    });

    if (!Array.isArray(dados)) {
        throw new Error(
            'A fonte esportiva retornou um formato inesperado.'
        );
    }

    const partidas = dados.map(partida =>
        normalizarPartida(partida, {
            id: idCompeticao,
            nome: competicao.nome
        })
    );

        cache.definir(chaveCache, partidas, 120000);
        return partidas;
    })();

    requisicoesEmAndamento.set(chaveCache, requisicao);

    try {
        return await requisicao;
    } finally {
        requisicoesEmAndamento.delete(chaveCache);
    }
}

async function buscarTabela(idCompeticao) {
    const config = obterConfiguracao();
    const competicao = obterCompeticao(idCompeticao);

    if (!config.configurado) {
        throw new Error("Fonte de futebol não configurada.");
    }

    if (!competicao) {
        throw new Error("Competição não suportada pela RAVEX Futebol.");
    }

    const chaveCache = `futebol:tabela:${idCompeticao}`;
    const armazenado = cache.obter(chaveCache);

    if (armazenado) {
        return armazenado;
    }

    const endpoint =
        `${config.url}/getbltable/` +
        `${encodeURIComponent(competicao.liga)}/` +
        `${encodeURIComponent(competicao.temporada)}`;

    const dados = await requisitarJson(endpoint, {
        headers: obterCabecalhos(),
        timeout: 15000
    });

    if (!Array.isArray(dados)) {
        throw new Error("A fonte esportiva retornou uma tabela em formato inesperado.");
    }

    const tabela = dados.map((time, indice) => ({
        posicao: indice + 1,
        id: time.teamInfoId ?? null,
        nome: time.teamName || time.shortName || "Desconhecido",
        nomeCurto: time.shortName || null,
        escudo: String(time.teamIconUrl || "").startsWith("https://")
            ? time.teamIconUrl
            : null,
        pontos: Number(time.points || 0),
        jogos: Number(time.matches || 0),
        vitorias: Number(time.won || 0),
        empates: Number(time.draw || 0),
        derrotas: Number(time.lost || 0),
        golsPro: Number(time.goals || 0),
        golsContra: Number(time.opponentGoals || 0),
        saldoGols: Number(time.goalDiff || 0)
    }));

    cache.definir(chaveCache, tabela, 120000);
    return tabela;
}

async function buscarArtilheiros(idCompeticao) {
    const config = obterConfiguracao();
    const competicao = obterCompeticao(idCompeticao);

    if (!config.configurado) {
        throw new Error("Fonte de futebol não configurada.");
    }

    if (!competicao) {
        throw new Error("Competição não suportada pela RAVEX Futebol.");
    }

    const chaveCache = `futebol:artilheiros:${idCompeticao}`;
    const armazenado = cache.obter(chaveCache);

    if (armazenado) {
        return armazenado;
    }

    const endpoint =
        `${config.url}/getgoalgetters/` +
        `${encodeURIComponent(competicao.liga)}/` +
        `${encodeURIComponent(competicao.temporada)}`;

    const dados = await requisitarJson(endpoint, {
        headers: obterCabecalhos(),
        timeout: 15000
    });

    if (!Array.isArray(dados)) {
        throw new Error("A fonte esportiva retornou artilheiros em formato inesperado.");
    }

    const artilheiros = dados
        .map((jogador, indice) => ({
            posicao: indice + 1,
            id: jogador.goalGetterId ?? null,
            nome: jogador.goalGetterName || "Desconhecido",
            gols: Number(jogador.goalCount || 0)
        }))
        .sort((a, b) => b.gols - a.gols || a.posicao - b.posicao)
        .map((jogador, indice) => ({
            ...jogador,
            posicao: indice + 1
        }));

    cache.definir(chaveCache, artilheiros, 120000);
    return artilheiros;
}

module.exports = {
    obterConfiguracao,
    obterStatusSeguro,
    obterCabecalhos,
    buscarPartidas,
    buscarTabela,
    buscarArtilheiros
};
