import { ConfigService, DiscoveryClientService, HttpClientService, LoggerService } from "shared/services";
import { Config } from "../config.js";

const AppleTvExecuteType = "apple-tv-execute";

type AppleTvExecuteArgs = {
    command: string;
};

type AppleTvExecuteResponse = {
    response: string;
};

enum AppleTvPowerState {
    On = "PowerState.On",
    Off = "PowerState.Off",
}

enum AppleTvCommands {
    PowerState = "power_state",
    TurnOn = "turn_on",
    LaunchApp = "launch_app",
}

enum Providers {
    Twitch = "twitch",
    Youtube = "youtube",
    Unrecognized = "unrecognized",
}

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export class StreamsService {
    constructor(
        private readonly configService: ConfigService<Config>,
        private readonly loggerService: LoggerService,
        private readonly discoveryClientService: DiscoveryClientService,
        private readonly httpClientService: HttpClientService,
    ) {}

    async openUrl(url: string) {
        this.loggerService.info(`Opening url: ${url}`);

        await this.turnOnAppleTv();

        const [deeplink, provider] = this.getDeeplinkByURL(url);
        this.loggerService.info(`Opening deeplink: ${deeplink}`);
        await this.openDeeplink(deeplink, provider);

        this.loggerService.info("Url opened successfully");
    }

    private async checkPowerStatus(): Promise<boolean> {
        const { response } = await this.discoveryClientService.invokeAction<AppleTvExecuteArgs, AppleTvExecuteResponse>(
            AppleTvExecuteType,
            {
                command: AppleTvCommands.PowerState,
            },
        );

        return response === AppleTvPowerState.On;
    }

    private async turnOnAppleTv() {
        let isAppleTvOn = await this.checkPowerStatus();
        if (isAppleTvOn) {
            this.loggerService.info("Apple TV is already on");
            return;
        }

        this.loggerService.info("Turning on Apple TV");
        await this.discoveryClientService.invokeAction<AppleTvExecuteArgs, AppleTvExecuteResponse>(AppleTvExecuteType, {
            command: AppleTvCommands.TurnOn,
        });
        await wait(5000);

        isAppleTvOn = await this.checkPowerStatus();
        if (!isAppleTvOn) {
            throw new Error("Failed to turn on Apple TV");
        }
    }

    private getDeeplinkByURL(link: string): [string, Providers] {
        const url = new URL(link);

        // support for https://youtu.be/sFu2l0nz67o?si=jpjkEGSWbfsgYKlz
        if (url.hostname === "www.youtube.com") {
            const videoId = url.searchParams.get("v");
            return [`youtube://watch/${videoId}`, Providers.Youtube];
        } else if (url.hostname === "youtu.be") {
            const videoId = url.pathname.split("/")[1];
            return [`youtube://watch/${videoId}`, Providers.Youtube];
        } else if (url.hostname === "www.twitch.tv") {
            const channel = url.pathname.split("/")[1];
            const liveStreamForwarderUrl = this.configService.get<string>("liveStreamForwarder.url");
            const atvUrl = this.configService.get<string>("liveStreamForwarder.atvUrl");

            const streamUrl = `${liveStreamForwarderUrl}/live-stream/stream/twitch/${channel}`;
            const deeplinkUrl = `${atvUrl}/open?target=vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(streamUrl)}`;
            return [deeplinkUrl, Providers.Twitch];
        }

        return [link, Providers.Unrecognized];
    }

    private async launchApp(appId: string) {
        this.loggerService.info(`Launching app: ${appId}`);
        await this.discoveryClientService.invokeAction<AppleTvExecuteArgs, AppleTvExecuteResponse>(AppleTvExecuteType, {
            command: `${AppleTvCommands.LaunchApp}=${appId}`,
        });
    }

    private async openDeeplink(deeplink: string, provider: Providers) {
        switch (provider) {
            case Providers.Youtube: {
                await this.launchApp(deeplink);
                break;
            }
            case Providers.Twitch: {
                await this.launchApp("com.celerity.DeepLink");
                await wait(5000);

                await this.httpClientService.get(deeplink);
                break;
            }
            case Providers.Unrecognized: {
                this.loggerService.error(`Unrecognized provider for deeplink: ${deeplink}`);
                break;
            }
        }
    }
}
