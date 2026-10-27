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

module.exports = {
    obterConfiguracao,
    obterStatusSeguro,
    obterCabecalhos,
    buscarPartidas
};
