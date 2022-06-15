

export async function loadAssetImage(assetId, imgElement, imgSize=200){

    let url = `https://mainnet.api.perawallet.app/v1/assets/${assetId}`;

    try {

        const assetInfo = await fetch(url);
        const info = await assetInfo.json();

        if (info.collectible.media[0]["preview_url"]){
            imgElement.src = `${info.collectible.media[0]["preview_url"]}?height=${imgSize}`;

        }

    } catch (err) {

        console.log(`Can't load asset image from ${url}`)
        imgElement.src = "default.png";
    }
    
    

}