use anchor_lang::prelude::*;

declare_id!("5CgpzDxZ2xUUvfjBJEAeyio2s3A7azsis8gWdZH8aSMH");

#[program]
pub mod crud_solana {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()>{
        let library = &mut ctx.accounts.library;
        library.next_id = 0;
        library.books = Vec::new();
        Ok(())
    }

    pub fn add_book(ctx: Context<BookDatabase>, book_data: BookData) -> Result<()> {
        let library = &mut ctx.accounts.library;
        library.next_id += 1;

        let new_book = Book {
            id: library.next_id,
            title: book_data.title,
            author: book_data.author,
            year: book_data.year
        };

        library.books.push(new_book);
        Ok(())
    }

    pub fn edit_book(ctx: Context<BookDatabase>, id: u32, new_data: BookData) -> Result<()> {
        let library = &mut ctx.accounts.library;
        if let Some(book) = library.books.iter_mut().find(|b| b.id == id) {
            if new_data.title != "" && book.title != new_data.title { book.title = new_data.title; }
            if new_data.year > 0 && book.year != new_data.year { book.year = new_data.year; }
            if new_data.author != "" && book.author != new_data.author { book.author = new_data.author; }
            return Ok(());
        }
        Err(CustomError::BookNotFound.into())
    }

    pub fn delete_book(ctx: Context<BookDatabase>, id: u32) -> Result<()> {
        if let Some(index) = ctx.accounts.library.books.iter().position(|b| b.id == id) {
            ctx.accounts.library.books.remove(index);
            return Ok(())
        }
        Err(CustomError::BookNotFound.into())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Book {
    pub id: u32,
    pub title: String,
    pub author: String,
    pub year: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BookData {
    pub title: String,
    pub author: String,
    pub year: u16,
}

#[account]
pub struct Library {
    pub books: Vec<Book>,
    pub next_id: u32,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = signer, space = 8 + 4 + 4 + (50 * (4 + 32 + 32 + 2)))]
    pub library: Account<'info, Library>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BookDatabase<'info> {
    #[account(mut)]
    pub library: Account<'info, Library>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[error_code]
pub enum CustomError {
    #[msg("Book not found")]
    BookNotFound,
}