use quesar_services::catalog::Catalog;
use serde_json::Value;

#[test]
fn the_embedded_catalog_preserves_its_ids_content_and_order() {
    let catalog = Catalog::embedded().unwrap();
    let source: Vec<Value> =
        serde_json::from_str(include_str!("../../../contract/architecture-catalog.json")).unwrap();
    assert!(!source.is_empty());
    assert_eq!(catalog.nodes().len(), source.len());
    for (node, expected) in catalog.nodes().iter().zip(source) {
        assert_eq!(node.id, expected["id"].as_str().unwrap());
        assert_eq!(node.title, expected["title"].as_str().unwrap());
        assert_eq!(node.href, expected["href"].as_str().unwrap());
        assert_eq!(node.excerpt, expected["excerpt"].as_str().unwrap());
        assert_eq!(node.search_text, expected["searchText"].as_str().unwrap());
        assert!(catalog.contains_id(&node.id));
    }
    assert!(!catalog.contains_id(""));
}
