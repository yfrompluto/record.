// =====================================================================
//    Raw axios client for the Cover Art Archive API.
//   	It returns hotlink image URLs (album covers) for a given release,
//		and the backend doesnt proxy/stores the actual image.
//    This service also uses a FIFO queue pattern for consistency.
// =====================================================================

import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { CoverArtResponse } from './dto/cover-art-response.types';

const	USER_AGENT = 'ft_transcendence/1.0 (https://github.com/tiiyii/Record_test; ft_record@protonmail.com)';
const COVER_ART_BASE_URL = 'https://coverartarchive.org';
const MIN_REQ_INTERVAL = 1001;

type QueuedRequest<T> = {
	execute: () => Promise<T>;
	resolve: (value: T) => void;
	reject: (reason: unknown) => void;
};

@Injectable()
export class CoverArtService {
	private readonly client: AxiosInstance;
	private queue: QueuedRequest<unknown>[] = [];
	private processing = false;
	private lastRequestTime = 0;

	constructor() {
		this.client = axios.create({
			baseURL: COVER_ART_BASE_URL,
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
				const result = await request.execute();
				request.resolve(result);
			} catch (error) {
				request.reject(error);
			}
		}

		this.processing = false;
	}

  private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
  }

	/**
	 * 	Returns the front cover URL for a given release mbid or null if none was found
	 * 		- if Cover Art Archive is down/erroring (404, 500, 503..), it doesn't
	 * 			break album detail, just show no cover
	 */
	async getFrontCoverUrl(releaseMbid: string): Promise<string | null> {
		return this.enqueue(async () => {
			try {
				const response = await this.client.get<CoverArtResponse>(`/release/${releaseMbid}`);
				const front = response.data.images.find((img) => img.front);
				if (!front?.image) {
					return null;
				}
				return front.image.replace(/^http:\/\//, 'https://');
			} catch (error) {
				console.error(`[CoverArtService] Failed to fetch cover for ${releaseMbid}:`, 
					axios.isAxiosError(error) ? `${error.response?.status ?? 'network error'}` : error);
				return null;
			}
		});
	}
}