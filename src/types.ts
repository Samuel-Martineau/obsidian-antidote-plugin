import {
	Editor,
	MarkdownFileInfo,
	MarkdownView,
	TFile,
	WorkspaceLeaf,
} from "obsidian";

export interface MarkdownDocument {
	editor: Editor;
	context: MarkdownView | MarkdownFileInfo;
	file: TFile;
	leaf: WorkspaceLeaf;
}
