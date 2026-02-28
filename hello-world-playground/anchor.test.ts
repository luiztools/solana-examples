// No imports needed: web3, anchor, pg and more are globally available

describe("Test", () => {
  it("Hello World", async () => {
    const txHash = await pg.program.methods.hello().rpc();
    console.log("Transaction signature:", txHash);
  });
});
