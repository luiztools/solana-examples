import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createTransferInstruction,
    getAccount,
    createAssociatedTokenAccountInstruction,
    TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";
import type { WalletContextState } from '@solana/wallet-adapter-react';

const TOKEN_MINT = new PublicKey(import.meta.env.VITE_SPL_TOKEN_MINT);
const TOKEN_DECIMALS = parseInt(import.meta.env.VITE_TOKEN_DECIMALS || "9");

function getATA(publicKey: PublicKey) {
    return getAssociatedTokenAddress(TOKEN_MINT, publicKey, false, TOKEN_2022_PROGRAM_ID);
}

function parseTokenAmount(amount: number | string) {
    return BigInt(Math.floor(Number(amount) * Math.pow(10, TOKEN_DECIMALS)));
}

function formatTokenAmount(amount: bigint | BigInt | number | string) {
    return Number(amount) / Math.pow(10, TOKEN_DECIMALS);
}

export async function getBalance(connection: Connection, publicKey: PublicKey, callback: (balance: number) => void) {
    const ata = await getATA(publicKey);

    // Listen for changes to the token account
    connection.onAccountChange(
        ata,
        (updatedAccountInfo) => {
            // Parse the token account data to get the balance
            const tokenAccount = {
                amount: updatedAccountInfo.data.readBigUInt64LE(64)
            };
            callback(formatTokenAmount(tokenAccount.amount));
        },
        "confirmed"
    );

    try {
        const tokenAccount = await getAccount(connection, ata, "confirmed", TOKEN_2022_PROGRAM_ID);
        return formatTokenAmount(tokenAccount.amount);
    } catch (error) {
        console.log("Token account not found, balance is 0");
        return 0;
    }
}

export async function sendTokens(connection: Connection, wallet: WalletContextState, toWallet: string, value: string) {
    const recipientPubKey = new PublicKey(toWallet);
    const transaction = new Transaction();

    const senderATA = await getATA(wallet.publicKey!);
    const recipientATA = await getATA(recipientPubKey);

    try {
        console.log("Checking if recipient token account exists...");
        await getAccount(connection, recipientATA, "confirmed", TOKEN_2022_PROGRAM_ID);
    } catch {
        console.log("Recipient token account not found, creating it...");
        transaction.add(
            createAssociatedTokenAccountInstruction(
                wallet.publicKey!,
                recipientATA,
                recipientPubKey,
                TOKEN_MINT,
                TOKEN_2022_PROGRAM_ID
            )
        );
    }

    //Create transfer instruction
    const tokenAmount = parseTokenAmount(value);
    const transferInstruction = createTransferInstruction(
        senderATA,
        recipientATA,
        wallet.publicKey!,
        tokenAmount,
        undefined,
        TOKEN_2022_PROGRAM_ID
    );

    transaction.add(transferInstruction);

    return wallet.sendTransaction(transaction, connection);
}