import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DefiProtocolAnchor } from "../target/types/defi_protocol_anchor";
import assert from "assert";

describe("defi-protocol-anchor", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const user = provider.wallet.publicKey;

  const program = anchor.workspace.defiProtocolAnchor as Program<DefiProtocolAnchor>;

  let vaultPda: anchor.web3.PublicKey;

  before(async () => {
    [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), user.toBuffer()],
      program.programId
    );
  });

  async function deposit(depositAmount: anchor.BN) {
    await program.methods
      .deposit(depositAmount)
      .accounts({
        vault: vaultPda,
        user,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  }

  describe("Deposit", () => {
    it("should successfully deposit SOL into vault", async () => {
      const depositAmount = new anchor.BN(1_000_000_000); // 1 SOL

      await deposit(depositAmount);

      const vaultAccount = await program.account.vault.fetch(vaultPda);
      assert.equal(vaultAccount.balance.toNumber(), depositAmount.toNumber());
    });

    it("should fail when depositing zero or negative amount", async () => {
      const invalidAmount = new anchor.BN(0);

      try {
        await deposit(invalidAmount);
        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.match(error.message, /InvalidAmount/);
      }
    });
  });

  describe("Withdraw", () => {
    it("should successfully withdraw SOL from vault", async () => {
      const withdrawAmount = new anchor.BN(500_000_000); // 0.5 SOL

      await deposit(withdrawAmount);

      const beforeBal = await provider.connection.getBalance(vaultPda);

      await program.methods
        .withdraw(withdrawAmount)
        .accounts({
          vault: vaultPda,
          user,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const afterBal = await provider.connection.getBalance(vaultPda);

      assert.ok(beforeBal === afterBal + withdrawAmount.toNumber());
    });

    it("should fail when withdrawing more than available balance", async () => {
      const excessiveAmount = new anchor.BN(10_000_000_000_000); // 10,000 SOL

      try {
        await program.methods
          .withdraw(excessiveAmount)
          .accounts({
            vault: vaultPda,
            user,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.match(error.message, /InsufficientBalance/);
      }
    });

    it("should fail when withdrawing from the wrong account", async () => {
      const depositAmount = new anchor.BN(1_000_000_000); // 1 SOL
      await deposit(depositAmount);

      let newUser = anchor.web3.Keypair.generate();
      const withdrawAmount = new anchor.BN(500_000_000); // 0.5 SOL

      try {
        await program.methods
          .withdraw(withdrawAmount)
          .accounts({
            vault: vaultPda,
            user: newUser.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([newUser])
          .rpc();

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.match(error.message, /ConstraintSeeds/);
      }
    });
  });
});