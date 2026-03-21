import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { DecodedBookAccount } from "./Web3Service";
import { addBook, editBook } from "./Web3Service";

export default function BookForm() {

    const { connection } = useConnection();
    const wallet = useWallet();

    const [book, setBook] = useState<DecodedBookAccount>({
        id: 0,
        title: "",
        author: "",
        year: 0,
    });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function onSaveClick() {
        if (!book.id && (!book.title || !book.author || book.year <= 0)) {
            setError("Please fill in all fields with valid values");
            return;
        }

        if (!wallet.publicKey) {
            setError("Wallet not connected");
            return;
        }

        setError("");
        setIsLoading(true);
        console.log("Saving book:", book);

        try {
            if (book.id === 0) {
                await addBook(book, wallet, connection);
                setError("Book added successfully!");
            } else {
                await editBook(book, wallet, connection);
                setError("Book updated successfully!");
            }
            setBook({
                id: 0,
                title: "",
                author: "",
                year: 0,
            });
        } catch (err) {
            setError("Save failed: " + (err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div style={{ margin: 20 }}>
            <h2>Book Form</h2>
            <p>
                <label>ID: <input type="number" value={book.id} onChange={(evt) => setBook({ ...book, id: parseInt(evt.target.value) })} disabled={isLoading} /></label>
            </p>
            <p>
                <label>Title: <input type="text" value={book.title} onChange={(evt) => setBook({ ...book, title: evt.target.value })} disabled={isLoading} /></label>
            </p>
            <p>
                <label>Author: <input type="text" value={book.author} onChange={(evt) => setBook({ ...book, author: evt.target.value })} disabled={isLoading} /></label>
            </p>
            <p>
                <label>Year: <input type="number" value={book.year} onChange={(evt) => setBook({ ...book, year: parseInt(evt.target.value) })} disabled={isLoading} /></label>
            </p>
            <p>
                <button type="button" onClick={onSaveClick} disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save"}
                </button>
            </p>
            <p style={{ color: error.includes("successfully") ? "green" : "red" }}> {error} </p>
            <hr />
        </div>
    )
}