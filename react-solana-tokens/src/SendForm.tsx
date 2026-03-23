import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { sendTokens } from "./Web3Service";

function SendForm() {
    const wallet = useWallet();
    const { connection } = useConnection();
    const [value, setValue] = useState("0.5");
    const [toWallet, setToWallet] = useState("84DAeL8XrucYZuNX5m5y8h5tVDUPgQkYVcqGk4F43VGk");

    async function sendToken() {
        if (!wallet.publicKey) {
            console.error("Wallet not connected");
            return;
        }

        try {
            const hash = await sendTokens(connection, wallet, toWallet, value);
            console.log(`Transaction signature: ${hash}`);
            alert("Transaction sent successfully! Tx Hash: " + hash);
        } catch (error) {
            console.error("Transaction failed", error);
            alert("Transaction failed: " + (error instanceof Error ? error.message : String(error)));
        }
    };

    return (
        <>
            {
                wallet.publicKey ? 
                <>
                    <p>Wallet:</p>
                    <div>
                        <input type="text" style={{ lineHeight: "40px", width: 260 }} value={toWallet} onChange={(evt) => setToWallet(evt.target.value)}></input>
                    </div>
                    <div style={{ display: "flex", marginTop: 10 }}>
                        <input type="number" style={{ lineHeight: "40px" }} value={value} onChange={(evt) => setValue(evt.target.value)} />
                        <button className="wallet-adapter-button-trigger wallet-adapter-button" onClick={sendToken}>Send Token</button>
                    </div>
                </>
                : <></>
            }
        </>
    )
}

export default SendForm;