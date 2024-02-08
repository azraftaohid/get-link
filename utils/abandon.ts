export class AbandonnedError extends Error {

}

export type Abandon = () => void;

export interface Abandonments {
	handler: Abandon,
	hasAbandoned: boolean,
}
