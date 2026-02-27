const https = require('https');

// A API real que alimenta a busca:
// https://api.meucomercio.com.br/api/product/shop/1673173/products?page=1&perPage=20&search=dipirona
const url = 'https://api.meucomercio.com.br/api/product/shop/1673173/products?page=1&perPage=20&search=dipirona';

https.get(url, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const products = json.product || [];
            console.log(`Encontrou ${products.length} produtos via API.`);
            products.slice(0, 3).forEach(p => console.log(p.ProductName, p.PromoSalePrice || p.SalePrice));
        } catch (e) { console.error(e); }
    });
});
