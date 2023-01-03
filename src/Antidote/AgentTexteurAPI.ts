import * as AgTxt from "./InterfaceAgentTexteur";
import * as obsidian from "obsidian";
import url from "url";
import { MarkdownDocument } from "src/types";

export class AgentTexteurAPI extends AgTxt.AgentTexteur {
	private monDocument: MarkdownDocument;

	constructor(doc: MarkdownDocument) {
		super();
		this.monDocument = doc;
	}

	private PositionAbsolue(pos: obsidian.EditorPosition): number {
		return this.monDocument.editor.posToOffset(pos);
	}

	private PositionVS(pos: number): obsidian.EditorPosition {
		return this.monDocument.editor.offsetToPos(pos);
	}

	CorrigeDansTexteur(
		leIDZone: string,
		leDebut: number,
		laFin: number,
		laChaine: string,
		automatique: boolean
	): Promise<boolean> {
		const posDebut: obsidian.EditorPosition = this.PositionVS(leDebut);
		const posFin: obsidian.EditorPosition = this.PositionVS(laFin);
		return new Promise<boolean>((resolve) => {
			this.monDocument.editor.replaceRange(laChaine, posDebut, posFin);
			resolve(true);
		});
	}

	DocEstDisponible(): boolean {
		return this.monDocument.context.file !== undefined;
	}

	DonneRetourDeCharriot(): string {
		// if (this.monDocument.eol == vscode.EndOfLine.CRLF) return "\r\n";
		// else return "\n"; TODO Ajouter de la compatibilité pour les fins de ligne de style Windows
		return "\n";
	}

	DonneTitreDocument(): string {
		return this.monDocument.file.basename + ".md";
	}

	DonneCheminDocument(): string {
		return decodeURIComponent(
			url.parse(
				this.monDocument.context.app.vault.getResourcePath(
					this.monDocument.file
				)
			).pathname!
		);
	}
	PermetsRetourDeCharriot(): boolean {
		return true;
	}

	PeutCorriger(
		leIDZone: string,
		debut: number,
		fin: number,
		laChaineOrig: string
	): boolean {
		if (!this.DocEstDisponible()) return false;

		const posDebut: obsidian.EditorPosition = this.PositionVS(debut);
		let posFin: obsidian.EditorPosition = this.PositionVS(fin);

		const contexteMatchParfaitement =
			this.monDocument.editor.getRange(posDebut, posFin) == laChaineOrig;
		let contexteMatchAuDebut = true;
		if (!contexteMatchParfaitement) {
			posFin = this.PositionVS(fin + 1);
			contexteMatchAuDebut = this.monDocument.editor
				.getRange(posDebut, posFin)
				.startsWith(laChaineOrig);
		}

		return contexteMatchParfaitement || contexteMatchAuDebut;
	}

	SelectionneIntervalle(leIDZone: string, debut: number, fin: number): void {
		const previousSelections = this.monDocument.editor.listSelections();
		previousSelections[+leIDZone] = {
			head: this.PositionVS(debut),
			anchor: this.PositionVS(fin),
		};
		this.monDocument.editor.setSelections(previousSelections);
	}

	DonneLesZonesACorriger(): Promise<AgTxt.ZoneDeTexte[]> {
		const zones: AgTxt.ZoneDeTexte[] = this.monDocument.editor
			.listSelections()
			.map((selection, i) => {
				const start = selection.head;
				const end = selection.anchor;
				const text = this.monDocument.editor.getValue();
				const zone = new AgTxt.ZoneDeTexte(
					text,
					this.PositionAbsolue(start),
					this.PositionAbsolue(end),
					i.toString()
				);
				return zone;
			});
		return new Promise((r) => r(zones));
	}

	RetourneAuTexteur(): void {
		this.MetsFocusSurLeDocument();
	}

	MetsFocusSurLeDocument() {
		this.monDocument.context.app.workspace.setActiveLeaf(
			this.monDocument.leaf
		);
	}
}
