// Nessages to be processed inside the Cast Receiver app

import type { Auth } from "home-assistant-js-websocket";
import type { CastManager } from "./cast_manager";
import { CAST_DEV } from "./const";
import { CAST_DEV_HASS_URL } from "./dev_const";
import type { BaseCastMessage } from "./types";

export interface GetStatusMessage extends BaseCastMessage {
  type: "get_status";
  hassUrl?: string;
  hassUUID?: string;
}

export interface ConnectMessage extends BaseCastMessage {
  type: "connect";
  refreshToken: string;
  clientId: string | null;
  hassUrl: string;
  hassUUID?: string;
}

export interface ShowLovelaceViewMessage extends BaseCastMessage {
  type: "show_lovelace_view";
  viewPath: string | number | null;
  urlPath: string | null;
  hassUrl: string;
  hassUUID?: string;
}

export interface ShowDemoMessage extends BaseCastMessage {
  type: "show_demo";
}

export type HassMessage =
  | ShowDemoMessage
  | GetStatusMessage
  | ConnectMessage
  | ShowLovelaceViewMessage;

export const castSendAuth = (cast: CastManager, auth: Auth) =>
  cast.sendMessage({
    type: "connect",
    refreshToken: auth.data.refresh_token,
    clientId: auth.data.clientId,
    hassUrl: CAST_DEV ? CAST_DEV_HASS_URL : auth.data.hassUrl,
  });

export const castSendShowLovelaceView = (
  cast: CastManager,
  hassUrl: string,
  viewPath: ShowLovelaceViewMessage["viewPath"],
  urlPath?: string | null
) =>
  cast.sendMessage({
    type: "show_lovelace_view",
    viewPath,
    urlPath: urlPath || null,
    hassUrl: CAST_DEV ? CAST_DEV_HASS_URL : hassUrl,
  });

export const castSendShowDemo = (cast: CastManager) =>
  cast.sendMessage({
    type: "show_demo",
  });

export const ensureConnectedCastSession = (cast: CastManager, auth: Auth) => {
  if (cast.castConnectedToOurHass) {
    return undefined;
  }

  return new Promise<void>((resolve) => {
    const unsub = cast.addEventListener("connection-changed", () => {
      if (cast.castConnectedToOurHass) {
        unsub();
        resolve();
      }
    });

    castSendAuth(cast, auth);
  });
};
