use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address_with_program_id;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

declare_id!("6xwo1nXxakEuwquQwueX4hjMdaZPPtnUN5Lo6f5t22iq");


#[program]
pub mod token_protocol_anchor {
    use super::*;

    /// Deposit SPL tokens into the user's vault PDA (mint passed as account)
    pub fn deposit(ctx: Context<DepositContext>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::InvalidAmount);
        require!(ctx.accounts.user_token_account.amount >= amount, VaultError::InsufficientBalance);

        // Transfer SPL tokens from user → vault token account
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.user_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token_interface::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

        // Update vault state
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.user.key();
        vault.balance = vault.balance.checked_add(amount).unwrap();

        emit!(DepositEvent {
            user: ctx.accounts.user.key(),
            amount,
            new_balance: vault.balance,
        });

        Ok(())
    }

    /// Withdraw tokens from the vault PDA back to the user
    pub fn withdraw(ctx: Context<WithdrawContext>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::InvalidAmount);
        require!(ctx.accounts.vault.balance >= amount, VaultError::InsufficientBalance);

        let user_key = ctx.accounts.user.key();
        let user_key_ref = user_key.as_ref();
        let (_vault_key, vault_bump) = Pubkey::find_program_address(&[b"vault", user_key_ref], ctx.program_id);
        let vault_seeds: &[&[u8]] = &[b"vault", user_key_ref, &[vault_bump]];
        let signer_seeds: &[&[&[u8]]] = &[vault_seeds];

        let new_balance = ctx.accounts.vault.balance.checked_sub(amount).unwrap();
        ctx.accounts.vault.balance = new_balance;

        // perform CPI transfer from vault token account to user token account
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.vault_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(), 
            cpi_accounts, 
            signer_seeds);
        token_interface::transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

        emit!(WithdrawEvent {
            user: ctx.accounts.user.key(),
            amount,
            new_balance: ctx.accounts.vault.balance,
        });

        Ok(())
    }
}

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub balance: u64,
}

#[derive(Accounts)]
pub struct DepositContext<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8, // discriminator + Pubkey + u64
        seeds = [b"vault", user.key().as_ref()],//one per user
        bump
    )]
    pub vault: Account<'info, Vault>,

    /// mint of the token being deposited (must correspond to both token accounts)
    #[account(mint::token_program = token_program)]
    pub mint: InterfaceAccount<'info, Mint>,

    /// user token account holding the custom SPL token
    #[account(
        mut,
        token::mint = mint,
        token::authority = user,
        token::token_program = token_program,
        constraint = user_token_account.key() == get_associated_token_address_with_program_id(&user.key(), &mint.key(), &token_program.key())
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    /// token account owned by the vault PDA, initialized if needed
    #[account(
        init_if_needed,
        payer = user,
        seeds = [b"vault-token", user.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = vault,
        token::token_program = token_program
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct WithdrawContext<'info> {
    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref()],
        bump,
        constraint = vault.owner == user.key()
    )]
    pub vault: Account<'info, Vault>,

    #[account(mint::token_program = token_program)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = user,
        token::token_program = token_program,
        constraint = user_token_account.key() == get_associated_token_address_with_program_id(&user.key(), &mint.key(), &token_program.key())
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault-token", user.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = vault,
        token::token_program = token_program
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[error_code]
pub enum VaultError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,

    #[msg("Insufficient balance")]
    InsufficientBalance,
}

#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
}

#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
}

