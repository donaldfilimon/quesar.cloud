//! Architecture content exported from the TypeScript source.

use std::collections::HashSet;
use std::sync::OnceLock;

use serde::Deserialize;

const SOURCE: &str = include_str!("../../../contract/architecture-catalog.json");
static EMBEDDED: OnceLock<Result<Catalog, CatalogError>> = OnceLock::new();

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogNode {
    pub id: String,
    pub title: String,
    pub href: String,
    pub excerpt: String,
    pub search_text: String,
}

#[derive(Debug)]
pub struct Catalog(Vec<CatalogNode>);

#[derive(Debug)]
pub enum CatalogError {
    Json(serde_json::Error),
    Empty,
    InvalidId,
}

impl std::fmt::Display for CatalogError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Json(error) => write!(f, "invalid embedded architecture catalog: {error}"),
            Self::Empty => f.write_str("the embedded architecture catalog is empty"),
            Self::InvalidId => f.write_str("an architecture catalog ID is empty or duplicated"),
        }
    }
}

impl std::error::Error for CatalogError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Json(error) => Some(error),
            _ => None,
        }
    }
}

impl Catalog {
    pub fn embedded() -> Result<&'static Self, &'static CatalogError> {
        EMBEDDED.get_or_init(Self::parse).as_ref()
    }

    fn parse() -> Result<Self, CatalogError> {
        let nodes: Vec<CatalogNode> = serde_json::from_str(SOURCE).map_err(CatalogError::Json)?;
        if nodes.is_empty() {
            return Err(CatalogError::Empty);
        }
        let mut ids = HashSet::with_capacity(nodes.len());
        if nodes
            .iter()
            .any(|node| node.id.is_empty() || !ids.insert(node.id.as_str()))
        {
            return Err(CatalogError::InvalidId);
        }
        Ok(Self(nodes))
    }

    pub fn nodes(&self) -> &[CatalogNode] {
        &self.0
    }

    pub fn contains_id(&self, id: &str) -> bool {
        self.0.iter().any(|node| node.id == id)
    }
}
