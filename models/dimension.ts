export enum DimensionField {
	WIDTH = "width",
	HEIGHT = "height",
}

export interface Dimension {
	[DimensionField.WIDTH]?: number;
	[DimensionField.HEIGHT]?: number;
}
