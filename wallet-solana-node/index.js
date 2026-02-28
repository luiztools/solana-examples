//index.js
const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const WalletService = require("./WalletService");
let myAddress = "";

function preMenu() {
    rl.question(`Press any key to continue...`, () => {
        menu();
    })
}

function createWallet() {
    console.clear();

    const myWallet = WalletService.createWallet();
    myAddress = myWallet.publicKeyDecoded;

    console.log(`Your new wallet:`);
    console.log(myAddress);
    console.log(`Your secret key:`);
    console.log(myWallet.secretKeyDecoded);

    preMenu();
}

function recoverWallet() {
    console.clear();
    rl.question(`What is your secret key? `, (secretKey) => {
        const myWallet = WalletService.recoverWallet(secretKey);
        myAddress = myWallet.publicKeyDecoded;

        console.log(`Your recovered wallet:`);
        console.log(myAddress);

        preMenu();
    })
}

async function getBalance() {
    console.clear();

    if (!myAddress) {
        console.log(`You don't have a wallet yet.`);
        return preMenu();
    }

    const { lamports, sol } = await WalletService.getBalance();
    console.log(`SOL ${sol}`);

    preMenu();
}

function sendTx() {
    console.clear();

    if (!myAddress) {
        console.log(`You don't have a wallet yet.`);
        return preMenu();
    }

    console.log(`Your wallet is ${myAddress}`);
    rl.question(`To Wallet: `, (toWallet) => {

        rl.question(`Amount (in SOL): `, async (amountInSol) => {
            if (!amountInSol) {
                console.log(`Invalid amount.`);
                return preMenu();
            }

            const txHash = await WalletService.transfer(toWallet, amountInSol);
            console.log("Transaction successful: ");
            console.log(txHash);

            return preMenu();
        })
    })

    preMenu();
}

function menu() {
    setTimeout(() => {
        console.clear();

        if (myAddress)
            console.log(`You are logged as ${myAddress}`);
        else
            console.log(`You aren't logged.`);

        console.log("1 - Create Wallet");
        console.log("2 - Recover Wallet");
        console.log("3 - Balance");
        console.log("4 - Send SOL");
        rl.question("Choose your option: ", (answer) => {
            switch (answer) {
                case "1": createWallet(); break;
                case "2": recoverWallet(); break;
                case "3": getBalance(); break;
                case "4": sendTx(); break;
                default: {
                    console.log('Wrong option!');
                    menu();
                }
            }
        })

    }, 1000)
}

menu();