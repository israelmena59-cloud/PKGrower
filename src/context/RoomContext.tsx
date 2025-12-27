/**
 * Room Context
 * Global state management for multi-room support
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '../api/client';

// Room Types
export type RoomType = 'veg' | 'flower' | 'drying' | 'custom';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  color: string;
  plantCount: number;
  creationDate: string;
  // Light schedule
  lightsOnTime: string;    // "06:00"
  lightsOffTime: string;   // "00:00"
  // Growth dates
  growStartDate: string | null;
  flipDate: string | null;
  harvestDate: string | null;
  // Device assignment
  assignedDevices: string[];  // Device IDs
  assignedSensors: string[];  // Sensor IDs
}

// Default Rooms
const DEFAULT_ROOMS: Room[] = [
  {
    id: 'room_1',
    name: 'Vegetativo Principal',
    type: 'veg',
    color: '#22c55e',
    plantCount: 0,
    creationDate: new Date().toISOString(),
    lightsOnTime: '06:00',
    lightsOffTime: '00:00', // 18/6 schedule
    growStartDate: null,
    flipDate: null,
    harvestDate: null,
    assignedDevices: [],
    assignedSensors: []
  },
  {
    id: 'room_2',
    name: 'Floración A',
    type: 'flower',
    color: '#a855f7',
    plantCount: 0,
    creationDate: new Date().toISOString(),
    lightsOnTime: '06:00',
    lightsOffTime: '18:00', // 12/12 schedule
    growStartDate: null,
    flipDate: null,
    harvestDate: null,
    assignedDevices: [],
    assignedSensors: []
  }
];

interface RoomContextType {
  rooms: Room[];
  activeRoomId: string;
  activeRoom: Room;
  addRoom: (room: Omit<Room, 'id' | 'creationDate'>) => void;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  setActiveRoomId: (id: string) => void;
}

const RoomContext = createContext<RoomContextType | null>(null);

export const useRooms = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRooms must be used within a RoomProvider');
  }
  return context;
};

interface RoomProviderProps {
  children: ReactNode;
}

export const RoomProvider: React.FC<RoomProviderProps> = ({ children }) => {
  // Load initial state
  const [rooms, setRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem('pkgrower_rooms');
    return saved ? JSON.parse(saved) : DEFAULT_ROOMS;
  });

  const [activeRoomId, setActiveRoomIdState] = useState<string>(() => {
    return localStorage.getItem('pkgrower_active_room') || DEFAULT_ROOMS[0].id;
  });

  // Derived active room
  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0];

  // Sync rooms to backend (debounced)
  const syncToBackend = async (roomsToSync: Room[]) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rooms: roomsToSync })
      });
      if (response.ok) {
        console.log('[Rooms] Synced to backend');
      }
    } catch (e) {
      console.warn('[Rooms] Backend sync failed, using localStorage');
    }
  };

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('pkgrower_rooms', JSON.stringify(rooms));
    // Debounced backend sync
    const timer = setTimeout(() => syncToBackend(rooms), 1000);
    return () => clearTimeout(timer);
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem('pkgrower_active_room', activeRoomId);
  }, [activeRoomId]);

  // Actions
  const addRoom = (roomData: Omit<Room, 'id' | 'creationDate'>) => {
    const newRoom: Room = {
      ...roomData,
      id: `room_${Date.now()}`,
      creationDate: new Date().toISOString()
    };
    setRooms(prev => [...prev, newRoom]);
  };

  const updateRoom = (id: string, updates: Partial<Room>) => {
    setRooms(prev => prev.map(room =>
      room.id === id ? { ...room, ...updates } : room
    ));
  };

  const deleteRoom = (id: string) => {
    if (rooms.length <= 1) return; // Prevent deleting last room

    // Switch active room if current one is deleted
    if (activeRoomId === id) {
      const otherRoom = rooms.find(r => r.id !== id);
      if (otherRoom) setActiveRoomId(otherRoom.id);
    }

    setRooms(prev => prev.filter(r => r.id !== id));
  };

  const setActiveRoomId = (id: string) => {
    if (rooms.some(r => r.id === id)) {
      setActiveRoomIdState(id);
      // Here we could trigger a global refresh or event if needed
      // But Context propagation handles it
    }
  };

  const value: RoomContextType = {
    rooms,
    activeRoomId,
    activeRoom,
    addRoom,
    updateRoom,
    deleteRoom,
    setActiveRoomId
  };

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
};
