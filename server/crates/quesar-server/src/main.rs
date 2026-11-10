use std::process::ExitCode;

use quesar_server::config::Environment;
use quesar_server::readiness::runtime_readiness;
use quesar_server::{Config, router};
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;

fn init_tracing() {
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(filter)
        .init();
}

/// Resolves on Ctrl-C or SIGTERM, so in-flight requests finish before exit.
async fn shutdown_signal() {
    let interrupt = async {
        let _ = tokio::signal::ctrl_c().await;
    };
    #[cfg(unix)]
    let terminate = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut signal) => {
                signal.recv().await;
            }
            Err(_) => std::future::pending::<()>().await,
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! {
        () = interrupt => {},
        () = terminate => {},
    }
}

async fn run() -> Result<(), Box<dyn std::error::Error>> {
    let config = Config::from_env(Environment::from_process())?;
    let readiness = runtime_readiness(&config.environment, config.production);
    if !readiness.ready {
        tracing::warn!(reasons = ?readiness.reasons, "configuration is not ready; refusing traffic");
    }
    if !config.site_dir.join("index.html").is_file() {
        tracing::warn!(site_dir = %config.site_dir.display(), "site directory has no index.html");
    }
    let app = router(&config).layer(TraceLayer::new_for_http());
    let listener = TcpListener::bind(config.listen).await?;
    tracing::info!(
        listen = %listener.local_addr()?,
        site_dir = %config.site_dir.display(),
        production = config.production,
        "quesar-server listening"
    );
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

#[tokio::main]
async fn main() -> ExitCode {
    init_tracing();
    match run().await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            tracing::error!(%error, "quesar-server failed");
            ExitCode::FAILURE
        }
    }
}
