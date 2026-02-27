const https = require('https');

https.get('https://meucomercio.com.br/megafarmacodo', res => {
    let html = '';
    res.on('data', c => { html += c; });
    res.on('end', () => {
        const match = html.match(/<script id="__NEXT_DATA__"(.*?)<\/script>/s);
        if (match) {
            const fulltext = match[1];
            console.log("Found Next data. Contains dipirona?", /dipirona/i.test(fulltext));

            // extrai __NEXT_DATA__ inteiro...
            const m2 = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
            if (m2) {
                const json = JSON.parse(m2[1]);
                const pageProps = json.props.pageProps;
                console.log("Store tem produtos pré-carregados?", pageProps.products?.length);
            }
        } else {
            console.log("No next data");
        }
    });
});
