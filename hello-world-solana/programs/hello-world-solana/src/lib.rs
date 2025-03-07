use anchor_lang::prelude::*;

declare_id!("7D5MDwidRQmcs7UaLmkgTbhJQUsyZA9m5N8kBhmcn2ua");

#[program]
pub mod HelloWorldSolana {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>, message: String) -> Result<()> {
        ctx.accounts.helloWorldAccount.message = message;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info>{
    #[account(init, payer=user, space=8+264)]
    pub helloWorldAccount: Account<'info, HelloWorldAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct HelloWorldAccount {
    pub message: String,
}