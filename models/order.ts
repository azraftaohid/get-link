export enum OrderField {
	CREATE_ORDER = "create_order",
}

export interface OrderData {
	[OrderField.CREATE_ORDER]?: number,
}
