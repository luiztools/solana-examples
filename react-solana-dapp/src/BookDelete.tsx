import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { deleteBook } from "./Web3Service";

export default function BookDelete() {

    const { connection } = useConnection();
    const wallet = useWallet();

    const [bookId, setBookId] = useState("0");
    const [error, setError] = useState("");

    async function onDeleteClick() {
        try {
            if (!wallet.publicKey) {
                setError("Wallet not connected");
                return;
            }

            await deleteBook(Number(bookId), wallet, connection);
            setError("Book deleted successfully!");
        } catch (err) {
            console.error(err);
            setError("Book not found");
        }
    }

    return (
        <div style={{ margin: 20 }}>
            <h2>Book Delete</h2>
            <p>
                <label>Book ID: <input type="number" value={bookId} onChange={(evt) => setBookId(evt.target.value)} /></label>
            </p>
            <p>
                <button type="button" onClick={onDeleteClick}>Delete</button>
            </p>
            <p style={{ color: error.includes("successfully") ? "green" : "red" }}> {error} </p>
            <hr />
        </div>
    );
}