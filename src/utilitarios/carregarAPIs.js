const fs = require('fs');
const path = require('path');

const ARQUIVO = path.resolve(__dirname, '../../APIs.env');

function carregarAPIs() {
    if (!fs.existsSync(ARQUIVO)) {
        return;
    }

    const conteudo = fs.readFileSync(ARQUIVO, 'utf8');

    for (const linhaOriginal of conteudo.split(/\r?\n/)) {
        const linha = linhaOriginal.trim();

        if (!linha || linha.startsWith('#')) {
            continue;
        }

        const posicao = linha.indexOf('=');

        if (posicao <= 0) {
            continue;
        }

        const nome = linha.slice(0, posicao).trim();
        let valor = linha.slice(posicao + 1).trim();

        if (
            (valor.startsWith('"') && valor.endsWith('"')) ||
            (valor.startsWith("'") && valor.endsWith("'"))
        ) {
            valor = valor.slice(1, -1);
        }

        if (!(nome in process.env)) {
            process.env[nome] = valor;
        }
    }
}

module.exports = carregarAPIs;
