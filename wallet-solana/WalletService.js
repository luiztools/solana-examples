const { Keypair, PublicKey, Connection, clusterApiUrl, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

let myWallet = null;

//const publicKey = new PublicKey(wallet.publicKey);
//const secretKey = wallet.secretKey;

function createWallet() {
    myWallet = new Keypair();
    return myWallet;
}

module.exports = {
    createWallet
}

async function getBalance() {
    try {
        
        const balance = await connection.getBalance(publicKey);
        console.log("Your balance is " + balance);
    } catch (err) {
        console.error(err);
    }
}

//1 SOL = 1 bilhão de Lamports
async function getSol() {
    try {
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
        const tx = await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction({ signature: tx });
    }
    catch (err) {
        console.error(err);
    }
}