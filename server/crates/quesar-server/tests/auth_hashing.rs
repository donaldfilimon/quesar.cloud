//! Bounded, off-runtime password hashing.

use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;

use quesar_auth::password::{Argon2Hasher, HashError, Password, PasswordHasher, PhcString};
use quesar_server::auth::hashing::{HashingError, PERMIT_WAIT};
use quesar_server::auth::{Hashing, MAX_CONCURRENT_HASHES};
use tokio::sync::mpsc;

/// A hasher whose `verify` reports it started, then waits to be released.
struct Gated {
    in_flight: AtomicUsize,
    peak: AtomicUsize,
    started: mpsc::UnboundedSender<()>,
    releases: Mutex<usize>,
    released: Condvar,
}

impl PasswordHasher for Gated {
    fn hash(&self, _: &Password) -> Result<PhcString, HashError> {
        Ok(PhcString::new(
            "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$aGFzaA",
        ))
    }

    fn verify(&self, _: &Password, _: &PhcString) -> bool {
        let now = self.in_flight.fetch_add(1, Ordering::SeqCst) + 1;
        self.peak.fetch_max(now, Ordering::SeqCst);
        let _ = self.started.send(());
        let mut releases = self.releases.lock().unwrap();
        while *releases == 0 {
            releases = self.released.wait(releases).unwrap();
        }
        *releases -= 1;
        self.in_flight.fetch_sub(1, Ordering::SeqCst);
        true
    }
}

#[tokio::test]
async fn concurrent_verifications_never_exceed_the_bound() {
    let (started, mut started_rx) = mpsc::unbounded_channel();
    let gated = Arc::new(Gated {
        in_flight: AtomicUsize::new(0),
        peak: AtomicUsize::new(0),
        started,
        releases: Mutex::new(0),
        released: Condvar::new(),
    });
    let hashing = Arc::new(Hashing::new(gated.clone(), 2).unwrap());
    let tasks: Vec<_> = (0..6)
        .map(|_| {
            let hashing = Arc::clone(&hashing);
            tokio::spawn(async move {
                hashing
                    .verify(Password::new("pw"), PhcString::new("hash"))
                    .await
                    .unwrap()
            })
        })
        .collect();
    // Two start; each release lets exactly one more in.
    for _ in 0..2 {
        started_rx.recv().await.unwrap();
    }
    for _ in 0..4 {
        *gated.releases.lock().unwrap() += 1;
        gated.released.notify_one();
        started_rx.recv().await.unwrap();
    }
    for _ in 0..2 {
        *gated.releases.lock().unwrap() += 1;
        gated.released.notify_one();
    }
    for task in tasks {
        assert!(task.await.unwrap());
    }
    assert_eq!(gated.peak.load(Ordering::SeqCst), 2);
}

#[tokio::test]
async fn the_default_bound_is_four() {
    assert_eq!(MAX_CONCURRENT_HASHES, 4);
}

#[tokio::test]
async fn hash_verify_and_the_dummy_use_the_real_hasher() {
    let hashing = Hashing::new(Arc::new(Argon2Hasher), MAX_CONCURRENT_HASHES).unwrap();
    let hash = hashing.hash(Password::new("correct horse")).await.unwrap();
    assert!(hash.as_str().starts_with("$argon2id$"));
    assert!(
        hashing
            .verify(Password::new("correct horse"), hash.clone())
            .await
            .unwrap()
    );
    assert!(
        !hashing
            .verify(Password::new("wrong horse"), hash)
            .await
            .unwrap()
    );
    assert!(
        !hashing
            .verify_unknown(Password::new("anything"))
            .await
            .unwrap()
    );
}

#[tokio::test(start_paused = true)]
async fn a_request_that_waits_ten_seconds_for_a_permit_is_busy() {
    let (started, mut started_rx) = mpsc::unbounded_channel();
    let gated = Arc::new(Gated {
        in_flight: AtomicUsize::new(0),
        peak: AtomicUsize::new(0),
        started,
        releases: Mutex::new(0),
        released: Condvar::new(),
    });
    let hashing = Arc::new(Hashing::new(gated.clone(), 1).unwrap());
    let holder = {
        let hashing = Arc::clone(&hashing);
        tokio::spawn(async move {
            hashing
                .verify(Password::new("pw"), PhcString::new("hash"))
                .await
        })
    };
    // The only permit is taken and its hasher is blocked.
    started_rx.recv().await.unwrap();

    // A blocking task is running, so the paused clock does not auto-advance:
    // start the waiter, let it register its timeout, then step the clock.
    let waiter = {
        let hashing = Arc::clone(&hashing);
        tokio::spawn(async move {
            hashing
                .verify(Password::new("pw"), PhcString::new("hash"))
                .await
        })
    };
    tokio::task::yield_now().await;
    tokio::time::advance(PERMIT_WAIT - Duration::from_millis(1)).await;
    assert!(!waiter.is_finished(), "still waiting just before the bound");
    tokio::time::advance(Duration::from_millis(1)).await;
    let waited = waiter.await.unwrap();
    assert!(matches!(waited, Err(HashingError::Busy)), "{waited:?}");

    // The refusal did not leak the permit: once the holder ends, one is free.
    *gated.releases.lock().unwrap() += 2;
    gated.released.notify_all();
    assert!(holder.await.unwrap().unwrap());
    assert!(
        hashing
            .verify(Password::new("pw"), PhcString::new("hash"))
            .await
            .unwrap()
    );
}
