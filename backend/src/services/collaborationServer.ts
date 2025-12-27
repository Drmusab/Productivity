/**
 * @fileoverview WebSocket Server for Realtime Collaboration
 * 
 * Provides realtime collaboration using Socket.IO and Yjs CRDT.
 * Handles room-based document collaboration with cursor presence.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import * as Y from 'yjs';

/**
 * Collaboration room state
 */
interface RoomState {
  documentId: string;
  ydoc: Y.Doc;
  users: Map<string, UserInfo>;
  lastActivity: Date;
}

/**
 * User information
 */
interface UserInfo {
  socketId: string;
  userId: string;
  userName: string;
  userColor: string;
  cursorPosition: any;
  selection: any;
}

/**
 * Yjs update message
 */
interface YjsUpdate {
  documentId: string;
  update: Uint8Array;
  origin: string;
}

/**
 * Awareness update (cursor positions)
 */
interface AwarenessUpdate {
  documentId: string;
  clientId: number;
  user: {
    userId: string;
    userName: string;
    userColor: string;
    cursor: any;
    selection: any;
  };
}

/**
 * Collaboration server
 */
export class CollaborationServer {
  private io: SocketIOServer;
  private rooms: Map<string, RoomState>;
  private cleanupInterval: NodeJS.Timeout;

