import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PdaSolanaAnchor } from "../target/types/pda_solana_anchor";

describe("pda-solana-anchor", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const user = provider.wallet.publicKey;

  const program = anchor.workspace.PdaSolanaAnchor as Program<PdaSolanaAnchor>;

  const [libraryPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("library")],
    program.programId
  );

  beforeEach(async () => {
    await program.methods
      .initialize()
      .accounts({
        library: libraryPda,
        user,
        systemProgram: anchor.web3.SystemProgram.programId
      })
      .rpc();
  });

  afterEach(async () => {
    const books = await program.account.book.all();
    for (const { publicKey } of books) {
      await program.methods
        .closeBook()
        .accounts({
          book: publicKey,
          user,
        })
        .rpc();
    }

    await program.methods
      .closeLibrary()
      .accounts({
        library: libraryPda,
        user,
      })
      .rpc();
  });

  function getBookPda(libraryPubkey: anchor.web3.PublicKey, bookId: number) {
    const [bookPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("book"),
        libraryPubkey.toBuffer(),
        Buffer.from(
          new anchor.BN(bookId).toArray("le", 4)
        ),
      ],
      program.programId
    );
    return bookPda;
  }

  async function addBook() {
    const libraryAccount = await program.account.library.fetch(libraryPda);
    const expectedId = libraryAccount.nextId;

    const bookPda = getBookPda(libraryPda, expectedId);

    await program.methods
      .addBook({ title: "Teste", author: "LuizTools", year: 2024 })
      .accounts({
        library: libraryPda,
        book: bookPda,
        user,
        systemProgram: anchor.web3.SystemProgram.programId
      })
      .rpc();
  }

  it("should add book", async () => {
    await addBook();

    const bookPda = getBookPda(libraryPda, 1);
    const book = await program.account.book.fetch(bookPda);

    const books = await program.account.book.all();
    assert.ok(books.length === 1);
    assert.strictEqual(book.id, 1);
  });

  it("shouldn't get the book (not found)", async () => {
    await addBook();
    const bookPda = getBookPda(libraryPda, 2);

    try {
      await program.account.book.fetch(bookPda);
      assert.fail("Expected an error but did not receive one");
    } catch (err) {
      assert.match(err.message, /Account does not exist/);
    }
  });

  it("should edit book title", async () => {
    await addBook();

    const bookPda = getBookPda(libraryPda, 1);
    const bookBefore = await program.account.book.fetch(bookPda);

    await program.methods
      .editBook({ title: "Updated Title", author: "", year: 0 })
      .accounts({ book: bookPda })
      .rpc();

    const bookAfter = await program.account.book.fetch(bookPda);
    assert.strictEqual(bookAfter.title, "Updated Title");
    assert.strictEqual(bookAfter.author, bookBefore.author);
    assert.strictEqual(bookAfter.year, bookBefore.year);
  });

  it("should delete book and refund lamports to authority", async () => {
    await addBook();

    const bookPda = getBookPda(libraryPda, 1);
    const beforeBal = await provider.connection.getBalance(user);

    await program.methods
      .deleteBook()
      .accounts({
        book: bookPda,
        authority: user,
      })
      .rpc();

    const afterBal = await provider.connection.getBalance(user);
    assert.ok(afterBal > beforeBal);

    try {
      await program.account.book.fetch(bookPda);
      assert.fail("Expected book account to be closed");
    } catch (err) {
      assert.match(err.message, /Account does not exist/);
    }
  });
});
