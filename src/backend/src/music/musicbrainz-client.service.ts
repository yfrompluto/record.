// ===============================================================================================
//    Raw axios client for the MusicBrainz API
//    Since MusicBrainz limits requests, this service limits reqs to 1 req/sec via a FIFO queue. 
//    This service should only be called by the import service, which reads from redis/the db first.
// ===============================================================================================

import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
   MusicBrainzArtist,
   MusicBrainzArtistSearchResult,
   MusicBrainzRelease,
   MusicBrainzReleaseGroup,
   MusicBrainzReleaseGroupSearchResult,
} from './dto/musicbrainz-response.types';

const USER_AGENT = 'ft_transcendence/1.0 (https://github.com/tiiyii/Record_test; ft_record@protonmail.com)';
const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2';
const MIN_REQ_INTERVAL = 1005;

// retry/backoff config — only for transient failures (503, timeout, network errors)
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;

type QueuedRequest<T> = {
	execute: () => Promise<T>;
	resolve: (value: T) => void;
	reject: (reason: unknown) => void;
};

@Injectable()
export class MusicbrainzClientService {
	private readonly client: AxiosInstance;
	private queue: QueuedRequest<unknown>[] = [];
	private processing = false;
	private lastRequestTime = 0;

	constructor() {
		this.client = axios.create({
			baseURL: MUSICBRAINZ_BASE_URL,
			headers: { 'User-Agent': USER_AGENT },
			timeout: 10000,
		});
	}

	private enqueue<T>(execute: () => Promise<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.queue.push({ execute, resolve, reject } as QueuedRequest<unknown>);
			this.processQueue();
		});
	}

	private async processQueue(): Promise<void> {
		if (this.processing) {
			return;
		}
		this.processing = true;

		while (this.queue.length > 0) {
			const now = Date.now();
			const elapsed = now - this.lastRequestTime;
			if (elapsed < MIN_REQ_INTERVAL) {
				await this.sleep(MIN_REQ_INTERVAL - elapsed);
			}

			const request = this.queue.shift();
			if (!request) {
				continue;
			}

			this.lastRequestTime = Date.now();

			try {
				const result = await this.executeWithRetry(request.execute);
				request.resolve(result);
			} catch (error) {
				request.reject(error);
			}
		}

		this.processing = false;
	}

	/**
	 * 	Retries a single MusicBrainz call on transient failures only
	 * 	(503 rate-limit responses, timeouts, network errors).
	 * 	Non-transient errors (404, 400, etc.) fail immediately, no retry.
	 * 	Each retry respects MIN_REQ_INTERVAL again before hitting the API.
	 */
	private async executeWithRetry<T>(execute: () => Promise<T>): Promise<T> {
		let attempt = 0;

		while (true) {
			try {
				return await execute();
			} catch (error) {
				const shouldRetry = this.isTransientError(error) && attempt < MAX_RETRIES;
				if (!shouldRetry) {
					throw error;
				}

				attempt += 1;
				const delay = RETRY_BASE_DELAY_MS * attempt;
				await this.sleep(delay);

				// respect the 1 req/s limit again before the retry itself
				const elapsed = Date.now() - this.lastRequestTime;
				if (elapsed < MIN_REQ_INTERVAL) {
					await this.sleep(MIN_REQ_INTERVAL - elapsed);
				}
				this.lastRequestTime = Date.now();
			}
		}
	}

	private isTransientError(error: unknown): boolean {
		if (!axios.isAxiosError(error)) {
			return false;
		}
		// no response at all = network error / timeout (ECONNABORTED, ECONNRESET, ENOTFOUND, etc.)
		if (!error.response) {
			return true;
		}
		return error.response.status === 503;
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private escapeLuceneSpecialChars(query: string): string {
		return query.replace(/([+\-!(){}[\]^"~*?:\\/&|])/g, '\\$1');
	}

	async searchArtist(query: string): Promise<MusicBrainzArtistSearchResult> {
		return this.enqueue(async () => {
			const response = await this.client.get<MusicBrainzArtistSearchResult>('/artist', {
				params: { query, fmt: 'json' },
			});
			return response.data;
		});
	}

	async getArtist(mbid: string): Promise<MusicBrainzArtist> {
		return this.enqueue(async () => {
			const response = await this.client.get<MusicBrainzArtist>(`/artist/${mbid}`, {
				params: { fmt: 'json', inc: 'release-groups' },
			});
			return response.data;
		});
	}

	async searchReleaseGroup(query: string): Promise<MusicBrainzReleaseGroupSearchResult> {
		const escapedQuery = this.escapeLuceneSpecialChars(query);
		return this.enqueue(async () => {
			const response = await this.client.get<MusicBrainzReleaseGroupSearchResult>('/release-group', {
				params: { query: escapedQuery, fmt: 'json' },
			});
			return response.data;
		});
	}

	async getReleaseGroup(mbid: string): Promise<MusicBrainzReleaseGroup> {
		return this.enqueue(async () => {
			const response = await this.client.get<MusicBrainzReleaseGroup>(`/release-group/${mbid}`, {
				params: { fmt: 'json', inc: 'artist-credits+releases' },
			});
			return response.data;
		});
	}

	async getRelease(mbid: string): Promise<MusicBrainzRelease> {
		return this.enqueue(async () => {
			const response = await this.client.get<MusicBrainzRelease>(`/release/${mbid}`, {
				params: { fmt: 'json', inc: 'recordings' },
			});
			return response.data;
		});
	}
}