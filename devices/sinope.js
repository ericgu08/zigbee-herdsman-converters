const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const constants = require('../lib/constants');
const utils = require('../lib/utils');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const {precisionRound} = require('../lib/utils');

const manuSinope = {manufacturerCode: 0x119C};

const fzLocal = {
    ias_water_leak_alarm: {
        // RM3500ZB specific
        cluster: 'ssIasZone',
        type: ['commandStatusChangeNotification', 'attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zoneStatus;
            return {
                water_leak: (zoneStatus & 1) > 0,
                tamper: (zoneStatus & 1<<2) > 0,
            };
        },
    },
    thermostat: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            delete msg['running_state'];
            const result = {};
            const occupancyLookup = {0: 'unoccupied', 1: 'occupied'};
            const cycleOutputLookup = {15: '15_sec', 300: '5_min', 600: '10_min',
                900: '15_min', 1200: '20_min', 1800: '30_min', 65535: 'off'};

            if (msg.data.hasOwnProperty('1024')) {
                result.thermostat_occupancy = occupancyLookup[msg.data['1024']];
            }
            if (msg.data.hasOwnProperty('SinopeOccupancy')) {
                result.thermostat_occupancy = occupancyLookup[msg.data['SinopeOccupancy']];
            }
            if (msg.data.hasOwnProperty('1025')) {
                result.main_cycle_output = cycleOutputLookup[msg.data['1025']];
            }
            if (msg.data.hasOwnProperty('SinopeMainCycleOutput')) {
                result.main_cycle_output = cycleOutputLookup[msg.data['SinopeMainCycleOutput']];
            }
            if (msg.data.hasOwnProperty('1026')) {
                const lookup = {0: 'on_demand', 1: 'sensing'};
                result.backlight_auto_dim = lookup[msg.data['1026']];
            }
            if (msg.data.hasOwnProperty('SinopeBacklight')) {
                const lookup = {0: 'on_demand', 1: 'sensing'};
                result.backlight_auto_dim = lookup[msg.data['SinopeBacklight']];
            }
            if (msg.data.hasOwnProperty('1028')) {
                result.aux_cycle_output = cycleOutputLookup[msg.data['1028']];
            }
            if (msg.data.hasOwnProperty('localTemp')) {
                result.local_temperature = precisionRound(msg.data['localTemp'], 2) / 100;
            }
            if (msg.data.hasOwnProperty('localTemperatureCalibration')) {
                result.local_temperature_calibration = precisionRound(msg.data['localTemperatureCalibration'], 2) / 10;
            }
            if (msg.data.hasOwnProperty('outdoorTemp')) {
                result.outdoor_temperature = precisionRound(msg.data['outdoorTemp'], 2) / 100;
            }
            if (msg.data.hasOwnProperty('occupiedHeatingSetpoint')) {
                result.occupied_heating_setpoint = precisionRound(msg.data['occupiedHeatingSetpoint'], 2) / 100;
            }
            if (msg.data.hasOwnProperty('unoccupiedHeatingSetpoint')) {
                result.unoccupied_heating_setpoint = precisionRound(msg.data['unoccupiedHeatingSetpoint'], 2) / 100;
            }
            if (msg.data.hasOwnProperty('occupiedCoolingSetpoint')) {
                result.occupied_cooling_setpoint = precisionRound(msg.data['occupiedCoolingSetpoint'], 2) / 100;
            }
            if (msg.data.hasOwnProperty('unoccupiedCoolingSetpoint')) {
                result.unoccupied_cooling_setpoint = precisionRound(msg.data['unoccupiedCoolingSetpoint'], 2) / 100;
            }
            if (msg.data.hasOwnProperty('ctrlSeqeOfOper')) {
                result.control_sequence_of_operation = constants.thermostatControlSequenceOfOperations[msg.data['ctrlSeqeOfOper']];
            }
            if (msg.data.hasOwnProperty('systemMode')) {
                result.system_mode = constants.thermostatSystemModes[msg.data['systemMode']];
            }
            if (msg.data.hasOwnProperty('pIHeatingDemand')) {
                result.pi_heating_demand = precisionRound(msg.data['pIHeatingDemand'], 0);
            }
            if (msg.data.hasOwnProperty('minHeatSetpointLimit')) {
                result.min_heat_setpoint_limit = precisionRound(msg.data['minHeatSetpointLimit'], 2) / 100;
            }
            if (msg.data.hasOwnProperty('maxHeatSetpointLimit')) {
                result.max_heat_setpoint_limit = precisionRound(msg.data['maxHeatSetpointLimit'], 2) / 100;
            }
            if (msg.data.hasOwnProperty('absMinHeatSetpointLimit')) {
                result.abs_min_heat_setpoint_limit = precisionRound(msg.data['absMinHeatSetpointLimit'], 2) / 100;
            }
            if (msg.data.hasOwnProperty('absMaxHeatSetpointLimit')) {
                result.abs_max_heat_setpoint_limit = precisionRound(msg.data['absMaxHeatSetpointLimit'], 2) / 100;
            }
            if (msg.data.hasOwnProperty('pIHeatingDemand')) {
                result.running_state = msg.data['pIHeatingDemand'] >= 10 ? 'heat' : 'idle';
            }
            return result;
        },
    },
    sinope: {
        cluster: 'manuSpecificSinope',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty('GFCiStatus')) {
                const lookup = {0: 'off', 1: 'on'};
                result.gfci_status = lookup[msg.data['GFCiStatus']];
            }
            if (msg.data.hasOwnProperty('floorLimitStatus')) {
                const lookup = {0: 'off', 1: 'on'};
                result.floor_limit_status = lookup[msg.data['floorLimitStatus']];
            }
            if (msg.data.hasOwnProperty('secondScreenBehavior')) {
                const lookup = {0: 'auto', 1: 'setpoint', 2: 'outdoor temp'};
                result.second_display_mode = lookup[msg.data['secondScreenBehavior']];
            }
            if (msg.data.hasOwnProperty('outdoorTempToDisplayTimeout')) {
                result.outdoor_temperature_timeout = msg.data['outdoorTempToDisplayTimeout'];
                // DEPRECATED: Use Second Display Mode or control via set outdoorTempToDisplayTimeout
                result.enable_outdoor_temperature = msg.data['outdoorTempToDisplayTimeout'] === 12 ? 'OFF' : 'ON';
            }
            if (msg.data.hasOwnProperty('outdoorTempToDisplay')) {
                result.thermostat_outdoor_temperature = precisionRound(msg.data['outdoorTempToDisplay'], 2) / 100;
            }
            if (msg.data.hasOwnProperty('currentTimeToDisplay')) {
                result.current_time_to_display = msg.data['currentTimeToDisplay'];
            }
            if (msg.data.hasOwnProperty('floorControlMode')) {
                const lookup = {1: 'ambiant', 2: 'floor'};
                result.floor_control_mode = lookup[msg.data['floorControlMode']];
            }
            if (msg.data.hasOwnProperty('ambiantMaxHeatSetpointLimit')) {
                result.ambiant_max_heat_setpoint = msg.data['ambiantMaxHeatSetpointLimit'] / 100.0;
                if (result.ambiant_max_heat_setpoint === -327.68) {
                    result.ambiant_max_heat_setpoint = 'off';
                }
            }
            if (msg.data.hasOwnProperty('floorMinHeatSetpointLimit')) {
                result.floor_min_heat_setpoint = msg.data['floorMinHeatSetpointLimit'] / 100.0;
                if (result.floor_min_heat_setpoint === -327.68) {
                    result.floor_min_heat_setpoint = 'off';
                }
            }
            if (msg.data.hasOwnProperty('floorMaxHeatSetpointLimit')) {
                result.floor_max_heat_setpoint = msg.data['floorMaxHeatSetpointLimit'] / 100.0;
                if (result.floor_max_heat_setpoint === -327.68) {
                    result.floor_max_heat_setpoint = 'off';
                }
            }
            if (msg.data.hasOwnProperty('temperatureSensor')) {
                const lookup = {0: '10k', 1: '12k'};
                result.floor_temperature_sensor = lookup[msg.data['temperatureSensor']];
            }
            if (msg.data.hasOwnProperty('timeFormatToDisplay')) {
                const lookup = {0: '24h', 1: '12h'};
                result.time_format = lookup[msg.data['timeFormatToDisplay']];
            }
            if (msg.data.hasOwnProperty('connectedLoad')) {
                result.connected_load = msg.data['connectedLoad'];
            }
            if (msg.data.hasOwnProperty('auxConnectedLoad')) {
                result.aux_connected_load = msg.data['auxConnectedLoad'];
                if (result.aux_connected_load == 65535) {
                    result.aux_connected_load = 'disabled';
                }
            }
            if (msg.data.hasOwnProperty('pumpProtection')) {
                result.pump_protection = msg.data['pumpProtection'] == 1 ? 'ON' : 'OFF';
            }
            if (msg.data.hasOwnProperty('dimmerTimmer')) {
                result.timer_seconds = msg.data['dimmerTimmer'];
            }
            if (msg.data.hasOwnProperty('ledIntensityOn')) {
                result.led_intensity_on = msg.data['ledIntensityOn'];
            }
            if (msg.data.hasOwnProperty('ledIntensityOff')) {
                result.led_intensity_off = msg.data['ledIntensityOff'];
            }
            if (msg.data.hasOwnProperty('minimumBrightness')) {
                result.minimum_brightness = msg.data['minimumBrightness'];
            }
            if (msg.data.hasOwnProperty('actionReport')) {
                const lookup = {2: 'up_single', 3: 'up_hold', 4: 'up_double',
                    18: 'down_single', 19: 'down_hold', 20: 'down_double'};
                result.action = lookup[msg.data['actionReport']];
            }
            if (msg.data.hasOwnProperty('keypadLockout')) {
                const lookup = {0: 'unlock', 1: 'lock'};
                result.keypad_lockout = lookup[msg.data['keypadLockout']];
            }
            return result;
        },
    },
};
const tzLocal = {
    thermostat_occupancy: {
        key: ['thermostat_occupancy'],
        convertSet: async (entity, key, value, meta) => {
            const sinopeOccupancy = {0: 'unoccupied', 1: 'occupied'};
            const SinopeOccupancy = utils.getKey(sinopeOccupancy, value, value, Number);
            await entity.write('hvacThermostat', {SinopeOccupancy}, manuSinope);
            return {state: {'thermostat_occupancy': value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['SinopeOccupancy'], manuSinope);
        },
    },
    backlight_autodim: {
        key: ['backlight_auto_dim'],
        convertSet: async (entity, key, value, meta) => {
            const sinopeBacklightParam = {0: 'on_demand', 1: 'sensing'};
            const SinopeBacklight = utils.getKey(sinopeBacklightParam, value, value, Number);
            await entity.write('hvacThermostat', {SinopeBacklight}, manuSinope);
            return {state: {'backlight_auto_dim': value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['SinopeBacklight'], manuSinope);
        },
    },
    main_cycle_output: {
        key: ['main_cycle_output'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'15_sec': 15, '5_min': 300, '10_min': 600, '15_min': 900, '20_min': 1200, '30_min': 1800};
            await entity.write('hvacThermostat', {SinopeMainCycleOutput: lookup[value]}, manuSinope);
            return {state: {'main_cycle_output': value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['SinopeMainCycleOutput'], manuSinope);
        },
    },
    aux_cycle_output: {
        // TH1400ZB specific
        key: ['aux_cycle_output'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'off': 65535, '15_sec': 15, '5_min': 300, '10_min': 600, '15_min': 900, '20_min': 1200, '30_min': 1800};
            await entity.write('hvacThermostat', {SinopeAuxCycleOutput: lookup[value]});
            return {state: {'aux_cycle_output': value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['SinopeAuxCycleOutput']);
        },
    },
    enable_outdoor_temperature: { //DEPRECATED: Use Second Display Mode or control via the timeout
        key: ['enable_outdoor_temperature'],
        convertSet: async (entity, key, value, meta) => {
            if (value.toLowerCase() == 'on') {
                await entity.write('manuSpecificSinope', {outdoorTempToDisplayTimeout: 10800}, manuSinope);
            } else if (value.toLowerCase() == 'off') {
                // set timer to 12 sec in order to disable outdoor temperature
                await entity.write('manuSpecificSinope', {outdoorTempToDisplayTimeout: 12}, manuSinope);
            }
            return {readAfterWriteTime: 250, state: {enable_outdoor_temperature: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['outdoorTempToDisplayTimeout'], manuSinope);
        },
    },
    second_display_mode: {
        key: ['second_display_mode'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'auto': 0, 'setpoint': 1, 'outdoor temp': 2};
            await entity.write('manuSpecificSinope', {secondScreenBehavior: lookup[value]});
            return {state: {second_display_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['secondScreenBehavior']);
        },
    },
    thermostat_outdoor_temperature: {
//    outdoor_temperature:{
        key: ['thermostat_outdoor_temperature'],
        convertSet: async (entity, key, value, meta) => {
            if (value >= -99.5 && value <= 99.5) {
                await entity.write('manuSpecificSinope', {outdoorTempToDisplay: value * 100}, manuSinope);
            }
            return {state: {thermostat_outdoor_temperature: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['outdoorTempToDisplay'], manuSinope);
        },
    },
    outdoor_temperature_timeout: {
        key: ['outdoor_temperature_timeout'],
        convertSet: async (entity, key, value, meta) => {
            if (value >= 30 && value <= 64800) {
                await entity.write('manuSpecificSinope', {outdoorTempToDisplayTimeout: value});
                return {state: {outdoor_temperature_timeout: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['outdoorTempToDisplayTimeout']);
        },
    },
    thermostat_time: {
        key: ['thermostat_time'],
        convertSet: async (entity, key, value, meta) => {
            if (value === '') {
                const thermostatDate = new Date();
                const thermostatTimeSec = thermostatDate.getTime() / 1000;
                const thermostatTimezoneOffsetSec = thermostatDate.getTimezoneOffset() * 60;
                const currentTimeToDisplay = Math.round(thermostatTimeSec - thermostatTimezoneOffsetSec - 946684800);
                await entity.write('manuSpecificSinope', {currentTimeToDisplay}, manuSinope);
            } else if (value !== '') {
                await entity.write('manuSpecificSinope', {currentTimeToDisplay: value}, manuSinope);
            }
        },
    },
    floor_control_mode: {
        // TH1300ZB and TH1400ZB specific
        key: ['floor_control_mode'],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== 'string') {
                return;
            }
            const lookup = {'ambiant': 1, 'floor': 2};
            value = value.toLowerCase();
            if (lookup.hasOwnProperty(value)) {
                await entity.write('manuSpecificSinope', {floorControlMode: lookup[value]});
            }
            return {readAfterWriteTime: 250, state: {floor_control_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['floorControlMode']);
        },
    },
    ambiant_max_heat_setpoint: {
        // TH1300ZB and TH1400ZBspecific
        key: ['ambiant_max_heat_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            if ((value >= 5 && value <= 36) || value == 'off') {
                await entity.write('manuSpecificSinope', {ambiantMaxHeatSetpointLimit: (value == 'off' ? -32768 : value * 100)});
                return {readAfterWriteTime: 250, state: {ambiant_max_heat_setpoint: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['ambiantMaxHeatSetpointLimit']);
        },
    },
    floor_min_heat_setpoint: {
        // TH1300ZB and TH1400ZB specific
        key: ['floor_min_heat_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            if ((value >= 5 && value <= 34) || value == 'off') {
                await entity.write('manuSpecificSinope', {floorMinHeatSetpointLimit: (value == 'off' ? -32768 : value * 100)});
                return {readAfterWriteTime: 250, state: {floor_min_heat_setpoint: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['floorMinHeatSetpointLimit']);
        },
    },
    floor_max_heat_setpoint: {
        // TH1300ZB and TH1400ZB specific
        key: ['floor_max_heat_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            if ((value >= 7 && value <= 36) || value == 'off') {
                await entity.write('manuSpecificSinope', {floorMaxHeatSetpointLimit: (value == 'off' ? -32768 : value * 100)});
                return {readAfterWriteTime: 250, state: {floor_max_heat_setpoint: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['floorMaxHeatSetpointLimit']);
        },
    },
    temperature_sensor: {
        // TH1300ZB and TH1400ZB specific
        key: ['floor_temperature_sensor'],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== 'string') {
                return;
            }
            const lookup = {'10k': 0, '12k': 1};
            value = value.toLowerCase();
            if (lookup.hasOwnProperty(value)) {
                await entity.write('manuSpecificSinope', {temperatureSensor: lookup[value]});
            }
            return {readAfterWriteTime: 250, state: {floor_temperature_sensor: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['temperatureSensor']);
        },
    },
    time_format: {
        key: ['time_format'],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== 'string') {
                return;
            }
            const lookup = {'24h': 0, '12h': 1};
            value = value.toLowerCase();
            if (lookup.hasOwnProperty(value)) {
                await entity.write('manuSpecificSinope', {timeFormatToDisplay: lookup[value]}, manuSinope);
                return {readAfterWriteTime: 250, state: {time_format: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['timeFormatToDisplay'], manuSinope);
        },
    },
    connected_load: {
        // TH1400ZB and SW2500ZB
        key: ['connected_load'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('manuSpecificSinope', {connectedLoad: value});
            return {state: {connected_load: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['connectedLoad']);
        },
    },
    aux_connected_load: {
        // TH1400ZB specific
        key: ['aux_connected_load'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('manuSpecificSinope', {auxConnectedLoad: value});
            return {readAfterWriteTime: 250, state: {aux_connected_load: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['auxConnectedLoad']);
        },
    },
    pump_protection: {
        // TH1400ZB specific
        key: ['pump_protection'],
        convertSet: async (entity, key, value, meta) => {
            if (value.toLowerCase() == 'on') {
                await entity.write('manuSpecificSinope', {pumpProtection: 1});
            } else if (value.toLowerCase() == 'off') {
                await entity.write('manuSpecificSinope', {pumpProtection: 255});
            }
            return {readAfterWriteTime: 250, state: {pump_protection: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['pumpProtection']);
        },
    },
    led_intensity_on: {
        // DM25x0ZB and SW2500ZB
        key: ['led_intensity_on'],
        convertSet: async (entity, key, value, meta) => {
            if (value >= 0 && value <= 100) {
                await entity.write('manuSpecificSinope', {ledIntensityOn: value});
            }
            return {state: {led_intensity_on: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['ledIntensityOn']);
        },
    },
    led_intensity_off: {
        // DM25x0ZB and SW2500ZB
        key: ['led_intensity_off'],
        convertSet: async (entity, key, value, meta) => {
            if (value >= 0 && value <= 100) {
                await entity.write('manuSpecificSinope', {ledIntensityOff: value});
            }
            return {state: {led_intensity_off: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['ledIntensityOff']);
        },
    },
    led_color_on: {
        // DM25x0ZB and SW2500ZB
        key: ['led_color_on'],
        convertSet: async (entity, key, value, meta) => {
            const r = (value.r >= 0 && value.r <= 255) ? value.r : 0;
            const g = (value.g >= 0 && value.g <= 255) ? value.g : 0;
            const b = (value.b >= 0 && value.b <= 255) ? value.b : 0;

            const valueHex = r + g * 256 + (b * 256 ** 2);
            await entity.write('manuSpecificSinope', {ledColorOn: valueHex});
        },
    },
    led_color_off: {
        // DM25x0ZB and SW2500ZB
        key: ['led_color_off'],
        convertSet: async (entity, key, value, meta) => {
            const r = (value.r >= 0 && value.r <= 255) ? value.r : 0;
            const g = (value.g >= 0 && value.g <= 255) ? value.g : 0;
            const b = (value.b >= 0 && value.b <= 255) ? value.b : 0;

            const valueHex = r + g * 256 + b * 256 ** 2;
            await entity.write('manuSpecificSinope', {ledColorOff: valueHex});
        },
    },
    minimum_brightness: {
        // DM25x0ZB
        key: ['minimum_brightness'],
        convertSet: async (entity, key, value, meta) => {
            if (value >= 0 && value <= 3000) {
                await entity.write('manuSpecificSinope', {minimumBrightness: value});
            }
            return {readAfterWriteTime: 250, state: {minimumBrightness: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['minimumBrightness']);
        },
    },
    timer_seconds: {
        // DM25x0ZB and SW2500ZB
        key: ['timer_seconds'],
        convertSet: async (entity, key, value, meta) => {
//            if (value >= 0 && value <= 10800) {
                await entity.write('manuSpecificSinope', {dimmerTimmer: value});
//            }
            return {state: {timer_seconds: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['dimmerTimmer']);
        },
    },
    keypad_lockout: {
        // SW2500ZB
        key: ['keypad_lockout'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'unlock': 0, 'lock': 1};
            await entity.write('manuSpecificSinope', {keypadLockout: lookup[value]});
            return {state: {keypad_lockout: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificSinope', ['keypadLockout']);
        },
    },
};
module.exports = [
    {
        zigbeeModel: ['TH1123ZB'],
        model: 'TH1123ZB',
        vendor: 'Sinopé',
        description: 'Zigbee line volt thermostat',
        fromZigbee: [fzLocal.thermostat, fzLocal.sinope, fz.legacy.hvac_user_interface,
            fz.electrical_measurement, fz.metering, fz.ignore_temperature_report],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tzLocal.backlight_autodim,
            tzLocal.thermostat_time, tzLocal.time_format, tzLocal.enable_outdoor_temperature, tzLocal.second_display_mode,
            tzLocal.thermostat_outdoor_temperature, tzLocal.outdoor_temperature_timeout, tzLocal.thermostat_occupancy,
            tzLocal.main_cycle_output, tz.electrical_measurement_power],
        exposes: [
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withSetpoint('unoccupied_heating_setpoint', 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(['off', 'heat'], ea.ALL, 'Mode of the thermostat')
                .withPiHeatingDemand()
                .withRunningState(['idle', 'heat'], ea.STATE),
            exposes.enum('thermostat_occupancy', ea.ALL, ['unoccupied', 'occupied'])
                .withDescription('Occupancy state of the thermostat'),
            exposes.enum('second_display_mode', ea.ALL, ['auto', 'setpoint', 'outdoor temp'])
                .withDescription('Displays the outdoor temperature and then returns to the set point in "auto" mode, or clears ' +
                    'in "outdoor temp" mode when expired.'),
            exposes.numeric('thermostat_outdoor_temperature', ea.ALL).withUnit('°C').withValueMin(-99.5).withValueMax(99.5).withValueStep(0.5)
                .withDescription('Outdoor temperature for the secondary display'),
            exposes.numeric('outdoor_temperature_timeout', ea.ALL).withUnit('Seconds').withValueMin(30).withValueMax(64800)
                .withPreset('15 min', 900).withPreset('30 min', 1800).withPreset('1 hour', 3600)
                .withDescription('Time in seconds after which the outdoor temperature is considered to have expired'),
            exposes.binary('enable_outdoor_temperature', ea.ALL, 'ON', 'OFF')
                .withDescription('DEPRECATED: Use second_display_mode or control via outdoor_temperature_timeout'),
            exposes.enum('temperature_display_mode', ea.ALL, ['celsius', 'fahrenheit'])
                .withDescription('The temperature format displayed on the thermostat screen'),
            exposes.enum('time_format', ea.ALL, ['24h', '12h'])
                .withDescription('The time format featured on the thermostat display'),
            exposes.enum('backlight_auto_dim', ea.ALL, ['on_demand', 'sensing'])
                .withDescription('Control backlight dimming behavior'),
            exposes.enum('keypad_lockout', ea.ALL, ['unlock', 'lock1'])
                .withDescription('Enables or disables the device’s buttons'),
            exposes.enum('main_cycle_output', ea.ALL, ['15_sec', '15_min'])
                .withDescription('The length of the control cycle: 15_sec=normal 15_min=fan'),
            e.power().withAccess(ea.STATE_GET), e.current(), e.voltage(), e.energy(),
        ],

        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg',
                'msTemperatureMeasurement', 'haElectricalMeasurement', 'seMetering',
                'manuSpecificSinope'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);

            await reporting.temperature(endpoint, {min: 1, max: 0xFFFF}); // Disable default reporting
            await endpoint.configureReporting('msTemperatureMeasurement', [{
                attribute: 'tolerance', minimumReportInterval: 1, maximumReportInterval: 0xFFFF, reportableChange: 1}]);
            try {
                await reporting.thermostatSystemMode(endpoint);
            } catch (error) {/* Not all support this */}

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 303, change: [1, 1]});
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            try {
                await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
                await reporting.activePower(endpoint, {min: 10, max: 305, change: 1}); // divider 1: 1W
            } catch (error) {
                endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {'acPowerMultiplier': 1, 'acPowerDivisor': 1});
            }
            await reporting.rmsCurrent(endpoint, {min: 10, max: 306, change: 100}); // divider 1000: 0.1Arms
            await reporting.rmsVoltage(endpoint, {min: 10, max: 307, change: 5}); // divider 10: 0.5Vrms
        },
    },
    {
        zigbeeModel: ['TH1124ZB'],
        model: 'TH1124ZB',
        vendor: 'Sinopé',
        description: 'Zigbee line volt thermostat',
        fromZigbee: [fzLocal.thermostat, fzLocal.sinope, fz.legacy.hvac_user_interface,
            fz.electrical_measurement, fz.metering, fz.ignore_temperature_report],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tzLocal.backlight_autodim,
            tzLocal.thermostat_time, tzLocal.time_format, tzLocal.enable_outdoor_temperature, tzLocal.second_display_mode,
            tzLocal.thermostat_outdoor_temperature, tzLocal.outdoor_temperature_timeout, tzLocal.thermostat_occupancy,
            tzLocal.main_cycle_output, tz.electrical_measurement_power],
        exposes: [
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withSetpoint('unoccupied_heating_setpoint', 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(['off', 'heat'], ea.ALL, 'Mode of the thermostat')
                .withPiHeatingDemand()
                .withRunningState(['idle', 'heat'], ea.STATE),
            exposes.enum('thermostat_occupancy', ea.ALL, ['unoccupied', 'occupied'])
                .withDescription('Occupancy state of the thermostat'),
            exposes.enum('second_display_mode', ea.ALL, ['auto', 'setpoint', 'outdoor temp'])
                .withDescription('Displays the outdoor temperature and then returns to the set point in "auto" mode, or clears ' +
                    'in "outdoor temp" mode when expired.'),
            exposes.numeric('thermostat_outdoor_temperature', ea.ALL).withUnit('°C').withValueMin(-99.5).withValueMax(99.5).withValueStep(0.5)
                .withDescription('Outdoor temperature for the secondary display'),
            exposes.numeric('outdoor_temperature_timeout', ea.ALL).withUnit('Seconds').withValueMin(30).withValueMax(64800)
                .withPreset('15 min', 900).withPreset('30 min', 1800).withPreset('1 hour', 3600)
                .withDescription('Time in seconds after which the outdoor temperature is considered to have expired'),
            exposes.binary('enable_outdoor_temperature', ea.ALL, 'ON', 'OFF')
                .withDescription('DEPRECATED: Use second_display_mode or control via outdoor_temperature_timeout'),
            exposes.enum('temperature_display_mode', ea.ALL, ['celsius', 'fahrenheit'])
                .withDescription('The temperature format displayed on the thermostat screen'),
            exposes.enum('time_format', ea.ALL, ['24h', '12h'])
                .withDescription('The time format featured on the thermostat display'),
            exposes.enum('backlight_auto_dim', ea.ALL, ['on_demand', 'sensing'])
                .withDescription('Control backlight dimming behavior'),
            exposes.enum('keypad_lockout', ea.ALL, ['unlock', 'lock1'])
                .withDescription('Enables or disables the device’s buttons'),
            exposes.enum('main_cycle_output', ea.ALL, ['15_sec', '15_min'])
                .withDescription('The length of the control cycle: 15_sec=normal 15_min=fan'),
            e.power().withAccess(ea.STATE_GET), e.current(), e.voltage(), e.energy(),
        ],

        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg',
                'msTemperatureMeasurement', 'haElectricalMeasurement', 'seMetering',
                'manuSpecificSinope'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);

            await reporting.temperature(endpoint, {min: 1, max: 0xFFFF}); // Disable default reporting
            await endpoint.configureReporting('msTemperatureMeasurement', [{
                attribute: 'tolerance', minimumReportInterval: 1, maximumReportInterval: 0xFFFF, reportableChange: 1}]);
            try {
                await reporting.thermostatSystemMode(endpoint);
            } catch (error) {/* Not all support this */}

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 303, change: [1, 1]});
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            try {
                await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
                await reporting.activePower(endpoint, {min: 10, max: 305, change: 1}); // divider 1: 1W
            } catch (error) {
                endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {'acPowerMultiplier': 1, 'acPowerDivisor': 1});
            }
            await reporting.rmsCurrent(endpoint, {min: 10, max: 306, change: 100}); // divider 1000: 0.1Arms
            await reporting.rmsVoltage(endpoint, {min: 10, max: 307, change: 5}); // divider 10: 0.5Vrms
        },
    },
    {
        zigbeeModel: ['TH1123ZB-G2'],
        model: 'TH1123ZB-G2',
        vendor: 'Sinopé',
        description: 'Zigbee line volt thermostat',
        fromZigbee: [fzLocal.thermostat, fzLocal.sinope, fz.legacy.hvac_user_interface,
            fz.electrical_measurement, fz.metering, fz.ignore_temperature_report],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tzLocal.backlight_autodim,
            tzLocal.thermostat_time, tzLocal.time_format, tzLocal.enable_outdoor_temperature, tzLocal.second_display_mode,
            tzLocal.thermostat_outdoor_temperature, tzLocal.outdoor_temperature_timeout, tzLocal.thermostat_occupancy,
            tzLocal.main_cycle_output, tz.electrical_measurement_power],
        exposes: [
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withSetpoint('unoccupied_heating_setpoint', 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(['off', 'heat'], ea.ALL, 'Mode of the thermostat')
                .withPiHeatingDemand()
                .withRunningState(['idle', 'heat'], ea.STATE),
            exposes.enum('thermostat_occupancy', ea.ALL, ['unoccupied', 'occupied'])
                .withDescription('Occupancy state of the thermostat'),
            exposes.enum('second_display_mode', ea.ALL, ['auto', 'setpoint', 'outdoor temp'])
                .withDescription('Displays the outdoor temperature and then returns to the set point in "auto" mode, or clears ' +
                    'in "outdoor temp" mode when expired.'),
            exposes.numeric('thermostat_outdoor_temperature', ea.ALL).withUnit('°C').withValueMin(-99.5).withValueMax(99.5).withValueStep(0.5)
                .withDescription('Outdoor temperature for the secondary display'),
            exposes.numeric('outdoor_temperature_timeout', ea.ALL).withUnit('Seconds').withValueMin(30).withValueMax(64800)
                .withPreset('15 min', 900).withPreset('30 min', 1800).withPreset('1 hour', 3600)
                .withDescription('Time in seconds after which the outdoor temperature is considered to have expired'),
            exposes.binary('enable_outdoor_temperature', ea.ALL, 'ON', 'OFF')
                .withDescription('DEPRECATED: Use second_display_mode or control via outdoor_temperature_timeout'),
            exposes.enum('temperature_display_mode', ea.ALL, ['celsius', 'fahrenheit'])
                .withDescription('The temperature format displayed on the thermostat screen'),
            exposes.enum('time_format', ea.ALL, ['24h', '12h'])
                .withDescription('The time format featured on the thermostat display'),
            exposes.enum('backlight_auto_dim', ea.ALL, ['on_demand', 'sensing'])
                .withDescription('Control backlight dimming behavior'),
            exposes.enum('keypad_lockout', ea.ALL, ['unlock', 'lock1'])
                .withDescription('Enables or disables the device’s buttons'),
            exposes.enum('main_cycle_output', ea.ALL, ['15_sec', '15_min'])
                .withDescription('The length of the control cycle: 15_sec=normal 15_min=fan'),
            e.power().withAccess(ea.STATE_GET), e.current(), e.voltage(), e.energy(),
        ],

        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg',
                'msTemperatureMeasurement', 'haElectricalMeasurement', 'seMetering',
                'manuSpecificSinope'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds); // This G2 version has limited memory space
            const thermostatDate = new Date();
            const thermostatTimeSec = thermostatDate.getTime() / 1000;
            const thermostatTimezoneOffsetSec = thermostatDate.getTimezoneOffset() * 60;
            const currentTimeToDisplay = Math.round(thermostatTimeSec - thermostatTimezoneOffsetSec - 946684800);
            await endpoint.write('manuSpecificSinope', {currentTimeToDisplay}, manuSinope);
            await endpoint.write('manuSpecificSinope', {'secondScreenBehavior': 0}, manuSinope); // Mode auto

            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);

            await reporting.temperature(endpoint, {min: 1, max: 0xFFFF}); // Disable default reporting
            await endpoint.configureReporting('msTemperatureMeasurement', [{
                attribute: 'tolerance', minimumReportInterval: 1, maximumReportInterval: 0xFFFF, reportableChange: 1}]);

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 303, change: [1, 1]});
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint, {min: 10, max: 305, change: 1}); // divider 1: 1W
            await reporting.rmsCurrent(endpoint, {min: 10, max: 306, change: 100}); // divider 1000: 0.1Arms
            await reporting.rmsVoltage(endpoint, {min: 10, max: 307, change: 5}); // divider 10: 0.5Vrms

            // Disable default reporting (not used by Sinope)
            await reporting.thermostatRunningState(endpoint, {min: 1, max: 0xFFFF});
            try {
                await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            } catch (error) {/* Do nothing */}
        },
    },
    {
        zigbeeModel: ['TH1124ZB-G2'],
        model: 'TH1124ZB-G2',
        vendor: 'Sinopé',
        description: 'Zigbee line volt thermostat',
        fromZigbee: [fzLocal.thermostat, fzLocal.sinope, fz.legacy.hvac_user_interface,
            fz.electrical_measurement, fz.metering, fz.ignore_temperature_report],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tzLocal.backlight_autodim,
            tzLocal.thermostat_time, tzLocal.time_format, tzLocal.enable_outdoor_temperature, tzLocal.second_display_mode,
            tzLocal.thermostat_outdoor_temperature, tzLocal.outdoor_temperature_timeout, tzLocal.thermostat_occupancy,
            tzLocal.main_cycle_output, tz.electrical_measurement_power],
        exposes: [
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withSetpoint('unoccupied_heating_setpoint', 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(['off', 'heat'], ea.ALL, 'Mode of the thermostat')
                .withPiHeatingDemand()
                .withRunningState(['idle', 'heat'], ea.STATE),
            exposes.enum('thermostat_occupancy', ea.ALL, ['unoccupied', 'occupied'])
                .withDescription('Occupancy state of the thermostat'),
            exposes.enum('second_display_mode', ea.ALL, ['auto', 'setpoint', 'outdoor temp'])
                .withDescription('Displays the outdoor temperature and then returns to the set point in "auto" mode, or clears ' +
                    'in "outdoor temp" mode when expired.'),
            exposes.numeric('thermostat_outdoor_temperature', ea.ALL).withUnit('°C').withValueMin(-99.5).withValueMax(99.5).withValueStep(0.5)
                .withDescription('Outdoor temperature for the secondary display'),
            exposes.numeric('outdoor_temperature_timeout', ea.ALL).withUnit('Seconds').withValueMin(30).withValueMax(64800)
                .withPreset('15 min', 900).withPreset('30 min', 1800).withPreset('1 hour', 3600)
                .withDescription('Time in seconds after which the outdoor temperature is considered to have expired'),
            exposes.binary('enable_outdoor_temperature', ea.ALL, 'ON', 'OFF')
                .withDescription('DEPRECATED: Use second_display_mode or control via outdoor_temperature_timeout'),
            exposes.enum('temperature_display_mode', ea.ALL, ['celsius', 'fahrenheit'])
                .withDescription('The temperature format displayed on the thermostat screen'),
            exposes.enum('time_format', ea.ALL, ['24h', '12h'])
                .withDescription('The time format featured on the thermostat display'),
            exposes.enum('backlight_auto_dim', ea.ALL, ['on_demand', 'sensing'])
                .withDescription('Control backlight dimming behavior'),
            exposes.enum('keypad_lockout', ea.ALL, ['unlock', 'lock1'])
                .withDescription('Enables or disables the device’s buttons'),
            exposes.enum('main_cycle_output', ea.ALL, ['15_sec', '15_min'])
                .withDescription('The length of the control cycle: 15_sec=normal 15_min=fan'),
            e.power().withAccess(ea.STATE_GET), e.current(), e.voltage(), e.energy(),
        ],

        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg',
                'msTemperatureMeasurement', 'haElectricalMeasurement', 'seMetering',
                'manuSpecificSinope'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds); // This G2 version has limited memory space
            const thermostatDate = new Date();
            const thermostatTimeSec = thermostatDate.getTime() / 1000;
            const thermostatTimezoneOffsetSec = thermostatDate.getTimezoneOffset() * 60;
            const currentTimeToDisplay = Math.round(thermostatTimeSec - thermostatTimezoneOffsetSec - 946684800);
            await endpoint.write('manuSpecificSinope', {currentTimeToDisplay}, manuSinope);
            await endpoint.write('manuSpecificSinope', {'secondScreenBehavior': 0}, manuSinope); // Mode auto

            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);

            await reporting.temperature(endpoint, {min: 1, max: 0xFFFF}); // Disable default reporting
            await endpoint.configureReporting('msTemperatureMeasurement', [{
                attribute: 'tolerance', minimumReportInterval: 1, maximumReportInterval: 0xFFFF, reportableChange: 1}]);

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 303, change: [1, 1]});
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint, {min: 10, max: 305, change: 1}); // divider 1: 1W
            await reporting.rmsCurrent(endpoint, {min: 10, max: 306, change: 100}); // divider 1000: 0.1Arms
            await reporting.rmsVoltage(endpoint, {min: 10, max: 307, change: 5}); // divider 10: 0.5Vrms

            // Disable default reporting (not used by Sinope)
            await reporting.thermostatRunningState(endpoint, {min: 1, max: 0xFFFF});
            try {
                await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            } catch (error) {/* Do nothing */}
        },
    },
    {
        zigbeeModel: ['TH1300ZB'],
        model: 'TH1300ZB',
        vendor: 'Sinopé',
        description: 'Zigbee smart floor heating thermostat',
        fromZigbee: [fzLocal.thermostat, fzLocal.sinope, fz.legacy.hvac_user_interface,
            fz.electrical_measurement, fz.metering, fz.ignore_temperature_report],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tzLocal.backlight_autodim,
            tzLocal.thermostat_time, tzLocal.time_format, tzLocal.enable_outdoor_temperature, tzLocal.second_display_mode,
            tzLocal.thermostat_outdoor_temperature, tzLocal.outdoor_temperature_timeout, tzLocal.thermostat_occupancy,
            tzLocal.floor_control_mode, tzLocal.ambiant_max_heat_setpoint, tzLocal.floor_min_heat_setpoint,
            tzLocal.floor_max_heat_setpoint, tzLocal.temperature_sensor, tz.electrical_measurement_power],
        exposes: [
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 5, 36, 0.5)
                .withSetpoint('unoccupied_heating_setpoint', 5, 36, 0.5)
                .withLocalTemperature()
                .withSystemMode(['off', 'heat'], ea.ALL, 'Mode of the thermostat')
                .withPiHeatingDemand()
                .withRunningState(['idle', 'heat'], ea.STATE),
            exposes.enum('thermostat_occupancy', ea.ALL, ['unoccupied', 'occupied'])
                .withDescription('Occupancy state of the thermostat'),
            exposes.enum('second_display_mode', ea.ALL, ['auto', 'setpoint', 'outdoor temp'])
                .withDescription('Displays the outdoor temperature and then returns to the set point in "auto" mode, or clears ' +
                    'in "outdoor temp" mode when expired.'),
            exposes.numeric('thermostat_outdoor_temperature', ea.ALL).withUnit('°C').withValueMin(-99.5).withValueMax(99.5).withValueStep(0.5)
                .withDescription('Outdoor temperature for the secondary display'),
            exposes.numeric('outdoor_temperature_timeout', ea.ALL).withUnit('Seconds').withValueMin(30).withValueMax(64800)
                .withPreset('15 min', 900).withPreset('30 min', 1800).withPreset('1 hour', 3600)
                .withDescription('Time in seconds after which the outdoor temperature is considered to have expired'),
            exposes.binary('enable_outdoor_temperature', ea.ALL, 'ON', 'OFF')
                .withDescription('DEPRECATED: Use second_display_mode or control via outdoor_temperature_timeout'),
            exposes.enum('temperature_display_mode', ea.ALL, ['celsius', 'fahrenheit'])
                .withDescription('The temperature format displayed on the thermostat screen'),
            exposes.enum('time_format', ea.ALL, ['24h', '12h'])
                .withDescription('The time format featured on the thermostat display'),
            exposes.enum('backlight_auto_dim', ea.ALL, ['on_demand', 'sensing'])
                .withDescription('Control backlight dimming behavior'),
            exposes.enum('keypad_lockout', ea.ALL, ['unlock', 'lock1'])
                .withDescription('Enables or disables the device’s buttons'),
            e.power().withAccess(ea.STATE_GET), e.current(), e.voltage(), e.energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg',
                'haElectricalMeasurement', 'msTemperatureMeasurement', 'seMetering', 'manuSpecificSinope'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            try {
                await reporting.readMeteringMultiplierDivisor(endpoint);
            } catch (error) {/* Do nothing*/}
            try {
                await reporting.currentSummDelivered(endpoint, {min: 10, max: 303, change: [1, 1]});
            } catch (error) {/* Do nothing*/}
            try {
                await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
                await reporting.activePower(endpoint, {min: 10, max: 305, change: 1}); // divider 1: 1W
            } catch (error) {
                endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {'acPowerMultiplier': 1, 'acPowerDivisor': 1});
            }
            try {
                await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
                await reporting.rmsCurrent(endpoint, {min: 10, max: 306, change: 100}); // divider 1000: 0.1Arms
            } catch (error) {/* Do nothing*/}
            try {
                await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor']);
                await reporting.rmsVoltage(endpoint, {min: 10, max: 307, change: 5}); // divider 10: 0.5Vrms
            } catch (error) {/* Do nothing*/}

            try {
                await reporting.thermostatKeypadLockMode(endpoint);
            } catch (error) {
                // Not all support this: https://github.com/Koenkk/zigbee2mqtt/issues/3760
            }

            await endpoint.configureReporting('manuSpecificSinope', [{attribute: 'GFCiStatus', minimumReportInterval: 1,
                maximumReportInterval: constants.repInterval.HOUR, reportableChange: 1}]);
            await endpoint.configureReporting('manuSpecificSinope', [{attribute: 'floorLimitStatus', minimumReportInterval: 1,
                maximumReportInterval: constants.repInterval.HOUR, reportableChange: 1}]);
            await reporting.temperature(endpoint, {min: 1, max: 0xFFFF}); // disable reporting
        },
    },
    {
        zigbeeModel: ['TH1400ZB'],
        model: 'TH1400ZB',
        vendor: 'Sinopé',
        description: 'Zigbee low volt thermostat',
        fromZigbee: [fzLocal.thermostat, fzLocal.sinope, fz.legacy.hvac_user_interface,
            fz.electrical_measurement, fz.metering, fz.ignore_temperature_report],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tzLocal.backlight_autodim,
            tzLocal.thermostat_time, tzLocal.time_format, tzLocal.enable_outdoor_temperature, tzLocal.second_display_mode,
            tzLocal.thermostat_outdoor_temperature, tzLocal.outdoor_temperature_timeout, tzLocal.thermostat_occupancy,
            tzLocal.floor_control_mode, tzLocal.ambiant_max_heat_setpoint, tzLocal.floor_min_heat_setpoint,
            tzLocal.floor_max_heat_setpoint, tzLocal.temperature_sensor, tz.thermostat_min_heat_setpoint_limit,
            tz.thermostat_max_heat_setpoint_limit, tzLocal.connected_load, tzLocal.aux_connected_load, tzLocal.main_cycle_output,
            tzLocal.aux_cycle_output, tzLocal.pump_protection],
        exposes: [
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 5, 36, 0.5)
                .withSetpoint('unoccupied_heating_setpoint', 5, 36, 0.5)
                .withLocalTemperature()
                .withSystemMode(['off', 'heat'])
                .withPiHeatingDemand()
                .withRunningState(['idle', 'heat'], ea.STATE),
            e.max_heat_setpoint_limit(5, 36, 0.5),
            e.min_heat_setpoint_limit(5, 36, 0.5),
            exposes.enum('thermostat_occupancy', ea.ALL, ['unoccupied', 'occupied'])
                .withDescription('Occupancy state of the thermostat'),
            exposes.enum('second_display_mode', ea.ALL, ['auto', 'setpoint', 'outdoor temp'])
                .withDescription('Displays the outdoor temperature and then returns to the set point in "auto" mode, or clears ' +
                    'in "outdoor temp" mode when expired.'),
            exposes.numeric('thermostat_outdoor_temperature', ea.ALL).withUnit('°C').withValueMin(-99.5).withValueMax(99.5).withValueStep(0.5)
                .withDescription('Outdoor temperature for the secondary display'),
            exposes.numeric('outdoor_temperature_timeout', ea.ALL).withUnit('Seconds').withValueMin(30).withValueMax(64800)
                .withPreset('15 min', 900).withPreset('30 min', 1800).withPreset('1 hour', 3600)
                .withDescription('Time in seconds after which the outdoor temperature is considered to have expired'),
            exposes.binary('enable_outdoor_temperature', ea.ALL, 'ON', 'OFF')
                .withDescription('DEPRECATED: Use second_display_mode or control via outdoor_temperature_timeout'),
            exposes.enum('temperature_display_mode', ea.ALL, ['celsius', 'fahrenheit'])
                .withDescription('The temperature format displayed on the thermostat screen'),
            exposes.enum('time_format', ea.ALL, ['24h', '12h'])
                .withDescription('The time format featured on the thermostat display'),
            exposes.enum('backlight_auto_dim', ea.ALL, ['on_demand', 'sensing'])
                .withDescription('The display backlight behavior'),
            exposes.enum('keypad_lockout', ea.ALL, ['unlock', 'lock1'])
                .withDescription('Enables or disables the device’s buttons'),
            exposes.numeric('connected_load', ea.ALL)
                .withUnit('W').withValueMin(1).withValueMax(20000)
                .withDescription('The power in watts of the electrical load connected to the device'),
            exposes.enum('floor_control_mode', ea.ALL, ['ambiant', 'floor'])
                .withDescription('Control mode using floor or ambient temperature'),
            exposes.numeric('floor_max_heat_setpoint', ea.ALL)
                .withUnit('°C').withValueMin(7).withValueMax(36).withValueStep(0.5)
                .withPreset('off', 'off', 'Use minimum permitted value')
                .withDescription('The maximum floor temperature limit of the floor when in ambient control mode'),
            exposes.numeric('floor_min_heat_setpoint', ea.ALL)
                .withUnit('°C').withValueMin(5).withValueMax(34).withValueStep(0.5)
                .withPreset('off', 'off', 'Use minimum permitted value')
                .withDescription('The minimum floor temperature limit of the floor when in ambient control mode'),
            exposes.numeric('ambiant_max_heat_setpoint', ea.ALL)
                .withUnit('°C').withValueMin(5).withValueMax(36).withValueStep(0.5)
                .withPreset('off', 'off', 'Use minimum permitted value')
                .withDescription('The maximum ambient temperature limit when in floor control mode'),
            exposes.enum('floor_temperature_sensor', ea.ALL, ['10k', '12k'])
                .withDescription('The floor sensor'),
            exposes.enum('main_cycle_output', ea.ALL, ['15_sec', '5_min', '10_min', '15_min', '20_min', '30_min'])
                .withDescription('The length of the control cycle according to the type of load connected to the thermostats'),
            exposes.enum('aux_cycle_output', ea.ALL, ['off', '15_sec', '5_min', '10_min', '15_min', '20_min', '30_min'])
                .withDescription('The length of the control cycle according to the type of auxiliary load connected to the thermostats'),
            exposes.binary('pump_protection', ea.ALL, 'ON', 'OFF')
                .withDescription('This function prevents the seizure of the pump'),
            exposes.numeric('aux_connected_load', ea.ALL)
                .withUnit('W').withValueMin(0).withValueMax(20000)
                .withDescription('The power in watts of the heater connected to the auxiliary output of the thermostat'),
        ],

        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'genGroups', 'hvacThermostat',
                'hvacUserInterfaceCfg', 'msTemperatureMeasurement', 'manuSpecificSinope'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);

            try {
                await reporting.thermostatSystemMode(endpoint);
            } catch (error) {/* Not all support this */}

            await endpoint.read('hvacThermostat', ['occupiedHeatingSetpoint', 'localTemp', 'systemMode', 'pIHeatingDemand',
                'SinopeBacklight', 'maxHeatSetpointLimit', 'minHeatSetpointLimit', 'SinopeMainCycleOutput', 'SinopeAuxCycleOutput']);
            await endpoint.read('hvacUserInterfaceCfg', ['keypadLockout', 'tempDisplayMode']);
            await endpoint.read('manuSpecificSinope', ['timeFormatToDisplay', 'connectedLoad', 'auxConnectedLoad', 'floorControlMode',
                'floorMinHeatSetpointLimit', 'floorMaxHeatSetpointLimit', 'ambiantMaxHeatSetpointLimit', 'outdoorTempToDisplayTimeout',
                'temperatureSensor', 'pumpProtection']);

            await reporting.temperature(endpoint, {min: 1, max: 0xFFFF}); // disable reporting
        },
    },
    {
        zigbeeModel: ['TH1500ZB'],
        model: 'TH1500ZB',
        vendor: 'Sinopé',
        description: 'Zigbee dual pole line volt thermostat',
        fromZigbee: [fzLocal.thermostat, fzLocal.sinope, fz.legacy.hvac_user_interface,
            fz.electrical_measurement, fz.metering, fz.ignore_temperature_report],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tzLocal.backlight_autodim,
            tzLocal.thermostat_time, tzLocal.time_format, tzLocal.enable_outdoor_temperature, tzLocal.second_display_mode,
            tzLocal.thermostat_outdoor_temperature, tzLocal.outdoor_temperature_timeout, tzLocal.thermostat_occupancy],
        exposes: [
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withSetpoint('unoccupied_heating_setpoint', 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(['off', 'heat'], ea.ALL, 'Mode of the thermostat')
                .withPiHeatingDemand()
                .withRunningState(['idle', 'heat'], ea.STATE),
            exposes.enum('thermostat_occupancy', ea.ALL, ['unoccupied', 'occupied'])
                .withDescription('Occupancy state of the thermostat'),
            exposes.enum('second_display_mode', ea.ALL, ['auto', 'setpoint', 'outdoor temp'])
                .withDescription('Displays the outdoor temperature and then returns to the set point in "auto" mode, or clears ' +
                    'in "outdoor temp" mode when expired.'),
            exposes.numeric('thermostat_outdoor_temperature', ea.ALL).withUnit('°C').withValueMin(-99.5).withValueMax(99.5).withValueStep(0.5)
                .withDescription('Outdoor temperature for the secondary display'),
            exposes.numeric('outdoor_temperature_timeout', ea.ALL).withUnit('Seconds').withValueMin(30).withValueMax(64800)
                .withPreset('15 min', 900).withPreset('30 min', 1800).withPreset('1 hour', 3600)
                .withDescription('Time in seconds after which the outdoor temperature is considered to have expired'),
            exposes.binary('enable_outdoor_temperature', ea.ALL, 'ON', 'OFF')
                .withDescription('DEPRECATED: Use second_display_mode or control via outdoor_temperature_timeout'),
            exposes.enum('temperature_display_mode', ea.ALL, ['celsius', 'fahrenheit'])
                .withDescription('The temperature format displayed on the thermostat screen'),
            exposes.enum('time_format', ea.ALL, ['24h', '12h'])
                .withDescription('The time format featured on the thermostat display'),
            exposes.enum('backlight_auto_dim', ea.ALL, ['on_demand', 'sensing'])
                .withDescription('Control backlight dimming behavior'),
            exposes.enum('keypad_lockout', ea.ALL, ['unlock', 'lock1'])
                .withDescription('Enables or disables the device’s buttons'),
        ],

        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'genGroups',
                'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['SW2500ZB'],
        model: 'SW2500ZB',
        vendor: 'Sinopé',
        description: 'Zigbee smart light switch',
        fromZigbee: [fz.on_off, fzLocal.sinope, fz.metering],
        toZigbee: [tz.on_off, tzLocal.timer_seconds, tzLocal.led_intensity_on, tzLocal.led_intensity_off,
            tzLocal.led_color_on, tzLocal.led_color_off, tzLocal.keypad_lockout, tzLocal.connected_load],
        exposes: [e.switch(),
            e.action(['up_single', 'up_double', 'up_hold', 'down_single', 'down_double', 'down_hold']),
            exposes.numeric('timer_seconds', ea.ALL).withUnit('seconds').withValueMin(0).withValueMax(65535)
                .withPreset('Disabled',0).withDescription('Automatically turn off load after x seconds'),
            exposes.numeric('led_intensity_on', ea.ALL).withUnit('%').withValueMin(0).withValueMax(100)
                .withDescription('Control status LED intensity when load ON'),
            exposes.numeric('led_intensity_off', ea.ALL).withUnit('%').withValueMin(0).withValueMax(100)
                .withDescription('Control status LED intensity when load OFF'),
            exposes.composite('led_color_on', 'led_color_on', ea.SET)
                .withFeature(exposes.numeric('r', ea.SET))
                .withFeature(exposes.numeric('g', ea.SET))
                .withFeature(exposes.numeric('b', ea.SET))
                .withDescription('Control status LED color when load ON'),
            exposes.composite('led_color_off', 'led_color_off', ea.SET)
                .withFeature(exposes.numeric('r', ea.SET))
                .withFeature(exposes.numeric('g', ea.SET))
                .withFeature(exposes.numeric('b', ea.SET))
                .withDescription('Control status LED color when load OFF'),
            exposes.enum('keypad_lockout', ea.ALL, ['unlock', 'lock'])
                .withDescription('Enables or disables the device’s buttons'),
            exposes.numeric('connected_load', ea.ALL)
                .withUnit('W').withValueMin(0).withValueMax(1800)
                .withDescription('Load connected in watt'),
            e.energy(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genOnOff', 'manuSpecificSinope', 'seMetering'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.onOff(endpoint);
            try {
                await reporting.readMeteringMultiplierDivisor(endpoint);
                await reporting.currentSummDelivered(endpoint, {min: 10, max: 300, change: [0, 10]});
            } catch (error) {/* Do nothing*/}
            const payload = [{
                attribute: 'actionReport',
                minimumReportInterval: 0,
                maximumReportInterval: 0,
                reportableChange: 0,
            }];
            await endpoint.configureReporting('manuSpecificSinope', payload);
        },
    },
    {
        zigbeeModel: ['DM2500ZB'],
        model: 'DM2500ZB',
        vendor: 'Sinopé',
        description: 'Zigbee smart dimmer',
        fromZigbee: [fz.on_off, fz.brightness, fz.electrical_measurement, fzLocal.sinope],
        toZigbee: [tz.light_onoff_brightness, tzLocal.timer_seconds, tzLocal.led_intensity_on, tzLocal.led_intensity_off,
            tzLocal.minimum_brightness, tzLocal.led_color_on, tzLocal.led_color_off],
        exposes: [e.light_brightness(),
            exposes.numeric('timer_seconds', ea.ALL).withUnit('seconds').withValueMin(0).withValueMax(65535)
                .withPreset('Disabled',0).withDescription('Automatically turn off load after x seconds'),
            exposes.numeric('led_intensity_on', ea.ALL).withUnit('%').withValueMin(0).withValueMax(100)
                .withDescription('Control status LED intensity when load ON'),
            exposes.numeric('led_intensity_off', ea.ALL).withUnit('%').withValueMin(0).withValueMax(100)
                .withDescription('Control status LED when load OFF'),
            exposes.numeric('minimum_brightness', ea.ALL).withValueMin(0).withValueMax(3000)
                .withDescription('Control minimum dimmer brightness'),
            exposes.composite('led_color_on', 'led_color_on', ea.SET)
                .withFeature(exposes.numeric('r', ea.SET))
                .withFeature(exposes.numeric('g', ea.SET))
                .withFeature(exposes.numeric('b', ea.SET))
                .withDescription('Control status LED color when load ON'),
            exposes.composite('led_color_off', 'led_color_off', ea.SET)
                .withFeature(exposes.numeric('r', ea.SET))
                .withFeature(exposes.numeric('g', ea.SET))
                .withFeature(exposes.numeric('b', ea.SET))
                .withDescription('Control status LED color when load OFF')],
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genLevelCtrl'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['DM2550ZB'],
        model: 'DM2550ZB',
        vendor: 'Sinopé',
        description: 'Zigbee Adaptive phase smart dimmer',
        fromZigbee: [fz.on_off, fz.brightness, fz.electrical_measurement, fzLocal.sinope],
        toZigbee: [tz.light_onoff_brightness, tzLocal.timer_seconds, tzLocal.led_intensity_on, tzLocal.led_intensity_off,
            tzLocal.minimum_brightness, tzLocal.led_color_on, tzLocal.led_color_off],
        exposes: [e.light_brightness(),
            exposes.numeric('timer_seconds', ea.ALL).withUnit('seconds').withValueMin(0).withValueMax(65535)
                .withPreset('Disabled',0).withDescription('Automatically turn off load after x seconds'),
            exposes.numeric('led_intensity_on', ea.ALL).withUnit('%').withValueMin(0).withValueMax(100)
                .withDescription('Control status LED intensity when load ON'),
            exposes.numeric('led_intensity_off', ea.ALL).withUnit('%').withValueMin(0).withValueMax(100)
                .withDescription('Control status LED when load OFF'),
            exposes.numeric('minimum_brightness', ea.ALL).withValueMin(0).withValueMax(3000)
                .withDescription('Control minimum dimmer brightness'),
            exposes.composite('led_color_on', 'led_color_on', ea.SET)
                .withFeature(exposes.numeric('r', ea.SET))
                .withFeature(exposes.numeric('g', ea.SET))
                .withFeature(exposes.numeric('b', ea.SET))
                .withDescription('Control status LED color when load ON'),
            exposes.composite('led_color_off', 'led_color_off', ea.SET)
                .withFeature(exposes.numeric('r', ea.SET))
                .withFeature(exposes.numeric('g', ea.SET))
                .withFeature(exposes.numeric('b', ea.SET))
                .withDescription('Control status LED color when load OFF')],
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genLevelCtrl'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['SP2600ZB'],
        model: 'SP2600ZB',
        vendor: 'Sinopé',
        description: 'Zigbee smart plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off, tz.frequency],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genOnOff', 'haElectricalMeasurement', 'seMetering'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.onOff(endpoint);
            await reporting.activePower(endpoint, {min: 10, max: 305, change: 1}); // divider 10 : 0.1W
            await reporting.rmsCurrent(endpoint, {min: 10, max: 306, change: 10}); // divider 100: 0.1Arms
            await reporting.rmsVoltage(endpoint, {min: 10, max: 307, change: 10}); // divider 100: 0.1Vrms
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 1000, multiplier: 1});
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 303, change: [0, 1]}); // divider 1
        },
    },
    {
        zigbeeModel: ['SP2610ZB'],
        model: 'SP2610ZB',
        vendor: 'Sinopé',
        description: 'Zigbee smart plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off, tz.frequency],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genOnOff', 'haElectricalMeasurement', 'seMetering'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.onOff(endpoint);
            await reporting.activePower(endpoint, {min: 10, max: 305, change: 1}); // divider 10 : 0.1W
            await reporting.rmsCurrent(endpoint, {min: 10, max: 306, change: 10}); // divider 100: 0.1Arms
            await reporting.rmsVoltage(endpoint, {min: 10, max: 307, change: 10}); // divider 100: 0.1Vrms
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 1000, multiplier: 1});
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 303, change: [0, 1]}); // divider 1
        },
    },
    {
        zigbeeModel: ['RM3250ZB'],
        model: 'RM3250ZB',
        vendor: 'Sinopé',
        description: '50A Smart electrical load controller',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genOnOff', 'haElectricalMeasurement', 'seMetering'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
    },
    {
        zigbeeModel: ['WL4200'],
        model: 'WL4200',
        vendor: 'Sinopé',
        description: 'Zigbee smart water leak detector',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.temperature, fz.battery],
        exposes: [e.water_leak(), e.battery_low(), e.temperature(), e.battery()],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genPowerCfg', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint, {min: 600, max: constants.repInterval.MAX, change: 100});
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryAlarmState(endpoint);
        },
    },
    {
        zigbeeModel: ['WL4200S'],
        model: 'WL4200S',
        vendor: 'Sinopé',
        description: 'Zigbee smart water leak detector with external sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.temperature(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genPowerCfg', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint, {min: 600, max: constants.repInterval.MAX, change: 100});
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryAlarmState(endpoint);
        },
    },
    {
        zigbeeModel: ['VA4200WZ'],
        model: 'VA4200WZ',
        vendor: 'Sinopé',
        description: 'Zigbee smart water valve (3/4")',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff, fz.battery],
        toZigbee: [tz.cover_via_brightness],
        exposes: [e.valve_switch(), e.valve_position(), e.battery_low(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genOnOff', 'genLevelCtrl', 'genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint); // valve position
        },
    },
    {
        zigbeeModel: ['VA4201WZ'],
        model: 'VA4201WZ',
        vendor: 'Sinopé',
        description: 'Zigbee smart water valve (1")',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff, fz.battery],
        toZigbee: [tz.cover_via_brightness],
        exposes: [e.valve_switch(), e.valve_position(), e.battery_low(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genOnOff', 'genLevelCtrl', 'genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint); // valve position
        },
    },
    {
        zigbeeModel: ['VA4220ZB'],
        model: 'VA4220ZB',
        vendor: 'Sinopé',
        description: 'Sedna smart water valve',
        fromZigbee: [fz.ignore_iaszone_statuschange, fz.cover_position_via_brightness, fz.cover_state_via_onoff,
            fz.battery, fz.metering],
        toZigbee: [tz.cover_via_brightness],
        meta: {battery: {voltageToPercentage: {min: 5400, max: 6800}}},
        exposes: [e.valve_switch(), e.valve_position(), e.battery_low(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genGroups', 'genOnOff', 'ssIasZone', 'genLevelCtrl',
                'genPowerCfg', 'seMetering', 'manuSpecificSinope'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint); // valve position
            try {
                await reporting.batteryVoltage(endpoint);
            } catch (error) {/* Do Nothing */}
            try {
                await reporting.batteryAlarmState(endpoint);
            } catch (error) {/* Do Nothing */}
        },
    },
    {
        zigbeeModel: ['RM3500ZB'],
        model: 'RM3500ZB',
        vendor: 'Sinopé',
        description: 'Calypso smart water heater controller',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fzLocal.ias_water_leak_alarm,
            fzLocal.sinope, fz.temperature],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.water_leak(), e.temperature()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genOnOff', 'haElectricalMeasurement', 'seMetering', 'msTemperatureMeasurement', 'ssIasZone',
                'manuSpecificSinope'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.onOff(endpoint);
            await reporting.temperature(endpoint, {min: 10, max: 301, change: 10}); // divider 100: 0.1C
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint, {min: 10, max: 305, change: 2}); // divider 1 : 2W
            await reporting.rmsCurrent(endpoint, {min: 10, max: 306, change: 10}); // divider 1000: 0.01Arms
            await reporting.rmsVoltage(endpoint, {min: 10, max: 307, change: 1}); // divider 1: 1Vrms
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 303, change: [10, 10]}); // divider 1000: 0,01kWh

            await endpoint.configureReporting('ssIasZone', [{attribute: 'zoneStatus', minimumReportInterval: 1,
                maximumReportInterval: constants.repInterval.HOUR, reportableChange: 1}]);
        },
    },
];
