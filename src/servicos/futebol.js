const futebolAPI = require('./provedores/futebolAPI');
const transmissaoAPI = require('./provedores/transmissaoAPI');
const { listarCompeticoes } = require('./provedores/competicoes');

const SERVICO = 'RAVEX Futebol';

function obterStatus() {
    const fonte = futebolAPI.obterStatusSeguro();
    const disponivel = fonte.configurado;

    return {
        status: true,
        servico: SERVICO,
        versao: '1.0.0',
        fonte,
        recursos: {
            jogosHoje: disponivel,
            aoVivo: disponivel,
            buscarTime: disponivel,
            proximosJogos: disponivel,
            ondeAssistir: false
        },
        mensagem: disponivel
            ? 'Fonte esportiva configurada.'
            : 'Módulo de futebol carregado. Fonte esportiva ainda não configurada.'
    };
}

function dataLocalISO(data = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Luanda',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(data);
}

async function jogosHoje() {
    const hoje = dataLocalISO();
    const competicoes = listarCompeticoes();

    const resultados = await Promise.allSettled(
        competicoes.map(c => futebolAPI.buscarPartidas(c.id))
    );

    const jogos = [];
    let consultasOK = 0;
    let consultasFalharam = 0;

    for (const resultado of resultados) {
        if (resultado.status !== 'fulfilled') {
            consultasFalharam++;
            continue;
        }

        consultasOK++;

        for (const jogo of resultado.value) {
            if (!jogo.data) continue;

            const dataJogo = dataLocalISO(new Date(jogo.data));

            if (dataJogo === hoje) {
                jogos.push(jogo);
            }
        }
    }

    jogos.sort((a, b) => new Date(a.data) - new Date(b.data));

    return {
        status: true,
        data: hoje,
        total: jogos.length,
        consultas: {
            competicoes: competicoes.length,
            sucesso: consultasOK,
            falhas: consultasFalharam
        },
        jogos
    };
}

async function jogosAmanha() {
    const agora = new Date();
    const amanha = new Date(agora.getTime() + (24 * 60 * 60 * 1000));
    const dataAmanha = dataLocalISO(amanha);
    const competicoes = listarCompeticoes();

    const resultados = await Promise.allSettled(
        competicoes.map(c => futebolAPI.buscarPartidas(c.id))
    );

    const jogos = [];
    let consultasOK = 0;
    let consultasFalharam = 0;

    for (const resultado of resultados) {
        if (resultado.status !== "fulfilled") {
            consultasFalharam++;
            continue;
        }

        consultasOK++;

        for (const jogo of resultado.value) {
            if (!jogo.data) continue;

            const dataJogo = dataLocalISO(new Date(jogo.data));

            if (dataJogo === dataAmanha) {
                jogos.push(jogo);
            }
        }
    }

    jogos.sort((a, b) => new Date(a.data) - new Date(b.data));

    return {
        status: true,
        data: dataAmanha,
        total: jogos.length,
        consultas: {
            competicoes: competicoes.length,
            sucesso: consultasOK,
            falhas: consultasFalharam
        },
        jogos
    };
}

async function aoVivo() {
    const competicoes = listarCompeticoes();
    const resultados = await Promise.allSettled(
        competicoes.map(c => futebolAPI.buscarPartidas(c.id))
    );

    const jogos = [];
    let consultasOK = 0;
    let consultasFalharam = 0;

    for (const resultado of resultados) {
        if (resultado.status !== 'fulfilled') {
            consultasFalharam++;
            continue;
        }

        consultasOK++;
        jogos.push(...resultado.value.filter(jogo => jogo.estado === 'AO_VIVO'));
    }

    jogos.sort((a, b) => new Date(a.data) - new Date(b.data));

    return {
        status: true,
        total: jogos.length,
        consultas: {
            competicoes: competicoes.length,
            sucesso: consultasOK,
            falhas: consultasFalharam
        },
        jogos
    };
}

