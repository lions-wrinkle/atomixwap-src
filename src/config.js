

const config = {

    network: 'testnet',

    urls: {
        mainnet: {
            algodUrl: 'https://node.algoexplorerapi.io',
            algoIndexerUrl: 'https://algoindexer.algoexplorerapi.io',

            claimApiUrl: 'https://api.atomixwap.xyz',
            peraApiUrl: 'https://mainnet.api.perawallet.app/v1'
        },
        testnet: {
            algodUrl: 'https://node.testnet.algoexplorerapi.io',
            algoIndexerUrl: 'https://algoindexer.testnet.algoexplorerapi.io',

            claimApiUrl: 'https://api.atomixwap.xyz',
            peraApiUrl: 'https://testnet.api.perawallet.app/v1'
        }
    }
    

    
}

export default config;