  constructor(httpServer: HTTPServer) {
    // Initialize Socket.IO
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.rooms = new Map();

    // Set up event handlers
    this.setupEventHandlers();

    // Cleanup inactive rooms every 30 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveRooms();
    }, 30 * 60 * 1000);

    console.log('✅ Collaboration server initialized');
  }

  /**
   * Set up Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Join a collaboration room
      socket.on('join-room', (data: { documentId: string; user: UserInfo }) => {
        this.handleJoinRoom(socket, data);
      });

      // Leave a collaboration room
      socket.on('leave-room', (documentId: string) => {
        this.handleLeaveRoom(socket, documentId);
      });

      // Yjs document update
      socket.on('yjs-update', (data: YjsUpdate) => {
        this.handleYjsUpdate(socket, data);
      });

      // Awareness update (cursor position)
      socket.on('awareness-update', (data: AwarenessUpdate) => {
        this.handleAwarenessUpdate(socket, data);
      });

      // Request full sync
      socket.on('request-sync', (documentId: string) => {
        this.handleRequestSync(socket, documentId);
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Handle user joining a room
   */
  private handleJoinRoom(
    socket: Socket,
    data: { documentId: string; user: UserInfo }
  ): void {
    const { documentId, user } = data;

    console.log(`📥 User ${user.userName} joining room: ${documentId}`);

    // Create room if it doesn't exist
    if (!this.rooms.has(documentId)) {
      const ydoc = new Y.Doc();
      this.rooms.set(documentId, {
        documentId,
        ydoc,
        users: new Map(),
        lastActivity: new Date(),
      });
      console.log(`✨ Created new room: ${documentId}`);
    }

    const room = this.rooms.get(documentId)!;

    // Add user to room
    user.socketId = socket.id;
    room.users.set(socket.id, user);
    room.lastActivity = new Date();

    // Join Socket.IO room
    socket.join(documentId);

    // Send current document state to new user
    const stateVector = Y.encodeStateVector(room.ydoc);
    const update = Y.encodeStateAsUpdate(room.ydoc, stateVector);

    socket.emit('sync-state', {
      documentId,
      update: Buffer.from(update),
    });

    // Notify other users about new user
    socket.to(documentId).emit('user-joined', {
      socketId: socket.id,
      user: {
        userId: user.userId,
        userName: user.userName,
        userColor: user.userColor,
      },
    });

    // Send list of existing users to new user
    const existingUsers = Array.from(room.users.values())
      .filter(u => u.socketId !== socket.id)
      .map(u => ({
        socketId: u.socketId,
        userId: u.userId,
        userName: u.userName,
        userColor: u.userColor,
      }));

    socket.emit('existing-users', existingUsers);

    console.log(`✅ User ${user.userName} joined room: ${documentId}`);
  }

  /**
   * Handle user leaving a room
   */
  private handleLeaveRoom(socket: Socket, documentId: string): void {
    const room = this.rooms.get(documentId);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (user) {
      console.log(`📤 User ${user.userName} leaving room: ${documentId}`);

      room.users.delete(socket.id);
      socket.leave(documentId);

      // Notify other users
      socket.to(documentId).emit('user-left', {
        socketId: socket.id,
        userId: user.userId,
      });

      // Clean up empty rooms
      if (room.users.size === 0) {
        this.rooms.delete(documentId);
        console.log(`🗑️  Removed empty room: ${documentId}`);
      }
    }
  }

  /**
   * Handle Yjs document update
   */
  private handleYjsUpdate(socket: Socket, data: YjsUpdate): void {
    const { documentId, update, origin } = data;
    const room = this.rooms.get(documentId);

    if (!room) {
      console.error(`❌ Room not found: ${documentId}`);
      return;
    }

    // Apply update to room's Y.Doc
    Y.applyUpdate(room.ydoc, Buffer.from(update as any));
    room.lastActivity = new Date();

    // Broadcast update to other users in the room
    socket.to(documentId).emit('yjs-update', {
      documentId,
      update: Buffer.from(update as any),
      origin,
    });

    // TODO: Persist update to database for history
    // saveOperationToDatabase(documentId, update, origin);
  }

  /**
   * Handle awareness update (cursor position)
   */
  private handleAwarenessUpdate(socket: Socket, data: AwarenessUpdate): void {
    const { documentId, clientId, user } = data;
    const room = this.rooms.get(documentId);

    if (!room) return;

    // Update user's cursor position
    const roomUser = room.users.get(socket.id);
    if (roomUser) {
      roomUser.cursorPosition = user.cursor;
      roomUser.selection = user.selection;
      room.lastActivity = new Date();
    }

    // Broadcast to other users
    socket.to(documentId).emit('awareness-update', {
      socketId: socket.id,
      clientId,
      user,
    });
  }

  /**
   * Handle sync request
   */
  private handleRequestSync(socket: Socket, documentId: string): void {
    const room = this.rooms.get(documentId);
    if (!room) return;

    const stateVector = Y.encodeStateVector(room.ydoc);
    const update = Y.encodeStateAsUpdate(room.ydoc, stateVector);

    socket.emit('sync-state', {
      documentId,
      update: Buffer.from(update),
    });
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(socket: Socket): void {
    console.log(`🔌 Client disconnected: ${socket.id}`);

    // Remove user from all rooms
    this.rooms.forEach((room, documentId) => {
      const user = room.users.get(socket.id);
      if (user) {
        room.users.delete(socket.id);

        // Notify other users
        socket.to(documentId).emit('user-left', {
          socketId: socket.id,
          userId: user.userId,
        });

        // Clean up empty rooms
        if (room.users.size === 0) {
          this.rooms.delete(documentId);
          console.log(`🗑️  Removed empty room: ${documentId}`);
        }
      }
    });
  }

  /**
   * Clean up inactive rooms (no activity for 1 hour)
   */
  private cleanupInactiveRooms(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    this.rooms.forEach((room, documentId) => {
      if (room.lastActivity < oneHourAgo && room.users.size === 0) {
        this.rooms.delete(documentId);
        console.log(`🗑️  Cleaned up inactive room: ${documentId}`);
      }
    });
  }

  /**
   * Get room statistics
   */
  public getStats(): {
    totalRooms: number;
    totalUsers: number;
    rooms: Array<{
      documentId: string;
      users: number;
      lastActivity: Date;
    }>;
  } {
    const rooms = Array.from(this.rooms.entries()).map(([documentId, room]) => ({
      documentId,
      users: room.users.size,
      lastActivity: room.lastActivity,
    }));

    const totalUsers = rooms.reduce((sum, room) => sum + room.users, 0);

    return {
      totalRooms: this.rooms.size,
      totalUsers,
      rooms,
    };
  }

  /**
   * Shutdown the collaboration server
   */
  public shutdown(): void {
    clearInterval(this.cleanupInterval);
    this.io.close();
    console.log('🛑 Collaboration server shut down');
  }
}

export default CollaborationServer;
