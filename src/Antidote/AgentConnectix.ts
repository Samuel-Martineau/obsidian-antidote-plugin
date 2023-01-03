import WebSocket from "ws";
import * as agTexteur from "./InterfaceAgentTexteur";
import { regReader } from "./Registry";
import * as os from "os";
import bplistParser from "bplist-parser";
import * as childProcess from "child_process";

function aRecuToutLesPaquets(
	laListe: Array<string>,
	leNombrePaquet: number
): boolean {
	for (const item of laListe) {
		if (item.length == 0) return false;
	}
	return true;
}

export class AgentConnectix {
	private prefs: any;
	private ws: WebSocket;
	private monAgent: agTexteur.AgentTexteur | undefined;
	private estInit: boolean;

	private listePaquetsRecu: Array<string>;

	constructor(agent: agTexteur.AgentTexteur) {
		this.monAgent = agent;
		this.prefs = {} as JSON;
		this.ws = {} as WebSocket;
		this.listePaquetsRecu = new Array(0);
		this.estInit = false;
	}

	async Initialise() {
		if (this.estInit) return true;
		const retour = await this.ObtiensReglages();
		this.estInit = true;
		return retour;
	}

	LanceCorrecteur(): void {
		const laRequete = {
			message: "LanceOutil",
			outilApi: "Correcteur",
		};
		this.EnvoieMessage(JSON.stringify(laRequete));
	}

	LanceDictionnaire(): void {
		const laRequete = {
			message: "LanceOutil",
			outilApi: "Dictionnaires",
		};
		this.EnvoieMessage(JSON.stringify(laRequete));
	}

	LanceGuide(): void {
		const laRequete = {
			message: "LanceOutil",
			outilApi: "Guides",
		};
		this.EnvoieMessage(JSON.stringify(laRequete));
	}

	private GereMessage(data: any) {
		const laReponse: any = {};
		laReponse.idMessage = data.idMessage;
		if (data.message == "init") {
			laReponse.titreDocument = this.monAgent?.DonneTitreDocument();
			laReponse.retourChariot = this.monAgent?.DonneRetourDeCharriot();
			laReponse.permetRetourChariot =
				this.monAgent?.PermetsRetourDeCharriot();
			laReponse.permetEspaceInsecables =
				this.monAgent?.JeTraiteLesInsecables();
			laReponse.permetEspaceFin = this.monAgent?.EspaceFineDisponible();
			laReponse.remplaceSansSelection = true;
			this.EnvoieMessage(JSON.stringify(laReponse));
		} else if (data.message == "cheminDocument") {
			laReponse.donnee = this.monAgent?.DonneCheminDocument();
			this.EnvoieMessage(JSON.stringify(laReponse));
		} else if (data.message == "docEstDisponible") {
			laReponse.donnees = this.monAgent?.DocEstDisponible();

			this.EnvoieMessage(JSON.stringify(laReponse));
		} else if (data.message == "donneZonesTexte") {
			this.monAgent?.DonneLesZonesACorriger().then((lesZones) => {
				const lesZonesEnJSON: agTexteur.ZoneDeTexteJSONAPI[] = [];

				lesZones?.forEach((element) => {
					lesZonesEnJSON.push(element.toJsonAPI());
				});
				laReponse.donnees = lesZonesEnJSON;
				this.EnvoieMessage(JSON.stringify(laReponse));
			});
		} else if (data.message == "editionPossible") {
			const idZone: string = data.donnees.idZone;
			const chaine: string = data.donnees.contexte;
			const debut: number = data.donnees.positionDebut;
			const fin: number = data.donnees.positionFin;

			laReponse.donnees = this.monAgent?.PeutCorriger(
				idZone,
				debut,
				fin,
				chaine
			);
			this.EnvoieMessage(JSON.stringify(laReponse));
		} else if (data.message == "remplace") {
			const idZone: string = data.donnees.idZone;
			const chaine: string = data.donnees.nouvelleChaine;
			const debut: number = data.donnees.positionRemplacementDebut;
			const fin: number = data.donnees.positionRemplacementFin;

			this.monAgent
				?.CorrigeDansTexteur(idZone, debut, fin, chaine, false)
				.then((reponse) => {
					this.monAgent?.MetsFocusSurLeDocument();
					laReponse.donnees = true;
					this.EnvoieMessage(JSON.stringify(laReponse));
				});
		} else if (data.message == "selectionne") {
			const idZone: string = data.donnees.idZone;
			const debut: number = data.donnees.positionDebut;
			const fin: number = data.donnees.positionFin;

			this.monAgent?.SelectionneIntervalle(idZone, debut, fin);
		} else if (data.message == "retourneAuDocument") {
			this.monAgent?.RetourneAuTexteur();
		}
	}

