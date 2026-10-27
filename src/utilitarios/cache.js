const cache = new Map();

function obter(chave) {
    const item = cache.get(chave);

    if (!item) return null;

    if (Date.now() >= item.expiraEm) {
        cache.delete(chave);
        return null;
    }

    return item.valor;
}

function definir(chave, valor, ttlMs = 120000) {
    cache.set(chave, {
        valor,
        expiraEm: Date.now() + ttlMs
    });

    return valor;
}

function remover(chave) {
    return cache.delete(chave);
}

function limpar() {
    cache.clear();
}

function estatisticas() {
    return {
        itens: cache.size
    };
}

module.exports = {
    obter,
    definir,
    remover,
    limpar,
    estatisticas
};