function normalizarTexto(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

async function buscarTime(nomeTime) {
    const busca = normalizarTexto(nomeTime);

    if (busca.length < 2) {
        throw new Error('Informe pelo menos 2 caracteres para buscar um time.');
    }

    const competicoes = listarCompeticoes();
    const resultados = await Promise.allSettled(
        competicoes.map(c => futebolAPI.buscarPartidas(c.id))
    );

    const encontrados = new Map();
    let consultasOK = 0;
    let consultasFalharam = 0;

    for (const resultado of resultados) {
        if (resultado.status !== 'fulfilled') {
            consultasFalharam++;
            continue;
        }

        consultasOK++;

        for (const jogo of resultado.value) {
            const casa = normalizarTexto(jogo.casa?.nome);
            const fora = normalizarTexto(jogo.fora?.nome);

            if (casa.includes(busca) || fora.includes(busca)) {
                encontrados.set(`${jogo.competicao.id}:${jogo.id}`, jogo);
            }
        }
    }

    const jogos = [...encontrados.values()]
        .sort((a, b) => new Date(a.data) - new Date(b.data));

    return {
        status: true,
        busca: String(nomeTime).trim(),
        total: jogos.length,
        consultas: {
            competicoes: competicoes.length,
            sucesso: consultasOK,
            falhas: consultasFalharam
        },
        jogos
    };
}

async function proximosJogos(nomeTime) {
    const resultado = await buscarTime(nomeTime);
    const agora = Date.now();

    const jogos = resultado.jogos
        .filter(jogo => {
            if (!jogo.data || jogo.finalizado) return false;
            const inicio = new Date(jogo.data).getTime();
            return Number.isFinite(inicio) && inicio > agora;
        })
        .sort((a, b) => new Date(a.data) - new Date(b.data));

    return {
        status: true,
        busca: resultado.busca,
        total: jogos.length,
        consultas: resultado.consultas,
        jogos
    };
}

async function ondeAssistir(nomeTime) {
    const busca = String(nomeTime || "").trim();
    if (busca.length < 2) throw new Error("Informe o nome do time.");

    const hoje = new Date();
    const fim = new Date(hoje.getTime() + 14 * 86400000);
    const iso = d => d.toISOString().slice(0, 10);

    const fixture = await transmissaoAPI.buscarFixtureTime(busca, iso(hoje), iso(fim));
    if (!fixture) return {
        status: true, busca, disponivel: false, jogo: null,
        transmissoes: [],
        mensagem: "Nenhuma partida com transmissão disponível foi encontrada nos próximos 14 dias."
    };

    const transmissoes = await transmissaoAPI.buscarTransmissoesFixture(fixture.id);
    const participantes = Array.isArray(fixture.participants) ? fixture.participants : [];
    const casa = participantes.find(p => p.meta?.location === "home");
    const fora = participantes.find(p => p.meta?.location === "away");

    return {
        status: true,
        busca,
        disponivel: transmissoes.length > 0,
        jogo: {
            id: fixture.id,
            nome: fixture.name || null,
            data: fixture.starting_at || null,
            casa: casa ? { nome: casa.name, escudo: casa.image_path || null } : null,
            fora: fora ? { nome: fora.name, escudo: fora.image_path || null } : null
        },
        transmissoes,
        mensagem: transmissoes.length
            ? "Transmissões oficiais encontradas."
            : "Nenhuma transmissão oficial cadastrada para esta partida."
    };
}

async function tabela(idCompeticao) {
    const competicao = String(idCompeticao || "").trim().toLowerCase();

    if (!competicao) {
        throw new Error("Informe a competição.");
    }

    const classificacao = await futebolAPI.buscarTabela(competicao);

    return {
        status: true,
        competicao,
        total: classificacao.length,
        tabela: classificacao
    };
}

async function artilheiros(idCompeticao) {
    const competicao = String(idCompeticao || "").trim().toLowerCase();
    if (!competicao) throw new Error("Informe a competição.");

    const jogadores = await futebolAPI.buscarArtilheiros(competicao);

    return {
        status: true,
        competicao,
        total: jogadores.length,
        artilheiros: jogadores
    };
}

async function calendario(idCompeticao) {
    const competicao = String(idCompeticao || "").trim().toLowerCase();
    if (!competicao) throw new Error("Informe a competição.");

    const jogos = await futebolAPI.buscarPartidas(competicao);

    return {
        status: true,
        competicao,
        total: jogos.length,
        jogos: [...jogos].sort((a, b) => new Date(a.data) - new Date(b.data))
    };
}

async function time(nomeTime) {
    const resultado = await buscarTime(nomeTime);
    const busca = normalizarTexto(nomeTime);

    const nomes = new Map();

    for (const jogo of resultado.jogos) {
        for (const equipe of [jogo.casa, jogo.fora]) {
            if (!equipe?.nome) continue;
            if (!normalizarTexto(equipe.nome).includes(busca)) continue;

            const chave = normalizarTexto(equipe.nome);
            if (!nomes.has(chave)) {
                nomes.set(chave, {
                    nome: equipe.nome,
                    escudo: equipe.escudo || null
                });
            }
        }
    }

    const equipes = [...nomes.values()];

    return {
        status: true,
        busca: resultado.busca,
        encontrado: equipes.length > 0,
        equipes,
        totalJogos: resultado.total,
        jogos: resultado.jogos
    };
}

async function confronto(nomeTime1, nomeTime2) {
    const time1 = normalizarTexto(nomeTime1);
    const time2 = normalizarTexto(nomeTime2);

    if (time1.length < 2 || time2.length < 2) {
        throw new Error("Informe os dois times do confronto.");
    }

    const competicoes = listarCompeticoes();
    const resultados = await Promise.allSettled(
        competicoes.map(c => futebolAPI.buscarPartidas(c.id))
    );

    const encontrados = new Map();
    let consultasOK = 0;
    let consultasFalharam = 0;

    for (const resultado of resultados) {
        if (resultado.status !== "fulfilled") {
            consultasFalharam++;
            continue;
        }

        consultasOK++;

        for (const jogo of resultado.value) {
            const casa = normalizarTexto(jogo.casa?.nome);
            const fora = normalizarTexto(jogo.fora?.nome);

            const corresponde =
                (casa.includes(time1) && fora.includes(time2)) ||
                (casa.includes(time2) && fora.includes(time1));

            if (corresponde) {
                encontrados.set(`${jogo.competicao.id}:${jogo.id}`, jogo);
            }
        }
    }

    const jogos = [...encontrados.values()]
        .sort((a, b) => new Date(b.data) - new Date(a.data));

    return {
        status: true,
        times: [
            String(nomeTime1).trim(),
            String(nomeTime2).trim()
        ],
        total: jogos.length,
        consultas: {
            competicoes: competicoes.length,
            sucesso: consultasOK,
            falhas: consultasFalharam
        },
        jogos
    };
}

async function ravexLive(nomeTime) {
    const resultado = await ondeAssistir(nomeTime);

    return {
        ...resultado,
        servico: "RAVEX Live",
        tipo: "TRANSMISSOES_OFICIAIS"
    };
}

module.exports = {
    obterStatus,
    jogosHoje,
    jogosAmanha,
    aoVivo,
    buscarTime,
    proximosJogos,
    ondeAssistir,
    tabela,
    artilheiros,
    calendario,
    time,
    confronto,
    ravexLive
};
