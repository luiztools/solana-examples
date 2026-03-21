import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { initializeProgram } from "./Web3Service";

export default function LibraryInitialize() {

    const { connection } = useConnection();
    const wallet = useWallet();

    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function onInitializeClick() {
        if (!wallet.publicKey) {
            setError("Wallet not connected");
            return;
        }

        setError("");
        setIsLoading(true);
        console.log("Initializing program...");

        try {
            await initializeProgram(wallet, connection);
            setError("Program initialized successfully!");
        } catch (err) {
            setError("Initialization failed: " + (err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div style={{ margin: 20 }}>
            <h2>Initialize</h2>
            <p>
                <button type="button" onClick={onInitializeClick} disabled={isLoading}>
                    {isLoading ? "Loading..." : "Initialize Program"}
                </button>
                <span style={{ marginLeft: 10, fontSize: 12, color: "gray" }}>
                    Click this first if you see "Library account not found"
                </span>
            </p>
            <p style={{ color: error.includes("successfully") ? "green" : "red" }}> {error} </p>
            <hr />
        </div>
    )
}