import * as childProcess from "child_process";

export function regReader(key: string, value: string): string {
	const laRequete = `REG QUERY "${key}" /v ${value}`;
	const REG = childProcess.execSync(laRequete).toString();
	let regFin = REG.substring(REG.indexOf("REG_"));
	regFin = regFin.substring(regFin.indexOf(" "));
	return regFin.trim();
}
