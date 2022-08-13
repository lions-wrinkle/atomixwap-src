

const config = {

    network: 'testnet',

    urls: {
        mainnet: {
            algodUrl: 'https://node.algoexplorerapi.io',
            algoIndexerUrl: 'https://algoindexer.algoexplorerapi.io',

            claimApiUrl: 'http://localhost:3000',
            peraApiUrl: 'https://mainnet.api.perawallet.app/v1'
        },
        testnet: {
            algodUrl: 'https://node.testnet.algoexplorerapi.io',
            algoIndexerUrlTesnet: 'https://algoindexer.testnet.algoexplorerapi.io',

            claimApiUrl: 'http://localhost:3000',
            peraApiUrl: 'https://testnet.api.perawallet.app/v1'
        }
    }
    

    
}

export default config;