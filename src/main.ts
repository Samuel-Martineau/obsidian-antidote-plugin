import { Plugin } from "obsidian";
import { MarkdownDocument } from "./types";
import { AgentConnectix } from "./Antidote/AgentConnectix";
import { AgentTexteurAPI } from "./Antidote/AgentTexteurAPI";

export default class AntidotePlugin extends Plugin {
	private connectixAgentMap: Map<MarkdownDocument, AgentConnectix> =
		new Map();

	private getConnectixAgentForDocument(
		document: MarkdownDocument
	): AgentConnectix {
		if (!this.connectixAgentMap.has(document))
			this.connectixAgentMap.set(
				document,
				new AgentConnectix(new AgentTexteurAPI(document))
			);
		return this.connectixAgentMap.get(document)!;
	}

	onload() {
		this.addCommand({
			id: "correct-with-antidote",
			name: "Correct with Antidote",
			editorCallback: (editor, context) => {
				const file = context.file;
				const leaf = this.app.workspace.getMostRecentLeaf();
				if (!file || !leaf) return;
				const document: MarkdownDocument = {
					file,
					context,
					editor,
					leaf,
				};
				const connectixAgent =
					this.getConnectixAgentForDocument(document);
				connectixAgent.Initialise().then(() => {
					connectixAgent.LanceCorrecteur();
				});
			},
		});
	}

	onunload() {}
}
