import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import BookSearch from "./BookSearch";
import BookForm from "./BookForm";
import BookDelete from "./BookDelete";
import LibraryInitialize from "./LibraryInitialize";

function App() {
  return (
    <>
      <div style={{ margin: 20 }}>
        <WalletMultiButton />
      </div>
      <LibraryInitialize />
      <BookSearch />
      <BookForm />
      <BookDelete />
    </>
  );
}

export default App;
