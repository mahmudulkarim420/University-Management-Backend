export const convertToStripeAmount = (
	amount: number,
	currency: string
): number => {
	const zeroDecimalCurrencies = [
		"bif",
		"clp",
		"djf",
		"gnf",
		"jpy",
		"kmf",
		"krw",
		"mga",
		"pyg",
		"rwf",
		"ugx",
		"vnd",
		"vuv",
		"xaf",
		"xaf",
		"xof",
		"xpf",
	];

	if (
		zeroDecimalCurrencies.includes(
			currency.toLowerCase()
		)
	) {
		return Math.round(amount);
	}

	return Math.round(amount * 100);
};