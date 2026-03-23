import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { getBalance } from "./Web3Service";

function BalanceDisplay() {
    const [balance, setBalance] = useState(0);
    const { connection } = useConnection();
    const { publicKey } = useWallet();

    useEffect(() => {
        const updateBalance = async () => {
            if (!connection || !publicKey) {
                console.error("Wallet not connected or connection unavailable");
                return;
            }

            try {
                const balance = await getBalance(connection, publicKey, setBalance);
                setBalance(balance);
            } catch (error) {
                console.error("Failed to retrieve token account info:", error);
            }
        };

        updateBalance();
    }, [connection, publicKey]);

    return (
        <div>
            <p>{publicKey ? `Balance: ${balance} Tokens` : ""}</p>
        </div>
    );
}

export default BalanceDisplay;