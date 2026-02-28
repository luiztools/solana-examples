use anchor_lang::prelude::*;

declare_id!("7D5MDwidRQmcs7UaLmkgTbhJQUsyZA9m5N8kBhmcn2ua");

#[program]
pub mod hello_world_solana {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>, message: String) -> Result<()> {
        ctx.accounts.hello_world_account.message = message;
        Ok(())
    }

    pub fn update(ctx: Context<Update>, message: String) -> Result<()> {
        ctx.accounts.hello_world_account.message = message;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info>{
    #[account(init, payer=user, space=8+32)]
    pub hello_world_account: Account<'info, HelloWorldAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info>{
    #[account(mut)]
    pub hello_world_account: Account<'info, HelloWorldAccount>,
}

#[account]
pub struct HelloWorldAccount {
    pub message: String,
}