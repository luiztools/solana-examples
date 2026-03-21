import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { BorshAccountsCoder, BorshInstructionCoder, type Idl, BN } from "@coral-xyz/anchor";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";
import IDL from "./idl.json";

const programId = new PublicKey(import.meta.env.VITE_PROGRAM_ID);
const encoder = new TextEncoder();
const accountsCoder = new BorshAccountsCoder(IDL as Idl);
const instructionCoder = new BorshInstructionCoder(IDL as Idl);

type DecodedLibraryAccount = {
    nextId: number;
    authority: string;
};

export type DecodedBookAccount = {
    id: number;
    title: string;
    author: string;
    year: number;
};

type Account = { 
    pubkey: PublicKey; 
    isSigner: boolean; 
    isWritable: boolean 
};

function decodeBookAccountData(data: Uint8Array): DecodedBookAccount {
    const decoded = accountsCoder.decode("Book", Buffer.from(data)) as {
        id: number | BN;
        title: string;
        author: string;
        year: number | BN;
    };

    return {
        id: BN.isBN(decoded.id) ? decoded.id.toNumber() : decoded.id,
        title: decoded.title,
        author: decoded.author,
        year: BN.isBN(decoded.year) ? decoded.year.toNumber() : decoded.year,
    };
}

function decodeLibraryAccountData(data: Uint8Array): DecodedLibraryAccount {
    const decoded = accountsCoder.decode("Library", Buffer.from(data)) as {
        next_id: number | BN;
        authority: PublicKey;
    };

    return {
        nextId: BN.isBN(decoded.next_id) ? decoded.next_id.toNumber() : decoded.next_id,
        authority: decoded.authority.toBase58(),
    };
}

function getPda(seeds: (Uint8Array<ArrayBufferLike> | Buffer<ArrayBufferLike>)[]) {
    return PublicKey.findProgramAddressSync(seeds, programId)[0];
}

function getLibraryPda() {
    return getPda([encoder.encode("library")]);
}

function getBookPda(bookId: number) {
    return getPda([
        encoder.encode("book"),
        getLibraryPda().toBytes(),
        Uint8Array.from(new BN(bookId).toArray("le", 4)),
    ]);
}

export async function getBookData(bookId: number, connection: Connection) {
    const bookPda = getBookPda(Number(bookId));

    const account = await connection.getAccountInfo(bookPda);
    if (!account) throw new Error("Book not found");

    return decodeBookAccountData(account.data);
}

async function getNextBookId(connection: Connection) {
    const libraryPda = getLibraryPda();
    const account = await connection.getAccountInfo(libraryPda);
    if (!account) throw new Error("Library account not found, the program might not be initialized");

    const libraryData = decodeLibraryAccountData(account.data);
    return libraryData.nextId;
}

async function simulateAndLogTransaction(
    connection: Connection,
    tx: Transaction,
    feePayer: PublicKey,
    throwOnSimulationError = false,
) {
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = feePayer;

    const simulation = await connection.simulateTransaction(tx);
    console.log("Simulation result:", simulation);

    if (simulation.value.logs)
        console.log("Transaction logs:", simulation.value.logs);

    if (throwOnSimulationError && simulation.value.err) {
        console.error("Transaction simulation failed:", simulation.value.err);
        const errorMessage = JSON.stringify(simulation.value.err);
        throw new Error(`Simulation error: ${errorMessage}`);
    }
}

async function sendTransaction(fnName: string, ix: any, wallet: WalletContextState, connection: Connection, accounts: Account[]) {
    const instructionData = instructionCoder.encode(fnName, ix);

    const tx = new Transaction().add(
        new TransactionInstruction({
            programId,
            keys: accounts,
            data: instructionData,
        })
    );

    await simulateAndLogTransaction(connection, tx, wallet.publicKey!);

    try {
        const signature = await wallet.sendTransaction(tx, connection);
        console.log("Transaction sent with signature:", signature);
        return signature;
    } catch (error) {
        console.error("Transaction failed:", error);
    }
}

export async function deleteBook(bookId: number, wallet: WalletContextState, connection: Connection) {
    if (!wallet.publicKey) throw new Error("Wallet not connected");

    const libraryPda = getLibraryPda();
    const bookPda = getBookPda(bookId);

    return sendTransaction("delete_book", {}, wallet, connection, [
        { pubkey: libraryPda, isSigner: false, isWritable: true },
        { pubkey: bookPda, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    ]);
}

export async function editBook(book: DecodedBookAccount, wallet: WalletContextState, connection: Connection) {
    if (!wallet.publicKey) throw new Error("Wallet not connected");

    const libraryPda = getLibraryPda();
    const bookPda = getBookPda(book.id);

    return sendTransaction("edit_book", {
        id: Number(book.id),
        new_data: {
            title: book.title,
            author: book.author,
            year: book.year,
        },
    }, wallet, connection, [
        { pubkey: libraryPda, isSigner: false, isWritable: true },
        { pubkey: bookPda, isSigner: false, isWritable: true },
    ]);
}

export async function addBook(book: DecodedBookAccount, wallet: WalletContextState, connection: Connection) {
    if (!wallet.publicKey) throw new Error("Wallet not connected");

    const libraryPda = getLibraryPda();
    const nextId = await getNextBookId(connection);
    console.log("Next book ID:", nextId);

    const bookPda = getBookPda(nextId);
    console.log("Book PDA:", bookPda.toBase58());

    return sendTransaction("add_book", {
        book: {
            title: book.title,
            author: book.author,
            year: book.year,
        },
    }, wallet, connection, [
        { pubkey: libraryPda, isSigner: false, isWritable: true },
        { pubkey: bookPda, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
}

export async function initializeProgram(wallet: WalletContextState, connection: Connection) {
    if (!wallet.publicKey) throw new Error("Wallet not connected");

    const libraryPda = getLibraryPda();
    console.log("Initializing program with Library PDA:", libraryPda.toBase58());

    // Check if library account already exists
    const existingAccount = await connection.getAccountInfo(libraryPda);
    if (existingAccount) {
        console.log("Library account already initialized. Skipping.");
        return "already-initialized";
    }

    return sendTransaction("initialize", {}, wallet, connection, [
        { pubkey: libraryPda, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
}