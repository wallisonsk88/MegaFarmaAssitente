const fs = require('fs');
const html = fs.readFileSync('dump.html', 'utf16le');
const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
if (match) {
    const json = JSON.parse(match[1]);
    const store = json.props.pageProps.store;
    let products = [];
    if (store && store.categories) {
        store.categories.forEach(c => {
            if (c.child) {
                products = products.concat(c.child); // as vezes child tem produtos?
            }
        });
        console.log("Categorias encontradas:", store.categories.length);
        console.log("Exemplo Categoria 0:", JSON.stringify(store.categories[0]).substring(0, 100));

        // Verifica se os produtos estão anexados de alguma forma
        const allProductsRegex = html.match(/"ProductName":"(.*?)"/g);
        console.log("Produtos Regex:", allProductsRegex?.length);
    }
}
