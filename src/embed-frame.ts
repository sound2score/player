import type { Resource } from "core/disposable";
import type { Eventful } from "core/events";
import type { EmbedMessage, HostMessage } from "./protocol";

export type EmbedFrameEvents = {
	/** A message from the embed. */
	message: EmbedMessage;
	/** The embed's page loaded, or loaded again. */
	load: undefined;
};

/** The embed's iframe, as a Player talks to it. */
export interface EmbedFrame extends Eventful<EmbedFrameEvents>, Resource {
	post(message: HostMessage): void;
}
