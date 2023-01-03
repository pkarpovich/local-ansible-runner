import { createRequire } from "module";
import {
  ConfigService,
  BrokerService,
  LoggerService,
  Channel,
  ConsumeMessage,
} from "shared/src/services.js";
import { ActionTypes } from "shared/src/constants.js";
import { Config } from "./config/config.js";

import { YeelightService } from "./services/yeelight-service.js";
import { SimpleTriggerService } from "./services/simple-trigger-service.js";

const require = createRequire(import.meta.url);

// eslint-disable-next-line import/no-commonjs
const devicesConfig = require("../devices.json");

const loggerService = new LoggerService();
const configService = new ConfigService({ config: Config() });
const rabbit = new BrokerService({ configService, loggerService });
const yeelightService = new YeelightService(devicesConfig.lights);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const simpleTriggerService = new SimpleTriggerService(devicesConfig.triggers);

const serviceQueueName = configService.get<string>(
  "Rabbit.SmartDevicesQueueName"
);

const handleQueueMessage =
  (_: unknown, channel: Channel) => async (msg: ConsumeMessage) => {
    const {
      name,
      args: { zones, brightness } = {
        brightness: 100,
        zones: [],
      },
    } = JSON.parse(msg.content.toString());

    switch (name) {
      case ActionTypes.SmartDevices.SetYeelightRandomColor: {
        await yeelightService.setRandomColor(zones);
        break;
      }
      case ActionTypes.SmartDevices.SetRandomColorInEveryLight: {
        await yeelightService.setRandomColorInEveryLight(zones);
        break;
      }
      case ActionTypes.SmartDevices.TurnOnYeelight: {
        await yeelightService.setPower(true, zones, brightness);
        break;
      }
      case ActionTypes.SmartDevices.TurnOffYeelight: {
        await yeelightService.setPower(false, zones);
        break;
      }
      default: {
        loggerService.warn(`Unknown action: ${name}`);
      }
    }

    const serviceResp = JSON.stringify({});

    channel.sendToQueue(msg.properties.replyTo, Buffer.from(serviceResp), {
      correlationId: msg.properties.correlationId,
    });
  };

await rabbit.createConnection();
await rabbit.subscribeToChannel(serviceQueueName, handleQueueMessage);