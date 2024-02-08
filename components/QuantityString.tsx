import { quantityString } from "../utils/quantityString";

const QuantityString: React.FunctionComponent<QuantityStringProps> = ({
	singular, plural, count
}) => {
	return <>{quantityString(singular, plural, count)}</>;
};

export default QuantityString;

export interface QuantityStringProps {
	singular: string,
	plural: string,
	count: number,
}
