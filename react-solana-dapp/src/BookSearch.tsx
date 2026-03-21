import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getBookData } from "./Web3Service";

export default function BookSearch() {

    const { connection } = useConnection();
    const { publicKey } = useWallet();

    const [bookId, setBookId] = useState("0");
    const [result, setResult] = useState("");
    const [error, setError] = useState("");

    async function onSearchClick() {
        try {
            if (!publicKey) {
                setError("Wallet not connected");
                return;
            }

            const book = await getBookData(Number(bookId), connection);
            setResult(JSON.stringify(book, null, 2));
            setError("");
        } catch (err) {
            console.error(err);
            setError("Book not found");
        }
    }

    return (
        <div style={{ margin: 20 }}>
            <h2>Book Search</h2>
            <p>
                <label>Book ID: <input type="number" value={bookId} onChange={(evt) => setBookId(evt.target.value)} /></label>
            </p>
            <p>{result}</p>
            <p>
                <button type="button" onClick={onSearchClick}>Search</button>
            </p>
            <p style={{ color: "red" }}> {error} </p>
            <hr />
        </div>
    );
}