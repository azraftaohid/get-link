import { XhrHttpHandler } from "@aws-sdk/xhr-http-handler";
import { HttpHandler, HttpRequest, HttpResponse } from "@smithy/protocol-http";
import { HttpHandlerOptions, RequestHandlerOutput } from "@smithy/types";
import EventEmitter from "events";
import { getRuntimeConfig } from "./runtimeConfig";

export class AppHttpHandler extends EventEmitter implements HttpHandler {
	private static instance: AppHttpHandler | undefined;

	private defaultRequestHandler: HttpHandler;
	private putRequestHandler: HttpHandler;

	private requestHandlersEventHandler: {
		[XhrHttpHandler.EVENTS.UPLOAD_PROGRESS]: EventHandlers["xhrUploadProgress"],
	};

	constructor() {
		super();

		const runtime = getRuntimeConfig();
		this.defaultRequestHandler = runtime.httpRequestHandler;
		this.putRequestHandler = runtime.httpPutRequestHandler;

		this.requestHandlersEventHandler = {
			"xhr.upload.progress": (evt, req) => this.emit("xhrUploadProgress", evt, req),
		};

		this.on("newListener", (evt) => {
			if (evt === "xhrUploadProgress") {
				this.mapCallbacks(this.defaultRequestHandler, "xhr.upload.progress");
				this.mapCallbacks(this.putRequestHandler, "xhr.upload.progress");
			}
		});

		this.on("removeListener", (evt) => {
			if (evt === "xhrUploadProgress" && this.listenerCount("xhrUploadProgress") === 0) {
				this.unmapCallbacks(this.defaultRequestHandler, "xhr.upload.progress");
				this.unmapCallbacks(this.putRequestHandler, "xhr.upload.progress");
			}
		});
	}

	public static getInstance() {
		if (!AppHttpHandler.instance) AppHttpHandler.instance = new AppHttpHandler();
		return AppHttpHandler.instance;
	}

	private mapCallbacks(requestHandler: HttpHandler, evt: keyof typeof this.requestHandlersEventHandler) {
		const eventHandler = this.requestHandlersEventHandler[evt];
		if (requestHandler instanceof EventEmitter && !requestHandler.listeners(evt).includes(eventHandler)) {
			requestHandler.on(evt, this.requestHandlersEventHandler[evt]);
		}
	}

	private unmapCallbacks(requestHandler: HttpHandler, evt: keyof typeof this.requestHandlersEventHandler) {
		const eventHandler = this.requestHandlersEventHandler[evt];
		if (requestHandler instanceof EventEmitter) {
			requestHandler.off(evt, eventHandler);
		}
	}

	private getHandler(request: HttpRequest) {
		if ((request.method === "PUT" || request.method === "POST") && request.body) return this.putRequestHandler;
		return this.defaultRequestHandler;
	}

	async handle(request: HttpRequest, handlerOptions?: HttpHandlerOptions | undefined): Promise<RequestHandlerOutput<HttpResponse>> {
		const handler = this.getHandler(request);
		console.debug("Handling HTTP " + request.method + " request. Handler: " + handler.constructor.name);

		return handler.handle(request, handlerOptions);
	}

	eventNames(): (keyof EventHandlers)[] {
		return super.eventNames() as (keyof EventHandlers)[];
	}

	emit<K extends keyof EventHandlers>(eventName: K, ...args: Parameters<EventHandlers[K]>): boolean {
		return super.emit(eventName, ...args);
	}

	prependListener<K extends keyof EventHandlers>(eventName: K, listener: EventHandlers[K]): this {
		return super.prependListener(eventName, listener);
	}

	addListener<K extends keyof EventHandlers>(eventName: K, listener: EventHandlers[K]): this {
		return super.addListener(eventName, listener);
	}

	on<K extends keyof EventHandlers>(eventName: K, listener: EventHandlers[K]): this {
		return super.addListener(eventName, listener);
	}

	prependOnceListener<K extends keyof EventHandlers>(eventName: K, listener: EventHandlers[K]): this {
		return super.prependListener(eventName, listener);
	}

	once<K extends keyof EventHandlers>(eventName: K, listener: EventHandlers[K]): this {
		return super.once(eventName, listener);
	}

	removeListener<K extends keyof EventHandlers>(eventName: K, listener: EventHandlers[K]): this {
		return super.removeListener(eventName, listener);
	}

	removeAllListeners(event?: keyof EventEmitter): this {
		return super.removeAllListeners(event);
	}

	off<K extends keyof EventHandlers>(eventName: K, listener: EventHandlers[K]): this {
		return super.off(eventName, listener);
	}

	listenerCount(eventName: keyof EventHandlers): number {
		return super.listenerCount(eventName);
	}
	
	updateHttpClientConfig(key: never, value: never): void {
		this.defaultRequestHandler.updateHttpClientConfig(key, value);
		this.putRequestHandler.updateHttpClientConfig(key, value);
	}

	httpHandlerConfigs() {
		const combined = {
			...this.defaultRequestHandler.httpHandlerConfigs(),
			...this.putRequestHandler.httpHandlerConfigs(),
		};

		return combined;
	}
}

export type EventHandlers = {
	"xhrUploadProgress": (evt: ProgressEvent, req: HttpRequest) => void,
	"newListener": <K extends keyof EventHandlers>(name: K, listener: EventHandlers[K]) => void,
	"removeListener": <K extends keyof EventHandlers>(name: K, listener?: EventHandlers[K]) => void,
};

export interface AppHttpHandlerConfig {
    requestTimeout?: number;
    keepAlive?: boolean;
}
