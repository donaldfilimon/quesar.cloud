use std::net::SocketAddr;
use std::process::ExitCode;
use std::sync::Arc;

use quesar_server::auth::{AuthServices, check_schema};
use quesar_server::config::Environment;
use quesar_server::readiness::runtime_readiness;
use quesar_server::trace::request_span;
use quesar_server::{Config, router_with};
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
    let auth = match config.environment.read("DATABASE_URL") {
        Some(url) => {
            let pool = quesar_db::connect(url).await?;
            check_schema(&pool).await?;
            Some(AuthServices::build(
                pool,
                &config,
                Arc::new(quesar_auth::SystemClock),
            )?)
        }
        None => {
            tracing::warn!("DATABASE_URL is not set; /api/auth/* answers 503");
            None
        }
    };
    // The span records the method and path only, never the query string.
    let app =
        router_with(&config, auth).layer(TraceLayer::new_for_http().make_span_with(request_span));
    let listener = TcpListener::bind(config.listen).await?;
    tracing::info!(
        listen = %listener.local_addr()?,
        site_dir = %config.site_dir.display(),
        production = config.production,
        "quesar-server listening"
    );
    // Connect info makes the peer address available to handlers, which key
    // rate limits on it unless `TRUSTED_PROXY` names a header to trust.
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await?;
    Ok(())
}

/// Where the SQL files live unless `QUESAR_MIGRATIONS_DIR` says otherwise,
/// relative to the repo root like the other defaults.
const DEFAULT_MIGRATIONS_DIR: &str = "migrations";

/// `quesar-server migrate`: the explicit release step, like `bun run db:migrate`.
async fn run_migrate() -> Result<(), Box<dyn std::error::Error>> {
    let environment = Environment::from_process();
    let url = environment
        .read("DATABASE_URL")
        .ok_or("DATABASE_URL is required to migrate")?;
    let dir = environment
        .read("QUESAR_MIGRATIONS_DIR")
        .unwrap_or(DEFAULT_MIGRATIONS_DIR);
    let pool = quesar_db::connect(url).await?;
    let applied = quesar_db::migrate(&pool, std::path::Path::new(dir)).await?;
    tracing::info!(applied = applied.len(), "migrations up to date");
    Ok(())
}

#[tokio::main]
async fn main() -> ExitCode {
    let mut args = std::env::args().skip(1);
    let command = args.next();
    if command.as_deref().is_some_and(|c| c != "migrate") || args.next().is_some() {
        eprintln!("usage: quesar-server [migrate]");
        return ExitCode::from(2);
    }
    init_tracing();
    let result = if command.is_some() {
        run_migrate().await
    } else {
        run().await
    };
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            tracing::error!(%error, "quesar-server failed");
            ExitCode::FAILURE
        }
    }
}
