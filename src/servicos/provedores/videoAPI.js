const { requisitarJson } = require('../../utilitarios/httpAPI');

function obterConfiguracao() {
    const nome = String(process.env.VIDEO_API_NOME || 'Highlightly').trim();
    const url = String(process.env.VIDEO_API_URL || '').trim().replace(/\/+$/, '');
    const chave = String(process.env.HIGHLIGHTLY_API_KEY || '').trim();

    return {
        nome,
        url,
        chave,
        configurado: Boolean(url && chave)
    };
}

function normalizarTexto(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\b(fc|cf|afc|sc)\b/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function mesmoTime(a, b) {
    const x = normalizarTexto(a);
    const y = normalizarTexto(b);

    if (!x || !y) return false;

    return x === y || x.includes(y) || y.includes(x);
}

function dataISO(data) {
    return data.toISOString().slice(0, 10);
}

function criarDatas(diasPassados = 30) {
    const datas = [];
    const hoje = new Date();

    for (let i = 0; i <= diasPassados; i++) {
        const d = new Date(hoje);
        d.setUTCDate(d.getUTCDate() - i);
        datas.push(dataISO(d));
    }

    return datas;
}

async function buscarHighlightsData(data, limite = 100) {
    const config = obterConfiguracao();

    if (!config.configurado) {
        throw new Error('API de vídeo não configurada.');
    }

    const endpoint =
        `${config.url}/highlights?date=${encodeURIComponent(data)}` +
        `&limit=${Math.min(Math.max(Number(limite) || 40, 1), 40)}`;

    const dados = await requisitarJson(endpoint, {
        headers: {
            Accept: 'application/json',
            'x-rapidapi-key': config.chave
        },
        timeout: 20000
    });

    return Array.isArray(dados?.data) ? dados.data : [];
}

function correspondeConfronto(item, time1, time2) {
    const casa = item?.match?.homeTeam?.name || '';
    const fora = item?.match?.awayTeam?.name || '';

    return (
        (mesmoTime(casa, time1) && mesmoTime(fora, time2)) ||
        (mesmoTime(casa, time2) && mesmoTime(fora, time1))
    );
}

function normalizarHighlight(item) {
    return {
        id: item?.id ?? null,
        tipo: item?.type || null,
        titulo: item?.title || null,
        descricao: item?.description || null,
        url: /^https:\/\//i.test(String(item?.url || ''))
            ? item.url
            : null,
        embedUrl: /^https:\/\//i.test(String(item?.embedUrl || ''))
            ? item.embedUrl
            : null,
        imagem: /^https:\/\//i.test(String(item?.imgUrl || ''))
            ? item.imgUrl
            : null,
        canal: item?.channel || null,
        fonte: item?.source || null,
        jogo: {
            id: item?.match?.id ?? null,
            nome:
                item?.match?.homeTeam?.name && item?.match?.awayTeam?.name
                    ? `${item.match.homeTeam.name} vs ${item.match.awayTeam.name}`
                    : null,
            data: item?.match?.date || null,
            casa: {
                id: item?.match?.homeTeam?.id ?? null,
                nome: item?.match?.homeTeam?.name || null,
                escudo: item?.match?.homeTeam?.logo || null
            },
            fora: {
                id: item?.match?.awayTeam?.id ?? null,
                nome: item?.match?.awayTeam?.name || null,
                escudo: item?.match?.awayTeam?.logo || null
            },
            competicao: item?.match?.league?.name || null,
            pais: item?.match?.country?.name || null
        }
    };
}

async function buscarVideoConfronto(time1, time2, opcoes = {}) {
    const a = String(time1 || '').trim();
    const b = String(time2 || '').trim();

    if (a.length < 2 || b.length < 2) {
        throw new Error('Informe os dois times do confronto.');
    }

    const maxDias = Math.min(
        Math.max(Number(opcoes.dias) || 30, 1),
        60
    );

    const datas = criarDatas(maxDias);

    for (const data of datas) {
        const lista = await buscarHighlightsData(data, 40);
        const encontrados = lista
            .filter(item => correspondeConfronto(item, a, b))
            .sort((x, y) => {
                const tx = new Date(x?.match?.date || 0).getTime();
                const ty = new Date(y?.match?.date || 0).getTime();
                return ty - tx;
            });

        if (encontrados.length) {
            const preferido =
                encontrados.find(item =>
                    String(item?.type || '').toUpperCase().includes('VERIFIED')
                ) ||
                encontrados.find(item => item?.embedUrl) ||
                encontrados.find(item => item?.url) ||
                encontrados[0];

            return {
                encontrado: true,
                video: normalizarHighlight(preferido),
                alternativas: encontrados.map(normalizarHighlight)
            };
        }
    }

    return {
        encontrado: false,
        video: null,
        alternativas: []
    };
}

module.exports = {
    obterConfiguracao,
    normalizarTexto,
    buscarHighlightsData,
    buscarVideoConfronto
};
