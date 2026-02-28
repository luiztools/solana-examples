use anchor_lang::prelude::*;

declare_id!("2d3xGiHgBjBaDHSkjYuVmhawGtzWg7nkKBRWDwAKCbUj");

#[program]
pub mod hello_anchor {
    use super::*;

    pub fn hello(_ctx: Context<Hello>) -> Result<()> {
        msg!("Hello World!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Hello {}