	private async DonnePathAgentConsole() {
		if (process.platform === "darwin") {
			const plist = bplistParser;
			const homedir = os.homedir();
			const xml = await plist.parseFile(
				homedir + "/Library/Preferences/com.druide.Connectix.plist"
			);
			const data = xml[0].DossierApplication;
			return data + "/Contents/SharedSupport/AgentConnectixConsole";
		} else if (process.platform === "linux")
			return "/usr/local/bin/AgentConnectixConsole";
		else if (process.platform === "win32") {
			const retour = regReader(
				"HKEY_LOCAL_MACHINE\\SOFTWARE\\Druide informatique inc.\\Connectix",
				"DossierConnectix"
			);
			return retour + "AgentConnectixConsole.exe";
		}
	}

	private async InitWS() {
		const lePortWS = this.prefs.port;
		this.ws = new WebSocket("ws://localhost:" + lePortWS);
		this.ws.on("message", (data) => {
			this.RecoisMessage(data);
		});
		this.ws.on("close", () => {
			this.estInit = false;
		});
		this.ws.on("error", (data) => {
			this.estInit = false;
		});
		const Promesse = new Promise<boolean>((resolve) => {
			this.ws.on("open", () => {
				resolve(true);
			});
		});
		const retour = await Promesse;
		return retour;
	}

	private Digere(data: any) {
		if (Object.hasOwnProperty.call(data, "idPaquet")) {
			const lesDonnees: string = data.donnees;
			const leNombrePaquet: number = data.totalPaquet;
			const leNumeroPaquet: number = data.idPaquet;

			if (this.listePaquetsRecu.length < leNombrePaquet)
				this.listePaquetsRecu = new Array(leNombrePaquet);

			this.listePaquetsRecu[leNumeroPaquet - 1] = lesDonnees;

			if (aRecuToutLesPaquets(this.listePaquetsRecu, leNombrePaquet)) {
				const leMessageStr: string = this.listePaquetsRecu.join("");
				this.listePaquetsRecu = new Array(0);
				this.GereMessage(JSON.parse(leMessageStr));
			}
		}
	}

	private RecoisMessage(data: any) {
		const leMsg = JSON.parse(data);
		this.Digere(leMsg);
	}

	private EnvoiePaquet(paquet: string) {
		if (this.ws.readyState == this.ws.OPEN) {
			this.ws.send(paquet);
		}
	}

	private EnvoieMessage(msg: string) {
		const laRequete = {
			idPaquet: 0,
			totalPaquet: 1,
			donnees: msg,
		};

		this.EnvoiePaquet(JSON.stringify(laRequete));
	}

	private async ObtiensReglages() {
		const path = await this.DonnePathAgentConsole();
		if (!path) return;
		const AgentConsole = childProcess.spawn(path, ["--api"]);
		const Promesse = new Promise<boolean>((resolve) => {
			AgentConsole.stdout.on("data", (data: any) => {
				const str: string = data.toString("utf8");

				this.prefs = JSON.parse(
					str.substring(str.indexOf("{"), str.length)
				);
				this.InitWS().then((retour) => {
					resolve(retour);
				});
			});
		});
		AgentConsole.stdin.write("API");
		const retour = await Promesse;
		return retour;
	}
}
