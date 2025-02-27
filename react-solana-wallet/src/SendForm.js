import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import * as buffer from "buffer";

function SendForm() {

    window.Buffer = buffer.Buffer;
    const { publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const [value, setValue] = useState("0.05");
    const [wallet, setWallet] = useState("d9zy8p3VL5Q3yQ9Zt8xCtbuwivcVx9EcjN1G9izP88Z");

    async function sendSol() {
        if (!publicKey) {
            console.error("Wallet not connected");
            return;
        }

        try {
            const recipientPubKey = new PublicKey(wallet);

            const transaction = new Transaction();
            const sendSolInstruction = SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: recipientPubKey,
                lamports: parseFloat(value) * LAMPORTS_PER_SOL
            });

            transaction.add(sendSolInstruction);

            const txHash = await sendTransaction(transaction, connection);
            console.log(`Transaction signature: ${txHash}`);
            alert("Transaction sent successfully! Tx Hash: " + txHash);
        } catch (error) {
            console.error("Transaction failed", error);
        }
    };

    return (
        <>
            {
                publicKey
                    ? (
                        <>
                            <p>Wallet:</p>
                            <div>
                                <input type="text" style={{ lineHeight: "40px", width: 260 }} value={wallet} onChange={(evt) => setWallet(evt.target.value)}></input>
                            </div>
                            <div style={{ display: "flex", marginTop: 10 }}>
                                <input type="number" style={{ lineHeight: "40px" }} value={value} onChange={(evt) => setValue(evt.target.value)} />
                                <button className="wallet-adapter-button-trigger wallet-adapter-button" onClick={sendSol}>Send SOL</button>
                            </div>
                        </>
                    )
                    : <></>
            }
        </>
    )

}
export default SendForm;