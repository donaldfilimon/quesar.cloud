//! Injected time. Every expiry comparison binds the clock's "now" instead of
//! calling `now()` in SQL, so tests move time without sleeping.

use std::sync::Mutex;
use std::time::Duration;

use time::OffsetDateTime;

pub trait Clock: Send + Sync {
    fn now(&self) -> OffsetDateTime;
}

/// Production time.
#[derive(Debug, Clone, Copy, Default)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> OffsetDateTime {
        OffsetDateTime::now_utc()
    }
}

/// A settable clock for tests.
#[derive(Debug)]
pub struct FixedClock(Mutex<OffsetDateTime>);

impl FixedClock {
    pub fn new(at: OffsetDateTime) -> Self {
        Self(Mutex::new(at))
    }

    pub fn set(&self, at: OffsetDateTime) {
        *self.lock() = at;
    }

    pub fn advance(&self, by: Duration) {
        let mut at = self.lock();
        *at += by;
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, OffsetDateTime> {
        // A poisoned lock still holds a valid timestamp.
        self.0
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

impl Clock for FixedClock {
    fn now(&self) -> OffsetDateTime {
        *self.lock()
    }
}
