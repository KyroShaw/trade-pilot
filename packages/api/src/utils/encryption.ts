import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@trade-pilot/env/server";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
	return Buffer.from(env.ENCRYPTION_KEY, "hex");
}

export function encrypt(plaintext: string): string {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, getKey(), iv, {
		authTagLength: AUTH_TAG_LENGTH,
	});
	const encrypted = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();
	return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decrypt(ciphertext: string): string {
	const parts = ciphertext.split(":");
	if (parts.length !== 3) {
		throw new Error("Invalid ciphertext format");
	}
	const [ivB64, authTagB64, encryptedB64] = parts;
	if (!(ivB64 && authTagB64 && encryptedB64)) {
		throw new Error("Invalid ciphertext format");
	}
	const iv = Buffer.from(ivB64, "base64");
	const authTag = Buffer.from(authTagB64, "base64");
	const encrypted = Buffer.from(encryptedB64, "base64");
	const decipher = createDecipheriv(ALGORITHM, getKey(), iv, {
		authTagLength: AUTH_TAG_LENGTH,
	});
	decipher.setAuthTag(authTag);
	return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}
