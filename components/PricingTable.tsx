"use client";

import type { FC } from "react";

type Props = {
	userId?: string | null;
};

const PricingTable: FC<Props> = ({ userId }) => {
	const pricingTableId = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID;
	const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

	if (!pricingTableId || !publishableKey) {
		return (
			<div className="border rounded-md p-4 text-sm text-red-600">
				Missing NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID or NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
			</div>
		);
	}

	return (
		<>
			<script async src="https://js.stripe.com/v3/pricing-table.js"></script>
			<stripe-pricing-table
				pricing-table-id={pricingTableId}
				publishable-key={publishableKey}
				client-reference-id={userId ?? undefined}
			/>
		</>
	);
};

export default PricingTable; 