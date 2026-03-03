import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AccessControlPatterns } from "../target/types/access_control_patterns";

describe("access-control-patterns", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const user = provider.wallet.publicKey;

  const program = anchor.workspace.accessControlPatterns as Program<AccessControlPatterns>;
  let messageKp: anchor.web3.Keypair;

  beforeEach(async () => {
    // Cria uma nova conta antes de cada teste
    messageKp = anchor.web3.Keypair.generate();

    await program.methods
      .initialize()
      .accounts({
        message: messageKp.publicKey,
        user,
        systemProgram: anchor.web3.SystemProgram.programId
      })
      .signers([messageKp])
      .rpc();
  });

  it("should set message", async () => {
    await program.methods.setMessage("Hello, World!")
      .accounts({ message: messageKp.publicKey })
      .rpc();

    const messageAccount = await program.account.message.fetch(messageKp.publicKey);
    assert.strictEqual(messageAccount.content, "Hello, World!");
  });

  it("should clear message", async () => {
    await program.methods.setMessage("Hello, World!")
      .accounts({ message: messageKp.publicKey })
      .rpc();

    await program.methods.clearMessage()
      .accounts({ message: messageKp.publicKey, authority: user })
      .rpc();

    try {
      await program.account.message.fetch(messageKp.publicKey);
      assert.fail("Expected message account to be closed");
    } catch (err) {
      assert.match(err.message, /Account does not exist/);
    }
  });

  it("should NOT clear message", async () => {
    await program.methods.setMessage("Hello, World!")
      .accounts({ message: messageKp.publicKey })
      .rpc();

    const otherUser = anchor.web3.Keypair.generate();

    try {
      await program.methods.clearMessage()
        .accounts({ message: messageKp.publicKey, authority: otherUser.publicKey })
        .signers([otherUser])
        .rpc();
      assert.fail("Expected message account throw error");
    } catch (err) {
      assert.match(err.message, /ConstraintHasOne/);//para teste com macro require! use: /Unauthorized/
    }
  });

  // START ROLES TESTS

  function getUserPda(newUser: anchor.web3.PublicKey) {
    const [userAccountPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), newUser.toBuffer()],
      program.programId
    );
    return userAccountPda;
  }

  async function addUser(newUser: anchor.web3.Keypair, role: "manager" | "customer") {
    const userAccountPda = getUserPda(newUser.publicKey);

    await program.methods
      .addUser({ [role]: {} })
      .accounts({
        userWallet: newUser.publicKey,
        userAccount: userAccountPda,
        payer: user,
        systemProgram: anchor.web3.SystemProgram.programId
      })
      .rpc();
  }

  it("should add an user", async () => {
    const newUser = anchor.web3.Keypair.generate();

    await addUser(newUser, "manager");

    const userAccountPda = getUserPda(newUser.publicKey);
    const userAccount = await program.account.user.fetch(userAccountPda);
    assert.strictEqual(userAccount.address.toBase58(), newUser.publicKey.toBase58());

    assert.deepStrictEqual(userAccount.role, { manager: {} });
  })

  it("should remove user", async () => {
    const newUser = anchor.web3.Keypair.generate();
    await addUser(newUser, "manager");
    const managerPda = getUserPda(newUser.publicKey);

    const newCustomer = anchor.web3.Keypair.generate();
    await addUser(newCustomer, "customer");
    const customerPda = getUserPda(newCustomer.publicKey);

    const beforeBal = await provider.connection.getBalance(newUser.publicKey);

    await program.methods
      .removeUser()
      .accounts({
        userAccount: customerPda,
        authorityUser: managerPda,
        authoritySigner: newUser.publicKey,
      })
      .signers([newUser])
      .rpc();

    const afterBal = await provider.connection.getBalance(newUser.publicKey);
    assert.ok(afterBal > beforeBal);

    try {
      await program.account.user.fetch(customerPda);
      assert.fail("Expected user account to be closed");
    } catch (err) {
      assert.match(err.message, /Account does not exist/);
    }
  })

  it("should NOT remove user", async () => {
    const newUser = anchor.web3.Keypair.generate();
    await addUser(newUser, "customer");
    const newUserPda = getUserPda(newUser.publicKey);

    const newCustomer = anchor.web3.Keypair.generate();
    await addUser(newCustomer, "customer");
    const customerPda = getUserPda(newCustomer.publicKey);

    try {
      await program.methods
        .removeUser()
        .accounts({
          userAccount: customerPda,
          authorityUser: newUserPda,
          authoritySigner: newUser.publicKey,
        })
        .signers([newUser])
        .rpc();
      assert.fail("Expected user account should NOT to be closed");
    } catch (err) {
      assert.match(err.message, /ConstraintRaw/);
    }
  })

  // END ROLES TESTS
});
