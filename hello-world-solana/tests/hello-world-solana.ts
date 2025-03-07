import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { HelloWorldSolana } from "../target/types/hello_world_solana";

describe("HelloWorldSolana Tests", () => {
  // conexão com a blockchain
  anchor.setProvider(anchor.AnchorProvider.env());

  // dependências para os testes
  const program = anchor.workspace.HelloWorldSolana as Program<HelloWorldSolana>;
  const helloWorldAccount = anchor.web3.Keypair.generate();

  it("Hello World", async () => {
    const testMessage = "Hello World";
    let tx = await program.methods.initialize(testMessage)
      .accounts({
        helloWorldAccount: helloWorldAccount.publicKey,
        user: anchor.getProvider().publicKey
      })
      .signers([helloWorldAccount])
      .rpc();

    const account = await program.account.helloWorldAccount.fetch(helloWorldAccount.publicKey);
    assert.ok(account.message === testMessage);
  });
});
