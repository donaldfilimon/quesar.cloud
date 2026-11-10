//! Password hashing off the async runtime, with bounded concurrency.
//!
//! Argon2id is CPU-bound and takes 19 MiB per hash, so it runs in
//! `spawn_blocking` behind a semaphore: a flood of sign-in attempts queues
//! instead of exhausting memory or starving the runtime's blocking pool.

use std::fmt;
use std::sync::Arc;

use quesar_auth::password::{
    DummyHash, HashError, Password, PasswordHasher, PhcString, verify_unknown_user,
};
use tokio::sync::Semaphore;

/// How many hashes or verifications may run at once. Four uses at most about
/// 76 MiB (4 x 19 MiB) and leaves cores for the rest of the server; later
/// requests wait for a permit rather than fail.
pub const MAX_CONCURRENT_HASHES: usize = 4;

#[derive(Debug)]
pub enum HashingError {
    /// The hasher itself failed.
    Hash(HashError),
    /// The blocking task panicked or was cancelled.
    Task,
}

impl fmt::Display for HashingError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("password hashing failed")
    }
}

impl std::error::Error for HashingError {}

/// The hasher, the dummy hash and the permit pool, built once at startup.
pub struct Hashing {
    hasher: Arc<dyn PasswordHasher>,
    dummy: Arc<DummyHash>,
    permits: Arc<Semaphore>,
}

impl fmt::Debug for Hashing {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Hashing").finish_non_exhaustive()
    }
}

impl Hashing {
    /// Builds the [`DummyHash`] now; a failure aborts startup.
    pub fn new(hasher: Arc<dyn PasswordHasher>, max_concurrent: usize) -> Result<Self, HashError> {
        let dummy = Arc::new(DummyHash::new(hasher.as_ref())?);
        Ok(Self {
            hasher,
            dummy,
            permits: Arc::new(Semaphore::new(max_concurrent.max(1))),
        })
    }

    /// Runs `work` on the blocking pool once a permit is free. The permit moves
    /// into the task, so a request dropped mid-hash still holds its slot until
    /// the CPU work actually ends.
    async fn run<T: Send + 'static>(
        &self,
        work: impl FnOnce() -> T + Send + 'static,
    ) -> Result<T, HashingError> {
        let permit = Arc::clone(&self.permits)
            .acquire_owned()
            .await
            .map_err(|_| HashingError::Task)?;
        tokio::task::spawn_blocking(move || {
            let result = work();
            drop(permit);
            result
        })
        .await
        .map_err(|_| HashingError::Task)
    }

    pub async fn hash(&self, password: Password) -> Result<PhcString, HashingError> {
        let hasher = Arc::clone(&self.hasher);
        self.run(move || hasher.hash(&password))
            .await?
            .map_err(HashingError::Hash)
    }

    pub async fn verify(&self, password: Password, hash: PhcString) -> Result<bool, HashingError> {
        let hasher = Arc::clone(&self.hasher);
        self.run(move || hasher.verify(&password, &hash)).await
    }

    /// Verifies against the dummy hash, for an unknown user or an account with
    /// no password: the same work as a real check. Always `false`.
    pub async fn verify_unknown(&self, password: Password) -> Result<bool, HashingError> {
        let hasher = Arc::clone(&self.hasher);
        let dummy = Arc::clone(&self.dummy);
        self.run(move || verify_unknown_user(hasher.as_ref(), &dummy, &password))
            .await
    }
}
