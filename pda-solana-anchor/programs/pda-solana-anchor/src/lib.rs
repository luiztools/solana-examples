use anchor_lang::prelude::*;

declare_id!("6jUEK6h6KmMfT1kMMuM6ay1XrNxqe5Nq7GD4h2nTgoWz");

#[account]
pub struct Book {
    pub id: u32,
    pub title: String,
    pub author: String,
    pub year: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BookInput {
    pub title: String,
    pub author: String,
    pub year: u16,
}

#[account]
pub struct Library {
    pub next_id: u32,
}

#[derive(Accounts)]
pub struct InitializeContext<'info> {
    #[account(init, payer = user, space = 8 + 4)]
    pub library: Account<'info, Library>,

    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddBookContext<'info> {
    #[account(mut)]
    pub library: Account<'info, Library>,

    #[account(
        init,
        payer = user,
        space = 8 + 4 + 4 + 32 + 4 + 32 + 2,
        // derive PDA using library key and next_id to ensure uniqueness per library
        seeds = [
            b"book",
            library.key().as_ref(),
            &library.next_id.to_le_bytes()
        ],
        bump
    )]
    pub book: Account<'info, Book>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EditBookContext<'info> {
    #[account(mut)]
    pub book: Account<'info, Book>,
}

#[derive(Accounts)]
pub struct DeleteBookContext<'info> {
    #[account(mut)]
    pub book: Account<'info, Book>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[program]
pub mod pda_solana_anchor {
    use super::*;

    pub fn initialize(ctx: Context<InitializeContext>) -> Result<()>{
        ctx.accounts.library.next_id = 1;
        Ok(())
    }

    pub fn add_book(ctx: Context<AddBookContext>, book: BookInput) -> Result<()> {
        let library = &mut ctx.accounts.library;
        let new_book = &mut ctx.accounts.book;

        new_book.id = library.next_id;
        new_book.title = book.title;
        new_book.author = book.author;
        new_book.year = book.year;

        library.next_id += 1;

        Ok(())
    }

    pub fn edit_book(ctx: Context<EditBookContext>, book: BookInput) -> Result<()> {
        let book_account = &mut ctx.accounts.book;

        if book.title != "" && book_account.title != book.title {book_account.title = book.title;}
        if book.author != "" && book_account.author != book.author {book_account.author = book.author;}
        if book.year > 0 && book_account.year != book.year {book_account.year = book.year;}

        Ok(())
    }

    pub fn delete_book(ctx: Context<DeleteBookContext>) -> Result<()> {
        let book_account = &mut ctx.accounts.book;
        // send lamports back to the caller / authority instead of the library
        book_account.close(ctx.accounts.authority.to_account_info())?;
        Ok(())
    }
}