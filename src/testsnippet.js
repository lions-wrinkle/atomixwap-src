


const transactionsGroup = [tx1, tx2, tx3, tx4];

algosdk.assignGroupID(transactions);
const transactionsToSign = [tx2, tx3, tx4];

const transactionsToSignPera = transactionsToSign.map(tx => ({ txn: tx }))

try {
    signedTransactions = await wallet.signTransaction([transactionsToSignPera]);
} catch(err) {
    console.log(err);
}