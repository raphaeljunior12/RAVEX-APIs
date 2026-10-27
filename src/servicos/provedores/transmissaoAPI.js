const { requisitarJson } = require('../../utilitarios/httpAPI');

function obterConfiguracao() {
    const nome = String(process.env.TRANSMISSAO_API_NOME || '').trim();
    const url = String(process.env.TRANSMISSAO_API_URL || '')
        .trim()
        .replace(/\/+$/, '');
    const chave = String(process.env.TRANSMISSAO_API_KEY || '').trim();

    return {
        configurado: Boolean(url && chave),
        nome: nome || 'Não configurada',
        url,
        chave
    };
}

function obterStatusSeguro() {
    const config = obterConfiguracao();

    return {
        configurado: config.configurado,
        nome: config.nome,
        possuiChave: Boolean(config.chave)
    };
}

function endpointComToken(caminho) {
    const config = obterConfiguracao();

    if (!config.configurado) {
        throw new Error('Fonte de transmissão não configurada.');
    }

    return `${config.url}${caminho}` +
        `${caminho.includes('?') ? '&' : '?'}api_token=${encodeURIComponent(config.chave)}`;
}

async function buscarTransmissoesFixture(fixtureId) {
    const id = Number(fixtureId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error('Fixture inválido.');
    }

    const dados = await requisitarJson(
        endpointComToken(`/tv-stations/fixtures/${id}`),
        {
            headers: { Accept: 'application/json' },
            timeout: 15000
        }
    );

    const lista = Array.isArray(dados?.data) ? dados.data : [];

    return lista.map(item => ({
        id: item.id ?? null,
        nome: item.name || null,
        url: item.url || null,
        logo: item.image_path || null,
        tipo: item.type || null
    }));
}

async function buscarFixturesEntre(dataInicio, dataFim) {
    const inicio = String(dataInicio || "").trim();
    const fim = String(dataFim || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) {
        throw new Error("Período de fixtures inválido.");
    }

    const dados = await requisitarJson(
        endpointComToken(`/fixtures/between/${inicio}/${fim}?include=participants`),
        { headers: { Accept: "application/json" }, timeout: 15000 }
    );

    return Array.isArray(dados?.data) ? dados.data : [];
}

function normalizarNomeTime(valor) {
    return String(valor || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().trim();
}

async function buscarFixtureTime(nomeTime, dataInicio, dataFim) {
    const busca = normalizarNomeTime(nomeTime);
    if (busca.length < 2) throw new Error("Informe o nome do time.");

    const fixtures = await buscarFixturesEntre(dataInicio, dataFim);
    const encontrados = fixtures.filter(f =>
        Array.isArray(f.participants) && f.participants.some(p =>
            normalizarNomeTime(p.name).includes(busca)
        )
    ).sort((a, b) => new Date(a.starting_at + "Z") - new Date(b.starting_at + "Z"));

    return encontrados[0] || null;
}

module.exports = {
    obterConfiguracao,
    obterStatusSeguro,
    buscarTransmissoesFixture,
    buscarFixturesEntre,
    buscarFixtureTime
};
