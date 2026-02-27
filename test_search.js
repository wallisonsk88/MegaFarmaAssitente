const https = require('https');

https.get('https://meucomercio.com.br/megafarmacodo?search=dipirona', (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
        const match = data.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
        if (!match) {
            console.log("Next data regex NÂO ENCONTROU O JSON.");
            return;
        }
        const json = JSON.parse(match[1]);
        const products = json.props.pageProps.products || [];
        console.log(`Encontrou ${products.length} produtos.`);
        products.slice(0, 3).forEach(p => console.log(p.ProductName, p.PromoSalePrice || p.SalePrice));
    });
});
