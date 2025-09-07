# MQTT Broker Setup - Alternative to Docker

Since Docker is not available, here are alternative ways to run MQTT broker:

## Option 1: Use Public MQTT Brokers (for development)
- Eclipse Mosquitto Test Server: `test.mosquitto.org:1883`
- HiveMQ Public Broker: `broker.hivemq.com:1883`
- EMQX Public Broker: `broker.emqx.io:1883`

## Option 2: Install Mosquitto Directly on Windows

### Download and Install:
1. Download Mosquitto from: https://mosquitto.org/download/
2. Install the Windows version
3. Start the broker: `mosquitto -v`

### Configuration:
Use the mosquitto.conf file provided in this directory.

## Option 3: Use Online MQTT Brokers
- HiveMQ Cloud: Free tier available
- AWS IoT Core: For production use
- CloudMQTT: Simple cloud MQTT service

## For Development - Use Test Broker
Update your environment variables to use:
```
MQTT_BROKER_URL=mqtt://test.mosquitto.org:1883
```

This will allow immediate testing without local setup.
