import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import mqtt from 'mqtt';
import { MQTTMessage } from '../types';

interface MQTTContextType {
  client: mqtt.MqttClient | null;
  isConnected: boolean;
  publishMessage: (topic: string, payload: any) => void;
  subscribeToTopic: (topic: string, callback: (message: any) => void) => void;
  messages: MQTTMessage[];
}

const MQTTContext = createContext<MQTTContextType | undefined>(undefined);

export const useMQTT = () => {
  const context = useContext(MQTTContext);
  if (!context) {
    throw new Error('useMQTT must be used within an MQTTProvider');
  }
  return context;
};

interface MQTTProviderProps {
  children: ReactNode;
}

export const MQTTProvider: React.FC<MQTTProviderProps> = ({ children }) => {
  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<MQTTMessage[]>([]);

  useEffect(() => {
    // Connect to MQTT broker - use public broker for development
    const brokerUrl = import.meta.env.VITE_MQTT_BROKER || 'wss://test.mosquitto.org:8081';
    
    const mqttClient = mqtt.connect(brokerUrl, {
      clientId: `htvm_${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    });

    mqttClient.on('connect', () => {
      console.log('Connected to MQTT broker');
      setIsConnected(true);
    });

    mqttClient.on('error', (err) => {
      console.error('MQTT connection error:', err);
      setIsConnected(false);
    });

    mqttClient.on('close', () => {
      console.log('MQTT connection closed');
      setIsConnected(false);
    });

    mqttClient.on('message', (topic, payload) => {
      try {
        const message: MQTTMessage = {
          topic,
          payload: JSON.parse(payload.toString()),
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev.slice(-99), message]); // Keep last 100 messages
      } catch (error) {
        console.error('Error parsing MQTT message:', error);
      }
    });

    setClient(mqttClient);

    return () => {
      if (mqttClient) {
        mqttClient.end();
      }
    };
  }, []);

  const publishMessage = (topic: string, payload: any) => {
    if (client && isConnected) {
      client.publish(topic, JSON.stringify(payload), { qos: 1 });
    } else {
      console.warn('MQTT client not connected. Message will be queued for offline sync.');
      // Store message for offline sync
      const offlineMessage = {
        topic,
        payload,
        timestamp: new Date().toISOString()
      };
      const offlineMessages = JSON.parse(localStorage.getItem('offlineMQTTMessages') || '[]');
      offlineMessages.push(offlineMessage);
      localStorage.setItem('offlineMQTTMessages', JSON.stringify(offlineMessages));
    }
  };

  const subscribeToTopic = (topic: string, callback: (message: any) => void) => {
    if (client && isConnected) {
      client.subscribe(topic, { qos: 1 });
      
      const messageHandler = (messageTopic: string, payload: Buffer) => {
        if (messageTopic === topic) {
          try {
            const parsedPayload = JSON.parse(payload.toString());
            callback(parsedPayload);
          } catch (error) {
            console.error('Error parsing subscribed message:', error);
          }
        }
      };

      client.on('message', messageHandler);
      
      return () => {
        client.off('message', messageHandler);
        client.unsubscribe(topic);
      };
    }
  };

  // Sync offline messages when connection is restored
  useEffect(() => {
    if (isConnected && client) {
      const offlineMessages = JSON.parse(localStorage.getItem('offlineMQTTMessages') || '[]');
      if (offlineMessages.length > 0) {
        console.log(`Syncing ${offlineMessages.length} offline MQTT messages`);
        offlineMessages.forEach((message: MQTTMessage) => {
          client.publish(message.topic, JSON.stringify(message.payload), { qos: 1 });
        });
        localStorage.removeItem('offlineMQTTMessages');
      }
    }
  }, [isConnected, client]);

  return (
    <MQTTContext.Provider value={{
      client,
      isConnected,
      publishMessage,
      subscribeToTopic,
      messages
    }}>
      {children}
    </MQTTContext.Provider>
  );
};
