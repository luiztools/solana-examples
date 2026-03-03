use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("HaHKBsJgp9ferNozgPzRjmxDVvhnuX1FEUhvFtqXNt65");

fn transfer_lamports(from: &AccountInfo, to: &AccountInfo, amount: u64) -> Result<()> {
    let mut from_lamports = from.try_borrow_mut_lamports()?;
    let mut to_lamports = to.try_borrow_mut_lamports()?;

    // Move SOL
    **from_lamports -= amount;
    **to_lamports += amount;

    Ok(())
}

#[program]
pub mod defi_protocol_anchor {
    use super::*;

    /// Deposit SOL into the user's vault PDA
    pub fn deposit(ctx: Context<DepositContext>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::InvalidAmount);

        // Transfer SOL from user → vault PDA
        let transfer = system_program::Transfer {
            from: ctx.accounts.user.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer);

        system_program::transfer(cpi_ctx, amount)?;

        // Update stored balance
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

    /// Withdraw SOL from the vault PDA back to the user
    pub fn withdraw(ctx: Context<WithdrawContext>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::InvalidAmount);

        let vault = &mut ctx.accounts.vault;

        require!(vault.balance >= amount, VaultError::InsufficientBalance);

        // Update logical balance first
        vault.balance = vault.balance.checked_sub(amount).unwrap();

        transfer_lamports(
            &vault.to_account_info(),
            &ctx.accounts.user.to_account_info(),
            amount,
        )?;

        emit!(WithdrawEvent {
            user: ctx.accounts.user.key(),
            amount,
            new_balance: vault.balance,
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

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
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

    #[account(mut)]
    pub user: Signer<'info>,
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
