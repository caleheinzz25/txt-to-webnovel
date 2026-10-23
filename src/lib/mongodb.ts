import { type Db, MongoClient } from "mongodb";

const options = {
	maxPoolSize: 10,
	minPoolSize: 1,
	maxIdleTimeMS: 60000,
};

declare global {
	// eslint-disable-next-line no-var
	var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
	if (!process.env.MONGODB_URI) {
		throw new Error("Please add your MongoDB URI to .env.local");
	}

	const uri = process.env.MONGODB_URI;

	// In serverless environments (Vercel) as well as development, caching the promise
	// ensures warm containers reuse the existing connection pool instead of performing
	// a full TLS + auth handshake on every request.
	if (!global._mongoClientPromise) {
		const client = new MongoClient(uri, options);
		global._mongoClientPromise = client.connect().catch((err) => {
			global._mongoClientPromise = undefined;
			throw err;
		});
	}
	return global._mongoClientPromise;
}

export async function getDatabase(): Promise<Db> {
	const client = await getClientPromise();
	const dbName = process.env.MONGODB_DB_NAME || "noveldb";
	return client.db(dbName);
}

export async function getClient(): Promise<MongoClient> {
	return getClientPromise();
}
