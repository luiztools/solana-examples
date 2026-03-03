use anchor_lang::prelude::{borsh::{BorshDeserialize}, *};

declare_id!("HrSMrxddaQQG6A624Lha6dVqqYaf4L8m7QgRx2wGAuX");

#[program]
pub mod access_control_patterns {
    use super::*;

    pub fn initialize(ctx: Context<InitializeContext>) -> Result<()> {
        let message_account = &mut ctx.accounts.message;
        message_account.content = String::from("");
        message_account.authority = ctx.accounts.user.key();
        Ok(())
    }

    pub fn set_message(ctx: Context<SetMessageContext>, message: String) -> Result<()> {
        let message_account = &mut ctx.accounts.message;
        message_account.content = message;
        Ok(())
    }

    pub fn clear_message(ctx: Context<ClearMessageContext>) -> Result<()> {
        //exemplo abaixo usando a macro require! para validar a autoridade antes de fechar a conta
        require!(
             ctx.accounts.message.authority == ctx.accounts.authority.key(),
             CustomError::Unauthorized
        );

        let message_account = &mut ctx.accounts.message;
        message_account.close(ctx.accounts.authority.to_account_info())?;
        Ok(())
    }

    // START ROLES EXAMPLE
    pub fn add_user(ctx: Context<AddUserContext>, role: Role) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        user_account.address = ctx.accounts.user_wallet.key();
        user_account.role = role;
        Ok(())
    }

    pub fn remove_user(_ctx: Context<RemoveUserContext>) -> Result<()> {
        Ok(())
    }

    // END ROLES EXAMPLE
}

// START ROLES EXAMPLE
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Role { NONE, OWNER, MANAGER, CUSTOMER }

#[account]
pub struct User {
    pub address: Pubkey,
    pub role: Role,
}

#[derive(Accounts)]
pub struct AddUserContext<'info> {
    /// CHECK: não há necessidade de validação aqui, pois a conta do usuário é criada dentro do programa e não é usada para autenticação
    pub user_wallet: AccountInfo<'info>,

    #[account(init, payer = payer, space = 8 + 32 + 1, seeds = [b"user", user_wallet.key().as_ref()], bump)]
    pub user_account: Account<'info, User>,     

    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveUserContext<'info> {
    #[account(mut, close = authority_signer)]
    pub user_account: Account<'info, User>,     

    #[account(
        mut,
        seeds = [b"user", authority_signer.key().as_ref()],
        bump,
        constraint = authority_user.address == authority_signer.key(),
        constraint = authority_user.role == Role::OWNER || authority_user.role == Role::MANAGER
    )]
    pub authority_user: Account<'info, User>,

    #[account(mut)]
    pub authority_signer : Signer<'info>,
}

// END ROLES EXAMPLE

// START AUTHORITY EXAMPLE

#[error_code]
pub enum CustomError {
    #[msg("Unauthorized")]
    Unauthorized,
}

#[account]
pub struct Message {
    pub content: String,
    pub authority: Pubkey,
}

#[derive(Accounts)]
pub struct InitializeContext<'info> {
    #[account(init, payer = user, space = 8 + 36 + 32)]
    pub message: Account<'info, Message>,
    
    #[account(mut)]
    pub user : Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetMessageContext<'info> {
    #[account(mut)]
    pub message: Account<'info, Message>,
}

#[derive(Accounts)]
pub struct ClearMessageContext<'info> {
    //exemplo abaixo usando a constraint has_one para validar a autoridade antes de fechar a conta
    #[account(mut, has_one = authority)]
    pub message: Account<'info, Message>,
    
    pub authority: Signer<'info>,
}

// END AUTHORITY EXAMPLE