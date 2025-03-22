import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CrudSolana } from "../target/types/crud_solana";

describe("crud-solana", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.CrudSolana as Program<CrudSolana>;
  let libraryAccount: anchor.web3.Keypair;
  const signer = anchor.getProvider().publicKey;

  beforeEach(async () => {
    // Cria uma nova conta antes de cada teste
    libraryAccount = anchor.web3.Keypair.generate();

    await program.methods
      .initialize()
      .accounts({ library: libraryAccount.publicKey, signer })
      .signers([libraryAccount])
      .rpc();
  });

  it("should add book", async () => {
    await program.methods
      .addBook({ title: "Teste", author: "LuizTools", year: 2024 })
      .accounts({ library: libraryAccount.publicKey, signer })
      .rpc();

    const library = await program.account.library.fetch(libraryAccount.publicKey);
    assert.ok(library.books.length === 1);
  });

  it("should edit book", async () => {
    await program.methods
      .addBook({ title: "Teste", author: "LuizTools", year: 2024 })
      .accounts({ library: libraryAccount.publicKey, signer })
      .rpc();

    const newTitle = "Teste2";
    await program.methods
      .editBook(1, { title: newTitle, author: "", year: 0 })
      .accounts({ library: libraryAccount.publicKey, signer })
      .rpc();

    const library = await program.account.library.fetch(libraryAccount.publicKey);
    const book = library.books.find((b) => b.id === 1);
    assert.ok(book.title === newTitle);
    assert.ok(book.author === "LuizTools");
    assert.ok(book.year === 2024);
  });

  it("shouldn't edit book (not found)", async () => {
    try {
      await program.methods
        .editBook(999, { title: "Non-existent Book", author: "Nobody", year: 2025 })
        .accounts({ library: libraryAccount.publicKey, signer })
        .rpc();

      assert.fail("Expected an error but did not receive one");
    } catch (err) {
      assert.match(err.message, /BookNotFound/);
    }
  });

  it("should delete book", async () => {
    await program.methods
      .addBook({ title: "Teste", author: "LuizTools", year: 2024 })
      .accounts({ library: libraryAccount.publicKey, signer })
      .rpc();

    await program.methods
      .deleteBook(1)
      .accounts({ library: libraryAccount.publicKey, signer })
      .rpc();

    const library = await program.account.library.fetch(libraryAccount.publicKey);
    assert.ok(library.books.length === 0);
  });

  it("shouldn't delete book (not found)", async () => {
    try {
      await program.methods
        .deleteBook(999)
        .accounts({ library: libraryAccount.publicKey, signer })
        .rpc();

      assert.fail("Expected an error but did not receive one");
    } catch (err) {
      assert.match(err.message, /BookNotFound/);
    }
  });
});
