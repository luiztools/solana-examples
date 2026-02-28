const { Keypair, PublicKey, Connection, clusterApiUrl, LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction, SystemProgram } = require("@solana/web3.js");
const { binary_to_base58, base58_to_binary } = require("base58-js");

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

let myWallet = null;

function createWallet() {
    myWallet = new Keypair();
    myWallet.publicKeyDecoded = myWallet.publicKey.toBase58();
    myWallet.secretKeyDecoded = binary_to_base58(myWallet.secretKey);
    return myWallet;
}

function recoverWallet(secretKey) {
    const binarySecretKey = base58_to_binary(secretKey);
    myWallet = Keypair.fromSecretKey(binarySecretKey);
    myWallet.publicKeyDecoded = myWallet.publicKey.toBase58();
    myWallet.secretKeyDecoded = secretKey;
    return myWallet;
}

async function getBalance() {
    const balance = await connection.getBalance(new PublicKey(myWallet.publicKey));
    return {
        lamports: balance,
        sol: balance / LAMPORTS_PER_SOL
    }
}

async function transfer(to, amountInSol) {
    const transaction = new Transaction();

    const sendSolInstruction = SystemProgram.transfer({
        fromPubkey: new PublicKey(myWallet.publicKey),
        toPubkey: new PublicKey(to),
        lamports: LAMPORTS_PER_SOL * amountInSol,
    });

    transaction.add(sendSolInstruction);

    const txHash = await sendAndConfirmTransaction(connection, transaction, [myWallet]);
    return txHash;
}

module.exports = {
    createWallet,
    recoverWallet,
    getBalance,
    transfer
}