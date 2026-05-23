use anyhow::Result;
use keyring::{Entry, Error as KeyringError};

const SERVICE_NAME: &str = "com.dbeam.desktop";

fn entry(connection_id: &str) -> Result<Entry> {
    Ok(Entry::new(SERVICE_NAME, connection_id)?)
}

pub fn set_password(connection_id: &str, password: &str) -> Result<()> {
    entry(connection_id)?.set_password(password)?;
    Ok(())
}

pub fn get_password(connection_id: &str) -> Result<Option<String>> {
    match entry(connection_id)?.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(error) => Err(error.into()),
    }
}

pub fn delete_password(connection_id: &str) -> Result<()> {
    match entry(connection_id)?.delete_credential() {
        Ok(_) | Err(KeyringError::NoEntry) => Ok(()),
        Err(error) => Err(error.into()),
    }
}

