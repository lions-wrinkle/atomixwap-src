

const url = 'https://api.nftexplorer.app/v1'

export async function getAsset(assetId){

    const requestURL = `${url}/assets/verified/?assetId=${assetId}`;
    
    try {

        const response = await fetch(requestURL);
        console.log(response);

        if (!response.ok) {
            console.log(response.status);
        }

        console.log(response.headers.get('content-type'));
        const responseText = await response.json();
        console.log(responseText);

    } catch (err) {
        console.log(err);
    }
    
}

