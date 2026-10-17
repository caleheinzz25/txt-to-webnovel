import { Binary, type Collection } from "mongodb";
import { getDatabase } from "../mongodb";

export interface UploadChunk {
	uploadId: string;
	chunkIndex: number;
	totalChunks: number;
	data: Binary;
	createdAt: Date;
}

let indexesEnsured = false;

async function getCollection(): Promise<Collection<UploadChunk>> {
	const db = await getDatabase();
	const collection = db.collection<UploadChunk>("upload_chunks");

	if (!indexesEnsured) {
		indexesEnsured = true;
		collection
			.createIndex({ uploadId: 1, chunkIndex: 1 }, { unique: true })
			.catch((err) => {
				console.warn("Failed to create index on upload_chunks:", err);
			});
		// Auto-delete chunks older than 1 hour (3600s) to prevent DB bloat
		collection
			.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 })
			.catch((err) => {
				console.warn("Failed to create TTL index on upload_chunks:", err);
			});
	}

	return collection;
}

export async function saveUploadChunk(
	uploadId: string,
	chunkIndex: number,
	totalChunks: number,
	buffer: Buffer,
): Promise<void> {
	const collection = await getCollection();
	await collection.updateOne(
		{ uploadId, chunkIndex },
		{
			$set: {
				uploadId,
				chunkIndex,
				totalChunks,
				data: new Binary(buffer),
				createdAt: new Date(),
			},
		},
		{ upsert: true },
	);
}

export async function getUploadChunks(uploadId: string): Promise<Buffer | null> {
	const collection = await getCollection();
	const chunks = await collection
		.find({ uploadId })
		.sort({ chunkIndex: 1 })
		.toArray();

	if (chunks.length === 0) return null;

	const expectedTotal = chunks[0].totalChunks;
	if (chunks.length !== expectedTotal) {
		console.warn(
			`Incomplete chunks for upload ${uploadId}: got ${chunks.length}/${expectedTotal}`,
		);
		return null;
	}

	// Verify sequential chunk order
	for (let i = 0; i < chunks.length; i++) {
		if (chunks[i].chunkIndex !== i) {
			console.warn(`Missing chunk index ${i} for upload ${uploadId}`);
			return null;
		}
	}

	const buffers = chunks.map((c) => c.data.read(0, c.data.length()));
	return Buffer.concat(buffers);
}

export async function deleteUploadChunks(uploadId: string): Promise<void> {
	try {
		const collection = await getCollection();
		await collection.deleteMany({ uploadId });
	} catch (err) {
		console.warn(`Failed to cleanup chunks for ${uploadId}:`, err);
	}
}
