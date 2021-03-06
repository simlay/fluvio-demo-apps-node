import crypto from 'crypto';
import WS from "ws";
import http from "http";
import { SessionController } from "./session-controller";

const COOKIE_NAME = "Fluvio-Bot-Assistant"

export class WsProxyIn {
    private static wss: WS.Server;
    private static sessionController: SessionController;

    constructor(sessionController: SessionController) {
        WsProxyIn.wss = new WS.Server({ clientTracking: false, noServer: true });
        WsProxyIn.sessionController = sessionController;
    }

    public init(server: http.Server) {
        this.onUpgrade(server);
        this.onConnection();
    }

    private onUpgrade(server: http.Server) {
        server.on("upgrade", (request, socket, head) => {
            const session = WsProxyIn.parseCookie(COOKIE_NAME, request.headers.cookie);
            if (session) {
                request.headers.session = session;
            }

            WsProxyIn.wss.handleUpgrade(request, socket, head, function (ws: WS) {
                WsProxyIn.wss.emit("connection", ws, request);
            });
        });
    }

    private onConnection() {
        WsProxyIn.wss.on("headers", (headers: Array<string>, req) => {
            const session = WsProxyIn.parseCookie(COOKIE_NAME, req.headers.cookie);
            if (!session) {
                let session = crypto.randomBytes(20).toString("hex");
                req.headers.session = session;

                headers.push("Set-Cookie: " + COOKIE_NAME + "=" + session);
            }
        });

        WsProxyIn.wss.on("connection", async (ws, req) => {
            const session_hdr = req.headers.session;
            const sid = ((Array.isArray(session_hdr)) ? session_hdr[0] : session_hdr) || "";
            await WsProxyIn.sessionController.sessionOpened(sid, ws);

            ws.on("close", async () => {
                await WsProxyIn.sessionController.sessionClosed(sid);
            });

            ws.on("message", async (clientMsg: string) => {
                await WsProxyIn.sessionController.messageFromClient(sid, clientMsg);
            });

        });
    }

    private static parseCookie(cookieName: string, cookie_hdr?: string) {
        if (cookie_hdr) {
            const cookiePair = cookie_hdr.split(/; */).map((c: string) => {
                const [key, v] = c.split('=', 2);
                return [key, decodeURIComponent(v)];
            }).find(res =>
                (res[0] == cookieName)
            );

            if (Array.isArray(cookiePair) && cookiePair.length > 1) {
                return cookiePair[1];
            }
        }
        return undefined;
    }
}