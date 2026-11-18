//! The field notes functions.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{NoInput, ServerFunction};

#[derive(Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AddNoteInput {
    pub node_id: String,
    pub body: String,
}

#[derive(Deserialize, TS)]
#[ts(type = "number")]
pub struct DeleteNoteInput(pub i64);

#[derive(Serialize, TS)]
pub struct FieldNote {
    pub id: i32,
    pub node_id: String,
    pub body: String,
    pub created_at: String,
}

pub struct ListNotes;

impl ServerFunction for ListNotes {
    const NAME: &'static str = "workspace.listNotes";
    type Input = NoInput;
    type Output = Vec<FieldNote>;
}

pub struct AddNote;

impl ServerFunction for AddNote {
    const NAME: &'static str = "workspace.addNote";
    type Input = AddNoteInput;
    type Output = ();
}

pub struct DeleteNote;

impl ServerFunction for DeleteNote {
    const NAME: &'static str = "workspace.deleteNote";
    type Input = DeleteNoteInput;
    type Output = ();
}
