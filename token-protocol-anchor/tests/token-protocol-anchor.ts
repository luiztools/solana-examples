import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import assert from "assert";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { TokenProtocolAnchor } from "../target/types/token_protocol_anchor";

describe("token-protocol-anchor", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const user = provider.wallet.publicKey;

  const program = anchor.workspace.tokenProtocolAnchor as Program<TokenProtocolAnchor>;

  let vaultPda: anchor.web3.PublicKey;

  let mint: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;

  before(async () => {
    [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), user.toBuffer()],
      program.programId
    );

    // create mint and give user some tokens
    mint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      9 // decimals
    );

    await createAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      user
    );

    // mint some tokens to user account
    userTokenAccount = await getAssociatedTokenAddress(mint, user);
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint,
      userTokenAccount,
      provider.wallet.publicKey,
      10_000_000_000 // 10 tokens with decimals 9
    );
  });

  async function deposit(depositAmount: anchor.BN) {
    const [vaultTokenPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault-token"), user.toBuffer()],
      program.programId
    );

    await program.methods
      .deposit(depositAmount)
      .accounts({
        vault: vaultPda,
        mint,
        userTokenAccount,
        vaultTokenAccount: vaultTokenPda,
        user,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  }

  describe("Deposit", () => {
    it("should successfully deposit tokens into vault", async () => {
      const depositAmount = new anchor.BN(1_000_000_000); // 1 token (9 decimals)

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
    it("should successfully withdraw tokens from vault", async () => {
      const withdrawAmount = new anchor.BN(500_000_000); // 0.5 token

      await deposit(withdrawAmount);

      const [vaultTokenPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault-token"), user.toBuffer()],
        program.programId
      );

      const beforeBal = await provider.connection.getTokenAccountBalance(vaultTokenPda);

      await program.methods
        .withdraw(withdrawAmount)
        .accounts({
          vault: vaultPda,
          mint,
          vaultTokenAccount: vaultTokenPda,
          userTokenAccount,
          user,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      const afterBal = await provider.connection.getTokenAccountBalance(vaultTokenPda);

      assert.ok(
        beforeBal.value.uiAmount ===
          afterBal.value.uiAmount! + withdrawAmount.toNumber() / 10 ** 9
      );
    });

    it("should fail when withdrawing more than available balance", async () => {
      const excessiveAmount = new anchor.BN(10_000_000_000_000); // way more tokens
      const [vaultTokenPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault-token"), user.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .withdraw(excessiveAmount)
          .accounts({
            vault: vaultPda,
            mint,
            vaultTokenAccount: vaultTokenPda,
            userTokenAccount,
            user,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert.match(error.message, /InsufficientBalance/);
      }
    });

    it("should fail when withdrawing from the wrong account", async () => {
      const depositAmount = new anchor.BN(1_000_000_000); // 1 token
      await deposit(depositAmount);

      let newUser = anchor.web3.Keypair.generate();
      const withdrawAmount = new anchor.BN(500_000_000); // 0.5 token
      const [vaultTokenPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("vault-token"), user.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .withdraw(withdrawAmount)
          .accounts({
            vault: vaultPda,
            mint,
            vaultTokenAccount: vaultTokenPda,
            userTokenAccount,
            user: newUser.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
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