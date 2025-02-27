import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";

function BalanceDisplay() {
    const [balance, setBalance] = useState(0);
    const { connection } = useConnection();
    const { publicKey } = useWallet();

    useEffect(() => {
        const updateBalance = async () => {
            if (!connection || !publicKey) return;

            try {
                connection.onAccountChange(
                    publicKey,
                    (updatedAccountInfo) => {
                        setBalance(updatedAccountInfo.lamports / LAMPORTS_PER_SOL);
                    },
                    "confirmed",
                );

                const accountInfo = await connection.getAccountInfo(publicKey);

                if (accountInfo) {
                    setBalance(accountInfo.lamports / LAMPORTS_PER_SOL);
                } else {
                    throw new Error("Account info not found");
                }
            } catch (error) {
                console.error("Failed to retrieve account info:", error);
            }
        };

        updateBalance();
    }, [connection, publicKey]);

    return (
        <div>
            <p>{publicKey ? `Balance: ${balance} SOL` : ""}</p>
        </div>
    );
}

export default BalanceDisplay;