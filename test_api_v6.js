const https = require('https');

https.get('https://meucomercio.com.br/megafarmacodo', (res) => {
    let html = '';
    res.on('data', c => html += c);
    res.on('end', () => {
        // A página inicial tem todos os produtos ou as categorias com os produtos.
        const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        if (!match) return console.log("Sem next data.");

        try {
            const data = JSON.parse(match[1]);
            const products = data.props.pageProps.products || [];
            console.log("Produtos:", products.length);

            // Se vier vazio, tenta ver a estrutura das categorias
            if (products.length === 0) {
                const store = data.props.pageProps.store;
                console.log("Loja:", store.name, "Categorias:", store.categories?.length || 0);
            } else {
                const res = products.filter(p => p.ProductName.toLowerCase().includes('dipirona'));
                console.log("Encontrados filtrados:", res.length);
                res.slice(0, 3).forEach(p => console.log(p.ProductName, p.SalePrice));
            }
        } catch (e) { console.log(e.message); }
    });
});
