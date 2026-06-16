import { db } from "./index";
import { alphaProjects } from "./schema/alpha";

const INITIAL_ALPHA_PROJECTS = [
	{ symbol: "MOVE", name: "Movement Protocol", binancePair: "MOVEUSDT" },
	{ symbol: "ZK", name: "ZKsync Era", binancePair: "ZKUSDT" },
	{ symbol: "CATI", name: "Catizen", binancePair: "CATIUSDT" },
	{ symbol: "HMSTR", name: "Hamster Kombat", binancePair: "HMSTRUSDT" },
	{ symbol: "NOT", name: "Notcoin", binancePair: "NOTUSDT" },
	{ symbol: "DOGS", name: "Dogs", binancePair: "DOGSUSDT" },
	{ symbol: "LAYER", name: "Solayer", binancePair: "LAYERUSDT" },
];

async function seed() {
	console.log("Seeding Alpha projects...");
	for (const project of INITIAL_ALPHA_PROJECTS) {
		await db
			.insert(alphaProjects)
			.values(project)
			.onConflictDoNothing({ target: alphaProjects.symbol });
	}
	console.log(`Seeded ${INITIAL_ALPHA_PROJECTS.length} Alpha projects.`);
}

seed()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
